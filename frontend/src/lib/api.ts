/**
 * API Client for Fruit Game Backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Request failed',
      };
    }

    return data;
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      error: 'Network error',
    };
  }
}

// ============ USER API ============

export const userApi = {
  async getNonce(walletAddress: string) {
    return fetchApi<{ nonce: string; message: string; expiresAt: string }>(
      `/user/nonce/${walletAddress}`
    );
  },

  async authenticate(data: {
    walletAddress: string;
    signature: string;
    message: string;
    nonce: string;
  }) {
    return fetchApi<{ user: any; skinLoadout: any; ownedSkins: any[] }>(
      '/user/auth',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  async getProfile(walletAddress: string) {
    return fetchApi<{ profile: any; skinLoadout: any; ownedSkins: any[]; pendingRewards: any[] }>(
      `/user/profile/${walletAddress}`
    );
  },

  async getGameHistory(walletAddress: string, limit = 20, offset = 0) {
    return fetchApi<{ games: any[]; total: number }>(
      `/user/history/${walletAddress}?limit=${limit}&offset=${offset}`
    );
  },
};

// ============ GAME API ============

export const gameApi = {
  async startGame(data: {
    walletAddress: string;
    signature: string;
    message: string;
    transactionSignature: string;
  }) {
    return fetchApi<{ sessionId: string; startTime: number; endTime: number; initialState: any }>(
      '/game/start',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  async sendInput(sessionId: string, input: { type: 'drop'; x: number; timestamp: number }) {
    return fetchApi<{ state: any; mergeEvents: any[] }>(
      '/game/input',
      {
        method: 'POST',
        body: JSON.stringify({ sessionId, input }),
      }
    );
  },

  async getState(sessionId: string) {
    return fetchApi<any>(`/game/state/${sessionId}`);
  },

  async endGame(sessionId: string) {
    return fetchApi<{ finalScore: number; totalPoints: number; isNewHighScore: boolean }>(
      '/game/end',
      {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      }
    );
  },
};

// ============ LEADERBOARD API ============

export const leaderboardApi = {
  async getDaily(wallet?: string, limit = 100) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (wallet) params.append('wallet', wallet);
    return fetchApi<{ period: string; entries: any[]; userRank: any; resetTime: string }>(
      `/leaderboard/daily?${params}`
    );
  },

  async getWeekly(wallet?: string, limit = 100) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (wallet) params.append('wallet', wallet);
    return fetchApi<{ period: string; entries: any[]; userRank: any; resetTime: string }>(
      `/leaderboard/weekly?${params}`
    );
  },

  async getAllTime(wallet?: string, limit = 100) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (wallet) params.append('wallet', wallet);
    return fetchApi<{ period: string; entries: any[]; userRank: any }>(
      `/leaderboard/alltime?${params}`
    );
  },
};

// ============ GACHA API ============

export const gachaApi = {
  async getPacks() {
    return fetchApi<any[]>('/gacha/packs');
  },

  async getPack(packId: string) {
    return fetchApi<any>(`/gacha/pack/${packId}`);
  },

  async openPack(data: {
    walletAddress: string;
    packId: string;
    signature: string;
    message: string;
    transactionSignature: string;
  }) {
    return fetchApi<{ skin: any; mintAddress: string; transactionSignature: string }>(
      '/gacha/open',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },
};

// ============ SKIN API ============

export const skinApi = {
  async getOwned(walletAddress: string) {
    return fetchApi<{ all: any[]; byFruit: Record<string, any[]>; total: number }>(
      `/skin/owned/${walletAddress}`
    );
  },

  async getLoadout(walletAddress: string) {
    return fetchApi<Record<string, any | null>>(`/skin/loadout/${walletAddress}`);
  },

  async saveLoadout(data: {
    walletAddress: string;
    signature: string;
    message: string;
    loadout: Record<string, string | null>;
  }) {
    return fetchApi<{ message: string }>(
      '/skin/loadout',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  async browse(filters?: { packId?: string; rarity?: string; fruitType?: string }) {
    const params = new URLSearchParams();
    if (filters?.packId) params.append('packId', filters.packId);
    if (filters?.rarity) params.append('rarity', filters.rarity);
    if (filters?.fruitType) params.append('fruitType', filters.fruitType);
    return fetchApi<any[]>(`/skin/browse?${params}`);
  },
};

// ============ REWARD API ============

export const rewardApi = {
  async getPending(walletAddress: string) {
    return fetchApi<any[]>(`/reward/pending/${walletAddress}`);
  },

  async getHistory(walletAddress: string, limit = 50) {
    return fetchApi<any[]>(`/reward/history/${walletAddress}?limit=${limit}`);
  },

  async claim(data: {
    walletAddress: string;
    rewardId: string;
    signature: string;
    message: string;
  }) {
    return fetchApi<any>(
      '/reward/claim',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },
};

export default {
  user: userApi,
  game: gameApi,
  leaderboard: leaderboardApi,
  gacha: gachaApi,
  skin: skinApi,
  reward: rewardApi,
};
