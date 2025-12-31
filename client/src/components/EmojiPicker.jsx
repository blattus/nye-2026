import styles from './EmojiPicker.module.css'

const EMOJIS = [
  '🎉', '🎊', '✨', '🌟', '⭐', '🔥',
  '💜', '💙', '💚', '💛', '🧡', '❤️',
  '🦊', '🐱', '🐶', '🦄', '🐼', '🦋',
  '🍕', '🍔', '🌮', '🍜', '🍣', '🍩',
  '🎸', '🎮', '📚', '🎬', '🏀', '⚽'
]

export default function EmojiPicker({ selected, onSelect }) {
  const randomize = () => {
    const random = EMOJIS[Math.floor(Math.random() * EMOJIS.length)]
    onSelect(random)
  }

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={`${styles.emoji} ${selected === emoji ? styles.selected : ''}`}
            onClick={() => onSelect(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
      <button
        type="button"
        className={styles.randomize}
        onClick={randomize}
      >
        🎲 Random
      </button>
    </div>
  )
}
