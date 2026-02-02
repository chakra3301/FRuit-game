import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { verifySignature } from '../services/solana';

const router = Router();

const FRUIT_TYPES = [
  'cherry', 'strawberry', 'grape', 'persimmon', 'apple',
  'pear', 'peach', 'pineapple', 'melon', 'watermelon'
] as const;

type FruitType = typeof FRUIT_TYPES[number];

/**
 * Get user's owned skins
 * GET /api/skin/owned/:walletAddress
 */
router.get('/owned/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    const ownedSkins = await prisma.ownedSkin.findMany({
      where: { walletAddress: walletAddress as string },
      include: {
        skin: {
          include: { pack: true }
        }
      },
      orderBy: { acquiredAt: 'desc' }
    });

    // Group by fruit type for easy display
    const skinsByFruit: Record<string, typeof ownedSkins> = {};
    for (const fruit of FRUIT_TYPES) {
      skinsByFruit[fruit] = [];
    }

    for (const owned of ownedSkins) {
      const fruitType = (owned as any).skin.fruitType;
      if (skinsByFruit[fruitType]) {
        skinsByFruit[fruitType].push(owned);
      }
    }

    return res.json({
      success: true,
      data: {
        all: ownedSkins,
        byFruit: skinsByFruit,
        total: ownedSkins.length,
      }
    });
  } catch (error) {
    console.error('Error getting owned skins:', error);
    return res.status(500).json({ error: 'Failed to get owned skins' });
  }
});

/**
 * Get user's current skin loadout
 * GET /api/skin/loadout/:walletAddress
 */
router.get('/loadout/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    const loadout = await prisma.skinLoadout.findUnique({
      where: { walletAddress: walletAddress as string }
    });

    // If no loadout exists, return empty loadout
    if (!loadout) {
      const emptyLoadout: Record<string, null> = {};
      for (const fruit of FRUIT_TYPES) {
        emptyLoadout[fruit] = null;
      }
      return res.json({
        success: true,
        data: emptyLoadout,
      });
    }

    // Get full skin details for equipped skins
    const equippedSkinIds = [
      loadout.cherrySkinId,
      loadout.strawberrySkinId,
      loadout.grapeSkinId,
      loadout.persimmonSkinId,
      loadout.appleSkinId,
      loadout.pearSkinId,
      loadout.peachSkinId,
      loadout.pineappleSkinId,
      loadout.melonSkinId,
      loadout.watermelonSkinId,
    ].filter(Boolean) as string[];

    const equippedSkins = await prisma.skin.findMany({
      where: { id: { in: equippedSkinIds } },
      include: { pack: true }
    });

    const skinsMap = new Map(equippedSkins.map(s => [s.id, s]));

    return res.json({
      success: true,
      data: {
        cherry: loadout.cherrySkinId ? skinsMap.get(loadout.cherrySkinId) : null,
        strawberry: loadout.strawberrySkinId ? skinsMap.get(loadout.strawberrySkinId) : null,
        grape: loadout.grapeSkinId ? skinsMap.get(loadout.grapeSkinId) : null,
        persimmon: loadout.persimmonSkinId ? skinsMap.get(loadout.persimmonSkinId) : null,
        apple: loadout.appleSkinId ? skinsMap.get(loadout.appleSkinId) : null,
        pear: loadout.pearSkinId ? skinsMap.get(loadout.pearSkinId) : null,
        peach: loadout.peachSkinId ? skinsMap.get(loadout.peachSkinId) : null,
        pineapple: loadout.pineappleSkinId ? skinsMap.get(loadout.pineappleSkinId) : null,
        melon: loadout.melonSkinId ? skinsMap.get(loadout.melonSkinId) : null,
        watermelon: loadout.watermelonSkinId ? skinsMap.get(loadout.watermelonSkinId) : null,
      }
    });
  } catch (error) {
    console.error('Error getting skin loadout:', error);
    return res.status(500).json({ error: 'Failed to get skin loadout' });
  }
});

/**
 * Update skin loadout (equip/unequip skins)
 * POST /api/skin/loadout
 */
router.post('/loadout', async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature, message, loadout } = req.body;

    if (!walletAddress || !signature || !message || !loadout) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify signature
    const isValid = await verifySignature(walletAddress, message, signature);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Validate that user owns all the skins they're trying to equip
    const skinIdsToEquip = Object.values(loadout).filter(Boolean) as string[];

    if (skinIdsToEquip.length > 0) {
      const ownedSkins = await prisma.ownedSkin.findMany({
        where: {
          walletAddress,
          skinId: { in: skinIdsToEquip }
        }
      });

      const ownedSkinIds = new Set(ownedSkins.map(s => s.skinId));

      for (const skinId of skinIdsToEquip) {
        if (!ownedSkinIds.has(skinId)) {
          return res.status(400).json({ error: `You don't own skin: ${skinId}` });
        }
      }

      // Validate skin types match
      const skins = await prisma.skin.findMany({
        where: { id: { in: skinIdsToEquip } }
      });

      const skinTypeMap = new Map(skins.map(s => [s.id, s.fruitType]));

      for (const [fruitType, skinId] of Object.entries(loadout)) {
        if (skinId && skinTypeMap.get(skinId as string) !== fruitType) {
          return res.status(400).json({
            error: `Skin ${skinId} is not for ${fruitType}`
          });
        }
      }
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

    // Update or create loadout
    await prisma.skinLoadout.upsert({
      where: { walletAddress },
      create: {
        userId: user.id,
        walletAddress,
        cherrySkinId: loadout.cherry || null,
        strawberrySkinId: loadout.strawberry || null,
        grapeSkinId: loadout.grape || null,
        persimmonSkinId: loadout.persimmon || null,
        appleSkinId: loadout.apple || null,
        pearSkinId: loadout.pear || null,
        peachSkinId: loadout.peach || null,
        pineappleSkinId: loadout.pineapple || null,
        melonSkinId: loadout.melon || null,
        watermelonSkinId: loadout.watermelon || null,
      },
      update: {
        cherrySkinId: loadout.cherry || null,
        strawberrySkinId: loadout.strawberry || null,
        grapeSkinId: loadout.grape || null,
        persimmonSkinId: loadout.persimmon || null,
        appleSkinId: loadout.apple || null,
        pearSkinId: loadout.pear || null,
        peachSkinId: loadout.peach || null,
        pineappleSkinId: loadout.pineapple || null,
        melonSkinId: loadout.melon || null,
        watermelonSkinId: loadout.watermelon || null,
      }
    });

    return res.json({
      success: true,
      message: 'Loadout updated successfully',
    });
  } catch (error) {
    console.error('Error updating skin loadout:', error);
    return res.status(500).json({ error: 'Failed to update loadout' });
  }
});

/**
 * Browse all skins (for gallery/collection view)
 * GET /api/skin/browse
 */
router.get('/browse', async (req: Request, res: Response) => {
  try {
    const packId = req.query.packId as string | undefined;
    const rarity = req.query.rarity as string | undefined;
    const fruitType = req.query.fruitType as string | undefined;

    const where: any = {};
    if (packId) where.packId = packId;
    if (rarity) where.rarity = rarity;
    if (fruitType) where.fruitType = fruitType;

    const skins = await prisma.skin.findMany({
      where,
      include: { pack: true },
      orderBy: [
        { pack: { name: 'asc' } },
        { fruitType: 'asc' },
        { rarity: 'asc' },
      ]
    });

    return res.json({
      success: true,
      data: skins,
    });
  } catch (error) {
    console.error('Error browsing skins:', error);
    return res.status(500).json({ error: 'Failed to browse skins' });
  }
});

export default router;
