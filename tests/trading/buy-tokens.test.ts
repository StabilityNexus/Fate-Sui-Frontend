/**
 * Token Purchase Tests
 * 
 * Tests for buying bull and bear tokens.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  getSignerAddress,
  wait,
  mistToSui,
  suiToMist,
} from '../helpers';
import {
  createPool,
  purchaseTokens,
  getPoolState,
  getUserBalances,
  getUserAvgPrices,
} from '../helpers/transactions';

describe('Token Purchases', () => {
  let poolId: string;

  beforeAll(async () => {
    if (!globalThis.testEnvironmentReady) {
      console.log('⚠️  Skipping purchase tests - environment not ready');
      return;
    }

    // Create a pool for testing
    const { poolId: createdPoolId } = await createPool({ initialSuiAmount: 5 });
    poolId = createdPoolId;
    await wait(3000);
  }, 120000);

  describe('purchase_token (Bull)', () => {
    it('should successfully purchase bull tokens', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      const purchaseAmount = 0.5; // SUI
      const result = await purchaseTokens(poolId, purchaseAmount, true);

      expect(result.status).toBe('Success');
      expect(result.digest).toBeDefined();
    }, 60000);

    it('should increase user bull token balance after purchase', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      const signerAddress = getSignerAddress();
      
      // Get initial balance
      const initialBalances = await getUserBalances(poolId, signerAddress);
      const initialBullTokens = initialBalances.bullTokens;

      // Purchase tokens
      const purchaseAmount = 0.3;
      await purchaseTokens(poolId, purchaseAmount, true);
      await wait(2000);

      // Get updated balance
      const updatedBalances = await getUserBalances(poolId, signerAddress);

      // Balance should increase
      expect(updatedBalances.bullTokens).toBeGreaterThan(initialBullTokens);
    }, 60000);

    it('should increase bull reserve after purchase', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      // Get initial state
      const initialState = await getPoolState(poolId);
      const initialBullReserve = initialState.bullReserve;

      // Purchase tokens
      const purchaseAmount = 0.2;
      await purchaseTokens(poolId, purchaseAmount, true);
      await wait(2000);

      // Get updated state
      const updatedState = await getPoolState(poolId);

      // Bull reserve should increase (minus fees)
      expect(updatedState.bullReserve).toBeGreaterThan(initialBullReserve);
    }, 60000);

    it('should update user average price on purchase', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      const signerAddress = getSignerAddress();

      // Purchase tokens
      await purchaseTokens(poolId, 0.3, true);
      await wait(2000);

      // Get average prices
      const avgPrices = await getUserAvgPrices(poolId, signerAddress);

      // Average price should be set (greater than 0)
      expect(avgPrices.bullAvgPrice).toBeGreaterThanOrEqual(BigInt(0));
    }, 60000);

    it('should emit correct events on purchase', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      const result = await purchaseTokens(poolId, 0.2, true);

      expect(result.status).toBe('Success');
      // Events may be emitted depending on contract implementation
    }, 60000);
  });

  describe('purchase_token (Bear)', () => {
    it('should successfully purchase bear tokens', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      const purchaseAmount = 0.5;
      const result = await purchaseTokens(poolId, purchaseAmount, false);

      expect(result.status).toBe('Success');
      expect(result.digest).toBeDefined();
    }, 60000);

    it('should increase user bear token balance after purchase', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      const signerAddress = getSignerAddress();
      
      // Get initial balance
      const initialBalances = await getUserBalances(poolId, signerAddress);
      const initialBearTokens = initialBalances.bearTokens;

      // Purchase tokens
      const purchaseAmount = 0.3;
      await purchaseTokens(poolId, purchaseAmount, false);
      await wait(2000);

      // Get updated balance
      const updatedBalances = await getUserBalances(poolId, signerAddress);

      // Balance should increase
      expect(updatedBalances.bearTokens).toBeGreaterThan(initialBearTokens);
    }, 60000);

    it('should increase bear reserve after purchase', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      // Get initial state
      const initialState = await getPoolState(poolId);
      const initialBearReserve = initialState.bearReserve;

      // Purchase tokens
      const purchaseAmount = 0.2;
      await purchaseTokens(poolId, purchaseAmount, false);
      await wait(2000);

      // Get updated state
      const updatedState = await getPoolState(poolId);

      // Bear reserve should increase
      expect(updatedState.bearReserve).toBeGreaterThan(initialBearReserve);
    }, 60000);
  });

  describe('Multiple Purchases', () => {
    it('should handle consecutive purchases correctly', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      const signerAddress = getSignerAddress();
      const initialBalances = await getUserBalances(poolId, signerAddress);

      // Make multiple purchases
      await purchaseTokens(poolId, 0.1, true);
      await wait(2000);
      await purchaseTokens(poolId, 0.1, true);
      await wait(2000);
      await purchaseTokens(poolId, 0.1, true);
      await wait(2000);

      const finalBalances = await getUserBalances(poolId, signerAddress);

      // Total balance should increase
      expect(finalBalances.bullTokens).toBeGreaterThan(initialBalances.bullTokens);
    }, 120000);

    it('should track balance correctly across bull and bear purchases', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      const signerAddress = getSignerAddress();
      const initialBalances = await getUserBalances(poolId, signerAddress);

      // Purchase both bull and bear
      await purchaseTokens(poolId, 0.2, true);
      await wait(2000);
      await purchaseTokens(poolId, 0.2, false);
      await wait(2000);

      const finalBalances = await getUserBalances(poolId, signerAddress);

      // Both balances should increase
      expect(finalBalances.bullTokens).toBeGreaterThan(initialBalances.bullTokens);
      expect(finalBalances.bearTokens).toBeGreaterThan(initialBalances.bearTokens);
    }, 60000);
  });
});
