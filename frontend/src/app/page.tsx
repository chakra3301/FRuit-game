'use client';

import { FC, useState, useCallback } from 'react';
import Image from 'next/image';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import FruitGame from '@/components/game/FruitGame';

// ============ TYPES ============
type ModalType = 'game' | 'leaderboard' | 'store' | 'inventory' | null;
type LeaderboardTab = 'daily' | 'weekly' | 'allTime';

// Mock data for now
const MOCK_LEADERBOARD = [
  { rank: 1, name: '7xKp...3mFd', score: 49261 },
  { rank: 2, name: '4rBz...9nQe', score: 27661 },
  { rank: 3, name: '9mTx...2kWr', score: 27494 },
  { rank: 4, name: '3fHd...8pVs', score: 27229 },
  { rank: 5, name: '6wNc...1jAt', score: 25496 },
  { rank: 6, name: '2eRy...5gLm', score: 24103 },
  { rank: 7, name: '8bQk...4dCx', score: 22987 },
  { rank: 8, name: '5tJv...7hFn', score: 21445 },
];

const MOCK_PACKS = [
  { id: 'tropical', name: 'Tropical Pack', price: '100K FRUIT', stock: 847, image: '/assets/fruits/pineapple.png', color: '#ff9900' },
  { id: 'cosmic', name: 'Cosmic Pack', price: '100K FRUIT', stock: 423, image: '/assets/fruits/grape.png', color: '#8B5CF6' },
  { id: 'candy', name: 'Candy Pack', price: '100K FRUIT', stock: 1200, image: '/assets/fruits/cherry.png', color: '#ff88dd' },
];

const FRUIT_SEQUENCE = [
  'cherry', 'strawberry', 'grape', 'persimmon', 'apple',
  'pear', 'peach', 'pineapple', 'melon', 'watermelon',
] as const;

type FruitType = typeof FRUIT_SEQUENCE[number];

const MOCK_SKINS: Array<{
  id: string; name: string; fruitType: FruitType; rarity: string;
  equipped: boolean; image: string;
}> = [
  { id: '1', name: 'Neon Cherry', fruitType: 'cherry', rarity: 'rare', equipped: true, image: '/assets/fruits/cherry.png' },
  { id: '2', name: 'Gold Apple', fruitType: 'apple', rarity: 'epic', equipped: false, image: '/assets/fruits/apple.png' },
  { id: '3', name: 'Crystal Grape', fruitType: 'grape', rarity: 'uncommon', equipped: true, image: '/assets/fruits/grape.png' },
  { id: '4', name: 'Fire Melon', fruitType: 'melon', rarity: 'legendary', equipped: false, image: '/assets/fruits/melon.png' },
  { id: '5', name: 'Pastel Peach', fruitType: 'peach', rarity: 'common', equipped: false, image: '/assets/fruits/peach.png' },
  { id: '6', name: 'Ice Pear', fruitType: 'pear', rarity: 'rare', equipped: false, image: '/assets/fruits/pear.png' },
];

// ============ COMPONENT ============
const HomePage: FC = () => {
  const { connected } = useWallet();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [leaderboardTab, setLeaderboardTab] = useState<LeaderboardTab>('weekly');
  const [inventoryTab, setInventoryTab] = useState<'skins' | 'loadout'>('skins');
  const [skins, setSkins] = useState(MOCK_SKINS);
  const [isPlaying, setIsPlaying] = useState(false);

  const openModal = (modal: ModalType) => setActiveModal(modal);
  const closeModal = () => setActiveModal(null);

  const handleGameEnd = useCallback((finalScore: number) => {
    console.log('Game ended with score:', finalScore);
  }, []);

  const toggleEquip = (skinId: string) => {
    setSkins(prev => prev.map(s =>
      s.id === skinId ? { ...s, equipped: !s.equipped } : s
    ));
  };

  const rankColors = ['#FFD700', '#87CEEB', '#CD7F32', '#9CA3AF', '#9CA3AF'];

  return (
    <main className="home-game-bg">
      <div className="home-game-viewport flex flex-col items-start justify-start pt-0 pl-4 md:pl-6 relative">
        {/* Wallet connect - top right */}
        <div className="home-wallet-wrap absolute top-4 right-4 md:top-6 md:right-6 text-right">
          <WalletMultiButton />
          {!connected && (
            <p className="mt-2 text-sm font-semibold text-[var(--foreground)]/80">
              Connect wallet to play
            </p>
          )}
        </div>

        {/* Top left: big title */}
        <div className="home-title-wrap mb-0">
          <Image
            src="/fruitgameTT.png"
            alt="Fruit Game"
            width={520}
            height={200}
            className="home-title-img"
            priority
            unoptimized
          />
        </div>

        {!isPlaying ? (
          <>
            {/* Menu buttons */}
            <div className="relative z-10 mb-1 -mt-3 md:-mt-4">
              <button
                onClick={() => setIsPlaying(true)}
                className="home-play-btn"
                type="button"
              >
                Play
              </button>
            </div>

            <div className="relative z-10 mb-1">
              <button onClick={() => openModal('leaderboard')} className="home-leaderboard-btn" type="button">
                Leaderboard
              </button>
            </div>

            <div className="relative z-10 mb-1">
              <button onClick={() => openModal('store')} className="home-store-btn" type="button">
                Store
              </button>
            </div>

            <div className="relative z-10 mb-6">
              <button onClick={() => openModal('inventory')} className="home-inventory-btn" type="button">
                Inventory
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Blur overlay — blurs the background when game is active */}
            <div className="home-game-blur-overlay" aria-hidden />
            {/* Game inline on home page — fills viewport, no scroll */}
            <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
              {/* Back button — half down on left */}
              <button
              onClick={() => setIsPlaying(false)}
              className="home-play-btn absolute left-3 md:left-5 z-10"
              style={{ fontSize: '1.5rem', top: '50%', transform: 'translateY(-50%)' }}
            >
              Back
            </button>

            <div className="w-full h-full flex items-center justify-center px-2 py-2">
              <FruitGame onGameEnd={(finalScore) => {
                handleGameEnd(finalScore);
                setTimeout(() => setIsPlaying(false), 2000);
              }} />
            </div>
          </div>
          </>
        )}
      </div>

      {/* ===================== LEADERBOARD MODAL ===================== */}
      {activeModal === 'leaderboard' && (
        <div className="popup-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="popup-panel">
            <button className="popup-close" onClick={closeModal}>X</button>
            <div className="popup-title popup-title-leaderboard" style={{ color: '#ffdd00' }}>Leaderboard</div>

            {/* Tabs */}
            <div className="flex justify-center gap-2 mb-4">
              {(['daily', 'weekly', 'allTime'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setLeaderboardTab(tab)}
                  className={`glass-tab ${leaderboardTab === tab ? 'glass-tab-active' : ''}`}
                  style={{ color: leaderboardTab === tab ? '#ffdd00' : '#8B7355' }}
                >
                  {tab === 'allTime' ? 'All Time' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Entries */}
            <div className="space-y-2">
              {MOCK_LEADERBOARD.map((entry, i) => (
                <div key={entry.rank} className="glass-card flex items-center gap-3 py-3 px-4" style={{ padding: '10px 16px' }}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white"
                    style={{ background: rankColors[Math.min(i, 4)], boxShadow: `0 0 10px ${rankColors[Math.min(i, 4)]}66` }}
                  >
                    {entry.rank}
                  </div>
                  <span className="text-sm font-bold text-[#5C4A32] flex-1">{entry.name}</span>
                  <span className="text-lg font-black text-[#5C4A32]" style={{ fontFamily: 'var(--font-guby)', textShadow: '-1px -1px 0 rgba(255,255,255,0.8)' }}>
                    {entry.score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Weekly reward info */}
            <div className="glass-card mt-4 text-center" style={{ padding: '12px' }}>
              <p className="text-sm font-bold text-[#8B7355]">Weekly Rewards</p>
              <p className="text-xs text-[#8B7355] mt-1">#1 gets a free pack &bull; #2-10 share a bonus pool</p>
              <p className="text-xs text-[#8B7355]">Resets Sunday midnight UTC</p>
            </div>
          </div>
        </div>
      )}

      {/* ===================== STORE MODAL ===================== */}
      {activeModal === 'store' && (
        <div className="popup-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="popup-panel">
            <button className="popup-close" onClick={closeModal}>X</button>
            <div className="popup-title popup-title-store" style={{ color: '#ff9900' }}>Store</div>

            {/* Packs */}
            <div className="space-y-3">
              {MOCK_PACKS.map(pack => (
                <div key={pack.id} className="glass-card flex items-center gap-4">
                  <img src={pack.image} alt={pack.name} className="w-16 h-16 object-contain" />
                  <div className="flex-1">
                    <p className="font-bold text-[#5C4A32] text-lg" style={{ fontFamily: 'var(--font-guby)', textShadow: '-1px -1px 0 rgba(255,255,255,0.8)' }}>
                      {pack.name}
                    </p>
                    <p className="text-sm text-[#8B7355]">{pack.stock} remaining</p>
                  </div>
                  <button
                    className="glass-btn text-sm"
                    style={{ color: pack.color }}
                  >
                    {pack.price}
                  </button>
                </div>
              ))}
            </div>

            {/* Rarity rates */}
            <div className="glass-card mt-4" style={{ padding: '12px' }}>
              <p className="text-sm font-bold text-[#8B7355] text-center mb-2">Drop Rates</p>
              <div className="flex justify-around text-xs text-center">
                <div><div className="w-3 h-3 rounded-full bg-gray-400 mx-auto mb-1" /><span className="text-[#8B7355]">59%</span></div>
                <div><div className="w-3 h-3 rounded-full bg-emerald-500 mx-auto mb-1" /><span className="text-[#8B7355]">20%</span></div>
                <div><div className="w-3 h-3 rounded-full bg-blue-500 mx-auto mb-1" /><span className="text-[#8B7355]">15%</span></div>
                <div><div className="w-3 h-3 rounded-full bg-purple-500 mx-auto mb-1" /><span className="text-[#8B7355]">5%</span></div>
                <div><div className="w-3 h-3 rounded-full bg-amber-500 mx-auto mb-1" /><span className="text-[#8B7355]">1%</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== INVENTORY MODAL ===================== */}
      {activeModal === 'inventory' && (
        <div className="popup-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="popup-panel popup-panel-wide">
            <button className="popup-close" onClick={closeModal}>X</button>
            <div className="popup-title popup-title-inventory" style={{ color: '#22cc55' }}>Inventory</div>

            {/* Tabs */}
            <div className="flex justify-center gap-2 mb-4">
              <button
                onClick={() => setInventoryTab('skins')}
                className={`glass-tab ${inventoryTab === 'skins' ? 'glass-tab-active' : ''}`}
                style={{ color: inventoryTab === 'skins' ? '#22cc55' : '#8B7355' }}
              >
                Skins
              </button>
              <button
                onClick={() => setInventoryTab('loadout')}
                className={`glass-tab ${inventoryTab === 'loadout' ? 'glass-tab-active' : ''}`}
                style={{ color: inventoryTab === 'loadout' ? '#22cc55' : '#8B7355' }}
              >
                Loadout
              </button>
            </div>

            {inventoryTab === 'skins' ? (
              /* ---- Skins grid ---- */
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {skins.map(skin => (
                  <div
                    key={skin.id}
                    className={`skin-slot skin-slot-${skin.rarity} ${skin.equipped ? 'skin-slot-equipped' : ''}`}
                    onClick={() => toggleEquip(skin.id)}
                  >
                    <img src={skin.image} alt={skin.name} className="w-14 h-14 mx-auto object-contain mb-2" />
                    <p className="text-sm font-bold text-[#5C4A32] truncate">{skin.name}</p>
                    <p className="text-xs capitalize" style={{
                      color: skin.rarity === 'legendary' ? '#F59E0B' :
                             skin.rarity === 'epic' ? '#8B5CF6' :
                             skin.rarity === 'rare' ? '#3B82F6' :
                             skin.rarity === 'uncommon' ? '#10B981' : '#9CA3AF'
                    }}>
                      {skin.rarity}
                    </p>
                    <p className="text-xs text-[#8B7355] mt-1">{skin.fruitType}</p>
                    {skin.equipped && (
                      <span className="inline-block mt-1 text-xs font-bold text-[#22cc55]"
                        style={{ fontFamily: 'var(--font-guby)', textShadow: '0 0 8px currentColor' }}>
                        Equipped
                      </span>
                    )}
                  </div>
                ))}

                {skins.length === 0 && (
                  <div className="col-span-full text-center py-8">
                    <p className="text-lg font-bold text-[#8B7355]">No skins yet!</p>
                    <p className="text-sm text-[#8B7355] mt-1">Open packs in the Store to collect skins</p>
                  </div>
                )}
              </div>
            ) : (
              /* ---- Loadout view ---- */
              <div>
                <p className="text-sm text-[#8B7355] text-center mb-3">
                  Tap a fruit to change its skin. Mix and match!
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {FRUIT_SEQUENCE.map(fruit => {
                    const equipped = skins.find(s => s.fruitType === fruit && s.equipped);
                    return (
                      <div key={fruit} className="skin-slot text-center">
                        <img
                          src={equipped ? equipped.image : `/assets/fruits/${fruit}.png`}
                          alt={fruit}
                          className="w-12 h-12 mx-auto object-contain mb-1"
                        />
                        <p className="text-xs font-bold text-[#5C4A32] capitalize">{fruit}</p>
                        {equipped ? (
                          <p className="text-xs text-[#22cc55] truncate" style={{ fontFamily: 'var(--font-guby)', textShadow: '0 0 6px currentColor' }}>
                            {equipped.name}
                          </p>
                        ) : (
                          <p className="text-xs text-[#8B7355]">Default</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default HomePage;
