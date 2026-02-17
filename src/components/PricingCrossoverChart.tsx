/**
 * PricingCrossoverChart - The "Killer Feature" for SaaS Comparison
 *
 * Hybrid implementation combining:
 * - Gemini's simple, maintainable cost logic
 * - My crossover point detection (competitive moat)
 * - Gemini's multi-tool support (2-5 tools)
 * - My billing cycle toggle
 * - Gemini's inline insight generation
 * - Adaptive Axis: Dynamic scaling based on primary unit (users, contacts, etc.)
 *
 * Answers: "At MY scale, which tool is cheaper? And when does that change?"
 */

import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { SMPPricingData } from '@/types/database';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { computeMonthlyCost } from '@/lib/pricing/cost';
import { formatScalingUnit, getScalingCategory, type ScalingCategory } from '@/lib/pricing/display';

// Color palette for up to 5 tools (first is main tool, others are alternatives)
const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

/**
 * Axis configurations for different scaling dimensions
 * This is the "Adaptive Axis" feature - chart adapts to the primary unit type
 */
interface AxisConfig {
  label: string;
  unitLabel: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

const AXIS_CONFIGS: Record<ScalingCategory | 'default', AxisConfig> = {
  // Team-based: users, seats, members
  team: {
    label: 'Team Size',
    unitLabel: 'users',
    min: 1,
    max: 50,
    step: 1,
    defaultValue: 10,
  },
  // Audience-based: contacts, subscribers, leads
  audience: {
    label: 'Contacts',
    unitLabel: 'contacts',
    min: 500,
    max: 50000,
    step: 500,
    defaultValue: 2500,
  },
  // Resource-based: GB, projects, workspaces
  resource: {
    label: 'Resources',
    unitLabel: 'units',
    min: 1,
    max: 100,
    step: 5,
    defaultValue: 10,
  },
  // Usage-based: API calls, messages (fallback - usually shows table instead)
  usage: {
    label: 'Usage',
    unitLabel: 'units',
    min: 100,
    max: 10000,
    step: 100,
    defaultValue: 1000,
  },
  // Default fallback
  default: {
    label: 'Quantity',
    unitLabel: 'units',
    min: 1,
    max: 100,
    step: 1,
    defaultValue: 10,
  },
};

/**
 * Get the primary scaling unit from a tool's pricing data
 */
function getPrimaryScalingUnit(pricingData: SMPPricingData | null): string | null {
  if (!pricingData?.plans?.length) return null;
  return pricingData.plans[0]?.scaling_unit || null;
}

/**
 * Check if two tools have compatible scaling units (can be meaningfully compared on same axis)
 */
function hasCompatibleScaling(toolA: SMPPricingData | null, toolB: SMPPricingData | null): boolean {
  const unitA = getPrimaryScalingUnit(toolA);
  const unitB = getPrimaryScalingUnit(toolB);

  // Both null = both default to team-based
  if (!unitA && !unitB) return true;

  // Get categories and compare
  const categoryA = getScalingCategory(unitA);
  const categoryB = getScalingCategory(unitB);

  return categoryA === categoryB;
}

interface ToolPricingInput {
  name: string;
  slug: string;
  pricingData: SMPPricingData | null;
}

interface PricingCrossoverChartProps {
  tools: ToolPricingInput[]; // 2-5 tools (first is "main" tool)
  maxUsers?: number; // Max X-axis (default: auto from axis config)
  defaultTeamSize?: number; // Initial slider position (default: auto from axis config)
}

interface DataPoint {
  quantity: number; // Renamed from 'users' to be unit-agnostic
  [toolName: string]: number; // Dynamic keys for each tool
}

interface CrossoverPoint {
  quantity: number; // Renamed from 'users' to be unit-agnostic
  toolA: string;
  toolB: string;
  wasMoreExpensive: string; // Which tool was more expensive before crossover
}

/**
 * Calculate monthly cost for a given tool at a specific team size
 * Uses Gemini's simpler approach: Find cheapest valid plan
 */

export default function PricingCrossoverChart({
  tools,
  maxUsers,
  defaultTeamSize,
}: PricingCrossoverChartProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // Get the primary tool (first one) and its scaling unit
  const primaryTool = tools[0];
  const primaryUnit = getPrimaryScalingUnit(primaryTool?.pricingData);
  const primaryCategory = getScalingCategory(primaryUnit);

  // Get the axis configuration based on the primary unit category
  const axisConfig = AXIS_CONFIGS[primaryCategory] || AXIS_CONFIGS.default;

  // Use provided values or fall back to axis config defaults
  const effectiveMax = maxUsers || axisConfig.max;
  const effectiveDefault = defaultTeamSize || axisConfig.defaultValue;

  const [quantity, setQuantity] = useState<number>(effectiveDefault);

  // Filter tools to only those with compatible scaling (apples-to-apples comparison)
  const compatibleTools = useMemo(() => {
    return tools.filter((tool) => hasCompatibleScaling(primaryTool?.pricingData, tool.pricingData));
  }, [tools, primaryTool]);

  // Limit to top 5 tools to avoid chart clutter
  const displayTools = compatibleTools.slice(0, 5);

  // Tools that were filtered out (incompatible scaling)
  const _incompatibleTools = tools.filter((tool) => !compatibleTools.includes(tool));

  // Generate chart data using the axis config range
  const chartData = useMemo<DataPoint[]>(() => {
    const data: DataPoint[] = [];
    const step = axisConfig.step;

    for (let q = axisConfig.min; q <= effectiveMax; q += step) {
      const dataPoint: DataPoint = { quantity: q };

      displayTools.forEach((tool) => {
        const cost = computeMonthlyCost(tool.pricingData, q, billingCycle).cost;
        dataPoint[tool.name] = cost ?? 0;
      });

      data.push(dataPoint);
    }

    return data;
  }, [displayTools, effectiveMax, billingCycle, axisConfig]);

  // Detect crossover points (where lines intersect) - THE KILLER FEATURE
  const crossoverPoints = useMemo<CrossoverPoint[]>(() => {
    const points: CrossoverPoint[] = [];

    // For 2-tool comparison, detect all crossovers
    if (displayTools.length === 2) {
      const [toolA, toolB] = displayTools;

      for (let i = 1; i < chartData.length; i++) {
        const prev = chartData[i - 1];
        const curr = chartData[i];

        const prevDiff = (prev[toolA.name] as number) - (prev[toolB.name] as number);
        const currDiff = (curr[toolA.name] as number) - (curr[toolB.name] as number);

        // Sign change indicates crossover
        if (prevDiff * currDiff < 0) {
          points.push({
            quantity: curr.quantity,
            toolA: toolA.name,
            toolB: toolB.name,
            wasMoreExpensive: prevDiff > 0 ? toolA.name : toolB.name,
          });
        }
      }
    }

    return points;
  }, [chartData, displayTools]);

  // Get costs at current quantity (find closest data point)
  const currentCosts = useMemo(() => {
    // Find the closest data point to the current quantity
    const point = chartData.reduce((closest, curr) => {
      return Math.abs(curr.quantity - quantity) < Math.abs(closest.quantity - quantity)
        ? curr
        : closest;
    }, chartData[0]);

    if (!point) return [];

    return displayTools
      .map((tool) => ({
        name: tool.name,
        cost: point[tool.name] as number,
        detail: computeMonthlyCost(tool.pricingData, quantity, billingCycle),
        color: COLORS[displayTools.indexOf(tool) % COLORS.length],
      }))
      .sort((a, b) => a.cost - b.cost); // Sort by cost (cheapest first)
  }, [chartData, quantity, displayTools, billingCycle]);

  // Generate insight (Gemini's approach + my crossover enhancement)
  const insight = useMemo(() => {
    if (currentCosts.length < 2) return null;

    const cheapest = currentCosts[0];
    const mainTool = displayTools[0]; // First tool is the "main" one
    const mainToolCost = currentCosts.find((c) => c.name === mainTool.name);

    if (!mainToolCost) return null;

    // If main tool is cheapest
    if (cheapest.name === mainTool.name) {
      return {
        type: 'winner' as const,
        text: `${mainTool.name} is the most affordable option at this scale`,
      };
    }

    // If there's a cheaper alternative
    const savings = mainToolCost.cost - cheapest.cost;
    const savingsPercent = ((savings / mainToolCost.cost) * 100).toFixed(0);

    // Check if crossover point exists (predictive insight)
    const relevantCrossover = crossoverPoints.find(
      (cp) =>
        (cp.toolA === mainTool.name || cp.toolB === mainTool.name) &&
        (cp.toolA === cheapest.name || cp.toolB === cheapest.name)
    );

    if (relevantCrossover) {
      if (quantity < relevantCrossover.quantity) {
        return {
          type: 'savings_with_future' as const,
          text: `Save $${savings.toFixed(0)}/mo (${savingsPercent}%) with ${cheapest.name} now, but ${mainTool.name} becomes cheaper at ${relevantCrossover.quantity.toLocaleString()} ${axisConfig.unitLabel}`,
        };
      } else {
        return {
          type: 'savings' as const,
          text: `You could save $${savings.toFixed(0)}/mo (${savingsPercent}%) with ${cheapest.name}`,
        };
      }
    }

    return {
      type: 'savings' as const,
      text: `You could save $${savings.toFixed(0)}/mo (${savingsPercent}%) with ${cheapest.name}`,
    };
  }, [currentCosts, displayTools, quantity, crossoverPoints, axisConfig]);

  // Check if any tool has valid pricing data
  const hasPricingData = displayTools.some((t) => t.pricingData && t.pricingData.plans.length > 0);

  // Determine if we should show the chart or the usage-based fallback
  // Show chart for: team-based, audience-based, resource-based (chartable categories)
  // Show table for: usage-based (API calls, messages - too variable to chart)
  const isChartableCategory = primaryCategory !== 'usage';

  // For usage-based tools (and incompatible comparisons), get their per-unit pricing for display
  const usageBasedPricing = useMemo(() => {
    // Include all original tools in the fallback view
    return tools.map((tool) => {
      if (!tool.pricingData || !tool.pricingData.plans.length) {
        return { name: tool.name, plans: [], isCompatible: compatibleTools.includes(tool) };
      }

      // Get plans with per-unit pricing
      const plansWithPricing = tool.pricingData.plans
        .filter((plan) => plan.price_per_unit || plan.price_monthly)
        .slice(0, 5) // Limit to top 5 plans for display
        .map((plan) => ({
          name: plan.name,
          price: plan.price_per_unit || plan.price_monthly || 0,
          unit: plan.scaling_unit || 'unit',
          isPerUnit: !!plan.price_per_unit,
        }));

      return {
        name: tool.name,
        plans: plansWithPricing,
        isCompatible: compatibleTools.includes(tool),
      };
    });
  }, [tools, compatibleTools]);

  if (!hasPricingData) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-600 bg-zinc-900 p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-zinc-500 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <p className="text-sm text-zinc-400 mb-2">Pricing data not yet available</p>
        <p className="text-xs text-zinc-500">
          We're actively collecting structured pricing. Check back soon!
        </p>
      </div>
    );
  }

  // Show usage-based pricing comparison when:
  // 1. Primary tool uses usage-based pricing (API calls, messages - too variable to chart)
  // 2. No compatible tools found (can't compare apples to oranges)
  if (!isChartableCategory || displayTools.length < 2) {
    return (
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-zinc-100">Pricing Comparison</h3>
          <p className="mt-1 text-sm text-zinc-400">
            {!isChartableCategory
              ? 'These tools use usage-based pricing — costs depend on consumption volume'
              : 'These tools have different pricing models and cannot be directly compared on the same scale'}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {usageBasedPricing.map((tool, toolIndex) => (
            <div key={tool.name} className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
              <h4
                className="font-semibold text-zinc-100 mb-3"
                style={{ color: COLORS[toolIndex % COLORS.length] }}
              >
                {tool.name}
              </h4>
              {tool.plans.length > 0 ? (
                <div className="space-y-2">
                  {tool.plans.map((plan, planIndex) => (
                    <div key={planIndex} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">{plan.name}</span>
                      <span className="font-mono text-zinc-100">
                        ${plan.price.toFixed(plan.price < 1 ? 4 : 2)}
                        <span className="text-zinc-500">/{formatScalingUnit(plan.unit)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Contact sales for pricing</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/70 p-3 text-xs text-zinc-500">
          {!isChartableCategory
            ? "Usage-based pricing varies by consumption. Visit each tool's pricing page for calculators and volume discounts."
            : 'These tools scale differently (e.g., per-user vs per-contact). Compare based on your specific usage pattern.'}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">Cost Scaling Comparison</h3>
          <p className="mt-1 text-sm text-zinc-400">
            How costs change as your {axisConfig.unitLabel} grow
          </p>
        </div>

        {/* Billing Cycle Toggle */}
        <ToggleGroup
          type="single"
          value={billingCycle}
          onValueChange={(v) => v && setBillingCycle(v as 'monthly' | 'annual')}
          className="border border-zinc-700 bg-zinc-800 p-1"
        >
          <ToggleGroupItem
            value="monthly"
            className="text-xs data-[state=on]:bg-hunt-600 data-[state=on]:text-white"
          >
            Monthly
          </ToggleGroupItem>
          <ToggleGroupItem
            value="annual"
            className="text-xs data-[state=on]:bg-hunt-600 data-[state=on]:text-white"
          >
            Annual
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Chart */}
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" />
            <XAxis
              dataKey="quantity"
              stroke="#a1a1aa"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tickFormatter={(value) => value.toLocaleString()}
              label={{ value: axisConfig.label, position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              stroke="#a1a1aa"
              fontSize={12}
              tickFormatter={(value) => `$${value}`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181b',
                border: '1px solid #3f3f46',
                borderRadius: '0.5rem',
                color: '#fafafa',
              }}
              formatter={(value: number | string | undefined) => [
                `$${Number(value ?? 0).toFixed(2)}`,
                '',
              ]}
              labelFormatter={(label) =>
                `${Number(label).toLocaleString()} ${axisConfig.unitLabel}`
              }
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />

            {/* Draw lines for each tool */}
            {displayTools.map((tool, index) => (
              <Line
                key={tool.slug}
                type="monotone"
                dataKey={tool.name}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={index === 0 ? 3 : 2} // Main tool is thicker (Gemini's trick)
                dot={false}
                activeDot={{ r: 6 }}
              />
            ))}

            {/* Reference line for current quantity */}
            <ReferenceLine
              x={quantity}
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: 'You',
                position: 'top',
                fill: '#f59e0b',
                fontSize: 12,
                fontWeight: 600,
              }}
            />

            {/* Mark crossover points */}
            {crossoverPoints.map((cp, idx) => (
              <ReferenceLine
                key={idx}
                x={cp.quantity}
                stroke="#ef4444"
                strokeWidth={1}
                strokeDasharray="3 3"
                label={{
                  value: '✕',
                  position: 'top',
                  fill: '#ef4444',
                  fontSize: 16,
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Interactive Slider */}
      <div className="mt-6 border-t border-zinc-800 pt-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-zinc-300">Your {axisConfig.label}</label>
          <span className="text-lg font-bold text-hunt-500">
            {quantity.toLocaleString()} {axisConfig.unitLabel}
          </span>
        </div>
        <Slider
          min={axisConfig.min}
          max={effectiveMax}
          step={axisConfig.step}
          value={[quantity]}
          onValueChange={(value) => setQuantity(value[0])}
          className="w-full [&_[role=slider]]:bg-hunt-500 [&_[role=slider]]:border-hunt-600"
        />

        {/* Current Costs at Selected Team Size */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {currentCosts.map((tool, index) => (
            <Card
              key={tool.name}
              className={`transition-all ${
                index === 0
                  ? 'border-green-500 bg-green-500/10 ring-2 ring-green-500/20'
                  : 'border-zinc-700 bg-zinc-800'
              }`}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-zinc-400">{tool.name}</div>
                  {index === 0 && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-green-500/20 text-green-500 border-green-500/30"
                    >
                      Cheapest
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-bold text-zinc-100">${tool.cost.toFixed(2)}</span>
                  <span className="text-sm text-zinc-400">/mo</span>
                </div>
                {tool.detail.planName && (
                  <div className="mt-1 text-xs text-zinc-500">Plan: {tool.detail.planName}</div>
                )}
                {tool.detail.notes.length > 0 && (
                  <div className="mt-1 text-[11px] text-zinc-600">{tool.detail.notes[0]}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Insight Banner (Gemini's inline approach + my crossover enhancement) */}
      {insight && (
        <div
          className={`mt-6 rounded-lg border p-4 ${
            insight.type === 'winner'
              ? 'border-green-200 bg-green-50'
              : insight.type === 'savings_with_future'
                ? 'border-amber-200 bg-amber-50'
                : 'border-emerald-200 bg-emerald-50'
          }`}
        >
          <div className="flex items-start gap-3">
            {insight.type === 'winner' ? (
              <svg
                className="h-5 w-5 text-green-600 mt-0.5 shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : insight.type === 'savings_with_future' ? (
              <svg
                className="h-5 w-5 text-amber-600 mt-0.5 shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            <p
              className={`text-sm font-medium ${
                insight.type === 'winner'
                  ? 'text-green-900'
                  : insight.type === 'savings_with_future'
                    ? 'text-amber-900'
                    : 'text-emerald-900'
              }`}
            >
              {insight.text}
            </p>
          </div>
        </div>
      )}

      {/* Crossover Explanation (only for 2-tool comparison) */}
      {crossoverPoints.length > 0 && (
        <div className="mt-4 text-xs text-zinc-500">
          <span className="text-red-400">✕</span> marks indicate where pricing crosses over
        </div>
      )}

      {/* Assumptions */}
      <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/70 p-3 text-xs text-zinc-500">
        Assumptions: all seats are paid members, add-ons and usage overages excluded, cheapest
        non-enterprise plan selected.
      </div>
    </div>
  );
}
