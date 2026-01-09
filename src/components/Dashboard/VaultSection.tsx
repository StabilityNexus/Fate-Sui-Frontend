/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useBuyTokens } from "@/fateHooks/useBuyTokens";
import { useSellTokens } from "@/fateHooks/useSellTokens";

interface VaultSectionProps {
  isBull: boolean;
  poolData: {
    id: string;
    asset_id: string;
    bull_reserve: number;
    bear_reserve: number;
    bull_supply: number;
    bear_supply: number;
  };
  userTokens: number;
  price: number;
  value: number;
  returns: number;
  symbol: string;
  connected: boolean;
  handlePoll: () => Promise<any>;
}

const VaultSection = ({
  isBull,
  poolData,
  userTokens,
  price,
  value,
  returns,
  symbol,
  connected,
  handlePoll,
}: VaultSectionProps) => {
  const { buyTokens } = useBuyTokens();
  const { sellTokens } = useSellTokens();

  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [isBuyLoading, setIsBuyLoading] = useState(false);
  const [isSellLoading, setIsSellLoading] = useState(false);
  const [buyError, setBuyError] = useState("");
  const [sellError, setSellError] = useState("");

  const formatNumber = (n: number, decimals = 9) => {
    if (!isFinite(n) || isNaN(n)) return "0";
    const rounded = Number(n.toFixed(decimals));
    let s = rounded.toString();
    if (s.indexOf("e") !== -1) s = rounded.toFixed(decimals);
    if (s.indexOf(".") >= 0) s = s.replace(/\.?0+$/, "");
    return s;
  };

  const validateInput = (value: string, max?: number) => {
    if (value === "") return { isValid: true, error: "" };

    if (!/^\d*\.?\d*$/.test(value)) {
      return { isValid: false, error: "Please enter a valid number" };
    }

    const num = parseFloat(value);
    if (isNaN(num)) {
      return { isValid: false, error: "Please enter a valid number" };
    }

    if (num < 0) {
      return { isValid: false, error: "Amount must be positive" };
    }

    if (num === 0) {
      return { isValid: false, error: "Amount must be greater than 0" };
    }

    if (max !== undefined) {
      const scale = 10000000000;
      const numScaled = num * scale;
      const maxScaled = max * scale;

      if (numScaled - maxScaled > Number.EPSILON) {
        return {
          isValid: false,
          error: `Maximum amount is ${max}`,
        };
      }
    }

    return { isValid: true, error: "" };
  };

  const handleBuy = async () => {
    const validation = validateInput(buyAmount);
    if (!validation.isValid) {
      setBuyError(validation.error);
      return;
    }

    setIsBuyLoading(true);
    setBuyError("");

    try {
      await buyTokens({
        amount: parseFloat(buyAmount),
        isBull,
        vaultId: poolData.id,
        assetId: poolData.asset_id,
      });
      setBuyAmount("");
    } catch (err: any) {
      setBuyError(err?.message || `Failed to buy ${symbol} tokens`);
    } finally {
      setIsBuyLoading(false);
    }
    await handlePoll();
  };

  const handleSell = async () => {
    const validation = validateInput(sellAmount, userTokens);
    if (!validation.isValid) {
      setSellError(validation.error);
      return;
    }

    setIsSellLoading(true);
    setSellError("");

    try {
      await sellTokens({
        amount: parseFloat(sellAmount),
        isBull,
        vaultId: poolData.id,
      });
      setSellAmount("");
    } catch (err: any) {
      setSellError(err?.message || `Failed to sell ${symbol} tokens`);
    } finally {
      setIsSellLoading(false);
    }
    await handlePoll();
  };

  const handleBuyAmountChange = (value: string) => {
    setBuyAmount(value);
    const validation = validateInput(value);
    setBuyError(validation.isValid ? "" : validation.error || "Invalid input");
  };

  const handleSellAmountChange = (value: string) => {
    setSellAmount(value);
    const validation = validateInput(value, userTokens);
    setSellError(validation.isValid ? "" : validation.error || "Invalid input");
  };

  const StatRow = ({
    label,
    value,
    valueClass = "font-semibold text-neutral-900 dark:text-white",
    children,
  }: {
    label: string;
    value?: string;
    valueClass?: string;
    children?: React.ReactNode;
  }) => (
    <div className="grid grid-cols-[auto_1fr] items-center gap-4 py-2 px-1 min-w-0">
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
        {label}
      </span>

      {value ? (
        <span
          className={`text-sm text-right whitespace-nowrap overflow-hidden tabular-nums ${valueClass}`}
        >
          {value}
        </span>
      ) : (
        <div className="text-right">{children}</div>
      )}
    </div>
  );

  return (
    <div className="border rounded-xl border-black dark:border-neutral-600 bg-white dark:bg-neutral-900 shadow-sm">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-black dark:border-neutral-700">
          {isBull ? (
            <div className="p-2 rounded-lg bg-black">
              <TrendingUp className="w-5 h-5 text-white dark:text-white" />
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-gray-300 dark:bg-white">
              <TrendingDown className="w-5 h-5 text-white dark:text-black" />
            </div>
          )}
          <div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
              {isBull ? "Bull" : "Bear"} Vault
            </h3>
          </div>
        </div>

        {/* Market Stats */}
        <div className="space-y-2 mb-6">
          <StatRow
            label="Reserve"
            value={`${formatNumber(
              isBull
                ? poolData.bull_reserve / 1e9
                : poolData.bear_reserve / 1e9,
              6
            )} SUI`}
          />
          <StatRow
            label="Supply"
            value={`${formatNumber(
              isBull ? poolData.bull_supply / 1e9 : poolData.bear_supply / 1e9,
              6
            )} ${symbol}`}
          />
          <StatRow
            label="Price"
            value={`${formatNumber(price, 6)} SUI`}
            valueClass="font-bold text-lg text-neutral-900 dark:text-white"
          />
        </div>

        {/* User Portfolio */}
        {connected && (
          <div className="bg-neutral-200 dark:bg-neutral-800 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white mb-3 uppercase tracking-wide">
              Your Position
            </h4>
            <div className="space-y-1">
              <StatRow
                label="Tokens"
                value={` ${formatNumber(userTokens, 6)} ${symbol}`}
              />
              <StatRow label="Value" value={` ${formatNumber(value, 6)} SUI`} />
              <StatRow
                label="P&L"
                value={` ${returns >= 0 ? "+" : ""}${formatNumber(
                  returns,
                  2
                )}%`}
                valueClass={`font-bold text-lg ${
                  returns >= 0 ? "text-green-600" : "text-red-600"
                }`}
              />
            </div>
          </div>
        )}

        {connected ? (
          <>
            {/* Buy Section */}
            <div className="space-y-3 mb-6">
              <label className="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wide">
                Buy {symbol}
              </label>
              <Input
                type="text"
                placeholder="Enter SUI amount"
                value={buyAmount}
                onChange={(e) => handleBuyAmountChange(e.target.value)}
                className="bg-white dark:bg-neutral-800 border-black dark:border-neutral-600 text-neutral-900 dark:text-white placeholder-neutral-500 focus:border-neutral-900 dark:focus:border-white"
              />

              {/* Buy Error Display */}
              {buyError && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800">
                  {buyError}
                </div>
              )}

              <Button
                className={`w-full font-semibold py-3 text-white dark:text-neutral-100 transition-all duration-200 ${
                  isBull
                    ? "bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-900 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:active:bg-neutral-800"
                    : "bg-neutral-300 hover:bg-neutral-200 active:bg-neutral-400 text-neutral-800 dark:bg-neutral-600 dark:hover:bg-neutral-500 dark:active:bg-neutral-700 dark:text-neutral-100"
                } ${
                  isBuyLoading ||
                  !buyAmount ||
                  parseFloat(buyAmount || "0") <= 0
                    ? "opacity-50 cursor-not-allowed"
                    : "shadow-lg hover:shadow-xl"
                }`}
                onClick={handleBuy}
                disabled={
                  isBuyLoading ||
                  !buyAmount ||
                  parseFloat(buyAmount || "0") <= 0
                }
              >
                {isBuyLoading && (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                )}
                Buy {symbol} Tokens
              </Button>
            </div>

            {/* Sell Section */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wide">
                Sell {symbol}
              </label>
              <Input
                type="text"
                placeholder="Enter token amount"
                value={sellAmount}
                onChange={(e) => handleSellAmountChange(e.target.value)}
                className="bg-white dark:bg-neutral-800 border-black dark:border-neutral-600 text-neutral-900 dark:text-white placeholder-neutral-500 focus:border-neutral-900 dark:focus:border-white"
              />

              {/* Sell Error Display */}
              {sellError && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800">
                  {sellError}
                </div>
              )}

              {/* Max button */}
              {userTokens > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 px-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  onClick={() => handleSellAmountChange(userTokens.toString())}
                >
                  Max: {userTokens}
                </Button>
              )}

              <Button
                variant="outline"
                className={`w-full font-semibold py-3 transition-all duration-200 ${
                  isBull
                    ? "border-neutral-800 text-neutral-800 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800/10"
                    : "border-black text-neutral-600 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-400 dark:hover:bg-neutral-700/10"
                } ${
                  isSellLoading ||
                  !sellAmount ||
                  parseFloat(sellAmount || "0") <= 0 ||
                  parseFloat(sellAmount || "0") > userTokens
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:shadow-md"
                } border-2`}
                onClick={handleSell}
                disabled={
                  isSellLoading ||
                  !sellAmount ||
                  parseFloat(sellAmount || "0") <= 0 ||
                  parseFloat(sellAmount || "0") > userTokens
                }
              >
                {isSellLoading && (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                )}
                Sell {symbol} Tokens
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-6 p-4 bg-neutral-100 dark:bg-neutral-800 border-2 border-dashed border-black dark:border-neutral-600 rounded-lg">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 text-center">
              Connect your wallet to start trading
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VaultSection;