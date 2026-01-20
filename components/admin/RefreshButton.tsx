'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RefreshButtonProps {
  onClick: () => void | Promise<void>;
  title?: string;
}

const SPIN_DURATION_MS = 600;

export function RefreshButton({ onClick, title = 'Refresh' }: RefreshButtonProps) {
  const [isSpinning, setIsSpinning] = useState(false);

  const handleClick = async () => {
    if (isSpinning) return;
    setIsSpinning(true);
    try {
      await Promise.resolve(onClick());
    } finally {
      setTimeout(() => setIsSpinning(false), SPIN_DURATION_MS);
    }
  };

  return (
    <Button
      variant="outline"
      size="icon"
      title={title}
      onClick={handleClick}
      disabled={isSpinning}
      className="shrink-0"
    >
      <RefreshCw
        className={cn(
          'h-4 w-4 transition-transform',
          isSpinning && 'animate-refresh-spin'
        )}
      />
    </Button>
  );
}
