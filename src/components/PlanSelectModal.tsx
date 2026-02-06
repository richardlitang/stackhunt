/**
 * Plan Selection Modal
 *
 * Modal for selecting a specific plan when adding a tool to "My Stack".
 * Handles per-seat pricing and billing cycle selection.
 */

import { useState, useMemo } from 'react';
import { Check, Users, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface PlanOption {
  id: string;
  name: string;
  price_monthly: number | null;
  price_annual: number | null;
  price_per_unit: number | null;
  scaling_unit: string | null;
  included_units: number | null;
  max_users: number | null;
  is_enterprise: boolean;
  includes_sso?: boolean;
  includes_api?: boolean;
}

export interface SelectedPlan {
  planId: string;
  planName: string;
  seats: number;
  billingCycle: 'monthly' | 'annual';
  pricePerUnit: number;
  totalMonthly: number;
  scalingUnit: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (plan: SelectedPlan) => void;
  toolName: string;
  toolLogo?: string | null;
  plans: PlanOption[];
  pricingModel?: string;
}

export default function PlanSelectModal({
  isOpen,
  onClose,
  onConfirm,
  toolName,
  toolLogo,
  plans,
  pricingModel,
}: Props) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(() => {
    // Default to first non-enterprise plan with pricing
    const defaultPlan = plans.find(
      (p) => !p.is_enterprise && (p.price_monthly != null || p.price_annual != null)
    );
    return defaultPlan?.id || plans[0]?.id || '';
  });
  const [seats, setSeats] = useState(1);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  // Is this a per-seat pricing model?
  const isPerSeat = pricingModel === 'per_seat' || selectedPlan?.scaling_unit != null;

  // Calculate the monthly cost
  const calculatedCost = useMemo(() => {
    if (!selectedPlan) return 0;

    // Enterprise = contact sales
    if (selectedPlan.is_enterprise) return 0;

    // Free plan
    if (selectedPlan.price_monthly === 0 && selectedPlan.price_annual === 0) return 0;

    let monthlyRate: number;

    if (billingCycle === 'annual' && selectedPlan.price_annual != null) {
      // Annual price divided by 12 to get monthly equivalent
      monthlyRate = selectedPlan.price_annual / 12;
    } else if (selectedPlan.price_monthly != null) {
      monthlyRate = selectedPlan.price_monthly;
    } else if (selectedPlan.price_annual != null) {
      // Only annual available
      monthlyRate = selectedPlan.price_annual / 12;
    } else {
      return 0;
    }

    // Multiply by seats if per-seat pricing
    if (isPerSeat) {
      return monthlyRate * seats;
    }

    return monthlyRate;
  }, [selectedPlan, seats, billingCycle, isPerSeat]);

  const handleConfirm = () => {
    if (!selectedPlan) return;

    const pricePerUnit =
      billingCycle === 'annual' && selectedPlan.price_annual != null
        ? selectedPlan.price_annual / 12
        : selectedPlan.price_monthly || 0;

    onConfirm({
      planId: selectedPlan.id,
      planName: selectedPlan.name,
      seats: isPerSeat ? seats : 1,
      billingCycle,
      pricePerUnit,
      totalMonthly: calculatedCost,
      scalingUnit: selectedPlan.scaling_unit,
    });
  };

  // Sort plans: Free first, then by price, Enterprise last
  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => {
      // Free plans first
      if (a.price_monthly === 0 && b.price_monthly !== 0) return -1;
      if (b.price_monthly === 0 && a.price_monthly !== 0) return 1;

      // Enterprise last
      if (a.is_enterprise && !b.is_enterprise) return 1;
      if (b.is_enterprise && !a.is_enterprise) return -1;

      // Sort by price
      const priceA = a.price_monthly ?? a.price_annual ?? 999999;
      const priceB = b.price_monthly ?? b.price_annual ?? 999999;
      return priceA - priceB;
    });
  }, [plans]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {toolLogo && (
              <img src={toolLogo} alt="" className="h-8 w-8 rounded-lg object-contain" />
            )}
            Add {toolName} to Stack
          </DialogTitle>
          <DialogDescription>Select your plan to calculate accurate costs</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Plan Selection */}
          <div className="space-y-3">
            <span className="text-sm font-medium text-slate-900">Select Plan</span>
            <div className="space-y-2">
              {sortedPlans.map((plan) => {
                const isFree = plan.price_monthly === 0 && plan.price_annual === 0;
                const displayPrice =
                  plan.price_monthly != null
                    ? `$${plan.price_monthly}${plan.scaling_unit ? `/${plan.scaling_unit}` : ''}/mo`
                    : plan.price_annual != null
                      ? `$${plan.price_annual}${plan.scaling_unit ? `/${plan.scaling_unit}` : ''}/yr`
                      : plan.is_enterprise
                        ? 'Contact Sales'
                        : 'Price unknown';

                return (
                  <label
                    key={plan.id}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition',
                      selectedPlanId === plan.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={plan.id}
                      checked={selectedPlanId === plan.id}
                      onChange={() => setSelectedPlanId(plan.id)}
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full border-2',
                        selectedPlanId === plan.id
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-slate-300'
                      )}
                    >
                      {selectedPlanId === plan.id && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{plan.name}</div>
                      <div className="text-sm text-slate-500">
                        {isFree ? (
                          <span className="text-emerald-600 font-medium">Free</span>
                        ) : (
                          displayPrice
                        )}
                      </div>
                    </div>
                    {plan.includes_sso && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        SSO
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Seat Count (for per-seat plans) */}
          {isPerSeat &&
            selectedPlan &&
            !selectedPlan.is_enterprise &&
            selectedPlan.price_monthly !== 0 && (
              <div className="space-y-2">
                <label
                  htmlFor="seats"
                  className="text-sm font-medium text-slate-900 flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Number of {selectedPlan.scaling_unit || 'seat'}s
                </label>
                <Input
                  id="seats"
                  type="number"
                  min={1}
                  max={1000}
                  value={seats}
                  onChange={(e) => setSeats(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24"
                />
              </div>
            )}

          {/* Billing Cycle */}
          {selectedPlan &&
            !selectedPlan.is_enterprise &&
            (selectedPlan.price_monthly || selectedPlan.price_annual) && (
              <div className="space-y-2">
                <span className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Billing Cycle
                </span>
                <div className="flex gap-4">
                  <label
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-4 py-2 cursor-pointer transition',
                      billingCycle === 'monthly'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <input
                      type="radio"
                      name="billingCycle"
                      value="monthly"
                      checked={billingCycle === 'monthly'}
                      onChange={() => setBillingCycle('monthly')}
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        'h-4 w-4 rounded-full border-2 flex items-center justify-center',
                        billingCycle === 'monthly'
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-slate-300'
                      )}
                    >
                      {billingCycle === 'monthly' && (
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-sm">Monthly</span>
                  </label>
                  <label
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-4 py-2 cursor-pointer transition',
                      billingCycle === 'annual'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <input
                      type="radio"
                      name="billingCycle"
                      value="annual"
                      checked={billingCycle === 'annual'}
                      onChange={() => setBillingCycle('annual')}
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        'h-4 w-4 rounded-full border-2 flex items-center justify-center',
                        billingCycle === 'annual'
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-slate-300'
                      )}
                    >
                      {billingCycle === 'annual' && (
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-sm">Annual</span>
                    {selectedPlan.price_annual && selectedPlan.price_monthly && (
                      <span className="text-xs text-emerald-600">
                        Save{' '}
                        {Math.round(
                          (1 - selectedPlan.price_annual / (selectedPlan.price_monthly * 12)) * 100
                        )}
                        %
                      </span>
                    )}
                  </label>
                </div>
              </div>
            )}

          {/* Cost Preview */}
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Your monthly cost</span>
              <span className="text-2xl font-bold text-emerald-600">
                {selectedPlan?.is_enterprise
                  ? 'Custom'
                  : calculatedCost === 0
                    ? 'Free'
                    : `$${calculatedCost.toFixed(2)}`}
              </span>
            </div>
            {isPerSeat && seats > 1 && calculatedCost > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                {seats} {selectedPlan?.scaling_unit || 'seat'}s × $
                {(calculatedCost / seats).toFixed(2)}/{selectedPlan?.scaling_unit || 'seat'}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="bg-emerald-500 hover:bg-emerald-600">
            Add to Stack
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
