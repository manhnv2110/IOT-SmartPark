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
  Ticket,
} from "lucide-react";
import { getBooking } from "@/lib/booking.functions";
import { isValidBookingId } from "@/lib/booking-id";
import { AppCard } from "@/components/ui/app-card";
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
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-3" />
        <p className="text-muted-foreground">Đang tải vé...</p>
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
        description="Hoàn tất thanh toán trước khi nhận vé."
        ctaTo="/booking/$id/pay"
        ctaLabel="Tới trang thanh toán"
      />
    );
  }

  if (b.status === "cancelled") {
    return (
      <BookingErrorState
        title="Đơn đã huỷ"
        description="Đơn này đã được huỷ — không có vé."
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

  const statusInfo =
    b.status === "active" || b.checkin_at
      ? { label: "ĐANG GỬI XE" }
      : b.status === "completed"
        ? { label: "ĐÃ HOÀN THÀNH" }
        : { label: "ĐÃ THANH TOÁN" };

  const canControlLock =
    (b.status === "paid" || b.status === "active") && !!b.lot_device_id;

  const handleShare = async () => {
    const shareText = `Vé gửi xe SmartPark\nMã: ${code}\nBãi: ${b.lot_name ?? b.lot_device_id}\nBiển số: ${b.plate}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Vé gửi xe SmartPark", text: shareText });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success("Đã sao chép thông tin vé");
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-6 space-y-5">
      <BookingStepper status={b.status} />

      {/* Ticket header card — replaces the QR boarding-pass */}
      <div className="relative rounded-3xl bg-card shadow-ticket overflow-hidden">
        <div className="gradient-pay px-6 py-5 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider opacity-90">SmartPark</p>
              <h1 className="text-xl font-bold mt-0.5">Vé gửi xe</h1>
            </div>
            <span
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-bold border bg-white/95 text-primary border-white",
              )}
            >
              {statusInfo.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-3 text-sm opacity-95">
            <MapPin className="w-4 h-4" />
            <span className="truncate font-medium">
              {b.lot_name ?? b.lot_device_id}
            </span>
            {b.slot_index != null && (
              <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full">
                Slot #{b.slot_index + 1}
              </span>
            )}
          </div>
        </div>

        {/* Ticket code (no QR) */}
        <div className="px-6 py-5 text-center border-b border-border">
          <div className="inline-flex items-center gap-2 text-caption text-muted-foreground">
            <Ticket className="w-3.5 h-3.5" />
            Mã vé
          </div>
          <p className="text-4xl font-mono tracking-[0.4em] font-bold text-foreground mt-1">
            {code}
          </p>
        </div>
      </div>

      {/* PRIMARY: Slot Lock Control — main feature of the ticket */}
      {canControlLock && (
        <SlotLockControl bookingId={b.id} initialLocked={false} />
      )}

      {/* Booking details */}
      <AppCard className="p-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Field label="Biển số" value={b.plate} mono />
          <Field
            label="Loại xe"
            value={b.vehicle_type === "car" ? "Ô tô" : "Xe máy"}
          />
          <Field
            label="Giờ vào"
            value={new Date(b.start_at).toLocaleString("vi", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          />
          <Field
            label="Giờ ra dự kiến"
            value={new Date(b.end_at).toLocaleString("vi", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          />
          {b.checkin_at && (
            <Field
              label="Đã vào lúc"
              value={new Date(b.checkin_at).toLocaleString("vi", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            />
          )}
          <Field
            label="Đã thanh toán"
            value={`${amount.toLocaleString("vi")} đ`}
            highlight
          />
        </div>
        {b.paid_at && (
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-available" />
            Thanh toán lúc{" "}
            {new Date(b.paid_at).toLocaleString("vi", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </div>
        )}
      </AppCard>

      {/* Actions */}
      <div className="grid grid-cols-3 gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/map" search={{ route: b.lot_device_id }}>
            <Navigation className="w-4 h-4 mr-1.5" />
            Chỉ đường
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/bookings">
            <ListChecks className="w-4 h-4 mr-1.5" />
            Đơn của tôi
          </Link>
        </Button>
        <Button variant="outline" size="sm" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-1.5" />
          Chia sẻ
        </Button>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "font-medium mt-0.5",
          mono && "font-mono",
          highlight && "text-primary font-semibold",
        )}
      >
        {value}
      </p>
    </div>
  );
}
