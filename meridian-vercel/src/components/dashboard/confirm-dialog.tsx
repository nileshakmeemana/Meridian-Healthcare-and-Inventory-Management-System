'use client';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ConfirmProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<unknown> | void;
  children?: ReactNode;
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Confirm', destructive, onConfirm, children }: ConfirmProps) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { await onConfirm(); onOpenChange(false); } catch { /* caller shows the toast */ } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant={destructive ? 'destructive' : 'default'} disabled={busy} onClick={run}>{busy ? 'Working…' : confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
