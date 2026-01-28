// Fruit Game Shared Types

// ============ FRUITS ============
export const FRUIT_SEQUENCE = [
  'cherry',
  'strawberry',
  'grape',
  'persimmon',
  'apple',
  'pear',
  'peach',
  'pineapple',
  'melon',
  'watermelon',
] as const;

export type FruitType = typeof FRUIT_SEQUENCE[number];

export interface FruitConfig {
  type: FruitType;
  radius: number;
  points: number;
  color: string; // Default color for placeholder
}

export const FRUIT_CONFIGS: Record<FruitType, FruitConfig> = {
  cherry: { type: 'cherry', radius: 15, points: 1, color: '#FF6B6B' },
  strawberry: { type: 'strawberry', radius: 20, points: 3, color: '#FF8E8E' },
  grape: { type: 'grape', radius: 28, points: 6, color: '#9B59B6' },
  persimmon: { type: 'persimmon', radius: 35, points: 10, color: '#E67E22' },
  apple: { type: 'apple', radius: 45, points: 15, color: '#E74C3C' },
  pear: { type: 'pear', radius: 55, points: 21, color: '#A8E6CF' },
  peach: { type: 'peach', radius: 65, points: 28, color: '#FFB3BA' },
  pineapple: { type: 'pineapple', radius: 80, points: 36, color: '#F4D03F' },
  melon: { type: 'melon', radius: 95, points: 45, color: '#82E0AA' },
  watermelon: { type: 'watermelon', radius: 110, points: 55, color: '#27AE60' },
};

// ============ GAME ============
export const GAME_CONFIG = {
  CONTAINER_WIDTH: 400,
  CONTAINER_HEIGHT: 600,
  GAME_DURATION_MS: 7 * 60 * 1000, // 7 minutes
  PLAY_COST: 50, // Fruit coins to play
  DROP_ZONE_HEIGHT: 80, // Height of the drop zone at top
  WALL_THICKNESS: 20,
} as const;

export interface GameInput {
  type: 'drop';
  x: number; // X position to drop fruit (0-1 normalized)
  timestamp: number; // Client timestamp
  fruitType: FruitType; // The fruit being dropped
}

export interface GameState {
  fruits: FruitState[];
  score: number;
  nextFruit: FruitType;
  queuedFruit: FruitType;
  isGameOver: boolean;
  timeRemaining: number;
}

export interface FruitState {
  id: string;
  type: FruitType;
  x: number;
  y: number;
  angle: number;
  skinId?: string; // NFT skin being used
}

export interface GameSession {
  id: string;
  walletAddress: string;
  startTime: number;
  endTime?: number;
  finalScore?: number;
  inputs: GameInput[];
  isValid: boolean;
  replayData?: string; // Compressed replay for verification
}

// ============ USER ============
export interface UserProfile {
  walletAddress: string;
  totalPoints: number;
  gamesPlayed: number;
  highScore: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============ LEADERBOARD ============
export type LeaderboardPeriod = 'daily' | 'weekly' | 'allTime';

export interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  score: number;
  gamesPlayed?: number;
  timestamp?: Date;
}

export interface LeaderboardResponse {
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  userRank?: LeaderboardEntry;
  resetTime?: Date; // When this leaderboard resets
}

// ============ SKINS & NFTs ============
export type SkinRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export const RARITY_WEIGHTS: Record<SkinRarity, number> = {
  common: 59,
  uncommon: 20,
  rare: 15,
  epic: 5,
  legendary: 1,
};

export const RARITY_COLORS: Record<SkinRarity, string> = {
  common: '#9CA3AF', // Gray
  uncommon: '#10B981', // Green
  rare: '#3B82F6', // Blue
  epic: '#8B5CF6', // Purple
  legendary: '#F59E0B', // Gold
};

export interface Skin {
  id: string;
  name: string;
  fruitType: FruitType; // Which fruit this skin replaces
  rarity: SkinRarity;
  packId: string;
  imageUrl: string;
  totalSupply: number;
  mintedCount: number;
  isSoldOut: boolean;
}

export interface Pack {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number; // In fruit tokens (100,000)
  skins: Skin[];
  totalSkins: number;
  remainingSkins: number;
  isSoldOut: boolean;
  createdAt: Date;
}

export interface OwnedSkin {
  id: string;
  skinId: string;
  skin: Skin;
  walletAddress: string;
  mintAddress: string; // Solana NFT mint address
  acquiredAt: Date;
  isEquipped: boolean;
}

export interface UserSkinLoadout {
  walletAddress: string;
  equippedSkins: Record<FruitType, string | null>; // fruitType -> skinId or null for default
}

// ============ GACHA ============
export const PACK_PRICE = 100_000; // 100,000 fruit tokens per pack

export interface GachaResult {
  skin: Skin;
  mintAddress: string;
  transactionSignature: string;
}

// ============ REWARDS ============
export interface ClaimableReward {
  id: string;
  walletAddress: string;
  type: 'pack' | 'tokens';
  amount?: number; // For token rewards
  packId?: string; // For pack rewards
  reason: string; // e.g., "Weekly Leaderboard #1"
  weekStart?: Date;
  claimedAt?: Date;
  expiresAt?: Date;
}

// ============ API TYPES ============
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface StartGameRequest {
  walletAddress: string;
  signature: string; // Signed message to verify wallet
  transactionSignature: string; // Payment transaction
}

export interface StartGameResponse {
  sessionId: string;
  startTime: number;
  initialState: GameState;
}

export interface GameInputRequest {
  sessionId: string;
  input: GameInput;
}

export interface GameInputResponse {
  state: GameState;
  mergeEvents: MergeEvent[];
}

export interface MergeEvent {
  fruit1Id: string;
  fruit2Id: string;
  resultFruitId: string;
  resultType: FruitType;
  points: number;
  position: { x: number; y: number };
}

export interface EndGameRequest {
  sessionId: string;
}

export interface EndGameResponse {
  finalScore: number;
  totalPoints: number; // User's updated total
  leaderboardPosition?: number;
  isNewHighScore: boolean;
}

// ============ WEBSOCKET EVENTS ============
export type WebSocketEvent =
  | { type: 'game_state'; state: GameState }
  | { type: 'merge'; event: MergeEvent }
  | { type: 'game_over'; finalScore: number }
  | { type: 'time_update'; remaining: number }
  | { type: 'error'; message: string };
