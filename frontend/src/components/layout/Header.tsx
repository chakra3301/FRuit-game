'use client';

import { FC } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const Header: FC = () => {
  const { publicKey } = useWallet();

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-0 pt-0">
      <div className="header-bubbly">
        {/* Sparkle particles */}
        <div className="header-sparkles" aria-hidden="true">
          {[...Array(9)].map((_, i) => (
            <span key={i} className="header-sparkle" />
          ))}
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="text-3xl">🍎</div>
            <span className="text-2xl font-bold bubble-text gradient-text group-hover:scale-105 transition-transform">
              FRUIT GAME
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLink href="/game">Play</NavLink>
            <NavLink href="/leaderboard">Leaderboard</NavLink>
            <NavLink href="/gacha">Gacha</NavLink>
            {publicKey && <NavLink href="/profile">Profile</NavLink>}
          </nav>

          {/* Wallet Button */}
          <div className="flex items-center gap-4">
            <WalletMultiButton className="!bg-[var(--primary)] !rounded-xl !py-2 !px-4 !font-bold !text-white hover:!bg-[var(--primary-dark)] !transition-colors !shadow-md" />
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="relative z-10 md:hidden flex items-center justify-center gap-4 pb-3 pt-2 border-t border-white/30 mx-4">
          <MobileNavLink href="/game">🎮 Play</MobileNavLink>
          <MobileNavLink href="/leaderboard">🏆 Ranks</MobileNavLink>
          <MobileNavLink href="/gacha">🎁 Gacha</MobileNavLink>
          {publicKey && <MobileNavLink href="/profile">👤 Profile</MobileNavLink>}
        </nav>
      </div>
    </header>
  );
};

const NavLink: FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => {
  return (
    <Link
      href={href}
      className="text-lg font-semibold text-[var(--foreground)] hover:text-[var(--primary-dark)] transition-colors relative group"
    >
      {children}
      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[var(--primary)] group-hover:w-full transition-all" />
    </Link>
  );
};

const MobileNavLink: FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => {
  return (
    <Link
      href={href}
      className="text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary-dark)] transition-colors px-3 py-1 rounded-lg hover:bg-[var(--primary)]/10"
    >
      {children}
    </Link>
  );
};

export default Header;
