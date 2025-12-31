import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import EmojiPicker from '../components/EmojiPicker'
import styles from './Join.module.css'

export default function Join() {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🎉')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { joinParty } = useGame()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Please enter your name')
      return
    }

    if (name.trim().length > 20) {
      setError('Name must be 20 characters or less')
      return
    }

    setSubmitting(true)

    try {
      await joinParty(name.trim(), emoji)
      navigate('/play')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Guess My 2025 Favorite</h1>
          <p className={styles.subtitle}>NYE Party Game</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Your Name</label>
            <input
              type="text"
              className="input"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Pick an Emoji</label>
            <EmojiPicker selected={emoji} onSelect={setEmoji} />
          </div>

          {error && (
            <div className={styles.error}>{error}</div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-large"
            style={{ width: '100%' }}
            disabled={submitting}
          >
            {submitting ? 'Joining...' : `Join as ${emoji} ${name || '...'}`}
          </button>
        </form>
      </div>
    </div>
  )
}
