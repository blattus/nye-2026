import { Routes, Route, Navigate } from 'react-router-dom'
import { useGame } from './context/GameContext'
import Join from './pages/Join'
import Play from './pages/Play'
import Admin from './pages/Admin'

function App() {
  const { player, loading } = useGame()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontSize: '1.5rem'
      }}>
        Loading...
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={player ? <Navigate to="/play" replace /> : <Join />} />
      <Route path="/play" element={player ? <Play /> : <Navigate to="/" replace />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  )
}

export default App
