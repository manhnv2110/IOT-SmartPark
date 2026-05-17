import { Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { AppCard } from "@/components/ui/app-card";
import { Button } from "@/components/ui/button";

export function BookingErrorState({
  title,
  description,
  ctaTo = "/lots",
  ctaLabel = "Chọn bãi khác",
  icon,
}: {
  title: string;
  description?: string;
  ctaTo?: string;
  ctaLabel?: string;
  icon?: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <AppCard className="p-8 text-center">
        <div
          aria-hidden
          className="mx-auto grid place-items-center size-14 rounded-2xl bg-primary-soft/50 text-primary mb-4"
        >
          {icon ?? <AlertCircle className="size-7" strokeWidth={1.75} />}
        </div>
        <h1 className="text-title text-foreground">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-2 mb-6 text-sm leading-relaxed">
            {description}
          </p>
        )}
        <Button asChild className="w-full" size="lg">
          <Link to={ctaTo as any}>{ctaLabel}</Link>
        </Button>
      </AppCard>
    </main>
  );
}
