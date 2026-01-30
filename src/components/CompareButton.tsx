/**
 * Compare Button Component
 *
 * Allows users to add tools to a comparison list stored in localStorage.
 * Shows a floating comparison bar when tools are selected.
 */

import { useState, useEffect } from 'react';
import { Check, Clipboard, X, Trash2 } from 'lucide-react';

interface Props {
  toolSlug: string;
  toolName: string;
  toolLogo?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
}

const STORAGE_KEY = 'stackhunt_compare_tools';
const MAX_COMPARE_TOOLS = 4;

interface CompareTool {
  slug: string;
  name: string;
  logo?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
}

function getCompareTools(): CompareTool[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setCompareTools(tools: CompareTool[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tools.slice(0, MAX_COMPARE_TOOLS)));
  // Dispatch event for other components to listen
  window.dispatchEvent(new CustomEvent('compare-tools-changed', { detail: tools }));
}

export default function CompareButton({ toolSlug, toolName, toolLogo, categorySlug, categoryName }: Props) {
  const [isAdded, setIsAdded] = useState(false);
  const [compareTools, setCompareToolsState] = useState<CompareTool[]>([]);

  useEffect(() => {
    // Initial load
    const tools = getCompareTools();
    setCompareToolsState(tools);
    setIsAdded(tools.some(t => t.slug === toolSlug));

    // Listen for changes from other components
    const handleChange = (e: CustomEvent) => {
      const tools = e.detail as CompareTool[];
      setCompareToolsState(tools);
      setIsAdded(tools.some(t => t.slug === toolSlug));
    };

    window.addEventListener('compare-tools-changed', handleChange as EventListener);
    return () => window.removeEventListener('compare-tools-changed', handleChange as EventListener);
  }, [toolSlug]);

  const handleToggle = () => {
    const tools = getCompareTools();

    if (isAdded) {
      // Remove
      const newTools = tools.filter(t => t.slug !== toolSlug);
      setCompareTools(newTools);
      setIsAdded(false);
    } else {
      // Add (if not at max)
      if (tools.length >= MAX_COMPARE_TOOLS) {
        alert(`You can compare up to ${MAX_COMPARE_TOOLS} tools at once. Remove one to add another.`);
        return;
      }

      // Enforce same category - only allow sensible comparisons
      if (tools.length > 0 && categorySlug) {
        const existingCategories = new Set(tools.map(t => t.categorySlug).filter(Boolean));
        if (existingCategories.size > 0 && !existingCategories.has(categorySlug)) {
          alert(`You can only compare tools from the same category. Clear your selection to compare ${toolName} with other ${categoryName || 'similar'} tools.`);
          return;
        }
      }

      const newTools = [...tools, { slug: toolSlug, name: toolName, logo: toolLogo, categorySlug, categoryName }];
      setCompareTools(newTools);
      setIsAdded(true);
    }
  };

  const handleRemove = (slug: string) => {
    const tools = getCompareTools().filter(t => t.slug !== slug);
    setCompareTools(tools);
  };

  const handleCompare = () => {
    if (compareTools.length < 2) {
      alert('Select at least 2 tools to compare');
      return;
    }
    const [a, b] = compareTools;
    window.location.href = `/compare/${a.slug}-vs-${b.slug}`;
  };

  const handleClear = () => {
    setCompareTools([]);
  };

  return (
    <>
      {/* Add to Compare Button */}
      <button
        onClick={handleToggle}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
          isAdded
            ? 'bg-hunt-100 text-hunt-700 hover:bg-hunt-200'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`}
      >
        {isAdded ? (
          <>
            <Check className="h-4 w-4" />
            Added to Compare
          </>
        ) : (
          <>
            <Clipboard className="h-4 w-4" />
            Add to Compare
          </>
        )}
      </button>

      {/* Floating Comparison Bar */}
      {compareTools.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 shadow-xl">
          {/* Selected Tools */}
          <div className="flex items-center gap-2">
            {compareTools.map((tool, idx) => (
              <div key={tool.slug} className="flex items-center">
                {idx > 0 && <span className="mx-1 text-slate-500">vs</span>}
                <div className="group relative flex items-center gap-1.5 rounded-lg bg-slate-800 px-2 py-1">
                  {tool.logo && (
                    <img src={tool.logo} alt="" className="h-5 w-5 rounded" />
                  )}
                  <span className="text-sm text-white">{tool.name}</span>
                  <button
                    onClick={() => handleRemove(tool.slug)}
                    className="ml-1 text-slate-400 hover:text-white"
                    title="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
            <button
              onClick={handleCompare}
              disabled={compareTools.length < 2}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                compareTools.length >= 2
                  ? 'bg-hunt-500 text-white hover:bg-hunt-600'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              Compare ({compareTools.length})
            </button>
            <button
              onClick={handleClear}
              className="rounded-lg px-2 py-1.5 text-sm text-slate-400 hover:text-white"
              title="Clear all"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
