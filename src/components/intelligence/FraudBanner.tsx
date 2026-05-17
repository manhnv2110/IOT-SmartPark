import { AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FraudProfile } from "@/lib/intelligence/fraud";

export function FraudBanner({
  profile,
  className,
}: {
  profile: FraudProfile;
  className?: string;
}) {
  if (profile.band === "green") {
    return (
      <div
        className={cn(
          "rounded-xl border border-[var(--available)]/30 bg-[var(--available)]/8 p-3 text-xs flex items-start gap-2",
          className,
        )}
      >
        <ShieldCheck className="size-4 text-[var(--available)] mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-foreground">Tài khoản uy tín</p>
          <p className="text-muted-foreground mt-0.5">{profile.message}</p>
        </div>
      </div>
    );
  }
  const isRed = profile.band === "red";
  return (
    <div
      className={cn(
        "rounded-xl border p-3 text-xs flex items-start gap-2",
        isRed
          ? "border-[var(--reserved)]/35 bg-[var(--reserved)]/8"
          : "border-amber-400/35 bg-amber-100/30",
        className,
      )}
    >
      {isRed ? (
        <ShieldAlert className="size-4 text-[var(--reserved)] mt-0.5 shrink-0" />
      ) : (
        <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
      )}
      <div className="min-w-0">
        <p className="font-medium text-foreground">
          Điểm rủi ro: <span className="tabular-nums">{profile.score}</span>
          <span className="text-muted-foreground ml-1.5 font-normal">
            ({profile.noShows} no-show / {profile.totalBookings} đơn)
          </span>
        </p>
        <p className="text-muted-foreground mt-0.5">{profile.message}</p>
      </div>
    </div>
  );
}
