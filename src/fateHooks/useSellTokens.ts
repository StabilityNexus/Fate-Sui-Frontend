"use client";
import { useCallback } from "react";
import { Transaction } from "@mysten/sui/transactions";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import toast from "react-hot-toast";
import { PROTOCOL_ADDRESSES_TESTNET } from "@/config/protocol";

interface SellTokensParams {
  amount: number;
  isBull: boolean;
  vaultId: string;
}

export function useSellTokens() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const sellTokens = useCallback(
    async ({ amount, isBull, vaultId }: SellTokensParams) => {
      if (!amount || amount <= 0 || !account?.address) {
        toast.error("Please enter a valid amount and connect your wallet");
        return;
      }

      const PACKAGE_ID = PROTOCOL_ADDRESSES_TESTNET.PACKAGE_ID;
      const NEXT_SUPRA_ORACLE_HOLDER = PROTOCOL_ADDRESSES_TESTNET.SUPRA_ORACLE_HOLDER;
      const USER_REGISTRY = PROTOCOL_ADDRESSES_TESTNET.USER_REGISTRY;
      if (!PACKAGE_ID || !NEXT_SUPRA_ORACLE_HOLDER) {
        toast.error("Missing PACKAGE_ID or NEXT_SUPRA_ORACLE_HOLDER in env");
        return;
      }

      try {
        console.log(`Starting ${isBull ? "bull" : "bear"} token sale...`, {
          amount,
          vaultId,
        });

        const tokenAmount = BigInt(Math.floor(amount * 1_000_000_000));

        const tx = new Transaction();
        tx.moveCall({
          target: `${PACKAGE_ID}::prediction_pool::redeem_token`,
          arguments: [
            tx.object(vaultId),  
            tx.object(USER_REGISTRY!),             
            tx.pure.bool(isBull),             
            tx.pure.u64(tokenAmount),         
            tx.object(NEXT_SUPRA_ORACLE_HOLDER),   
          ],
        });

        tx.setGasBudget(100_000_000);

        console.log("Executing sell transaction...");
        const result = await signAndExecuteTransaction({ transaction: tx });

        console.log("Transaction result:", result);
        toast.success(`${isBull ? "Bull" : "Bear"} token sale successful!`);
        window.location.reload();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        console.error("Sell token failed:", error);
        toast.error(
          `${isBull ? "Bull" : "Bear"} token sale failed: ${error.message}`
        );
      }
    },
    [account?.address, signAndExecuteTransaction]
  );

  return { sellTokens };
}
