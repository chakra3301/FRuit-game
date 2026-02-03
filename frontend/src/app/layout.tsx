import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/providers/WalletProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fruit Game | Play, Merge, Collect",
  description: "A Web3 Suika-style game on Solana. Drop fruits, merge them to evolve, collect NFT skins, and compete on leaderboards!",
  keywords: ["fruit game", "suika", "solana", "web3", "nft", "gacha", "game"],
  openGraph: {
    title: "Fruit Game",
    description: "Play the ultimate fruit merging game on Solana",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
