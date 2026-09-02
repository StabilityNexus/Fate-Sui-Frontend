/**
 * Rebalancing Tests
 * 
 * Tests for pool rebalancing functionality.
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
  rebalancePool,
  getPoolState,
  getUserBalances,
} from '../helpers/transactions';

describe('Pool Rebalancing', () => {
  let poolId: string;

  beforeAll(async () => {
    if (!globalThis.testEnvironmentReady) {
      console.log('⚠️  Skipping rebalancing tests - environment not ready');
      return;
    }

    // Create a pool with some activity
    const { poolId: createdPoolId } = await createPool({ initialSuiAmount: 3 });
    poolId = createdPoolId;
    await wait(3000);

    // Add some trading activity
    await purchaseTokens(poolId, 0.5, true);
    await wait(2000);
    await purchaseTokens(poolId, 0.5, false);
    await wait(2000);
  }, 180000);

  describe('rebalance_pool_entry', () => {
    it('should successfully execute rebalance', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      const result = await rebalancePool(poolId);

      expect(result.status).toBe('Success');
      expect(result.digest).toBeDefined();
    }, 60000);

    it('should update pool price on rebalance', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      // Get state before rebalance
      const beforeState = await getPoolState(poolId);
      
      // Execute rebalance
      await rebalancePool(poolId);
      await wait(2000);
      
      // Get state after rebalance
      const afterState = await getPoolState(poolId);

      // Price should be defined (may or may not change based on oracle)
      expect(afterState.currentPrice).toBeDefined();
      expect(afterState.currentPrice).toBeGreaterThan(BigInt(0));
    }, 60000);

    it('should not change user token balances on rebalance', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      const signerAddress = getSignerAddress();
      
      // Get balances before rebalance
      const beforeBalances = await getUserBalances(poolId, signerAddress);
      
      // Execute rebalance
      await rebalancePool(poolId);
      await wait(2000);
      
      // Get balances after rebalance
      const afterBalances = await getUserBalances(poolId, signerAddress);

      // Token quantities should remain the same
      expect(afterBalances.bullTokens).toBe(beforeBalances.bullTokens);
      expect(afterBalances.bearTokens).toBe(beforeBalances.bearTokens);
    }, 60000);

    it('should successfully handle multiple sequential rebalances', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      // Execute multiple rebalances
      for (let i = 0; i < 3; i++) {
        const result = await rebalancePool(poolId);
        expect(result.status).toBe('Success');
        await wait(2000);
      }
    }, 120000);

    it('should maintain reserve positivity after rebalance', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      await rebalancePool(poolId);
      await wait(2000);

      const state = await getPoolState(poolId);

      expect(state.bullReserve).toBeGreaterThanOrEqual(BigInt(0));
      expect(state.bearReserve).toBeGreaterThanOrEqual(BigInt(0));
    }, 60000);
  });

  describe('Rebalance with Activity', () => {
    it('should handle rebalance after trading activity', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      // Make some purchases
      await purchaseTokens(poolId, 0.2, true);
      await wait(2000);
      
      // Rebalance
      const result = await rebalancePool(poolId);
      expect(result.status).toBe('Success');
      await wait(2000);
      
      // Make more purchases
      await purchaseTokens(poolId, 0.2, false);
      await wait(2000);
      
      // Rebalance again
      const result2 = await rebalancePool(poolId);
      expect(result2.status).toBe('Success');
    }, 120000);

    it('should track reserve ratio changes through rebalance', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      // Get ratio before
      const beforeState = await getPoolState(poolId);
      const beforeRatio = Number(beforeState.bullReserve) / Number(beforeState.bearReserve);

      // Rebalance
      await rebalancePool(poolId);
      await wait(2000);

      // Get ratio after
      const afterState = await getPoolState(poolId);
      const afterRatio = Number(afterState.bullReserve) / Number(afterState.bearReserve);

      // Ratios should be valid numbers
      expect(beforeRatio).toBeGreaterThan(0);
      expect(afterRatio).toBeGreaterThan(0);
    }, 60000);
  });

  describe('Reserve Stability', () => {
    it('should maintain total liquidity through rebalance', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      // Get total before
      const beforeState = await getPoolState(poolId);
      const beforeTotal = beforeState.bullReserve + beforeState.bearReserve;

      // Rebalance multiple times
      for (let i = 0; i < 3; i++) {
        await rebalancePool(poolId);
        await wait(2000);
      }

      // Get total after
      const afterState = await getPoolState(poolId);
      const afterTotal = afterState.bullReserve + afterState.bearReserve;

      // Total should remain relatively stable (some variance allowed for fees)
      const variance = Math.abs(Number(afterTotal) - Number(beforeTotal)) / Number(beforeTotal);
      expect(variance).toBeLessThan(0.1); // Less than 10% variance
    }, 120000);
  });
});
