import { ArrowDownLeft, ArrowDownRight, ArrowUp, CornerDownLeft, CornerDownRight, Flag, RotateCcw, MapPin, MoveRight } from "lucide-react";
import type { RouteStep } from "@/lib/routing";
import { formatDistance } from "@/lib/routing";
import { cn } from "@/lib/utils";

function StepIcon({ type, modifier }: { type: string; modifier?: string }) {
  if (type === "depart") return <MapPin className="size-4" />;
  if (type === "arrive") return <Flag className="size-4" />;
  if (type === "roundabout" || type === "rotary") return <RotateCcw className="size-4" />;
  if (type === "uturn" || modifier === "uturn") return <RotateCcw className="size-4" />;
  if (modifier?.includes("left")) {
    return modifier.includes("slight") ? <ArrowDownLeft className="size-4" /> : <CornerDownLeft className="size-4" />;
  }
  if (modifier?.includes("right")) {
    return modifier.includes("slight") ? <ArrowDownRight className="size-4" /> : <CornerDownRight className="size-4" />;
  }
  if (modifier === "straight" || type === "continue" || type === "new name") return <ArrowUp className="size-4" />;
  return <MoveRight className="size-4" />;
}

export function RouteSteps({
  steps,
  activeIndex,
}: {
  steps: RouteStep[];
  activeIndex: number;
}) {
  if (!steps.length) return null;
  return (
    <ol className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin pr-1">
      {steps.map((s, i) => {
        const active = i === activeIndex;
        const past = i < activeIndex;
        return (
          <li
            key={i}
            className={cn(
              "flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors",
              active && "bg-primary/15 text-foreground",
              past && "opacity-50"
            )}
          >
            <span
              className={cn(
                "size-7 grid place-items-center rounded-md shrink-0",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              <StepIcon type={s.type} modifier={s.modifier} />
            </span>
            <div className="flex-1 min-w-0">
              <div className={cn("truncate", active && "font-semibold")}>{s.text}</div>
              {s.distance > 0 && (
                <div className="text-[10px] text-muted-foreground font-mono">
                  {formatDistance(s.distance)}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
