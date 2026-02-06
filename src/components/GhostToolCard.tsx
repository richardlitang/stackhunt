/**
 * Ghost Tool Card Component
 *
 * Guardrail 2: Prevents "thin content" during Phase 2 discovery hunts
 * Shows users that we know about a tool, just haven't analyzed it yet
 *
 * SEO Benefit: Tool name appears on page immediately, signaling relevance
 */

import { Loader2 } from 'lucide-react';

interface GhostToolCardProps {
  toolName: string;
  domain?: string;
  position?: number; // Queue position
  estimatedTime?: string; // "~5 minutes"
}

export function GhostToolCard({
  toolName,
  domain,
  position,
  estimatedTime = '~10 minutes',
}: GhostToolCardProps) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card/50 p-6 opacity-60 transition-opacity hover:opacity-80">
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative space-y-4">
        {/* Tool name and domain */}
        <div>
          <h3 className="text-lg font-semibold text-foreground">{toolName}</h3>
          {domain && <p className="text-sm text-muted-foreground">{domain}</p>}
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>
            {position
              ? `#${position} in analysis queue`
              : 'Currently being analyzed by StackHunt Engine'}
          </span>
        </div>

        {/* Estimated time */}
        <div className="rounded-md bg-muted/50 p-3 text-sm">
          <p className="text-muted-foreground">
            <strong className="text-foreground">Detected in search results.</strong> Deep analysis
            in progress... Check back in{' '}
            <span className="font-medium text-foreground">{estimatedTime}</span>
          </p>
        </div>

        {/* Ghost data placeholders */}
        <div className="space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted/50" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted/50" />
        </div>
      </div>

      {/* SEO-friendly hidden text */}
      <div className="sr-only">
        {toolName} is currently being researched and analyzed. Check back soon for detailed pricing,
        features, pros, cons, and expert verdict.
      </div>
    </div>
  );
}

/**
 * Ghost Card Grid - Shows mix of completed and pending tools
 */
interface GhostToolGridProps {
  completedTools: React.ReactNode[]; // FullToolCard components
  queuedTools: Array<{ name: string; domain?: string }>;
}

export function GhostToolGrid({ completedTools, queuedTools }: GhostToolGridProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Completed tools first */}
      {completedTools}

      {/* Queued tools as ghost cards */}
      {queuedTools.map((tool, idx) => (
        <GhostToolCard
          key={tool.name}
          toolName={tool.name}
          domain={tool.domain}
          position={idx + 1}
          estimatedTime={idx === 0 ? '~5 minutes' : '~15 minutes'}
        />
      ))}
    </div>
  );
}

/**
 * Add shimmer animation to global CSS
 *
 * @keyframes shimmer {
 *   100% {
 *     transform: translateX(100%);
 *   }
 * }
 */
