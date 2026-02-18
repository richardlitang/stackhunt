/**
 * PriceVerification Component (React Island)
 *
 * Community verification widget that allows users to report outdated pricing.
 * When users click "No, it changed", the tool is automatically queued for re-research.
 *
 * @module components/PriceVerification
 */

import { useState } from 'react';

interface Props {
  toolId: string;
  toolName: string;
  currentPrice?: string | null;
  pricingType?: string;
  verificationCount?: number;
  variant?: 'default' | 'inline';
}

export default function PriceVerification({
  toolId,
  toolName,
  currentPrice: _currentPrice,
  pricingType: _pricingType = 'unknown',
  verificationCount = 0,
  variant = 'default',
}: Props) {
  const [voted, setVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localCount, setLocalCount] = useState(verificationCount);
  const [showThanks, setShowThanks] = useState(false);

  const handleVote = async (isAccurate: boolean) => {
    if (voted || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/verify-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId,
          toolName,
          accurate: isAccurate,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit verification');
      }

      setVoted(true);

      if (isAccurate) {
        setLocalCount((prev) => prev + 1);
        setShowThanks(true);
        setTimeout(() => setShowThanks(false), 3000);
      } else {
        // Show re-queue confirmation
        setShowThanks(true);
      }
    } catch (error) {
      console.error('Error submitting price verification:', error);
      alert('Failed to submit verification. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Inline variant (compact, for use next to data confidence)
  if (variant === 'inline') {
    if (voted) {
      return (
        <span className="text-xs text-green-400 flex items-center gap-1">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Thanks!
        </span>
      );
    }

    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => handleVote(true)}
          disabled={isSubmitting}
          className="text-xs text-green-400 hover:text-green-300 transition disabled:opacity-50"
          title="Pricing is accurate"
        >
          ✓
        </button>
        <span className="text-xs text-zinc-600">/</span>
        <button
          type="button"
          onClick={() => handleVote(false)}
          disabled={isSubmitting}
          className="text-xs text-amber-400 hover:text-amber-300 transition disabled:opacity-50"
          title="Pricing changed - report for re-verification"
        >
          ✗
        </button>
        {localCount > 0 && <span className="text-xs text-zinc-600 ml-1">({localCount} ✓)</span>}
      </div>
    );
  }

  // Default variant (full card)
  if (voted && !showThanks) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <svg
            className="h-4 w-4 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Thanks for your feedback!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3">
      {showThanks ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-green-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-medium">Thanks for reporting!</span>
          </div>
          <p className="text-xs text-zinc-400">
            We'll verify this information and update it within 24 hours.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-300">Is this pricing still accurate?</p>
            {localCount > 0 && (
              <span className="text-xs text-zinc-500">
                Source-confirmed by {localCount} {localCount === 1 ? 'user' : 'users'} this week
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleVote(true)}
              disabled={isSubmitting}
              className="flex-1 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm font-medium text-green-400 transition hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Submitting...
                </span>
              ) : (
                'Yes, looks good'
              )}
            </button>

            <button
              type="button"
              onClick={() => handleVote(false)}
              disabled={isSubmitting}
              className="flex-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-400 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              No, it changed
            </button>
          </div>

          <p className="text-xs text-zinc-500">
            Help keep StackHunt accurate by verifying pricing information
          </p>
        </div>
      )}
    </div>
  );
}
