/**
 * SignalReportWidget - Structured signal capture (not free-form reviews)
 * Phase 1: Agree with pros/cons, Gotcha signals
 *
 * Uses anonymous fingerprinting for anti-spam
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignalReportWidgetProps {
  itemId: string;
  itemName: string;
  phase?: 1 | 2; // Phase 1: pros/cons + gotchas, Phase 2: vibe + switch
}

interface SignalOption {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

interface SignalDefinition {
  key: string;
  label: string;
  category: 'pros' | 'cons' | 'gotcha' | 'vibe' | 'switch';
  options?: SignalOption[];
}

// Simple browser fingerprint (same as VoteWidget)
function getFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);
  }

  const data = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
  ].join('|');

  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return hash.toString(36);
}

// IP hash (server-side in API, client sends fingerprint)
async function getIpHash(): Promise<string> {
  // For now, use fingerprint as fallback
  // In production, API should hash the IP server-side
  return getFingerprint();
}

const PHASE_1_SIGNALS: SignalDefinition[] = [
  {
    key: 'agree_pros',
    label: 'Do you agree with the pros?',
    category: 'pros',
    options: [
      { key: 'yes', label: 'Yes', icon: <Check className="h-4 w-4" /> },
      { key: 'no', label: 'No', icon: <X className="h-4 w-4" /> },
    ],
  },
  {
    key: 'agree_cons',
    label: 'Do you agree with the cons?',
    category: 'cons',
    options: [
      { key: 'yes', label: 'Yes', icon: <Check className="h-4 w-4" /> },
      { key: 'no', label: 'No', icon: <X className="h-4 w-4" /> },
    ],
  },
  {
    key: 'gotcha_hidden_fee',
    label: 'Experienced a gotcha?',
    category: 'gotcha',
    options: [
      { key: 'hidden_fee', label: 'Hidden fee', icon: <AlertTriangle className="h-4 w-4" /> },
      { key: 'setup_cost', label: 'Setup cost', icon: <TrendingUp className="h-4 w-4" /> },
    ],
  },
];

const PHASE_2_SIGNALS: SignalDefinition[] = [
  {
    key: 'vibe_fast_ui',
    label: 'Vibe check after 3 months',
    category: 'vibe',
    options: [
      { key: 'fast_ui', label: 'Still fast', icon: <Zap className="h-4 w-4" /> },
      { key: 'slow_search', label: 'Slow search', icon: <TrendingUp className="h-4 w-4" /> },
    ],
  },
];

export default function SignalReportWidget({
  itemId,
  itemName,
  phase = 1,
}: SignalReportWidgetProps) {
  const [selectedSignals, setSelectedSignals] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signals = phase === 1 ? PHASE_1_SIGNALS : [...PHASE_1_SIGNALS, ...PHASE_2_SIGNALS];

  const handleSignalSelect = useCallback(
    async (signalKey: string, optionKey: string) => {
      if (submitted[signalKey]) return; // Already submitted this signal

      setSelectedSignals((prev) => ({ ...prev, [signalKey]: optionKey }));
      setIsSubmitting(true);
      setError(null);

      try {
        const fingerprint = getFingerprint();
        const ipHash = await getIpHash();

        // Determine value based on signal type
        const signal = signals.find((s) => s.key === signalKey);
        let valueBool: boolean | null = null;
        let valueText: string | null = null;

        if (signal?.category === 'pros' || signal?.category === 'cons') {
          valueBool = optionKey === 'yes';
        } else if (signal?.category === 'gotcha') {
          valueText = optionKey;
        } else if (signal?.category === 'vibe') {
          valueText = optionKey;
        }

        const response = await fetch('/api/signals/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId,
            signalKey,
            optionKey,
            valueBool,
            valueText,
            fingerprintHash: fingerprint,
            ipHash,
            userAgent: navigator.userAgent,
            sourcePage: window.location.pathname,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to record signal');
        }

        setSubmitted((prev) => ({ ...prev, [signalKey]: true }));
      } catch (err) {
        console.error('Failed to record signal:', err);
        setError(err instanceof Error ? err.message : 'Failed to record signal');
        // Clear selection on error
        setSelectedSignals((prev) => {
          const newState = { ...prev };
          delete newState[signalKey];
          return newState;
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [itemId, signals, submitted]
  );

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-zinc-100 mb-1">
          Community Signals
        </h3>
        <p className="text-sm text-zinc-400">
          Quick feedback from real users. No account required.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-900/30 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {signals.map((signal) => {
          const isSubmitted = submitted[signal.key];
          const selectedOption = selectedSignals[signal.key];

          return (
            <div
              key={signal.key}
              className={cn(
                'rounded-lg border p-4 transition-all',
                isSubmitted
                  ? 'border-green-700/50 bg-green-900/20'
                  : 'border-zinc-700 bg-zinc-800/50'
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-200">
                  {signal.label}
                </label>
                {isSubmitted && (
                  <span className="flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
                    <Check className="h-3 w-3" />
                    Recorded
                  </span>
                )}
              </div>

              {signal.options && (
                <div className="flex flex-wrap gap-2">
                  {signal.options.map((option) => {
                    const isSelected = selectedOption === option.key;
                    const isDisabled = isSubmitted || isSubmitting;

                    return (
                      <Button
                        key={option.key}
                        size="sm"
                        variant={isSelected ? 'default' : 'outline'}
                        onClick={() => handleSignalSelect(signal.key, option.key)}
                        disabled={isDisabled}
                        className={cn(
                          'flex items-center gap-1.5 transition-all',
                          isSelected && !isSubmitted && 'bg-hunt-600 hover:bg-hunt-700',
                          isSubmitted && isSelected && 'bg-green-600 hover:bg-green-600'
                        )}
                      >
                        {option.icon}
                        <span>{option.label}</span>
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Anonymous feedback • Rate limited to prevent spam</span>
      </div>
    </div>
  );
}
