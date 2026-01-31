/**
 * Add to Stack Button
 *
 * Button to add/remove tools from the user's "My Stack" cost calculator.
 * Works with the MyStackWidget component.
 */

import { useState, useEffect } from 'react';
import { Check, Plus } from 'lucide-react';
import { addToStack, removeFromStack, isInStack } from './MyStackWidget';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';

interface Props {
  toolSlug: string;
  toolName: string;
  toolLogo?: string | null;
  pricing?: {
    starting_price?: number | null;
    model?: string;
    currency?: string;
  };
  variant?: 'default' | 'compact';
}

export default function AddToStackButton({
  toolSlug,
  toolName,
  toolLogo,
  pricing,
  variant = 'default',
}: Props) {
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    // Check initial state
    setIsAdded(isInStack(toolSlug));

    // Listen for changes
    const handleChange = () => {
      setIsAdded(isInStack(toolSlug));
    };

    window.addEventListener('stack-tools-changed', handleChange);
    return () => window.removeEventListener('stack-tools-changed', handleChange);
  }, [toolSlug]);

  const handleToggle = (pressed: boolean) => {
    if (pressed) {
      addToStack({
        slug: toolSlug,
        name: toolName,
        logo: toolLogo,
        pricing,
      });
      setIsAdded(true);
    } else {
      removeFromStack(toolSlug);
      setIsAdded(false);
    }
  };

  if (variant === 'compact') {
    return (
      <Toggle
        pressed={isAdded}
        onPressedChange={handleToggle}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
          isAdded
            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200/70 data-[state=on]:bg-emerald-100 data-[state=on]:text-emerald-700"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200/70 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700/80"
        )}
        title={isAdded ? 'Remove from My Stack' : 'Add to My Stack'}
      >
        {isAdded ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Plus className="h-3.5 w-3.5" />
        )}
        {isAdded ? 'In Stack' : 'Stack'}
      </Toggle>
    );
  }

  return (
    <Toggle
      pressed={isAdded}
      onPressedChange={handleToggle}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition",
        isAdded
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200/70 data-[state=on]:bg-emerald-100 data-[state=on]:text-emerald-700"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200/70 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700/80"
      )}
    >
      {isAdded ? (
        <>
          <Check className="h-4 w-4" />
          In My Stack
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" />
          Add to Stack
        </>
      )}
    </Toggle>
  );
}
