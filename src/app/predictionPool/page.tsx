/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import {
  JSXElementConstructor,
  Key,
  ReactElement,
  ReactNode,
  ReactPortal,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery, useQueries, UseQueryResult } from "@tanstack/react-query";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Filter,
  X,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { useRouter } from "next/navigation";
import { Token } from "@/types/Token";
import { Pool } from "@/types/Pool";
import { Transaction } from "@mysten/sui/transactions";
import StickyCursor from "@/components/StickyCursor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ASSET_CONFIG } from "@/config/assets";
import { bcs } from "@mysten/sui/bcs";
import toast from "react-hot-toast";
import { PROTOCOL_ADDRESSES_TESTNET } from "@/config/protocol";

interface EnhancedPool extends Pool {
  total_fees: number;
  asset_name: string;
  total_liquidity: number;
  volume_24h?: number;
  apr?: number;
}

interface FilterState {
  maxError: any;
  minError: any;
  asset: string;
  minLiquidity: number;
  maxLiquidity: number;
  minFees: number;
  maxFees: number;
  creator: string;
}

const ExploreFatePools = () => {
  const stickyRef = useRef<HTMLElement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const PACKAGE_ID = PROTOCOL_ADDRESSES_TESTNET.PACKAGE_ID;
  const POOL_REGISTRY_ID = PROTOCOL_ADDRESSES_TESTNET.POOL_REGISTRY;
  const [filters, setFilters] = useState<FilterState>({
    asset: "",
    minLiquidity: 0,
    maxLiquidity: 0,
    minFees: 0,
    maxFees: 0,
    creator: "",
    minError: null,
    maxError: null,
  });

  const router = useRouter();
  const client = useMemo(
    () => new SuiJsonRpcClient({ url: "https://fullnode.testnet.sui.io", network: "testnet" }),
    []
  );

  const formatNumber = (num: number) => {
    const val = num / 1e9;
    return `${parseFloat(val.toFixed(3))} SUI`;
  };

  const toIntSafe = (v: any, def = 0) => {
    const n = typeof v === "string" ? parseInt(v, 10) : Number(v);
    return Number.isFinite(n) ? n : def;
  };

  const bytesToHex0x = (arr?: number[] | string) => {
    if (!arr) return "";
    if (typeof arr === "string") return arr;
    return "0x" + arr.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const fetchPoolsFromRegistry = async (): Promise<string[]> => {
    if (!PACKAGE_ID || !POOL_REGISTRY_ID) {
      throw new Error("Missing PACKAGE_ID or POOL_REGISTRY_ID");
    }

    try {
      const client = new SuiJsonRpcClient({
        url: "https://fullnode.testnet.sui.io:443",
        network: "testnet",
      });

      const registryObject = await client.getObject({
        id: POOL_REGISTRY_ID,
        options: { showContent: true },
      });

      if (
        !registryObject.data?.content ||
        !("fields" in registryObject.data.content)
      ) {
        console.warn("Could not fetch registry object");
        return [];
      }

      const registryFields = (registryObject.data.content as any).fields;
      const totalPools = parseInt(registryFields.total_pools || "0", 10);
      const poolsPerPage = parseInt(registryFields.pools_per_page || "50", 10);

      if (totalPools === 0) {
        console.log("Registry reports 0 pools");
        return [];
      }

      const totalPages = Math.ceil(totalPools / poolsPerPage);
      console.log(
        `Registry has ${totalPools} pools across ${totalPages} pages (${poolsPerPage} pools per page)`
      );

      const allPoolIds: string[] = [];

      for (let pageNumber = 0; pageNumber < totalPages; pageNumber++) {
        try {
          const tx = new Transaction();
          tx.moveCall({
            target: `${PACKAGE_ID}::pool_registry::get_pools_from_page`,
            arguments: [tx.object(POOL_REGISTRY_ID), tx.pure.u32(pageNumber)],
          });

          const pageResponse = await client.devInspectTransactionBlock({
            transactionBlock: tx,
            sender: "0x9bca5a227e7e4dfa48927ec6583b19aac55c29f00a39330aec60356a101886ba",
          });

          const pageResult = pageResponse.results?.[0]?.returnValues?.[0];
          if (!pageResult) {
            console.warn(`No result for page ${pageNumber}`);
            continue;
          }

          const poolsInPage = bcs
            .vector(bcs.Address)
            .parse(Uint8Array.from(pageResult[0]));

          allPoolIds.push(...poolsInPage);
          console.log(`Page ${pageNumber}: found ${poolsInPage.length} pools`);
        } catch (pageErr) {
          console.warn(`Error fetching page ${pageNumber}:`, pageErr);
        }
      }

      console.log(`Total pools collected: ${allPoolIds.length}`);
      return allPoolIds;
    } catch (err) {
      console.error("Error fetching pools from registry:", err);
      throw err;
    }
  };

  // Query function to enhance individual pool data
  const enhancePoolData = async (
    poolId: string
  ): Promise<EnhancedPool | null> => {
    try {
      const response = await client.getObject({
        id: poolId,
        options: { showContent: true },
      });

      if (!response.data?.content || !("fields" in response.data.content)) {
        return null;
      }

      const fields = (response.data.content as any).fields;
      console.log("Enhancing pool:", poolId, JSON.stringify(fields));

      const name = fields.name || `Pool ${poolId.slice(-8)}`;
      const description = fields.description || "";
      const currentPrice = toIntSafe(fields.current_price, 0);
      const assetAddress =
        fields.pair_id || bytesToHex0x(fields.asset_id) || "";
      const creator = fields.pool_creator || "";

      // Calculate reserves and fees
      const bullReserve = toIntSafe(fields.bull_reserve, 0);
      const bearReserve = toIntSafe(fields.bear_reserve, 0);
      const totalLiquidity = bullReserve + bearReserve;

      const protocolFee = toIntSafe(fields.protocol_fee, 0);
      const mintFee = toIntSafe(fields.mint_fee, 0);
      const burnFee = toIntSafe(fields.burn_fee, 0);
      const creatorFee = toIntSafe(fields.pool_creator_fee, 0);
      const totalFees = protocolFee + mintFee + burnFee + creatorFee;

      // Calculate percentages
      const bullPercentage =
        totalLiquidity > 0 ? (bullReserve / totalLiquidity) * 100 : 50;
      const bearPercentage = 100 - bullPercentage;

      // Get asset info
      const assetInfo = ASSET_CONFIG[assetAddress] || {
        name: "Unknown",
        symbol: "UNK",
      };

      // Create token objects (simplified)
      const createToken = (
        tokenFields: any,
        type: "BULL" | "BEAR",
        reserve: number
      ): Token | undefined => {
        if (!tokenFields?.fields) return undefined;

        const f = tokenFields.fields;
        return {
          id: f.id?.id || "",
          name: f.name || `${type} Token`,
          symbol: f.symbol || type,
          balance: toIntSafe(f.total_supply, 0),
          price: 1,
          vault_creator: creator,
          vault_fee: 0,
          vault_creator_fee: 0,
          treasury_fee: 0,
          asset_balance: reserve,
          supply: toIntSafe(f.total_supply, 0),
          prediction_pool: poolId,
          other_token: "",
        };
      };

      const enhancedPool: EnhancedPool = {
        id: poolId,
        name,
        description,
        current_price: currentPrice,
        asset_id: assetAddress,
        creator,
        bullPercentage,
        bearPercentage,
        bull_reserve: bullReserve,
        bear_reserve: bearReserve,
        bullToken: createToken(fields.bull_token, "BULL", bullReserve),
        bearToken: createToken(fields.bear_token, "BEAR", bearReserve),
        created_at: Date.now(),
        total_fees: totalFees,
        asset_name: assetInfo.name,
        total_liquidity: totalLiquidity,
      };

      return enhancedPool;
    } catch (err) {
      console.error(`Error enhancing pool ${poolId}:`, err);
      return null;
    }
  };

  // React Query: Fetch pool IDs
  const {
    data: poolIds = [],
    isLoading: poolIdsLoading,
    error: poolIdsError,
  } = useQuery({
    queryKey: ["poolIds", PACKAGE_ID, POOL_REGISTRY_ID, '0x9bca5a227e7e4dfa48927ec6583b19aac55c29f00a39330aec60356a101886ba'],
    queryFn: fetchPoolsFromRegistry,
    enabled: !!(PACKAGE_ID && POOL_REGISTRY_ID),
    staleTime: 5 * 60 * 1000, 
    gcTime: 10 * 60 * 1000, 
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // React Query: Fetch individual pool data
  const poolQueries = useQueries({
    queries: poolIds.map((poolId: any) => ({
      queryKey: ["pool", poolId],
      queryFn: () => enhancePoolData(poolId),
      enabled: !!poolId,
      staleTime: 3 * 60 * 1000, // 3 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    })),
  });

  // Process pool queries results
  const pools = useMemo(() => {
    const validPools: EnhancedPool[] = poolQueries
      .filter(
        (query): query is UseQueryResult<EnhancedPool, Error> =>
          query.data !== null && query.data !== undefined
      )
      .map((query) => query.data!)
      .sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

    return validPools;
  }, [poolQueries]);

  // Check loading state
  const isLoading =
    poolIdsLoading ||
    poolQueries.some((query: { isLoading: any }) => query.isLoading);

  // Handle errors
  if (poolIdsError) {
    console.error("Error fetching pool IDs:", poolIdsError);
    toast.error("Error fetching pools");
  }

  const filteredPools = useMemo(() => {
    return pools.filter(
      (pool: {
        name: string;
        description: string;
        creator: string;
        asset_name: string;
        asset_id: string;
        total_liquidity: number;
        total_fees: number;
      }) => {
        const matchesSearch =
          pool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pool.creator.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pool.asset_name.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesAsset = !filters.asset || pool?.asset_id === filters.asset;
        const matchesCreator =
          !filters.creator ||
          pool.creator.toLowerCase().includes(filters.creator.toLowerCase());
        const matchesLiquidity =
          pool.total_liquidity >= filters.minLiquidity &&
          (filters.maxLiquidity === 0 ||
            pool.total_liquidity <= filters.maxLiquidity);
        const matchesFees =
          pool.total_fees >= filters.minFees &&
          (filters.maxFees === 0 || pool.total_fees <= filters.maxFees);

        return (
          matchesSearch &&
          matchesAsset &&
          matchesCreator &&
          matchesLiquidity &&
          matchesFees
        );
      }
    );
  }, [pools, searchQuery, filters]);

  const availableAssets = useMemo(() => {
    const assets = new Set(
      pools.map((pool: { asset_id: any }) => pool.asset_id)
    );
    return Array.from(assets).map((address) => ({
      address,
      ...(ASSET_CONFIG[Number(address)] || { name: "Unknown", symbol: "UNK" }),
    }));
  }, [pools]);

  const clearFilters = () => {
    setFilters({
      asset: "",
      minLiquidity: 0,
      maxLiquidity: 0,
      minFees: 0,
      maxFees: 0,
      creator: "",
      minError: null,
      maxError: null,
    });
  };

  return (
    <>
      <Navbar />
      <StickyCursor stickyRef={stickyRef} />

      <div className="min-h-screen bg-white dark:bg-black transition-colors duration-300 text-black dark:text-white ">
        <div className="max-w-full mx-auto px-4">
          {/* Header with Search and Stats */}
          <div className="mb-8">
            <div className="bg-neutral-50  dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-80">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 dark:text-neutral-400"
                    size={20}
                  />
                  <input
                    type="text"
                    placeholder="Search by name, price, creator..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all"
                  />
                </div>

                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-3 bg-black text-white dark:bg-white dark:text-black rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all"
                >
                  <Filter size={16} />
                  Filters
                </button>

                {/* Stats */}
                <div className="flex gap-8">
                  <div className="text-center">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Total Pools
                    </p>
                    <p className="text-2xl font-bold text-black dark:text-white">
                      {pools.length}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Filtered
                    </p>
                    <p className="text-2xl font-bold text-black dark:text-white">
                      {filteredPools.length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Filters Panel */}
              {showFilters && (
                <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Price
                      </label>
                      <Select
                        value={filters.asset || "all"}
                        onValueChange={(value) =>
                          setFilters((prev) => ({
                            ...prev,
                            asset: value === "all" ? "" : value,
                          }))
                        }
                      >
                        <SelectTrigger className="w-full p-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-neutral-700 dark:text-neutral-300">
                          <SelectValue placeholder="All Price" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-black text-neutral-700 dark:text-neutral-300">
                          <SelectItem value="all">All Price</SelectItem>
                          {availableAssets.map((asset) => (
                            <SelectItem
                              key={Number(asset.address)}
                              value={String(asset.address)}
                            >
                              {asset.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Min Value (SUI)
                      </label>

                      <Input
                        type="number"
                        value={
                          filters.minLiquidity ? filters.minLiquidity / 1e9 : ""
                        }
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setFilters((prev) => ({
                            ...prev,
                            minLiquidity: e.target.value === "" ? 0 : val * 1e9,
                            minError: val < 0 ? "Value cannot be negative" : "",
                          }));
                        }}
                        placeholder="0"
                      />

                      {filters.minError && (
                        <p className="text-red-500 text-sm mt-1">
                          {filters.minError}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Max Value (SUI)
                      </label>

                      <Input
                        type="number"
                        value={
                          filters.maxLiquidity === 0
                            ? ""
                            : filters.maxLiquidity / 1e9
                        }
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setFilters((prev) => ({
                            ...prev,
                            maxLiquidity: e.target.value === "" ? 0 : val * 1e9,
                            maxError: val < 0 ? "Value cannot be negative" : "",
                          }));
                        }}
                        placeholder="No limit"
                      />

                      {filters.maxError && (
                        <p className="text-red-500 text-sm mt-1">
                          {filters.maxError}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end mt-4">
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-2 px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-all"
                    >
                      <X size={16} />
                      Clear Filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Optimized Table */}
          <div className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Pool Info
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Price
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Value
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">
                      Bull/Bear
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array.from({ length: 4 }).map((_, j) => (
                          <td key={j} className="px-6 py-4">
                            <div className="h-4 bg-neutral-300 dark:bg-neutral-700 rounded w-20"></div>
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filteredPools.length > 0 ? (
                    filteredPools.map(
                      (pool: {
                        id: boolean | Key | null | undefined;
                        name:
                          | string
                          | number
                          | bigint
                          | boolean
                          | ReactElement<
                              unknown,
                              string | JSXElementConstructor<any>
                            >
                          | Iterable<ReactNode>
                          | ReactPortal
                          | Promise<
                              | string
                              | number
                              | bigint
                              | boolean
                              | ReactPortal
                              | ReactElement<
                                  unknown,
                                  string | JSXElementConstructor<any>
                                >
                              | Iterable<ReactNode>
                              | null
                              | undefined
                            >
                          | null
                          | undefined;
                        description: any;
                        asset_name:
                          | string
                          | number
                          | bigint
                          | boolean
                          | ReactElement<
                              unknown,
                              string | JSXElementConstructor<any>
                            >
                          | Iterable<ReactNode>
                          | ReactPortal
                          | Promise<
                              | string
                              | number
                              | bigint
                              | boolean
                              | ReactPortal
                              | ReactElement<
                                  unknown,
                                  string | JSXElementConstructor<any>
                                >
                              | Iterable<ReactNode>
                              | null
                              | undefined
                            >
                          | null
                          | undefined;
                        total_liquidity: number;
                        bull_reserve: number;
                        bear_reserve: number;
                        bullPercentage: number;
                        bearPercentage: number;
                      }) => (
                        <tr
                          key={Number(pool.id)}
                          className="hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
                          onClick={() =>
                            router.push(
                              `/predictionPool/pool?id=${encodeURIComponent(
                                String(pool.id)
                              )}`
                            )
                          }
                        >
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-black dark:text-white">
                                {pool.name}
                              </div>
                              <div className="text-sm text-neutral-600 dark:text-neutral-400 truncate max-w-xs">
                                {pool.description || "No description"}
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {pool.asset_name}
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="font-medium">
                              {formatNumber(pool.total_liquidity)}
                            </div>
                            <div className="text-xs text-neutral-500">
                              BULL: {formatNumber(pool.bull_reserve)} | BEAR:{" "}
                              {formatNumber(pool.bear_reserve)}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <TrendingUp className="w-4 h-4 text-black dark:text-gray-600" />
                                <span className="text-sm font-medium text-black dark:text-gray-600">
                                  {pool.bullPercentage.toFixed(1)}%
                                </span>
                              </div>
                              <span className="text-neutral-400">/</span>
                              <div className="flex items-center gap-1">
                                <TrendingDown className="w-4 h-4 text-gray-400 dark:text-white" />
                                <span className="text-sm font-medium text-gray-400 dark:text-white">
                                  {pool.bearPercentage.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    )
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="text-lg text-neutral-600 dark:text-neutral-400">
                            {searchQuery ||
                            Object.values(filters).some(
                              (f) => f !== "" && f !== 0
                            )
                              ? "No pools match your filters"
                              : "No prediction pools found"}
                          </div>
                          {!searchQuery &&
                            Object.values(filters).every(
                              (f) => f === "" || f === 0
                            ) && (
                              <button
                                className="px-6 py-3 bg-black text-white dark:bg-white dark:text-black rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all"
                                onClick={() =>
                                  router.push("/predictionPool/create")
                                }
                              >
                                Create the First Pool
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ExploreFatePools;
