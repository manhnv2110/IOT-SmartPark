import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Navigation,
  Radar,
  Route as RouteIcon,
  BadgeCheck,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { useParkingDevices } from "@/hooks/useParkingDevices";
import { computeStats, getDeviceId } from "@/lib/parking.types";
import { LotCard } from "@/components/parking/LotCard";
import { NearestLotCard } from "@/components/map/NearestLotCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartPark — Tìm bãi đỗ xe IoT realtime" },
      {
        name: "description",
        content:
          "Tìm bãi đỗ xe gần bạn theo thời gian thực. Bản đồ realtime, chỉ đường và giữ chỗ chỉ trong vài chạm.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { data } = useParkingDevices();
  const devices = data?.devices ?? [];

  const totals = useMemo(() => {
    let online = 0;
    let available = 0;
    let total = 0;
    for (const d of devices) {
      if (d.is_online) online += 1;
      const s = computeStats(d);
      available += s.available;
      total += s.total;
    }
    return { online, available, total, devices: devices.length };
  }, [devices]);

  const top = useMemo(
    () =>
      [...devices]
        .map((d) => ({ d, s: computeStats(d) }))
        .sort((a, b) => b.s.available - a.s.available)
        .slice(0, 3),
    [devices],
  );

  return (
    <div className="space-y-20 sm:space-y-24 pb-8">
      {/* HERO */}
      <section className="relative pt-6 sm:pt-10">
        <div
          aria-hidden
          className="absolute top-20 -right-20 w-[420px] h-[420px] rounded-full blur-3xl opacity-60 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--mint) 60%, transparent), transparent 70%)",
          }}
        />
        <div className="relative grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-14 items-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border text-[11px] font-medium text-muted-foreground">
              <span className="relative inline-flex">
                <span className="size-1.5 rounded-full bg-[var(--available)] animate-pulse-dot" />
              </span>
              Realtime IoT · Cập nhật mỗi 3 giây
            </span>

            <h1 className="mt-5 text-display text-foreground text-balance">
              Tìm bãi đỗ xe{" "}
              <span className="brush-underline">thông minh</span>
              <br className="hidden sm:block" />
              {" "}theo thời gian thực.
            </h1>

            <p className="mt-5 text-body max-w-md">
              Cập nhật từng slot mỗi 3 giây qua cảm biến IoT. Bản đồ, chỉ đường và
              giữ chỗ chỉ trong vài chạm.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/map"
                className="inline-flex items-center gap-2 h-12 px-5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-[var(--shadow-2)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-3)] transition-all"
              >
                <Navigation className="size-4" strokeWidth={2.25} />
                Tìm bãi gần nhất
              </Link>
              <Link
                to="/lots"
                className="inline-flex items-center gap-2 h-12 px-5 rounded-xl bg-card border border-border text-foreground font-medium text-sm hover:bg-accent/40 transition-colors"
              >
                Xem trạng thái
                <ArrowRight className="size-4" strokeWidth={2} />
              </Link>
            </div>

            {/* Trust row */}
            <div className="mt-10 flex items-stretch gap-6 sm:gap-8">
              <Stat label="Bãi đỗ" value={totals.devices} />
              <Divider />
              <Stat label="Online" value={totals.online} />
              <Divider />
              <Stat label="Slot trống" value={totals.available} accent />
              <Divider />
              <Stat label="Tổng slot" value={totals.total} />
            </div>
          </motion.div>

          {/* Right — dashboard preview */}
          <DashboardPreview totals={totals} />
        </div>
      </section>

      {/* Nearest quick action */}
      <NearestLotCard devices={devices} />

      {/* HOW IT WORKS */}
      <section>
        <div className="max-w-xl mb-8">
          <p className="text-caption">Cách hoạt động</p>
          <h2 className="mt-2 text-headline text-foreground">
            Từ cảm biến đến chỗ đỗ, ba bước.
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Step
            n="01"
            icon={<Radar className="size-5" strokeWidth={1.75} />}
            title="Cảm biến IoT realtime"
            desc="Trạng thái slot cập nhật mỗi 3 giây qua REST, sẵn sàng nâng cấp WebSocket."
          />
          <Step
            n="02"
            icon={<RouteIcon className="size-5" strokeWidth={1.75} />}
            title="Chỉ đường ngắn nhất"
            desc="Định tuyến qua OSRM với chế độ ô tô, xe máy và đi bộ ngay trong app."
          />
          <Step
            n="03"
            icon={<BadgeCheck className="size-5" strokeWidth={1.75} />}
            title="Giữ chỗ tức thì"
            desc="Quét VietQR, hệ thống tự xác nhận trong vài giây — vé sẵn sàng để check-in."
          />
        </div>
      </section>

      {/* TOP LOTS */}
      <section>
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-caption">Đang hot</p>
            <h2 className="mt-2 text-headline text-foreground">
              Bãi nhiều chỗ nhất
            </h2>
          </div>
          <Link
            to="/lots"
            className="text-sm font-medium text-primary inline-flex items-center gap-1 hover:gap-2 transition-all"
          >
            Xem tất cả <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {top.length === 0
            ? Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-44 rounded-2xl bg-card border border-border animate-pulse"
                />
              ))
            : top.map(({ d }) => <LotCard key={getDeviceId(d)} device={d} />)}
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="relative overflow-hidden rounded-3xl gradient-soft p-8 sm:p-12 text-center border border-border">
          <h2 className="text-headline text-foreground">
            Sẵn sàng tìm chỗ đỗ?
          </h2>
          <p className="mt-2 text-body max-w-md mx-auto">
            Mở bản đồ và để SmartPark gợi ý bãi phù hợp nhất với hành trình của bạn.
          </p>
          <div className="mt-6">
            <Link
              to="/map"
              className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-foreground text-background font-semibold text-sm hover:-translate-y-0.5 transition-transform shadow-[var(--shadow-2)]"
            >
              <Navigation className="size-4" strokeWidth={2.25} />
              Mở bản đồ
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Divider() {
  return <span aria-hidden className="w-px bg-border" />;
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div>
      <div
        className={`text-2xl font-semibold tabular-nums tracking-tight ${
          accent ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </div>
      <div className="text-caption mt-1">{label}</div>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  desc,
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl bg-card border border-border p-6 hover:-translate-y-0.5 hover:shadow-[var(--shadow-2)] transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="grid place-items-center size-10 rounded-xl bg-primary-soft/50 text-foreground">
          {icon}
        </div>
        <span className="text-2xl font-semibold tabular-nums text-muted-foreground/40 tracking-tight">
          {n}
        </span>
      </div>
      <h3 className="mt-4 font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
        {desc}
      </p>
    </motion.div>
  );
}

function DashboardPreview({
  totals,
}: {
  totals: { available: number; online: number; devices: number };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      className="relative h-[360px] sm:h-[420px]"
    >
      {/* Main map preview card */}
      <div className="absolute inset-0 rounded-3xl bg-card border border-border shadow-[var(--shadow-3)] overflow-hidden">
        {/* Mock map background */}
        <svg
          viewBox="0 0 400 420"
          className="absolute inset-0 w-full h-full"
          aria-hidden
        >
          <defs>
            <linearGradient id="mapbg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="oklch(0.97 0.012 195)" />
              <stop offset="1" stopColor="oklch(0.95 0.04 190)" />
            </linearGradient>
          </defs>
          <rect width="400" height="420" fill="url(#mapbg)" />
          {/* abstract streets */}
          <g
            stroke="oklch(0.85 0.02 220)"
            strokeWidth="14"
            strokeLinecap="round"
            opacity="0.7"
          >
            <path d="M-20 120 L 420 90" />
            <path d="M-20 250 L 420 280" />
            <path d="M 80 -20 L 110 440" />
            <path d="M 280 -20 L 310 440" />
          </g>
          <g stroke="white" strokeWidth="2" strokeDasharray="6 8" opacity="0.9">
            <path d="M-20 120 L 420 90" />
            <path d="M-20 250 L 420 280" />
            <path d="M 80 -20 L 110 440" />
            <path d="M 280 -20 L 310 440" />
          </g>
          {/* blocks */}
          <g fill="oklch(0.99 0.005 200)" opacity="0.8">
            <rect x="130" y="120" width="130" height="120" rx="8" />
            <rect x="20" y="290" width="60" height="100" rx="8" />
            <rect x="340" y="20" width="60" height="60" rx="8" />
          </g>
        </svg>

        {/* Pins */}
        <Pin x="22%" y="38%" tone="available" />
        <Pin x="58%" y="28%" tone="occupied" />
        <Pin x="48%" y="66%" tone="available" pulse />
        <Pin x="78%" y="56%" tone="reserved" />

        {/* Header chip */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 border border-border text-xs font-medium backdrop-blur">
            <MapPin className="size-3.5 text-primary" strokeWidth={2.25} />
            Hà Nội · {totals.devices} bãi
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/90 border border-border text-[11px] font-medium backdrop-blur">
            <span className="size-1.5 rounded-full bg-[var(--available)] animate-pulse-dot" />
            Live
          </div>
        </div>

        {/* Bottom info card */}
        <div className="absolute left-4 right-4 bottom-4 rounded-2xl bg-white/95 backdrop-blur border border-border p-3.5 shadow-[var(--shadow-1)]">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center size-10 rounded-xl bg-primary-soft/60 text-primary">
              <MapPin className="size-4.5" strokeWidth={2.25} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Gần bạn nhất</p>
              <p className="text-sm font-semibold truncate">
                Bãi đỗ Cầu Giấy · 0.4 km
              </p>
            </div>
            <span className="px-2 py-1 rounded-full bg-[var(--available)]/12 text-[var(--available)] text-[11px] font-semibold tabular-nums">
              {totals.available || 12} trống
            </span>
          </div>
        </div>
      </div>

      {/* Floating sub-card 1 */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-4 top-12 hidden sm:flex w-52 rounded-2xl bg-card border border-border p-3 shadow-[var(--shadow-2)] items-center gap-3"
      >
        <div className="grid place-items-center size-9 rounded-lg bg-[var(--available)]/15 text-[var(--available)]">
          <Radar className="size-4" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Sensor #03
          </p>
          <p className="text-xs font-semibold">Slot A12 · Available</p>
        </div>
      </motion.div>

      {/* Floating sub-card 2 */}
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -right-4 bottom-24 hidden sm:flex w-56 rounded-2xl bg-card border border-border p-3 shadow-[var(--shadow-2)] items-center gap-3"
      >
        <div className="grid place-items-center size-9 rounded-lg bg-primary-soft/60 text-primary">
          <CheckCircle2 className="size-4" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Booking
          </p>
          <p className="text-xs font-semibold">Đã giữ chỗ A12 · 2h</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Pin({
  x,
  y,
  tone,
  pulse,
}: {
  x: string;
  y: string;
  tone: "available" | "occupied" | "reserved";
  pulse?: boolean;
}) {
  const color =
    tone === "available"
      ? "var(--available)"
      : tone === "occupied"
        ? "var(--occupied)"
        : "var(--reserved)";
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: x, top: y }}
    >
      <div className="relative">
        {pulse && (
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: color, opacity: 0.35 }}
          />
        )}
        <span
          className="relative grid place-items-center size-5 rounded-full shadow-[var(--shadow-1)] ring-2 ring-white"
          style={{ background: color }}
        >
          <span className="size-1.5 rounded-full bg-white" />
        </span>
      </div>
    </div>
  );
}
