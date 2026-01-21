/**
 * My Stack Widget
 *
 * A floating sidebar that shows tools the user has "added to their stack"
 * and calculates total monthly software costs based on Knowledge Card pricing.
 */

import { useState, useEffect } from 'react';

interface StackTool {
  slug: string;
  name: string;
  logo?: string | null;
  pricing?: {
    starting_price?: number | null;
    model?: string;
    currency?: string;
  };
}

const STORAGE_KEY = 'stackhunt_my_stack';

function getStackTools(): StackTool[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setStackTools(tools: StackTool[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tools));
  window.dispatchEvent(new CustomEvent('stack-tools-changed', { detail: tools }));
}

// Export helper for use by AddToStackButton
export function addToStack(tool: StackTool) {
  const tools = getStackTools();
  if (tools.some(t => t.slug === tool.slug)) return false;
  setStackTools([...tools, tool]);
  return true;
}

export function removeFromStack(slug: string) {
  const tools = getStackTools().filter(t => t.slug !== slug);
  setStackTools(tools);
}

export function isInStack(slug: string): boolean {
  return getStackTools().some(t => t.slug === slug);
}

export default function MyStackWidget() {
  const [stackTools, setStackToolsState] = useState<StackTool[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);

  useEffect(() => {
    // Initial load
    setStackToolsState(getStackTools());

    // Listen for changes
    const handleChange = (e: CustomEvent) => {
      setStackToolsState(e.detail as StackTool[]);
    };

    window.addEventListener('stack-tools-changed', handleChange as EventListener);
    return () => window.removeEventListener('stack-tools-changed', handleChange as EventListener);
  }, []);

  // Calculate total monthly cost
  const totalCost = stackTools.reduce((sum, tool) => {
    const price = tool.pricing?.starting_price;
    return sum + (typeof price === 'number' ? price : 0);
  }, 0);

  // Count tools with known pricing
  const toolsWithPricing = stackTools.filter(t => typeof t.pricing?.starting_price === 'number').length;
  const toolsWithoutPricing = stackTools.length - toolsWithPricing;

  const handleRemove = (slug: string) => {
    removeFromStack(slug);
  };

  const handleClear = () => {
    setStackTools([]);
  };

  // Don't render if no tools
  if (stackTools.length === 0) return null;

  return (
    <>
      {/* Minimized Floating Button */}
      {isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="font-medium">My Stack ({stackTools.length})</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-sm">
            ${totalCost.toFixed(0)}/mo
          </span>
        </button>
      )}

      {/* Expanded Panel */}
      {!isMinimized && (
        <div className="fixed bottom-4 right-4 z-50 w-80 rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="font-semibold">My Stack</span>
              </div>
              <button
                onClick={() => setIsMinimized(true)}
                className="text-white/80 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tools List */}
          <div className="max-h-64 overflow-y-auto p-2">
            {stackTools.map((tool) => (
              <div
                key={tool.slug}
                className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50 group"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                  {tool.logo ? (
                    <img src={tool.logo} alt="" className="h-full w-full object-contain p-1" />
                  ) : (
                    <span className="text-xs font-bold text-slate-400">{tool.name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <a
                    href={`/tools/${tool.slug}`}
                    className="block text-sm font-medium text-slate-900 truncate hover:text-emerald-600"
                  >
                    {tool.name}
                  </a>
                  <span className="text-xs text-slate-500">
                    {tool.pricing?.starting_price != null ? (
                      `$${tool.pricing.starting_price}/mo`
                    ) : tool.pricing?.model === 'free' || tool.pricing?.model === 'open_source' ? (
                      'Free'
                    ) : (
                      'Price unknown'
                    )}
                  </span>
                </div>
                <button
                  onClick={() => handleRemove(tool.slug)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition"
                  title="Remove from stack"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Cost Summary */}
          <div className="border-t border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Estimated Monthly Cost</span>
              <span className="text-lg font-bold text-emerald-600">
                ${totalCost.toFixed(2)}
              </span>
            </div>
            {toolsWithoutPricing > 0 && (
              <p className="text-xs text-slate-500">
                * {toolsWithoutPricing} tool{toolsWithoutPricing > 1 ? 's' : ''} with unknown pricing
              </p>
            )}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
              <span className="text-xs text-slate-500">
                Annual: ~${(totalCost * 12).toFixed(0)}
              </span>
              <button
                onClick={handleClear}
                className="text-xs text-red-500 hover:text-red-600"
              >
                Clear Stack
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
