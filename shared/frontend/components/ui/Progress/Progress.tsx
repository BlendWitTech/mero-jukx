import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../../utils/helpers/classNames';

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger';
  smartColor?: boolean;
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, showValue = false, size = 'md', variant = 'default', smartColor = false, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const getSmartColor = () => {
      if (percentage <= 30) return 'bg-primary-600';
      if (percentage <= 70) return 'bg-green-600';
      if (percentage <= 90) return 'bg-yellow-500';
      return 'bg-red-600';
    };

    const sizes: Record<'sm' | 'md' | 'lg', string> = {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3',
    };

    const variants: Record<'default' | 'success' | 'warning' | 'danger', string> = {
      default: 'bg-primary-600',
      success: 'bg-green-600',
      warning: 'bg-yellow-600',
      danger: 'bg-red-600',
    };

    return (
      <div className={cn('w-full', className)} {...props}>
        <div
          ref={ref}
          className={cn(
            'relative w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700',
            sizes[size]
          )}
        >
          <div
            className={cn(
              'h-full transition-all duration-300 ease-in-out',
              smartColor ? getSmartColor() : variants[variant]
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showValue && (
          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 text-right">
            {Math.round(percentage)}%
          </div>
        )}
      </div>
    );
  }
);

Progress.displayName = 'Progress';

