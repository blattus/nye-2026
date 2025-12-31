# Deployment Guide

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_CODE` | Password to access admin/TV view | `nye2026admin` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment (`development` or `production`) | `development` |

## Local Development

### Prerequisites
- Node.js 20+
- npm

### Setup & Run

```bash
# Install dependencies (server + client)
npm run setup

# Start development server (runs both backend and frontend)
npm run dev
```

**URLs:**
- Guest view: http://localhost:5173
- Admin/TV view: http://localhost:5173/admin?code=nye2026admin

The dev server uses Vite's proxy to forward API requests to the Express backend.

### Seeding Test Data

For testing, you can populate the database with sample players and submissions:

```bash
# Kill any running servers first
pkill -f "node" || true

# Delete existing database
rm -f game.db*

# Run seed script (creates 12 players with 90 submissions)
node scripts/seed-sample-data.js

# Restart dev server
npm run dev
```

See `docs/testing.md` for full testing guide.

## Docker Deployment

### Quick Start

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

The app will be available at http://your-server:3000

### Custom Admin Code

Create a `.env` file:

```bash
ADMIN_CODE=your-secret-password
```

Or pass it directly:

```bash
ADMIN_CODE=mysecret docker-compose up -d
```

### Production Deployment (Digital Ocean / VPS)

1. **SSH into your server:**
   ```bash
   ssh root@your-server-ip
   ```

2. **Install Docker (if not installed):**
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

3. **Clone or copy the project:**
   ```bash
   git clone <your-repo> nye-2026
   cd nye-2026
   ```

4. **Create .env file:**
   ```bash
   echo "ADMIN_CODE=your-secret-password" > .env
   ```

5. **Build and run:**
   ```bash
   docker-compose up -d --build
   ```

6. **Set up a reverse proxy (optional but recommended):**

   Using Caddy (automatic HTTPS):
   ```bash
   # Install Caddy
   apt install -y caddy

   # Edit Caddyfile
   echo "yourdomain.com {
       reverse_proxy localhost:3000
   }" > /etc/caddy/Caddyfile

   # Reload Caddy
   systemctl reload caddy
   ```

### Data Persistence

SQLite data is stored in a Docker volume (`nye-data`). To backup:

```bash
# Find the volume location
docker volume inspect nye-2026_nye-data

# Or copy from container
docker cp nye-2026-app-1:/app/data/game.db ./backup.db
```

To reset all data:

```bash
docker-compose down -v  # -v removes volumes
docker-compose up -d
```

## Party Night Checklist

### Before the Party

1. **Deploy & Test**
   - Deploy the app and verify it's accessible
   - Test on your phone and TV/iPad
   - Run through the testing checklist in `docs/testing.md`

2. **Admin Setup**
   - Open admin view on TV/iPad: `http://your-server/admin?code=YOUR_CODE`
   - Verify you can see the reel and controls
   - Optional: Enable "Show Leaderboard on TV"

3. **Share with Guests**
   - Share the guest URL with players (or display QR code)
   - Tell guests about the help button (?) if they need instructions

### During the Party

4. **Monitor Players**
   - Watch player joins in admin panel
   - Check submission progress (X/15 per player)
   - Players with incomplete submissions show in yellow

5. **Start Rounds**
   - Need at least 4 players to start rounds
   - Default to "Guess Who" rounds
   - Use "Reroll" if you want to preview different submissions
   - Click "Start Round" when ready

6. **Round Management**
   - Monitor vote count (X/Y voted)
   - **NEW:** Click "End Round Early" once all players have voted to skip timer
   - Watch for timer urgency (turns red at ≤5s)
   - Rounds auto-return to reel after 10s reveal

### Tips

- Players can update their answers anytime before a round uses them
- Toast notifications confirm when answers are saved
- Players see "This is your answer!" if their submission comes up in voting
- Use the help modal (? button) to explain gameplay to new players

## Troubleshooting

**Port already in use:**
```bash
# Find what's using port 3000
lsof -i :3000
# Kill it or change PORT in docker-compose.yml
```

**Container won't start:**
```bash
# Check logs
docker-compose logs app

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

**Database issues:**
```bash
# Reset everything
docker-compose down -v
docker-compose up -d
```
