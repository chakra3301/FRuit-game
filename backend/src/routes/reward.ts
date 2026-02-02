import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { verifySignature } from '../services/solana';

const router = Router();

/**
 * Get user's claimable rewards
 * GET /api/reward/pending/:walletAddress
 */
router.get('/pending/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    const rewards = await prisma.reward.findMany({
      where: {
        walletAddress: walletAddress as string,
        claimedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      success: true,
      data: rewards,
    });
  } catch (error) {
    console.error('Error getting pending rewards:', error);
    return res.status(500).json({ error: 'Failed to get pending rewards' });
  }
});

/**
 * Get user's claimed rewards history
 * GET /api/reward/history/:walletAddress
 */
router.get('/history/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const rewards = await prisma.reward.findMany({
      where: {
        walletAddress: walletAddress as string,
        claimedAt: { not: null }
      },
      orderBy: { claimedAt: 'desc' },
      take: limit,
    });

    return res.json({
      success: true,
      data: rewards,
    });
  } catch (error) {
    console.error('Error getting reward history:', error);
    return res.status(500).json({ error: 'Failed to get reward history' });
  }
});

/**
 * Claim a reward
 * POST /api/reward/claim
 */
router.post('/claim', async (req: Request, res: Response) => {
  try {
    const { walletAddress, rewardId, signature, message } = req.body;

    if (!walletAddress || !rewardId || !signature || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify signature
    const isValid = await verifySignature(walletAddress, message, signature);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Get reward
    const reward = await prisma.reward.findUnique({
      where: { id: rewardId }
    });

    if (!reward) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    if (reward.walletAddress !== walletAddress) {
      return res.status(403).json({ error: 'This reward belongs to another wallet' });
    }

    if (reward.claimedAt) {
      return res.status(400).json({ error: 'Reward already claimed' });
    }

    if (reward.expiresAt && new Date() > reward.expiresAt) {
      return res.status(400).json({ error: 'Reward has expired' });
    }

    // Process the claim based on reward type
    let claimResult;

    if (reward.type === 'pack' && reward.packId) {
      // Grant a free pack opening
      claimResult = await claimPackReward(walletAddress, reward.packId);
    } else if (reward.type === 'tokens' && reward.amount) {
      // Grant tokens (this would integrate with actual token transfer)
      claimResult = await claimTokenReward(walletAddress, reward.amount);
    } else {
      return res.status(400).json({ error: 'Invalid reward type' });
    }

    if (!claimResult.success) {
      return res.status(500).json({ error: (claimResult as any).error });
    }

    // Mark reward as claimed
    await prisma.reward.update({
      where: { id: rewardId },
      data: {
        claimedAt: new Date(),
        claimTxSig: claimResult.txSignature || 'N/A',
      }
    });

    return res.json({
      success: true,
      data: claimResult.data,
    });
  } catch (error) {
    console.error('Error claiming reward:', error);
    return res.status(500).json({ error: 'Failed to claim reward' });
  }
});

/**
 * Process a pack reward claim
 */
async function claimPackReward(walletAddress: string, packId: string) {
  try {
    // Check pack exists and has available skins
    const pack = await prisma.pack.findUnique({
      where: { id: packId },
      include: {
        skins: {
          where: { isSoldOut: false }
        }
      }
    });

    if (!pack || pack.skins.length === 0) {
      return { success: false, error: 'Pack not available' };
    }

    // Select random skin (same logic as gacha)
    const RARITY_WEIGHTS = {
      common: 59,
      uncommon: 20,
      rare: 15,
      epic: 5,
      legendary: 1,
    };

    const availableSkins = pack.skins.filter(s => s.mintedCount < s.totalSupply);
    if (availableSkins.length === 0) {
      return { success: false, error: 'No skins available in pack' };
    }

    // Group by rarity
    const skinsByRarity: Record<string, typeof availableSkins> = {
      common: [], uncommon: [], rare: [], epic: [], legendary: []
    };
    for (const skin of availableSkins) {
      if (skinsByRarity[skin.rarity]) {
        skinsByRarity[skin.rarity].push(skin);
      }
    }

    // Calculate weights
    let totalWeight = 0;
    for (const [rarity, skins] of Object.entries(skinsByRarity)) {
      if (skins.length > 0) {
        totalWeight += RARITY_WEIGHTS[rarity as keyof typeof RARITY_WEIGHTS] || 0;
      }
    }

    // Select rarity
    let random = Math.random() * totalWeight;
    let selectedRarity = 'common';
    for (const [rarity, skins] of Object.entries(skinsByRarity)) {
      if (skins.length > 0) {
        const weight = RARITY_WEIGHTS[rarity as keyof typeof RARITY_WEIGHTS] || 0;
        random -= weight;
        if (random <= 0) {
          selectedRarity = rarity;
          break;
        }
      }
    }

    // Select skin
    const rarityPool = skinsByRarity[selectedRarity];
    const selectedSkin = rarityPool.length > 0
      ? rarityPool[Math.floor(Math.random() * rarityPool.length)]
      : availableSkins[Math.floor(Math.random() * availableSkins.length)];

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress }
    });
    if (!user) {
      user = await prisma.user.create({
        data: { walletAddress }
      });
    }

    // Mint the skin
    const mintAddress = `REWARD_MINT_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const mintTxSig = `REWARD_TX_${Date.now()}`;

    await prisma.ownedSkin.create({
      data: {
        userId: user.id,
        skinId: selectedSkin.id,
        walletAddress,
        mintAddress,
        mintTxSig,
      }
    });

    // Update skin minted count
    await prisma.skin.update({
      where: { id: selectedSkin.id },
      data: {
        mintedCount: { increment: 1 },
        isSoldOut: selectedSkin.mintedCount + 1 >= selectedSkin.totalSupply,
      }
    });

    return {
      success: true,
      txSignature: mintTxSig,
      data: {
        type: 'pack',
        skin: {
          id: selectedSkin.id,
          name: selectedSkin.name,
          fruitType: selectedSkin.fruitType,
          rarity: selectedSkin.rarity,
          imageUrl: selectedSkin.imageUrl,
        },
        mintAddress,
      }
    };
  } catch (error) {
    console.error('Error claiming pack reward:', error);
    return { success: false, error: 'Failed to claim pack' };
  }
}

/**
 * Process a token reward claim
 */
async function claimTokenReward(walletAddress: string, amount: number) {
  // TODO: Implement actual token transfer from treasury
  // For now, just record the claim

  const txSignature = `TOKEN_REWARD_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Log transaction
  await prisma.transactionLog.create({
    data: {
      walletAddress,
      type: 'reward_claim',
      amount,
      txSignature,
      status: 'confirmed',
      confirmedAt: new Date(),
    }
  });

  return {
    success: true,
    txSignature,
    data: {
      type: 'tokens',
      amount,
      transactionSignature: txSignature,
    }
  };
}

/**
 * Admin endpoint: Create weekly rewards for top players
 * POST /api/reward/distribute-weekly
 *
 * This should be called by a cron job every Sunday after midnight UTC
 */
router.post('/distribute-weekly', async (req: Request, res: Response) => {
  try {
    // TODO: Add admin authentication
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get last week's dates
    const now = new Date();
    const lastWeekEnd = new Date(now);
    lastWeekEnd.setUTCDate(now.getUTCDate() - now.getUTCDay()); // Last Sunday
    lastWeekEnd.setUTCHours(0, 0, 0, 0);

    const lastWeekStart = new Date(lastWeekEnd);
    lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7); // Monday before

    // Get top 10 from last week
    const topPlayers = await prisma.weeklyScore.findMany({
      where: { weekStart: lastWeekStart },
      orderBy: { score: 'desc' },
      take: 10,
    });

    if (topPlayers.length === 0) {
      return res.json({
        success: true,
        message: 'No players to reward',
        rewardsCreated: 0,
      });
    }

    // Get an active pack for rewards (or use a specific reward pack)
    const rewardPack = await prisma.pack.findFirst({
      where: { isActive: true, isSoldOut: false }
    });

    let rewardsCreated = 0;

    for (let i = 0; i < topPlayers.length; i++) {
      const player = topPlayers[i];
      const rank = i + 1;

      // Check if reward already exists for this week/wallet
      const existingReward = await prisma.reward.findFirst({
        where: {
          walletAddress: player.walletAddress,
          weekStart: lastWeekStart,
        }
      });

      if (existingReward) continue;

      // Top 1 gets a pack, top 2-10 also get packs (until packs run out)
      if (rewardPack && !rewardPack.isSoldOut) {
        await prisma.reward.create({
          data: {
            userId: player.userId,
            walletAddress: player.walletAddress,
            type: 'pack',
            packId: rewardPack.id,
            reason: `Weekly Leaderboard #${rank}`,
            weekStart: lastWeekStart,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days to claim
          }
        });
        rewardsCreated++;
      }
      // TODO: When packs run out, distribute tokens instead
    }

    return res.json({
      success: true,
      message: `Distributed ${rewardsCreated} rewards`,
      rewardsCreated,
    });
  } catch (error) {
    console.error('Error distributing weekly rewards:', error);
    return res.status(500).json({ error: 'Failed to distribute rewards' });
  }
});

export default router;
