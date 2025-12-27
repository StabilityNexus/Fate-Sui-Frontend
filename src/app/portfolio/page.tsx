/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  PieChartIcon,
  BarChart3,
  Wallet,
  Activity,
  DollarSign,
} from "lucide-react";
import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import StickyCursor from "@/components/StickyCursor";
import { usePool } from "@/fateHooks/usePool";
import { bcs } from "@mysten/sui/bcs";
import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { useWallet } from "@suiet/wallet-kit";
import { useRouter } from "next/navigation";
import AppLoader from "@/components/Loader";
import { PROTOCOL_ADDRESSES_TESTNET } from "@/config/protocol";

const PACKAGE_ID = PROTOCOL_ADDRESSES_TESTNET.PACKAGE_ID;
const USER_REGISTRY = PROTOCOL_ADDRESSES_TESTNET.USER_REGISTRY;
const CHART_COLORS = [
  "#fff44f", // bright lemon yellow
  "#ffec1a", // vivid sunshine yellow
  "#ffd60a", // rich golden yellow
  "#ffca0a", // warm bright gold
  "#ffb703", // sunflower yellow
  "#f59e0b", // amber yellow
];

const BEAR_COLORS = [
  "#e5e7eb", // gray-200
  "#d1d5db", // gray-300
  "#9ca3af", // gray-400
  "#6b7280", // gray-500
];

const BULL_COLORS = [
  "#4b5563", // gray-600
  "#374151", // gray-700
  "#1f2937", // gray-800
  "#111827", // gray-900
  "#0f172a", // slate-950
  "#000000", // pure black
];

const WEI_DIVISOR = 1e9;

// Safe number utility
const safeNumber = (value: any, fallback = 0): number => {
  const num = Number(value);
  return isFinite(num) && !isNaN(num) ? num : fallback;
};

// Calculate token metrics
const calculateTokenMetrics = (
  reserve: number,
  supply: number,
  userTokens: number,
  avgPrice: number
) => {
  const price = safeNumber(supply > 0 ? reserve / supply : 0);
  const currentValue = userTokens * price;
  const costBasis = userTokens * avgPrice;
  const pnL = currentValue - costBasis;
  const returns =
    userTokens === 0 || avgPrice === 0 ? 0 : (pnL / costBasis) * 100;

  return { price, currentValue, costBasis, pnL, returns };
};

interface PoolData {
  id: string;
  name: string;
  bullBalance: number;
  bearBalance: number;
  bullCurrentValue: number;
  bearCurrentValue: number;
  totalValue: number;
  totalCostBasis: number;
  bullPnL: number;
  bearPnL: number;
  totalPnL: number;
  bullPrice: number;
  bearPrice: number;
  bullAvgPrice: number;
  bearAvgPrice: number;
  bullReturns: number;
  bearReturns: number;
  color: string;
  bullColor: string;
  bearColor: string;
  hasPositions: boolean;
  hasBullPosition: boolean;
  hasBearPosition: boolean;
  bullReserve: number;
  bearReserve: number;
  bullSupply: number;
  bearSupply: number;
}

const SummaryCard = ({
  title,
  value,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<any>;
  trend?: "up" | "down" | "neutral";
}) => (
  <Card className="group relative overflow-hidden  border-black dark:border-neutral-700/60 dark:bg-gradient-to-br dark:from-neutral-800/50 dark:to-neutral-900/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] hover:border-yellow-300/50 dark:hover:border-yellow-500/30">
    {/* Subtle gradient overlay */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
      <CardTitle className="text-sm font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors">
        {title}
      </CardTitle>
      <div className="relative">
        <div
          className={`absolute inset-0 rounded-full blur-sm opacity-20 ${
            trend === "up"
              ? "bg-green-400"
              : trend === "down"
              ? "bg-red-400"
              : "bg-neutral-400"
          }`}
        />
        <Icon
          className={`relative h-5 w-5 transition-all duration-300 group-hover:scale-110 ${
            trend === "up"
              ? "text-green-500 dark:text-green-400"
              : trend === "down"
              ? "text-red-500 dark:text-red-400"
              : "text-neutral-500 dark:text-neutral-400"
          }`}
        />
      </div>
    </CardHeader>
    <CardContent>
      <div
        className={`text-2xl font-bold transition-all duration-300 group-hover:scale-105 ${
          trend === "up"
            ? "text-green-600 dark:text-green-400"
            : trend === "down"
            ? "text-red-600 dark:text-red-400"
            : "text-neutral-900 dark:text-neutral-100"
        }`}
      >
        {value}
      </div>
      {trend && trend !== "neutral" && (
        <div className="mt-1 flex items-center text-xs opacity-70">
          {trend === "up" ? (
            <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
          ) : (
            <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
          )}
          <span className={trend === "up" ? "text-green-600" : "text-red-600"}>
            {trend === "up" ? "Profit" : "Loss"}
          </span>
        </div>
      )}
    </CardContent>
  </Card>
);

const PositionCard = ({ pool }: { pool: PoolData }) => {
  const router = useRouter();
  return (
    <div
      className="group relative overflow-hidden border border-black dark:border-neutral-600/60 rounded-xl p-5 dark:bg-gradient-to-br dark:from-neutral-700/40 dark:to-neutral-800/40 backdrop-blur-sm cursor-pointer transition-all duration-300 hover:shadow-xl hover:border-yellow-300/50 dark:hover:border-yellow-500/30"
      onClick={() => {
        router.push(`predictionPool/pool?id=${pool.id}`);
      }}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Color accent bar */}
      <div
        className="absolute left-0 top-0 w-1 h-full transition-all duration-300 group-hover:w-2"
        style={{
          backgroundColor:
            pool.bullBalance > pool.bearBalance ? "#1f2937" : "#d1d5db",
        }}
      />

      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div
            className="w-3 h-3 rounded-full shadow-lg"
            style={{
              backgroundColor:
                pool.bullBalance > pool.bearBalance ? "#1f2937" : "#d1d5db",
            }}
          />
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
            {pool.name}
          </h3>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
            {pool.totalValue.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 4,
            })}{" "}
            SUI
          </div>
          <div
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              pool.totalPnL >= 0
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            }`}
          >
            {pool.totalPnL > 0 ? "+" : ""}
            {pool.totalPnL.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 4,
            })}{" "}
            SUI (
            {pool.totalCostBasis > 0
              ? ((pool.totalPnL / pool.totalCostBasis) * 100).toLocaleString(
                  undefined,
                  {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  }
                )
              : "0"}
            % )
          </div>
        </div>
      </div>

      {/* Position details */}
      <div className="relative flex justify-between text-xs">
        {/* Bull side */}
        <div className="space-y-1 text-left">
          <div className="font-medium text-black dark:text-gray-500">
            Bull Position
          </div>
          <div className="font-semibold text-black dark:text-gray-500">
            {pool.bullBalance.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}{" "}
            tokens
          </div>
        </div>

        {/* Bear side */}
        <div className="space-y-1 text-right">
          <div className="font-medium text-gray-400 dark:text-white">
            Bear Position
          </div>
          <div className="font-semibold text-gray-400 dark:text-gray-50">
            {pool.bearBalance.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}{" "}
            tokens
          </div>
        </div>
      </div>
    </div>
  );
};

// Chart component for bull/bear positions
const PositionChart = ({
  data,
  title,
  type,
  showDistribution,
  onToggleView,
}: {
  data: any[];
  title: string;
  type: "bull" | "bear";
  showDistribution: boolean;
  onToggleView: () => void;
}) => {
  const colors = type === "bull" ? BULL_COLORS : BEAR_COLORS;
  const dataKey = type === "bull" ? "bullCurrentValue" : "bearCurrentValue";
  const nameKey = "name";

  return (
    <Card className="border-black dark:border-neutral-700/60 dark:bg-gradient-to-br dark:from-neutral-800/50 dark:to-neutral-900/50 backdrop-blur-sm shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl text-neutral-900 dark:text-neutral-100 mb-2 flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  type === "bull" ? "bg-gray-800" : "bg-gray-300"
                }`}
              />
              {title}
            </CardTitle>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Your {type} positions across {data.length} pool
              {data.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleView}
            className="border-neutral-300/60 dark:border-neutral-600/60 hover:bg-yellow-50 dark:hover:bg-yellow-950/30 transition-all duration-200"
          >
            {showDistribution ? (
              <PieChartIcon className="h-4 w-4 mr-2" />
            ) : (
              <BarChart3 className="h-4 w-4 mr-2" />
            )}
            {showDistribution ? "Pie View" : "Bar View"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {showDistribution ? (
            <BarChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e5e5"
                strokeOpacity={0.3}
              />
              <XAxis
                dataKey={nameKey}
                stroke="#737373"
                fontSize={12}
                tickFormatter={(name) =>
                  name.length > 10 ? `${name.substring(0, 10)}...` : name
                }
              />
              <YAxis stroke="#737373" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid #e5e5e5",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  color: "#000",
                }}
                formatter={(value: number) => [
                  `${value.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 4,
                  })} SUI`,
                  "Value",
                ]}
              />
              <Bar dataKey={dataKey} radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey={dataKey}
                stroke="#000"
                strokeWidth={2}
                legendType="circle"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [
                  `${value.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 4,
                  })} SUI`,
                  "Value",
                ]}
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid #e5e5e5",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  stroke: "#000",
                  color: "#000",
                  strokeWidth: 2,
                }}
              />
            </PieChart>
          )}
        </ResponsiveContainer>
        <div className="flex justify-center gap-6 mt-4 flex-wrap">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded shadow-sm"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Individual pool data loader component
const PoolDataLoader = ({
  poolId,
  index,
  userAddress,
  onDataLoad,
}: {
  poolId: string;
  index: number;
  userAddress?: string;
  onDataLoad: (data: PoolData) => void;
}) => {
  const { pool, userBalances, userAvgPrices, loading, error } = usePool(
    poolId,
    userAddress
  );

  useEffect(() => {
    if (loading || error || !pool || !userBalances) return;

    // Convert from wei - using correct field names from usePool hook
    const bullReserve = safeNumber(pool.bull_reserve) / WEI_DIVISOR;
    const bearReserve = safeNumber(pool.bear_reserve) / WEI_DIVISOR;

    // Get supply from token fields (correct structure based on usePool)
    const bullSupply =
      safeNumber(pool.bull_token?.fields?.total_supply) / WEI_DIVISOR;
    const bearSupply =
      safeNumber(pool.bear_token?.fields?.total_supply) / WEI_DIVISOR;

    const userBullTokens = safeNumber(userBalances.bull_tokens) / WEI_DIVISOR;
    const userBearTokens = safeNumber(userBalances.bear_tokens) / WEI_DIVISOR;
    const bullAvgPrice = safeNumber(userAvgPrices?.bull_avg_price);
    const bearAvgPrice = safeNumber(userAvgPrices?.bear_avg_price);

    console.log("Pool data processing:", {
      poolId,
      poolName: pool.name,
      bullReserve,
      bearReserve,
      bullSupply,
      bearSupply,
      userBullTokens,
      userBearTokens,
      bullAvgPrice,
      bearAvgPrice,
    });

    const bullMetrics = calculateTokenMetrics(
      bullReserve,
      bullSupply,
      userBullTokens,
      bullAvgPrice
    );
    const bearMetrics = calculateTokenMetrics(
      bearReserve,
      bearSupply,
      userBearTokens,
      bearAvgPrice
    );

    const poolData: PoolData = {
      id: poolId,
      name: pool.name || `Pool ${index + 1}`,
      bullBalance: userBullTokens,
      bearBalance: userBearTokens,
      bullCurrentValue: bullMetrics.currentValue,
      bearCurrentValue: bearMetrics.currentValue,
      totalValue: bullMetrics.currentValue + bearMetrics.currentValue,
      totalCostBasis: bullMetrics.costBasis + bearMetrics.costBasis,
      bullPnL: bullMetrics.pnL,
      bearPnL: bearMetrics.pnL,
      totalPnL: bullMetrics.pnL + bearMetrics.pnL,
      bullPrice: bullMetrics.price,
      bearPrice: bearMetrics.price,
      bullAvgPrice,
      bearAvgPrice,
      bullReturns: bullMetrics.returns,
      bearReturns: bearMetrics.returns,
      color: CHART_COLORS[index % CHART_COLORS.length],
      bullColor: BULL_COLORS[index % BULL_COLORS.length],
      bearColor: BEAR_COLORS[index % BEAR_COLORS.length],
      hasPositions: userBullTokens > 0 || userBearTokens > 0,
      hasBullPosition: userBullTokens > 0,
      hasBearPosition: userBearTokens > 0,
      bullReserve,
      bearReserve,
      bullSupply,
      bearSupply,
    };

    console.log("Processed pool data:", poolData);
    onDataLoad(poolData);
  }, [
    loading,
    error,
    pool,
    userBalances,
    userAvgPrices,
    poolId,
    index,
    onDataLoad,
  ]);

  // Show individual loading errors for debugging
  if (error) {
    console.error(`Error loading pool ${poolId}:`, error);
  }

  return null;
};

// Main component
export default function PortfolioPage() {
  const { account } = useWallet();
  const stickyRef = useRef<HTMLElement | null>(null);
  const [showBullDistribution, setShowBullDistribution] = useState(false);
  const [showBearDistribution, setShowBearDistribution] = useState(false);
  const [userPoolIds, setUserPoolIds] = useState<string[]>([]);
  const [poolsData, setPoolsData] = useState<PoolData[]>([]);
  const [loadedPoolsCount, setLoadedPoolsCount] = useState(0);
  const [registryError, setRegistryError] = useState<string>("");

  // Fetch user pools from registry
  const fetchUserPoolsFromRegistry = useCallback(async (): Promise<
    string[]
  > => {
    if (!account?.address) return [];

    try {
      console.log("Fetching pools for address:", account.address);
      const client = new SuiClient({
        url: "https://fullnode.testnet.sui.io:443",
      });

      // First, check if user exists
      const checkUserTx = new Transaction();
      checkUserTx.moveCall({
        target: `${PACKAGE_ID}::user_registry::user_exists`,
        arguments: [
          checkUserTx.object(USER_REGISTRY),
          checkUserTx.pure.address(account.address),
        ],
      });

      const userExistsResponse = await client.devInspectTransactionBlock({
        transactionBlock: checkUserTx,
        sender: account.address,
      });

      console.log("User exists response:", userExistsResponse);

      // Check user stats
      const statsTx = new Transaction();
      statsTx.moveCall({
        target: `${PACKAGE_ID}::user_registry::get_user_stats`,
        arguments: [
          statsTx.object(USER_REGISTRY),
          statsTx.pure.address(account.address),
        ],
      });

      const statsResponse = await client.devInspectTransactionBlock({
        transactionBlock: statsTx,
        sender: account.address,
      });

      console.log("User stats response:", statsResponse);

      if (statsResponse.results?.[0]?.returnValues) {
        const totalPoolsBytes = Uint8Array.from(
          statsResponse.results[0].returnValues[0][0]
        );
        const totalPagesBytes = Uint8Array.from(
          statsResponse.results[0].returnValues[1][0]
        );

        const totalPools = bcs.u64().parse(totalPoolsBytes);
        const totalPages = bcs.u32().parse(totalPagesBytes);

        console.log(`User has ${totalPools} pools across ${totalPages} pages`);
      }

      let allPoolIds: string[] = [];
      let currentPage = 0;
      let hasNextPage = true;

      while (hasNextPage) {
        const tx = new Transaction();

        tx.moveCall({
          target: `${PACKAGE_ID}::user_registry::get_user_pools_paginated`,
          arguments: [
            tx.object(USER_REGISTRY),
            tx.pure.address(account.address),
            tx.pure.u32(currentPage),
          ],
        });

        const response = await client.devInspectTransactionBlock({
          transactionBlock: tx,
          sender: account.address,
        });

        console.log(`Registry response page ${currentPage}:`, response);

        if (response.error) {
          console.error("Registry call error:", response.error);
          setRegistryError(response.error);
          return allPoolIds;
        }

        const returnValues = response.results?.[0]?.returnValues;
        if (!returnValues || returnValues.length < 4) {
          console.log("No return values or invalid format");
          break;
        }

        const poolsBytes = Uint8Array.from(returnValues[0][0]);
        const hasNextBytes = Uint8Array.from(returnValues[1][0]);
        const totalPagesBytes = Uint8Array.from(returnValues[2][0]);
        const totalPoolsBytes = Uint8Array.from(returnValues[3][0]);

        const pagePoolIds = bcs.vector(bcs.Address).parse(poolsBytes);
        hasNextPage = bcs.bool().parse(hasNextBytes);
        const totalPages = bcs.u32().parse(totalPagesBytes);
        const totalPools = bcs.u64().parse(totalPoolsBytes);

        console.log(
          `Page ${currentPage}: ${pagePoolIds.length} pools, hasNext: ${hasNextPage}, totalPages: ${totalPages}, totalPools: ${totalPools}`
        );

        allPoolIds = [...allPoolIds, ...pagePoolIds];
        currentPage++;

        if (currentPage >= totalPages || !hasNextPage) {
          break;
        }
      }

      console.log("Total fetched pool IDs:", allPoolIds);
      setRegistryError("");
      return allPoolIds;
    } catch (err: any) {
      console.error("Error fetching pools from registry:", err);
      setRegistryError(err?.message || "Failed to fetch pools");
      return [];
    }
  }, [account?.address]);

  useEffect(() => {
    let isMounted = true;

    const loadUserPools = async () => {
      const poolIds = await fetchUserPoolsFromRegistry();
      if (isMounted) {
        setUserPoolIds(poolIds);
        setPoolsData([]);
        setLoadedPoolsCount(0);
        console.log("Set user pool IDs:", poolIds);
      }
    };

    if (account?.address) {
      loadUserPools();
    } else {
      setUserPoolIds([]);
      setPoolsData([]);
      setLoadedPoolsCount(0);
      setRegistryError("");
    }

    return () => {
      isMounted = false;
    };
  }, [account?.address, fetchUserPoolsFromRegistry]);

  // Handle pool data loading
  const handlePoolDataLoad = useCallback((data: PoolData) => {
    console.log("Received pool data:", data);
    setPoolsData((prev) => {
      const existingIndex = prev.findIndex((p) => p.id === data.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = data;
        return updated;
      } else {
        setLoadedPoolsCount((prevCount) => prevCount + 1);
        return [...prev, data];
      }
    });
  }, []);

  // Calculate portfolio statistics
  const {
    activePoolsData,
    bullPositionsData,
    bearPositionsData,
    totalPortfolioValue,
    totalPnL,
    totalReturnPercentage,
  } = useMemo(() => {
    const activePoolsData = poolsData.filter((pool) => pool.hasPositions);
    const bullPositionsData = poolsData.filter((pool) => pool.hasBullPosition);
    const bearPositionsData = poolsData.filter((pool) => pool.hasBearPosition);

    const totalPortfolioValue = activePoolsData.reduce(
      (sum, pool) => sum + pool.totalValue,
      0
    );
    const totalCostBasis = activePoolsData.reduce(
      (sum, pool) => sum + pool.totalCostBasis,
      0
    );
    const totalPnL = activePoolsData.reduce(
      (sum, pool) => sum + pool.totalPnL,
      0
    );
    const totalReturnPercentage =
      totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0;

    return {
      activePoolsData,
      bullPositionsData,
      bearPositionsData,
      totalPortfolioValue,
      totalCostBasis,
      totalPnL,
      totalReturnPercentage,
    };
  }, [poolsData]);

  const isLoading =
    userPoolIds.length > 0 && loadedPoolsCount < userPoolIds.length;

  if (!account?.address) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4">
          <Card className="p-8 text-center max-w-md border-black dark:border-neutral-700/60 shadow-xl bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm">
            <div className="mb-6">
              <Wallet className="h-12 w-12 mx-auto text-yellow-500 dark:text-yellow-400 mb-4" />
              <CardTitle className="text-xl mb-2 text-neutral-900 dark:text-neutral-100">
                Connect Your Wallet
              </CardTitle>
              <p className="text-neutral-600 dark:text-neutral-400">
                Connect your wallet to view your portfolio and manage your
                positions
              </p>
            </div>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <AppLoader minDuration={500}>
        <Navbar />
        <StickyCursor stickyRef={stickyRef} />
        <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-white p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Debug Info */}
            {registryError && (
              <Card className="border-red-200/60 dark:border-red-800/60 bg-gradient-to-r from-red-50/80 to-red-100/60 dark:from-red-900/20 dark:to-red-800/20 backdrop-blur-sm p-4 shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <p className="text-red-700 dark:text-red-400 text-sm font-medium">
                    Registry Error: {registryError}
                  </p>
                </div>
              </Card>
            )}

            {/* Loading state */}
            {isLoading && (
              <AppLoader minDuration={300}>
                <div className="text-center text-neutral-600 dark:text-neutral-400">
                  Loading your pools...
                </div>
              </AppLoader>
            )}

            {/* Pool Data Loaders - Hidden components that load data */}
            {userPoolIds.map((poolId, index) => (
              <PoolDataLoader
                key={poolId}
                poolId={poolId}
                index={index}
                userAddress={account?.address}
                onDataLoad={handlePoolDataLoad}
              />
            ))}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SummaryCard
                title="Total Portfolio Value"
                value={`${totalPortfolioValue.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 4,
                })} SUI`}
                icon={DollarSign}
                trend="neutral"
              />
              <SummaryCard
                title="Total P&L"
                value={`${totalPnL >= 0 ? "+" : ""}${totalPnL.toLocaleString(
                  undefined,
                  {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 4,
                  }
                )} SUI`}
                icon={totalPnL >= 0 ? TrendingUp : TrendingDown}
                trend={totalPnL >= 0 ? "up" : "down"}
              />
              <SummaryCard
                title="Total Return %"
                value={`${
                  totalReturnPercentage >= 0 ? "+" : ""
                }${totalReturnPercentage.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}%`}
                icon={Activity}
                trend={totalReturnPercentage >= 0 ? "up" : "down"}
              />
            </div>

            {activePoolsData.length > 0 ? (
              <div className="space-y-6">
                {/* Bull and Bear Position Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                  {/* Bull Positions Chart */}
                  <PositionChart
                    data={bullPositionsData}
                    title="Bull Positions"
                    type="bull"
                    showDistribution={showBullDistribution}
                    onToggleView={() =>
                      setShowBullDistribution(!showBullDistribution)
                    }
                  />
                  {/* Positions List */}
                  <Card className="border-black xl:col-span-1  dark:border-neutral-700/60 dark:bg-gradient-to-br dark:from-neutral-800/50 dark:to-neutral-900/50 backdrop-blur-sm shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-xl text-neutral-900 dark:text-neutral-100 mb-2">
                        Positions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 max-h-[400px] overflow-y-auto overflow-x-hidden">
                        {activePoolsData.map((pool, index) => (
                          <div
                            key={pool.id}
                            className="animate-in slide-in-from-bottom-4 duration-300"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            <PositionCard pool={pool} />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  {/* Bear Positions Chart */}
                  <PositionChart
                    data={bearPositionsData}
                    title="Bear Positions"
                    type="bear"
                    showDistribution={showBearDistribution}
                    onToggleView={() =>
                      setShowBearDistribution(!showBearDistribution)
                    }
                  />
                </div>
              </div>
            ) : !isLoading ? (
              <Card className="border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 p-8 text-center">
                <CardTitle className="text-neutral-900 dark:text-neutral-100 mb-2">
                  No Active Positions
                </CardTitle>
                <p className="text-neutral-600 dark:text-neutral-400">
                  {userPoolIds.length === 0
                    ? "You don't have any pools in the registry yet."
                    : "You don't have any active positions in your pools yet."}
                </p>
              </Card>
            ) : null}
          </div>
        </div>
        <Footer />
      </AppLoader>
    </>
  );
}
