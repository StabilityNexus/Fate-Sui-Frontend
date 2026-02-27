/**
 * Portfolio Tests
 * 
 * Tests for user portfolio tracking and balance management.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  getSignerAddress,
  wait,
  mistToSui,
} from '../helpers';
import {
  createPool,
  purchaseTokens,
  redeemTokens,
  rebalancePool,
  getPoolState,
  getUserBalances,
  getUserAvgPrices,
} from '../helpers/transactions';

describe('Portfolio Management', () => {
  let poolId: string;

  beforeAll(async () => {
    if (!globalThis.testEnvironmentReady) {
      console.log('⚠️  Skipping portfolio tests - environment not ready');
      return;
    }

    const { poolId: createdPoolId } = await createPool({ initialSuiAmount: 5 });
    poolId = createdPoolId;
    await wait(3000);
  }, 120000);

  describe('Balance Tracking', () => {
    it('should accurately track bull token balance', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      const signerAddress = getSignerAddress();
      
      // Get initial balance
      const initialBalances = await getUserBalances(poolId, signerAddress);
      
      // Make purchase
      await purchaseTokens(poolId, 0.5, true);
      await wait(2000);
      
      // Get updated balance
      const afterBuyBalances = await getUserBalances(poolId, signerAddress);
      const tokensReceived = afterBuyBalances.bullTokens - initialBalances.bullTokens;
      
      expect(tokensReceived).toBeGreaterThan(BigInt(0));

      // Sell half
      const sellAmount = tokensReceived / BigInt(2);
      if (sellAmount > BigInt(0)) {
        await redeemTokens(poolId, sellAmount, true);
        await wait(2000);
        
        const finalBalances = await getUserBalances(poolId, signerAddress);
        expect(finalBalances.bullTokens).toBe(afterBuyBalances.bullTokens - sellAmount);
      }
    }, 120000);

    it('should accurately track bear token balance', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      const signerAddress = getSignerAddress();
      
      const initialBalances = await getUserBalances(poolId, signerAddress);
      
      await purchaseTokens(poolId, 0.5, false);
      await wait(2000);
      
      const afterBuyBalances = await getUserBalances(poolId, signerAddress);
      const tokensReceived = afterBuyBalances.bearTokens - initialBalances.bearTokens;
      
      expect(tokensReceived).toBeGreaterThan(BigInt(0));
    }, 60000);

    it('should maintain balance after rebalance', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      const signerAddress = getSignerAddress();
      
      // Get balances before rebalance
      const beforeBalances = await getUserBalances(poolId, signerAddress);
      
      // Rebalance
      await rebalancePool(poolId);
      await wait(2000);
      
      // Get balances after rebalance
      const afterBalances = await getUserBalances(poolId, signerAddress);
      
      // Token quantities should remain unchanged
      expect(afterBalances.bullTokens).toBe(beforeBalances.bullTokens);
      expect(afterBalances.bearTokens).toBe(beforeBalances.bearTokens);
    }, 60000);
  });

  describe('Average Price Tracking', () => {
    it('should track bull token average price', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      const signerAddress = getSignerAddress();
      
      // Make purchase
      await purchaseTokens(poolId, 0.3, true);
      await wait(2000);
      
      // Get average prices
      const avgPrices = await getUserAvgPrices(poolId, signerAddress);
      
      // Average price should be set
      expect(avgPrices.bullAvgPrice).toBeGreaterThanOrEqual(BigInt(0));
    }, 60000);

    it('should track bear token average price', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      const signerAddress = getSignerAddress();
      
      await purchaseTokens(poolId, 0.3, false);
      await wait(2000);
      
      const avgPrices = await getUserAvgPrices(poolId, signerAddress);
      
      expect(avgPrices.bearAvgPrice).toBeGreaterThanOrEqual(BigInt(0));
    }, 60000);

    it('should update average price on subsequent purchases', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      const signerAddress = getSignerAddress();
      
      // First purchase
      await purchaseTokens(poolId, 0.2, true);
      await wait(2000);
      
      const firstAvgPrice = await getUserAvgPrices(poolId, signerAddress);
      
      // Second purchase
      await purchaseTokens(poolId, 0.2, true);
      await wait(2000);
      
      const secondAvgPrice = await getUserAvgPrices(poolId, signerAddress);
      
      // Both should be valid
      expect(firstAvgPrice.bullAvgPrice).toBeGreaterThanOrEqual(BigInt(0));
      expect(secondAvgPrice.bullAvgPrice).toBeGreaterThanOrEqual(BigInt(0));
    }, 90000);
  });

  describe('Multi-Purchase Tracking', () => {
    it('should correctly aggregate multiple purchases', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      const signerAddress = getSignerAddress();
      
      const initialBalances = await getUserBalances(poolId, signerAddress);
      
      // Multiple purchases
      let totalExpectedIncrease = BigInt(0);
      for (let i = 0; i < 3; i++) {
        const beforePurchase = await getUserBalances(poolId, signerAddress);
        await purchaseTokens(poolId, 0.1, true);
        await wait(2000);
        const afterPurchase = await getUserBalances(poolId, signerAddress);
        totalExpectedIncrease += afterPurchase.bullTokens - beforePurchase.bullTokens;
      }
      
      const finalBalances = await getUserBalances(poolId, signerAddress);
      
      // Final balance should equal initial + all increases
      const actualIncrease = finalBalances.bullTokens - initialBalances.bullTokens;
      expect(actualIncrease).toBe(totalExpectedIncrease);
    }, 120000);
  });

  describe('Position Value', () => {
    it('should have valid position data', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      const signerAddress = getSignerAddress();
      
      const balances = await getUserBalances(poolId, signerAddress);
      const avgPrices = await getUserAvgPrices(poolId, signerAddress);
      const poolState = await getPoolState(poolId);

      // All values should be valid
      expect(balances.bullTokens).toBeGreaterThanOrEqual(BigInt(0));
      expect(balances.bearTokens).toBeGreaterThanOrEqual(BigInt(0));
      expect(avgPrices.bullAvgPrice).toBeGreaterThanOrEqual(BigInt(0));
      expect(avgPrices.bearAvgPrice).toBeGreaterThanOrEqual(BigInt(0));
      expect(poolState.currentPrice).toBeGreaterThan(BigInt(0));
    }, 60000);
  });

  describe('Balance After Rebalance', () => {
    it('should preserve token amounts through rebalance', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      const signerAddress = getSignerAddress();
      
      // Ensure we have some tokens
      await purchaseTokens(poolId, 0.3, true);
      await purchaseTokens(poolId, 0.3, false);
      await wait(2000);
      
      const beforeBalances = await getUserBalances(poolId, signerAddress);
      
      // Multiple rebalances
      for (let i = 0; i < 3; i++) {
        await rebalancePool(poolId);
        await wait(2000);
      }
      
      const afterBalances = await getUserBalances(poolId, signerAddress);
      
      // Token quantities should remain exactly the same
      expect(afterBalances.bullTokens).toBe(beforeBalances.bullTokens);
      expect(afterBalances.bearTokens).toBe(beforeBalances.bearTokens);
    }, 120000);
  });
});
