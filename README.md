# Ball Sort Backend

Production-ready backend API for Ball Sort - A fully on-chain, decentralized puzzle game with tournaments on Solana using MagicBlock Ephemeral Rollups.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running the Server](#running-the-server)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Cron Jobs & Webhooks](#cron-jobs--webhooks)
- [Deployment](#deployment)

## Features

- **Embedded Wallets**: Seamless player authentication and wallet generation via Privy.
- **Tournament Management**: Create and track competitive puzzle tournaments with entry fees and prize pools.
- **Leaderboards**: Global and difficulty-based leaderboards with real-time ranking.
- **On-Chain Verification**: Every puzzle move and completion is verified and recorded on Solana.
- **Real-Time Live Feed**: WebSockets broadcast live player activity, solved puzzles, and tournament entries instantly.
- **Helius Webhooks**: Robust indexing of on-chain Solana transactions for accurate database sync.
- **Automated Syncing**: Cron jobs constantly sync the on-chain protocol state, active tournaments, and leaderboards.
- **Status Dashboard**: Live, GUI-based health dashboard visualizing system metrics, database, and RPC connection status.
- **Type Safety**: Full TypeScript implementation with rigorous runtime validation via Zod.

## Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Fastify with TypeScript
- **Database**: Supabase (PostgreSQL)
- **Validation**: Zod
- **Blockchain**: Solana Web3.js + Anchor + MagicBlock
- **Authentication**: Privy
- **Job Scheduler**: node-cron
- **WebSockets**: @fastify/websocket
- **Indexer**: Helius Webhooks

## Prerequisites

Before you begin, ensure you have:

- Node.js >= 18.x
- `pnpm` (recommended), `npm`, or `yarn`
- A Supabase account and project
- A Privy account and App ID
- A Solana RPC URL (Devnet/Mainnet)
- Helius account for Webhook secrets

## Installation

1. **Clone the repository**

```bash
git clone https://github.com/your-org/ball-sort.git
cd ball-sort/backend
```

2. **Install dependencies**

```bash
pnpm install
```

## Configuration

1. **Create `.env` file**

```bash
cp .env.example .env
```

2. **Configure environment variables**

```env
# Server Configuration
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Supabase Configurations
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Privy Settings
PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-app-secret
PRIVY_VERIFICATION_KEY=your-privy-verification-key

# Solana / Blockchain
RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=your-anchor-program-id
ADMIN_WALLETS=wallet1,wallet2

# Helius Webhooks
HELIUS_WEBHOOK_SECRET=your-helius-webhook-secret
```

### Environment Variables Explained

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 4000) | Yes |
| `SUPABASE_URL` | Your Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service key (bypasses RLS) | Yes |
| `PRIVY_APP_ID` | Privy application ID | Yes |
| `RPC_URL` | Solana RPC endpoint | Yes |
| `PROGRAM_ID` | Deployed Anchor program ID | Yes |
| `HELIUS_WEBHOOK_SECRET` | Secret to verify Helius payloads | Yes |

## Database Setup

1. **Go to your Supabase project**
2. **Open SQL Editor**
3. **Run the schema script**

Copy and paste the contents of `supabase/schema.sql` into the SQL editor and execute it.

The schema creates:
- `players` table (Tracks Privy users and stats)
- `puzzle_results` table (Records solved puzzles)
- `tournaments` & `tournament_entries` tables
- `activity` table (For the live websocket feed)
- `leaderboard` table (Materialized rankings)
- `transactions` & `protocol` tables
- RPC functions for stats increments and leaderboard rebuilding.

## Running the Server

### Development Mode

```bash
pnpm run dev
```

This starts the Fastify server with hot-reload via `tsx watch`. It automatically loads the `.env` file.

### Production Mode

```bash
# Build TypeScript
pnpm run build

# Start server
pnpm start
```

### Health Check & Status Page

Once running, verify the server by visiting the root URL in a browser:

```
http://localhost:4000/
```

This serves a live GUI dashboard confirming:
- Database Connection
- Solana RPC Endpoint
- System Uptime & Memory Usage

## API Documentation

### Base URL
```
http://localhost:4000/api
```

### Response Format

All standard API responses follow this structure:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error description"
}
```

---

### Key Endpoints

#### Users
- `GET /api/users/:wallet` — Get player profile and stats
- `POST /api/users/profile` — Update player username/avatar (Requires Privy Auth)
- `POST /api/users/sync` — Smart sync between embedded and external wallets

#### Puzzles
- `GET /api/puzzles/:wallet` — Get user's puzzle history
- `GET /api/puzzles/:wallet/best` — Get best score by difficulty

#### Tournaments
- `GET /api/tournaments` — Get active/past tournaments
- `GET /api/tournaments/:id/leaderboard` — Get tournament specific leaderboard

#### Leaderboard
- `GET /api/leaderboard/global` — Get global rankings
- `GET /api/leaderboard/:difficulty` — Get rankings by difficulty (0: Easy, 1: Medium, 2: Hard)

#### Webhooks
- `POST /api/webhooks/helius` — Receives and indexes on-chain transactions

## Project Structure

```
/backend
├── src/
│   ├── config/             # Environment, Supabase, Solana clients
│   ├── controllers/        # Route logic and handlers
│   ├── indexer/            # Transaction parsers for Helius events
│   ├── jobs/               # Background cron jobs (Leaderboard, Protocol sync)
│   ├── middleware/         # Auth (Privy) and Admin verification
│   ├── models/             # Database access layer (Supabase wrappers)
│   ├── routes/             # Fastify route definitions
│   ├── services/           # WebSockets and external services
│   ├── solana/             # Solana account fetching and deserialization
│   ├── types/              # TypeScript interfaces and definitions
│   ├── utils/              # Error handling, response formatting, Zod schemas
│   ├── app.ts              # Fastify application setup
│   └── index.ts            # Entry point
├── supabase/
│   └── schema.sql          # Database schema and RPCs
├── .env.example
├── package.json
└── tsconfig.json
```

## Cron Jobs & Webhooks

### Cron Jobs
- **`syncProtocol.job`**: Every hour. Syncs global protocol state (treasury, tournament count).
- **`syncActiveTournaments.job`**: Every 5 minutes. Syncs prize pools and player counts for live tournaments.
- **`syncLeaderboard.job`**: Every hour. Rebuilds the global and difficulty-based leaderboards.

### Helius Webhooks
The backend relies on Helius webhooks to index on-chain activity instantly. When a player solves a puzzle or enters a tournament, Helius pushes the transaction payload to `/api/webhooks/helius`. The `indexer/` module parses the instruction data to update the Supabase database in real-time.

## Deployment

### Docker Deployment

Create a `Dockerfile` for easy deployment to platforms like Render, Railway, or AWS:

```dockerfile
FROM node:18-alpine
WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

EXPOSE 4000
CMD ["pnpm", "start"]
```

### Important Production Considerations

1. **Security**
   - Use `SUPABASE_SERVICE_ROLE_KEY` carefully (it bypasses RLS). Restrict its usage to server-side only.
   - Ensure the Helius Webhook secret is properly set to prevent spoofed transactions.

2. **WebSockets**
   - If deploying behind a load balancer (e.g., Nginx, AWS ALB), ensure WebSocket connections (`Upgrade: websocket`) are properly proxied.

3. **Rate Limiting**
   - Fastify rate limiting is configured in `src/plugins/rateLimit.ts` to protect against DDoS. Adjust thresholds as needed for production traffic.
