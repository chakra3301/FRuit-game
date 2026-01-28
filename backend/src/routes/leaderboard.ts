import { Router, Request, Response } from 'express';
import { prisma } from '../index';

const router = Router();

/**
 * Get today's date at midnight UTC
 */
function getTodayUTC(): Date {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
}

/**
 * Get the Monday of the current week (UTC)
 */
function getWeekStartUTC(): Date {
  const today = getTodayUTC();
  const dayOfWeek = today.getUTCDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday = 1, Sunday = 0
  today.setUTCDate(today.getUTCDate() + diff);
  return today;
}

/**
 * Get next Sunday midnight UTC (weekly reset time)
 */
function getNextWeeklyReset(): Date {
  const now = new Date();
  const daysUntilSunday = (7 - now.getUTCDay()) % 7;
  const nextSunday = new Date(now);
  nextSunday.setUTCDate(now.getUTCDate() + daysUntilSunday);
  nextSunday.setUTCHours(0, 0, 0, 0);
  // If today is Sunday and it's before midnight, return today
  if (daysUntilSunday === 0 && now.getUTCHours() < 24) {
    nextSunday.setUTCDate(nextSunday.getUTCDate() + 7);
  }
  return nextSunday;
}

/**
 * Get daily leaderboard
 * GET /api/leaderboard/daily
 */
router.get('/daily', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const userWallet = req.query.wallet as string | undefined;

    const today = getTodayUTC();

    const entries = await prisma.dailyScore.findMany({
      where: { date: today },
      orderBy: { score: 'desc' },
      take: limit,
      select: {
        walletAddress: true,
        score: true,
        createdAt: true,
      }
    });

    // Add ranks
    const rankedEntries = entries.map((entry, index) => ({
      rank: index + 1,
      walletAddress: entry.walletAddress,
      score: entry.score,
      timestamp: entry.createdAt,
    }));

    // Get user's rank if wallet provided
    let userRank = null;
    if (userWallet) {
      const userScore = await prisma.dailyScore.findUnique({
        where: {
          walletAddress_date: {
            walletAddress: userWallet,
            date: today,
          }
        }
      });

      if (userScore) {
        const higherCount = await prisma.dailyScore.count({
          where: {
            date: today,
            score: { gt: userScore.score }
          }
        });

        userRank = {
          rank: higherCount + 1,
          walletAddress: userWallet,
          score: userScore.score,
        };
      }
    }

    // Next reset is tomorrow midnight UTC
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    return res.json({
      success: true,
      data: {
        period: 'daily',
        entries: rankedEntries,
        userRank,
        resetTime: tomorrow.toISOString(),
      }
    });
  } catch (error) {
    console.error('Error getting daily leaderboard:', error);
    return res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

/**
 * Get weekly leaderboard
 * GET /api/leaderboard/weekly
 */
router.get('/weekly', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const userWallet = req.query.wallet as string | undefined;

    const weekStart = getWeekStartUTC();

    const entries = await prisma.weeklyScore.findMany({
      where: { weekStart },
      orderBy: { score: 'desc' },
      take: limit,
      select: {
        walletAddress: true,
        score: true,
        createdAt: true,
      }
    });

    // Add ranks
    const rankedEntries = entries.map((entry, index) => ({
      rank: index + 1,
      walletAddress: entry.walletAddress,
      score: entry.score,
      timestamp: entry.createdAt,
    }));

    // Get user's rank if wallet provided
    let userRank = null;
    if (userWallet) {
      const userScore = await prisma.weeklyScore.findUnique({
        where: {
          walletAddress_weekStart: {
            walletAddress: userWallet,
            weekStart,
          }
        }
      });

      if (userScore) {
        const higherCount = await prisma.weeklyScore.count({
          where: {
            weekStart,
            score: { gt: userScore.score }
          }
        });

        userRank = {
          rank: higherCount + 1,
          walletAddress: userWallet,
          score: userScore.score,
        };
      }
    }

    return res.json({
      success: true,
      data: {
        period: 'weekly',
        entries: rankedEntries,
        userRank,
        resetTime: getNextWeeklyReset().toISOString(),
      }
    });
  } catch (error) {
    console.error('Error getting weekly leaderboard:', error);
    return res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

/**
 * Get all-time leaderboard
 * GET /api/leaderboard/alltime
 */
router.get('/alltime', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const userWallet = req.query.wallet as string | undefined;

    const entries = await prisma.user.findMany({
      orderBy: { highScore: 'desc' },
      take: limit,
      select: {
        walletAddress: true,
        highScore: true,
        gamesPlayed: true,
        updatedAt: true,
      }
    });

    // Add ranks
    const rankedEntries = entries.map((entry, index) => ({
      rank: index + 1,
      walletAddress: entry.walletAddress,
      score: entry.highScore,
      gamesPlayed: entry.gamesPlayed,
      timestamp: entry.updatedAt,
    }));

    // Get user's rank if wallet provided
    let userRank = null;
    if (userWallet) {
      const user = await prisma.user.findUnique({
        where: { walletAddress: userWallet }
      });

      if (user) {
        const higherCount = await prisma.user.count({
          where: {
            highScore: { gt: user.highScore }
          }
        });

        userRank = {
          rank: higherCount + 1,
          walletAddress: userWallet,
          score: user.highScore,
          gamesPlayed: user.gamesPlayed,
        };
      }
    }

    return res.json({
      success: true,
      data: {
        period: 'allTime',
        entries: rankedEntries,
        userRank,
      }
    });
  } catch (error) {
    console.error('Error getting all-time leaderboard:', error);
    return res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

export default router;
