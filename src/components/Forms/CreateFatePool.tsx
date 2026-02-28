/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import PoolConfigurationStep from "./Steps/PoolConfigurationStep";
import TokenConfigurationStep from "./Steps/TokenConfigurationStep";
import FeeConfigurationStep from "./Steps/FeeConfigurationStep";
import ReviewStep from "./Steps/ReviewStep";
import StepIndicator from "./Steps/StepIndicator";
import type { FormData } from "@/types/FormData";
import { Transaction } from "@mysten/sui/transactions";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { PROTOCOL_ADDRESSES_TESTNET } from "@/config/protocol";
import { useQueryClient } from "@tanstack/react-query";
type FormErrors = Partial<Record<keyof FormData, string>>;

export default function CreateFatePoolForm() {
  const router = useRouter();
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const queryClient = useQueryClient();

  const stepTitles = ["Pool", "Tokens", "Fees", "Review"];
  const totalSteps = 4;

  const [formData, setFormData] = useState<FormData>({
    poolName: "",
    poolDescription: "",
    pairId: "",
    assetAddress: "",
    bullCoinName: "",
    bullCoinSymbol: "",
    bearCoinName: "",
    bearCoinSymbol: "",
    poolCreatorFee: "",
    poolCreatorAddress: "",
    protocolFee: "",
    mintFee: "",
    burnFee: "",
  });

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    const updatedFields = Object.keys(updates) as (keyof FormData)[];
    setErrors((prev) => {
      const newErrors = { ...prev };
      updatedFields.forEach((field) => {
        delete newErrors[field];
      });
      return newErrors;
    });
  };

  const validateStep = (step: number) => {
    const newErrors: FormErrors = {};

    switch (step) {
      case 1:
        if (!formData.poolName.trim()) {
          newErrors.poolName = "Pool name is required";
        }
        break;
      case 2:
        if (!formData.bullCoinName.trim()) {
          newErrors.bullCoinName = "Bull coin name is required";
        }
        if (!formData.bullCoinSymbol.trim()) {
          newErrors.bullCoinSymbol = "Bull coin symbol is required";
        }
        if (!formData.bearCoinName.trim()) {
          newErrors.bearCoinName = "Bear coin name is required";
        }
        if (!formData.bearCoinSymbol.trim()) {
          newErrors.bearCoinSymbol = "Bear coin symbol is required";
        }
        break;
      case 3:
        if (!formData.poolCreatorFee.trim()) {
          newErrors.poolCreatorFee = "Creator stake fee is required";
        }
        if (!formData.protocolFee.trim()) {
          newErrors.protocolFee = "Creator unstake fee is required";
        }
        if (!formData.mintFee.trim()) {
          newErrors.mintFee = "Mint fee is required";
        }
        if (!formData.burnFee.trim()) {
          newErrors.burnFee = "Burn fee is required";
        }
        if (!formData.initialSuiAmount) {
          newErrors.initialSuiAmount = "Initial SUI amount is required";
        }
        if (
          formData.initialSuiAmount &&
          isNaN(Number(formData.initialSuiAmount))
        ) {
          newErrors.initialSuiAmount = "Initial SUI amount must be a number";
        } else if (
          formData.initialSuiAmount &&
          Number(formData.initialSuiAmount) <= 0
        ) {
          newErrors.initialSuiAmount =
            "Initial SUI amount must be greater than zero";
        }
        break;
      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    console.log("Form submitted:", formData);

    if (!account?.address) {
      toast.error("Please connect your wallet.");
      setIsSubmitting(false);
      return;
    }

    const PACKAGE_ID = PROTOCOL_ADDRESSES_TESTNET.PACKAGE_ID;
    const NEXT_SUPRA_ORACLE_HOLDER =
      PROTOCOL_ADDRESSES_TESTNET.SUPRA_ORACLE_HOLDER;
    const NEXT_PUBLIC_POOL_REGISTRY = PROTOCOL_ADDRESSES_TESTNET.POOL_REGISTRY;
    const NEXT_PUBLIC_USER_REGISTRY = PROTOCOL_ADDRESSES_TESTNET.USER_REGISTRY;
    if (!PACKAGE_ID || !NEXT_SUPRA_ORACLE_HOLDER) {
      toast.error(
        "Missing environment variables: PACKAGE_ID or SUPRA_ORACLE_HOLDER"
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const poolName = formData.poolName?.trim() || "Default Pool";
      const poolDescription = formData.poolDescription?.trim() || "";
      const pairId = formData.pairId !== '' ? Number(formData.pairId) : 18;
      if (!Number.isFinite(pairId) || pairId < 0 || pairId > 0xffffffff) {
        toast.error("Invalid pair id. Provide a numeric pairId (u32).");
        setIsSubmitting(false);
        return;
      }

      const assetAddress = formData.assetAddress?.trim();
      const ethAddressPattern = /^0x[a-fA-F0-9]{40}$/;
      if (!assetAddress) {
        toast.error("Asset address is required.");
        setIsSubmitting(false);
        return;
      }
      if (!ethAddressPattern.test(assetAddress)) {
        toast.error("Asset address must be a valid Ethereum address.");
        setIsSubmitting(false);
        return;
      }
      const FEE_NUMERATOR = 1000;

      const protocolFee = BigInt(
        Math.floor(Number(formData.protocolFee ?? 0) * FEE_NUMERATOR)
      );
      const mintFee = BigInt(
        Math.floor(Number(formData.mintFee ?? 0) * FEE_NUMERATOR)
      );
      const burnFee = BigInt(
        Math.floor(Number(formData.burnFee ?? 0) * FEE_NUMERATOR)
      );
      const poolCreatorFee = BigInt(
        Math.floor(Number(formData.poolCreatorFee ?? 0) * FEE_NUMERATOR)
      );

      const poolCreator = formData.poolCreatorAddress || account.address;

      const initialSuiAmount = BigInt(
        Math.floor(Number(formData.initialSuiAmount ?? 0) * 1_000_000_000)
      );

      if (initialSuiAmount <= BigInt(0)) {
        toast.error("Initial SUI amount must be greater than 0");
        setIsSubmitting(false);
        return;
      }

      const bullTokenName = `${poolName} Bull`;
      const bullTokenSymbol = formData.bullCoinSymbol ?? "BULL";
      const bearTokenName = `${poolName} Bear`;
      const bearTokenSymbol = formData.bearCoinSymbol ?? "BEAR";

      const strToU8Vec = (s: string) => Array.from(Buffer.from(s, "utf8"));

      const tx = new Transaction();

      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(initialSuiAmount)]);

      tx.moveCall({
        target: `${PACKAGE_ID}::prediction_pool::create_pool`,
        arguments: [
          tx.object(NEXT_PUBLIC_POOL_REGISTRY!),
          tx.object(NEXT_PUBLIC_USER_REGISTRY!),
          tx.pure.vector("u8", strToU8Vec(poolName)),
          tx.pure.vector("u8", strToU8Vec(poolDescription)),
          tx.pure.u32(pairId),
          tx.pure.address(assetAddress),
          tx.pure.u64(protocolFee),
          tx.pure.u64(mintFee),
          tx.pure.u64(burnFee),
          tx.pure.u64(poolCreatorFee),
          tx.pure.address(poolCreator),
          tx.pure.vector("u8", strToU8Vec(bullTokenName)),
          tx.pure.vector("u8", strToU8Vec(bullTokenSymbol)),
          tx.pure.vector("u8", strToU8Vec(bearTokenName)),
          tx.pure.vector("u8", strToU8Vec(bearTokenSymbol)),
          tx.object(NEXT_SUPRA_ORACLE_HOLDER),
          coin,
        ],
      });

      tx.setGasBudget(100_000_000);

      console.log("Submitting create_pool tx...");
      console.log("Transaction args:", {
        poolName,
        poolDescription,
        pairId,
        assetAddress,
        protocolFee: protocolFee.toString(),
        mintFee: mintFee.toString(),
        burnFee: burnFee.toString(),
        poolCreatorFee: poolCreatorFee.toString(),
        poolCreator,
        bullTokenName,
        bullTokenSymbol,
        bearTokenName,
        bearTokenSymbol,
        initialSuiAmount: initialSuiAmount.toString(),
      });

      const result = await signAndExecuteTransaction({ transaction: tx });

      console.log("Pool created successfully:", result);

      try {
        const resultObj =
          typeof result === "string" ? JSON.parse(result) : result;
        const poolId = resultObj?.effects?.created?.[0]?.reference?.objectId;
        if (poolId) {
          console.log("New pool ID:", poolId);
        }
      } catch (e) {
        console.debug("Could not parse result object for pool id", e);
      }

      toast.success("Prediction Pool created successfully!");
      router.push("/predictionPool");
      queryClient.invalidateQueries({ queryKey: ["poolIds"] });
    } catch (err: any) {
      console.error("Transaction error:", err);
      toast.error(`Transaction failed: ${err?.message ?? String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <PoolConfigurationStep
            formData={formData}
            updateFormData={updateFormData}
            errors={errors}
          />
        );
      case 2:
        return (
          <TokenConfigurationStep
            formData={formData}
            updateFormData={updateFormData}
            errors={errors}
          />
        );
      case 3:
        return (
          <FeeConfigurationStep
            formData={formData}
            updateFormData={updateFormData}
            errors={errors}
          />
        );
      case 4:
        return (
          <ReviewStep
            formData={formData}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 dark:bg-black bg-white">
      <div className="bg-white dark:bg-black p-6 rounded-xl my-10">
        <Card className="shadow-lg bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700">
          <CardHeader className="border-b border-neutral-200 dark:border-neutral-700">
            <CardTitle className="text-2xl font-bold text-black dark:text-white">
              Create Fate Pool
            </CardTitle>
            <CardDescription className="text-neutral-600 dark:text-neutral-400">
              Follow the steps to configure your new Fate Pool
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <StepIndicator
              currentStep={currentStep}
              totalSteps={totalSteps}
              stepTitles={stepTitles}
            />

            <div className="">{renderCurrentStep()}</div>

            <Separator className="bg-neutral-200 dark:bg-neutral-700 my-6" />
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="flex items-center gap-2 bg-black text-white hover:bg-neutral-900 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <Button
                type="button"
                onClick={handleNext}
                disabled={currentStep === 4}
                className="flex items-center gap-2 bg-black text-white hover:bg-neutral-900 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
