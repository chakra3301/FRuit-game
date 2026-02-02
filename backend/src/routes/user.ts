import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { verifySignature, generateNonce, createSignMessage } from '../services/solana';

const router = Router();

/**
 * Get nonce for wallet signature
 * GET /api/user/nonce/:walletAddress
 */
router.get('/nonce/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const nonce = generateNonce();
    const message = createSignMessage(walletAddress as string, nonce);

    // Store nonce with expiration (5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await prisma.usedNonce.create({
      data: {
        nonce,
        expiresAt,
      }
    });

    return res.json({
      success: true,
      data: {
        nonce,
        message,
        expiresAt: expiresAt.toISOString(),
      }
    });
  } catch (error) {
    console.error('Error generating nonce:', error);
    return res.status(500).json({ error: 'Failed to generate nonce' });
  }
});

/**
 * Authenticate/login user
 * POST /api/user/auth
 */
router.post('/auth', async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature, message, nonce } = req.body;

    if (!walletAddress || !signature || !message || !nonce) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify the nonce hasn't been used and hasn't expired
    const storedNonce = await prisma.usedNonce.findUnique({
      where: { nonce }
    });

    if (!storedNonce) {
      return res.status(400).json({ error: 'Invalid nonce' });
    }

    if (new Date() > storedNonce.expiresAt) {
      await prisma.usedNonce.delete({ where: { nonce } });
      return res.status(400).json({ error: 'Nonce expired' });
    }

    // Verify signature
    const isValid = await verifySignature(walletAddress, message, signature);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Mark nonce as used (update expiry to now to prevent reuse)
    await prisma.usedNonce.update({
      where: { nonce },
      data: { expiresAt: new Date() }
    });

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress },
      include: {
        skinLoadout: true,
        ownedSkins: {
          include: { skin: true }
        }
      }
    });

    if (!user) {
      user = await prisma.user.create({
        data: { walletAddress },
        include: {
          skinLoadout: true,
          ownedSkins: {
            include: { skin: true }
          }
        }
      });
    }

    return res.json({
      success: true,
      data: {
        user: {
          walletAddress: user.walletAddress,
          totalPoints: user.totalPoints,
          gamesPlayed: user.gamesPlayed,
          highScore: user.highScore,
          createdAt: user.createdAt,
        },
        skinLoadout: user.skinLoadout,
        ownedSkins: user.ownedSkins,
      }
    });
  } catch (error) {
    console.error('Error authenticating user:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * Get user profile
 * GET /api/user/profile/:walletAddress
 */
router.get('/profile/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress as string },
      include: {
        skinLoadout: true,
        ownedSkins: {
          include: {
            skin: {
              include: { pack: true }
            }
          }
        },
        rewards: {
          where: { claimedAt: null },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's rank on all-time leaderboard
    const higherScoreCount = await prisma.user.count({
      where: {
        highScore: { gt: user.highScore }
      }
    });
    const allTimeRank = higherScoreCount + 1;

    return res.json({
      success: true,
      data: {
        profile: {
          walletAddress: user.walletAddress,
          totalPoints: user.totalPoints,
          gamesPlayed: user.gamesPlayed,
          highScore: user.highScore,
          allTimeRank,
          createdAt: user.createdAt,
        },
        skinLoadout: (user as any).skinLoadout,
        ownedSkins: (user as any).ownedSkins,
        pendingRewards: (user as any).rewards,
      }
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    return res.status(500).json({ error: 'Failed to get profile' });
  }
});

/**
 * Get user's game history
 * GET /api/user/history/:walletAddress
 */
router.get('/history/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const games = await prisma.gameSession.findMany({
      where: { walletAddress: walletAddress as string },
      orderBy: { startTime: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        startTime: true,
        endTime: true,
        finalScore: true,
        isValid: true,
      }
    });

    const totalGames = await prisma.gameSession.count({
      where: { walletAddress: walletAddress as string }
    });

    return res.json({
      success: true,
      data: {
        games,
        total: totalGames,
        limit,
        offset,
      }
    });
  } catch (error) {
    console.error('Error getting game history:', error);
    return res.status(500).json({ error: 'Failed to get game history' });
  }
});

export default router;
