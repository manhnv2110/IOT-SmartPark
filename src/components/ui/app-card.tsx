import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface AppCardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  variant?: "glass" | "solid";
}

/**
 * Standardized card primitive: rounded-2xl glass, consistent padding,
 * optional hover lift for interactive cards. Use everywhere instead of
 * ad-hoc `glass p-5` snippets.
 */
export const AppCard = forwardRef<HTMLDivElement, AppCardProps>(function AppCard(
  { className, interactive, variant = "glass", ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl p-5",
        variant === "glass" ? "glass" : "bg-card border border-border shadow-[var(--shadow-1)]",
        interactive && "lift cursor-pointer",
        className
      )}
      {...rest}
    />
  );
});
