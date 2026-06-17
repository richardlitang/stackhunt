import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DEMO_BANNER_KEY, shouldShowDemoBanner } from '@/lib/demo-banner';

export default function DemoBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (shouldShowDemoBanner(window.localStorage.getItem(DEMO_BANNER_KEY))) {
        setOpen(true);
      }
    } catch {
      /* storage unavailable — never block content */
    }
  }, []);

  const acknowledge = () => {
    try {
      window.localStorage.setItem(DEMO_BANNER_KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) acknowledge();
      }}
    >
      <DialogContent className="border-ink-border bg-ink-900 text-paper">
        <DialogHeader>
          <DialogTitle className="font-grotesk">Heads up — this is a demo</DialogTitle>
          <DialogDescription className="text-paper-muted">
            StackHunt is a demonstration. Tools, scores, and verdicts are illustrative and may not
            reflect real products or current pricing.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={acknowledge} className="bg-signal text-ink-950 hover:brightness-110">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
