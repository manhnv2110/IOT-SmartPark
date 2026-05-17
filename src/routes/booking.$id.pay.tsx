import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  CreditCard,
  User,
  Wallet,
  FileText,
  Loader2,
  CheckCircle2,
  RefreshCcw,
} from "lucide-react";
import { getBooking, cancelBooking } from "@/lib/booking.functions";
import {
  SEPAY_CONFIG,
  bookingPaymentRef,
  sepayQrUrl,
  isValidBookingId,
} from "@/lib/sepay";
import { AppCard } from "@/components/ui/app-card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { BookingErrorState } from "@/components/booking/BookingErrorState";
import { BookingStepper } from "@/components/booking/BookingStepper";
import { PaymentCountdown } from "@/components/booking/PaymentCountdown";
import { CopyRow } from "@/components/booking/CopyRow";

export const Route = createFileRoute("/booking/$id/pay")({
  component: PayPage,
});

function PayPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      nav({ to: "/auth", search: { redirect: `/booking/${id}/pay` } });
    }
  }, [loading, user, id, nav]);

  const validId = isValidBookingId(id);

  const fetchBooking = useServerFn(getBooking);
  const doCancel = useServerFn(cancelBooking);

  const q = useQuery({
    queryKey: ["booking", id],
    queryFn: () => fetchBooking({ data: { id } }),
    refetchInterval: (q) => (q.state.data?.status === "pending" ? 3000 : false),
    refetchOnWindowFocus: true,
    enabled: !!user && validId,
    retry: 1,
  });

  // Auto-redirect to ticket once paid
  useEffect(() => {
    if (q.data?.status === "paid" || q.data?.status === "active") {
      const t = setTimeout(() => {
        nav({ to: "/booking/$id/ticket", params: { id } });
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [q.data?.status, id, nav]);

  const ref = useMemo(() => {
    try {
      return validId ? bookingPaymentRef(id) : null;
    } catch {
      return null;
    }
  }, [id, validId]);

  if (!validId) {
    return (
      <BookingErrorState
        title="Mã đơn không hợp lệ"
        description="Liên kết bạn vào không đúng định dạng. Vui lòng đặt lại đơn mới."
        ctaTo="/lots"
        ctaLabel="Chọn bãi để đặt"
      />
    );
  }

  if (loading || q.isLoading) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-3" />
        <p className="text-muted-foreground">Đang tải đơn thanh toán...</p>
      </main>
    );
  }

  if (q.isError) {
    return (
      <BookingErrorState
        title="Không tải được đơn"
        description={(q.error as Error)?.message}
        ctaTo="/bookings"
        ctaLabel="Xem đơn của tôi"
      />
    );
  }

  const b = q.data;
  if (!b) {
    return (
      <BookingErrorState
        title="Không tìm thấy đơn"
        description="Đơn không tồn tại hoặc không thuộc tài khoản này."
        ctaTo="/lots"
      />
    );
  }

  // PAID — Success state with auto-redirect
  if (b.status === "paid" || b.status === "active") {
    return (
      <main className="mx-auto max-w-md px-4 py-10 space-y-5">
        <BookingStepper status={b.status} />
        <AppCard className="p-8 text-center shadow-ticket">
          <div className="mx-auto w-20 h-20 rounded-full bg-available/15 grid place-items-center mb-4">
            <CheckCircle2 className="w-12 h-12 text-available" />
          </div>
          <h1 className="text-title">Thanh toán thành công!</h1>
          <p className="text-muted-foreground mt-2 mb-6">
            Vé của bạn đã sẵn sàng. Đang chuyển sang trang vé...
          </p>
          <Button asChild className="w-full" size="lg">
            <Link to="/booking/$id/ticket" params={{ id }}>
              Xem vé ngay
            </Link>
          </Button>
        </AppCard>
      </main>
    );
  }

  if (b.status === "expired" || b.status === "cancelled") {
    return (
      <BookingErrorState
        title="Đơn đã hết hạn"
        description="Vui lòng đặt lại nếu vẫn còn nhu cầu."
        
      />
    );
  }

  const amount = Number(b.amount ?? 0);
  if (!ref || amount <= 0) {
    return (
      <BookingErrorState
        title="Đơn không có thông tin thanh toán hợp lệ"
        description="Vui lòng đặt lại đơn mới."
      />
    );
  }

  let qrSrc: string | null = null;
  try {
    qrSrc = sepayQrUrl({ amount, bookingId: id });
  } catch {
    qrSrc = null;
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6 space-y-4">
      <BookingStepper status={b.status} />

      <PaymentCountdown expiresAt={b.hold_expires_at} />

      <AppCard className="p-6 flex flex-col items-center gap-4 shadow-ticket">
        <div className="text-center">
          <h1 className="text-title text-foreground">Quét QR để thanh toán</h1>
          <div className="inline-flex items-center gap-2 mt-2 text-xs text-[var(--available)]">
            <span className="relative inline-block w-1.5 h-1.5 rounded-full bg-[var(--available)] animate-pulse-dot" />
            <span className="text-muted-foreground">Đang chờ thanh toán</span>
          </div>
        </div>

        <div className="relative bg-white rounded-2xl p-4 ring-1 ring-border">
          {qrSrc ? (
            <img
              src={qrSrc}
              alt={`QR thanh toán ${amount.toLocaleString("vi")}đ`}
              className="w-64 h-64 object-contain"
              loading="eager"
            />
          ) : (
            <div className="w-64 h-64 grid place-items-center text-muted-foreground text-sm">
              Không tạo được QR
            </div>
          )}
        </div>
        <p className="text-caption -mt-1">
          VietQR · {SEPAY_CONFIG.bank}
        </p>

        <div className="text-center">
          <p className="text-caption">Số tiền cần chuyển</p>
          <p className="text-3xl font-semibold tabular-nums text-primary mt-1 tracking-tight">
            {amount.toLocaleString("vi")}
            <span className="text-base ml-1 text-muted-foreground font-normal">đ</span>
          </p>
        </div>
      </AppCard>

      <AppCard className="p-3 space-y-1">
        <CopyRow
          label="Ngân hàng"
          value={SEPAY_CONFIG.bank}
          icon={<Building2 className="w-4 h-4" />}
          mono={false}
        />
        <CopyRow
          label="Số tài khoản"
          value={SEPAY_CONFIG.accountNumber}
          icon={<CreditCard className="w-4 h-4" />}
        />
        <CopyRow
          label="Chủ tài khoản"
          value={SEPAY_CONFIG.accountHolder}
          icon={<User className="w-4 h-4" />}
          mono={false}
        />
        <CopyRow
          label="Số tiền"
          value={`${amount.toLocaleString("vi")} đ`}
          copyValue={String(amount)}
          icon={<Wallet className="w-4 h-4" />}
        />
        <CopyRow
          label="Nội dung chuyển khoản"
          value={ref}
          highlight
          icon={<FileText className="w-4 h-4" />}
        />
      </AppCard>

      <details className="rounded-xl border border-border bg-card/50 p-3 text-sm">
        <summary className="cursor-pointer font-medium select-none">
          📱 Hướng dẫn chuyển khoản
        </summary>
        <ol className="mt-3 space-y-2 text-muted-foreground list-decimal list-inside">
          <li>Mở app ngân hàng → chọn <strong>Quét QR / VietQR</strong>.</li>
          <li>
            Kiểm tra <strong>số tiền</strong> và{" "}
            <strong>nội dung chuyển khoản</strong> đúng như trên.
          </li>
          <li>Xác nhận. Hệ thống tự cập nhật trong vòng 10 giây.</li>
        </ol>
      </details>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          onClick={() => {
            q.refetch();
            toast.message("Đang kiểm tra trạng thái...");
          }}
        >
          <RefreshCcw className="w-4 h-4 mr-2" />
          Kiểm tra ngay
        </Button>
        <Button
          variant="ghost"
          className="text-muted-foreground"
          onClick={async () => {
            if (!confirm("Huỷ đơn này? Chỗ giữ sẽ bị giải phóng.")) return;
            try {
              await doCancel({ data: { id } });
              toast.success("Đã huỷ đơn");
              q.refetch();
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        >
          Huỷ đơn
        </Button>
      </div>
    </main>
  );
}
