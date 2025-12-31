# NYE 2026 Party Game

A Jackbox-style party game where guests join on their phones, submit answers to prompts, and play guessing rounds on a shared TV display.

## Features

- 📱 **Mobile-first design** - Guests join and play on their phones
- 📺 **TV display** - Shared screen shows submissions reel and live rounds
- 🎮 **Two game modes**:
  - **Guess Who**: See an answer, guess who said it
  - **Guess What**: See a person, guess their answer
- 🏆 **Live scoring** - Real-time leaderboard updates
- 🔄 **Real-time sync** - WebSocket-powered instant updates
- ⚡ **End round early** - Skip timer when all players have voted
- 🎯 **Accessibility** - 44x44px tap targets, toast notifications

## Quick Start

### Development

```bash
# Install dependencies
npm run setup

# Start dev server
npm run dev
```

**URLs:**
- Player view: http://localhost:5173
- Admin/TV view: http://localhost:5173/admin?code=nye2026admin

### Docker Deployment

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f
```

The app will be available at http://your-server:3000

## Tech Stack

- **Backend**: Express + Socket.IO + SQLite
- **Frontend**: React + Vite
- **Styling**: CSS Modules
- **Deployment**: Docker

## Project Structure

```
nye-2026/
├── server/
│   ├── index.js          # Express + Socket.IO entry
│   ├── db.js             # SQLite schema + queries
│   ├── game.js           # Game state machine
│   ├── routes/
│   │   ├── api.js        # Player endpoints
│   │   └── admin.js      # Admin endpoints
│   └── socket/
│       └── handlers.js   # WebSocket events
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Join.jsx  # Name + emoji picker
│   │   │   ├── Play.jsx  # Answer prompts
│   │   │   └── Admin.jsx # TV view + controls
│   │   ├── components/
│   │   │   ├── VoteOverlay.jsx
│   │   │   └── Toast.jsx
│   │   └── context/
│   │       └── GameContext.jsx
│   └── index.html
├── scripts/
│   └── seed-sample-data.js
└── docs/
    ├── deploy.md
    ├── testing.md
    └── improvements.md
```

## Game Flow

1. **Players join** → Enter name and pick emoji
2. **Answer prompts** → 15 Quick Pick prompts (e.g., "Anthem of 2025", "Best late-night snack")
3. **Reel mode** → Submissions cycle on TV while players answer
4. **Admin starts round** → Picks Guess Who or Guess What
5. **Players vote** → 25 seconds to guess (with red timer urgency at ≤5s)
6. **Reveal results** → Show correct answer, vote distribution, and leaderboard
7. **Repeat** → Auto-return to reel after 10 seconds

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_CODE` | Password to access admin/TV view | `nye2026admin` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment (`development` or `production`) | `development` |

## Testing

Run the seed script to populate with sample data:

```bash
# Kill any running servers
pkill -f "node" || true

# Delete existing database
rm -f game.db*

# Seed sample data (12 players, 90 submissions)
node scripts/seed-sample-data.js

# Start dev server
npm run dev
```

See `docs/testing.md` for full testing guide.

## Deployment

See `docs/deploy.md` for detailed deployment instructions including:
- Local development setup
- Docker deployment
- Production deployment to VPS/Digital Ocean
- Party night checklist

## Recent Improvements

- ✅ Help modal with game instructions
- ✅ Toast notifications for user actions
- ✅ Missing submission indicators (X/15 with yellow highlight)
- ✅ 44x44px tap targets for accessibility
- ✅ End round early button when all votes are in
- ✅ Timer urgency (red + pulse at ≤5s)
- ✅ Waiting for players warning (<4 players)
- ✅ Answer length validation (60 char max)
- ✅ Reconnection during active rounds
- ✅ Player can't vote on own submission
- ✅ Shuffled reel order

See `docs/improvements.md` for full list of completed and deferred improvements.

## License

MIT
