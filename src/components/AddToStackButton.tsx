/**
 * Add to Stack Button
 *
 * Button to add/remove tools from the user's "My Stack" cost calculator.
 * Works with the MyStackWidget component.
 */

import { useState, useEffect } from 'react';
import { addToStack, removeFromStack, isInStack } from './MyStackWidget';

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

  const handleToggle = () => {
    if (isAdded) {
      removeFromStack(toolSlug);
      setIsAdded(false);
    } else {
      addToStack({
        slug: toolSlug,
        name: toolName,
        logo: toolLogo,
        pricing,
      });
      setIsAdded(true);
    }
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={handleToggle}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
          isAdded
            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
        title={isAdded ? 'Remove from My Stack' : 'Add to My Stack'}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {isAdded ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          )}
        </svg>
        {isAdded ? 'In Stack' : 'Stack'}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
        isAdded
          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`}
    >
      {isAdded ? (
        <>
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          In My Stack
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add to Stack
        </>
      )}
    </button>
  );
}
