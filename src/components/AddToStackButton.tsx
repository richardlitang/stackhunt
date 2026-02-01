/**
 * Add to Stack Button
 *
 * Button to add/remove tools from the user's "My Stack" cost calculator.
 * Opens a modal to select plan and seats for accurate cost tracking.
 */

import { useState, useEffect } from 'react';
import { Check, Plus } from 'lucide-react';
import { addToStack, removeFromStack, isInStack, updateStackTool } from './MyStackWidget';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import PlanSelectModal, { type PlanOption, type SelectedPlan } from './PlanSelectModal';

interface Props {
  toolSlug: string;
  toolName: string;
  toolLogo?: string | null;
  pricing?: {
    starting_price?: number | null;
    model?: string;
    currency?: string;
  };
  plans?: PlanOption[];
  variant?: 'default' | 'compact';
}

export default function AddToStackButton({
  toolSlug,
  toolName,
  toolLogo,
  pricing,
  plans,
  variant = 'default',
}: Props) {
  const [isAdded, setIsAdded] = useState(false);
  const [showModal, setShowModal] = useState(false);

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
      // If we have plans, show the modal
      if (plans && plans.length > 0) {
        setShowModal(true);
      } else {
        // Fallback: add with basic pricing info
        addToStack({
          slug: toolSlug,
          name: toolName,
          logo: toolLogo,
          pricing,
        });
        setIsAdded(true);
      }
    } else {
      removeFromStack(toolSlug);
      setIsAdded(false);
    }
  };

  const handlePlanConfirm = (selectedPlan: SelectedPlan) => {
    addToStack({
      slug: toolSlug,
      name: toolName,
      logo: toolLogo,
      pricing,
      selectedPlan,
    });
    setIsAdded(true);
    setShowModal(false);
  };

  if (variant === 'compact') {
    return (
      <>
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

        {plans && plans.length > 0 && (
          <PlanSelectModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onConfirm={handlePlanConfirm}
            toolName={toolName}
            toolLogo={toolLogo}
            plans={plans}
            pricingModel={pricing?.model}
          />
        )}
      </>
    );
  }

  return (
    <>
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

      {plans && plans.length > 0 && (
        <PlanSelectModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={handlePlanConfirm}
          toolName={toolName}
          toolLogo={toolLogo}
          plans={plans}
          pricingModel={pricing?.model}
        />
      )}
    </>
  );
}
