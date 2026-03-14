import React from "react";
import { RangeSlider } from "./RangeSlider";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";

interface PredictionCardProps {
  name: string;
  description: string;
  bullCoinSymbol: string;
  bearCoinSymbol: string;
  bullPercentage: number;
  bearPercentage: number;
  volume?: string;
  participants?: number;
  onUse?: () => void;
}

export function PredictionCard({
  name,
  description,
  bullCoinSymbol,
  bearCoinSymbol,
  bullPercentage,
  bearPercentage,
  onUse,
}: PredictionCardProps) {
  return (
    <div className="w-full max-w-sm bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-300 overflow-hidden border border-neutral-200 dark:border-neutral-800">
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white truncate">{name}</h2>
        <p className="text-neutral-400 dark:text-neutral-500 text-xs mt-0.5 line-clamp-2">{description}</p>
      </div>

      {/* Token Rows */}
      <div className="px-5 pb-2 space-y-3">
        {/* Bull Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white leading-tight">{bullCoinSymbol}</p>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500">BullTKN</p>
            </div>
          </div>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {bullPercentage.toFixed(1)}%
          </span>
        </div>

        {/* Bear Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
              <TrendingDown size={16} className="text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white leading-tight">{bearCoinSymbol}</p>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500">BearTKN</p>
            </div>
          </div>
          <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
            {bearPercentage.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Bar + Button */}
      <div className="px-5 pb-5 pt-3">
        <RangeSlider value={bullPercentage} onChange={() => {}} />

        <button
          onClick={onUse}
          className="w-full mt-4 py-2.5 px-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-200 rounded-xl text-sm font-medium
                   flex items-center justify-center gap-2 transition-all duration-200
                   hover:bg-neutral-200 dark:hover:bg-neutral-700
                   focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-600"
        >
          Enter Pool
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
