'use client';

import { FC, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Header from '@/components/layout/Header';

type SkinRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface Skin {
  id: string;
  name: string;
  fruitType: string;
  rarity: SkinRarity;
  imageUrl: string;
  totalSupply: number;
  mintedCount: number;
}

interface Pack {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  isSoldOut: boolean;
  totalSkins: number;
  remainingSkins: number;
  skins: Skin[];
}

const RARITY_COLORS: Record<SkinRarity, string> = {
  common: 'var(--rarity-common)',
  uncommon: 'var(--rarity-uncommon)',
  rare: 'var(--rarity-rare)',
  epic: 'var(--rarity-epic)',
  legendary: 'var(--rarity-legendary)',
};

const RARITY_PERCENTAGES: Record<SkinRarity, number> = {
  common: 59,
  uncommon: 20,
  rare: 15,
  epic: 5,
  legendary: 1,
};

const GachaPage: FC = () => {
  const { publicKey, connected } = useWallet();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpening, setIsOpening] = useState(false);
  const [revealedSkin, setRevealedSkin] = useState<Skin | null>(null);
  const [showRates, setShowRates] = useState(false);

  // Fetch packs
  useEffect(() => {
    const fetchPacks = async () => {
      setIsLoading(true);
      try {
        // TODO: Replace with actual API call
        // const response = await fetch('/api/gacha/packs');
        // const data = await response.json();

        // Mock data
        const mockPacks: Pack[] = [
          {
            id: '1',
            name: 'Starter Pack',
            description: 'A collection of cute fruit skins for beginners!',
            imageUrl: '/assets/packs/starter.png',
            price: 100000,
            isSoldOut: false,
            totalSkins: 1000,
            remainingSkins: 847,
            skins: [
              { id: '1-1', name: 'Pixel Cherry', fruitType: 'cherry', rarity: 'common', imageUrl: '', totalSupply: 200, mintedCount: 45 },
              { id: '1-2', name: 'Golden Apple', fruitType: 'apple', rarity: 'rare', imageUrl: '', totalSupply: 50, mintedCount: 12 },
              { id: '1-3', name: 'Rainbow Watermelon', fruitType: 'watermelon', rarity: 'legendary', imageUrl: '', totalSupply: 10, mintedCount: 2 },
            ],
          },
          {
            id: '2',
            name: 'Space Pack',
            description: 'Cosmic fruit skins from another galaxy!',
            imageUrl: '/assets/packs/space.png',
            price: 100000,
            isSoldOut: false,
            totalSkins: 500,
            remainingSkins: 423,
            skins: [
              { id: '2-1', name: 'Asteroid Cherry', fruitType: 'cherry', rarity: 'uncommon', imageUrl: '', totalSupply: 100, mintedCount: 32 },
              { id: '2-2', name: 'Nebula Grape', fruitType: 'grape', rarity: 'epic', imageUrl: '', totalSupply: 25, mintedCount: 8 },
            ],
          },
          {
            id: '3',
            name: 'Halloween Pack',
            description: 'Spooky seasonal skins - Limited time!',
            imageUrl: '/assets/packs/halloween.png',
            price: 100000,
            isSoldOut: true,
            totalSkins: 300,
            remainingSkins: 0,
            skins: [],
          },
        ];

        setPacks(mockPacks);
      } catch (error) {
        console.error('Failed to fetch packs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPacks();
  }, []);

  const handleOpenPack = async (pack: Pack) => {
    if (!connected) {
      alert('Please connect your wallet first');
      return;
    }

    if (pack.isSoldOut) {
      alert('This pack is sold out!');
      return;
    }

    setIsOpening(true);
    setSelectedPack(pack);

    try {
      // TODO: Implement actual pack opening flow
      // 1. Create payment transaction (100,000 FRUIT tokens)
      // 2. Sign and send transaction
      // 3. Call backend /api/gacha/open with transaction signature
      // 4. Receive minted NFT

      // Simulate opening animation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock revealed skin
      const mockSkin: Skin = {
        id: 'mock-1',
        name: 'Pixel Cherry',
        fruitType: 'cherry',
        rarity: 'rare',
        imageUrl: '',
        totalSupply: 100,
        mintedCount: 45,
      };

      setRevealedSkin(mockSkin);
    } catch (error) {
      console.error('Failed to open pack:', error);
      alert('Failed to open pack. Please try again.');
    } finally {
      setIsOpening(false);
    }
  };

  const closeReveal = () => {
    setRevealedSkin(null);
    setSelectedPack(null);
  };

  const getFruitEmoji = (fruitType: string): string => {
    const emojiMap: Record<string, string> = {
      cherry: '🍒',
      strawberry: '🍓',
      grape: '🍇',
      persimmon: '🍊',
      apple: '🍎',
      pear: '🍐',
      peach: '🍑',
      pineapple: '🍍',
      melon: '🍈',
      watermelon: '🍉',
    };
    return emojiMap[fruitType] || '🍎';
  };

  return (
    <main className="min-h-screen bg-[var(--background)] pattern-bg">
      <Header />

      <section className="pt-28 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-center bubble-text text-[var(--primary)] mb-4">
            🎁 Gacha Packs
          </h1>
          <p className="text-center text-[var(--foreground)]/70 mb-8">
            Open packs to collect unique NFT skins for your fruits!
          </p>

          {/* Price and rates info */}
          <div className="max-w-md mx-auto card-3d p-4 mb-8">
            <div className="flex justify-between items-center mb-2">
              <span>Pack Price</span>
              <span className="font-bold text-[var(--accent-green)]">100,000 FRUIT</span>
            </div>
            <button
              onClick={() => setShowRates(!showRates)}
              className="text-sm text-[var(--primary)] underline"
            >
              {showRates ? 'Hide' : 'Show'} drop rates
            </button>

            {showRates && (
              <div className="mt-4 space-y-1">
                {(Object.entries(RARITY_PERCENTAGES) as [SkinRarity, number][]).map(
                  ([rarity, percent]) => (
                    <div key={rarity} className="flex justify-between text-sm">
                      <span
                        className="capitalize font-semibold"
                        style={{ color: RARITY_COLORS[rarity] }}
                      >
                        {rarity}
                      </span>
                      <span>{percent}%</span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Packs grid */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="spinner w-12 h-12 mx-auto mb-4" />
              <p className="text-[var(--foreground)]/60">Loading packs...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packs.map((pack) => (
                <div
                  key={pack.id}
                  className={`card-3d p-6 ${pack.isSoldOut ? 'opacity-60' : ''}`}
                >
                  {/* Pack image placeholder */}
                  <div className="aspect-square bg-gradient-to-br from-[var(--primary-light)] to-[var(--accent-blue)] rounded-xl mb-4 flex items-center justify-center">
                    <span className="text-6xl">🎁</span>
                  </div>

                  <h3 className="text-xl font-bold text-[var(--primary-dark)] mb-2">
                    {pack.name}
                  </h3>
                  <p className="text-sm text-[var(--foreground)]/70 mb-4">
                    {pack.description}
                  </p>

                  {/* Stock info */}
                  <div className="flex justify-between text-sm mb-4">
                    <span className="text-[var(--foreground)]/60">Remaining</span>
                    <span
                      className={`font-bold ${
                        pack.remainingSkins === 0
                          ? 'text-red-500'
                          : pack.remainingSkins < 100
                          ? 'text-orange-500'
                          : 'text-[var(--accent-green)]'
                      }`}
                    >
                      {pack.remainingSkins} / {pack.totalSkins}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 bg-gray-200 rounded-full mb-4 overflow-hidden">
                    <div
                      className="h-full bg-[var(--primary)] rounded-full transition-all"
                      style={{
                        width: `${((pack.totalSkins - pack.remainingSkins) / pack.totalSkins) * 100}%`,
                      }}
                    />
                  </div>

                  {/* Preview some skins */}
                  {pack.skins.length > 0 && (
                    <div className="flex gap-2 mb-4">
                      {pack.skins.slice(0, 3).map((skin) => (
                        <div
                          key={skin.id}
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                          style={{
                            backgroundColor: `${RARITY_COLORS[skin.rarity]}20`,
                            borderWidth: 2,
                            borderColor: RARITY_COLORS[skin.rarity],
                          }}
                          title={`${skin.name} (${skin.rarity})`}
                        >
                          {getFruitEmoji(skin.fruitType)}
                        </div>
                      ))}
                      {pack.skins.length > 3 && (
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm text-[var(--foreground)]/60 bg-gray-100">
                          +{pack.skins.length - 3}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Open button */}
                  {pack.isSoldOut ? (
                    <div className="btn-3d bg-gray-300 py-3 px-6 text-center text-gray-600 cursor-not-allowed">
                      SOLD OUT
                    </div>
                  ) : connected ? (
                    <button
                      onClick={() => handleOpenPack(pack)}
                      className="btn-3d btn-green py-3 px-6 w-full"
                      disabled={isOpening}
                    >
                      OPEN PACK
                    </button>
                  ) : (
                    <WalletMultiButton className="!bg-[var(--primary)] !rounded-xl !py-3 !px-6 !font-bold !text-white !w-full hover:!bg-[var(--primary-dark)] !transition-colors" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Opening animation overlay */}
      {isOpening && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="text-8xl animate-bounce mb-4">🎁</div>
            <p className="text-white text-xl">Opening pack...</p>
            <div className="spinner w-8 h-8 mx-auto mt-4 border-white border-t-transparent" />
          </div>
        </div>
      )}

      {/* Reveal modal */}
      {revealedSkin && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="card-3d p-8 max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-[var(--primary)] mb-4">
              🎉 You Got...
            </h2>

            {/* Skin reveal */}
            <div
              className={`aspect-square max-w-[200px] mx-auto rounded-2xl mb-4 flex items-center justify-center ${
                revealedSkin.rarity === 'legendary' ? 'shine-effect' : ''
              }`}
              style={{
                backgroundColor: `${RARITY_COLORS[revealedSkin.rarity]}30`,
                borderWidth: 4,
                borderColor: RARITY_COLORS[revealedSkin.rarity],
                boxShadow:
                  revealedSkin.rarity === 'legendary'
                    ? `0 0 30px ${RARITY_COLORS[revealedSkin.rarity]}`
                    : undefined,
              }}
            >
              <span className="text-7xl">{getFruitEmoji(revealedSkin.fruitType)}</span>
            </div>

            <h3 className="text-xl font-bold mb-2">{revealedSkin.name}</h3>
            <p
              className="text-lg font-semibold capitalize mb-4"
              style={{ color: RARITY_COLORS[revealedSkin.rarity] }}
            >
              {revealedSkin.rarity}
            </p>
            <p className="text-sm text-[var(--foreground)]/60 mb-6">
              Replaces: {getFruitEmoji(revealedSkin.fruitType)} {revealedSkin.fruitType}
            </p>

            <button onClick={closeReveal} className="btn-3d btn-purple py-3 px-8">
              AWESOME!
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default GachaPage;
