/**
 * Smart Comparison Table
 *
 * Uses Knowledge Card metadata to show detailed feature comparison.
 * Highlights differences between tools with visual indicators.
 */

import React, { useState } from 'react';
import { Check, X, HelpCircle } from 'lucide-react';
import type { KnowledgeCard } from '@/lib/knowledge-card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface Tool {
  name: string;
  slug: string;
  logo_url?: string | null;
  metadata?: KnowledgeCard | null;
}

interface Props {
  toolA: Tool;
  toolB: Tool;
}

type ComparisonCategory = 'pricing' | 'platforms' | 'integrations' | 'security' | 'support';

interface ComparisonRow {
  label: string;
  valueA: string | boolean | null;
  valueB: string | boolean | null;
  isDifferent: boolean;
}

function formatValue(value: string | boolean | null | undefined): string {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  if (value === null || value === undefined) return 'Unknown';
  return value;
}

function getBooleanIcon(value: boolean | null | undefined) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-900/30 text-green-400 border border-green-700">
        <Check className="w-4 h-4" />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-900/30 text-red-400 border border-red-700">
        <X className="w-4 h-4" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700">
      <HelpCircle className="w-4 h-4" />
    </span>
  );
}

function extractComparisonData(
  metaA: KnowledgeCard | null | undefined,
  metaB: KnowledgeCard | null | undefined,
  category: ComparisonCategory
): ComparisonRow[] {
  const rows: ComparisonRow[] = [];

  if (!metaA && !metaB) return rows;

  switch (category) {
    case 'pricing':
      rows.push({
        label: 'Pricing Model',
        valueA: metaA?.pricing.model || null,
        valueB: metaB?.pricing.model || null,
        isDifferent: metaA?.pricing.model !== metaB?.pricing.model,
      });
      rows.push({
        label: 'Free Tier',
        valueA: metaA?.pricing.has_free_tier ?? null,
        valueB: metaB?.pricing.has_free_tier ?? null,
        isDifferent: metaA?.pricing.has_free_tier !== metaB?.pricing.has_free_tier,
      });
      rows.push({
        label: 'Free Trial',
        valueA: metaA?.pricing.has_free_trial
          ? metaA.pricing.trial_days
            ? `${metaA.pricing.trial_days} days`
            : 'Yes'
          : false,
        valueB: metaB?.pricing.has_free_trial
          ? metaB.pricing.trial_days
            ? `${metaB.pricing.trial_days} days`
            : 'Yes'
          : false,
        isDifferent: metaA?.pricing.has_free_trial !== metaB?.pricing.has_free_trial,
      });
      rows.push({
        label: 'Starting Price',
        valueA: metaA?.pricing.starting_price || 'N/A',
        valueB: metaB?.pricing.starting_price || 'N/A',
        isDifferent: metaA?.pricing.starting_price !== metaB?.pricing.starting_price,
      });
      break;

    case 'platforms': {
      const platforms = [
        'web',
        'mac',
        'windows',
        'ios',
        'android',
        'linux',
        'api',
        'self-hosted',
      ] as const;
      for (const platform of platforms) {
        const availA = metaA?.platforms.find((p) => p.platform === platform)?.available ?? null;
        const availB = metaB?.platforms.find((p) => p.platform === platform)?.available ?? null;
        rows.push({
          label: platform.charAt(0).toUpperCase() + platform.slice(1).replace('-', ' '),
          valueA: availA,
          valueB: availB,
          isDifferent: availA !== availB,
        });
      }
      break;
    }

    case 'integrations':
      rows.push({
        label: 'API Access',
        valueA: metaA?.integrations.has_api ?? null,
        valueB: metaB?.integrations.has_api ?? null,
        isDifferent: metaA?.integrations.has_api !== metaB?.integrations.has_api,
      });
      rows.push({
        label: 'Webhooks',
        valueA: metaA?.integrations.has_webhooks ?? null,
        valueB: metaB?.integrations.has_webhooks ?? null,
        isDifferent: metaA?.integrations.has_webhooks !== metaB?.integrations.has_webhooks,
      });
      rows.push({
        label: 'Zapier',
        valueA: metaA?.integrations.has_zapier ?? null,
        valueB: metaB?.integrations.has_zapier ?? null,
        isDifferent: metaA?.integrations.has_zapier !== metaB?.integrations.has_zapier,
      });
      if (metaA?.integrations.total_count || metaB?.integrations.total_count) {
        rows.push({
          label: 'Total Integrations',
          valueA: metaA?.integrations.total_count?.toString() || 'Unknown',
          valueB: metaB?.integrations.total_count?.toString() || 'Unknown',
          isDifferent: metaA?.integrations.total_count !== metaB?.integrations.total_count,
        });
      }
      break;

    case 'security':
      rows.push({
        label: 'SSO Support',
        valueA: metaA?.security.sso_available ?? null,
        valueB: metaB?.security.sso_available ?? null,
        isDifferent: metaA?.security.sso_available !== metaB?.security.sso_available,
      });
      rows.push({
        label: '2FA / MFA',
        valueA: metaA?.security.two_factor ?? null,
        valueB: metaB?.security.two_factor ?? null,
        isDifferent: metaA?.security.two_factor !== metaB?.security.two_factor,
      });
      rows.push({
        label: 'SOC 2 Certified',
        valueA: metaA?.security.soc2_certified ?? null,
        valueB: metaB?.security.soc2_certified ?? null,
        isDifferent: metaA?.security.soc2_certified !== metaB?.security.soc2_certified,
      });
      rows.push({
        label: 'GDPR Compliant',
        valueA: metaA?.security.gdpr_compliant ?? null,
        valueB: metaB?.security.gdpr_compliant ?? null,
        isDifferent: metaA?.security.gdpr_compliant !== metaB?.security.gdpr_compliant,
      });
      rows.push({
        label: 'Self-Hosted Option',
        valueA: metaA?.security.self_hosted_option ?? null,
        valueB: metaB?.security.self_hosted_option ?? null,
        isDifferent: metaA?.security.self_hosted_option !== metaB?.security.self_hosted_option,
      });
      break;

    case 'support':
      rows.push({
        label: 'Documentation',
        valueA: metaA?.support.has_documentation ?? null,
        valueB: metaB?.support.has_documentation ?? null,
        isDifferent: metaA?.support.has_documentation !== metaB?.support.has_documentation,
      });
      rows.push({
        label: 'Community Forum',
        valueA: metaA?.support.has_community ?? null,
        valueB: metaB?.support.has_community ?? null,
        isDifferent: metaA?.support.has_community !== metaB?.support.has_community,
      });
      rows.push({
        label: 'Live Chat',
        valueA: metaA?.support.has_live_chat ?? null,
        valueB: metaB?.support.has_live_chat ?? null,
        isDifferent: metaA?.support.has_live_chat !== metaB?.support.has_live_chat,
      });
      rows.push({
        label: 'Phone Support',
        valueA: metaA?.support.has_phone_support ?? null,
        valueB: metaB?.support.has_phone_support ?? null,
        isDifferent: metaA?.support.has_phone_support !== metaB?.support.has_phone_support,
      });
      break;
  }

  return rows;
}

export default function SmartComparisonTable({ toolA, toolB }: Props) {
  const [activeCategory, setActiveCategory] = useState<ComparisonCategory>('pricing');
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);

  const metaA = toolA.metadata;
  const metaB = toolB.metadata;

  // Check if we have any metadata to display
  const hasMetadata = metaA || metaB;

  if (!hasMetadata) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-8 text-center">
        <p className="text-zinc-500">
          Detailed comparison data not available yet. Check back after these tools are re-analyzed.
        </p>
      </div>
    );
  }

  const categories: { id: ComparisonCategory; label: string; icon: string }[] = [
    { id: 'pricing', label: 'Pricing', icon: '💰' },
    { id: 'platforms', label: 'Platforms', icon: '📱' },
    { id: 'integrations', label: 'Integrations', icon: '🔗' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'support', label: 'Support', icon: '💬' },
  ];

  const rows = extractComparisonData(metaA, metaB, activeCategory);
  const displayRows = showOnlyDifferences ? rows.filter((r) => r.isDifferent) : rows;
  const differenceCount = rows.filter((r) => r.isDifferent).length;

  return (
    <Tabs
      value={activeCategory}
      onValueChange={(v) => setActiveCategory(v as ComparisonCategory)}
      className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-100">Feature Comparison</h3>
          <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer hover:text-zinc-300 transition">
            <Checkbox
              id="show-diff"
              checked={showOnlyDifferences}
              onCheckedChange={(checked) => setShowOnlyDifferences(checked as boolean)}
              className="border-zinc-600 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
            />
            <span>Show differences only</span>
            {differenceCount > 0 && (
              <Badge
                variant="secondary"
                className="bg-indigo-900/30 text-indigo-400 border-indigo-700"
              >
                {differenceCount}
              </Badge>
            )}
          </label>
        </div>

        {/* Category Tabs */}
        <TabsList className="mt-4 bg-zinc-800/50 h-auto p-1 flex flex-wrap gap-1 rounded-lg">
          {categories.map((cat) => (
            <TabsTrigger
              key={cat.id}
              value={cat.id}
              className="rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer data-[state=active]:bg-indigo-500 data-[state=active]:text-white text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
            >
              <span className="mr-1.5">{cat.icon}</span>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-800/50 border-b border-zinc-700">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-300 w-1/3">
                Feature
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-zinc-300 w-1/3">
                <div className="flex items-center justify-center gap-2">
                  {toolA.logo_url && (
                    <div className="h-6 w-6 rounded bg-white flex items-center justify-center overflow-hidden border border-zinc-700/50">
                      <img
                        src={toolA.logo_url}
                        alt={toolA.name}
                        className="h-full w-full object-contain p-0.5"
                      />
                    </div>
                  )}
                  <span>{toolA.name}</span>
                </div>
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-zinc-300 w-1/3">
                <div className="flex items-center justify-center gap-2">
                  {toolB.logo_url && (
                    <div className="h-6 w-6 rounded bg-white flex items-center justify-center overflow-hidden border border-zinc-700/50">
                      <img
                        src={toolB.logo_url}
                        alt={toolB.name}
                        className="h-full w-full object-contain p-0.5"
                      />
                    </div>
                  )}
                  <span>{toolB.name}</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {displayRows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-zinc-500">
                  No differences found in this category.
                </td>
              </tr>
            ) : (
              displayRows.map((row, idx) => (
                <tr key={idx} className={row.isDifferent ? 'bg-amber-900/10' : ''}>
                  <td className="px-6 py-3 text-sm font-medium text-zinc-300">
                    {row.label}
                    {row.isDifferent && (
                      <span className="ml-2 text-amber-400" title="Different">
                        ⚡
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-center">
                    {typeof row.valueA === 'boolean' || row.valueA === null ? (
                      getBooleanIcon(row.valueA as boolean | null)
                    ) : (
                      <span className="text-sm text-zinc-300">{formatValue(row.valueA)}</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-center">
                    {typeof row.valueB === 'boolean' || row.valueB === null ? (
                      getBooleanIcon(row.valueB as boolean | null)
                    ) : (
                      <span className="text-sm text-zinc-300">{formatValue(row.valueB)}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Tabs>
  );
}
