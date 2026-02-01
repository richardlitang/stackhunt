/**
 * My Stack Widget
 *
 * A floating sidebar that shows tools the user has "added to their stack"
 * and calculates total monthly software costs based on selected plans.
 */

import React, { useState, useEffect } from 'react';
import { Layers, X, Edit2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SelectedPlan {
  planId: string;
  planName: string;
  seats: number;
  billingCycle: 'monthly' | 'annual';
  pricePerUnit: number;
  totalMonthly: number;
  scalingUnit: string | null;
}

export interface StackTool {
  slug: string;
  name: string;
  logo?: string | null;
  pricing?: {
    starting_price?: number | null;
    model?: string;
    currency?: string;
  };
  selectedPlan?: SelectedPlan;
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
  // Remove existing if present (to update with new plan)
  const filtered = tools.filter(t => t.slug !== tool.slug);
  setStackTools([...filtered, tool]);
  return true;
}

export function removeFromStack(slug: string) {
  const tools = getStackTools().filter(t => t.slug !== slug);
  setStackTools(tools);
}

export function updateStackTool(slug: string, updates: Partial<StackTool>) {
  const tools = getStackTools().map(t =>
    t.slug === slug ? { ...t, ...updates } : t
  );
  setStackTools(tools);
}

export function isInStack(slug: string): boolean {
  return getStackTools().some(t => t.slug === slug);
}

export default function MyStackWidget() {
  const [stackTools, setStackToolsState] = useState<StackTool[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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
    // Use selectedPlan if available, otherwise fall back to starting_price
    if (tool.selectedPlan) {
      return sum + tool.selectedPlan.totalMonthly;
    }
    const price = tool.pricing?.starting_price;
    return sum + (typeof price === 'number' ? price : 0);
  }, 0);

  // Count tools with known pricing
  const toolsWithPricing = stackTools.filter(t =>
    t.selectedPlan?.totalMonthly != null || typeof t.pricing?.starting_price === 'number'
  ).length;
  const toolsWithoutPricing = stackTools.length - toolsWithPricing;

  // Count total seats
  const totalSeats = stackTools.reduce((sum, tool) => {
    return sum + (tool.selectedPlan?.seats || 1);
  }, 0);

  const handleRemove = (slug: string) => {
    removeFromStack(slug);
  };

  const handleClear = () => {
    setStackTools([]);
    setShowClearConfirm(false);
  };

  // Format price display for a tool
  const formatToolPrice = (tool: StackTool): string => {
    if (tool.selectedPlan) {
      const { totalMonthly, planName, seats, scalingUnit } = tool.selectedPlan;
      if (totalMonthly === 0) return `${planName} (Free)`;
      if (seats > 1 && scalingUnit) {
        return `$${totalMonthly.toFixed(0)}/mo (${seats} ${scalingUnit}s)`;
      }
      return `$${totalMonthly.toFixed(0)}/mo`;
    }
    if (tool.pricing?.starting_price != null) {
      return `$${tool.pricing.starting_price}/mo`;
    }
    if (tool.pricing?.model === 'free' || tool.pricing?.model === 'open_source') {
      return 'Free';
    }
    return 'Price unknown';
  };

  // Don't render if no tools
  if (stackTools.length === 0) return null;

  return (
    <>
      {/* Clear Confirmation Dialog */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle>Clear Your Stack?</DialogTitle>
            <DialogDescription>
              This will remove all {stackTools.length} tool{stackTools.length !== 1 ? 's' : ''} from your stack. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClear}>
              Clear Stack
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 hover:from-emerald-600 hover:to-teal-600">
            <Layers className="h-5 w-5" />
            <span className="font-medium">My Stack ({stackTools.length})</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-sm">
              ${totalCost.toFixed(0)}/mo
            </span>
          </Button>
        </SheetTrigger>

        <SheetContent side="right" className="w-80 p-0 bg-white">
          {/* Header */}
          <SheetHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-white">
            <SheetTitle className="flex items-center gap-2 text-white">
              <Layers className="h-5 w-5" />
              <span className="font-semibold">My Stack</span>
            </SheetTitle>
          </SheetHeader>

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
                    href={`/tool/${tool.slug}`}
                    className="block text-sm font-medium text-slate-900 truncate hover:text-emerald-600"
                  >
                    {tool.name}
                  </a>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">
                      {formatToolPrice(tool)}
                    </span>
                    {tool.selectedPlan && (
                      <span className="text-xs text-slate-400">
                        • {tool.selectedPlan.planName}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(tool.slug)}
                  className="h-auto w-auto p-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-transparent"
                  title="Remove from stack"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Separator />

          {/* Cost Summary */}
          <div className="bg-slate-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Monthly Cost</span>
              <span className="text-xl font-bold text-emerald-600">
                ${totalCost.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>{stackTools.length} tool{stackTools.length !== 1 ? 's' : ''}</span>
              {totalSeats > stackTools.length && (
                <span>{totalSeats} total seats</span>
              )}
            </div>

            {toolsWithoutPricing > 0 && (
              <p className="text-xs text-amber-600 mb-2">
                * {toolsWithoutPricing} tool{toolsWithoutPricing > 1 ? 's' : ''} with unknown pricing
              </p>
            )}

            <Separator className="my-3" />

            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">
                <div>Annual: ~${(totalCost * 12).toFixed(0)}</div>
              </div>
              <Button
                variant="link"
                size="sm"
                onClick={() => setShowClearConfirm(true)}
                className="h-auto p-0 text-xs text-red-500 hover:text-red-600"
              >
                Clear Stack
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
