import * as React from "react";
import { cn } from "cn";

type ProgressProps = React.ComponentProps<"div"> & {
  value?: number;
};

function Progress({ className, value = 0, children, ...props }: ProgressProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className={cn(
        "relative h-5 w-full overflow-hidden rounded-md bg-surface-container-high",
        className,
      )}
      {...props}
      style={{ width: `${clampedValue}%`, ...props.style }}
    >
      {children ?? (
        <div
          data-slot="progress-indicator"
          className="h-full bg-primary transition-all"
          style={{ width: `${clampedValue}%` }}
        />
      )}
    </div>
  );
}

export { Progress };
