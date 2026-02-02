import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

// Import routes
import gameRoutes from './routes/game';
import userRoutes from './routes/user';
import leaderboardRoutes from './routes/leaderboard';
import gachaRoutes from './routes/gacha';
import skinRoutes from './routes/skin';
import rewardRoutes from './routes/reward';

// Initialize Prisma
// Connection URL is configured in prisma.config.ts
export const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Stricter rate limit for game actions
const gameActionLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 10, // 10 game inputs per second max
  message: { error: 'Too many game inputs.' },
});

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/game', gameActionLimiter, gameRoutes);
app.use('/api/user', userRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/gacha', gachaRoutes);
app.use('/api/skin', skinRoutes);
app.use('/api/reward', rewardRoutes);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🍎 Fruit Game server running on port ${PORT}`);
});

export default app;
