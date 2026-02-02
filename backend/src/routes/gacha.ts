import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { verifySignature, verifyTransaction } from '../services/solana';

const router = Router();

// Pack price in tokens
const PACK_PRICE = 100_000;

// Rarity weights
const RARITY_WEIGHTS = {
  common: 59,
  uncommon: 20,
  rare: 15,
  epic: 5,
  legendary: 1,
};

/**
 * Get all available packs
 * GET /api/gacha/packs
 */
router.get('/packs', async (req: Request, res: Response) => {
  try {
    const packs = await prisma.pack.findMany({
      where: { isActive: true },
      include: {
        skins: {
          select: {
            id: true,
            name: true,
            fruitType: true,
            rarity: true,
            imageUrl: true,
            totalSupply: true,
            mintedCount: true,
            isSoldOut: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate remaining skins for each pack
    const packsWithStats = packs.map((pack: any) => ({
      id: pack.id,
      name: pack.name,
      description: pack.description,
      imageUrl: pack.imageUrl,
      price: pack.price,
      isSoldOut: pack.isSoldOut,
      totalSkins: pack.skins.reduce((sum: number, skin: any) => sum + skin.totalSupply, 0),
      remainingSkins: pack.skins.reduce((sum: number, skin: any) => sum + (skin.totalSupply - skin.mintedCount), 0),
      skinsByRarity: {
        common: pack.skins.filter((s: any) => s.rarity === 'common').length,
        uncommon: pack.skins.filter((s: any) => s.rarity === 'uncommon').length,
        rare: pack.skins.filter((s: any) => s.rarity === 'rare').length,
        epic: pack.skins.filter((s: any) => s.rarity === 'epic').length,
        legendary: pack.skins.filter((s: any) => s.rarity === 'legendary').length,
      },
      skins: pack.skins,
    }));

    return res.json({
      success: true,
      data: packsWithStats,
    });
  } catch (error) {
    console.error('Error getting packs:', error);
    return res.status(500).json({ error: 'Failed to get packs' });
  }
});

/**
 * Get a specific pack
 * GET /api/gacha/pack/:packId
 */
router.get('/pack/:packId', async (req: Request, res: Response) => {
  try {
    const { packId } = req.params;

    const pack = await prisma.pack.findUnique({
      where: { id: packId as string },
      include: {
        skins: {
          select: {
            id: true,
            name: true,
            fruitType: true,
            rarity: true,
            imageUrl: true,
            totalSupply: true,
            mintedCount: true,
            isSoldOut: true,
          }
        }
      }
    });

    if (!pack) {
      return res.status(404).json({ error: 'Pack not found' });
    }

    return res.json({
      success: true,
      data: {
        ...pack,
        totalSkins: (pack as any).skins.reduce((sum: number, skin: any) => sum + skin.totalSupply, 0),
        remainingSkins: (pack as any).skins.reduce((sum: number, skin: any) => sum + (skin.totalSupply - skin.mintedCount), 0),
      },
    });
  } catch (error) {
    console.error('Error getting pack:', error);
    return res.status(500).json({ error: 'Failed to get pack' });
  }
});

/**
 * Open a pack (gacha pull)
 * POST /api/gacha/open
 */
router.post('/open', async (req: Request, res: Response) => {
  try {
    const { walletAddress, packId, signature, message, transactionSignature } = req.body;

    if (!walletAddress || !packId || !signature || !message || !transactionSignature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify signature
    const isValidSignature = await verifySignature(walletAddress, message, signature);
    if (!isValidSignature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Check pack exists and is not sold out
    const pack = await prisma.pack.findUnique({
      where: { id: packId },
      include: {
        skins: {
          where: { isSoldOut: false }
        }
      }
    });

    if (!pack) {
      return res.status(404).json({ error: 'Pack not found' });
    }

    if (pack.isSoldOut || pack.skins.length === 0) {
      return res.status(400).json({ error: 'Pack is sold out' });
    }

    // Verify payment transaction
    const isValidTx = await verifyTransaction(transactionSignature, walletAddress, PACK_PRICE);
    if (!isValidTx) {
      return res.status(400).json({ error: 'Invalid or unconfirmed payment transaction' });
    }

    // Check for duplicate transaction
    const existingTx = await prisma.transactionLog.findUnique({
      where: { txSignature: transactionSignature }
    });
    if (existingTx) {
      return res.status(400).json({ error: 'Transaction already used' });
    }

    // Log the transaction
    await prisma.transactionLog.create({
      data: {
        walletAddress,
        type: 'gacha',
        amount: PACK_PRICE,
        txSignature: transactionSignature,
        status: 'confirmed',
        confirmedAt: new Date(),
      }
    });

    // Select a random skin based on rarity weights
    const selectedSkin = selectRandomSkin(pack.skins);

    if (!selectedSkin) {
      return res.status(500).json({ error: 'Failed to select skin' });
    }

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress }
    });

    if (!user) {
      user = await prisma.user.create({
        data: { walletAddress }
      });
    }

    // TODO: Actually mint NFT on Solana
    // For now, generate a placeholder mint address
    const mintAddress = `MINT_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const mintTxSig = `MINT_TX_${transactionSignature.substring(0, 20)}`;

    // Create owned skin record
    const ownedSkin = await prisma.ownedSkin.create({
      data: {
        userId: user.id,
        skinId: selectedSkin.id,
        walletAddress,
        mintAddress,
        mintTxSig,
      },
      include: {
        skin: {
          include: { pack: true }
        }
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

    // Check if pack is now sold out
    const remainingSkins = await prisma.skin.count({
      where: {
        packId,
        isSoldOut: false,
      }
    });

    if (remainingSkins === 0) {
      await prisma.pack.update({
        where: { id: packId },
        data: { isSoldOut: true }
      });
    }

    return res.json({
      success: true,
      data: {
        skin: {
          id: ownedSkin.skin.id,
          name: ownedSkin.skin.name,
          fruitType: ownedSkin.skin.fruitType,
          rarity: ownedSkin.skin.rarity,
          imageUrl: ownedSkin.skin.imageUrl,
          pack: ownedSkin.skin.pack.name,
        },
        mintAddress,
        transactionSignature: mintTxSig,
      }
    });
  } catch (error) {
    console.error('Error opening pack:', error);
    return res.status(500).json({ error: 'Failed to open pack' });
  }
});

/**
 * Select a random skin based on rarity weights
 */
function selectRandomSkin(skins: Array<{
  id: string;
  name: string;
  rarity: string;
  mintedCount: number;
  totalSupply: number;
}>) {
  // Filter out sold-out skins
  const availableSkins = skins.filter(s => s.mintedCount < s.totalSupply);

  if (availableSkins.length === 0) return null;

  // Group skins by rarity
  const skinsByRarity: Record<string, typeof availableSkins> = {
    common: [],
    uncommon: [],
    rare: [],
    epic: [],
    legendary: [],
  };

  for (const skin of availableSkins) {
    if (skinsByRarity[skin.rarity]) {
      skinsByRarity[skin.rarity].push(skin);
    }
  }

  // Calculate total weight of available rarities
  let totalWeight = 0;
  for (const [rarity, skins] of Object.entries(skinsByRarity)) {
    if (skins.length > 0) {
      totalWeight += RARITY_WEIGHTS[rarity as keyof typeof RARITY_WEIGHTS] || 0;
    }
  }

  if (totalWeight === 0) return availableSkins[0]; // Fallback

  // Select rarity based on weights
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

  // Select random skin from that rarity
  const rarityPool = skinsByRarity[selectedRarity];
  if (rarityPool.length === 0) {
    // Fallback: select from any available
    return availableSkins[Math.floor(Math.random() * availableSkins.length)];
  }

  return rarityPool[Math.floor(Math.random() * rarityPool.length)];
}

export default router;
