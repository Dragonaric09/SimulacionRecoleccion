import * as React from "react";
import { cn } from "cn";
import { Progress as ProgressPrimitive } from "radix-ui";

function Progress({ className, value, children, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const clampedValue = Math.max(0, Math.min(100, value ?? 0));
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-5 w-full overflow-hidden rounded-md bg-surface-container-high",
        className,
      )}
      value={clampedValue}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full transition-all"
        style={{ width: `${clampedValue}%` }}
      >
        {children ?? (
          <div
          data-slot="progress-indicator"
            className="h-full w-full bg-primary"
          />
        )}
      </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
  );
}

export { Progress };
