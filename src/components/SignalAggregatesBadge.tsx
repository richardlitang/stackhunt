/**
 * SignalAggregatesBadge - Display aggregated community signals
 * Shows summary statistics from signal_aggregates table
 */

import { Check, X, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignalAggregate {
  signal_key: string;
  signal_label: string;
  signal_category: 'pros' | 'cons' | 'gotcha' | 'vibe' | 'switch';
  option_key?: string;
  option_label?: string;
  count_total: number;
  count_positive: number;
  count_negative: number;
}

interface SignalAggregatesBadgeProps {
  aggregates: SignalAggregate[];
  variant?: 'default' | 'compact';
  className?: string;
}

function getSignalIcon(category: string, _optionKey?: string) {
  if (category === 'pros') return <Check className="h-4 w-4" />;
  if (category === 'cons') return <X className="h-4 w-4" />;
  if (category === 'gotcha') return <AlertTriangle className="h-4 w-4" />;
  if (category === 'vibe') return <TrendingUp className="h-4 w-4" />;
  return <Users className="h-4 w-4" />;
}

function getSignalColor(category: string, isPositive: boolean): string {
  if (category === 'pros') {
    return isPositive
      ? 'text-green-400 bg-green-500/10 border-green-700/50'
      : 'text-red-400 bg-red-500/10 border-red-700/50';
  }
  if (category === 'cons') {
    return isPositive
      ? 'text-red-400 bg-red-500/10 border-red-700/50'
      : 'text-green-400 bg-green-500/10 border-green-700/50';
  }
  if (category === 'gotcha') {
    return 'text-amber-400 bg-amber-500/10 border-amber-700/50';
  }
  return 'text-blue-400 bg-blue-500/10 border-blue-700/50';
}

export default function SignalAggregatesBadge({
  aggregates,
  variant = 'default',
  className,
}: SignalAggregatesBadgeProps) {
  if (!aggregates || aggregates.length === 0) {
    return null;
  }

  // Process aggregates for display
  const processedSignals = aggregates.map((agg) => {
    const {
      signal_key: _signal_key,
      signal_category,
      count_total,
      count_positive,
      count_negative: _count_negative,
    } = agg;

    // Calculate percentage for pros/cons agreement
    let displayText = '';
    let percentage = 0;
    let isPositive = false;

    if (signal_category === 'pros' || signal_category === 'cons') {
      percentage = count_total > 0 ? Math.round((count_positive / count_total) * 100) : 0;
      isPositive = percentage >= 50;

      if (signal_category === 'pros') {
        displayText = `${percentage}% agree with pros`;
      } else {
        displayText = `${percentage}% agree with cons`;
      }
    } else if (signal_category === 'gotcha') {
      displayText = `${count_total} ${count_total === 1 ? 'report' : 'reports'} of ${agg.option_label?.toLowerCase() || 'gotcha'}`;
      isPositive = false;
    } else if (signal_category === 'vibe') {
      displayText = `${count_total} ${count_total === 1 ? 'report' : 'reports'}: ${agg.option_label || 'vibe signal'}`;
      isPositive = agg.option_key === 'fast_ui';
    }

    return {
      ...agg,
      displayText,
      percentage,
      isPositive,
    };
  });

  if (variant === 'compact') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {processedSignals.slice(0, 3).map((signal, idx) => (
          <div
            key={idx}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
              getSignalColor(signal.signal_category, signal.isPositive)
            )}
          >
            {getSignalIcon(signal.signal_category, signal.option_key)}
            <span>{signal.displayText}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-sm', className)}>
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-hunt-500" />
        <h3 className="font-semibold text-zinc-100">Community Signals</h3>
      </div>

      <div className="space-y-3">
        {processedSignals.map((signal, idx) => (
          <div
            key={idx}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3',
              getSignalColor(signal.signal_category, signal.isPositive)
            )}
          >
            <div className="flex-shrink-0 mt-0.5">
              {getSignalIcon(signal.signal_category, signal.option_key)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{signal.displayText}</p>
              {(signal.signal_category === 'pros' || signal.signal_category === 'cons') && (
                <div className="mt-1.5 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all',
                      signal.isPositive ? 'bg-green-500' : 'bg-red-500'
                    )}
                    style={{ width: `${signal.percentage}%` }}
                  />
                </div>
              )}
              <p className="mt-1 text-xs opacity-75">
                {signal.count_total} {signal.count_total === 1 ? 'response' : 'responses'}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500 border-t border-zinc-800 pt-3">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>Reported by community • Lightweight signals, not reviews</span>
      </div>
    </div>
  );
}
