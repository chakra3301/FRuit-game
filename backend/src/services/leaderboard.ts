import { prisma } from '../index';

type RankedEntry = {
  rank: number;
  walletAddress: string;
  score: number;
  timestamp: Date;
  gamesPlayed?: number;
};

type UserRank = {
  rank: number;
  walletAddress: string;
  score: number;
  gamesPlayed?: number;
};

export type LeaderboardResult = {
  entries: RankedEntry[];
  userRank: UserRank | null;
  resetTime?: string;
};

/**
 * Get today's date at midnight UTC.
 */
export function getTodayUTC(): Date {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
}

/**
 * Get the Monday of the current week (UTC).
 */
export function getWeekStartUTC(): Date {
  const today = getTodayUTC();
  const dayOfWeek = today.getUTCDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday = 1, Sunday = 0
  today.setUTCDate(today.getUTCDate() + diff);
  return today;
}

/**
 * Get next Sunday midnight UTC (weekly reset time).
 */
export function getNextWeeklyReset(): Date {
  const now = new Date();
  const daysUntilSunday = (7 - now.getUTCDay()) % 7;
  const nextSunday = new Date(now);
  nextSunday.setUTCDate(now.getUTCDate() + daysUntilSunday);
  nextSunday.setUTCHours(0, 0, 0, 0);
  if (daysUntilSunday === 0 && now.getUTCHours() < 24) {
    nextSunday.setUTCDate(nextSunday.getUTCDate() + 7);
  }
  return nextSunday;
}

export async function getDailyLeaderboard(limit: number, userWallet?: string): Promise<LeaderboardResult> {
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

  const rankedEntries = entries.map((entry, index) => ({
    rank: index + 1,
    walletAddress: entry.walletAddress,
    score: entry.score,
    timestamp: entry.createdAt,
  }));

  let userRank: UserRank | null = null;
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

  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  return {
    entries: rankedEntries,
    userRank,
    resetTime: tomorrow.toISOString(),
  };
}

export async function getWeeklyLeaderboard(limit: number, userWallet?: string): Promise<LeaderboardResult> {
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

  const rankedEntries = entries.map((entry, index) => ({
    rank: index + 1,
    walletAddress: entry.walletAddress,
    score: entry.score,
    timestamp: entry.createdAt,
  }));

  let userRank: UserRank | null = null;
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

  return {
    entries: rankedEntries,
    userRank,
    resetTime: getNextWeeklyReset().toISOString(),
  };
}

export async function getAllTimeLeaderboard(limit: number, userWallet?: string): Promise<LeaderboardResult> {
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

  const rankedEntries = entries.map((entry, index) => ({
    rank: index + 1,
    walletAddress: entry.walletAddress,
    score: entry.highScore,
    gamesPlayed: entry.gamesPlayed,
    timestamp: entry.updatedAt,
  }));

  let userRank: UserRank | null = null;
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

  return {
    entries: rankedEntries,
    userRank,
  };
}
