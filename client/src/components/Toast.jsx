import { useEffect } from 'react'
import styles from './Toast.module.css'

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)

    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      <span className={styles.icon}>
        {type === 'success' && '✓'}
        {type === 'info' && 'ℹ'}
        {type === 'error' && '✕'}
      </span>
      <span className={styles.message}>{message}</span>
    </div>
  )
}
