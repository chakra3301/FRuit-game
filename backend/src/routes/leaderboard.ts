import { Router, Request, Response } from 'express';
import {
  getDailyLeaderboard,
  getWeeklyLeaderboard,
  getAllTimeLeaderboard,
} from '../services/leaderboard';

const router = Router();

/**
 * Get daily leaderboard
 * GET /api/leaderboard/daily
 */
router.get('/daily', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const userWallet = req.query.wallet as string | undefined;

    const result = await getDailyLeaderboard(limit, userWallet);

    return res.json({
      success: true,
      data: {
        period: 'daily',
        entries: result.entries,
        userRank: result.userRank,
        resetTime: result.resetTime,
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

    const result = await getWeeklyLeaderboard(limit, userWallet);

    return res.json({
      success: true,
      data: {
        period: 'weekly',
        entries: result.entries,
        userRank: result.userRank,
        resetTime: result.resetTime,
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

    const result = await getAllTimeLeaderboard(limit, userWallet);

    return res.json({
      success: true,
      data: {
        period: 'allTime',
        entries: result.entries,
        userRank: result.userRank,
      }
    });
  } catch (error) {
    console.error('Error getting all-time leaderboard:', error);
    return res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

export default router;
