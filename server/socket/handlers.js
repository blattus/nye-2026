import { getPlayerBySessionToken, getSessionByToken } from '../db.js';

export function setupSocketHandlers(io, db, gameState) {
  // Reel ticker - rotate submissions every 8 seconds
  let reelInterval = null;

  function startReelTicker() {
    if (reelInterval) return;

    console.log('Starting reel ticker...');
    reelInterval = setInterval(() => {
      console.log('Reel tick - status:', gameState.status);
      if (gameState.status === 'REEL') {
        const item = gameState.advanceReel();
        console.log('Advanced reel to:', item?.answer_text || 'no item');
        if (item) {
          io.emit('reel_tick', item);
        }
      }
    }, 8000);
  }

  function stopReelTicker() {
    if (reelInterval) {
      clearInterval(reelInterval);
      reelInterval = null;
    }
  }

  startReelTicker();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Authenticate via session token
    socket.on('authenticate', (data) => {
      const { sessionToken } = data;

      if (!sessionToken) {
        socket.emit('auth_error', { error: 'No session token' });
        return;
      }

      const player = getPlayerBySessionToken(db, sessionToken);

      if (!player) {
        socket.emit('auth_error', { error: 'Invalid session' });
        return;
      }

      // Track connection
      socket.playerId = player.id;
      gameState.connectedPlayers.set(socket.id, player.id);

      // Update last seen
      db.prepare('UPDATE player SET last_seen_at = ? WHERE id = ?')
        .run(new Date().toISOString(), player.id);

      // Send current state
      socket.emit('authenticated', {
        player,
        gameState: gameState.getState(),
        reelItem: gameState.getCurrentReelItem()
      });

      // Notify others
      io.emit('player_connected', {
        playerId: player.id,
        connectedCount: gameState.connectedPlayers.size
      });
    });

    // Admin authenticate
    socket.on('admin_authenticate', (data) => {
      const { adminCode } = data;
      const expectedCode = process.env.ADMIN_CODE || 'nye2026admin';

      console.log('Admin auth attempt with code:', adminCode);

      if (adminCode !== expectedCode) {
        socket.emit('admin_auth_error', { error: 'Invalid admin code' });
        return;
      }

      socket.isAdmin = true;
      socket.join('admin');

      const reelItem = gameState.getCurrentReelItem();
      console.log('Admin authenticated, sending initial reel item:', reelItem?.answer_text);

      socket.emit('admin_authenticated', {
        gameState: gameState.getState(),
        stats: gameState.getStats(),
        reelItem
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);

      if (socket.playerId) {
        gameState.connectedPlayers.delete(socket.id);

        io.emit('player_disconnected', {
          playerId: socket.playerId,
          connectedCount: gameState.connectedPlayers.size
        });
      }
    });

    // Request state update
    socket.on('request_state', () => {
      socket.emit('state_update', {
        gameState: gameState.getState(),
        reelItem: gameState.getCurrentReelItem()
      });
    });
  });

  // Cleanup on server shutdown
  process.on('SIGTERM', () => {
    stopReelTicker();
  });
}
