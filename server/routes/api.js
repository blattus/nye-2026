import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPlayerBySessionToken, getSessionByToken, getAllPrompts, getSubmissionsByPlayer } from '../db.js';

export function createApiRoutes(db, gameState, io) {
  const router = Router();

  // Get current state (for initial load)
  router.get('/state', (req, res) => {
    const sessionToken = req.cookies.session_token;
    let player = null;
    let submissions = [];

    if (sessionToken) {
      player = getPlayerBySessionToken(db, sessionToken);
      if (player) {
        submissions = getSubmissionsByPlayer(db, player.id);
      }
    }

    const prompts = getAllPrompts(db);

    res.json({
      gameState: gameState.getState(),
      player,
      prompts,
      submissions,
      reelItem: gameState.getCurrentReelItem(),
      currentRound: gameState.currentRound // Include active round for reconnection
    });
  });

  // Join the party
  router.post('/join', (req, res) => {
    const { name, emoji } = req.body;

    if (!name || !emoji) {
      return res.status(400).json({ error: 'Name and emoji required' });
    }

    // Check for existing session
    const existingToken = req.cookies.session_token;
    if (existingToken) {
      const existingSession = getSessionByToken(db, existingToken);
      if (existingSession && existingSession.player_id) {
        const player = db.prepare('SELECT * FROM player WHERE id = ?').get(existingSession.player_id);
        if (player) {
          // Update player info if changed
          if (player.display_name !== name || player.emoji !== emoji) {
            db.prepare('UPDATE player SET display_name = ?, emoji = ?, last_seen_at = ? WHERE id = ?')
              .run(name, emoji, new Date().toISOString(), player.id);
          }
          return res.json({
            player: { ...player, display_name: name, emoji },
            sessionToken: existingToken
          });
        }
      }
    }

    // Check for duplicate name
    const existingName = db.prepare('SELECT * FROM player WHERE display_name = ?').get(name);
    if (existingName) {
      return res.status(400).json({ error: 'Name already taken' });
    }

    // Create player
    const playerId = uuidv4();
    db.prepare('INSERT INTO player (id, display_name, emoji) VALUES (?, ?, ?)')
      .run(playerId, name, emoji);

    // Create session
    const sessionToken = uuidv4();
    db.prepare('INSERT INTO session (id, player_id, session_token) VALUES (?, ?, ?)')
      .run(uuidv4(), playerId, sessionToken);

    // Initialize score
    db.prepare('INSERT INTO score (player_id, points) VALUES (?, 0)').run(playerId);

    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(playerId);

    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'lax'
    });

    // Notify others
    io.emit('player_joined', { player });

    res.json({ player, sessionToken });
  });

  // Submit an answer
  router.post('/submit', (req, res) => {
    const sessionToken = req.cookies.session_token;
    if (!sessionToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const player = getPlayerBySessionToken(db, sessionToken);
    if (!player) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const { promptId, answerText, contextText } = req.body;

    if (!promptId || !answerText) {
      return res.status(400).json({ error: 'Prompt and answer required' });
    }

    // Validate answer length (for display in Guess What rounds)
    if (answerText.trim().length > 60) {
      return res.status(400).json({ error: 'Answer must be 60 characters or less' });
    }

    // Check if prompt exists
    const prompt = db.prepare('SELECT * FROM prompt WHERE id = ?').get(promptId);
    if (!prompt) {
      return res.status(400).json({ error: 'Invalid prompt' });
    }

    // Upsert submission
    const existingSubmission = db.prepare(
      'SELECT * FROM submission WHERE prompt_id = ? AND player_id = ?'
    ).get(promptId, player.id);

    if (existingSubmission) {
      // Update existing
      db.prepare(
        'UPDATE submission SET answer_text = ?, context_text = ? WHERE id = ?'
      ).run(answerText, contextText || null, existingSubmission.id);
    } else {
      // Create new
      db.prepare(
        'INSERT INTO submission (id, prompt_id, player_id, answer_text, context_text) VALUES (?, ?, ?, ?, ?)'
      ).run(uuidv4(), promptId, player.id, answerText, contextText || null);
    }

    const submission = db.prepare(
      'SELECT * FROM submission WHERE prompt_id = ? AND player_id = ?'
    ).get(promptId, player.id);

    // Notify for reel update
    io.emit('submission_added', {
      promptId,
      playerId: player.id
    });

    res.json({ submission });
  });

  // Cast a vote
  router.post('/vote', (req, res) => {
    const sessionToken = req.cookies.session_token;
    if (!sessionToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const player = getPlayerBySessionToken(db, sessionToken);
    if (!player) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const { optionId } = req.body;

    if (!optionId) {
      return res.status(400).json({ error: 'Option required' });
    }

    const result = gameState.castVote(player.id, optionId);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    // Notify admin of vote count update
    io.emit('vote_cast', { playerId: player.id });

    res.json({ success: true });
  });

  // Get leaderboard
  router.get('/scores', (req, res) => {
    const scores = db.prepare(`
      SELECT s.*, p.display_name, p.emoji
      FROM score s
      JOIN player p ON p.id = s.player_id
      ORDER BY s.points DESC
    `).all();

    res.json({ scores });
  });

  return router;
}
