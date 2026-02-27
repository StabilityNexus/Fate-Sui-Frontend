/**
 * Token Redemption Tests
 * 
 * Tests for selling/redeeming bull and bear tokens.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  getSignerAddress,
  wait,
  suiToMist,
} from '../helpers';
import {
  createPool,
  purchaseTokens,
  redeemTokens,
  getPoolState,
  getUserBalances,
} from '../helpers/transactions';

describe('Token Redemption', () => {
  let poolId: string;
  let initialBullBalance: bigint;
  let initialBearBalance: bigint;

  const ensurePoolId = () => {
    if (!globalThis.testEnvironmentReady) return;
    if (!poolId) {
      throw new Error('Test setup failed: poolId is missing');
    }
  };

  beforeAll(async () => {
    if (!globalThis.testEnvironmentReady) {
      console.log('⚠️  Skipping redemption tests - environment not ready');
      return;
    }

    // Create a pool and buy some tokens for testing
    const { poolId: createdPoolId } = await createPool({ initialSuiAmount: 5 });
    poolId = createdPoolId;
    await wait(3000);

    // Buy tokens to test selling
    await purchaseTokens(poolId, 1, true);  // Buy bull
    await wait(2000);
    await purchaseTokens(poolId, 1, false); // Buy bear
    await wait(2000);

    // Get initial balances
    const signerAddress = getSignerAddress();
    const balances = await getUserBalances(poolId, signerAddress);
    initialBullBalance = balances.bullTokens;
    initialBearBalance = balances.bearTokens;
  }, 180000);

  describe('redeem_token (Bull)', () => {
    it('should successfully redeem bull tokens', async () => {
      if (!globalThis.testEnvironmentReady) return;
      ensurePoolId();

      const signerAddress = getSignerAddress();
      const balances = await getUserBalances(poolId, signerAddress);
      
      // Sell 10% of balance
      const sellAmount = balances.bullTokens / BigInt(10);
      
      if (sellAmount > BigInt(0)) {
        const result = await redeemTokens(poolId, sellAmount, true);
        expect(result.status).toBe('Success');
      }
    }, 60000);

    it('should decrease user bull token balance after redemption', async () => {
      if (!globalThis.testEnvironmentReady) return;
      ensurePoolId();

      const signerAddress = getSignerAddress();
      
      // Get current balance
      const beforeBalances = await getUserBalances(poolId, signerAddress);
      const sellAmount = beforeBalances.bullTokens / BigInt(10);
      
      if (sellAmount <= BigInt(0)) return;

      // Redeem tokens
      await redeemTokens(poolId, sellAmount, true);
      await wait(2000);

      // Get updated balance
      const afterBalances = await getUserBalances(poolId, signerAddress);

      // Balance should decrease
      expect(afterBalances.bullTokens).toBeLessThan(beforeBalances.bullTokens);
    }, 60000);

    it('should decrease bull reserve after redemption', async () => {
      if (!globalThis.testEnvironmentReady) return;
      ensurePoolId();

      // Get initial state
      const initialState = await getPoolState(poolId);
      const initialBullReserve = initialState.bullReserve;

      const signerAddress = getSignerAddress();
      const balances = await getUserBalances(poolId, signerAddress);
      const sellAmount = balances.bullTokens / BigInt(10);
      
      if (sellAmount <= BigInt(0)) return;

      // Redeem tokens
      await redeemTokens(poolId, sellAmount, true);
      await wait(2000);

      // Get updated state
      const updatedState = await getPoolState(poolId);

      // Reserve should decrease
      expect(updatedState.bullReserve).toBeLessThan(initialBullReserve);
    }, 60000);

    it('should return SUI to user on redemption', async () => {
      if (!globalThis.testEnvironmentReady) return;
      ensurePoolId();

      const signerAddress = getSignerAddress();
      const balances = await getUserBalances(poolId, signerAddress);
      const sellAmount = balances.bullTokens / BigInt(10);
      
      if (sellAmount <= BigInt(0)) return;

      const result = await redeemTokens(poolId, sellAmount, true);

      expect(result.status).toBe('Success');
      // Check balance changes for SUI return
      const suiChange = result.balanceChanges?.find(
        (change: any) => change.coinType?.includes('sui::SUI')
      );
      expect(suiChange).toBeDefined();
      expect(BigInt(suiChange.amount ?? suiChange.balanceChange ?? 0)).toBeGreaterThan(BigInt(0));
    }, 60000);
  });

  describe('redeem_token (Bear)', () => {
    it('should successfully redeem bear tokens', async () => {
      if (!globalThis.testEnvironmentReady) return;
      ensurePoolId();

      const signerAddress = getSignerAddress();
      const balances = await getUserBalances(poolId, signerAddress);
      
      const sellAmount = balances.bearTokens / BigInt(10);
      
      if (sellAmount > BigInt(0)) {
        const result = await redeemTokens(poolId, sellAmount, false);
        expect(result.status).toBe('Success');
      }
    }, 60000);

    it('should decrease user bear token balance after redemption', async () => {
      if (!globalThis.testEnvironmentReady) return;
      ensurePoolId();

      const signerAddress = getSignerAddress();
      
      const beforeBalances = await getUserBalances(poolId, signerAddress);
      const sellAmount = beforeBalances.bearTokens / BigInt(10);
      
      if (sellAmount <= BigInt(0)) return;

      await redeemTokens(poolId, sellAmount, false);
      await wait(2000);

      const afterBalances = await getUserBalances(poolId, signerAddress);

      expect(afterBalances.bearTokens).toBeLessThan(beforeBalances.bearTokens);
    }, 60000);
  });

  describe('Buy-Sell Cycle', () => {
    it('should maintain balance consistency through buy-sell cycle', async () => {
      if (!globalThis.testEnvironmentReady) return;
      ensurePoolId();

      const signerAddress = getSignerAddress();
      
      // Get initial balance
      const initialBalances = await getUserBalances(poolId, signerAddress);
      
      // Buy tokens
      await purchaseTokens(poolId, 0.3, true);
      await wait(2000);
      
      // Get balance after buy
      const afterBuyBalances = await getUserBalances(poolId, signerAddress);
      const tokensReceived = afterBuyBalances.bullTokens - initialBalances.bullTokens;
      
      expect(tokensReceived).toBeGreaterThan(BigInt(0));
      
      // Sell half of received tokens
      const sellAmount = tokensReceived / BigInt(2);
      if (sellAmount > BigInt(0)) {
        await redeemTokens(poolId, sellAmount, true);
        await wait(2000);
        
        // Get final balance
        const finalBalances = await getUserBalances(poolId, signerAddress);
        
        // Final balance should be: initial + received - sold
        const expectedBalance = initialBalances.bullTokens + tokensReceived - sellAmount;
        expect(finalBalances.bullTokens).toBe(expectedBalance);
      }
    }, 90000);
  });
});
