import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import styles from './Admin.module.css'

const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3000' : ''

export default function Admin() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [authenticated, setAuthenticated] = useState(false)
  const [adminCode, setAdminCode] = useState(searchParams.get('code') || '')
  const [error, setError] = useState('')

  const [socket, setSocket] = useState(null)
  const [gameState, setGameState] = useState({ status: 'REEL' })
  const [stats, setStats] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [currentReelItem, setCurrentReelItem] = useState(null)
  const [reelKey, setReelKey] = useState(0) // For animation
  const [candidate, setCandidate] = useState(null)
  const [roundType, setRoundType] = useState('GUESS_WHO')
  const [currentRound, setCurrentRound] = useState(null)
  const [revealData, setRevealData] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [loadingCandidate, setLoadingCandidate] = useState(false)
  const [voteCount, setVoteCount] = useState(0)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [reelProgress, setReelProgress] = useState(100)

  // Verify admin code
  const verifyAdmin = useCallback(async (code) => {
    try {
      const res = await fetch(`/api/admin/verify?code=${code}`, { credentials: 'include' })
      if (res.ok) {
        setAuthenticated(true)
        setError('')
        return true
      } else {
        setError('Invalid admin code')
        return false
      }
    } catch {
      setError('Failed to verify')
      return false
    }
  }, [])

  // Check if already authenticated
  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      verifyAdmin(code)
    } else {
      // Check cookie
      fetch('/api/admin/verify', { credentials: 'include' })
        .then(res => res.ok && setAuthenticated(true))
        .catch(() => {})
    }
  }, [searchParams, verifyAdmin])

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!authenticated) return

    try {
      const [statsRes, subsRes] = await Promise.all([
        fetch('/api/admin/stats', { credentials: 'include' }),
        fetch('/api/admin/submissions', { credentials: 'include' })
      ])

      if (statsRes.ok) setStats(await statsRes.json())
      if (subsRes.ok) {
        const data = await subsRes.json()
        setSubmissions(data.submissions || [])
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
    }
  }, [authenticated])

  // Fetch candidate
  const fetchCandidate = useCallback(async (type = roundType) => {
    setLoadingCandidate(true)
    try {
      const res = await fetch(`/api/admin/candidate?type=${type}`, { credentials: 'include' })
      const data = await res.json()
      setCandidate(data)
    } catch (err) {
      console.error('Failed to fetch candidate:', err)
    } finally {
      setLoadingCandidate(false)
    }
  }, [roundType])

  // Setup socket connection
  useEffect(() => {
    if (!authenticated) return

    const newSocket = io(SOCKET_URL, { withCredentials: true })

    newSocket.on('connect', () => {
      newSocket.emit('admin_authenticate', { adminCode })
    })

    newSocket.on('admin_authenticated', (data) => {
      setGameState(data.gameState)
      setStats(data.stats)
      if (data.reelItem) {
        setCurrentReelItem(data.reelItem)
      }
    })

    newSocket.on('state_update', (data) => {
      setGameState(data.gameState || data)
    })

    newSocket.on('reel_tick', (item) => {
      console.log('Received reel_tick:', item?.answer_text)
      if (item) {
        setCurrentReelItem(item)
        setReelKey(prev => prev + 1) // Trigger animation
      }
    })

    newSocket.on('round_started', (round) => {
      setCurrentRound(round)
      setGameState(prev => ({ ...prev, status: 'ROUND_ACTIVE' }))
      setRevealData(null)
      setVoteCount(0)
    })

    newSocket.on('vote_cast', () => {
      setVoteCount(prev => prev + 1)
    })

    newSocket.on('round_revealed', (data) => {
      setRevealData(data)
      setGameState(prev => ({ ...prev, status: 'ROUND_REVEAL' }))
    })

    newSocket.on('player_joined', fetchData)
    newSocket.on('submission_added', fetchData)

    setSocket(newSocket)
    fetchData()

    return () => {
      newSocket.disconnect()
    }
  }, [authenticated, adminCode, fetchData])

  // Countdown timer during rounds
  useEffect(() => {
    if (gameState.status !== 'ROUND_ACTIVE' || !currentRound?.deadline) return

    const deadline = new Date(currentRound.deadline).getTime()

    const interval = setInterval(() => {
      const now = Date.now()
      const remaining = Math.max(0, Math.ceil((deadline - now) / 1000))
      setTimeLeft(remaining)
    }, 100)

    return () => clearInterval(interval)
  }, [currentRound?.deadline, gameState.status])

  // Reel progress bar animation (8 second countdown)
  useEffect(() => {
    if (gameState.status !== 'REEL' || !currentReelItem) return

    // Reset to 100% when new item appears
    setReelProgress(100)

    const startTime = Date.now()
    const duration = 8000 // 8 seconds

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, duration - elapsed)
      const progress = (remaining / duration) * 100
      setReelProgress(progress)

      if (remaining === 0) {
        clearInterval(interval)
      }
    }, 50) // Update every 50ms for smooth animation

    return () => clearInterval(interval)
  }, [currentReelItem, gameState.status])

  // Start round
  const startRound = async () => {
    try {
      const res = await fetch('/api/admin/start-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: roundType })
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to start round')
      }
    } catch (err) {
      alert('Failed to start round')
    }
  }

  // Skip to reel
  const skipToReel = async () => {
    await fetch('/api/admin/skip-to-reel', { method: 'POST', credentials: 'include' })
  }

  // End round early (skip timer, go straight to reveal)
  const endRoundEarly = async () => {
    await fetch('/api/admin/reveal', { method: 'POST', credentials: 'include' })
  }

  // Reset game
  const resetGame = async () => {
    if (!confirm('Are you sure? This will delete all players and submissions!')) return
    await fetch('/api/admin/reset', { method: 'POST', credentials: 'include' })
    window.location.reload()
  }

  // Login form
  if (!authenticated) {
    return (
      <div className={styles.loginContainer}>
        <form onSubmit={(e) => { e.preventDefault(); verifyAdmin(adminCode); }} className={styles.loginForm}>
          <h1>Admin Access</h1>
          <input
            type="password"
            className="input"
            placeholder="Enter admin code"
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value)}
            autoFocus
          />
          {error && <div className={styles.error}>{error}</div>}
          <button type="submit" className="btn btn-primary">Enter</button>
        </form>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Sidebar Toggle Button */}
      <button
        className={styles.sidebarToggle}
        onClick={() => setSidebarVisible(!sidebarVisible)}
        title={sidebarVisible ? 'Hide controls' : 'Show controls'}
      >
        {sidebarVisible ? '→' : '←'}
      </button>

      {/* TV Display */}
      <div className={styles.tvArea}>
        {gameState.status === 'REEL' && (
          <div className={styles.reelDisplay}>
            <div className={styles.reelContent}>
              {currentReelItem ? (
                <div key={reelKey} className={styles.reelCard}>
                  <div className={styles.reelPrompt}>{currentReelItem.prompt_text}</div>
                  <div className={styles.reelAnswer}>"{currentReelItem.answer_text}"</div>
                  {currentReelItem.context_text && (
                    <div className={styles.reelContext}>{currentReelItem.context_text}</div>
                  )}
                  <div className={styles.reelProgress}>
                    {submissions.findIndex(s => s.id === currentReelItem.id) + 1} / {submissions.length}
                  </div>
                  <div className={styles.reelProgressBar}>
                    <div
                      className={styles.reelProgressFill}
                      style={{ width: `${reelProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className={styles.noSubmissions}>
                  <div className={styles.waitingIcon}>📝</div>
                  <div>Waiting for submissions...</div>
                  <div className={styles.submissionCount}>{stats?.totalSubmissions || 0} so far</div>
                </div>
              )}
            </div>

            {showLeaderboard && stats?.players && (
              <div className={styles.reelLeaderboard}>
                <div className={styles.leaderboardTitle}>🏆 Leaderboard</div>
                {stats.players
                  .map(p => ({ ...p, points: stats.scores?.find(s => s.player_id === p.id)?.points || 0 }))
                  .sort((a, b) => b.points - a.points)
                  .slice(0, 10)
                  .map((player, i) => (
                    <div key={player.id} className={styles.leaderboardRow}>
                      <span className={styles.rank}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                      </span>
                      <span className={styles.leaderName}>{player.emoji} {player.display_name}</span>
                      <span className={styles.leaderScore}>{player.points}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {gameState.status === 'ROUND_ACTIVE' && currentRound && (
          <div className={styles.roundDisplay}>
            <div className={styles.timerRow}>
              <div className={styles.timer}>{timeLeft}s</div>
              <div className={styles.voteCount}>{voteCount} / {stats?.totalPlayers || '?'} voted</div>
            </div>
            <div className={styles.roundPrompt}>{currentRound.prompt?.text}</div>

            {currentRound.type === 'GUESS_WHO' ? (
              <div className={styles.roundAnswer}>"{currentRound.showAnswer}"</div>
            ) : (
              <div className={styles.roundPerson}>
                {currentRound.showPerson?.emoji} {currentRound.showPerson?.name}
              </div>
            )}

            <div className={styles.roundQuestion}>
              {currentRound.type === 'GUESS_WHO' ? 'Who said this?' : 'What was their answer?'}
            </div>

            <div className={styles.roundOptions}>
              {currentRound.options?.map((opt) => (
                <div key={opt.id} className={styles.roundOption}>
                  {currentRound.type === 'GUESS_WHO'
                    ? `${opt.emoji} ${opt.name}`
                    : opt.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {gameState.status === 'ROUND_REVEAL' && revealData && currentRound && (
          <div className={styles.revealDisplay}>
            <div className={styles.revealTitle}>The answer was...</div>

            <div className={styles.revealCorrect}>
              {currentRound.type === 'GUESS_WHO' ? (
                <>
                  {currentRound.options?.find(o => o.id === revealData.correctOptionId)?.emoji}{' '}
                  {currentRound.options?.find(o => o.id === revealData.correctOptionId)?.name}
                </>
              ) : (
                currentRound.options?.find(o => o.id === revealData.correctOptionId)?.text
              )}
            </div>

            <div className={styles.revealDistribution}>
              {currentRound.options?.map((opt) => {
                const count = revealData.distribution[opt.id] || 0
                const total = Object.values(revealData.distribution).reduce((a, b) => a + b, 0)
                const percent = total > 0 ? Math.round((count / total) * 100) : 0
                const isCorrect = opt.id === revealData.correctOptionId

                return (
                  <div key={opt.id} className={`${styles.distRow} ${isCorrect ? styles.distCorrect : ''}`}>
                    <span className={styles.distLabel}>
                      {currentRound.type === 'GUESS_WHO' ? `${opt.emoji} ${opt.name}` : opt.text}
                    </span>
                    <div className={styles.distBar}>
                      <div className={styles.distFill} style={{ width: `${percent}%` }} />
                    </div>
                    <span className={styles.distCount}>{count} votes</span>
                  </div>
                )
              })}
            </div>

            {revealData.scores?.length > 0 && (
              <div className={styles.leaderboard}>
                <div className={styles.leaderboardTitle}>Leaderboard</div>
                {revealData.scores.slice(0, 5).map((score, i) => (
                  <div key={score.player_id} className={styles.leaderboardRow}>
                    <span className={styles.rank}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                    </span>
                    <span className={styles.leaderName}>{score.emoji} {score.display_name}</span>
                    <span className={styles.leaderScore}>{score.points}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Admin Controls Sidebar */}
      {sidebarVisible && <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Admin Controls</h2>
          <div className={styles.statusBadge}>{gameState.status}</div>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.stat}>
            <div className={styles.statValue}>{stats?.totalPlayers || 0}</div>
            <div className={styles.statLabel}>Players</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>{stats?.connectedPlayers || 0}</div>
            <div className={styles.statLabel}>Online</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>{stats?.totalSubmissions || 0}</div>
            <div className={styles.statLabel}>Answers</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>{stats?.guessWhatEligible || 0}</div>
            <div className={styles.statLabel}>GW Ready</div>
          </div>
        </div>

        {/* Display Options */}
        {gameState.status === 'REEL' && (
          <div className={styles.displayOptions}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={showLeaderboard}
                onChange={(e) => setShowLeaderboard(e.target.checked)}
              />
              <span>Show Leaderboard on TV</span>
            </label>
          </div>
        )}

        {/* Waiting for players warning */}
        {gameState.status === 'REEL' && stats && stats.totalPlayers < 4 && (
          <div className={styles.warningBox}>
            <div className={styles.warningIcon}>⏳</div>
            <div className={styles.warningText}>
              <strong>Need {4 - stats.totalPlayers} more player{4 - stats.totalPlayers > 1 ? 's' : ''}</strong>
              <div className={styles.warningSubtext}>You need at least 4 players to start rounds</div>
            </div>
          </div>
        )}

        {/* Round Controls */}
        {gameState.status === 'REEL' && (
          <div className={styles.roundControls}>
            <div className={styles.controlSection}>
              <label className={styles.controlLabel}>Round Type</label>
              <div className={styles.typeToggle}>
                <button
                  className={`${styles.typeBtn} ${roundType === 'GUESS_WHO' ? styles.active : ''}`}
                  onClick={() => { setRoundType('GUESS_WHO'); fetchCandidate('GUESS_WHO'); }}
                >
                  Guess Who
                </button>
                <button
                  className={`${styles.typeBtn} ${roundType === 'GUESS_WHAT' ? styles.active : ''}`}
                  onClick={() => { setRoundType('GUESS_WHAT'); fetchCandidate('GUESS_WHAT'); }}
                  disabled={!stats?.guessWhatEligible}
                >
                  Guess What
                </button>
              </div>
            </div>

            {candidate && !candidate.error && (
              <div className={styles.candidatePreview}>
                <div className={styles.candidateLabel}>Preview</div>
                <div className={styles.candidatePrompt}>{candidate.prompt?.text}</div>
                {candidate.type === 'GUESS_WHO' ? (
                  <div className={styles.candidateAnswer}>"{candidate.showAnswer}"</div>
                ) : (
                  <div className={styles.candidatePerson}>
                    {candidate.showPerson?.emoji} {candidate.showPerson?.name}
                  </div>
                )}
                <button
                  className="btn btn-secondary"
                  onClick={() => fetchCandidate()}
                  disabled={loadingCandidate}
                  style={{ marginTop: '0.5rem' }}
                >
                  🎲 Reroll
                </button>
              </div>
            )}

            {candidate?.error && (
              <div className={styles.candidateError}>{candidate.error}</div>
            )}

            <button
              className="btn btn-primary btn-large"
              style={{ width: '100%', marginTop: '1rem' }}
              onClick={startRound}
              disabled={!candidate || candidate.error}
            >
              Start Round
            </button>
          </div>
        )}

        {gameState.status === 'ROUND_ACTIVE' && (
          <div className={styles.roundControls}>
            {voteCount >= (stats?.totalPlayers || 0) && voteCount > 0 && (
              <button
                className="btn btn-primary"
                style={{ width: '100%', marginBottom: '0.5rem' }}
                onClick={endRoundEarly}
              >
                ⚡ End Round Early ({voteCount}/{stats?.totalPlayers} voted)
              </button>
            )}
            <button
              className="btn btn-secondary"
              style={{ width: '100%' }}
              onClick={skipToReel}
            >
              Skip to Reel
            </button>
          </div>
        )}

        {gameState.status === 'ROUND_REVEAL' && (
          <div className={styles.roundControls}>
            <button
              className="btn btn-secondary"
              style={{ width: '100%' }}
              onClick={skipToReel}
            >
              Skip to Reel
            </button>
          </div>
        )}

        {/* Players List */}
        <div className={styles.playersList}>
          <div className={styles.playersTitle}>Players</div>
          {stats?.players?.map((player) => {
            const needsMoreAnswers = player.submissionCount < 15
            return (
              <div key={player.id} className={`${styles.playerRow} ${needsMoreAnswers ? styles.incomplete : ''}`}>
                <span className={styles.playerInfo}>
                  <span className={`${styles.onlineIndicator} ${player.isConnected ? styles.online : ''}`} />
                  {player.emoji} {player.display_name}
                </span>
                <span className={`${styles.playerSubmissions} ${needsMoreAnswers ? styles.warning : ''}`}>
                  {player.submissionCount}/15
                </span>
              </div>
            )
          })}
        </div>

        {/* Party Recap Button */}
        <div className={styles.recapSection}>
          <button
            className={styles.recapBtn}
            onClick={() => navigate('/admin/recap' + window.location.search)}
          >
            📖 View Party Recap
          </button>
          <div className={styles.recapHint}>
            Generate a fun summary to share!
          </div>
        </div>

        {/* Danger Zone */}
        <div className={styles.dangerZone}>
          <button className={styles.resetBtn} onClick={resetGame}>
            Reset Game
          </button>
        </div>
      </div>}
    </div>
  )
}
