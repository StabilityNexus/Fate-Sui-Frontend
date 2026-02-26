/**
 * Transaction Helpers
 * 
 * Provides reusable transaction builders for testing contract interactions.
 */

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import {
  createSuiClient,
  createKeypair,
  PROTOCOL,
  DEFAULT_GAS_BUDGET,
  suiToMist,
  stringToU8Vector,
} from './sui-client';

export interface PoolConfig {
  name: string;
  description: string;
  pairId: number;
  assetAddress: string;
  protocolFee: number;
  mintFee: number;
  burnFee: number;
  creatorFee: number;
  initialSuiAmount: number;
  bullSymbol: string;
  bearSymbol: string;
}

export interface TransactionResult {
  digest: string;
  status: string;
  effects: any;
  events: any[];
  balanceChanges: any[];
  objectChanges: any[];
}

export interface PoolState {
  name: string;
  description: string;
  currentPrice: bigint;
  bullReserve: bigint;
  bearReserve: bigint;
  bullSupply: bigint;
  bearSupply: bigint;
  protocolFee: bigint;
  poolCreatorFee: bigint;
  mintFee?: bigint;
  burnFee?: bigint;
}

export interface UserBalances {
  bullTokens: bigint;
  bearTokens: bigint;
}

export interface UserAvgPrices {
  bullAvgPrice: bigint;
  bearAvgPrice: bigint;
}

// Singleton instances
let client: SuiClient | null = null;
let keypair: Ed25519Keypair | null = null;

/**
 * Gets or creates the Sui client
 */
export function getClient(): SuiClient {
  if (!client) {
    client = createSuiClient();
  }
  return client;
}

/**
 * Gets or creates the keypair
 */
export function getKeypair(): Ed25519Keypair {
  if (!keypair) {
    keypair = createKeypair();
  }
  return keypair;
}

/**
 * Executes a transaction and returns parsed results
 */
export async function executeTransaction(tx: Transaction): Promise<TransactionResult> {
  const suiClient = getClient();
  const signer = getKeypair();
  
  const result = await suiClient.signAndExecuteTransaction({
    signer,
    transaction: tx,
    options: {
      showBalanceChanges: true,
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
    },
  });
  
  return {
    digest: result.digest,
    status: result.effects?.status?.status || 'unknown',
    effects: result.effects,
    events: result.events || [],
    balanceChanges: result.balanceChanges || [],
    objectChanges: result.objectChanges || [],
  };
}

/**
 * Creates a new prediction pool
 */
export async function createPool(config: Partial<PoolConfig> = {}): Promise<{ poolId: string; result: TransactionResult }> {
  const signer = getKeypair();
  const signerAddress = signer.toSuiAddress();
  
  const poolConfig: PoolConfig = {
    name: config.name || `Test Pool ${Date.now()}`,
    description: config.description || 'Automated test pool',
    pairId: config.pairId ?? 18,
    assetAddress: config.assetAddress || '0x0000000000000000000000000000000000000000000000000000000000000000',
    protocolFee: config.protocolFee ?? 0.5,
    mintFee: config.mintFee ?? 0.1,
    burnFee: config.burnFee ?? 0.1,
    creatorFee: config.creatorFee ?? 0.2,
    initialSuiAmount: config.initialSuiAmount ?? 2,
    bullSymbol: config.bullSymbol || 'TBULL',
    bearSymbol: config.bearSymbol || 'TBEAR',
  };
  
  const FEE_SCALE = 1000;
  const tx = new Transaction();
  
  const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(suiToMist(poolConfig.initialSuiAmount))]);
  
  tx.moveCall({
    target: `${PROTOCOL.PACKAGE_ID}::prediction_pool::create_pool`,
    arguments: [
      tx.object(PROTOCOL.POOL_REGISTRY),
      tx.object(PROTOCOL.USER_REGISTRY),
      tx.pure.vector('u8', stringToU8Vector(poolConfig.name)),
      tx.pure.vector('u8', stringToU8Vector(poolConfig.description)),
      tx.pure.u32(poolConfig.pairId),
      tx.pure.address(poolConfig.assetAddress),
      tx.pure.u64(BigInt(Math.floor(poolConfig.protocolFee * FEE_SCALE))),
      tx.pure.u64(BigInt(Math.floor(poolConfig.mintFee * FEE_SCALE))),
      tx.pure.u64(BigInt(Math.floor(poolConfig.burnFee * FEE_SCALE))),
      tx.pure.u64(BigInt(Math.floor(poolConfig.creatorFee * FEE_SCALE))),
      tx.pure.address(signerAddress),
      tx.pure.vector('u8', stringToU8Vector(`${poolConfig.name} Bull`)),
      tx.pure.vector('u8', stringToU8Vector(poolConfig.bullSymbol)),
      tx.pure.vector('u8', stringToU8Vector(`${poolConfig.name} Bear`)),
      tx.pure.vector('u8', stringToU8Vector(poolConfig.bearSymbol)),
      tx.object(PROTOCOL.SUPRA_ORACLE_HOLDER),
      coin,
    ],
  });
  
  tx.setGasBudget(DEFAULT_GAS_BUDGET);
  
  const result = await executeTransaction(tx);
  
  // Extract pool ID from created objects (shared object)
  const poolId = result.effects?.created?.find(
    (obj: any) => obj.owner && typeof obj.owner === 'object' && 'Shared' in obj.owner
  )?.reference?.objectId;
  
  if (!poolId) {
    throw new Error('Failed to extract pool ID from transaction result');
  }
  
  return { poolId, result };
}

/**
 * Purchases tokens (bull or bear)
 */
export async function purchaseTokens(
  poolId: string,
  amount: number,
  isBull: boolean
): Promise<TransactionResult> {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PROTOCOL.PACKAGE_ID}::prediction_pool::purchase_token`,
    arguments: [
      tx.object(poolId),
      tx.object(PROTOCOL.USER_REGISTRY),
      tx.pure.bool(isBull),
      tx.object(PROTOCOL.SUPRA_ORACLE_HOLDER),
      tx.splitCoins(tx.gas, [tx.pure.u64(suiToMist(amount))]),
    ],
  });
  
  tx.setGasBudget(DEFAULT_GAS_BUDGET);
  
  return executeTransaction(tx);
}

/**
 * Redeems/sells tokens
 */
export async function redeemTokens(
  poolId: string,
  tokenAmount: bigint,
  isBull: boolean
): Promise<TransactionResult> {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PROTOCOL.PACKAGE_ID}::prediction_pool::redeem_token`,
    arguments: [
      tx.object(poolId),
      tx.object(PROTOCOL.USER_REGISTRY),
      tx.pure.bool(isBull),
      tx.pure.u64(tokenAmount),
      tx.object(PROTOCOL.SUPRA_ORACLE_HOLDER),
    ],
  });
  
  tx.setGasBudget(DEFAULT_GAS_BUDGET);
  
  return executeTransaction(tx);
}

/**
 * Rebalances the pool
 */
export async function rebalancePool(poolId: string): Promise<TransactionResult> {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PROTOCOL.PACKAGE_ID}::prediction_pool::rebalance_pool_entry`,
    arguments: [
      tx.object(poolId),
      tx.object(PROTOCOL.SUPRA_ORACLE_HOLDER),
    ],
  });
  
  tx.setGasBudget(DEFAULT_GAS_BUDGET);
  
  return executeTransaction(tx);
}

/**
 * Fetches pool state
 */
export async function getPoolState(poolId: string): Promise<PoolState> {
  const suiClient = getClient();
  
  const poolObject = await suiClient.getObject({
    id: poolId,
    options: { showContent: true },
  });
  
  if (!poolObject.data?.content || poolObject.data.content.dataType !== 'moveObject') {
    throw new Error('Invalid pool object or pool not found');
  }
  
  const fields = (poolObject.data.content as any).fields;
  
  return {
    name: fields.name,
    description: fields.description || '',
    currentPrice: BigInt(fields.current_price),
    bullReserve: BigInt(fields.bull_reserve),
    bearReserve: BigInt(fields.bear_reserve),
    bullSupply: BigInt(fields.bull_token?.fields?.total_supply || 0),
    bearSupply: BigInt(fields.bear_token?.fields?.total_supply || 0),
    protocolFee: BigInt(fields.protocol_fee),
    poolCreatorFee: BigInt(fields.pool_creator_fee),
    mintFee: fields.mint_fee ? BigInt(fields.mint_fee) : undefined,
    burnFee: fields.burn_fee ? BigInt(fields.burn_fee) : undefined,
  };
}

/**
 * Fetches user token balances
 */
export async function getUserBalances(poolId: string, userAddress: string): Promise<UserBalances> {
  const suiClient = getClient();
  
  const tx = new Transaction();
  tx.moveCall({
    target: `${PROTOCOL.PACKAGE_ID}::prediction_pool::get_user_balances`,
    arguments: [tx.object(poolId), tx.pure.address(userAddress)],
  });
  
  const result = await suiClient.devInspectTransactionBlock({
    transactionBlock: tx,
    sender: userAddress,
  });
  
  const parseU64 = (bytes: number[]): bigint => {
    return new DataView(new Uint8Array(bytes).buffer).getBigUint64(0, true);
  };
  
  if (result.results?.[0]?.returnValues?.length >= 2) {
    return {
      bullTokens: parseU64(result.results[0].returnValues[0][0]),
      bearTokens: parseU64(result.results[0].returnValues[1][0]),
    };
  }
  
  return { bullTokens: BigInt(0), bearTokens: BigInt(0) };
}

/**
 * Fetches user average entry prices
 */
export async function getUserAvgPrices(poolId: string, userAddress: string): Promise<UserAvgPrices> {
  const suiClient = getClient();
  
  const tx = new Transaction();
  tx.moveCall({
    target: `${PROTOCOL.PACKAGE_ID}::prediction_pool::get_user_avg_prices`,
    arguments: [tx.object(poolId), tx.pure.address(userAddress)],
  });
  
  const result = await suiClient.devInspectTransactionBlock({
    transactionBlock: tx,
    sender: userAddress,
  });
  
  const parseU64 = (bytes: number[]): bigint => {
    return new DataView(new Uint8Array(bytes).buffer).getBigUint64(0, true);
  };
  
  if (result.results?.[0]?.returnValues?.length >= 2) {
    return {
      bullAvgPrice: parseU64(result.results[0].returnValues[0][0]),
      bearAvgPrice: parseU64(result.results[0].returnValues[1][0]),
    };
  }
  
  return { bullAvgPrice: BigInt(0), bearAvgPrice: BigInt(0) };
}
