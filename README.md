# Fruit Game 🍎

A Web3 Suika-style gacha game built on Solana. Drop fruits, merge them to evolve, collect NFT skins, and compete on leaderboards!

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
