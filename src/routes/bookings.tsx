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
import { Inbox } from "lucide-react";
import { formatVND, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [{ title: "Đơn của tôi — SmartPark" }],
  }),
  component: BookingsPage,
});

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending: {
    label: "Chờ thanh toán",
    cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  paid: {
    label: "Đã thanh toán",
    cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  active: {
    label: "Đang gửi",
    cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  },
  checked_in: {
    label: "Đã vào",
    cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  },
  completed: { label: "Hoàn tất", cls: "bg-muted text-muted-foreground" },
  cancelled: { label: "Đã huỷ", cls: "bg-muted text-muted-foreground" },
  expired: { label: "Hết hạn", cls: "bg-destructive/15 text-destructive" },
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
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-title">Đơn của tôi</h1>
        <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
          Đăng xuất
        </Button>
      </div>

      {!user ? null : (
        <AsyncSurface
          query={query}
          skeleton={
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
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
                  <Link to="/lots">Tìm bãi</Link>
                </Button>
              }
            />
          }
          errorTitle="Không tải được đơn của bạn"
        >
          {(rows) => (
            <div className="space-y-2">
              {rows.map((b) => {
                const s = STATUS_LABEL[b.status] ?? {
                  label: b.status,
                  cls: "bg-muted",
                };
                const isPending = b.status === "pending";
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
                    <AppCard className="p-4 hover:bg-accent/40 transition cursor-pointer">
                      <div className="flex justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {b.lot_name ?? b.lot_device_id}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {b.plate} · {formatDateTime(b.start_at)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold tabular-nums">
                            {formatVND(Number(b.amount ?? 0))}
                          </p>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full ${s.cls}`}
                          >
                            {s.label}
                          </span>
                        </div>
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
