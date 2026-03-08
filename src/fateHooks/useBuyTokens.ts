"use client";
import { useCallback } from "react";
import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { useWallet } from "@suiet/wallet-kit";
import toast from "react-hot-toast";
import { PROTOCOL_ADDRESSES_TESTNET } from "@/config/protocol";
import logger from "@/lib/logger";
interface BuyTokensParams {
  amount: number;
  isBull: boolean;
  vaultId: string;
  assetId: string;
}

export function useBuyTokens() {
  const { account, signAndExecuteTransaction } = useWallet();

  const buyTokens = useCallback(
    async ({ amount, isBull, vaultId }: BuyTokensParams) => {
      if (!amount || amount <= 0 || !account?.address) {
        toast.error("Please enter a valid amount and connect your wallet");
        return;
      }

      const PACKAGE_ID = PROTOCOL_ADDRESSES_TESTNET.PACKAGE_ID;
      const NEXT_SUPRA_ORACLE_HOLDER =
        PROTOCOL_ADDRESSES_TESTNET.SUPRA_ORACLE_HOLDER;
      const USER_REGISTRY = PROTOCOL_ADDRESSES_TESTNET.USER_REGISTRY;
      if (!PACKAGE_ID) {
        toast.error("Missing PACKAGE_ID in environment variables");
        return;
      }
      if (!NEXT_SUPRA_ORACLE_HOLDER) {
        toast.error(
          "Missing NEXT_SUPRA_ORACLE_HOLDER in environment variables"
        );
        return;
      }

      try {
        logger.log(`Starting ${isBull ? "bull" : "bear"} token purchase...`, {
          amount,
          vaultId,
        });

        const amountInMist = BigInt(amount * 1_000_000_000);

        const suiClient = new SuiClient({
          url: "https://fullnode.testnet.sui.io:443",
        });

        const coins = await suiClient.getCoins({
          owner: account.address,
          coinType: "0x2::sui::SUI",
        });

        const totalBalance = coins.data.reduce(
          (sum, coin) => sum + BigInt(coin.balance),
          BigInt(0)
        );

        if (totalBalance < amountInMist + BigInt(100_000_000)) {
          throw new Error(
            `Insufficient balance. Required: ${
              amountInMist + BigInt(100_000_000)
            }, Available: ${totalBalance.toString()}`
          );
        }
        const tx = new Transaction();
        tx.moveCall({
          target: `${PACKAGE_ID}::prediction_pool::purchase_token`,
          arguments: [
            tx.object(vaultId),
            tx.object(USER_REGISTRY!),
            tx.pure.bool(isBull),
            tx.object(NEXT_SUPRA_ORACLE_HOLDER as string),
            tx.splitCoins(tx.gas, [tx.pure.u64(amountInMist)]),
          ],
        });
        tx.setGasBudget(100_000_000);

        logger.log("Executing purchase transaction...");
        const result = await signAndExecuteTransaction({ transaction: tx });

        logger.log("Transaction result:", result);
        toast.success(`${isBull ? "Bull" : "Bear"} token purchase successful!`);
        window.location.reload();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        logger.error("Buy token failed:", error);

        toast.error(
          `${isBull ? "Bull" : "Bear"} token purchase failed: ${error.message}`
        );
      }
    },
    [account?.address, signAndExecuteTransaction]
  );

  return { buyTokens };
}
