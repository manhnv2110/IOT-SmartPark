import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  align?: "start" | "center";
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  align = "start",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-3 mb-5",
        align === "center" && "justify-center text-center",
        className
      )}
    >
      <div className={cn("min-w-0", align === "center" && "mx-auto max-w-2xl")}>
        {eyebrow && (
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary mb-1.5">
            {eyebrow}
          </div>
        )}
        <h2 className="text-title font-bold tracking-tight text-balance">{title}</h2>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground text-pretty max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
