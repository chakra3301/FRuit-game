# Fruit Game 🍎

A Web3 Suika-style gacha game built on Solana. Drop fruits, merge them to evolve, collect NFT skins, and compete on leaderboards!

## Project Overview

**Fruit Game** is a blockchain-integrated puzzle game that combines the addictive gameplay of Suika Game (Watermelon Game) with Web3 mechanics. Players drop fruits into a container, merge matching fruits to create larger ones, and compete for high scores while collecting NFT skins through a gacha system.

### Core Concept

The game follows a simple but engaging mechanic: players drop fruits from the top of a container, and when two identical fruits collide, they merge into the next fruit in the evolution chain. The goal is to achieve the highest score within a 7-minute time limit by strategically placing fruits to create chain reactions and reach the ultimate fruit: the watermelon.

### Architecture

The project is built as a full-stack application with a clear separation of concerns:

- **Frontend**: Next.js 14 application with React components, using Matter.js for client-side physics simulation and rendering. The frontend handles user interactions, wallet connections, and visual presentation.

- **Backend**: Express.js API server that runs the authoritative game engine. All game logic, physics calculations, and state management happen server-side to prevent cheating. The backend also handles Solana blockchain interactions, database operations, and anti-cheat validation.

- **Shared Types**: Common TypeScript definitions shared between frontend and backend to ensure type safety and consistency.

- **Database**: PostgreSQL database managed with Prisma ORM, storing user profiles, game sessions, leaderboards, NFT skins, and transaction logs.

### Key Systems

1. **Game Engine**: Server-side physics engine that simulates fruit drops, collisions, and merges. The engine maintains authoritative game state and validates all player inputs.

2. **Anti-Cheat System**: 
   - All game logic runs server-side
   - Complete replay storage for every game session
   - Input validation and suspicious pattern detection
   - Transaction verification before game start

3. **Leaderboard System**: Three-tier ranking system (daily, weekly, all-time) with automatic resets and reward distribution for top players.

4. **NFT Gacha System**: Players can purchase packs using in-game tokens to unlock unique fruit skins. Skins are minted as Solana NFTs using Metaplex, with five rarity tiers and limited supplies.

5. **Solana Integration**: 
   - Wallet connection (Phantom, Solflare, Coinbase, Ledger)
   - Token payments for game entry and pack purchases
   - NFT minting and ownership tracking
   - Transaction verification and logging

6. **Replay System**: Every game session is recorded and compressed for storage, enabling replay viewing and cheat detection through post-game analysis.

### Game Flow

1. **Connect Wallet**: Player connects their Solana wallet to the application
2. **Pay to Play**: Player pays 50 FRUIT tokens to start a game session
3. **Game Session**: 7-minute timed gameplay where player drops fruits strategically
4. **Score Tracking**: Server validates all actions and tracks score in real-time
5. **Game End**: Final score is recorded, leaderboards updated, and rewards calculated
6. **Rewards**: Top weekly players receive free pack rewards

### Web3 Features

- **Token Economics**: Native FRUIT token used for game entry (50 tokens) and pack purchases (100,000 tokens)
- **NFT Collectibles**: Unique fruit skins minted as Solana NFTs with varying rarities
- **Ownership**: Players truly own their NFT skins and can trade them on secondary markets
- **Rewards**: Weekly leaderboard winners receive pack rewards that can be claimed on-chain

### Development Status

The project includes a complete game engine, frontend interface, backend API, and database schema. Core gameplay mechanics are implemented, with Web3 integrations (Solana token payments and NFT minting) marked as TODO items for full blockchain functionality.

## Features

- **Suika-style Gameplay**: Drop fruits that merge when matching types collide
- **7-Minute Timed Games**: Fast-paced competitive gameplay
- **Leaderboards**: Daily, weekly, and all-time rankings
- **NFT Skins**: Collect and equip unique fruit skins via gacha
- **Anti-Cheat**: Server-side game validation with replay storage
- **Solana Integration**: Wallet connection, token payments, NFT minting

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14, React, Tailwind CSS |
| Game Engine | Matter.js (physics) |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| Blockchain | Solana, Metaplex |
| Wallets | Phantom, Solflare, Coinbase, Ledger |

## Project Structure

```
fruit-game/
├── frontend/           # Next.js web application
│   ├── src/
│   │   ├── app/        # App router pages
│   │   ├── components/ # React components
│   │   └── lib/        # Utilities and API client
│   └── public/assets/  # Static assets
│       ├── fruits/     # Base fruit images
│       └── skins/      # NFT skin images
├── backend/            # Express API server
│   ├── src/
│   │   ├── routes/     # API endpoints
│   │   ├── services/   # Business logic
│   │   └── game/       # Game engine
│   └── prisma/         # Database schema
└── shared/             # Shared TypeScript types
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Solana CLI (for token/NFT operations)

### 1. Clone and Install

```bash
# Install dependencies for all packages
cd frontend && npm install
cd ../backend && npm install
cd ../shared && npm install
```

### 2. Configure Environment

```bash
# Frontend
cp frontend/.env.example frontend/.env.local

# Backend
cp backend/.env.example backend/.env
```

Edit the `.env` files with your configuration.

### 3. Set Up Database

```bash
cd backend

# Generate Prisma client
npm run db:generate

# Push schema to database (development)
npm run db:push

# Or run migrations (production)
npm run db:migrate
```

### 4. Start Development Servers

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Game Configuration

### Fruit Evolution Chain

```
Cherry → Strawberry → Grape → Persimmon → Apple → Pear → Peach → Pineapple → Melon → Watermelon
```

### Token Economics

| Action | Cost |
|--------|------|
| Play Game | 50 FRUIT |
| Open Pack | 100,000 FRUIT |

### Gacha Rates

| Rarity | Drop Rate |
|--------|-----------|
| Common | 59% |
| Uncommon | 20% |
| Rare | 15% |
| Epic | 5% |
| Legendary | 1% |

### Weekly Rewards

- **#1**: 1 Free Pack
- **#2-10**: 1 Free Pack each

## Adding Assets

### Fruit Images

Place base fruit images in `frontend/public/assets/fruits/`:
- `cherry.png`
- `strawberry.png`
- `grape.png`
- etc.

### Skin Images

Organize skins by pack in `frontend/public/assets/skins/`:
```
skins/
├── starter-pack/
│   ├── pixel-cherry.png
│   └── golden-apple.png
├── space-pack/
│   └── nebula-grape.png
└── ...
```

### Creating New Packs

1. Add skin entries to the database via Prisma or admin API
2. Upload skin images to the appropriate folder
3. Configure pack in the database with:
   - Name, description, image
   - Price (default: 100,000 FRUIT)
   - Associated skins with rarity and supply

## API Endpoints

### Game
- `POST /api/game/start` - Start new game session
- `POST /api/game/input` - Send game input
- `GET /api/game/state/:sessionId` - Get current state
- `POST /api/game/end` - End game session

### Leaderboard
- `GET /api/leaderboard/daily` - Daily rankings
- `GET /api/leaderboard/weekly` - Weekly rankings
- `GET /api/leaderboard/alltime` - All-time rankings

### Gacha
- `GET /api/gacha/packs` - List available packs
- `POST /api/gacha/open` - Open a pack

### Profile
- `GET /api/user/profile/:wallet` - Get user profile
- `POST /api/skin/loadout` - Update skin loadout

## Security

### Anti-Cheat Measures

1. **Server-Side Validation**: All game physics run on server
2. **Replay Storage**: Every game session is recorded
3. **Suspicious Pattern Detection**: Automated analysis of replays
4. **Rate Limiting**: Prevents automated play
5. **Transaction Verification**: Payment verification before game start

### Wallet Security

- Signature verification for all authenticated actions
- Nonce-based replay attack prevention
- Transaction deduplication

## Deployment

### Frontend (Vercel)

```bash
cd frontend
vercel deploy
```

### Backend (Railway)

1. Connect GitHub repository to Railway
2. Add PostgreSQL add-on
3. Set environment variables
4. Deploy

## TODO

- [ ] Implement actual Solana token integration
- [ ] Set up Metaplex NFT minting
- [ ] Add sound effects and music
- [ ] Create admin dashboard
- [ ] Implement WebSocket for real-time updates
- [ ] Add multiplayer mode

## License

MIT

## Contributing

Contributions welcome! Please read the contributing guidelines first.
