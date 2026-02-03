'use client';

import { FC, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Header from '@/components/layout/Header';

type LeaderboardPeriod = 'daily' | 'weekly' | 'allTime';

interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  score: number;
  gamesPlayed?: number;
}

const LeaderboardPage: FC = () => {
  const { publicKey } = useWallet();
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resetTime, setResetTime] = useState<string | null>(null);

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/leaderboard/${period}?wallet=${publicKey?.toBase58()}`);
        // const data = await response.json();

        // Mock data for now
        const mockEntries: LeaderboardEntry[] = Array.from({ length: 20 }, (_, i) => ({
          rank: i + 1,
          walletAddress: `${['Abc', 'Def', 'Ghi', 'Jkl', 'Mno'][i % 5]}...${Math.random().toString(36).substring(2, 6)}`,
          score: Math.floor(5000 - i * 200 + Math.random() * 100),
          gamesPlayed: Math.floor(Math.random() * 50) + 10,
        }));

        setEntries(mockEntries);

        // Mock user rank
        if (publicKey) {
          setUserRank({
            rank: 42,
            walletAddress: publicKey.toBase58(),
            score: 1250,
            gamesPlayed: 15,
          });
        }

        // Set reset time
        const now = new Date();
        if (period === 'daily') {
          const tomorrow = new Date(now);
          tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
          tomorrow.setUTCHours(0, 0, 0, 0);
          setResetTime(tomorrow.toISOString());
        } else if (period === 'weekly') {
          const nextSunday = new Date(now);
          const daysUntilSunday = (7 - now.getUTCDay()) % 7;
          nextSunday.setUTCDate(now.getUTCDate() + daysUntilSunday);
          nextSunday.setUTCHours(0, 0, 0, 0);
          if (daysUntilSunday === 0) nextSunday.setUTCDate(nextSunday.getUTCDate() + 7);
          setResetTime(nextSunday.toISOString());
        } else {
          setResetTime(null);
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [period, publicKey]);

  const formatAddress = (address: string) => {
    if (address.length > 12) {
      return `${address.slice(0, 4)}...${address.slice(-4)}`;
    }
    return address;
  };

  const formatResetTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-300 to-yellow-500 text-yellow-900';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800';
    if (rank === 3) return 'bg-gradient-to-r from-amber-400 to-amber-600 text-amber-900';
    return 'bg-[var(--card-bg)]';
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };

  return (
    <main className="min-h-screen bg-[var(--background)] pattern-bg">
      <Header />

      <section className="pt-28 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-center bubble-text text-[var(--primary)] mb-8">
            🏆 Leaderboard
          </h1>

          {/* Period tabs */}
          <div className="flex justify-center gap-2 mb-6">
            {(['daily', 'weekly', 'allTime'] as LeaderboardPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`btn-3d py-2 px-6 text-sm ${
                  period === p ? 'btn-purple' : 'bg-white/50'
                }`}
              >
                {p === 'daily' && '📅 Daily'}
                {p === 'weekly' && '📆 Weekly'}
                {p === 'allTime' && '🌟 All Time'}
              </button>
            ))}
          </div>

          {/* Reset timer */}
          {resetTime && (
            <div className="text-center mb-6 text-[var(--foreground)]/70">
              <span className="text-sm">Resets in: </span>
              <span className="font-bold text-[var(--primary)]">
                {formatResetTime(resetTime)}
              </span>
            </div>
          )}

          {/* User's rank */}
          {userRank && (
            <div className="card-3d p-4 mb-6 border-2 border-[var(--accent-green)]">
              <p className="text-sm text-[var(--foreground)]/60 mb-2">Your Rank</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-[var(--primary)]">
                    #{userRank.rank}
                  </span>
                  <span className="text-sm text-[var(--foreground)]/60">
                    {formatAddress(userRank.walletAddress)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-[var(--accent-green)]">
                    {userRank.score.toLocaleString()}
                  </div>
                  {userRank.gamesPlayed && (
                    <div className="text-xs text-[var(--foreground)]/60">
                      {userRank.gamesPlayed} games
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Leaderboard table */}
          <div className="card-3d overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="spinner w-12 h-12 mx-auto mb-4" />
                <p className="text-[var(--foreground)]/60">Loading leaderboard...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-2xl mb-2">🏜️</p>
                <p className="text-[var(--foreground)]/60">No scores yet!</p>
                <p className="text-sm text-[var(--foreground)]/40">Be the first to play</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--primary)]/20">
                {entries.map((entry) => (
                  <div
                    key={entry.rank}
                    className={`flex items-center justify-between p-4 ${getRankStyle(entry.rank)} ${
                      entry.walletAddress === publicKey?.toBase58()
                        ? 'ring-2 ring-[var(--accent-green)]'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-12 text-center">
                        {getRankEmoji(entry.rank) || (
                          <span className="text-lg font-bold text-[var(--foreground)]/60">
                            {entry.rank}
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-sm">
                        {formatAddress(entry.walletAddress)}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[var(--primary)]">
                        {entry.score.toLocaleString()}
                      </div>
                      {entry.gamesPlayed && period === 'allTime' && (
                        <div className="text-xs text-[var(--foreground)]/60">
                          {entry.gamesPlayed} games
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weekly rewards info */}
          {period === 'weekly' && (
            <div className="mt-8 card-3d p-6">
              <h3 className="text-lg font-bold text-[var(--primary)] mb-4">
                🎁 Weekly Rewards
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>🥇 1st Place</span>
                  <span className="font-bold text-[var(--rarity-legendary)]">1 Free Pack</span>
                </div>
                <div className="flex justify-between">
                  <span>🥈🥉 2nd-10th Place</span>
                  <span className="font-bold text-[var(--rarity-epic)]">1 Free Pack</span>
                </div>
                <p className="text-[var(--foreground)]/60 mt-4">
                  * Rewards can be claimed on your profile page after the weekly reset
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default LeaderboardPage;
