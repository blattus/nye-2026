# Guess My 2025 Favorite — App Spec (Hybrid Reel + Mini-Rounds)

## Finalized Decisions (Dec 30, 2024)

These questions from Section 16 have been resolved:

1. **Party setup**: Single hardcoded party (no join codes)
2. **Scoring**: Voters only get +1 for correct guess
3. **Prompts**: 15 Quick Picks only (from prompts.md)
4. **Round type mix**: Default to Guess Who, admin can manually select Guess What
5. **Guess What decoys**: Same-prompt only (require 4+ submissions)
6. **Tech stack**: Express + Socket.IO + React + Vite + SQLite
7. **Hosting**: Docker (homelab or DO droplet)

---

## 0) Summary
A lightweight “Jackbox-like” web app for a single NYE party:
- Guests join on mobile, pick **name + emoji**, and submit answers to any prompts they want.
- A TV/iPad “Admin” view shows an **ambient reel** of submissions plus **stats**.
- Host can **manually start mini-rounds** (2 quick rounds) at any time.
- Rounds are primarily **Guess Who** (prompt+answer shown, players guess the author), with occasional **Guess What** (prompt+person shown, players guess the answer).
- Works well with ~12 players and iOS Safari; supports reconnect via cookie/session.

---

## 1) Goals / Non-goals

### Goals
1. **Low-friction participation**:
   - Join in <15 seconds.
   - Submit answers quickly with minimal typing (one-liners).
2. **Hybrid mode**:
   - Reel runs continuously.
   - Host manually triggers mini-rounds when the room is ready.
3. **Jackbox-like UX**:
   - Player phones show the right screen at the right time, in sync with TV.
4. **Good round selection**:
   - Use real submissions as decoys where possible.
   - Avoid “dead” prompts with too few submissions.
5. **Resilient reconnection**:
   - Returning to the site restores identity and state (cookie/session).
6. **Simple admin operations**:
   - Start/stop rounds, choose round type, see participation stats, reset game if needed.

### Non-goals (initially)
- Multi-room / multiple parties at once (can add later).
- Accounts/passwords.
- Complex moderation tools.
- Rich media uploads (photos) beyond optional text links (optional later).

---

## 2) Core Concepts & Terminology
- **Party (Room)**: A single event instance. Has a join code / URL.
- **Player**: A participant with (name, emoji).
- **Admin**: A privileged session controlling the TV experience.
- **Prompt**: A question (e.g., “Anthem of 2025”).
- **Submission**: A player’s answer to a prompt (text, optional context).
- **Reel**: TV feed of submissions rotating, optionally anonymized.
- **Round**: A mini-game question instance derived from a submission.
- **Vote**: A player’s answer during a round.

---

## 3) User Experience Overview

### 3.1 Guest flow (mobile)
1. Open join link / scan QR.
2. Pick **name + emoji** (and confirm if duplicate name).
3. Land on **Answer Prompts** screen:
   - “Quick Picks” list at top (15).
   - “More prompts” categorized below.
   - Tap prompt → enter answer → submit.
4. At any time, when a round starts:
   - The phone auto-switches to “Round Voting” screen (via realtime events).
5. After voting, see “Waiting for reveal” then optionally “Correct/Score” feedback.

### 3.2 Admin/TV flow (iPad mirrored)
1. Admin login (simple secret code).
2. Default mode: **Reel + Stats**:
   - Reel cards rotate (prompt + answer; author hidden by default).
   - Stats: joined players, submissions count, submissions per prompt, who hasn’t submitted yet.
3. Host triggers mini-round:
   - Choose: “Start Round” → optionally select type (Guess Who vs Guess What) or “Auto”.
   - App proposes a candidate round (“best available”) with quick “reroll” and “start now”.
4. Round progression:
   - Round intro (TV shows prompt + answer/person, countdown).
   - Voting window (phones show choices).
   - Reveal (TV shows correct + distribution).
   - Score update / leaderboard.
5. Back to reel.

---

## 4) Prompt Pack (Quick Picks 15)
(From your finalized list; stored as seed data)

Core Favorites
1. Anthem of 2025 (song)
2. Favorite purchase under $100
3. Favorite place you went
4. Small obsession (one word/phrase)
5. Best late-night snack
6. Drink of the year
7. Best life improvement (habit, routine, mindset)
8. Most used app besides texting
9. Favorite movie
10. Favorite show
11. Favorite book
12. Favorite game

Sentimental / Forward-Looking
13. Best moment of 2025 in 3 words (optional 1 sentence)
14. Something you’re proud of from 2025 (small or big)
15. One thing you’re excited about in 2026 (one sentence)

Prompt attributes (per prompt)
- `id`, `text`, `category`, `is_quick_pick`, `answer_style`:
  - `short` (one-liner), `three_words`, `sentence`, `freeform`
- `eligible_round_types`: Guess Who / Guess What (some prompts may be better for Who)

---

## 5) Game Modes

### 5.1 Reel Mode (ambient)
- Default TV mode.
- Rotates through submitted cards every N seconds (e.g., 6–10s).
- Card shows:
  - Prompt title
  - Answer text
  - Optional context line (if provided)
  - Author display configurable:
    - Default: **hidden** (good for later Guess Who)
    - Admin toggle: show author emoji+name (for shoutouts)

Reel filters/toggles (admin)
- Show: all prompts vs only Quick Picks
- Show: only unanswered-by-most prompts (to encourage)
- Reveal mode:
  - “Anonymous”
  - “Reveal author after X seconds”
  - “Always show author”

### 5.2 Mini-Rounds
Host manually triggers.

#### Round Type A: Guess Who (default)
TV shows:
- Prompt + Answer (no author)
Phones show:
- 4 choices: **names/emojis** (author + 3 decoys)
Scoring:
- Voters: +1 for correct
- (Optional) Author: +1 for each person fooled OR +1 if fooled majority

Eligibility:
- Requires ≥4 players joined (obvious)
- Requires at least 1 submission (the target)

Decoy selection:
- Prefer decoys that have submitted for that prompt or related prompts (optional).
- Otherwise random among active players.

#### Round Type B: Guess What (twist)
TV shows:
- Prompt + Person (emoji+name)
Phones show:
- 4 choices: **answers** (true + 3 decoys)
Scoring:
- Voters: +1 for correct
- (Optional) Person: +1 if fooled majority

Eligibility:
- Strongly prefer prompts with ≥4 submissions for that prompt to produce real decoys.
- Fallback: use decoys from same category prompts if needed (configurable).

Decoy generation rules:
1. First choice: other submissions to the same prompt.
2. Second: submissions to prompts in the same category (Food/Drink, Culture, etc.).
3. Last resort: “synthetic decoys” (admin-entered list per prompt category) — optional.

---

## 6) Realtime State Machine (Jackbox-style)
Single authoritative game state on server.

### States
- `LOBBY` (players can join)
- `REEL` (default idle)
- `ROUND_PENDING` (admin selected candidate; preview on TV)
- `ROUND_ACTIVE` (voting open)
- `ROUND_REVEAL` (results + correct answer shown)
- `SCOREBOARD` (optional short interstitial)
- back to `REEL`

### Timers (configurable)
- Voting: 20–40 seconds (default 25s)
- Reveal: 8–15 seconds (default 10s)
- Scoreboard: 5–10 seconds (optional)

### Realtime transport
- WebSocket preferred (Socket.IO or native WS).
- SSE acceptable if simpler, but WS is better for bidirectional events.

Events (server → client)
- `party_state_update` (full state snapshot)
- `round_started` (round payload + deadline timestamp)
- `vote_update` (optional for admin stats)
- `round_revealed` (correct choice + distribution)
- `score_updated` (new leaderboard)
- `reel_update` (new reel card index)

Events (client → server)
- `join_party` (name, emoji)
- `submit_answer` (prompt_id, answer, context?)
- `start_round` (admin only; type + selection params)
- `cast_vote` (round_id, option_id)
- `admin_toggle` (reel display toggles)

---

## 7) UI / Screens (Detailed)

### 7.1 Guest: Join
Route: `/`
- Fields:
  - Name (text)
  - Emoji picker (simple list + “randomize”)
- CTA: “Join”
- If cookie session exists: auto-skip to `/play` and show “Welcome back, {name}”.

Edge cases:
- Duplicate name: prompt “Pick a different name” or auto-append (e.g., “Roshan 2”).
- Emoji collision: allowed.

### 7.2 Guest: Play (Answer Prompts)
Route: `/play`
Sections:
- Top bar: player emoji+name, submissions count, “Change name/emoji” (optional, admin can disable mid-game).
- “Quick Picks (15)” grid/list:
  - Each prompt card shows status: unanswered/answered (checkmark).
- “More prompts” categories (collapsible).
- Prompt detail modal:
  - Answer input (single line default; textarea for freeform)
  - Optional context input (small text)
  - Submit button
  - “Save & add another”

Quality nudges:
- Placeholder examples (optional, minimal).
- “Answer any 3 to start” badge.

### 7.3 Guest: Round Voting
Route: `/vote`
- Shows prompt and either:
  - Guess Who: “Who is this?” with 4 name/emoji buttons
  - Guess What: “What is their favorite?” with 4 answer buttons
- Countdown timer (client computed from server deadline)
- After vote: lock UI and show “Waiting for reveal…”

### 7.4 Guest: Results (Optional)
Can be part of `/vote` after reveal
- Shows correct answer + whether you were right
- Shows your total score (optional, depending on scoring choice)

### 7.5 Admin: TV Reel + Panel
Route: `/admin` (same page drives TV)
Layout:
- Left/center: “TV stage”
  - Reel card display (large, readable)
  - During rounds: round screen (prompt, answer/person, countdown, then reveal)
- Right sidebar: admin controls + stats
  - Party status: players joined, active now, submissions total
  - “Start mini-round” button (primary)
  - Suggested round preview:
    - Round type selector: Auto / Guess Who / Guess What
    - “Reroll” candidate
    - “Start now”
  - Prompt coverage chart/table:
    - per prompt: submissions count
  - Players list:
    - name/emoji + submissions count + last seen timestamp
    - “Nudge prompt” button (optional: highlights a prompt on everyone’s phone)

Admin auth:
- Access gated by `ADMIN_CODE` (env var), stored in admin cookie.
- Alternative: admin link with token query param (one-time) (optional).

---

## 8) Round Selection Algorithm (Important)

### Candidate pool building
On “Start round”:
1. Build list of eligible submissions:
   - Exclude submissions already used in prior rounds (configurable; default exclude).
   - Exclude submissions from players not currently connected (optional; default include if joined).
2. Score each submission for round fitness based on chosen round type.

### Fitness scoring (heuristic)
For Guess Who:
- + if prompt has medium number of submissions (2–6) (more plausible decoys by association)
- + if author has submitted ≥2 total prompts (people have “signal”)
- - if answer is extremely generic (“Pizza”, “Netflix”) — optional basic generic list

For Guess What:
- Hard requirement: prompt submissions count ≥4 OR category pool ≥8
- + if decoys available from same prompt (best)
- - if answer length too long (hard to read on phone choices)

### Selection UI for admin
- Default: show “Best available (Guess Who)”.
- Admin can tap “Reroll” up to N times.
- Admin can “Pin prompt” (optional) to choose a specific prompt for next round.

---

## 9) Data Model (Relational)

### Tables
**party**
- `id` (uuid)
- `name` (text) e.g., “NYE 2025”
- `join_code` (short code) optional
- `created_at`
- `settings` (json): timers, scoring mode, reel mode, etc.

**player**
- `id` (uuid)
- `party_id`
- `display_name`
- `emoji`
- `created_at`
- `last_seen_at`
- `is_admin` (bool, default false)

**session**
- `id` (uuid)
- `party_id`
- `player_id` (nullable until join)
- `session_token` (random, stored as cookie)
- `created_at`
- `last_seen_at`
- `is_admin_session` (bool)

**prompt**
- `id` (uuid)
- `party_id` (nullable if global)
- `text`
- `category`
- `is_quick_pick`
- `answer_style`
- `eligible_round_types` (json array)
- `order_index` (int)

**submission**
- `id` (uuid)
- `party_id`
- `prompt_id`
- `player_id`
- `answer_text`
- `context_text` (nullable)
- `created_at`
- `is_used_in_round` (bool default false)

**round**
- `id` (uuid)
- `party_id`
- `type` (enum: GUESS_WHO, GUESS_WHAT)
- `prompt_id`
- `submission_id` (target)
- `status` (PENDING, ACTIVE, REVEALED, CLOSED)
- `started_at`
- `deadline_at`
- `revealed_at`
- `payload` (json): options, correct_option_id

**vote**
- `id` (uuid)
- `round_id`
- `player_id`
- `option_id`
- `created_at`

**score**
- `party_id`
- `player_id`
- `points`
- primary key (party_id, player_id)

---

## 10) API Endpoints (REST) + WebSocket
(Exact routing can vary by framework; keep it simple.)

### REST
- `POST /api/party/:join_code/join`
  - body: { name, emoji }
  - returns: { player, session_token }
- `GET /api/party/state`
  - returns: current party state snapshot (for initial load)
- `POST /api/submissions`
  - body: { prompt_id, answer_text, context_text? }
- `POST /api/admin/start-round`
  - body: { type: "AUTO"|"GUESS_WHO"|"GUESS_WHAT", selection?: {...} }
- `POST /api/vote`
  - body: { round_id, option_id }

### WebSocket message types
- Client subscribe on connect with { session_token }
- Server pushes `party_state_update` snapshots and deltas.

---

## 11) Tech Stack Recommendation (practical)
Given “vibecode” + home infra + quick iteration:

### Option A (recommended): Next.js + Node + Postgres/SQLite + Socket.IO
- Next.js app (single repo)
- API routes for REST
- Socket.IO for realtime
- DB:
  - SQLite for simplest self-host (works fine for one party)
  - Postgres if you want cloud deploy
- ORM: Prisma or Drizzle

### Option B: FastAPI + WebSockets + simple frontend
- If you prefer Python
- Frontend: minimal React/Vite
- DB: SQLite/Postgres
- WS: native FastAPI websockets

### Hosting
- Self-host: Docker compose on your homelab (reverse proxy via nginx/traefik)
- Cloud: Fly.io / Render / Railway / Vercel (but WS support varies—check)

---

## 12) Security / Abuse (Lightweight)
- Party join is via link or join code.
- Rate limit submissions per player (e.g., max 50).
- Admin auth:
  - `ADMIN_CODE` env var; admin enters once; stored in admin cookie.
  - Admin actions require admin session.
- Sanitization:
  - Escape HTML; store plain text.
  - Optional “PG filter” is out of scope.

---

## 13) Reliability / Reconnect Behavior
- Cookie `session_token` (HTTP-only if possible; if not, localStorage ok).
- On reconnect:
  - Client sends `session_token` and receives state.
  - If round active and player hasn’t voted, show voting screen.
  - If player already voted, show waiting screen.

---

## 14) Admin Panel Stats (Minimum Set)
- Players:
  - joined count
  - currently connected count (WS presence)
  - per-player submissions count
- Submissions:
  - total
  - per-prompt counts
- Round readiness:
  - “Guess What eligible prompts” count (prompts with ≥4 submissions)
  - last round time
- Controls:
  - Start round / reroll / force type
  - End round early (optional)
  - Reset party (danger, confirm)

---

## 15) Testing Checklist (party realism)
- iOS Safari backgrounding + returning keeps identity.
- Two devices with same name: handled.
- Admin starts round while someone is mid-submission: no data loss.
- Voting on flaky Wi-Fi: vote is idempotent; last vote wins or first vote locks (choose).
- Screen sizes: iPhone small + iPad landscape.

---

## 16) Open Questions (to finalize before coding)
1. **One party or multiple rooms?**
   - Easiest: single party hardcoded. Slightly more work: join code rooms.
2. **Scoring: on or off?** If on:
   - Only voters score? Any bonus for the author “fooling” people?
3. **Reveal policy on the reel:**
   - Always anonymous? Or allow “reveal author” toggle on TV?
4. **Answer format constraints:**
   - Do we enforce max length (e.g., 60 chars) for anything used as a multiple-choice option?
5. **Prompt bank scope:**
   - Only the 15 Quick Picks for v1, or also include “More prompts” from the larger bank now?
6. **Round mix:**
   - Default 80/20 Guess Who vs Guess What? Or manual selection each time?
7. **Handling sparse prompts for Guess What:**
   - Are category-based decoys acceptable, or do you want Guess What only when same-prompt decoys exist?
8. **Admin selection control:**
   - Do you want “Pick a specific prompt/person” manually, or keep it “suggest + reroll” only?
9. **Name privacy:**
   - Is it okay that everyone sees everyone’s name/emoji on their phones during Guess Who choices?

Once you answer these, the next step is to convert this into an implementation plan: repo structure, concrete routes/components, DB schema migrations, and the exact WS event payloads.
