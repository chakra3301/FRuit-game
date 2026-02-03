'use client';

import { FC, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Header from '@/components/layout/Header';
import Link from 'next/link';

type SkinRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
type FruitType = 'cherry' | 'strawberry' | 'grape' | 'persimmon' | 'apple' | 'pear' | 'peach' | 'pineapple' | 'melon' | 'watermelon';

interface OwnedSkin {
  id: string;
  skinId: string;
  name: string;
  fruitType: FruitType;
  rarity: SkinRarity;
  imageUrl: string;
  packName: string;
  acquiredAt: string;
  isEquipped: boolean;
}

interface UserProfile {
  walletAddress: string;
  totalPoints: number;
  gamesPlayed: number;
  highScore: number;
  allTimeRank: number;
}

interface ClaimableReward {
  id: string;
  type: 'pack' | 'tokens';
  amount?: number;
  packId?: string;
  reason: string;
}

const RARITY_COLORS: Record<SkinRarity, string> = {
  common: 'var(--rarity-common)',
  uncommon: 'var(--rarity-uncommon)',
  rare: 'var(--rarity-rare)',
  epic: 'var(--rarity-epic)',
  legendary: 'var(--rarity-legendary)',
};

const FRUIT_EMOJIS: Record<FruitType, string> = {
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

const FRUIT_ORDER: FruitType[] = [
  'cherry', 'strawberry', 'grape', 'persimmon', 'apple',
  'pear', 'peach', 'pineapple', 'melon', 'watermelon'
];

const ProfilePage: FC = () => {
  const { publicKey, connected } = useWallet();
  const [activeTab, setActiveTab] = useState<'gallery' | 'loadout' | 'rewards'>('gallery');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ownedSkins, setOwnedSkins] = useState<OwnedSkin[]>([]);
  const [rewards, setRewards] = useState<ClaimableReward[]>([]);
  const [loadout, setLoadout] = useState<Record<FruitType, string | null>>({
    cherry: null, strawberry: null, grape: null, persimmon: null, apple: null,
    pear: null, peach: null, pineapple: null, melon: null, watermelon: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch profile data
  useEffect(() => {
    if (!connected || !publicKey) {
      setIsLoading(false);
      return;
    }

    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        // TODO: Replace with actual API calls
        // const profileRes = await fetch(`/api/user/profile/${publicKey.toBase58()}`);
        // const skinsRes = await fetch(`/api/skin/owned/${publicKey.toBase58()}`);
        // const rewardsRes = await fetch(`/api/reward/pending/${publicKey.toBase58()}`);

        // Mock data
        setProfile({
          walletAddress: publicKey.toBase58(),
          totalPoints: 12450,
          gamesPlayed: 47,
          highScore: 3280,
          allTimeRank: 156,
        });

        const mockSkins: OwnedSkin[] = [
          { id: '1', skinId: 's1', name: 'Pixel Cherry', fruitType: 'cherry', rarity: 'common', imageUrl: '', packName: 'Starter Pack', acquiredAt: '2024-01-15', isEquipped: true },
          { id: '2', skinId: 's2', name: 'Golden Apple', fruitType: 'apple', rarity: 'rare', imageUrl: '', packName: 'Starter Pack', acquiredAt: '2024-01-16', isEquipped: false },
          { id: '3', skinId: 's3', name: 'Space Grape', fruitType: 'grape', rarity: 'epic', imageUrl: '', packName: 'Space Pack', acquiredAt: '2024-01-17', isEquipped: true },
          { id: '4', skinId: 's4', name: 'Rainbow Watermelon', fruitType: 'watermelon', rarity: 'legendary', imageUrl: '', packName: 'Starter Pack', acquiredAt: '2024-01-18', isEquipped: false },
        ];
        setOwnedSkins(mockSkins);

        // Set loadout from equipped skins
        const newLoadout = { ...loadout };
        mockSkins.forEach(skin => {
          if (skin.isEquipped) {
            newLoadout[skin.fruitType] = skin.skinId;
          }
        });
        setLoadout(newLoadout);

        setRewards([
          { id: 'r1', type: 'pack', packId: 'pack1', reason: 'Weekly Leaderboard #5' },
        ]);
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [connected, publicKey]);

  const handleEquipSkin = (skin: OwnedSkin) => {
    setLoadout(prev => ({
      ...prev,
      [skin.fruitType]: prev[skin.fruitType] === skin.skinId ? null : skin.skinId,
    }));
  };

  const handleSaveLoadout = async () => {
    setIsSaving(true);
    try {
      // TODO: Call API to save loadout
      // await fetch('/api/skin/loadout', {
      //   method: 'POST',
      //   body: JSON.stringify({ walletAddress: publicKey?.toBase58(), loadout })
      // });

      await new Promise(resolve => setTimeout(resolve, 500));
      alert('Loadout saved successfully!');
    } catch (error) {
      console.error('Failed to save loadout:', error);
      alert('Failed to save loadout');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClaimReward = async (reward: ClaimableReward) => {
    try {
      // TODO: Call API to claim reward
      // await fetch('/api/reward/claim', { ... });

      await new Promise(resolve => setTimeout(resolve, 500));
      setRewards(prev => prev.filter(r => r.id !== reward.id));
      alert(`Claimed: ${reward.reason}`);
    } catch (error) {
      console.error('Failed to claim reward:', error);
    }
  };

  const getSkinsForFruit = (fruitType: FruitType) => {
    return ownedSkins.filter(skin => skin.fruitType === fruitType);
  };

  if (!connected) {
    return (
      <main className="min-h-screen bg-[var(--background)] pattern-bg">
        <Header />
        <section className="pt-28 pb-16 px-4">
          <div className="max-w-lg mx-auto text-center">
            <div className="card-3d p-8">
              <h1 className="text-3xl font-bold text-[var(--primary)] mb-6">
                Connect Wallet
              </h1>
              <p className="text-[var(--foreground)]/70 mb-6">
                Connect your wallet to view your profile, skins, and rewards.
              </p>
              <WalletMultiButton className="!bg-[var(--primary)] !rounded-xl !py-4 !px-8 !font-bold !text-white !text-lg hover:!bg-[var(--primary-dark)] !transition-colors" />
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] pattern-bg">
      <Header />

      <section className="pt-28 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="spinner w-12 h-12 mx-auto mb-4" />
              <p className="text-[var(--foreground)]/60">Loading profile...</p>
            </div>
          ) : (
            <>
              {/* Profile header */}
              <div className="card-3d p-6 mb-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent-pink)] flex items-center justify-center text-4xl">
                      👤
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-[var(--primary)]">
                        {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
                      </h1>
                      <p className="text-sm text-[var(--foreground)]/60">
                        Rank #{profile?.allTimeRank || '--'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-6">
                    <StatBox label="Total Points" value={profile?.totalPoints.toLocaleString() || '--'} />
                    <StatBox label="Games Played" value={profile?.gamesPlayed.toString() || '--'} />
                    <StatBox label="High Score" value={profile?.highScore.toLocaleString() || '--'} />
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-6">
                <TabButton
                  active={activeTab === 'gallery'}
                  onClick={() => setActiveTab('gallery')}
                >
                  🎨 Gallery ({ownedSkins.length})
                </TabButton>
                <TabButton
                  active={activeTab === 'loadout'}
                  onClick={() => setActiveTab('loadout')}
                >
                  ⚙️ Loadout
                </TabButton>
                <TabButton
                  active={activeTab === 'rewards'}
                  onClick={() => setActiveTab('rewards')}
                >
                  🎁 Rewards {rewards.length > 0 && `(${rewards.length})`}
                </TabButton>
              </div>

              {/* Tab content */}
              {activeTab === 'gallery' && (
                <div className="card-3d p-6">
                  {ownedSkins.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-4xl mb-4">🖼️</p>
                      <p className="text-[var(--foreground)]/70 mb-4">No skins yet!</p>
                      <Link href="/gacha" className="btn-3d btn-purple py-2 px-6 inline-block">
                        Open Packs
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {ownedSkins.map(skin => (
                        <SkinCard
                          key={skin.id}
                          skin={skin}
                          isEquipped={loadout[skin.fruitType] === skin.skinId}
                          onEquip={() => handleEquipSkin(skin)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'loadout' && (
                <div className="card-3d p-6">
                  <p className="text-[var(--foreground)]/70 mb-6">
                    Select which skins to use for each fruit in the game.
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    {FRUIT_ORDER.map(fruitType => {
                      const availableSkins = getSkinsForFruit(fruitType);
                      const equippedSkin = availableSkins.find(s => s.skinId === loadout[fruitType]);

                      return (
                        <div key={fruitType} className="text-center">
                          <div
                            className="aspect-square rounded-xl mb-2 flex items-center justify-center text-4xl transition-all"
                            style={{
                              backgroundColor: equippedSkin
                                ? `${RARITY_COLORS[equippedSkin.rarity]}30`
                                : 'var(--card-bg)',
                              borderWidth: 3,
                              borderColor: equippedSkin
                                ? RARITY_COLORS[equippedSkin.rarity]
                                : 'var(--primary)',
                            }}
                          >
                            {FRUIT_EMOJIS[fruitType]}
                          </div>
                          <p className="text-xs capitalize mb-1">{fruitType}</p>
                          <p className="text-xs text-[var(--foreground)]/60">
                            {equippedSkin ? equippedSkin.name : 'Default'}
                          </p>
                          {availableSkins.length > 0 && (
                            <p className="text-xs text-[var(--primary)]">
                              {availableSkins.length} skin{availableSkins.length > 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={handleSaveLoadout}
                    disabled={isSaving}
                    className="btn-3d btn-green py-3 px-8"
                  >
                    {isSaving ? 'Saving...' : 'Save Loadout'}
                  </button>
                </div>
              )}

              {activeTab === 'rewards' && (
                <div className="card-3d p-6">
                  {rewards.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-4xl mb-4">📭</p>
                      <p className="text-[var(--foreground)]/70">No pending rewards</p>
                      <p className="text-sm text-[var(--foreground)]/50 mt-2">
                        Play games and climb the weekly leaderboard to earn rewards!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {rewards.map(reward => (
                        <div
                          key={reward.id}
                          className="flex items-center justify-between p-4 bg-[var(--accent-green)]/10 rounded-xl border-2 border-[var(--accent-green)]"
                        >
                          <div>
                            <p className="font-bold text-[var(--primary)]">
                              {reward.type === 'pack' ? '🎁 Free Pack' : `💰 ${reward.amount?.toLocaleString()} FRUIT`}
                            </p>
                            <p className="text-sm text-[var(--foreground)]/60">{reward.reason}</p>
                          </div>
                          <button
                            onClick={() => handleClaimReward(reward)}
                            className="btn-3d btn-green py-2 px-6"
                          >
                            Claim
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
};

const StatBox: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="text-center">
    <p className="text-2xl font-bold text-[var(--primary)]">{value}</p>
    <p className="text-xs text-[var(--foreground)]/60">{label}</p>
  </div>
);

const TabButton: FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({
  active,
  onClick,
  children,
}) => (
  <button
    onClick={onClick}
    className={`btn-3d py-2 px-6 text-sm ${active ? 'btn-purple' : 'bg-white/50'}`}
  >
    {children}
  </button>
);

const SkinCard: FC<{
  skin: OwnedSkin;
  isEquipped: boolean;
  onEquip: () => void;
}> = ({ skin, isEquipped, onEquip }) => (
  <div
    className={`rounded-xl p-4 transition-all cursor-pointer hover:scale-105 ${
      isEquipped ? 'ring-2 ring-[var(--accent-green)]' : ''
    }`}
    style={{
      backgroundColor: `${RARITY_COLORS[skin.rarity]}20`,
      borderWidth: 3,
      borderColor: RARITY_COLORS[skin.rarity],
    }}
    onClick={onEquip}
  >
    <div className="aspect-square flex items-center justify-center text-5xl mb-2">
      {FRUIT_EMOJIS[skin.fruitType]}
    </div>
    <h4 className="font-bold text-sm truncate">{skin.name}</h4>
    <p
      className="text-xs capitalize font-semibold"
      style={{ color: RARITY_COLORS[skin.rarity] }}
    >
      {skin.rarity}
    </p>
    <p className="text-xs text-[var(--foreground)]/50">{skin.packName}</p>
    {isEquipped && (
      <p className="text-xs text-[var(--accent-green)] font-bold mt-1">✓ Equipped</p>
    )}
  </div>
);

export default ProfilePage;
