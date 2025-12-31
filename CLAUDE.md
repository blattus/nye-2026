# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Jackbox-style NYE party game where guests join on mobile, submit answers to prompts, and play guessing rounds on a shared TV display.

## Commands

```bash
# Install all dependencies (server + client)
npm run setup

# Development (runs Express backend + Vite frontend concurrently)
npm run dev

# Seed sample data for testing (kill server first!)
pkill -f "node" || true
node scripts/seed-sample-data.js
npm run dev

# Production build
npm run build
npm run start

# Docker
docker-compose up -d
```

**URLs (dev):**
- Guest: http://localhost:5173
- Admin/TV: http://localhost:5173/admin?code=nye2026admin

## Architecture

### Backend (server/)
- **index.js** - Express + Socket.IO server entry point
- **db.js** - SQLite schema (better-sqlite3), seeds 15 prompts on init
- **game.js** - `GameState` class: state machine (REEL → ROUND_ACTIVE → ROUND_REVEAL), round selection algorithm, voting logic
- **routes/api.js** - Player endpoints: `/api/join`, `/api/submit`, `/api/vote`, `/api/state`
- **routes/admin.js** - Admin endpoints: `/api/admin/stats`, `/api/admin/start-round`, `/api/admin/candidate`
- **socket/handlers.js** - WebSocket events: `authenticate`, `reel_tick`, `round_started`, `round_revealed`

### Frontend (client/src/)
- **context/GameContext.jsx** - Central state: player, prompts, submissions, round state. Manages Socket.IO connection and API calls.
- **pages/Join.jsx** - Name + emoji picker
- **pages/Play.jsx** - Prompt list with answer modals, auto-switches to VoteOverlay during rounds
- **pages/Admin.jsx** - TV display (reel/round) + admin controls sidebar
- **components/VoteOverlay.jsx** - Voting UI with countdown, shows "This is your answer!" for submission author

### Game Flow
1. Players join via `/` → cookie session created
2. Players answer prompts on `/play`
3. Admin sees reel cycling submissions on `/admin`
4. Admin clicks "Start Round" → server picks submission + decoys
5. All player phones switch to voting (via `round_started` socket event)
6. After 25s, server reveals answer + awards points (`round_revealed`)
7. Returns to reel after 10s

### Round Types
- **Guess Who**: Show answer, guess which player wrote it (4 player options)
- **Guess What**: Show player name, guess their answer (requires 4+ submissions on same prompt)

## Key Design Decisions

- Single hardcoded party (no room codes)
- Voters get +1 for correct guess only
- SQLite database at `game.db` (dev) or `/app/data/game.db` (Docker)
- Session tokens stored in HTTP-only cookies
- Admin auth via `ADMIN_CODE` env var (default: `nye2026admin`)
