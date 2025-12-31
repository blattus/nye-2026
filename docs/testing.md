# End-to-End Testing Guide

## Quick Start

```bash
# Reset database and seed sample data
pkill -f "node" || true
rm -f game.db*
node scripts/seed-sample-data.js

# Start dev server
npm run dev
```

## Testing URLs

- **Player view:** http://localhost:5173
- **Admin/TV view:** http://localhost:5173/admin?code=nye2026admin

---

## Test Flow

### 1️⃣ Test Player Join & Help Modal

**On http://localhost:5173**
- [ ] Join as a new player (name + emoji)
- [ ] Should redirect to Play page
- [ ] Click the **?** button in top-right
- [ ] Verify help modal shows 3-step instructions
- [ ] Close modal

### 2️⃣ Test Answering Prompts with Toasts

**Still on Play page**
- [ ] Click a prompt card (should be at least 60px tall - accessibility)
- [ ] Enter an answer (try typing 61+ characters to test validation)
- [ ] Submit answer
- [ ] **NEW:** Green toast should appear saying "Answer saved!"
- [ ] Toast auto-dismisses after 3 seconds
- [ ] Prompt card should show ✓ checkmark
- [ ] Try editing same prompt to test update flow

### 3️⃣ Test Admin Controls & Missing Submissions

**Open http://localhost:5173/admin?code=nye2026admin**
- [ ] Should see reel cycling through submissions with 8-second countdown bar
- [ ] Check player list on right sidebar
- [ ] **NEW:** Players show "X/15" submission progress
- [ ] **NEW:** Incomplete players highlighted in yellow
- [ ] **NEW:** Warning box shows "Need X more players" if <4 players
- [ ] Toggle "Show Leaderboard on TV" checkbox
- [ ] Try "Reroll" button to preview different rounds

### 4️⃣ Test Starting a Round

**Still on admin page**
- [ ] Click "Start Round" button
- [ ] TV display switches to round view
- [ ] Timer counts down from 25 seconds
- [ ] Vote count shows "X/Y voted"

### 5️⃣ Test Voting & End Round Early

**Switch back to player tab (http://localhost:5173)**
- [ ] **NEW:** Info toast appears: "New round starting!"
- [ ] Vote overlay should auto-appear
- [ ] See 4 voting options with **bigger tap targets** (60px tall)
- [ ] **NEW:** Timer turns red and pulses when ≤5 seconds remaining
- [ ] Cast your vote

**Switch to admin tab**
- [ ] Vote count increments
- [ ] **NEW:** Once all players vote, see **"⚡ End Round Early (X/X voted)"** button
- [ ] Click it to skip timer and reveal immediately
- [ ] Reveal shows correct answer + vote distribution
- [ ] After 10s, returns to reel automatically

### 6️⃣ Test Edge Cases

- [ ] Refresh player page during active round (should rejoin seamlessly)
- [ ] Try voting on your own submission (should see "This is your answer!")
- [ ] Test with <4 players (should see warning, can't start Guess What)
- [ ] Test context field (optional 150 char field on submissions)
- [ ] Toggle between Guess Who and Guess What round types

---

## Sample Data Script

The project includes a script to populate the database with sample players and submissions for testing.

### What It Creates

- **12 sample players** with names and emojis (Alex, Jordan, Sam, Taylor, etc.)
- **90 submissions** across all 15 prompts (6 per prompt)
- All prompts eligible for both Guess Who and Guess What rounds

### Running the Script

**Local development:**

```bash
# 1. Kill any running servers first (important!)
pkill -f "node" || true

# 2. Delete existing database
rm -f game.db*

# 3. Run the seed script
node scripts/seed-sample-data.js

# 4. Start the dev server
npm run dev
```

**Important:** Make sure no server is running before seeding, otherwise the server may be using a different database instance.

**In Docker:**

```bash
# If container is running
docker-compose exec app node scripts/seed-sample-data.js

# Or run it separately
docker-compose run --rm app node scripts/seed-sample-data.js
```

### Manual Reset (Admin Panel)

You can also reset all data from the admin panel:

1. Go to `/admin?code=YOUR_ADMIN_CODE`
2. Scroll to bottom of sidebar
3. Click "Reset Game" (with confirmation)

This clears all players, submissions, votes, and rounds but keeps the prompts.

---

## Key Features to Verify

### Recent Improvements (Latest Release)
- ✅ Help modal with game instructions
- ✅ Toast notifications for user actions
- ✅ Missing submission indicators in admin (X/15 with yellow highlight)
- ✅ 44x44px tap targets for accessibility
- ✅ End round early button when all votes are in
- ✅ Timer urgency (red + pulse at ≤5s)
- ✅ Waiting for players warning (<4 players)

### Core Features
- ✅ Answer length validation (60 char max)
- ✅ Reconnection during active rounds
- ✅ Player can't vote on own submission
- ✅ Reel auto-advance every 8 seconds
- ✅ Progress bar countdown on reel cards
- ✅ Vote count display for admin
- ✅ Leaderboard toggle on TV display
- ✅ Shuffled reel order (random, not sequential)

---

## Simulating Multiple Players

For thorough testing, you can open multiple browser tabs/windows in incognito mode. Each incognito window gets its own session cookie, simulating a different player.

1. Open regular browser → Join as Player 1
2. Open incognito window → Join as Player 2
3. Open another incognito window → Join as Player 3
4. Repeat until you have 4+ players

Or use the seed script to create 12 players instantly, then start rounds from admin.

---

## Mobile Safari Specific Testing

- Test on actual iPhone (not just desktop)
- Test with phone locked and unlocked during a round
- Test rotating phone orientation
- Test with slow network (throttle in dev tools)
- Verify tap targets are easy to hit (60px minimum)

---

## Troubleshooting

**Server won't start (EADDRINUSE):**
```bash
pkill -9 node
sleep 2
npm run dev
```

**Database issues:**
```bash
rm -f game.db*
node scripts/seed-sample-data.js
```

**Socket connection issues:**
- Check browser console for errors
- Verify both server (port 3000) and client (port 5173) are running
- Try hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

**Reel not advancing:**
- Check server logs for "Reel tick" messages
- Restart the dev server (pkill -9 node && npm run dev)
