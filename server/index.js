import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDb } from './db.js';
import { createApiRoutes } from './routes/api.js';
import { createAdminRoutes } from './routes/admin.js';
import { setupSocketHandlers } from './socket/handlers.js';
import { GameState } from './game.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const ADMIN_CODE = process.env.ADMIN_CODE || 'nye2026admin';

// Initialize database
const db = initDb();

// Initialize game state
const gameState = new GameState(db);

// Express app
const app = express();
const server = createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Make io and gameState available to routes
app.set('io', io);
app.set('gameState', gameState);
app.set('db', db);
app.set('adminCode', ADMIN_CODE);

// API routes
app.use('/api', createApiRoutes(db, gameState, io));
app.use('/api/admin', createAdminRoutes(db, gameState, io, ADMIN_CODE));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));

  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Setup WebSocket handlers
setupSocketHandlers(io, db, gameState);

// Start server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Admin code: ${ADMIN_CODE}`);
});
