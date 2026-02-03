'use client';

import { FC, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Header from '@/components/layout/Header';
import FruitGame from '@/components/game/FruitGame';
import Link from 'next/link';

const GamePage: FC = () => {
  const { publicKey, connected } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For demo purposes, allow playing without wallet
  const [demoMode, setDemoMode] = useState(false);

  const handleStartGame = async () => {
    if (!connected && !demoMode) {
      setError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement actual payment flow
      // 1. Create payment transaction (50 FRUIT tokens)
      // 2. Sign and send transaction
      // 3. Call backend /api/game/start with transaction signature
      // 4. Get session ID from backend

      // For now, just start the game
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate loading
      setGameStarted(true);
    } catch (err) {
      setError('Failed to start game. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGameEnd = async (finalScore: number) => {
    console.log('Game ended with score:', finalScore);

    // TODO: Call backend /api/game/end to save score
    // The backend will validate the game and update leaderboards
  };

  // Reset game state when wallet disconnects
  useEffect(() => {
    if (!connected && !demoMode) {
      setGameStarted(false);
    }
  }, [connected, demoMode]);

  return (
    <main className="min-h-screen" style={{ background: 'linear-gradient(180deg, #E8A54B 0%, #D4956A 8%, #C8A878 20%, #C8A878 100%)' }}>
      <Header />

      <section className="pt-28 pb-16 px-4">
        <div className="max-w-[960px] mx-auto">
          {!gameStarted ? (
            // Pre-game screen
            <div className="frame-container max-w-lg mx-auto">
              <div className="frame-inner p-8 text-center">
                <h1 className="text-4xl font-bold bubble-text text-[var(--primary)] mb-6">
                  Ready to Play?
                </h1>

                {/* Game cost info */}
                <div className="card-3d p-4 mb-6">
                  <p className="text-lg mb-2">Game Cost</p>
                  <p className="text-3xl font-bold text-[var(--accent-green)]">
                    50 FRUIT
                  </p>
                  <p className="text-sm text-[var(--foreground)]/60 mt-2">
                    Tokens will be sent to treasury
                  </p>
                </div>

                {/* Game info */}
                <div className="text-left mb-6 space-y-2">
                  <p className="flex items-center gap-2">
                    <span>⏱️</span>
                    <span>7 minute time limit</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span>🎯</span>
                    <span>Drop fruits and merge them to score</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span>⚠️</span>
                    <span>Game ends if fruits stack too high</span>
                  </p>
                </div>

                {/* Error message */}
                {error && (
                  <div className="bg-red-100 border-2 border-red-400 rounded-lg p-3 mb-4 text-red-700">
                    {error}
                  </div>
                )}

                {/* Start button or connect wallet */}
                {connected || demoMode ? (
                  <div className="space-y-4">
                    <button
                      onClick={handleStartGame}
                      disabled={isLoading}
                      className="btn-3d btn-green py-4 px-12 text-xl w-full disabled:opacity-50"
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="spinner w-5 h-5" />
                          Starting...
                        </span>
                      ) : (
                        'START GAME'
                      )}
                    </button>

                    {connected && (
                      <p className="text-sm text-[var(--foreground)]/60">
                        Connected: {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
                      </p>
                    )}

                    {demoMode && (
                      <p className="text-sm text-amber-600">
                        Demo mode - scores won&apos;t be saved
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <WalletMultiButton className="!bg-[var(--primary)] !rounded-xl !py-4 !px-8 !font-bold !text-white !text-lg !w-full hover:!bg-[var(--primary-dark)] !transition-colors" />

                    <button
                      onClick={() => setDemoMode(true)}
                      className="text-sm text-[var(--foreground)]/60 underline hover:text-[var(--primary)]"
                    >
                      Play demo (scores won&apos;t be saved)
                    </button>
                  </div>
                )}

                {/* Back link */}
                <Link
                  href="/"
                  className="inline-block mt-6 text-[var(--primary)] hover:underline"
                >
                  ← Back to Home
                </Link>
              </div>
            </div>
          ) : (
            // Game screen
            <div className="flex flex-col items-center">
              <FruitGame onGameEnd={handleGameEnd} />

              {/* Game controls */}
              <div className="mt-6 flex gap-4">
                <button
                  onClick={() => window.location.reload()}
                  className="btn-3d btn-pink py-2 px-6"
                >
                  Quit Game
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default GamePage;
