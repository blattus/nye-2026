import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROMPTS = [
  { text: 'Anthem of 2025 (song)', category: 'core', order_index: 1 },
  { text: 'Favorite purchase under $100', category: 'core', order_index: 2 },
  { text: 'Favorite place you went', category: 'core', order_index: 3 },
  { text: 'Small obsession (one word or short phrase)', category: 'core', order_index: 4 },
  { text: 'Best late-night snack', category: 'core', order_index: 5 },
  { text: 'Drink of the year', category: 'core', order_index: 6 },
  { text: 'Best life improvement (habit, routine, mindset)', category: 'core', order_index: 7 },
  { text: 'Most used app besides texting', category: 'core', order_index: 8 },
  { text: 'Favorite movie', category: 'core', order_index: 9 },
  { text: 'Favorite show', category: 'core', order_index: 10 },
  { text: 'Favorite book', category: 'core', order_index: 11 },
  { text: 'Favorite game', category: 'core', order_index: 12 },
  { text: 'Best moment of 2025 in 3 words', category: 'sentimental', order_index: 13 },
  { text: 'Something you\'re proud of from 2025', category: 'sentimental', order_index: 14 },
  { text: 'One thing you\'re excited about in 2026', category: 'sentimental', order_index: 15 }
];

export function initDb() {
  const dbPath = process.env.NODE_ENV === 'production'
    ? '/app/data/game.db'
    : path.join(__dirname, '../game.db');

  const db = new Database(dbPath);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS player (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      emoji TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY,
      player_id TEXT,
      session_token TEXT UNIQUE NOT NULL,
      is_admin INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES player(id)
    );

    CREATE TABLE IF NOT EXISTS prompt (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      category TEXT NOT NULL,
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS submission (
      id TEXT PRIMARY KEY,
      prompt_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      answer_text TEXT NOT NULL,
      context_text TEXT,
      is_used_in_round INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (prompt_id) REFERENCES prompt(id),
      FOREIGN KEY (player_id) REFERENCES player(id),
      UNIQUE(prompt_id, player_id)
    );

    CREATE TABLE IF NOT EXISTS round (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      prompt_id TEXT NOT NULL,
      submission_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      payload TEXT,
      started_at TEXT,
      deadline_at TEXT,
      revealed_at TEXT,
      FOREIGN KEY (prompt_id) REFERENCES prompt(id),
      FOREIGN KEY (submission_id) REFERENCES submission(id)
    );

    CREATE TABLE IF NOT EXISTS vote (
      id TEXT PRIMARY KEY,
      round_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      option_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (round_id) REFERENCES round(id),
      FOREIGN KEY (player_id) REFERENCES player(id),
      UNIQUE(round_id, player_id)
    );

    CREATE TABLE IF NOT EXISTS score (
      player_id TEXT PRIMARY KEY,
      points INTEGER DEFAULT 0,
      FOREIGN KEY (player_id) REFERENCES player(id)
    );

    CREATE INDEX IF NOT EXISTS idx_submission_prompt ON submission(prompt_id);
    CREATE INDEX IF NOT EXISTS idx_submission_player ON submission(player_id);
    CREATE INDEX IF NOT EXISTS idx_vote_round ON vote(round_id);
    CREATE INDEX IF NOT EXISTS idx_session_token ON session(session_token);
  `);

  // Seed prompts if empty
  const promptCount = db.prepare('SELECT COUNT(*) as count FROM prompt').get();
  if (promptCount.count === 0) {
    const insertPrompt = db.prepare(
      'INSERT INTO prompt (id, text, category, order_index) VALUES (?, ?, ?, ?)'
    );

    for (const prompt of PROMPTS) {
      insertPrompt.run(uuidv4(), prompt.text, prompt.category, prompt.order_index);
    }
    console.log('Seeded 15 prompts');
  }

  return db;
}

// Helper functions
export function getPlayerBySessionToken(db, token) {
  return db.prepare(`
    SELECT p.* FROM player p
    JOIN session s ON s.player_id = p.id
    WHERE s.session_token = ?
  `).get(token);
}

export function getSessionByToken(db, token) {
  return db.prepare('SELECT * FROM session WHERE session_token = ?').get(token);
}

export function getAllPlayers(db) {
  return db.prepare('SELECT * FROM player ORDER BY created_at').all();
}

export function getAllPrompts(db) {
  return db.prepare('SELECT * FROM prompt ORDER BY order_index').all();
}

export function getSubmissionsByPlayer(db, playerId) {
  return db.prepare('SELECT * FROM submission WHERE player_id = ?').all(playerId);
}

export function getSubmissionsByPrompt(db, promptId) {
  return db.prepare('SELECT * FROM submission WHERE prompt_id = ?').all(promptId);
}

export function getAllSubmissions(db) {
  return db.prepare(`
    SELECT s.*, p.display_name, p.emoji, pr.text as prompt_text
    FROM submission s
    JOIN player p ON p.id = s.player_id
    JOIN prompt pr ON pr.id = s.prompt_id
    ORDER BY s.created_at DESC
  `).all();
}

export function getScores(db) {
  return db.prepare(`
    SELECT s.*, p.display_name, p.emoji
    FROM score s
    JOIN player p ON p.id = s.player_id
    ORDER BY s.points DESC
  `).all();
}

export function updateScore(db, playerId, pointsToAdd) {
  db.prepare(`
    INSERT INTO score (player_id, points) VALUES (?, ?)
    ON CONFLICT(player_id) DO UPDATE SET points = points + ?
  `).run(playerId, pointsToAdd, pointsToAdd);
}
