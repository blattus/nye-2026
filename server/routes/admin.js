import { Router } from 'express';
import { getAllSubmissions } from '../db.js';

export function createAdminRoutes(db, gameState, io, adminCode) {
  const router = Router();

  // Middleware to check admin auth
  const requireAdmin = (req, res, next) => {
    const code = req.query.code || req.cookies.admin_code;
    if (code !== adminCode) {
      return res.status(403).json({ error: 'Invalid admin code' });
    }
    // Set admin cookie for future requests
    res.cookie('admin_code', adminCode, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });
    next();
  };

  // Verify admin code
  router.get('/verify', requireAdmin, (req, res) => {
    res.json({ valid: true });
  });

  // Get stats
  router.get('/stats', requireAdmin, (req, res) => {
    res.json(gameState.getStats());
  });

  // Get all submissions (for reel)
  router.get('/submissions', requireAdmin, (req, res) => {
    const submissions = getAllSubmissions(db);
    res.json({ submissions });
  });

  // Get candidate round
  router.get('/candidate', requireAdmin, (req, res) => {
    const type = req.query.type || 'GUESS_WHO';
    const candidate = gameState.getCandidateRound(type);
    res.json(candidate);
  });

  // Start round
  router.post('/start-round', requireAdmin, (req, res) => {
    const { type } = req.body;
    const candidate = gameState.getCandidateRound(type || 'GUESS_WHO');

    if (candidate.error) {
      return res.status(400).json({ error: candidate.error });
    }

    const result = gameState.startRound(candidate, io);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    // Broadcast round start to all clients
    io.emit('round_started', {
      id: result.round.id,
      type: result.round.type,
      prompt: result.round.prompt,
      showAnswer: result.round.showAnswer,
      showPerson: result.round.showPerson,
      options: result.round.options,
      deadline: result.round.deadline
    });

    res.json({ success: true, round: result.round });
  });

  // Force reveal (end round early)
  router.post('/reveal', requireAdmin, (req, res) => {
    const result = gameState.revealRound(io);
    res.json({ success: true, result });
  });

  // Skip to reel (from reveal)
  router.post('/skip-to-reel', requireAdmin, (req, res) => {
    gameState.returnToReel(io);
    res.json({ success: true });
  });

  // Reset game (danger!)
  router.post('/reset', requireAdmin, (req, res) => {
    // Clear all game data but keep prompts
    db.prepare('DELETE FROM vote').run();
    db.prepare('DELETE FROM round').run();
    db.prepare('DELETE FROM submission').run();
    db.prepare('DELETE FROM score').run();
    db.prepare('DELETE FROM session').run();
    db.prepare('DELETE FROM player').run();

    gameState.status = 'REEL';
    gameState.currentRound = null;
    gameState.reelIndex = 0;
    gameState.connectedPlayers.clear();

    io.emit('game_reset');

    res.json({ success: true });
  });

  return router;
}
