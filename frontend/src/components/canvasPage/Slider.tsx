import * as SliderPrimitive from "@radix-ui/react-slider"
import React from "react"

const Slider = React.forwardRef<
    HTMLSpanElement,
    React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
    <SliderPrimitive.Root
        ref={ref}
        className={`relative flex w-full touch-none select-none items-center ${className}`}
        {...props}
    >
        <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-gray-200">
            <SliderPrimitive.Range className="absolute h-full bg-black" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-black bg-white shadow hover:bg-gray-100 focus:outline-none" />
    </SliderPrimitive.Root>
))

Slider.displayName = "Slider"

export default Slider 
