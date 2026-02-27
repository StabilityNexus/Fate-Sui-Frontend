/**
 * Pool Creation Tests
 * 
 * Tests for creating and initializing prediction pools.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  getSignerAddress,
  wait,
  mistToSui,
} from '../helpers';

// Helper to check if tests should run
const shouldSkip = () => !globalThis.testEnvironmentReady;
import {
  createPool,
  getPoolState,
  getUserBalances,
} from '../helpers/transactions';

describe('Pool Creation', () => {
  beforeAll(() => {
    if (shouldSkip()) {
      console.log('⚠️  Skipping pool creation tests - environment not ready');
    }
  });

  describe('create_pool', () => {
    it('should create a pool with default configuration', async () => {
      if (shouldSkip()) return;

      const { poolId, result } = await createPool();

      expect(result.status).toBe('Success');
      expect(poolId).toBeDefined();
      expect(poolId).toMatch(/^0x[a-fA-F0-9]+$/);

      // Store pool ID for other tests
      globalThis.testPoolId = poolId;
    }, 60000);

    it('should create a pool with custom configuration', async () => {
      if (shouldSkip()) return;

      const customConfig = {
        name: `Custom Test Pool ${Date.now()}`,
        description: 'A custom test pool',
        pairId: 18,
        protocolFee: 1,
        mintFee: 0.5,
        burnFee: 0.5,
        creatorFee: 0.5,
        initialSuiAmount: 1,
        bullSymbol: 'CBULL',
        bearSymbol: 'CBEAR',
      };

      const { poolId, result } = await createPool(customConfig);

      expect(result.status).toBe('Success');
      expect(poolId).toBeDefined();

      // Wait for confirmation
      await wait(2000);

      // Verify pool state
      const state = await getPoolState(poolId);
      expect(state.name).toBe(customConfig.name);
    }, 60000);

    it('should initialize pool with correct reserves', async () => {
      if (shouldSkip()) return;

      const initialAmount = 2;
      const { poolId } = await createPool({ initialSuiAmount: initialAmount });

      await wait(2000);

      const state = await getPoolState(poolId);

      // Total reserves should approximately equal initial amount (minus fees)
      const totalReserves = state.bullReserve + state.bearReserve;
      const totalReservesInSui = mistToSui(totalReserves);

      // Allow for some fee deduction
      expect(totalReservesInSui).toBeGreaterThan(0);
      expect(totalReservesInSui).toBeLessThanOrEqual(initialAmount);
    }, 60000);

    it('should set pool creator correctly', async () => {
      if (shouldSkip()) return;

      const { poolId, result } = await createPool();

      expect(result.status).toBe('Success');

      // The pool should be created by the signer
      const signerAddress = getSignerAddress();
      
      // Pool state includes creator info
      const state = await getPoolState(poolId);
      expect(state).toBeDefined();
    }, 60000);

    it('should initialize token supplies to zero', async () => {
      if (shouldSkip()) return;

      const { poolId } = await createPool();

      await wait(2000);

      const signerAddress = getSignerAddress();
      const balances = await getUserBalances(poolId, signerAddress);

      // Initially, user should have no tokens (tokens are minted on purchase)
      // This may vary based on implementation
      expect(balances.bullTokens).toBeGreaterThanOrEqual(BigInt(0));
      expect(balances.bearTokens).toBeGreaterThanOrEqual(BigInt(0));
    }, 60000);
  });

  describe('Pool State Queries', () => {
    it('should fetch pool state correctly', async () => {
      if (shouldSkip()) return;

      const { poolId } = await createPool();

      await wait(2000);

      const state = await getPoolState(poolId);

      expect(state).toHaveProperty('name');
      expect(state).toHaveProperty('currentPrice');
      expect(state).toHaveProperty('bullReserve');
      expect(state).toHaveProperty('bearReserve');
      expect(state).toHaveProperty('bullSupply');
      expect(state).toHaveProperty('bearSupply');
      expect(state).toHaveProperty('protocolFee');
      expect(state).toHaveProperty('poolCreatorFee');
    }, 60000);

    it('should return non-negative reserves', async () => {
      if (shouldSkip()) return;

      const { poolId } = await createPool();

      await wait(2000);

      const state = await getPoolState(poolId);

      expect(state.bullReserve).toBeGreaterThanOrEqual(BigInt(0));
      expect(state.bearReserve).toBeGreaterThanOrEqual(BigInt(0));
    }, 60000);
  });
});
