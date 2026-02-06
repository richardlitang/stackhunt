/**
 * Team Size Selector - Persistent user preference for pricing calculations
 *
 * Stores team size in localStorage and updates pricing displays across the site.
 * Used for: cost calculators, comparison tables, pricing displays
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const TEAM_SIZE_PRESETS = [
  { value: 1, label: 'Solo' },
  { value: 3, label: '2-5' },
  { value: 10, label: '6-15' },
  { value: 25, label: '16-50' },
  { value: 100, label: '51+' },
];

const STORAGE_KEY = 'stackhunt_team_size';

interface TeamSizeSelectorProps {
  onChange?: (teamSize: number) => void;
  className?: string;
  compact?: boolean;
}

export default function TeamSizeSelector({
  onChange,
  className,
  compact = false,
}: TeamSizeSelectorProps) {
  const [teamSize, setTeamSize] = useState<number>(1);
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const value = parseInt(stored);
        if (!isNaN(value) && value > 0) {
          setTeamSize(value);
          // Check if it's a custom value
          const isPreset = TEAM_SIZE_PRESETS.some((p) => p.value === value);
          if (!isPreset) {
            setIsCustom(true);
            setCustomValue(value.toString());
          }
        }
      }
    }
  }, []);

  const handleTeamSizeChange = (newSize: number) => {
    setTeamSize(newSize);
    setIsCustom(false);

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newSize.toString());
      // Dispatch event for other components to react
      window.dispatchEvent(new CustomEvent('team-size-change', { detail: newSize }));
    }

    onChange?.(newSize);
  };

  const handleCustomInput = (value: string) => {
    setCustomValue(value);
    const num = parseInt(value);
    if (!isNaN(num) && num > 0 && num <= 10000) {
      handleTeamSizeChange(num);
    }
  };

  if (compact) {
    return (
      <div className={cn('inline-flex items-center gap-2', className)}>
        <span className="text-xs text-zinc-400">Team size:</span>
        <select
          value={isCustom ? 'custom' : teamSize}
          onChange={(e) => {
            if (e.target.value === 'custom') {
              setIsCustom(true);
            } else {
              handleTeamSizeChange(parseInt(e.target.value));
            }
          }}
          className="text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-hunt-500"
        >
          {TEAM_SIZE_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
          <option value="custom">Custom</option>
        </select>

        {isCustom && (
          <input
            type="number"
            value={customValue}
            onChange={(e) => handleCustomInput(e.target.value)}
            placeholder="Enter size"
            min="1"
            max="10000"
            className="w-20 text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-hunt-500"
          />
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <label className="block text-sm font-medium text-zinc-200">
        Your team size
        <span className="ml-2 text-xs text-zinc-500">(we'll remember this)</span>
      </label>

      <div className="flex flex-wrap gap-2">
        {TEAM_SIZE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => handleTeamSizeChange(preset.value)}
            className={cn(
              'px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
              teamSize === preset.value && !isCustom
                ? 'bg-hunt-500 border-hunt-500 text-white'
                : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-hunt-500'
            )}
          >
            {preset.label}
          </button>
        ))}

        <button
          onClick={() => setIsCustom(true)}
          className={cn(
            'px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
            isCustom
              ? 'bg-hunt-500 border-hunt-500 text-white'
              : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-hunt-500'
          )}
        >
          Custom
        </button>
      </div>

      {isCustom && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={customValue}
            onChange={(e) => handleCustomInput(e.target.value)}
            placeholder="Enter team size"
            min="1"
            max="10000"
            autoFocus
            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-hunt-500"
          />
          <span className="text-sm text-zinc-400">people</span>
        </div>
      )}

      {teamSize > 0 && (
        <p className="text-xs text-zinc-500">
          Showing pricing for {teamSize === 1 ? 'solo use' : `team of ${teamSize}`}
        </p>
      )}
    </div>
  );
}

/**
 * Hook to get current team size (syncs across components)
 */
export function useTeamSize() {
  const [teamSize, setTeamSize] = useState<number>(1);

  useEffect(() => {
    // Load initial value
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const value = parseInt(stored);
        if (!isNaN(value) && value > 0) {
          setTeamSize(value);
        }
      }
    }

    // Listen for changes from other components
    const handleChange = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      setTeamSize(customEvent.detail);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('team-size-change', handleChange);
      return () => window.removeEventListener('team-size-change', handleChange);
    }
  }, []);

  return teamSize;
}
