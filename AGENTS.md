# AGENTS.md

## Cursor Cloud specific instructions

This is a self-contained Jackbox-style NYE party game (Express + Socket.IO backend, React + Vite frontend, embedded SQLite). No external services or databases required.

### Services

| Service | Dev Command | Port | Notes |
|---------|------------|------|-------|
| Express + Socket.IO backend | `npm run dev:server` | 3000 | REST API + WebSocket. SQLite DB auto-created at `game.db` |
| Vite React frontend | `npm run dev:client` | 5173 | Proxies `/api` and `/socket.io` to `:3000` |

Both start together with `npm run dev`. See `CLAUDE.md` and `README.md` for full command reference.

### Key caveats

- **Seed data before testing**: Run `rm -f game.db* && node scripts/seed-sample-data.js` before `npm run dev` to populate 12 sample players and 90 submissions. The server must NOT be running during seeding (it locks the SQLite file).
- **SQLite file locking**: Only one process can write to `game.db` at a time. Stop the dev server before running seed scripts or direct DB manipulation.
- **Admin URL**: `http://localhost:5173/admin?code=nye2026admin` (default admin code).
- **No lint/test tooling**: This codebase has no ESLint config, Prettier config, or automated test suite. Validation is manual via the browser.
- **Build output**: `npm run build` outputs to `client/dist/` and is served by Express in production mode.
