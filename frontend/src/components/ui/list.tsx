import * as React from "react";
import { cn } from "@/lib/utils";

interface ListProps extends React.ComponentProps<"ul"> {}
interface ListItemProps extends React.ComponentProps<"li"> {}

/**
 * A simple list container.
 * Renders a <ul> with clean spacing and separators.
 */
export function List({ className, ...props }: ListProps) {
  return (
    <ul
      className={cn(
        "divide-y divide-border bg-card rounded-md border",
        className
      )}
      {...props}
    />
  );
}

/**
 * A single item in a List.
 * Renders a <li> with padding and flex layout.
 */
export function ListItem({ className, ...props }: ListItemProps) {
  return (
    <li
      className={cn(
        "flex items-center justify-between px-6 py-3 hover:bg-muted/50",
        className
      )}
      {...props}
    />
  );
}
