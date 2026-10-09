import * as React from "react";
import { Slider as SliderPrimitive } from "radix-ui";
import { cn } from "cn";

function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-surface-container-high">
        <SliderPrimitive.Range className="absolute h-full bg-titulados" />
      </SliderPrimitive.Track>
      {Array.from({ length: props.value?.length ?? props.defaultValue?.length ?? 1 }).map((_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          className="block size-4 rounded-full border-2 border-titulados bg-surface-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-titulados/40 disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
