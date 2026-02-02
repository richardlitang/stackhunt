/**
 * Pricing Comparison - Side-by-side apples-to-apples comparison
 *
 * Shows normalized pricing for multiple tools at the user's team size.
 * Highlights which is cheaper and by how much.
 *
 * Handles different pricing models:
 * - Per-seat: Scales with team size slider
 * - Contact-based: Flat rate (email marketing tools price by contacts, not team)
 * - Flat: Fixed price regardless of team size
 */

import { useState, useEffect } from 'react';
import type { ToolSpecs } from '@/types/database';
import { useTeamSize } from './TeamSizeSelector';
import { cn } from '@/lib/utils';
import {
  isTeamBasedPricing,
  formatScalingUnit,
  getScalingUnit,
  getScalingCategory,
  getScalingCategoryLabel,
} from '@/lib/pricing/display';

interface Tool {
  name: string;
  slug: string;
  effective_starting_price_monthly: number | null;
  normalized_price_per_seat_monthly: number | null;
  specs: ToolSpecs;
}

interface PricingComparisonProps {
  tools: Tool[];
  className?: string;
}

interface CalculatedPrice {
  monthly: number;
  breakdown: string;
  caveats: string[];
  scalingCategory?: 'team' | 'audience' | 'resource' | 'usage';
  unitContext?: string; // e.g., "up to 500 contacts"
}

export default function PricingComparison({
  tools,
  className
}: PricingComparisonProps) {
  const teamSize = useTeamSize();
  const [prices, setPrices] = useState<Map<string, CalculatedPrice>>(new Map());

  useEffect(() => {
    const newPrices = new Map<string, CalculatedPrice>();

    for (const tool of tools) {
      const pricingData = tool.specs?.pricing_data;
      const isSeatBased = pricingData?.model === 'per_seat' || pricingData?.model === 'per_unit' || pricingData?.model === 'tiered';
      const minSeats = pricingData?.min_seats || 1;
      const perSeat = tool.normalized_price_per_seat_monthly;
      const effectiveStarting = tool.effective_starting_price_monthly;

      const caveats: string[] = [];
      const scalingUnit = getScalingUnit(pricingData);
      const scalingCategory = getScalingCategory(scalingUnit);
      let unitContext: string | undefined;

      let monthly: number;
      let breakdown: string;

      // Check if this is team-based pricing (scales with team size slider)
      // Non-team-based tools (contacts, GB, requests, etc.) show as flat rate
      if (!isTeamBasedPricing(pricingData)) {
        const firstPlan = pricingData?.plans?.[0];

        if (effectiveStarting) {
          monthly = effectiveStarting;
          breakdown = getScalingCategoryLabel(scalingCategory);

          // Add context about what's included
          if (firstPlan?.included_units) {
            const unitLabel = formatScalingUnit(scalingUnit, true);
            unitContext = `Up to ${firstPlan.included_units.toLocaleString()} ${unitLabel}`;
          }

          caveats.push(`Price varies by ${formatScalingUnit(scalingUnit)} count`);
        } else {
          continue; // Skip tools without pricing
        }
      } else if (isSeatBased && perSeat) {
        const effectiveTeamSize = Math.max(teamSize, minSeats);
        monthly = perSeat * effectiveTeamSize;

        // Use the actual scaling unit from pricing data
        const unitLabel = formatScalingUnit(scalingUnit, effectiveTeamSize !== 1);
        const unitLabelSingular = formatScalingUnit(scalingUnit);
        breakdown = `${effectiveTeamSize} ${unitLabel} × $${perSeat}/${unitLabelSingular}`;

        if (teamSize < minSeats) {
          caveats.push(`${minSeats} ${formatScalingUnit(scalingUnit)} minimum`);
        }
      } else if (effectiveStarting) {
        monthly = effectiveStarting;
        breakdown = 'Flat rate';
      } else {
        continue; // Skip tools without pricing
      }

      newPrices.set(tool.slug, { monthly, breakdown, caveats, scalingCategory, unitContext });
    }

    setPrices(newPrices);
  }, [teamSize, tools]);

  if (prices.size === 0) {
    return null;
  }

  // Find cheapest tool
  let cheapestSlug: string | null = null;
  let cheapestPrice = Infinity;

  for (const [slug, price] of prices.entries()) {
    if (price.monthly < cheapestPrice) {
      cheapestPrice = price.monthly;
      cheapestSlug = slug;
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="text-sm text-zinc-400 mb-4">
        Pricing for {teamSize === 1 ? 'solo use' : `team of ${teamSize}`}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tools.map(tool => {
          const price = prices.get(tool.slug);
          if (!price) return null;

          const isCheapest = tool.slug === cheapestSlug;
          const savings = cheapestSlug && tool.slug !== cheapestSlug
            ? price.monthly - cheapestPrice
            : 0;

          return (
            <div
              key={tool.slug}
              className={cn(
                'relative rounded-xl border p-5 transition-all',
                isCheapest
                  ? 'border-hunt-500 bg-hunt-500/5 ring-2 ring-hunt-500/20'
                  : 'border-zinc-700 bg-zinc-900'
              )}
            >
              {isCheapest && (
                <div className="absolute -top-3 left-4 px-3 py-1 rounded-full bg-hunt-500 text-white text-xs font-medium">
                  Best Value
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <div className="font-semibold text-zinc-100">{tool.name}</div>
                </div>

                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-zinc-100">
                      ${price.monthly}
                    </span>
                    <span className="text-sm text-zinc-400">/mo</span>
                    {price.scalingCategory && price.scalingCategory !== 'team' && (
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-900/50 text-purple-300">
                        {getScalingCategoryLabel(price.scalingCategory)}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-zinc-500 mt-1">
                    {price.breakdown}
                  </div>

                  {price.unitContext && (
                    <div className="text-xs text-purple-400 mt-1">
                      {price.unitContext}
                    </div>
                  )}
                </div>

                {price.caveats.length > 0 && (
                  <div className="space-y-1">
                    {price.caveats.map((caveat, i) => (
                      <div key={i} className="text-xs text-amber-400 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>{caveat}</span>
                      </div>
                    ))}
                  </div>
                )}

                {savings > 0 && (
                  <div className="pt-3 border-t border-zinc-800">
                    <div className="text-xs text-zinc-500">
                      ${savings}/mo more than {tools.find(t => t.slug === cheapestSlug)?.name}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-zinc-600 italic">
        Prices shown are normalized for fair comparison. Actual costs may vary based on features, add-ons, and contract terms.
      </div>
    </div>
  );
}
