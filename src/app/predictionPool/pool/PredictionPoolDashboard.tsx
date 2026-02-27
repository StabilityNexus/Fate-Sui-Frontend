/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { InfoIcon, RefreshCw } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSearchParams } from "next/navigation";
import TradingViewWidget from "@/components/TradingViewWidget";
import { useDistribute } from "@/fateHooks/useDistribute";
import { usePool } from "@/fateHooks/usePool";
import Footer from "@/components/layout/Footer";
import StickyCursor from "@/components/StickyCursor";
import AppLoader from "@/components/Loader";
import VaultSection from "@/components/Dashboard/VaultSection";
import { ASSET_CONFIG } from "@/config/assets";
import { usePolling } from "@/fateHooks/usePolling";
import { usePoolDataChanges } from "@/fateHooks/usePoolDataChanges";

export default function PredictionPoolDashboard() {
  const stickyRef = useRef<HTMLElement | null>(null);
  const { distribute } = useDistribute();
  const { theme } = useTheme();
  const params = useSearchParams();
  const account = useCurrentAccount();
  const connected = !!account;
  const poolId = params?.get("id");
  const { pool, userBalances, userAvgPrices, loading, error, refetch } =
    usePool(poolId as string, account?.address as string);

  const [isDistributeLoading, setIsDistributeLoading] = useState(false);
  const [distributeError, setDistributeError] = useState("");
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [previousPoolData, setPreviousPoolData] = useState<any>(null);

  const POLLING_INTERVAL = 5000;
  const [pollingEnabledState, setPollingEnabledState] = useState(true);

  const safeNumber = (num: any, fallback = 0) =>
    !isFinite(num) || isNaN(num) ? fallback : Number(num);

  const formatNumber = (n: number, decimals = 9) => {
    if (!isFinite(n) || isNaN(n)) return "0";
    const rounded = Number(n.toFixed(decimals));
    let s = rounded.toString();
    if (s.indexOf("e") !== -1) s = rounded.toFixed(decimals);
    if (s.indexOf(".") >= 0) s = s.replace(/\.?0+$/, "");
    return s;
  };

  const formatValue = (value: number) =>
    `${formatNumber(safeNumber(value) / 1e9, 3)} SUI`;
  const FEE_DENOMINATOR = 100;

  const poolData = pool
    ? {
        id: pool.id?.id || "",
        name: pool.name || "Prediction Pool",
        description: pool.description || "A prediction market pool",
        asset_id: pool.pair_id || "",
        current_price: parseInt(pool.current_price) || 0,
        bull_reserve: parseInt(pool.bull_reserve) || 0,
        bear_reserve: parseInt(pool.bear_reserve) || 0,
        bull_supply: parseInt(pool.bull_token?.fields?.total_supply) || 0,
        bear_supply: parseInt(pool.bear_token?.fields?.total_supply) || 0,
        vault_creator_fee:
          parseInt(pool.pool_creator_fee) / FEE_DENOMINATOR || 0,
        protocol_fee: parseInt(pool.protocol_fee) / FEE_DENOMINATOR || 0,
        mint_fee: parseInt(pool.mint_fee!) / FEE_DENOMINATOR || 0,
        burn_fee: parseInt(pool.burn_fee!) / FEE_DENOMINATOR || 0,
      }
    : {
        id: "",
        name: "Loading...",
        description: "Loading pool data...",
        asset_id: "",
        current_price: 0,
        bull_reserve: 0,
        bear_reserve: 0,
        bull_supply: 0,
        bear_supply: 0,
        vault_creator_fee: 0,
        protocol_fee: 0,
        mint_fee: 0,
        burn_fee: 0,
      };

  const { changes } = usePoolDataChanges(poolData, previousPoolData);

  const handlePoll = useCallback(async () => {
    if (!pool?.id?.id || loading) return;

    try {
      await refetch?.();
      setLastUpdateTime(new Date());
    } catch (err) {
      console.error("Polling error:", err);
    }
  }, [pool?.id?.id, loading, refetch]);

  const pollingEnabled = useMemo(
    () => !loading && !!pool?.id?.id && pollingEnabledState,
    [loading, pool?.id?.id, pollingEnabledState]
  );

  const { isPolling } = usePolling(
    handlePoll,
    POLLING_INTERVAL,
    pollingEnabled
  );

  const poolDataRef = useRef(poolData);
  useEffect(() => {
    if (poolData && poolData.id && poolData !== poolDataRef.current) {
      setPreviousPoolData(poolDataRef.current);
      poolDataRef.current = poolData;
    }
  }, [
    poolData.id,
    poolData.current_price,
    poolData.bull_reserve,
    poolData.bear_reserve,
    poolData.bull_supply,
    poolData.bear_supply,
  ]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setPollingEnabledState(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const calculations = useMemo(() => {
    const totalReserves = poolData.bull_reserve + poolData.bear_reserve;
    const bullPercentage =
      totalReserves > 0 ? (poolData.bull_reserve / totalReserves) * 100 : 50;
    const bearPercentage =
      totalReserves > 0 ? (poolData.bear_reserve / totalReserves) * 100 : 50;

    const bullPrice = safeNumber(
      poolData.bull_reserve / 1e9 / (poolData.bull_supply / 1e9),
      1
    );
    const bearPrice = safeNumber(
      poolData.bear_reserve / 1e9 / (poolData.bear_supply / 1e9),
      1
    );

    const userBullTokens = userBalances.bull_tokens / 1e9;
    const userBearTokens = userBalances.bear_tokens / 1e9;
    const userBullValue = userBullTokens * bullPrice;
    const userBearValue = userBearTokens * bearPrice;

    const userBullReturns = (() => {
      if (userBullTokens === 0 || userAvgPrices.bull_avg_price === 0) return 0;
      const cost = userBullTokens * userAvgPrices.bull_avg_price;
      return ((userBullValue - cost) / cost) * 100;
    })();

    const userBearReturns = (() => {
      if (userBearTokens === 0 || userAvgPrices.bear_avg_price === 0) return 0;
      const cost = userBearTokens * userAvgPrices.bear_avg_price;
      return ((userBearValue - cost) / cost) * 100;
    })();

    return {
      totalReserves,
      bullPercentage,
      bearPercentage,
      bullPrice,
      bearPrice,
      userBullTokens,
      userBearTokens,
      userBullValue,
      userBearValue,
      userBullReturns,
      userBearReturns,
    };
  }, [poolData, userBalances, userAvgPrices]);

  const asset = ASSET_CONFIG[poolData.asset_id];

  const handleDistribute = async () => {
    if (!pool) return;
    setIsDistributeLoading(true);
    setDistributeError("");
    try {
      await distribute({
        ...pool,
        id: pool.id?.id || "",
        pool_creator: pool.pool_creator || "",
        assetId: pool.asset_address || "",
      });
      await handlePoll();
    } catch (err: any) {
      setDistributeError(err?.message || "Failed to distribute rewards");
    } finally {
      setIsDistributeLoading(false);
    }
  };

  if (loading && !pool)
    return (
      <AppLoader minDuration={100}>
        <></>
      </AppLoader>
    );

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-900">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-neutral-900 dark:text-white">
            Error Loading Pool
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <AppLoader minDuration={700}>
      <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-white">
        <Navbar />
        <StickyCursor stickyRef={stickyRef} />

        <div className="container mx-auto px-5 py-4">
          {distributeError && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 font-medium">
              {distributeError}
            </div>
          )}

          {/* Pool Info */}
          <div className="border rounded-xl border-black dark:border-neutral-600 p-3 bg-white dark:bg-neutral-900 mb-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex-2 p-1">
                <div className="flex items-center space-x-3">
                  <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
                    {poolData.name}
                  </h1>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isPolling ? "bg-green-500" : "bg-red-500"
                      } ${isPolling ? "animate-pulse" : ""}`}
                    ></div>
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {isPolling ? "Live Updates" : "Updates Paused"}
                    </span>
                  </div>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-2">
                  {poolData.description}
                </p>

                <div className="flex items-center space-x-2">
                  {/* Price */}
                  <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Price: {asset?.name || ""}
                  </span>

                  <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    |
                  </span>

                  {/* Fees with tooltip */}
                  <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 flex items-center space-x-1">
                    <span>Fees</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <InfoIcon className="w-4 h-4 text-neutral-400 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-400 cursor-pointer transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent side="right" align="center">
                          <div className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-2 rounded-xl shadow-lg text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="font-medium">Creator Fee:</span>
                              <span>{poolData.vault_creator_fee}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium">Protocol Fee:</span>
                              <span>{poolData.protocol_fee}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium">Mint Fee:</span>
                              <span>{poolData.mint_fee}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium">Burn Fee:</span>
                              <span>{poolData.burn_fee}%</span>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                </div>

                <div className="flex items-center space-x-2 mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                  <span>
                    Last updated: {lastUpdateTime.toLocaleTimeString()}
                  </span>
                  <RefreshCw
                    className={`w-3 h-3 cursor-pointer ${
                      loading ? "animate-spin" : ""
                    }`}
                    onClick={handlePoll}
                  />
                </div>
              </div>
              <div className="lg:min-w-[300px] mt-1 mr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                  <div className="bg-neutral-200 dark:bg-neutral-800 rounded-lg p-3 justify-center items-center flex flex-col">
                    <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                      Total Value Locked
                    </div>
                    <div
                      className="text-lg font-bold transition-all duration-300"
                      style={{
                        color:
                          calculations.bullPercentage >
                          calculations.bearPercentage
                            ? theme === "dark"
                              ? "#111"
                              : "#111"
                            : theme === "dark"
                            ? "#fff"
                            : "gray-500",
                      }}
                    >
                      {formatValue(calculations.totalReserves)}
                    </div>

                    {/* Pool Ratio Bar with animations */}
                    <div className="w-full rounded-full h-2 my-2 flex overflow-hidden bg-neutral-200 dark:bg-neutral-700">
                      {/* Bull portion */}
                      <div
                        className="h-2 transition-all duration-500 ease-in-out"
                        style={{
                          width: `${calculations.bullPercentage}%`,
                          backgroundColor: theme === "dark" ? "#111" : "#333",
                        }}
                      ></div>

                      {/* Bear portion */}
                      <div
                        className="h-2 transition-all duration-500 ease-in-out"
                        style={{
                          width: `${calculations.bearPercentage}%`,
                          backgroundColor:
                            theme === "dark" ? "gray-500" : "#fff",
                          borderLeft:
                            theme === "dark"
                              ? "1px solid #888"
                              : "1px solid #ddd",
                        }}
                      ></div>
                    </div>

                    {/* Bull/Bear Text */}
                    <div className="flex justify-between w-full text-xs font-medium">
                      <span
                        className={` text-black transition-colors duration-300 ${
                          changes.bull_reserve ? "font-bold" : ""
                        }`}
                      >
                        {calculations.bullPercentage.toFixed(1)}% Bull
                      </span>
                      <span
                        className={`text-gray-500 dark:text-white transition-colors duration-300 ${
                          changes.bear_reserve ? "font-bold" : ""
                        }`}
                      >
                        {calculations.bearPercentage.toFixed(1)}% Bear
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-16 mt-3">
            {/* Bull Vault */}
            <VaultSection
              isBull={true}
              poolData={poolData}
              userTokens={calculations.userBullTokens}
              price={calculations.bullPrice}
              value={calculations.userBullValue}
              returns={calculations.userBullReturns}
              symbol={pool?.bull_token?.fields?.symbol || "BULL"}
              connected={connected}
              handlePoll={handlePoll}
            />

            {/* Chart */}
            <div className="lg:col-span-2">
              <div className="border  rounded-xl border-black dark:border-neutral-600 bg-white dark:bg-neutral-900 shadow-sm">
                <div className="p-6">
                  <TradingViewWidget
                    assetId={poolData.asset_id}
                    theme={theme === "dark" ? "dark" : "light"}
                    heightPx={453}
                    showHeader={true}
                  />

                  {/* Rebalance Section */}
                  <div className="mt-6 p-6 border rounded-xl border-black dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
                    <h4 className="font-bold mb-3 text-lg text-neutral-900 dark:text-white">
                      Rebalance Pool
                    </h4>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 leading-relaxed">
                      Fetch current oracle price and move funds from the losing
                      vault to the winning vault.
                    </p>
                    <div className="text-sm space-y-2 mb-4 bg-white dark:bg-neutral-900 p-4 rounded-lg border border-black dark:border-neutral-600">
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">
                          Price at last rebalance:
                        </span>
                        <span
                          className="font-bold dark:text-white"
                          style={{ color: asset?.color || "#000" }}
                        >
                          1 {asset?.name.split("/")[0] || "?"} ={" "}
                          {(poolData.current_price / 10000).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 8,
                            }
                          )}{" "}
                          {asset?.name.split("/")[1] || "USD"}
                        </span>
                      </div>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-full">
                            <Button
                              className="w-full bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-semibold py-3 transition-all duration-200 shadow-lg hover:shadow-xl"
                              onClick={handleDistribute}
                              disabled={
                                account?.address !== pool?.pool_creator ||
                                isDistributeLoading
                              }
                            >
                              {isDistributeLoading && (
                                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                              )}
                              Rebalance Pool
                            </Button>
                          </div>
                        </TooltipTrigger>
                        {account?.address !== pool?.pool_creator && (
                          <TooltipContent>
                            <p className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 p-2 rounded-md text-sm">
                              This action can only be performed by the pool
                              creator
                            </p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            </div>

            {/* Bear Vault */}
            <VaultSection
              isBull={false}
              poolData={poolData}
              userTokens={calculations.userBearTokens}
              price={calculations.bearPrice}
              value={calculations.userBearValue}
              returns={calculations.userBearReturns}
              symbol={pool?.bear_token?.fields?.symbol || "BEAR"}
              connected={connected}
              handlePoll={handlePoll}
            />
          </div>
        </div>

        <Footer />
      </div>
    </AppLoader>
  );
}
