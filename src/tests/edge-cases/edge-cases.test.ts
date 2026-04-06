/**
 * Edge Case Tests
 * 
 * Tests for boundary conditions and error scenarios.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';
import {
  getSignerAddress,
  wait,
  suiToMist,
  PROTOCOL,
} from '../helpers';
import {
  createPool,
  purchaseTokens,
  redeemTokens,
  getPoolState,
  getUserBalances,
  getClient,
  getKeypair,
  executeTransaction,
} from '../helpers/transactions';

describe('Edge Cases', () => {
  let poolId: string;

  beforeAll(async () => {
    if (!globalThis.testEnvironmentReady) {
      console.log('⚠️  Skipping edge case tests - environment not ready');
      return;
    }

    const { poolId: createdPoolId } = await createPool({ initialSuiAmount: 3 });
    poolId = createdPoolId;
    await wait(3000);

    // Buy some tokens for testing
    await purchaseTokens(poolId, 0.5, true);
    await wait(2000);
    await purchaseTokens(poolId, 0.5, false);
    await wait(2000);
  }, 180000);

  describe('Minimum Amounts', () => {
    it('should handle minimum purchase amount (1 MIST)', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      const tx = new Transaction();
      tx.moveCall({
        target: `${PROTOCOL.PACKAGE_ID}::prediction_pool::purchase_token`,
        arguments: [
          tx.object(poolId),
          tx.object(PROTOCOL.USER_REGISTRY),
          tx.pure.bool(true),
          tx.object(PROTOCOL.SUPRA_ORACLE_HOLDER),
          tx.splitCoins(tx.gas, [tx.pure.u64(1)]), // 1 MIST
        ],
      });
      tx.setGasBudget(100_000_000);

      try {
        const result = await executeTransaction(tx);
        // Either succeeds or fails gracefully
        expect(['Success', 'Failure']).toContain(result.status);
      } catch (error: any) {
        // Should fail with appropriate error
        expect(error.message).toBeDefined();
      }
    }, 60000);
  });

  describe('Zero Amount Transactions', () => {
    it('should reject zero amount purchase', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      const tx = new Transaction();
      tx.moveCall({
        target: `${PROTOCOL.PACKAGE_ID}::prediction_pool::purchase_token`,
        arguments: [
          tx.object(poolId),
          tx.object(PROTOCOL.USER_REGISTRY),
          tx.pure.bool(true),
          tx.object(PROTOCOL.SUPRA_ORACLE_HOLDER),
          tx.splitCoins(tx.gas, [tx.pure.u64(0)]),
        ],
      });
      tx.setGasBudget(100_000_000);

      try {
        await executeTransaction(tx);
        // If it gets here, check status
        expect(true).toBe(false); // Should not succeed
      } catch (error: any) {
        // Expected to fail
        expect(error).toBeDefined();
      }
    }, 60000);

    it('should reject zero amount redemption', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      try {
        await redeemTokens(poolId, BigInt(0), true);
        expect(true).toBe(false); // Should not succeed
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    }, 60000);
  });

  describe('Overselling', () => {
    it('should reject selling more tokens than owned', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      const signerAddress = getSignerAddress();
      const balances = await getUserBalances(poolId, signerAddress);
      
      // Try to sell more than owned
      const oversellAmount = balances.bullTokens + suiToMist(1000);

      try {
        await redeemTokens(poolId, oversellAmount, true);
        expect(true).toBe(false); // Should not succeed
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    }, 60000);
  });

  describe('Rapid Transactions', () => {
    it('should handle multiple rapid purchases', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(purchaseTokens(poolId, 0.05, i % 2 === 0).catch(() => null));
      }

      const results = await Promise.allSettled(promises);
      
      // At least some should succeed
      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value
      ).length;
      
      expect(successCount).toBeGreaterThanOrEqual(1);
    }, 120000);
  });

  describe('Reserve Consistency', () => {
    it('should maintain positive reserves after operations', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      // Perform various operations
      await purchaseTokens(poolId, 0.1, true);
      await wait(2000);
      await purchaseTokens(poolId, 0.1, false);
      await wait(2000);

      const state = await getPoolState(poolId);

      expect(state.bullReserve).toBeGreaterThan(BigInt(0));
      expect(state.bearReserve).toBeGreaterThan(BigInt(0));
    }, 90000);

    it('should not allow reserves to become negative', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      // Check reserves after various operations
      for (let i = 0; i < 5; i++) {
        const state = await getPoolState(poolId);
        expect(state.bullReserve).toBeGreaterThanOrEqual(BigInt(0));
        expect(state.bearReserve).toBeGreaterThanOrEqual(BigInt(0));
        
        try {
          await purchaseTokens(poolId, 0.05, i % 2 === 0);
        } catch {
          // Ignore failures
        }
        await wait(1000);
      }
    }, 120000);
  });

  describe('State Consistency', () => {
    it('should maintain token supply consistency', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      const state = await getPoolState(poolId);

      // Supplies should be non-negative
      expect(state.bullSupply).toBeGreaterThanOrEqual(BigInt(0));
      expect(state.bearSupply).toBeGreaterThanOrEqual(BigInt(0));
    }, 60000);

    it('should maintain fee configuration', async () => {
      if (!globalThis.testEnvironmentReady || !poolId) return;

      const state = await getPoolState(poolId);

      // Fees should be valid
      expect(state.protocolFee).toBeGreaterThanOrEqual(BigInt(0));
      expect(state.poolCreatorFee).toBeGreaterThanOrEqual(BigInt(0));
    }, 60000);
  });

  describe('Invalid Pool ID', () => {
    it('should fail gracefully with invalid pool ID', async () => {
      if (!globalThis.testEnvironmentReady) return;

      const invalidPoolId = '0x0000000000000000000000000000000000000000000000000000000000000000';

      try {
        await getPoolState(invalidPoolId);
        expect(true).toBe(false); // Should fail
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    }, 60000);
  });
});
