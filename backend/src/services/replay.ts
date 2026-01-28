/**
 * Replay storage and verification services
 * Used for anti-cheat verification of suspicious high scores
 */

import { createHash } from 'crypto';
import { gzipSync, gunzipSync } from 'zlib';

interface GameInput {
  type: 'drop';
  x: number;
  timestamp: number;
  fruitType?: string;
}

/**
 * Compress replay data for storage
 * Uses gzip compression to minimize database storage
 */
export function compressReplay(inputs: GameInput[]): Buffer {
  const jsonString = JSON.stringify(inputs);
  return gzipSync(Buffer.from(jsonString, 'utf-8'));
}

/**
 * Decompress replay data for verification
 */
export function decompressReplay(data: Buffer): GameInput[] {
  const jsonString = gunzipSync(data).toString('utf-8');
  return JSON.parse(jsonString);
}

/**
 * Hash all inputs for integrity verification
 * This allows quick comparison to detect tampering
 */
export function hashInputs(inputs: GameInput[]): string {
  const normalized = inputs.map(input => ({
    type: input.type,
    x: Math.round(input.x * 1000) / 1000, // Normalize precision
    timestamp: input.timestamp,
    fruitType: input.fruitType,
  }));

  const jsonString = JSON.stringify(normalized);
  return createHash('sha256').update(jsonString).digest('hex');
}

/**
 * Verify replay integrity
 * Checks that the stored hash matches the replay data
 */
export function verifyReplayIntegrity(data: Buffer, expectedHash: string): boolean {
  try {
    const inputs = decompressReplay(data);
    const actualHash = hashInputs(inputs);
    return actualHash === expectedHash;
  } catch (error) {
    console.error('Replay integrity check failed:', error);
    return false;
  }
}

/**
 * Analyze replay for suspicious patterns
 * Returns a suspicion score from 0-100 (higher = more suspicious)
 */
export function analyzeReplay(inputs: GameInput[]): {
  suspicionScore: number;
  flags: string[];
} {
  const flags: string[] = [];
  let suspicionScore = 0;

  if (inputs.length === 0) {
    return { suspicionScore: 0, flags: ['No inputs recorded'] };
  }

  // Check 1: Unrealistic input frequency
  const minInterval = 500; // Minimum allowed ms between drops
  for (let i = 1; i < inputs.length; i++) {
    const interval = inputs[i].timestamp - inputs[i - 1].timestamp;
    if (interval < minInterval) {
      suspicionScore += 10;
      flags.push(`Rapid inputs detected (${interval}ms interval)`);
    }
  }

  // Check 2: Perfectly regular timing (bot-like)
  if (inputs.length > 5) {
    const intervals: number[] = [];
    for (let i = 1; i < inputs.length; i++) {
      intervals.push(inputs[i].timestamp - inputs[i - 1].timestamp);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // Very low variance suggests automated play
    if (stdDev < 50 && intervals.length > 10) {
      suspicionScore += 30;
      flags.push('Suspiciously regular timing pattern');
    }
  }

  // Check 3: Unrealistic x positions (always hitting exact spots)
  const xPositions = inputs.map(i => i.x);
  const uniquePositions = new Set(xPositions.map(x => Math.round(x * 100))).size;

  if (inputs.length > 10 && uniquePositions < 3) {
    suspicionScore += 20;
    flags.push('Limited position variety');
  }

  // Check 4: Game duration anomalies
  if (inputs.length > 0) {
    const gameDuration = inputs[inputs.length - 1].timestamp - inputs[0].timestamp;
    const expectedMinDuration = inputs.length * minInterval;

    if (gameDuration < expectedMinDuration * 0.5) {
      suspicionScore += 25;
      flags.push('Game duration too short for input count');
    }
  }

  // Cap at 100
  suspicionScore = Math.min(100, suspicionScore);

  return { suspicionScore, flags };
}

/**
 * Flag a game session for manual review
 */
export interface ReplayAnalysisResult {
  isValid: boolean;
  suspicionScore: number;
  flags: string[];
  requiresReview: boolean;
}

export function shouldFlagForReview(analysis: { suspicionScore: number; flags: string[] }): boolean {
  // Flag if suspicion score is above threshold
  return analysis.suspicionScore >= 50;
}
