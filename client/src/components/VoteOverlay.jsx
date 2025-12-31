import { useState, useEffect } from 'react'
import { useGame } from '../context/GameContext'
import styles from './VoteOverlay.module.css'

export default function VoteOverlay() {
  const { currentRound, gameState, myVote, revealData, castVote, player, scores } = useGame()
  const [timeLeft, setTimeLeft] = useState(25)
  const [voting, setVoting] = useState(false)
  const [error, setError] = useState('')

  // Countdown timer
  useEffect(() => {
    if (gameState.status !== 'ROUND_ACTIVE' || !currentRound?.deadline) return

    const deadline = new Date(currentRound.deadline).getTime()

    const interval = setInterval(() => {
      const now = Date.now()
      const remaining = Math.max(0, Math.ceil((deadline - now) / 1000))
      setTimeLeft(remaining)

      if (remaining <= 0) {
        clearInterval(interval)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [currentRound?.deadline, gameState.status])

  // Handle vote
  const handleVote = async (optionId) => {
    if (myVote || voting) return

    setVoting(true)
    setError('')

    try {
      await castVote(optionId)
    } catch (err) {
      setError(err.message)
    } finally {
      setVoting(false)
    }
  }

  // Check if I was correct
  const wasCorrect = revealData && myVote === revealData.correctOptionId

  // Check if this is my own submission (can't vote on your own answer in Guess Who)
  const isMySubmission = currentRound?.type === 'GUESS_WHO' &&
    currentRound?.authorPlayerId === player?.id

  // Reveal mode
  if (gameState.status === 'ROUND_REVEAL' && revealData) {
    const myScore = scores.find(s => s.player_id === player.id)?.points || 0

    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.prompt}>{currentRound?.prompt?.text}</div>

          <div className={styles.revealCard}>
            {currentRound?.type === 'GUESS_WHO' ? (
              <>
                <div className={styles.revealLabel}>The answer was from...</div>
                <div className={styles.revealAnswer}>
                  {currentRound.options.find(o => o.id === revealData.correctOptionId)?.emoji}{' '}
                  {currentRound.options.find(o => o.id === revealData.correctOptionId)?.name}
                </div>
              </>
            ) : (
              <>
                <div className={styles.revealLabel}>The correct answer was...</div>
                <div className={styles.revealAnswer}>
                  {currentRound.options.find(o => o.id === revealData.correctOptionId)?.text}
                </div>
              </>
            )}
          </div>

          <div className={`${styles.resultBadge} ${wasCorrect ? styles.correct : styles.wrong}`}>
            {myVote ? (wasCorrect ? '✓ Correct! +1 point' : '✗ Wrong') : 'No vote'}
          </div>

          <div className={styles.distribution}>
            {currentRound?.options?.map((option) => {
              const count = revealData.distribution[option.id] || 0
              const total = Object.values(revealData.distribution).reduce((a, b) => a + b, 0)
              const percent = total > 0 ? Math.round((count / total) * 100) : 0
              const isCorrect = option.id === revealData.correctOptionId

              return (
                <div key={option.id} className={styles.distRow}>
                  <span className={styles.distLabel}>
                    {option.emoji} {option.name || option.text}
                    {isCorrect && ' ✓'}
                  </span>
                  <div className={styles.distBarContainer}>
                    <div
                      className={`${styles.distBar} ${isCorrect ? styles.distBarCorrect : ''}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className={styles.distCount}>{count}</span>
                </div>
              )
            })}
          </div>

          <div className={styles.myScore}>
            Your score: <strong>{myScore}</strong>
          </div>
        </div>
      </div>
    )
  }

  // Voting mode
  if (!currentRound) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.waiting}>Waiting for round...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.timer}>
          <span className={`${styles.timerNumber} ${timeLeft <= 5 ? styles.urgent : ''}`}>{timeLeft}</span>
          <span className={styles.timerLabel}>seconds</span>
        </div>

        <div className={styles.prompt}>{currentRound.prompt?.text}</div>

        {currentRound.type === 'GUESS_WHO' ? (
          <>
            <div className={styles.answer}>"{currentRound.showAnswer}"</div>
            <div className={styles.question}>Who said this?</div>
          </>
        ) : (
          <>
            <div className={styles.person}>
              {currentRound.showPerson?.emoji} {currentRound.showPerson?.name}
            </div>
            <div className={styles.question}>What was their answer?</div>
          </>
        )}

        {error && <div className={styles.error}>{error}</div>}

        {isMySubmission ? (
          <div className={styles.myAnswer}>
            <div className={styles.myAnswerIcon}>🤫</div>
            <div className={styles.myAnswerText}>This is your answer!</div>
            <div className={styles.myAnswerSubtext}>Sit back and see if anyone guesses right...</div>
          </div>
        ) : (
          <>
            <div className={styles.options}>
              {currentRound.options?.map((option) => (
                <button
                  key={option.id}
                  className={`${styles.optionBtn} ${myVote === option.id ? styles.selected : ''} ${myVote && myVote !== option.id ? styles.disabled : ''}`}
                  onClick={() => handleVote(option.id)}
                  disabled={!!myVote || voting}
                >
                  {currentRound.type === 'GUESS_WHO' ? (
                    <>
                      <span className={styles.optionEmoji}>{option.emoji}</span>
                      <span className={styles.optionName}>{option.name}</span>
                    </>
                  ) : (
                    <span className={styles.optionText}>{option.text}</span>
                  )}
                </button>
              ))}
            </div>

            {myVote && (
              <div className={styles.waitingVote}>
                Vote locked in! Waiting for reveal...
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
