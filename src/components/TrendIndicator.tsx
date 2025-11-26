import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendIndicatorProps {
  currentValue: number;
  previousValue: number;
  showPercentage?: boolean;
  className?: string;
}

export function TrendIndicator({ 
  currentValue, 
  previousValue, 
  showPercentage = true,
  className 
}: TrendIndicatorProps) {
  const change = currentValue - previousValue;
  const percentageChange = previousValue !== 0 
    ? ((change / previousValue) * 100) 
    : 0;

  const isPositive = change > 0;
  const isNegative = change < 0;
  const isNeutral = change === 0;

  if (isNeutral) {
    return (
      <div className={cn("inline-flex items-center gap-1 text-muted-foreground", className)}>
        <Minus className="h-3 w-3" />
        {showPercentage && <span className="text-xs">0%</span>}
      </div>
    );
  }

  return (
    <div className={cn(
      "inline-flex items-center gap-1",
      isPositive && "text-green-600",
      isNegative && "text-red-600",
      className
    )}>
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {showPercentage && (
        <span className="text-xs font-medium">
          {Math.abs(percentageChange).toFixed(1)}%
        </span>
      )}
    </div>
  );
}
