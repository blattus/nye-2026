import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import styles from './PartyRecap.module.css'

export default function PartyRecap() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  // Check authentication
  useEffect(() => {
    const code = searchParams.get('code')
    const verifyUrl = code ? `/api/admin/verify?code=${code}` : '/api/admin/verify'

    fetch(verifyUrl, { credentials: 'include' })
      .then(res => {
        if (res.ok) {
          setAuthenticated(true)
          fetchRecapData()
        } else {
          navigate('/admin')
        }
      })
      .catch(() => navigate('/admin'))
  }, [searchParams, navigate])

  const fetchRecapData = async () => {
    try {
      const res = await fetch('/api/admin/party-recap', { credentials: 'include' })
      if (res.ok) {
        const recapData = await res.json()
        setData(recapData)
      }
    } catch (err) {
      console.error('Failed to fetch recap data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading party recap...</div>
  }

  if (!data || !data.players.length) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>No party data yet!</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.title}>NYE 2026 Party Recap</div>
        <div className={styles.subtitle}>✨ The Year in Review ✨</div>
      </div>

      {/* Champions / Leaderboard */}
      {data.scores && data.scores.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>🏆 Champions</div>
          <div className={styles.leaderboard}>
            {data.scores.slice(0, 3).map((score, i) => (
              <div key={score.player_id} className={styles.champion}>
                <div className={styles.rank}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                </div>
                <div className={styles.championName}>
                  {score.emoji} {score.display_name}
                </div>
                <div className={styles.championScore}>{score.points} pts</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Player Yearbook Entries */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>📖 The Yearbook</div>
        {data.players.map(player => {
          const submissions = data.playerSubmissions[player.id] || []
          const score = data.scores?.find(s => s.player_id === player.id)

          // Group submissions by category
          const core = submissions.filter(s => s.category === 'core')
          const sentimental = submissions.filter(s => s.category === 'sentimental')

          return (
            <div key={player.id} className={styles.playerCard}>
              <div className={styles.playerHeader}>
                <div className={styles.playerEmoji}>{player.emoji}</div>
                <div className={styles.playerInfo}>
                  <div className={styles.playerName}>{player.display_name}</div>
                  {score && <div className={styles.playerScore}>{score.points} points</div>}
                </div>
              </div>

              {core.length > 0 && (
                <div className={styles.answers}>
                  {core.map(sub => (
                    <div key={sub.id} className={styles.answer}>
                      <div className={styles.prompt}>{sub.prompt_text}</div>
                      <div className={styles.response}>"{sub.answer_text}"</div>
                      {sub.context_text && (
                        <div className={styles.context}>{sub.context_text}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {sentimental.length > 0 && (
                <div className={styles.sentimentalSection}>
                  <div className={styles.sentimentalTitle}>💫 Reflections</div>
                  {sentimental.map(sub => (
                    <div key={sub.id} className={styles.answer}>
                      <div className={styles.prompt}>{sub.prompt_text}</div>
                      <div className={styles.response}>"{sub.answer_text}"</div>
                      {sub.context_text && (
                        <div className={styles.context}>{sub.context_text}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.footerText}>Happy New Year! 🎉</div>
        <div className={styles.footerSubtext}>Thanks for playing!</div>
      </div>

      {/* Back button (will be hidden when screenshotting) */}
      <button
        className={styles.backButton}
        onClick={() => navigate('/admin' + window.location.search)}
      >
        ← Back to Admin
      </button>
    </div>
  )
}
