/**
 * Sui Client Helper
 * 
 * Provides configured Sui client and keypair for testing.
 */

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromBase64 } from '@mysten/sui/utils';
import { SuiClient } from '@mysten/sui/client';

// Protocol addresses for testnet
export const PROTOCOL = {
  PACKAGE_ID: '0x4fd515db93c73b7b977ca98d9b840de824c3fba5a9bd5bdba6be2e242f839c31',
  POOL_REGISTRY: '0x29b556dca902f285f875d4f0b871a6b0540e6cf80308849678790b0f4db249b0',
  USER_REGISTRY: '0xf12da355858be368285244f467d9a2101107483d5bd76ea008b1077f2b9a250e',
  SUPRA_ORACLE_HOLDER: '0x87ef65b543ecb192e89d1e6afeaf38feeb13c3a20c20ce413b29a9cbfbebd570',
} as const;

// Testnet RPC URL
export const TESTNET_URL = 'https://fullnode.testnet.sui.io';

/**
 * Creates a SuiClient instance for testnet
 */
export function createSuiClient(): SuiClient {
  return new SuiClient({ url: TESTNET_URL });
}

/**
 * Creates a keypair from the environment's private key
 * Handles various Sui private key formats (with/without pubkey appended)
 * @throws Error if PRIVATE_KEY is not set
 */
export function createKeypair(): Ed25519Keypair {
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable is not set');
  }
  
  // Decode the base64 key
  const decoded = fromBase64(privateKey);
  
  // Sui private key format: 1 byte flag + 32 bytes secret + (optionally 32 bytes pubkey)
  // We only need the first 32 bytes after the flag
  const secretKey = decoded.slice(1, 33);
  
  if (secretKey.length !== 32) {
    throw new Error(`Invalid secret key length: expected 32 bytes, got ${secretKey.length}`);
  }
  
  return Ed25519Keypair.fromSecretKey(secretKey);
}

/**
 * Checks if the test environment is configured
 */
export function isTestEnvironmentConfigured(): boolean {
  return !!process.env.PRIVATE_KEY;
}

/**
 * Gets the signer address
 */
export function getSignerAddress(): string {
  const keypair = createKeypair();
  return keypair.toSuiAddress();
}

/**
 * Utility to wait for a specified time
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Default gas budget for transactions
 */
export const DEFAULT_GAS_BUDGET = 100_000_000;

/**
 * Converts SUI to MIST (smallest unit)
 */
export function suiToMist(sui: number): bigint {
  return BigInt(Math.floor(sui * 1_000_000_000));
}

/**
 * Converts MIST to SUI
 */
export function mistToSui(mist: bigint): number {
  return Number(mist) / 1_000_000_000;
}

/**
 * Converts a string to a u8 vector for Move calls
 */
export function stringToU8Vector(str: string): number[] {
  return Array.from(Buffer.from(str, 'utf8'));
}

/**
 * Checks if wallet has sufficient SUI balance for testing.
 * Returns balance in MIST if sufficient, null otherwise.
 * @param minSui Minimum SUI required (default: 0.1 SUI)
 */
export async function checkWalletBalance(minSui: number = 0.1): Promise<bigint | null> {
  if (!isTestEnvironmentConfigured()) {
    return null;
  }
  
  try {
    const client = createSuiClient();
    const address = getSignerAddress();
    const balance = await client.getBalance({ owner: address });
    const totalBalance = BigInt(balance.totalBalance);
    const minRequired = suiToMist(minSui);
    
    if (totalBalance < minRequired) {
      return null;
    }
    
    return totalBalance;
  } catch {
    return null;
  }
}

/**
 * Full test environment check including balance
 */
export async function isTestEnvironmentReady(minSui: number = 0.5): Promise<boolean> {
  const balance = await checkWalletBalance(minSui);
  return balance !== null;
}
