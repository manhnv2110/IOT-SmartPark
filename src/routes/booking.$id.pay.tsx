import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle2,
  ExternalLink,
  CreditCard,
  XCircle,
} from "lucide-react";
import { getBooking, cancelBooking } from "@/lib/booking.functions";
import { createVnpayPaymentUrl } from "@/lib/vnpay.functions";
import { isValidBookingId } from "@/lib/booking-id";
import { AppCard } from "@/components/ui/app-card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { BookingErrorState } from "@/components/booking/BookingErrorState";
import { BookingStepper } from "@/components/booking/BookingStepper";
import { PaymentCountdown } from "@/components/booking/PaymentCountdown";

const PaySearchSchema = z.object({
  vnp_status: z.enum(["success", "failed"]).optional(),
  vnp_code: z.string().optional(),
});

export const Route = createFileRoute("/booking/$id/pay")({
  validateSearch: (s) => PaySearchSchema.parse(s),
  component: PayPage,
});

function PayPage() {
  const { id } = Route.useParams();
  const search = useSearch({ from: "/booking/$id/pay" });
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      nav({ to: "/auth", search: { redirect: `/booking/${id}/pay` } });
    }
  }, [loading, user, id, nav]);

  // Hiển thị toast khi user vừa quay từ VNPay về.
  useEffect(() => {
    if (search.vnp_status === "success") {
      toast.success("Thanh toán đang được xác nhận...");
    } else if (search.vnp_status === "failed") {
      toast.error(
        search.vnp_code === "24"
          ? "Bạn đã huỷ giao dịch trên cổng VNPay"
          : "Thanh toán không thành công",
      );
    }
  }, [search.vnp_status, search.vnp_code]);

  const validId = isValidBookingId(id);

  const fetchBooking = useServerFn(getBooking);
  const doCancel = useServerFn(cancelBooking);
  const doCreateUrl = useServerFn(createVnpayPaymentUrl);

  const q = useQuery({
    queryKey: ["booking", id],
    // Poll mạnh hơn khi vừa redirect về (để bắt IPN sớm).
    refetchInterval: (q) =>
      q.state.data?.status === "pending"
        ? search.vnp_status === "success"
          ? 1500
          : 3000
        : false,
    queryFn: () => fetchBooking({ data: { id } }),
    refetchOnWindowFocus: true,
    enabled: !!user && validId,
    retry: 1,
  });

  // Auto-redirect to ticket once paid
  useEffect(() => {
    if (q.data?.status === "paid" || q.data?.status === "active") {
      const t = setTimeout(() => {
        nav({ to: "/booking/$id/ticket", params: { id } });
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [q.data?.status, id, nav]);

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
  if (amount <= 0) {
    return (
      <BookingErrorState
        title="Đơn không có thông tin thanh toán hợp lệ"
        description="Vui lòng đặt lại đơn mới."
      />
    );
  }

  async function handlePay(bankCode?: string) {
    setRedirecting(true);
    try {
      const res = await doCreateUrl({ data: { bookingId: id, bankCode } });
      if (!res?.paymentUrl) throw new Error("Không tạo được liên kết thanh toán");
      window.location.href = res.paymentUrl;
    } catch (err) {
      setRedirecting(false);
      toast.error((err as Error).message ?? "Lỗi tạo liên kết VNPay");
    }
  }

  const justFailed = search.vnp_status === "failed";

  return (
    <main className="mx-auto max-w-md px-4 py-6 space-y-4">
      <BookingStepper status={b.status} />

      <PaymentCountdown expiresAt={b.hold_expires_at} />

      {justFailed && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-3"
        >
          <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground">
              Giao dịch trước chưa hoàn tất
            </p>
            <p className="text-muted-foreground mt-1">
              {search.vnp_code === "24"
                ? "Bạn đã huỷ trên cổng VNPay. Bấm nút bên dưới để thử lại."
                : "Thanh toán bị lỗi. Vui lòng thử lại với phương thức khác."}
            </p>
          </div>
        </div>
      )}

      <AppCard className="p-6 flex flex-col items-center gap-4 shadow-ticket text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/15 grid place-items-center">
          <CreditCard className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-title text-foreground">Thanh toán qua VNPay</h1>
          <p className="text-caption text-muted-foreground mt-1">
            Cổng thanh toán an toàn — hỗ trợ ATM, QR, thẻ quốc tế.
          </p>
        </div>

        <div className="w-full border-t border-border pt-4">
          <p className="text-caption">Số tiền cần thanh toán</p>
          <p className="text-3xl font-semibold tabular-nums text-primary mt-1 tracking-tight">
            {amount.toLocaleString("vi")}
            <span className="text-base ml-1 text-muted-foreground font-normal">đ</span>
          </p>
          <p className="text-caption text-muted-foreground mt-2">
            Mã đơn: <span className="font-mono">{b.id.slice(0, 8).toUpperCase()}</span>
          </p>
        </div>

        <Button
          onClick={() => handlePay()}
          disabled={redirecting}
          size="lg"
          className="w-full"
        >
          {redirecting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Đang chuyển sang VNPay...
            </>
          ) : (
            <>
              <ExternalLink className="w-4 h-4 mr-2" />
              {justFailed ? "Thử lại với VNPay" : "Thanh toán ngay"}
            </>
          )}
        </Button>

        <p className="text-[11px] text-muted-foreground">
          Bạn sẽ được chuyển sang sandbox.vnpayment.vn để hoàn tất giao dịch.
        </p>
      </AppCard>

      <details className="rounded-xl border border-border bg-card/50 p-3 text-sm">
        <summary className="cursor-pointer font-medium select-none">
          💳 Hướng dẫn thanh toán sandbox
        </summary>
        <ol className="mt-3 space-y-2 text-muted-foreground list-decimal list-inside">
          <li>Bấm <strong>Thanh toán ngay</strong> để chuyển sang VNPay sandbox.</li>
          <li>Chọn ngân hàng <strong>NCB</strong> (test mặc định).</li>
          <li>
            Nhập:
            <ul className="mt-1 ml-4 list-disc text-xs">
              <li>Số thẻ: <code className="font-mono">9704198526191432198</code></li>
              <li>Tên chủ thẻ: <code className="font-mono">NGUYEN VAN A</code></li>
              <li>Ngày phát hành: <code className="font-mono">07/15</code></li>
              <li>OTP: <code className="font-mono">123456</code></li>
            </ul>
          </li>
          <li>Sau khi xác nhận, hệ thống tự cập nhật trong 1–2 giây.</li>
        </ol>
      </details>

      <Button
        variant="ghost"
        className="w-full text-muted-foreground"
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
    </main>
  );
}
