import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  MapPin,
  Navigation,
  ListChecks,
  Share2,
  CheckCircle2,
  Car,
  Clock,
  CreditCard,
} from "lucide-react";
import { getBooking } from "@/lib/booking.functions";
import { isValidBookingId } from "@/lib/booking-id";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { BookingErrorState } from "@/components/booking/BookingErrorState";
import { BookingStepper } from "@/components/booking/BookingStepper";
import { SlotLockControl } from "@/components/booking/SlotLockControl";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/booking/$id/ticket")({
  component: TicketPage,
});

function TicketPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && !user)
      nav({ to: "/auth", search: { redirect: `/booking/${id}/ticket` } });
  }, [loading, user, id, nav]);

  const validId = isValidBookingId(id);

  const fetchBooking = useServerFn(getBooking);
  const { data: b, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => fetchBooking({ data: { id } }),
    enabled: !!user && validId,
    refetchInterval: (q) => (q.state.data?.ticket_code ? false : 3000),
  });

  if (!validId) return <BookingErrorState title="Mã đơn không hợp lệ" />;

  if (loading || isLoading)
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-3" />
        <p className="text-muted-foreground text-sm">Đang tải thông tin vé...</p>
      </main>
    );
  if (!b)
    return (
      <BookingErrorState
        title="Không tìm thấy đơn"
        ctaTo="/bookings"
        ctaLabel="Đơn của tôi"
      />
    );

  if (b.status === "pending") {
    return (
      <BookingErrorState
        title="Đơn chưa thanh toán"
        description="Hoàn tất thanh toán trước khi sử dụng."
        ctaTo="/booking/$id/pay"
        ctaLabel="Tới trang thanh toán"
      />
    );
  }

  if (b.status === "cancelled") {
    return (
      <BookingErrorState
        title="Đơn đã huỷ"
        description="Đơn này đã được huỷ."
        ctaTo="/lots"
        ctaLabel="Đặt đơn mới"
      />
    );
  }

  if (b.status === "expired") {
    return (
      <BookingErrorState
        title="Đơn đã hết hạn"
        description="Phiên giữ chỗ đã hết — vui lòng đặt lại."
        ctaTo="/lots"
        ctaLabel="Đặt đơn mới"
      />
    );
  }

  const code = b.ticket_code ?? "------";
  const amount = Number(b.amount ?? 0);

  const canControlLock =
    (b.status === "paid" || b.status === "active") && !!b.lot_device_id;

  const handleShare = async () => {
    const shareText = `SmartPark — Mã vé: ${code}\nBãi: ${b.lot_name ?? b.lot_device_id}\nBiển số: ${b.plate}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Vé SmartPark", text: shareText });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success("Đã sao chép thông tin vé");
    }
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-4">
      <BookingStepper status={b.status} />

      {/* ─── Ticket Summary Card ─── */}
      <section className="rounded-2xl glass-strong overflow-hidden">
        {/* Top gradient bar */}
        <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />

        <div className="p-5 space-y-4">
          {/* Location + status */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary/10 grid place-items-center shrink-0">
                <MapPin className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">
                  {b.lot_name ?? b.lot_device_id}
                </p>
                {b.slot_index != null && (
                  <p className="text-xs text-muted-foreground">
                    Chỗ #{b.slot_index + 1}
                  </p>
                )}
              </div>
            </div>
            <StatusBadge status={b.status} checkinAt={b.checkin_at} />
          </div>

          {/* Ticket code */}
          <div className="text-center py-3 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-caption text-muted-foreground mb-1">Mã vé</p>
            <p className="text-3xl font-mono tracking-[0.35em] font-bold text-foreground">
              {code}
            </p>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <InfoCell
              icon={<Car className="w-3.5 h-3.5" />}
              label="Biển số"
              value={b.plate}
              mono
            />
            <InfoCell
              icon={<Car className="w-3.5 h-3.5" />}
              label="Loại xe"
              value={b.vehicle_type === "car" ? "Ô tô" : "Xe máy"}
            />
            <InfoCell
              icon={<Clock className="w-3.5 h-3.5" />}
              label="Giờ vào"
              value={new Date(b.start_at).toLocaleString("vi", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            />
            <InfoCell
              icon={<Clock className="w-3.5 h-3.5" />}
              label="Giờ ra"
              value={new Date(b.end_at).toLocaleString("vi", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            />
          </div>

          {/* Payment confirmation */}
          {b.paid_at && (
            <div className="flex items-center gap-2 pt-3 border-t border-border/50">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">
                  Đã thanh toán{" "}
                  <span className="font-semibold text-foreground">
                    {amount.toLocaleString("vi")}đ
                  </span>
                  {" · "}
                  {new Date(b.paid_at).toLocaleString("vi", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
              </div>
              <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          )}
        </div>
      </section>

      {/* ─── Lock/Unlock Control (primary action) ─── */}
      {canControlLock && (
        <section>
          <SlotLockControl bookingId={b.id} initialLocked={false} />
        </section>
      )}

      {/* ─── Quick Actions ─── */}
      <section className="grid grid-cols-3 gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="rounded-xl h-10 text-xs gap-1.5 border-border/60 hover:bg-muted/50"
        >
          <Link to="/map" search={{ route: b.lot_device_id }}>
            <Navigation className="w-3.5 h-3.5" />
            Chỉ đường
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="rounded-xl h-10 text-xs gap-1.5 border-border/60 hover:bg-muted/50"
        >
          <Link to="/bookings">
            <ListChecks className="w-3.5 h-3.5" />
            Đơn của tôi
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl h-10 text-xs gap-1.5 border-border/60 hover:bg-muted/50"
          onClick={handleShare}
        >
          <Share2 className="w-3.5 h-3.5" />
          Chia sẻ
        </Button>
      </section>
    </main>
  );
}

/* ─── Sub-components ─── */

function StatusBadge({
  status,
  checkinAt,
}: {
  status: string;
  checkinAt: string | null;
}) {
  const isActive = status === "active" || !!checkinAt;
  const isCompleted = status === "completed";

  const label = isActive
    ? "Đang gửi"
    : isCompleted
      ? "Hoàn thành"
      : "Đã thanh toán";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide shrink-0",
        isActive && "bg-teal-500/10 text-teal-600 border border-teal-500/20",
        isCompleted && "bg-muted text-muted-foreground border border-border",
        !isActive &&
          !isCompleted &&
          "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
      )}
    >
      {isActive && (
        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
      )}
      {label}
    </span>
  );
}

function InfoCell({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/30">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <p
          className={cn(
            "text-sm font-medium text-foreground truncate mt-0.5",
            mono && "font-mono"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
