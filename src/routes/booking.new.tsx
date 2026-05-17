import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Car,
  Bike,
  MapPin,
  Clock,
  ShieldCheck,
  Timer,
  RefreshCcw,
  ArrowRight,
} from "lucide-react";
import { createBooking } from "@/lib/booking.functions";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppCard } from "@/components/ui/app-card";
import { BookingStepper } from "@/components/booking/BookingStepper";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getMyFraudProfile, getDynamicPrice } from "@/lib/intelligence.functions";
import { FraudBanner } from "@/components/intelligence/FraudBanner";
import { SurgeBadge } from "@/components/intelligence/SurgeBadge";

const search = z.object({
  lot: z.string().optional(),
  name: z.string().optional(),
  slot: z.coerce.number().optional(),
});

const PRICE = { car: 15000, motorbike: 5000 };
const PLATE_RE = /^[A-Za-z0-9.\-\s]{2,20}$/;

export const Route = createFileRoute("/booking/new")({
  validateSearch: (s) => search.parse(s),
  component: BookingNew,
});

function nowPlus(min: number) {
  const d = new Date(Date.now() + min * 60_000);
  d.setSeconds(0, 0);
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

const PRESETS = [
  { label: "1h", h: 1 },
  { label: "2h", h: 2 },
  { label: "4h", h: 4 },
  { label: "8h", h: 8 },
  { label: "Cả ngày", h: 24 },
];

function BookingNew() {
  const { lot, name, slot } = useSearch({ from: "/booking/new" });
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      nav({
        to: "/auth",
        search: { redirect: window.location.pathname + window.location.search },
      });
    }
  }, [loading, user, nav]);

  const [plate, setPlate] = useState("");
  const [vehicleType, setVehicleType] = useState<"car" | "motorbike">("car");
  const [startAt, setStartAt] = useState(nowPlus(5));
  const [endAt, setEndAt] = useState(nowPlus(125));
  const [activePreset, setActivePreset] = useState<number | null>(2);

  const create = useServerFn(createBooking);
  const m = useMutation({
    mutationFn: () =>
      create({
        data: {
          lotDeviceId: lot ?? "",
          lotName: name,
          slotIndex: slot,
          plate: plate.trim(),
          vehicleType,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
        },
      }),
    onSuccess: (res) => {
      if (!res || typeof res.bookingId !== "string" || res.bookingId.length < 36) {
        console.error("[Booking] Unexpected response:", res);
        toast.error("Không tạo được đơn — vui lòng thử lại");
        return;
      }
      toast.success("Đã giữ chỗ — tiến hành thanh toán");
      nav({ to: "/booking/$id/pay", params: { id: res.bookingId } });
    },
    onError: (err: Error) => {
      console.error("[Booking] Error:", err);
      toast.error(err.message || "Không tạo được đơn");
    },
  });

  const applyPreset = (h: number, idx: number) => {
    const s = nowPlus(5);
    const sMs = new Date(s).getTime();
    const e = new Date(sMs + h * 3_600_000);
    const tz = e.getTimezoneOffset() * 60_000;
    setStartAt(s);
    setEndAt(new Date(e.getTime() - tz).toISOString().slice(0, 16));
    setActivePreset(idx);
  };

  const startMs = new Date(startAt).getTime();
  const endMs = new Date(endAt).getTime();
  const ms = Math.max(0, endMs - startMs);
  const hours = useMemo(() => Math.max(1, Math.ceil(ms / 3_600_000)), [ms]);
  const amount = hours * PRICE[vehicleType];

  const plateOk = PLATE_RE.test(plate.trim());
  const timeOk = endMs - startMs >= 30 * 60_000;
  const startInPast = startMs < Date.now() - 60_000;
  const canSubmit = !!user && plateOk && timeOk && !startInPast && !m.isPending;

  if (!lot) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10">
        <AppCard className="p-6 text-center">
          <p>Thiếu thông tin bãi đỗ.</p>
          <Link to="/lots" className="text-primary hover:underline">
            Chọn bãi
          </Link>
        </AppCard>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 space-y-5">
      <BookingStepper current="new" />

      <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
        {/* LEFT — Form */}
        <div className="space-y-4">
          <div>
            <h1 className="text-title">Đặt chỗ gửi xe</h1>
            <p className="text-caption text-muted-foreground">
              Hoàn tất 3 bước nhanh để có chỗ đỗ.
            </p>
          </div>

          <AppCard className="p-5">
            <div className="flex items-start gap-3">
              <div className="grid place-items-center w-10 h-10 rounded-xl bg-primary/15 text-primary">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Bãi đỗ đã chọn</p>
                <p className="font-semibold truncate">{name ?? lot}</p>
                <p className="text-xs text-muted-foreground">
                  Mã thiết bị: <span className="font-mono">{lot}</span>
                  {slot != null && <> · Slot #{slot + 1}</>}
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/lots">Đổi</Link>
              </Button>
            </div>
          </AppCard>

          <AppCard className="p-5 space-y-5">
            <div>
              <Label className="mb-2 block">Loại phương tiện</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["car", "motorbike"] as const).map((v) => {
                  const Icon = v === "car" ? Car : Bike;
                  const active = vehicleType === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVehicleType(v)}
                      className={cn(
                        "min-h-[60px] rounded-xl border px-3 py-2 text-left transition flex items-center gap-3",
                        active
                          ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                          : "border-border hover:bg-accent",
                      )}
                    >
                      <div
                        className={cn(
                          "grid place-items-center w-10 h-10 rounded-lg",
                          active ? "bg-primary text-primary-foreground" : "bg-muted",
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {v === "car" ? "Ô tô" : "Xe máy"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {PRICE[v].toLocaleString("vi")}đ/giờ
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="plate" className="mb-2 block">
                Biển số xe
              </Label>
              <Input
                id="plate"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder="29A-12345"
                className="font-mono tracking-wider text-base"
                required
                aria-invalid={plate.length > 0 && !plateOk}
              />
              {plate.length > 0 && !plateOk && (
                <p className="text-xs text-destructive mt-1">
                  Biển số chỉ gồm chữ, số, dấu chấm, gạch ngang (2–20 ký tự).
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Thời gian gửi</Label>
                <span className="text-xs text-muted-foreground">
                  Tổng: <strong className="text-foreground">{hours}h</strong>
                </span>
              </div>
              <div className="segmented mb-3">
                {PRESETS.map((p, i) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p.h, i)}
                    data-active={activePreset === i}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="s" className="text-xs text-muted-foreground">
                    Giờ vào
                  </Label>
                  <Input
                    id="s"
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => {
                      setStartAt(e.target.value);
                      setActivePreset(null);
                    }}
                    aria-invalid={startInPast}
                  />
                </div>
                <div>
                  <Label htmlFor="e" className="text-xs text-muted-foreground">
                    Giờ ra dự kiến
                  </Label>
                  <Input
                    id="e"
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => {
                      setEndAt(e.target.value);
                      setActivePreset(null);
                    }}
                    aria-invalid={!timeOk}
                  />
                </div>
              </div>
              {startInPast && (
                <p className="text-xs text-destructive mt-2">
                  Giờ vào không được nằm trong quá khứ.
                </p>
              )}
              {!timeOk && (
                <p className="text-xs text-destructive mt-2">
                  Tối thiểu 30 phút sau giờ vào.
                </p>
              )}
            </div>
          </AppCard>
        </div>

        {/* RIGHT — Sticky Summary */}
        <aside className="lg:sticky lg:top-20 space-y-3">
          <AppCard className="p-5 space-y-4">
            <div>
              <p className="text-caption text-muted-foreground">Tóm tắt đơn</p>
              <h2 className="font-semibold mt-0.5">{name ?? lot}</h2>
            </div>

            <div className="space-y-1.5 text-sm border-t border-border pt-3">
              <Row label="Loại xe" value={vehicleType === "car" ? "Ô tô" : "Xe máy"} />
              <Row
                label="Đơn giá"
                value={`${PRICE[vehicleType].toLocaleString("vi")}đ/h`}
              />
              <Row label="Số giờ" value={`${hours} giờ`} />
              {plate && <Row label="Biển số" value={plate.toUpperCase()} mono />}
            </div>

            <DynamicPriceBlock
              lot={lot ?? ""}
              basePrice={PRICE[vehicleType]}
              hours={hours}
            />

            <FraudBlock />


            <Button
              onClick={() => m.mutate()}
              disabled={!canSubmit}
              size="lg"
              className="w-full"
            >
              {m.isPending ? (
                <>
                  <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                  Đang giữ chỗ...
                </>
              ) : (
                <>
                  Tiếp tục thanh toán
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-available" />
                Thanh toán mã hoá qua VietQR
              </li>
              <li className="flex items-center gap-2">
                <Timer className="w-3.5 h-3.5 text-primary" />
                Giữ chỗ 10 phút sau khi tạo đơn
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-reserved" />
                Tự động xác nhận khi nhận tiền
              </li>
            </ul>
          </AppCard>
        </aside>
      </div>
    </main>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", mono && "font-mono")}>{value}</span>
    </div>
  );
}

function DynamicPriceBlock({
  lot,
  basePrice,
  hours,
}: {
  lot: string;
  basePrice: number;
  hours: number;
}) {
  const fn = useServerFn(getDynamicPrice);
  const q = useQuery({
    queryKey: ["dp", lot, basePrice],
    queryFn: () => fn({ data: { lotDeviceId: lot, basePrice } }),
    enabled: !!lot,
  });
  const perHour = q.data?.finalPrice ?? basePrice;
  const total = perHour * hours;
  const hasSurge = q.data && Math.abs(q.data.multiplier - 1) >= 0.02;
  return (
    <div className="border-t border-border pt-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Tổng thanh toán</p>
        {q.data && <SurgeBadge multiplier={q.data.multiplier} />}
      </div>
      <p className="text-3xl font-bold tabular-nums text-primary mt-0.5">
        {total.toLocaleString("vi")}
        <span className="text-base ml-1 text-muted-foreground">đ</span>
      </p>
      {hasSurge && q.data && (
        <p className="text-[11px] text-muted-foreground mt-1">
          Giá gốc {basePrice.toLocaleString("vi")}đ × {q.data.multiplier.toFixed(2)} = {perHour.toLocaleString("vi")}đ/h · {q.data.reason}
        </p>
      )}
    </div>
  );
}

function FraudBlock() {
  const fn = useServerFn(getMyFraudProfile);
  const q = useQuery({
    queryKey: ["fraud-me"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });
  if (!q.data || q.data.band === "green") return null;
  return <FraudBanner profile={q.data} />;
}
