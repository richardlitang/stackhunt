/**
 * VoteWidget - Thumbs UI backed by structured signals
 * Records `review_helpful` via /api/signals/record (shared feedback pipeline)
 */

import { useState, useCallback, useEffect } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, getBrowserFingerprint } from '@/lib/utils';

interface VoteWidgetProps {
  itemId: string;
  storageKey?: string;
  signalKey?: string;
}

type VoteType = 'up' | 'down' | null;

const DEFAULT_SIGNAL_KEY = 'review_helpful';

export default function VoteWidget({
  itemId,
  storageKey,
  signalKey = DEFAULT_SIGNAL_KEY,
}: VoteWidgetProps) {
  const [upvotes, setUpvotes] = useState(0);
  const [downvotes, setDownvotes] = useState(0);
  const [userVote, setUserVote] = useState<VoteType>(null);
  const [isLoading, setIsLoading] = useState(false);

  const persistedVoteKey = storageKey || `signal-vote-${signalKey}-${itemId}`;

  // Sync local state from persisted selection
  useEffect(() => {
    try {
      const stored = localStorage.getItem(persistedVoteKey);
      if (stored === 'up' || stored === 'down') {
        setUserVote(stored);
      }
    } catch (error) {
      console.warn('Unable to read feedback vote from localStorage:', error);
    }
  }, [persistedVoteKey]);

  // Hydrate aggregate counts from the structured signals API.
  useEffect(() => {
    let cancelled = false;

    async function loadAggregates() {
      try {
        const response = await fetch(`/api/signals/aggregates?itemId=${encodeURIComponent(itemId)}`);
        const result = await response.json();
        if (!response.ok || !result.success || cancelled) return;

        const rows = Array.isArray(result.aggregates) ? result.aggregates : [];
        let yesCount = 0;
        let noCount = 0;

        for (const row of rows) {
          if (row?.signal_key !== signalKey) continue;
          if (row?.option_key === 'yes') yesCount = Number(row.count_total || 0);
          if (row?.option_key === 'no') noCount = Number(row.count_total || 0);
        }

        setUpvotes(yesCount);
        setDownvotes(noCount);
      } catch (error) {
        // Non-critical; keep initial counts and allow writes.
        console.warn('Unable to load signal aggregates for VoteWidget:', error);
      }
    }

    loadAggregates();
    return () => {
      cancelled = true;
    };
  }, [itemId, signalKey]);

  const handleVote = useCallback(
    async (voteType: Exclude<VoteType, null>) => {
      if (isLoading) return;
      if (voteType === userVote) return; // Structured signals currently support set/switch, not remove.

      const previousVote = userVote;
      const previousUpvotes = upvotes;
      const previousDownvotes = downvotes;

      // Optimistic set/switch
      if (previousVote === 'up') setUpvotes((v) => Math.max(0, v - 1));
      if (previousVote === 'down') setDownvotes((v) => Math.max(0, v - 1));
      if (voteType === 'up') setUpvotes((v) => v + 1);
      if (voteType === 'down') setDownvotes((v) => v + 1);
      setUserVote(voteType);
      setIsLoading(true);

      try {
        const optionKey = voteType === 'up' ? 'yes' : 'no';

        const response = await fetch('/api/signals/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId,
            signalKey,
            optionKey,
            valueBool: voteType === 'up',
            fingerprintHash: getBrowserFingerprint(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
            sourcePage: typeof window !== 'undefined' ? window.location.pathname : null,
          }),
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to record feedback');
        }

        try {
          localStorage.setItem(persistedVoteKey, voteType);
        } catch (error) {
          console.warn('Unable to write feedback vote to localStorage:', error);
        }
      } catch (error) {
        setUserVote(previousVote);
        setUpvotes(previousUpvotes);
        setDownvotes(previousDownvotes);
        console.error('VoteWidget feedback error:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, userVote, upvotes, downvotes, itemId, signalKey, persistedVoteKey]
  );

  const netScore = upvotes - downvotes;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote('up')}
        disabled={isLoading}
        className={cn(
          'gap-1.5',
          userVote === 'up'
            ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-100'
            : 'bg-slate-100 text-slate-600 hover:bg-green-50 hover:text-green-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-green-950'
        )}
        aria-label="Helpful"
      >
        <ThumbsUp className={cn('h-4 w-4', userVote === 'up' && 'fill-current')} />
        <span>{upvotes}</span>
      </Button>

      {netScore !== 0 && (
        <span
          className={cn(
            'min-w-[2rem] text-center text-sm font-semibold',
            netScore > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          )}
        >
          {netScore > 0 ? '+' : ''}
          {netScore}
        </span>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote('down')}
        disabled={isLoading}
        className={cn(
          'gap-1.5',
          userVote === 'down'
            ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-100'
            : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-red-950'
        )}
        aria-label="Not helpful"
      >
        <ThumbsDown className={cn('h-4 w-4', userVote === 'down' && 'fill-current')} />
        <span>{downvotes}</span>
      </Button>
    </div>
  );
}
