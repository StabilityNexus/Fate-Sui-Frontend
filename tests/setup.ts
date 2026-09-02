/**
 * Test Setup
 * 
 * Configures the test environment with necessary setup and global utilities.
 */

import 'dotenv/config';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromBase64 } from '@mysten/sui/utils';

// Global test state
declare global {
  // eslint-disable-next-line no-var
  var testPoolId: string | undefined;
  // eslint-disable-next-line no-var
  var testEnvironmentReady: boolean;
  // eslint-disable-next-line no-var
  var walletBalance: bigint;
}

// Initialize globals
globalThis.testEnvironmentReady = false;
globalThis.walletBalance = BigInt(0);

beforeAll(async () => {
  // Verify environment is configured
  if (!process.env.PRIVATE_KEY) {
    console.warn('\n⚠️  Warning: PRIVATE_KEY not set in .env - tests will be skipped\n');
    return;
  }

  try {
    // Parse private key
    const decoded = fromBase64(process.env.PRIVATE_KEY);
    const secretKey = decoded.slice(1, 33);
    const keypair = Ed25519Keypair.fromSecretKey(secretKey);
    const address = keypair.toSuiAddress();
    
    // Check wallet balance
    const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io' });
    const balance = await client.getBalance({ owner: address });
    globalThis.walletBalance = BigInt(balance.totalBalance);
    
    const suiBalance = Number(globalThis.walletBalance) / 1_000_000_000;
    console.log(`\n💰 Wallet Balance: ${suiBalance.toFixed(4)} SUI`);
    
    if (suiBalance < 0.5) {
      console.warn(`⚠️  Insufficient balance for testing. Need at least 0.5 SUI.`);
      console.warn(`   Get testnet SUI from: https://faucet.testnet.sui.io/`);
      globalThis.testEnvironmentReady = false;
    } else {
      globalThis.testEnvironmentReady = true;
      console.log(`✅ Test environment ready\n`);
    }
  } catch (error) {
    console.error('❌ Failed to initialize test environment:', error);
    globalThis.testEnvironmentReady = false;
  }
});

afterAll(() => {
  // Cleanup after all tests
  console.log('\n✅ Test suite completed\n');
});

// Add delay between tests to avoid rate limiting
afterEach(async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));
});
