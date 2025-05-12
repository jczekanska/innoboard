import * as React from "react";
import { cn } from "@/lib/utils";

interface SeparatorProps extends React.ComponentProps<"hr"> {}

/**
 * A thin horizontal rule for dividing content.
 */
export function Separator({ className, ...props }: SeparatorProps) {
  return (
    <hr
      role="separator"
      className={cn(
        "w-full border-t border-border my-4",
        className
      )}
      {...props}
    />
  );
}
