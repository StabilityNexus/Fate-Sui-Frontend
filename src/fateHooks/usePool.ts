/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from "react";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import Decimal from "decimal.js";
import { PROTOCOL_ADDRESSES_TESTNET } from "@/config/protocol";

interface TokenFields {
  id: {
    id: string;
  };
  name: string;
  symbol: string;
  total_supply: string;
}

interface Token {
  type: string;
  fields: TokenFields;
}

export interface Pool {
  pair_id: string;
  pairId: string;
  asset_address: string;
  bear_reserve: string;
  bear_token: Token;
  bull_reserve: string;
  bull_token: Token;
  current_price: string;
  description: string;
  id: {
    id: string;
  };
  name: string;
  pool_creator: string;
  pool_creator_fee: string;
  protocol_fee: string;
  stable_order_fee: string;
  mint_fee?: string;
  burn_fee?: string;
}

export interface UserBalances {
  bull_tokens: number;
  bear_tokens: number;
}

export interface UserAvgPrices {
  bull_avg_price: number;
  bear_avg_price: number;
}

interface UsePoolResult {
  pool: Pool | null;
  userBalances: UserBalances;
  userAvgPrices: UserAvgPrices;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const usePool = (
  id: string | undefined,
  userAddress?: string | undefined
): UsePoolResult => {
  const [pool, setPool] = useState<Pool | null>(null);
  const [userBalances, setUserBalances] = useState<UserBalances>({
    bull_tokens: 0,
    bear_tokens: 0,
  });
  const [userAvgPrices, setUserAvgPrices] = useState<UserAvgPrices>({
    bull_avg_price: 0,
    bear_avg_price: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const packageId = PROTOCOL_ADDRESSES_TESTNET.PACKAGE_ID;

  const fetchUserBalances = async (
    client: SuiJsonRpcClient,
    poolObjectId: string,
    userAddr: string
  ): Promise<UserBalances> => {
    if (!packageId) {
      console.warn("Package ID not found in environment variables");
      return { bull_tokens: 0, bear_tokens: 0 };
    }

    try {
      const tx = new Transaction();

      tx.moveCall({
        target: `${packageId}::prediction_pool::get_user_balances`,
        arguments: [tx.object(poolObjectId), tx.pure.address(userAddr)],
      });

      console.log(
        "Calling move function:",
        `${packageId}::prediction_pool::get_user_balances`
      );
      console.log("With pool ID:", poolObjectId);
      console.log("With user address:", userAddr);

      const result = await client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: userAddr,
      });

      console.log("Dev inspect result:", result);

      if (result.error) {
        console.error("Move call error:", result.error);
        return { bull_tokens: 0, bear_tokens: 0 };
      }

      if (result.results && result.results[0]) {
        const moveResult = result.results[0];

        if (moveResult.returnValues && moveResult.returnValues.length >= 2) {
          const returnValues = moveResult.returnValues;

          function parseU64LEBigInt(bytes: any) {
            return new DataView(new Uint8Array(bytes).buffer).getBigUint64(
              0,
              true
            );
          }

          const bullTokens = returnValues[0]
            ? parseU64LEBigInt(returnValues[0][0])
            : BigInt(0);

          const bearTokens = returnValues[0]
            ? parseU64LEBigInt(returnValues[1][0])
            : BigInt(0);

          console.log("Parsed balances:", { bullTokens, bearTokens });

          return {
            bull_tokens: Number(bullTokens),
            bear_tokens: Number(bearTokens),
          };
        } else {
          console.warn("No return values found in result");
        }
      }

      return { bull_tokens: 0, bear_tokens: 0 };
    } catch (error) {
      console.error("Error fetching user balances:", error);

      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }

      return { bull_tokens: 0, bear_tokens: 0 };
    }
  };
  const fetchUserAverageBalances = async (
    client: SuiJsonRpcClient,
    poolObjectId: string,
    userAddr: string
  ): Promise<UserAvgPrices> => {
    if (!packageId) {
      console.warn("Package ID not found in environment variables");
      return { bull_avg_price: 0, bear_avg_price: 0 };
    }

    try {
      const tx = new Transaction();

      tx.moveCall({
        target: `${packageId}::prediction_pool::get_user_avg_prices`,
        arguments: [tx.object(poolObjectId), tx.pure.address(userAddr)],
      });

      console.log(
        "Calling move function:",
        `${packageId}::prediction_pool::get_user_avg_prices`
      );
      console.log("With pool ID:", poolObjectId);
      console.log("With user address:", userAddr);

      const result = await client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: userAddr,
      });

      console.log("Dev inspect result:", result);

      if (result.error) {
        console.error("Move call error:", result.error);
        return { bull_avg_price: 0, bear_avg_price: 0 };
      }

      if (result.results && result.results[0]) {
        const moveResult = result.results[0];

        if (moveResult.returnValues && moveResult.returnValues.length >= 2) {
          const returnValues = moveResult.returnValues;

          function parseU64LEBigInt(bytes: any) {
            return new DataView(new Uint8Array(bytes).buffer).getBigUint64(
              0,
              true
            );
          }
          const PRECISION_SCALE = new Decimal(1_000_000_000);

          const bullAvgPrice = returnValues[0]
            ? new Decimal(parseU64LEBigInt(returnValues[0][0]).toString()).div(
                PRECISION_SCALE
              )
            : new Decimal(0);

          const bearAvgPrice = returnValues[0]
            ? new Decimal(parseU64LEBigInt(returnValues[1][0]).toString()).div(
                PRECISION_SCALE
              )
            : new Decimal(0);
          // const bearAvgPrice = returnValues[0]
          //   ? parseU64LEBigInt(returnValues[1][0]) / PRECISION_SCALE
          //   : BigInt(0);

          console.log("Parsed Average Prices:", { bullAvgPrice, bearAvgPrice });

          return {
            bull_avg_price: Number(bullAvgPrice),
            bear_avg_price: Number(bearAvgPrice),
          };
        } else {
          console.warn("No return values found in result");
        }
      }

      return { bull_avg_price: 0, bear_avg_price: 0 };
    } catch (error) {
      console.error("Error fetching user balances:", error);

      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }

      return { bull_avg_price: 0, bear_avg_price: 0 };
    }
  };

  const fetchData = useCallback(async () => {
    if (!id) {
      setError("Missing pool ID.");
      return;
    }

    console.log("Fetching pool data for ID:", id);
    console.log("Package ID:", packageId);
    console.log("User address:", userAddress);

    setLoading(true);
    setError(null);

    try {
      const client = new SuiJsonRpcClient({
        url: "https://fullnode.testnet.sui.io:443",
        network: "testnet",
      });
      const objectID = decodeURIComponent(id);

      console.log("Fetching pool object:", objectID);

      const response = await client.getObject({
        id: objectID,
        options: { showContent: true },
      });

      console.log("Pool object response:", response);

      if (
        !response.data?.content ||
        response.data.content.dataType !== "moveObject"
      ) {
        throw new Error("No pool content found in response");
      }

      const poolFields = (response.data.content as any).fields;
      const poolData = poolFields as Pool;
      setPool(poolData);

      console.log("Pool data loaded successfully:", poolData.name);

      if (userAddress && packageId) {
        console.log("Fetching user data...");
        try {
          const balances = await fetchUserBalances(
            client,
            objectID,
            userAddress
          );
          setUserBalances(balances);
          console.log("User balances loaded:", balances);
          const avgPrices = await fetchUserAverageBalances(
            client,
            objectID,
            userAddress
          );
          setUserAvgPrices(avgPrices);
          console.log("User average prices loaded:", avgPrices);
        } catch (balanceError) {
          console.warn("Failed to fetch user balances:", balanceError);
        }
      } else {
        console.log("Skipping user balance fetch:", {
          hasUserAddress: !!userAddress,
          hasPackageId: !!packageId,
        });
      }
    } catch (err) {
      console.error("Error in fetchData:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, [id, userAddress, packageId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = () => {
    fetchData();
  };

  return {
    pool,
    userBalances,
    userAvgPrices,
    loading,
    error,
    refetch,
  };
};
