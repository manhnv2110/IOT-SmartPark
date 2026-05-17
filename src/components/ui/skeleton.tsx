import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Skeleton primitive family — Async_Surface `skeleton` State_Variant.
 *
 * Tailwind v4 tokens: `bg-muted/50` + `animate-pulse`.
 * Respects `prefers-reduced-motion: reduce` via `motion-reduce:animate-none`
 * (Tailwind variant), so no JavaScript media-query check is needed.
 *
 * Public exports:
 * - `Skeleton`            — base block, optional `lines` for vertical text shimmer
 * - `LotCardSkeleton`     — placeholder for `LotCard` (thumbnail + 2 text lines + progress bar)
 * - `MapSkeleton`         — placeholder for `ParkingMap` (map area + sidebar list)
 * - `StepperSkeleton`     — placeholder for `BookingStepper` (3 circular steps + connectors)
 * - `TableRowSkeleton`    — placeholder for one table row, `cols` columns
 *
 * _Requirements: 3.1, 3.2, 19.6_
 */

const SHIMMER = "bg-muted/50 animate-pulse motion-reduce:animate-none";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** When provided (>1), renders a stacked group of pulsing text-line bars. */
  lines?: number;
}

function Skeleton({ className, lines, ...props }: SkeletonProps) {
  if (typeof lines === "number" && lines > 1) {
    return (
      <div
        aria-hidden="true"
        className={cn("flex w-full flex-col gap-2", className)}
        {...props}
      >
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-4 rounded-md",
              SHIMMER,
              i === lines - 1 && "w-3/4",
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn("rounded-md", SHIMMER, className)}
      {...props}
    />
  );
}

export interface LotCardSkeletonProps {
  /** Number of card placeholders to render. Default `1`. */
  count?: number;
  className?: string;
}

function LotCardSkeleton({ count = 1, className }: LotCardSkeletonProps) {
  const safeCount = Math.max(1, Math.floor(count));
  return (
    <>
      {Array.from({ length: safeCount }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={cn(
            "rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-1)] space-y-4",
            className,
          )}
        >
          {/* thumbnail / hero block */}
          <Skeleton className="h-32 w-full rounded-xl" />

          {/* 2 dòng text — title + meta */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>

          {/* progress bar (occupancy) */}
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ))}
    </>
  );
}

function MapSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "grid h-[60vh] min-h-[420px] gap-4 lg:grid-cols-[1fr_320px]",
        className,
      )}
    >
      {/* Map canvas placeholder */}
      <Skeleton className="h-full w-full rounded-2xl" />

      {/* Sidebar list placeholder (desktop only) */}
      <div className="hidden flex-col gap-3 lg:flex">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  );
}

function StepperSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("flex items-center gap-2", className)}
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
            <Skeleton className="size-5 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
          {i < 2 && <Skeleton className="h-px w-4 sm:w-8" />}
        </div>
      ))}
    </div>
  );
}

export interface TableRowSkeletonProps {
  /** Number of column cells. Default `4`. */
  cols?: number;
  className?: string;
}

function TableRowSkeleton({ cols = 4, className }: TableRowSkeletonProps) {
  const safeCols = Math.max(1, Math.floor(cols));
  return (
    <div
      role="row"
      aria-hidden="true"
      className={cn(
        "flex items-center gap-4 border-b border-border/60 px-4 py-3",
        className,
      )}
    >
      {Array.from({ length: safeCols }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4 flex-1", i === 0 && "max-w-[32%]")}
        />
      ))}
    </div>
  );
}

export {
  Skeleton,
  LotCardSkeleton,
  MapSkeleton,
  StepperSkeleton,
  TableRowSkeleton,
};
