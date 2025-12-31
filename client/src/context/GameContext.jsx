import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'
import Toast from '../components/Toast'

const GameContext = createContext(null)

const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3000' : ''

export function GameProvider({ children }) {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [player, setPlayer] = useState(null)
  const [prompts, setPrompts] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [gameState, setGameState] = useState({ status: 'REEL', currentRound: null })
  const [currentRound, setCurrentRound] = useState(null)
  const [reelItem, setReelItem] = useState(null)
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [myVote, setMyVote] = useState(null)
  const [revealData, setRevealData] = useState(null)
  const [toast, setToast] = useState(null)

  // Initialize - fetch state from API
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/state', { credentials: 'include' })
        const data = await res.json()

        if (data.player) {
          setPlayer(data.player)
        }
        setPrompts(data.prompts || [])
        setSubmissions(data.submissions || [])
        setGameState(data.gameState || { status: 'REEL' })
        setReelItem(data.reelItem)
      } catch (err) {
        console.error('Failed to fetch initial state:', err)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  // Setup socket connection when player exists
  useEffect(() => {
    if (!player) return

    const newSocket = io(SOCKET_URL, {
      withCredentials: true
    })

    newSocket.on('connect', () => {
      setConnected(true)
      // Authenticate with session token from cookie
      newSocket.emit('authenticate', {
        sessionToken: document.cookie
          .split('; ')
          .find(row => row.startsWith('session_token='))
          ?.split('=')[1]
      })
    })

    newSocket.on('disconnect', () => {
      setConnected(false)
    })

    newSocket.on('authenticated', (data) => {
      setGameState(data.gameState)
      setReelItem(data.reelItem)
    })

    newSocket.on('state_update', (data) => {
      setGameState(data.gameState || data)
      if (data.reelItem) setReelItem(data.reelItem)
    })

    newSocket.on('reel_tick', (item) => {
      setReelItem(item)
    })

    newSocket.on('round_started', (round) => {
      setCurrentRound(round)
      setGameState(prev => ({ ...prev, status: 'ROUND_ACTIVE' }))
      setMyVote(null)
      setRevealData(null)
      setToast({ message: 'New round starting!', type: 'info' })
    })

    newSocket.on('round_revealed', (data) => {
      setRevealData(data)
      setGameState(prev => ({ ...prev, status: 'ROUND_REVEAL' }))
      setScores(data.scores || [])
    })

    newSocket.on('scores_updated', (data) => {
      setScores(data.scores || [])
    })

    newSocket.on('submission_added', () => {
      // Refetch submissions
      fetch('/api/state', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.submissions) setSubmissions(data.submissions)
        })
    })

    newSocket.on('game_reset', () => {
      setPlayer(null)
      setSubmissions([])
      setCurrentRound(null)
      setMyVote(null)
      setRevealData(null)
      setScores([])
      window.location.href = '/'
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [player])

  // Join party
  const joinParty = useCallback(async (name, emoji) => {
    const res = await fetch('/api/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, emoji })
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to join')
    }

    const data = await res.json()
    setPlayer(data.player)

    // Fetch prompts after joining
    const stateRes = await fetch('/api/state', { credentials: 'include' })
    const stateData = await stateRes.json()
    setPrompts(stateData.prompts || [])

    return data.player
  }, [])

  // Submit answer
  const submitAnswer = useCallback(async (promptId, answerText, contextText) => {
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ promptId, answerText, contextText })
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to submit')
    }

    const data = await res.json()

    // Update local submissions
    setSubmissions(prev => {
      const existing = prev.findIndex(s => s.prompt_id === promptId)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = data.submission
        return updated
      }
      return [...prev, data.submission]
    })

    return data.submission
  }, [])

  // Cast vote
  const castVote = useCallback(async (optionId) => {
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ optionId })
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to vote')
    }

    setMyVote(optionId)
    return true
  }, [])

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  const value = {
    socket,
    connected,
    player,
    prompts,
    submissions,
    gameState,
    currentRound,
    reelItem,
    scores,
    loading,
    myVote,
    revealData,
    joinParty,
    submitAnswer,
    castVote,
    showToast
  }

  return (
    <GameContext.Provider value={value}>
      {children}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </GameContext.Provider>
  )
}

export function useGame() {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGame must be used within GameProvider')
  }
  return context
}
