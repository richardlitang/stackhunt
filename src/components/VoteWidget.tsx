/**
 * VoteWidget - Client-side React component for voting
 * Uses Cloudflare Turnstile for bot protection
 * Optimistic UI updates for instant feedback
 */

import { useState, useCallback, useEffect } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoteWidgetProps {
  reviewId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  turnstileSiteKey: string;
}

type VoteType = 'up' | 'down' | null;

// Simple browser fingerprint (not cryptographically secure, just anti-spam)
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

  // Simple hash
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return hash.toString(36);
}

export default function VoteWidget({
  reviewId,
  initialUpvotes,
  initialDownvotes,
  turnstileSiteKey,
}: VoteWidgetProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<VoteType>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReady, setTurnstileReady] = useState(false);

  // Load Turnstile script
  useEffect(() => {
    // Check if already loaded
    if (window.turnstile) {
      setTurnstileReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
    script.async = true;

    (window as unknown as { onTurnstileLoad: () => void }).onTurnstileLoad = () => {
      setTurnstileReady(true);
    };

    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Render invisible Turnstile when ready
  useEffect(() => {
    if (!turnstileReady || !window.turnstile) return;

    const container = document.getElementById(`turnstile-${reviewId}`);
    if (!container) return;

    window.turnstile.render(container, {
      sitekey: turnstileSiteKey,
      callback: (token: string) => {
        setTurnstileToken(token);
      },
      'refresh-expired': 'auto',
      size: 'invisible',
    });
  }, [turnstileReady, reviewId, turnstileSiteKey]);

  // Check for existing vote in localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`vote-${reviewId}`);
    if (stored === 'up' || stored === 'down') {
      setUserVote(stored);
    }
  }, [reviewId]);

  const handleVote = useCallback(async (voteType: VoteType) => {
    if (isLoading) return;

    // Get turnstile token
    let token = turnstileToken;
    if (!token && window.turnstile) {
      // Try to get a new token
      try {
        token = await new Promise((resolve, reject) => {
          const container = document.getElementById(`turnstile-${reviewId}`);
          if (!container) return reject('No container');

          window.turnstile.reset(container);
          // Token will come through callback, wait a bit
          setTimeout(() => {
            if (turnstileToken) resolve(turnstileToken);
            else reject('No token');
          }, 2000);
        });
      } catch {
        // Continue without token for now
      }
    }

    const previousVote = userVote;
    const previousUpvotes = upvotes;
    const previousDownvotes = downvotes;

    // Optimistic update
    if (voteType === userVote) {
      // Removing vote
      setUserVote(null);
      if (voteType === 'up') setUpvotes(v => v - 1);
      else setDownvotes(v => v - 1);
    } else {
      // Adding/changing vote
      if (previousVote === 'up') setUpvotes(v => v - 1);
      if (previousVote === 'down') setDownvotes(v => v - 1);

      setUserVote(voteType);
      if (voteType === 'up') setUpvotes(v => v + 1);
      else if (voteType === 'down') setDownvotes(v => v + 1);
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId,
          voteType: voteType === userVote ? 0 : (voteType === 'up' ? 1 : -1),
          fingerprintHash: getFingerprint(),
          turnstileToken: token,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Vote failed');
      }

      // Store vote in localStorage
      if (voteType === userVote) {
        localStorage.removeItem(`vote-${reviewId}`);
      } else if (voteType) {
        localStorage.setItem(`vote-${reviewId}`, voteType);
      }
    } catch (error) {
      // Revert optimistic update
      setUserVote(previousVote);
      setUpvotes(previousUpvotes);
      setDownvotes(previousDownvotes);
      console.error('Vote error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, userVote, upvotes, downvotes, reviewId, turnstileToken]);

  const netScore = upvotes - downvotes;

  return (
    <div className="flex items-center gap-2">
      {/* Hidden Turnstile container */}
      <div id={`turnstile-${reviewId}`} className="hidden" />

      {/* Upvote button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote('up')}
        disabled={isLoading}
        className={cn(
          "gap-1.5",
          userVote === 'up'
            ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-100'
            : 'bg-slate-100 text-slate-600 hover:bg-green-50 hover:text-green-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-green-950'
        )}
        aria-label="Upvote"
      >
        <ThumbsUp className={cn("h-4 w-4", userVote === 'up' && "fill-current")} />
        <span>{upvotes}</span>
      </Button>

      {/* Score - hide when 0 to reduce clutter */}
      {netScore !== 0 && (
        <span className={cn(
          "min-w-[2rem] text-center text-sm font-semibold",
          netScore > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
        )}>
          {netScore > 0 ? '+' : ''}{netScore}
        </span>
      )}

      {/* Downvote button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote('down')}
        disabled={isLoading}
        className={cn(
          "gap-1.5",
          userVote === 'down'
            ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-100'
            : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-red-950'
        )}
        aria-label="Downvote"
      >
        <ThumbsDown className={cn("h-4 w-4", userVote === 'down' && "fill-current")} />
        <span>{downvotes}</span>
      </Button>
    </div>
  );
}

// Type declaration for Turnstile
declare global {
  interface Window {
    turnstile: {
      render: (container: HTMLElement, options: unknown) => string;
      reset: (container: HTMLElement) => void;
      remove: (widgetId: string) => void;
    };
  }
}
