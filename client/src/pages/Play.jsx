import { useState, useEffect } from 'react'
import { useGame } from '../context/GameContext'
import VoteOverlay from '../components/VoteOverlay'
import styles from './Play.module.css'

export default function Play() {
  const { player, prompts, submissions, gameState, submitAnswer, showToast } = useGame()
  const [selectedPrompt, setSelectedPrompt] = useState(null)
  const [answer, setAnswer] = useState('')
  const [context, setContext] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  // Get submission for a prompt
  const getSubmission = (promptId) => {
    return submissions.find(s => s.prompt_id === promptId)
  }

  // Handle opening a prompt
  const openPrompt = (prompt) => {
    const existing = getSubmission(prompt.id)
    setSelectedPrompt(prompt)
    setAnswer(existing?.answer_text || '')
    setContext(existing?.context_text || '')
    setError('')
    setSuccess('')
  }

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!answer.trim()) {
      setError('Please enter an answer')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await submitAnswer(selectedPrompt.id, answer.trim(), context.trim() || null)
      showToast('Answer saved!', 'success')
      setSelectedPrompt(null)
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Count answered prompts
  const answeredCount = prompts.filter(p => getSubmission(p.id)).length

  // Show vote overlay during rounds
  if (gameState.status === 'ROUND_ACTIVE' || gameState.status === 'ROUND_REVEAL') {
    return <VoteOverlay />
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.playerInfo}>
          <span className={styles.playerEmoji}>{player.emoji}</span>
          <span className={styles.playerName}>{player.display_name}</span>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.helpBtn} onClick={() => setShowHelp(true)}>
            ?
          </button>
          <div className={styles.progress}>
            {answeredCount}/{prompts.length} answered
          </div>
        </div>
      </div>

      {/* Prompts list */}
      <div className={styles.promptsContainer}>
        <h2 className={styles.sectionTitle}>Quick Picks</h2>
        <div className={styles.prompts}>
          {prompts.map((prompt) => {
            const submission = getSubmission(prompt.id)
            return (
              <button
                key={prompt.id}
                className={`${styles.promptCard} ${submission ? styles.answered : ''}`}
                onClick={() => openPrompt(prompt)}
              >
                <span className={styles.promptText}>{prompt.text}</span>
                {submission && (
                  <span className={styles.checkmark}>✓</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Prompt modal */}
      {selectedPrompt && (
        <div className={styles.modalOverlay} onClick={() => setSelectedPrompt(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setSelectedPrompt(null)}>
              ✕
            </button>

            <h3 className={styles.modalTitle}>{selectedPrompt.text}</h3>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <input
                  type="text"
                  className="input"
                  placeholder="Your answer..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  maxLength={60}
                  autoFocus
                />
              </div>

              <div className={styles.field}>
                <input
                  type="text"
                  className="input"
                  placeholder="Context (optional)"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  maxLength={150}
                  style={{ fontSize: '0.875rem' }}
                />
              </div>

              {error && <div className={styles.error}>{error}</div>}
              {success && <div className={styles.success}>{success}</div>}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={submitting}
              >
                {submitting ? 'Saving...' : (getSubmission(selectedPrompt.id) ? 'Update' : 'Submit')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Help modal */}
      {showHelp && (
        <div className={styles.modalOverlay} onClick={() => setShowHelp(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setShowHelp(false)}>
              ✕
            </button>

            <h3 className={styles.modalTitle}>How to Play</h3>

            <div className={styles.helpContent}>
              <div className={styles.helpStep}>
                <div className={styles.helpNumber}>1</div>
                <div className={styles.helpText}>
                  <strong>Answer Prompts</strong>
                  <p>Tap each prompt and submit your answers. Be creative!</p>
                </div>
              </div>

              <div className={styles.helpStep}>
                <div className={styles.helpNumber}>2</div>
                <div className={styles.helpText}>
                  <strong>Vote in Rounds</strong>
                  <p>When a round starts, guess who said what or what someone said. You have 20 seconds!</p>
                </div>
              </div>

              <div className={styles.helpStep}>
                <div className={styles.helpNumber}>3</div>
                <div className={styles.helpText}>
                  <strong>Earn Points</strong>
                  <p>Get +1 point for each correct guess. Climb the leaderboard!</p>
                </div>
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem' }}
              onClick={() => setShowHelp(false)}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
