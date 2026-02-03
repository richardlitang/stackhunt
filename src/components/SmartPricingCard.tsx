/**
 * Smart Pricing Card - Shows normalized, apples-to-apples pricing
 *
 * V4: Splits UI based on pricing model:
 * - Case A (per_seat, flat, tiered): Plan Cards layout
 * - Case B (usage_based, ad_spend): Rate Card layout with Unit Price
 * - Case C (hybrid): Base subscription + Usage Fees section
 *
 * Features:
 * - Accounts for minimum seats
 * - Shows per-user/per-contact pricing clearly
 * - Calculates cost for user's team size
 * - Handles contact-based pricing (email marketing tools)
 * - Displays caveats transparently
 * - Shows one-time fees badge
 */

import { useState, useEffect } from 'react';
import type { ToolSpecs, GearSpecs, SMPPricingData } from '@/types/database';
import { useTeamSize } from './TeamSizeSelector';
import { cn } from '@/lib/utils';
import {
  isTeamBasedPricing,
  formatScalingUnit,
  getScalingUnit,
  getScalingCategory,
  getScalingCategoryLabel,
  getScalingExplanation,
  getPricingModelLabel,
} from '@/lib/pricing/display';

/**
 * Categorize pricing model into UI display type
 */
type PricingDisplayType = 'subscription' | 'usage' | 'hybrid';

function getPricingDisplayType(model: SMPPricingData['model'] | undefined): PricingDisplayType {
  if (!model) return 'subscription';

  // Case B: Usage-based / Ad platforms - show Rate Card
  if (model === 'usage_based' || model === 'ad_spend' || model === 'per_unit') {
    return 'usage';
  }

  // Case C: Hybrid - show both
  if (model === 'hybrid') {
    return 'hybrid';
  }

  // Case A: Subscription models - show Plan Cards
  // Includes: per_seat, flat, tiered, free, freemium, contact_sales
  return 'subscription';
}

interface SmartPricingCardProps {
  item: {
    name: string;
    slug: string;
    effective_starting_price_monthly: number | null;
    normalized_price_per_seat_monthly: number | null;
    specs: ToolSpecs | GearSpecs | Record<string, unknown>;
    review_context?: {
      budget_analyst?: {
        one_time_fees?: string[];
      };
    };
  };
  className?: string;
  showCalculator?: boolean;
}

export default function SmartPricingCard({
  item,
  className,
  showCalculator = true
}: SmartPricingCardProps) {
  const teamSize = useTeamSize();
  const [calculatedCost, setCalculatedCost] = useState<number | null>(null);

  const specs = item.specs as ToolSpecs;
  const pricingData = specs?.pricing_data as SMPPricingData | undefined;
  const displayType = getPricingDisplayType(pricingData?.model);
  const isSeatBased = pricingData?.model === 'per_seat' || pricingData?.model === 'per_unit' || pricingData?.model === 'tiered';
  const isTeamBased = isTeamBasedPricing(pricingData);
  const scalingUnit = getScalingUnit(pricingData);
  const scalingCategory = getScalingCategory(scalingUnit);
  const minSeats = pricingData?.min_seats || 1;
  const effectiveStarting = item.effective_starting_price_monthly;
  const perSeat = item.normalized_price_per_seat_monthly;
  const firstPlan = pricingData?.plans?.[0];

  // Get one-time fees from budget analyst data
  const oneTimeFees = item.review_context?.budget_analyst?.one_time_fees || [];

  // Get variable pricing data (for usage/ad models)
  const variableUnit = firstPlan?.variable_unit;
  const variablePrice = firstPlan?.variable_price;
  const variableLogic = firstPlan?.variable_logic_desc;

  // Calculate cost for user's team size
  // Non-team-based pricing (contacts, GB, requests) doesn't scale with team size
  useEffect(() => {
    if (!isTeamBased) {
      // Non-team-based tools: use flat starting price
      setCalculatedCost(effectiveStarting !== null ? Number(effectiveStarting) : null);
    } else if (isSeatBased && perSeat !== null && perSeat !== undefined && teamSize) {
      const effectiveTeamSize = Math.max(teamSize, minSeats);
      setCalculatedCost(Number(perSeat) * effectiveTeamSize);
    } else if (effectiveStarting !== null && effectiveStarting !== undefined) {
      setCalculatedCost(Number(effectiveStarting));
    } else {
      setCalculatedCost(null);
    }
  }, [teamSize, isSeatBased, isTeamBased, perSeat, minSeats, effectiveStarting]);

  // No pricing data at all
  if (!effectiveStarting && displayType !== 'usage') {
    return (
      <div className={cn('rounded-xl border border-zinc-700 bg-zinc-900 p-5', className)}>
        <p className="text-sm text-zinc-400">Pricing information unavailable</p>
      </div>
    );
  }

  const hasCaveat = minSeats > 1;
  const needsMoreSeats = teamSize < minSeats;

  // ==========================================================================
  // CASE B: Usage-Based / Ad Platforms - "Rate Card" Layout
  // ==========================================================================
  if (displayType === 'usage') {
    return (
      <div className={cn('rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-4', className)}>
        {/* Rate Card Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 font-medium">
              {pricingData?.model === 'ad_spend' ? 'Ad Platform' : 'Pay-as-you-go'}
            </span>
          </div>

          {/* Unit Price (Primary Display for Usage Models) */}
          {variablePrice !== undefined && variablePrice !== null && variableUnit ? (
            <div>
              <div className="text-xs text-zinc-500 mb-1">Unit Price</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-zinc-100">
                  ${variablePrice < 0.01 ? variablePrice.toFixed(4) : variablePrice.toFixed(2)}
                </span>
                <span className="text-sm text-zinc-400">/ {variableUnit}</span>
              </div>
            </div>
          ) : effectiveStarting ? (
            <div>
              <div className="text-xs text-zinc-500 mb-1">Minimum Spend</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-zinc-100">
                  ${effectiveStarting}
                </span>
                <span className="text-sm text-zinc-400">/mo</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-zinc-400">Variable pricing - see details</div>
          )}
        </div>

        {/* Variable Pricing Logic */}
        {variableLogic && (
          <div className="pt-4 border-t border-zinc-800">
            <div className="text-xs text-zinc-500 mb-2">How pricing works</div>
            <div className="text-sm text-blue-300">
              {variableLogic}
            </div>
          </div>
        )}

        {/* Scaling Explanation */}
        <div className="pt-4 border-t border-zinc-800">
          <div className="text-xs text-zinc-500 mb-2">About this pricing model</div>
          <div className="text-sm text-zinc-400">
            {pricingData?.model === 'ad_spend'
              ? 'Costs scale with your advertising budget and campaign performance.'
              : `Costs scale with ${variableUnit || 'usage'} consumed.`}
          </div>
        </div>

        {/* One-Time Fees Badge */}
        {oneTimeFees.length > 0 && (
          <div className="pt-4 border-t border-zinc-800">
            <div className="flex flex-wrap gap-2">
              {oneTimeFees.map((fee, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded bg-amber-900/30 text-amber-400 border border-amber-700/50">
                  💰 {fee}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Pricing Model Badge */}
        {pricingData?.model && (
          <div className="pt-4 border-t border-zinc-800">
            <div className="inline-flex items-center px-2 py-1 rounded text-xs bg-zinc-800 text-zinc-400">
              {getPricingModelLabel(pricingData.model)}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================================================
  // CASE C: Hybrid - Base Subscription + Usage Fees
  // ==========================================================================
  if (displayType === 'hybrid') {
    return (
      <div className={cn('rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-4', className)}>
        {/* Base Subscription */}
        <div>
          <div className="text-xs text-zinc-500 mb-1">Base Subscription</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-zinc-100">
              ${effectiveStarting}
            </span>
            <span className="text-sm text-zinc-400">/mo</span>
          </div>

          {/* Per-seat breakdown if applicable */}
          {isTeamBased && isSeatBased && perSeat && (
            <div className="text-sm text-zinc-400 mt-1">
              ${perSeat}/{formatScalingUnit(scalingUnit)}/mo
            </div>
          )}
        </div>

        {/* Plus Usage Fees Section */}
        {(variablePrice || variableLogic) && (
          <div className="pt-4 border-t border-zinc-800 bg-purple-900/10 rounded-lg p-4 -mx-1">
            <div className="text-xs text-purple-400 font-medium mb-2">+ Usage Fees</div>
            {variablePrice !== undefined && variablePrice !== null && variableUnit && (
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold text-purple-300">
                  ${variablePrice < 0.01 ? variablePrice.toFixed(4) : variablePrice.toFixed(2)}
                </span>
                <span className="text-sm text-purple-400">/ {variableUnit}</span>
              </div>
            )}
            {variableLogic && (
              <div className="text-sm text-purple-300 mt-2">
                {variableLogic}
              </div>
            )}
          </div>
        )}

        {/* Team Calculator */}
        {showCalculator && calculatedCost !== null && teamSize > 1 && isTeamBased && (
          <div className="pt-4 border-t border-zinc-800">
            <div className="text-xs text-zinc-500 mb-2">
              Base cost for your team ({teamSize})
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-hunt-400">
                ${calculatedCost}
              </span>
              <span className="text-sm text-zinc-400">/mo + usage</span>
            </div>
          </div>
        )}

        {/* One-Time Fees Badge */}
        {oneTimeFees.length > 0 && (
          <div className="pt-4 border-t border-zinc-800">
            <div className="flex flex-wrap gap-2">
              {oneTimeFees.map((fee, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded bg-amber-900/30 text-amber-400 border border-amber-700/50">
                  💰 {fee}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Pricing Model Badge */}
        <div className="pt-4 border-t border-zinc-800">
          <div className="inline-flex items-center px-2 py-1 rounded text-xs bg-zinc-800 text-zinc-400">
            {getPricingModelLabel(pricingData?.model)}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // CASE A: Subscription Models - "Plan Cards" Layout (default)
  // ==========================================================================
  return (
    <div className={cn('rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-4', className)}>
      {/* Starting Price */}
      <div>
        <div className="text-xs text-zinc-500 mb-1">Starting from</div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-zinc-100">
            ${effectiveStarting}
          </span>
          <span className="text-sm text-zinc-400">/mo</span>
          {!isTeamBased && (
            <span className="text-xs px-2 py-0.5 rounded bg-purple-900/50 text-purple-300">
              {getScalingCategoryLabel(scalingCategory)}
            </span>
          )}
        </div>

        {/* Non-team-based pricing: show included units */}
        {!isTeamBased && firstPlan?.included_units && (
          <div className="text-sm text-purple-400 mt-1">
            Up to {firstPlan.included_units.toLocaleString()} {formatScalingUnit(scalingUnit, true)}
          </div>
        )}

        {/* Team-based pricing: show per-unit price */}
        {isTeamBased && isSeatBased && perSeat && (
          <div className="text-sm text-zinc-400 mt-1">
            ${perSeat}/{formatScalingUnit(scalingUnit)}/mo
          </div>
        )}

        {hasCaveat && (
          <div className="mt-2 text-xs text-amber-400 flex items-start gap-1">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Minimum {minSeats} {formatScalingUnit(scalingUnit, minSeats !== 1)} required</span>
          </div>
        )}
      </div>

      {/* Calculated Cost for User's Team Size (only for team-based pricing) */}
      {showCalculator && calculatedCost !== null && teamSize > 1 && isTeamBased && (
        <div className="pt-4 border-t border-zinc-800">
          <div className="text-xs text-zinc-500 mb-2">
            {needsMoreSeats ? (
              <span>Cost for {minSeats} {formatScalingUnit(scalingUnit, minSeats !== 1)} (minimum)</span>
            ) : (
              <span>Cost for your team ({teamSize})</span>
            )}
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-hunt-400">
              ${calculatedCost}
            </span>
            <span className="text-sm text-zinc-400">/mo</span>
          </div>

          {isSeatBased && perSeat && (
            <div className="text-xs text-zinc-500 mt-1">
              {Math.max(teamSize, minSeats)} {formatScalingUnit(scalingUnit, Math.max(teamSize, minSeats) !== 1)} × ${perSeat}/{formatScalingUnit(scalingUnit)}
            </div>
          )}

          {needsMoreSeats && (
            <div className="mt-2 text-xs text-amber-400">
              Your team ({teamSize}) is below the {minSeats}-{formatScalingUnit(scalingUnit)} minimum
            </div>
          )}
        </div>
      )}

      {/* Non-team-based pricing explanation */}
      {showCalculator && !isTeamBased && (
        <div className="pt-4 border-t border-zinc-800">
          <div className="text-xs text-zinc-500 mb-2">About pricing</div>
          <div className="text-sm text-purple-300">
            {getScalingExplanation(pricingData)}
          </div>
          <div className="text-xs text-zinc-500 mt-2">
            Adjust your plan based on how many {formatScalingUnit(scalingUnit, true)} you need
          </div>
        </div>
      )}

      {/* One-Time Fees Badge */}
      {oneTimeFees.length > 0 && (
        <div className="pt-4 border-t border-zinc-800">
          <div className="flex flex-wrap gap-2">
            {oneTimeFees.map((fee, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded bg-amber-900/30 text-amber-400 border border-amber-700/50">
                💰 {fee}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pricing Model Badge */}
      {pricingData?.model && (
        <div className="pt-4 border-t border-zinc-800">
          <div className="inline-flex items-center px-2 py-1 rounded text-xs bg-zinc-800 text-zinc-400">
            {getPricingModelLabel(pricingData.model)}
          </div>
        </div>
      )}
    </div>
  );
}
