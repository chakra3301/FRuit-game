import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../index';
import { GameEngine } from '../game/engine';
import { verifySignature, verifyTransaction } from '../services/solana';
import { compressReplay, hashInputs } from '../services/replay';

const router = Router();

// Active game sessions (in-memory for real-time performance)
const activeSessions = new Map<string, GameEngine>();

// Constants
const GAME_DURATION_MS = 7 * 60 * 1000; // 7 minutes
const PLAY_COST = 50; // Fruit tokens

/**
 * Start a new game session
 * POST /api/game/start
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature, message, transactionSignature } = req.body;

    if (!walletAddress || !signature || !message || !transactionSignature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify wallet signature
    const isValidSignature = await verifySignature(walletAddress, message, signature);
    if (!isValidSignature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const existingTx = await prisma.transactionLog.findUnique({
      where: { txSignature: transactionSignature }
    });

    if (existingTx) {
      if (existingTx.walletAddress !== walletAddress) {
        return res.status(400).json({ error: 'Transaction wallet mismatch' });
      }
      if (existingTx.status !== 'confirmed') {
        return res.status(400).json({ error: 'Transaction not confirmed' });
      }
      const usedSession = await prisma.gameSession.findFirst({
        where: { paymentTxSig: transactionSignature }
      });
      if (usedSession) {
        return res.status(400).json({ error: 'Transaction already used' });
      }
    } else {
      // Verify payment transaction
      const isValidTx = await verifyTransaction(transactionSignature, walletAddress, PLAY_COST);
      if (!isValidTx) {
        return res.status(400).json({ error: 'Invalid or unconfirmed payment transaction' });
      }

      // Log the transaction
      await prisma.transactionLog.create({
        data: {
          walletAddress,
          type: 'play',
          amount: PLAY_COST,
          txSignature: transactionSignature,
          status: 'confirmed',
          confirmedAt: new Date(),
        }
      });
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

    // Create game session
    const sessionId = uuidv4();
    const startTime = Date.now();

    // Get user's equipped skins for the game
    const skinLoadout = await prisma.skinLoadout.findUnique({
      where: { walletAddress }
    });

    // Create game engine instance
    const gameEngine = new GameEngine(sessionId, skinLoadout);
    activeSessions.set(sessionId, gameEngine);

    // Create database record
    await prisma.gameSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        walletAddress,
        startTime: new Date(startTime),
        paymentTxSig: transactionSignature,
      }
    });

    // Set timeout to end game after 7 minutes
    setTimeout(() => {
      endGameSession(sessionId, 'timeout');
    }, GAME_DURATION_MS);

    return res.json({
      success: true,
      data: {
        sessionId,
        startTime,
        endTime: startTime + GAME_DURATION_MS,
        initialState: gameEngine.getState(),
      }
    });
  } catch (error) {
    console.error('Error starting game:', error);
    return res.status(500).json({ error: 'Failed to start game' });
  }
});

/**
 * Verify payment before starting a session
 * POST /api/game/verify-payment
 */
router.post('/verify-payment', async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature, message, transactionSignature } = req.body;

    if (!walletAddress || !signature || !message || !transactionSignature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify wallet signature
    const isValidSignature = await verifySignature(walletAddress, message, signature);
    if (!isValidSignature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const existingTx = await prisma.transactionLog.findUnique({
      where: { txSignature: transactionSignature }
    });

    if (existingTx) {
      if (existingTx.walletAddress !== walletAddress) {
        return res.status(400).json({ error: 'Transaction wallet mismatch' });
      }
      if (existingTx.status !== 'confirmed') {
        return res.status(400).json({ error: 'Transaction not confirmed' });
      }
      const usedSession = await prisma.gameSession.findFirst({
        where: { paymentTxSig: transactionSignature }
      });
      if (usedSession) {
        return res.status(400).json({ error: 'Transaction already used' });
      }

      return res.json({
        success: true,
        data: {
          readyToStart: true,
          transactionSignature,
          alreadyVerified: true,
        }
      });
    }

    const isValidTx = await verifyTransaction(transactionSignature, walletAddress, PLAY_COST);
    if (!isValidTx) {
      return res.status(400).json({ error: 'Invalid or unconfirmed payment transaction' });
    }

    await prisma.transactionLog.create({
      data: {
        walletAddress,
        type: 'play',
        amount: PLAY_COST,
        txSignature: transactionSignature,
        status: 'confirmed',
        confirmedAt: new Date(),
      }
    });

    return res.json({
      success: true,
      data: {
        readyToStart: true,
        transactionSignature,
        alreadyVerified: false,
      }
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ error: 'Failed to verify payment' });
  }
});

/**
 * Submit a game input (drop fruit)
 * POST /api/game/input
 */
router.post('/input', async (req: Request, res: Response) => {
  try {
    const { sessionId, input } = req.body;

    if (!sessionId || !input) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const gameEngine = activeSessions.get(sessionId);
    if (!gameEngine) {
      return res.status(404).json({ error: 'Game session not found or expired' });
    }

    // Validate input
    if (input.type !== 'drop' || typeof input.x !== 'number' || input.x < 0 || input.x > 1) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    // Process the input in the game engine
    const result = gameEngine.processInput(input);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      success: true,
      data: {
        state: gameEngine.getState(),
        mergeEvents: result.mergeEvents,
      }
    });
  } catch (error) {
    console.error('Error processing input:', error);
    return res.status(500).json({ error: 'Failed to process input' });
  }
});

/**
 * Get current game state
 * GET /api/game/state/:sessionId
 */
router.get('/state/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const gameEngine = activeSessions.get(sessionId.toString());
    if (!gameEngine) {
      return res.status(404).json({ error: 'Game session not found or expired' });
    }

    return res.json({
      success: true,
      data: gameEngine.getState(),
    });
  } catch (error) {
    console.error('Error getting game state:', error);
    return res.status(500).json({ error: 'Failed to get game state' });
  }
});

/**
 * End game session manually
 * POST /api/game/end
 */
router.post('/end', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    const result = await endGameSession(sessionId, 'manual');

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Error ending game:', error);
    return res.status(500).json({ error: 'Failed to end game' });
  }
});

/**
 * End a game session and save results
 */
async function endGameSession(sessionId: string, reason: 'timeout' | 'gameover' | 'manual') {
  const gameEngine = activeSessions.get(sessionId);
  if (!gameEngine) {
    return { success: false, error: 'Game session not found' };
  }

  // Get final state
  const finalState = gameEngine.getState();
  const finalScore = finalState.score;
  const inputs = gameEngine.getInputHistory();
  const replayData = compressReplay(inputs);
  const inputsHash = hashInputs(inputs);

  // Remove from active sessions
  activeSessions.delete(sessionId);

  // Update database
  const session = await prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      endTime: new Date(),
      finalScore,
      replayData,
      inputsHash,
    },
    include: { user: true }
  });

  // Update user stats
  const user = await prisma.user.update({
    where: { id: session.userId },
    data: {
      totalPoints: { increment: finalScore },
      gamesPlayed: { increment: 1 },
      highScore: Math.max(session.user.highScore, finalScore),
    }
  });

  // Update leaderboard scores
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Get Monday of current week
  const weekStart = new Date(today);
  const dayOfWeek = weekStart.getUTCDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  weekStart.setUTCDate(weekStart.getUTCDate() + diff);

  // Update daily score (keep highest)
  await prisma.dailyScore.upsert({
    where: {
      walletAddress_date: {
        walletAddress: session.walletAddress,
        date: today,
      }
    },
    create: {
      userId: session.userId,
      walletAddress: session.walletAddress,
      score: finalScore,
      date: today,
      gameSessionId: sessionId,
    },
    update: {
      score: { set: finalScore },
      gameSessionId: sessionId,
    },
  });

  // Update weekly score (keep highest)
  await prisma.weeklyScore.upsert({
    where: {
      walletAddress_weekStart: {
        walletAddress: session.walletAddress,
        weekStart,
      }
    },
    create: {
      userId: session.userId,
      walletAddress: session.walletAddress,
      score: finalScore,
      weekStart,
      gameSessionId: sessionId,
    },
    update: {
      score: { set: finalScore },
      gameSessionId: sessionId,
    },
  });

  return {
    success: true,
    data: {
      finalScore,
      totalPoints: user.totalPoints,
      isNewHighScore: finalScore > session.user.highScore,
      reason,
    }
  };
}

// Export for use in game engine callbacks
export { endGameSession, activeSessions };

export default router;
