import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listMyBookings } from "@/lib/booking.functions";
import { AppCard } from "@/components/ui/app-card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AsyncSurface } from "@/components/ui/async-surface";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox, Car, Bike, ChevronRight, Calendar, LogOut } from "lucide-react";
import { formatVND, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [{ title: "Đơn của tôi — SmartPark" }],
  }),
  component: BookingsPage,
});

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending: {
    label: "Chờ thanh toán",
    cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
  },
  paid: {
    label: "Đã thanh toán",
    cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  },
  active: {
    label: "Đang gửi",
    cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20",
  },
  checked_in: {
    label: "Đã vào",
    cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20",
  },
  completed: {
    label: "Hoàn tất",
    cls: "bg-muted text-muted-foreground border-border/50",
  },
  cancelled: {
    label: "Đã huỷ",
    cls: "bg-muted text-muted-foreground border-border/50",
  },
  expired: {
    label: "Hết hạn",
    cls: "bg-destructive/15 text-destructive border-destructive/20",
  },
};

function BookingsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth", search: { redirect: "/bookings" } });
  }, [loading, user, nav]);

  const fn = useServerFn(listMyBookings);
  const query = useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => fn(),
    enabled: !!user,
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Đơn của tôi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Quản lý đặt chỗ và lịch sử gửi xe
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => supabase.auth.signOut()}
          className="text-muted-foreground"
        >
          <LogOut className="size-3.5 mr-1.5" />
          Đăng xuất
        </Button>
      </div>

      {!user ? null : (
        <AsyncSurface
          query={query}
          skeleton={
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          }
          isEmpty={(d) => (d?.length ?? 0) === 0}
          empty={
            <EmptyState
              icon={Inbox}
              title="Chưa có đơn nào"
              description="Đặt chỗ tại bãi gần bạn để bắt đầu."
              action={
                <Button asChild>
                  <Link to="/lots">Tìm bãi đỗ</Link>
                </Button>
              }
            />
          }
          errorTitle="Không tải được đơn của bạn"
        >
          {(rows) => (
            <div className="space-y-3">
              {rows.map((b) => {
                const s = STATUS_LABEL[b.status] ?? {
                  label: b.status,
                  cls: "bg-muted",
                };
                const isPending = b.status === "pending";
                const VehicleIcon = b.vehicle_type === "car" ? Car : Bike;
                return (
                  <Link
                    key={b.id}
                    to={
                      isPending
                        ? "/booking/$id/pay"
                        : "/booking/$id/ticket"
                    }
                    params={{ id: b.id }}
                  >
                    <AppCard className="p-4 sm:p-5 hover:shadow-[var(--shadow-2)] hover:-translate-y-px transition-all cursor-pointer group">
                      <div className="flex items-start gap-4">
                        {/* Vehicle icon */}
                        <div className="size-11 rounded-xl bg-primary/10 grid place-items-center shrink-0">
                          <VehicleIcon className="size-5 text-primary" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium truncate text-foreground group-hover:text-primary transition-colors">
                                {b.lot_name ?? b.lot_device_id}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <span className="font-mono">{b.plate}</span>
                                <span>·</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="size-3" />
                                  {formatDateTime(b.start_at)}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                              <p className="font-semibold tabular-nums text-foreground">
                                {formatVND(Number(b.amount ?? 0))}
                              </p>
                              <span
                                className={cn(
                                  "text-[10px] px-2 py-0.5 rounded-full font-medium border",
                                  s.cls
                                )}
                              >
                                {s.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Chevron */}
                        <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0 mt-1" />
                      </div>
                    </AppCard>
                  </Link>
                );
              })}
            </div>
          )}
        </AsyncSurface>
      )}
    </main>
  );
}
