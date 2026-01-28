/**
 * Solana utility functions for wallet verification and transaction handling
 *
 * NOTE: This file contains placeholder implementations.
 * When the FRUIT token is live, update with actual token mint address and RPC endpoint.
 */

import { createHash } from 'crypto';

// Configuration - UPDATE THESE WHEN TOKEN IS LIVE
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const FRUIT_TOKEN_MINT = process.env.FRUIT_TOKEN_MINT || 'PLACEHOLDER_TOKEN_MINT_ADDRESS';
const TREASURY_WALLET = process.env.TREASURY_WALLET || 'PLACEHOLDER_TREASURY_WALLET';

/**
 * Verify a wallet signature
 * Used to prove ownership of a wallet address
 */
export async function verifySignature(
  walletAddress: string,
  message: string,
  signature: string
): Promise<boolean> {
  try {
    // In production, use @solana/web3.js to verify ed25519 signatures
    // For now, return true for development

    // TODO: Implement actual signature verification
    // const publicKey = new PublicKey(walletAddress);
    // const signatureBuffer = Buffer.from(signature, 'base64');
    // const messageBuffer = Buffer.from(message);
    // return nacl.sign.detached.verify(messageBuffer, signatureBuffer, publicKey.toBytes());

    console.log(`[DEV] Verifying signature for wallet: ${walletAddress}`);

    // Development mode - accept any signature
    if (process.env.NODE_ENV === 'development') {
      return true;
    }

    return true; // Replace with actual verification
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Verify a token transfer transaction
 * Checks that the correct amount was sent to the treasury
 */
export async function verifyTransaction(
  txSignature: string,
  fromWallet: string,
  expectedAmount: number
): Promise<boolean> {
  try {
    // In production, fetch transaction from chain and verify:
    // 1. Transaction is confirmed
    // 2. Sender matches fromWallet
    // 3. Recipient is treasury wallet
    // 4. Amount matches expectedAmount
    // 5. Token mint matches FRUIT_TOKEN_MINT

    console.log(`[DEV] Verifying transaction: ${txSignature}`);
    console.log(`  From: ${fromWallet}`);
    console.log(`  Amount: ${expectedAmount} FRUIT`);

    // TODO: Implement actual transaction verification
    // const connection = new Connection(SOLANA_RPC_URL);
    // const tx = await connection.getTransaction(txSignature);
    // ... verify transaction details

    // Development mode - accept any transaction
    if (process.env.NODE_ENV === 'development') {
      return true;
    }

    return true; // Replace with actual verification
  } catch (error) {
    console.error('Transaction verification failed:', error);
    return false;
  }
}

/**
 * Generate a nonce for wallet signature
 */
export function generateNonce(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2);
  return `fruit-game-${timestamp}-${random}`;
}

/**
 * Create the message for wallet signing
 */
export function createSignMessage(walletAddress: string, nonce: string): string {
  return `Sign this message to verify your wallet for Fruit Game.\n\nWallet: ${walletAddress}\nNonce: ${nonce}`;
}

/**
 * Hash a nonce to check against used nonces
 */
export function hashNonce(nonce: string): string {
  return createHash('sha256').update(nonce).digest('hex');
}

/**
 * Get treasury wallet address
 */
export function getTreasuryWallet(): string {
  return TREASURY_WALLET;
}

/**
 * Get fruit token mint address
 */
export function getFruitTokenMint(): string {
  return FRUIT_TOKEN_MINT;
}

/**
 * Format token amount for display (adds decimals)
 */
export function formatTokenAmount(amount: number, decimals: number = 9): string {
  return (amount / Math.pow(10, decimals)).toLocaleString();
}
