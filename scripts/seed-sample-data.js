/**
 * Seed Sample Data Script
 *
 * Populates the database with sample players and submissions for testing.
 * Run with: node scripts/seed-sample-data.js
 */

import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Prompts to seed if they don't exist
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

// Sample players
const SAMPLE_PLAYERS = [
  { name: 'Alex', emoji: '🎸' },
  { name: 'Jordan', emoji: '🌟' },
  { name: 'Sam', emoji: '🍕' },
  { name: 'Taylor', emoji: '🎮' },
  { name: 'Morgan', emoji: '📚' },
  { name: 'Casey', emoji: '🎬' },
  { name: 'Riley', emoji: '🏀' },
  { name: 'Quinn', emoji: '🎉' },
  { name: 'Avery', emoji: '🦋' },
  { name: 'Drew', emoji: '🔥' },
  { name: 'Sage', emoji: '🌮' },
  { name: 'Blake', emoji: '💜' }
];

// Sample answers for each prompt (by order_index)
const SAMPLE_ANSWERS = {
  1: [ // Anthem of 2025
    { answer: 'APT. - Rosé & Bruno Mars', context: 'Couldn\'t stop playing it all year' },
    { answer: 'Espresso - Sabrina Carpenter', context: 'Summer vibes' },
    { answer: 'Beautiful Things - Benson Boone', context: null },
    { answer: 'Die With A Smile - Lady Gaga', context: 'The duet of the year' },
    { answer: 'Please Please Please - Sabrina Carpenter', context: null },
    { answer: 'Birds of a Feather - Billie Eilish', context: 'Hit Me Hard and Soft was amazing' }
  ],
  2: [ // Favorite purchase under $100
    { answer: 'Kindle Paperwhite', context: 'Finally reading more' },
    { answer: 'Air fryer', context: 'Life changing' },
    { answer: 'Weighted blanket', context: 'Best sleep ever' },
    { answer: 'Good headphones', context: 'Sony WF-1000XM5' },
    { answer: 'Electric kettle', context: 'For pour-over coffee' },
    { answer: 'Running shoes', context: null }
  ],
  3: [ // Favorite place you went
    { answer: 'Tokyo', context: 'Finally made it happen' },
    { answer: 'Big Sur', context: 'Road trip with friends' },
    { answer: 'New Orleans', context: 'Jazz Fest!' },
    { answer: 'Joshua Tree', context: 'Stargazing trip' },
    { answer: 'Vancouver', context: 'Quick weekend getaway' },
    { answer: 'Austin', context: 'SXSW was wild' }
  ],
  4: [ // Small obsession
    { answer: 'Matcha', context: null },
    { answer: 'Wordle streaks', context: '347 days and counting' },
    { answer: 'Pickleball', context: 'Yes I\'m that person now' },
    { answer: 'Sourdough', context: 'Started my own starter' },
    { answer: 'Mechanical keyboards', context: 'Send help' },
    { answer: 'Chess', context: 'Blame Queen\'s Gambit rewatch' }
  ],
  5: [ // Best late-night snack
    { answer: 'Spicy ramen', context: 'Shin Black hits different at 2am' },
    { answer: 'Cheese and crackers', context: null },
    { answer: 'Cereal', context: 'Cinnamon Toast Crunch specifically' },
    { answer: 'Frozen pizza', context: 'Totino\'s party pizza' },
    { answer: 'PB&J', context: 'Classic' },
    { answer: 'Instant noodles', context: null }
  ],
  6: [ // Drink of the year
    { answer: 'Espresso martini', context: 'Basic but delicious' },
    { answer: 'Natural wine', context: 'Orange wine specifically' },
    { answer: 'Oat milk latte', context: 'Every morning' },
    { answer: 'Mezcal negroni', context: null },
    { answer: 'Cold brew', context: 'Made my own' },
    { answer: 'Dirty Shirley', context: 'The comeback drink' }
  ],
  7: [ // Best life improvement
    { answer: 'Morning workouts', context: '6am gym changed everything' },
    { answer: 'Digital detox Sundays', context: 'No phone until noon' },
    { answer: 'Therapy', context: 'Should have started years ago' },
    { answer: 'Meal prepping', context: 'Saves so much time' },
    { answer: 'Reading before bed', context: 'Instead of scrolling' },
    { answer: 'Walking meetings', context: 'Fresh air helps thinking' }
  ],
  8: [ // Most used app besides texting
    { answer: 'Spotify', context: 'Wrapped was embarrassing' },
    { answer: 'Instagram', context: 'Mostly Reels tbh' },
    { answer: 'Notion', context: 'Second brain' },
    { answer: 'YouTube', context: 'Learning everything there' },
    { answer: 'TikTok', context: 'I\'m part of the problem' },
    { answer: 'Strava', context: 'If it\'s not on Strava...' }
  ],
  9: [ // Favorite movie
    { answer: 'Dune: Part Two', context: 'IMAX was incredible' },
    { answer: 'The Holdovers', context: 'Paul Giamatti deserved that Oscar' },
    { answer: 'Past Lives', context: 'Cried three times' },
    { answer: 'Oppenheimer', context: '3 hours flew by' },
    { answer: 'Barbie', context: 'Saw it twice opening weekend' },
    { answer: 'Poor Things', context: 'So weird and wonderful' }
  ],
  10: [ // Favorite show
    { answer: 'Shogun', context: 'Best show of the year' },
    { answer: 'The Bear S2', context: 'Carmy stress is real' },
    { answer: 'Fallout', context: 'Better than expected' },
    { answer: 'Baby Reindeer', context: 'Couldn\'t stop watching' },
    { answer: 'True Detective S4', context: 'Night Country was creepy' },
    { answer: 'Ripley', context: 'The cinematography!' }
  ],
  11: [ // Favorite book
    { answer: 'Tomorrow and Tomorrow and Tomorrow', context: 'Finally got to it' },
    { answer: 'Fourth Wing', context: 'Dragon romance, no shame' },
    { answer: 'Demon Copperhead', context: 'Deserved the Pulitzer' },
    { answer: 'The Covenant of Water', context: 'Epic family saga' },
    { answer: 'Holly', context: 'Stephen King still got it' },
    { answer: 'Yellowface', context: 'Couldn\'t put it down' }
  ],
  12: [ // Favorite game
    { answer: 'Baldur\'s Gate 3', context: '200+ hours no regrets' },
    { answer: 'Tears of the Kingdom', context: 'Built so many contraptions' },
    { answer: 'Alan Wake 2', context: 'The musical number!' },
    { answer: 'Spider-Man 2', context: 'NYC web-swinging perfection' },
    { answer: 'Balatro', context: 'Poker roguelike addiction' },
    { answer: 'Hades II', context: 'Early access but already great' }
  ],
  13: [ // Best moment of 2025 in 3 words
    { answer: 'Got the promotion', context: 'After 2 years of working toward it' },
    { answer: 'Sister got married', context: 'Beautiful fall wedding' },
    { answer: 'Finished the marathon', context: 'First one ever, 4:23' },
    { answer: 'Adopted our dog', context: 'Best decision we made' },
    { answer: 'Eclipse with friends', context: 'Texas road trip for totality' },
    { answer: 'Surprised mom visiting', context: 'Flew home unannounced' }
  ],
  14: [ // Something you're proud of from 2025
    { answer: 'Paid off student loans', context: 'Finally free!' },
    { answer: 'Learned to surf', context: 'Only took 6 months of trying' },
    { answer: 'Started my own business', context: 'Side project went full time' },
    { answer: 'Ran my first 5K', context: 'Couch to 5K actually works' },
    { answer: 'Published an article', context: 'In a real magazine!' },
    { answer: 'Kept all my plants alive', context: 'A personal record' }
  ],
  15: [ // One thing you're excited about in 2026
    { answer: 'Moving to a new city', context: 'Seattle here I come' },
    { answer: 'Planning a Euro trip', context: 'Portugal, Spain, Italy' },
    { answer: 'Starting grad school', context: 'Part-time while working' },
    { answer: 'Getting a puppy', context: 'Golden retriever hopefully' },
    { answer: 'Learning to cook Thai food', context: 'Taking actual classes' },
    { answer: 'Training for a triathlon', context: 'Olympic distance goal' }
  ]
};

async function seedData() {
  const dbPath = process.env.NODE_ENV === 'production'
    ? '/app/data/game.db'
    : path.join(__dirname, '../game.db');

  console.log(`Opening database at: ${dbPath}`);
  const db = new Database(dbPath);

  // Enable WAL mode
  db.pragma('journal_mode = WAL');

  // Create tables if they don't exist
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
  `);

  // Seed prompts if empty
  const promptCount = db.prepare('SELECT COUNT(*) as count FROM prompt').get();
  if (promptCount.count === 0) {
    console.log('Seeding prompts...');
    const insertPrompt = db.prepare(
      'INSERT INTO prompt (id, text, category, order_index) VALUES (?, ?, ?, ?)'
    );
    for (const prompt of PROMPTS) {
      insertPrompt.run(uuidv4(), prompt.text, prompt.category, prompt.order_index);
    }
  }

  // Get prompts
  const prompts = db.prepare('SELECT * FROM prompt ORDER BY order_index').all();
  console.log(`Found ${prompts.length} prompts`);

  // Check if we already have players
  const existingPlayers = db.prepare('SELECT COUNT(*) as count FROM player').get();
  if (existingPlayers.count > 0) {
    console.log(`Database already has ${existingPlayers.count} players.`);
    const readline = await import('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    const answer = await new Promise(resolve => {
      rl.question('Do you want to clear existing data and reseed? (y/N): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      console.log('Aborting.');
      process.exit(0);
    }

    // Clear existing data
    console.log('Clearing existing data...');
    db.prepare('DELETE FROM vote').run();
    db.prepare('DELETE FROM round').run();
    db.prepare('DELETE FROM submission').run();
    db.prepare('DELETE FROM score').run();
    db.prepare('DELETE FROM session').run();
    db.prepare('DELETE FROM player').run();
  }

  // Create players
  console.log('Creating sample players...');
  const insertPlayer = db.prepare('INSERT INTO player (id, display_name, emoji) VALUES (?, ?, ?)');
  const insertSession = db.prepare('INSERT INTO session (id, player_id, session_token) VALUES (?, ?, ?)');
  const insertScore = db.prepare('INSERT INTO score (player_id, points) VALUES (?, 0)');

  const playerIds = [];
  for (const player of SAMPLE_PLAYERS) {
    const id = uuidv4();
    insertPlayer.run(id, player.name, player.emoji);
    insertSession.run(uuidv4(), id, uuidv4());
    insertScore.run(id);
    playerIds.push(id);
    console.log(`  Created: ${player.emoji} ${player.name}`);
  }

  // Create submissions
  console.log('\nCreating sample submissions...');
  const insertSubmission = db.prepare(
    'INSERT INTO submission (id, prompt_id, player_id, answer_text, context_text) VALUES (?, ?, ?, ?, ?)'
  );

  let submissionCount = 0;
  for (const prompt of prompts) {
    const answers = SAMPLE_ANSWERS[prompt.order_index] || [];

    // Randomly assign answers to players (not all players answer all prompts)
    const shuffledPlayers = [...playerIds].sort(() => Math.random() - 0.5);
    const numAnswers = Math.min(answers.length, shuffledPlayers.length);

    for (let i = 0; i < numAnswers; i++) {
      const answer = answers[i];
      const playerId = shuffledPlayers[i];

      insertSubmission.run(
        uuidv4(),
        prompt.id,
        playerId,
        answer.answer,
        answer.context
      );
      submissionCount++;
    }
  }

  console.log(`Created ${submissionCount} submissions across ${prompts.length} prompts`);

  // Summary
  const stats = db.prepare(`
    SELECT p.text, COUNT(s.id) as count
    FROM prompt p
    LEFT JOIN submission s ON s.prompt_id = p.id
    GROUP BY p.id
    ORDER BY p.order_index
  `).all();

  console.log('\n--- Submission Summary ---');
  for (const stat of stats) {
    const bar = '█'.repeat(stat.count) + '░'.repeat(6 - stat.count);
    console.log(`${bar} ${stat.count} - ${stat.text.substring(0, 40)}`);
  }

  const guessWhatEligible = stats.filter(s => s.count >= 4).length;
  console.log(`\n${guessWhatEligible} prompts have 4+ submissions (eligible for Guess What)`);

  db.close();
  console.log('\nDone! Sample data has been seeded.');
}

seedData().catch(console.error);
