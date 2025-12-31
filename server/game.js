import { v4 as uuidv4 } from 'uuid';

// Game states
export const GameStatus = {
  REEL: 'REEL',
  ROUND_ACTIVE: 'ROUND_ACTIVE',
  ROUND_REVEAL: 'ROUND_REVEAL'
};

export class GameState {
  constructor(db) {
    this.db = db;
    this.status = GameStatus.REEL;
    this.currentRound = null;
    this.reelIndex = 0;
    this.connectedPlayers = new Map(); // socketId -> playerId
    this.roundTimer = null;
    this.revealTimer = null;
  }

  getState() {
    return {
      status: this.status,
      currentRound: this.currentRound,
      reelIndex: this.reelIndex
    };
  }

  // Get submissions for reel display
  getReelSubmissions() {
    return this.db.prepare(`
      SELECT s.id, s.answer_text, s.context_text, s.prompt_id,
             pr.text as prompt_text
      FROM submission s
      JOIN prompt pr ON pr.id = s.prompt_id
      ORDER BY s.created_at
    `).all();
  }

  // Advance reel to random submission
  advanceReel() {
    const submissions = this.getReelSubmissions();
    if (submissions.length > 0) {
      // Pick a random submission each time
      this.reelIndex = Math.floor(Math.random() * submissions.length);
    }
    return this.getCurrentReelItem();
  }

  getCurrentReelItem() {
    const submissions = this.getReelSubmissions();
    if (submissions.length === 0) return null;
    return submissions[this.reelIndex % submissions.length];
  }

  // Get candidate round for admin preview
  getCandidateRound(type = 'GUESS_WHO') {
    // Get unused submissions
    const submissions = this.db.prepare(`
      SELECT s.*, p.display_name, p.emoji, p.id as player_id, pr.text as prompt_text
      FROM submission s
      JOIN player p ON p.id = s.player_id
      JOIN prompt pr ON pr.id = s.prompt_id
      WHERE s.is_used_in_round = 0
      ORDER BY RANDOM()
    `).all();

    if (submissions.length === 0) {
      // Reset used flags if we've used everything
      this.db.prepare('UPDATE submission SET is_used_in_round = 0').run();
      return this.getCandidateRound(type);
    }

    const players = this.db.prepare('SELECT * FROM player').all();

    if (type === 'GUESS_WHAT') {
      // Need prompts with 4+ submissions
      const promptCounts = this.db.prepare(`
        SELECT prompt_id, COUNT(*) as count
        FROM submission
        WHERE is_used_in_round = 0
        GROUP BY prompt_id
        HAVING count >= 4
      `).all();

      if (promptCounts.length === 0) {
        return { error: 'No prompts have 4+ submissions for Guess What' };
      }

      // Pick random eligible prompt
      const promptId = promptCounts[Math.floor(Math.random() * promptCounts.length)].prompt_id;
      const promptSubmissions = submissions.filter(s => s.prompt_id === promptId);
      const target = promptSubmissions[Math.floor(Math.random() * promptSubmissions.length)];

      // Get 3 decoy answers from same prompt
      const decoys = promptSubmissions
        .filter(s => s.id !== target.id)
        .slice(0, 3);

      const options = [
        { id: uuidv4(), text: target.answer_text, isCorrect: true },
        ...decoys.map(d => ({ id: uuidv4(), text: d.answer_text, isCorrect: false }))
      ].sort(() => Math.random() - 0.5);

      return {
        type: 'GUESS_WHAT',
        submission: target,
        prompt: { id: target.prompt_id, text: target.prompt_text },
        showPerson: { name: target.display_name, emoji: target.emoji },
        options,
        correctOptionId: options.find(o => o.isCorrect).id
      };
    }

    // GUESS_WHO (default)
    if (players.length < 4) {
      return { error: 'Need at least 4 players for a round' };
    }

    const target = submissions[0];

    // Get 3 random decoy players (not the author)
    const decoyPlayers = players
      .filter(p => p.id !== target.player_id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const options = [
      { id: uuidv4(), playerId: target.player_id, name: target.display_name, emoji: target.emoji, isCorrect: true },
      ...decoyPlayers.map(p => ({ id: uuidv4(), playerId: p.id, name: p.display_name, emoji: p.emoji, isCorrect: false }))
    ].sort(() => Math.random() - 0.5);

    return {
      type: 'GUESS_WHO',
      submission: target,
      prompt: { id: target.prompt_id, text: target.prompt_text },
      showAnswer: target.answer_text,
      options,
      correctOptionId: options.find(o => o.isCorrect).id
    };
  }

  // Start a round
  startRound(candidate, io) {
    if (!candidate || candidate.error) {
      return { error: candidate?.error || 'Invalid candidate' };
    }

    const roundId = uuidv4();
    const deadline = new Date(Date.now() + 20000); // 20 seconds

    // Mark submission as used
    this.db.prepare('UPDATE submission SET is_used_in_round = 1 WHERE id = ?')
      .run(candidate.submission.id);

    // Save round to DB
    this.db.prepare(`
      INSERT INTO round (id, type, prompt_id, submission_id, status, payload, started_at, deadline_at)
      VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?)
    `).run(
      roundId,
      candidate.type,
      candidate.prompt.id,
      candidate.submission.id,
      JSON.stringify({
        options: candidate.options,
        correctOptionId: candidate.correctOptionId,
        showAnswer: candidate.showAnswer,
        showPerson: candidate.showPerson
      }),
      new Date().toISOString(),
      deadline.toISOString()
    );

    this.currentRound = {
      id: roundId,
      type: candidate.type,
      prompt: candidate.prompt,
      showAnswer: candidate.showAnswer,
      showPerson: candidate.showPerson,
      options: candidate.options.map(o => ({ id: o.id, name: o.name, emoji: o.emoji, text: o.text })),
      correctOptionId: candidate.correctOptionId,
      authorPlayerId: candidate.submission.player_id, // For checking if player should abstain
      deadline: deadline.toISOString(),
      votes: {}
    };

    this.status = GameStatus.ROUND_ACTIVE;

    // Set timer for reveal
    this.roundTimer = setTimeout(() => {
      this.revealRound(io);
    }, 20000);

    return { success: true, round: this.currentRound };
  }

  // Cast a vote
  castVote(playerId, optionId) {
    if (this.status !== GameStatus.ROUND_ACTIVE || !this.currentRound) {
      return { error: 'No active round' };
    }

    // Check if already voted
    const existing = this.db.prepare(
      'SELECT * FROM vote WHERE round_id = ? AND player_id = ?'
    ).get(this.currentRound.id, playerId);

    if (existing) {
      return { error: 'Already voted' };
    }

    // Save vote
    this.db.prepare(
      'INSERT INTO vote (id, round_id, player_id, option_id) VALUES (?, ?, ?, ?)'
    ).run(uuidv4(), this.currentRound.id, playerId, optionId);

    this.currentRound.votes[playerId] = optionId;

    return { success: true };
  }

  // Reveal round results
  revealRound(io) {
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }

    if (!this.currentRound) return;

    this.status = GameStatus.ROUND_REVEAL;

    // Get all votes for this round
    const votes = this.db.prepare(
      'SELECT * FROM vote WHERE round_id = ?'
    ).all(this.currentRound.id);

    // Calculate distribution
    const distribution = {};
    this.currentRound.options.forEach(o => {
      distribution[o.id] = 0;
    });

    votes.forEach(v => {
      if (distribution[v.option_id] !== undefined) {
        distribution[v.option_id]++;
      }
    });

    // Award points
    const correctVoters = votes.filter(v => v.option_id === this.currentRound.correctOptionId);
    correctVoters.forEach(v => {
      this.db.prepare(`
        INSERT INTO score (player_id, points) VALUES (?, 1)
        ON CONFLICT(player_id) DO UPDATE SET points = points + 1
      `).run(v.player_id);
    });

    // Update round status
    this.db.prepare(`
      UPDATE round SET status = 'REVEALED', revealed_at = ? WHERE id = ?
    `).run(new Date().toISOString(), this.currentRound.id);

    // Get updated scores
    const scores = this.db.prepare(`
      SELECT s.*, p.display_name, p.emoji
      FROM score s
      JOIN player p ON p.id = s.player_id
      ORDER BY s.points DESC
    `).all();

    const revealData = {
      correctOptionId: this.currentRound.correctOptionId,
      distribution,
      correctVoters: correctVoters.map(v => v.player_id),
      scores
    };

    // Emit reveal event
    io.emit('round_revealed', revealData);

    // Set timer to return to reel
    this.revealTimer = setTimeout(() => {
      this.returnToReel(io);
    }, 10000);

    return revealData;
  }

  // Return to reel mode
  returnToReel(io) {
    if (this.revealTimer) {
      clearTimeout(this.revealTimer);
      this.revealTimer = null;
    }

    this.status = GameStatus.REEL;
    this.currentRound = null;

    io.emit('state_update', this.getState());
  }

  // Admin stats
  getStats() {
    const players = this.db.prepare('SELECT * FROM player').all();
    const submissions = this.db.prepare(`
      SELECT s.player_id, COUNT(*) as count
      FROM submission s
      GROUP BY s.player_id
    `).all();

    const submissionsByPlayer = {};
    submissions.forEach(s => {
      submissionsByPlayer[s.player_id] = s.count;
    });

    const promptStats = this.db.prepare(`
      SELECT p.id, p.text, COUNT(s.id) as submission_count
      FROM prompt p
      LEFT JOIN submission s ON s.prompt_id = p.id
      GROUP BY p.id
      ORDER BY p.order_index
    `).all();

    const totalSubmissions = this.db.prepare('SELECT COUNT(*) as count FROM submission').get().count;

    const guessWhatEligible = promptStats.filter(p => p.submission_count >= 4).length;

    const scores = this.db.prepare(`
      SELECT s.*, p.display_name, p.emoji
      FROM score s
      JOIN player p ON p.id = s.player_id
      ORDER BY s.points DESC
    `).all();

    return {
      players: players.map(p => ({
        ...p,
        submissionCount: submissionsByPlayer[p.id] || 0,
        isConnected: Array.from(this.connectedPlayers.values()).includes(p.id)
      })),
      totalPlayers: players.length,
      connectedPlayers: this.connectedPlayers.size,
      totalSubmissions,
      promptStats,
      guessWhatEligible,
      scores
    };
  }
}
