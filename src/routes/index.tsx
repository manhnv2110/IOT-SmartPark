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
import { useBookingCounts } from "@/hooks/useBookingCounts";

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
  const { getBookedCount } = useBookingCounts();

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
    <div className="space-y-24 sm:space-y-32 pb-12">
      {/* Stripe Premium Hero Section */}
      <section className="relative pt-8 sm:pt-14 overflow-visible">
        {/* Glow element */}
        <div
          aria-hidden
          className="absolute -top-12 right-0 w-[500px] h-[500px] rounded-full blur-3xl opacity-40 dark:opacity-20 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, var(--primary) 0%, var(--mint) 50%, transparent 100%)",
          }}
        />

        <div className="relative grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Status chip */}
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass border border-white/20 dark:border-white/5 text-[11px] font-bold text-primary shadow-sm">
              <span className="relative inline-flex size-2">
                <span className="size-2 rounded-full bg-[var(--available)] animate-pulse-dot" />
              </span>
              Realtime IoT Network
            </span>

            {/* Title */}
            <h1 className="mt-6 text-display text-foreground text-pretty">
              Tìm bãi đỗ xe{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-mint to-indigo-500 dark:from-primary dark:via-mint dark:to-indigo-400">
                thông minh
              </span>
              <br />
              theo thời gian thực.
            </h1>

            {/* Description */}
            <p className="mt-6 text-body max-w-lg text-muted-foreground/90 font-medium">
              Kiểm soát chỗ đỗ trống tức thì thông qua hạ tầng cảm biến IoT hiện đại.
              Định vị, chỉ đường thông minh và thanh toán giữ chỗ không chạm chỉ trong vài giây.
            </p>

            {/* CTA Actions */}
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/map"
                className="inline-flex items-center gap-2 h-12.5 px-6 rounded-full stripe-btn text-primary-foreground font-bold text-sm"
              >
                <Navigation className="size-4" strokeWidth={2.5} />
                Bản đồ bãi đỗ
              </Link>
              <Link
                to="/lots"
                className="inline-flex items-center gap-2 h-12.5 px-6 rounded-full glass hover:bg-accent/40 text-foreground font-bold text-sm"
              >
                Xem trạng thái bãi
                <ArrowRight className="size-4" strokeWidth={2.5} />
              </Link>
            </div>

            {/* Modern Stats Grid */}
            <div className="mt-12 pt-8 border-t border-border/40 grid grid-cols-4 gap-4 sm:gap-6">
              <Stat label="Bãi đỗ" value={totals.devices} />
              <Stat label="Online" value={totals.online} />
              <Stat label="Slot trống" value={totals.available} accent />
              <Stat label="Tổng slot" value={totals.total} />
            </div>
          </motion.div>

          {/* Right — Dashboard Mockup Preview */}
          <DashboardPreview totals={totals} />
        </div>
      </section>

      {/* Quick Actions / Nearest parking lots */}
      <NearestLotCard devices={devices} />

      {/* Stripe-style Features / How it works */}
      <section className="relative">
        <div className="max-w-xl mb-12">
          <p className="text-caption">Quy trình vận hành</p>
          <h2 className="mt-3 text-headline text-foreground text-pretty">
            Kiến trúc kết nối từ cảm biến IoT tới điểm đỗ xe
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          <Step
            n="01"
            icon={<Radar className="size-5 text-primary" strokeWidth={2.25} />}
            title="Cảm biến IoT Realtime"
            desc="Trạng thái từng slot được cập nhật liên tục từ cảm biến vật lý — không cần làm mới trang."
          />
          <Step
            n="02"
            icon={<RouteIcon className="size-5 text-primary" strokeWidth={2.25} />}
            title="Định tuyến thông minh"
            desc="Tích hợp bản đồ OSRM chất lượng cao tự động tính toán lộ trình tối ưu cho xe hơi, xe máy và đi bộ."
          />
          <Step
            n="03"
            icon={<BadgeCheck className="size-5 text-primary" strokeWidth={2.25} />}
            title="Giữ chỗ tức thì"
            desc="Cấp mã giữ chỗ độc quyền tự động qua mã VietQR, xác nhận vị trí đỗ ngay lập tức trên hệ thống."
          />
        </div>
      </section>

      {/* Top Parking Lots List */}
      <section>
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-caption">Thời gian thực</p>
            <h2 className="mt-3 text-headline text-foreground">
              Bãi đỗ trống nhiều nhất
            </h2>
          </div>
          <Link
            to="/lots"
            className="text-xs font-bold text-primary inline-flex items-center gap-1.5 hover:gap-2.5 transition-all"
          >
            Tất cả bãi đỗ <ArrowRight className="size-4" strokeWidth={2.5} />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {top.length === 0
            ? Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-44 rounded-2xl bg-card border border-border animate-pulse"
                />
              ))
            : top.map(({ d }) => <LotCard key={getDeviceId(d)} device={d} bookedSlots={getBookedCount(getDeviceId(d))} />)}
        </div>
      </section>

      {/* Stripe-inspired Beautiful CTA Section */}
      <section>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/95 to-indigo-700 dark:from-primary/20 dark:to-indigo-950/40 p-8 sm:p-14 text-center border border-white/10 shadow-2xl">
          {/* Subtle grid lines overlay on CTA */}
          <div className="absolute inset-0 opacity-10 pointer-events-none stripe-bg-lines" />
          <h2 className="text-headline text-white font-extrabold max-w-lg mx-auto">
            Sẵn sàng trải nghiệm dịch vụ đỗ xe thông minh?
          </h2>
          <p className="mt-4 text-white/80 max-w-md mx-auto text-sm font-medium leading-relaxed">
            Mở ngay bản đồ tương tác để SmartPark hỗ trợ điều hướng tới các vị trí đỗ xe trống phù hợp nhất quanh bạn.
          </p>
          <div className="mt-8">
            <Link
              to="/map"
              className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-white text-primary font-bold text-sm hover:scale-102 transition-transform shadow-lg"
            >
              <Navigation className="size-4 text-primary" strokeWidth={2.5} />
              Mở bản đồ ngay
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
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
    <div className="space-y-1">
      <div
        className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
          accent ? "text-primary drop-shadow-[0_0_8px_rgba(99,91,255,0.2)]" : "text-foreground"
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground/80">{label}</div>
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
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl glass p-6 hover:-translate-y-1 hover:shadow-2xl transition-all border border-border/40 hover:border-primary/20 duration-300 group"
    >
      <div className="flex items-center justify-between">
        <div className="grid place-items-center size-10.5 rounded-xl bg-primary/10 border border-primary/20 group-hover:scale-105 transition-transform duration-300">
          {icon}
        </div>
        <span className="text-2xl font-black font-mono text-muted-foreground/20 tracking-tighter">
          {n}
        </span>
      </div>
      <h3 className="mt-5 font-bold text-sm tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground font-semibold">
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
      initial={{ opacity: 0, scale: 0.96, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
      className="relative h-[380px] sm:h-[440px] w-full"
    >
      {/* Decorative colored glow underneath */}
      <div className="absolute inset-4 rounded-3xl bg-primary/10 dark:bg-primary/5 blur-2xl z-0" />

      {/* Main Terminal Window Mockup */}
      <div className="absolute inset-0 rounded-3xl glass border border-slate-200/50 dark:border-white/5 shadow-2xl overflow-hidden flex flex-col z-10">
        
        {/* Terminal Title Bar */}
        <div className="h-11 border-b border-slate-200 dark:border-border/40 bg-slate-200/30 dark:bg-muted/20 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-rose-500/80" />
            <span className="size-2.5 rounded-full bg-amber-500/80" />
            <span className="size-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-[10px] font-bold font-mono text-muted-foreground">smartpark-terminal-v1.sh</span>
          <span className="size-3" />
        </div>

        {/* Terminal Content Area (Realtime Map Graphic) */}
        <div className="flex-1 relative overflow-hidden bg-slate-100/70 dark:bg-slate-950">
          {/* Mock Map Grid lines */}
          <div className="absolute inset-0 opacity-15 stripe-bg-lines" />
          
          {/* Abstract SVG Map Elements with high contrast colors */}
          <svg
            viewBox="0 0 400 420"
            className="absolute inset-0 w-full h-full opacity-35 dark:opacity-30"
            aria-hidden
          >
            <g stroke="rgba(99,91,255,0.25)" strokeWidth="10" strokeLinecap="round">
              <path d="M-20 120 L 420 90" />
              <path d="M-20 250 L 420 280" />
              <path d="M 80 -20 L 110 440" />
              <path d="M 280 -20 L 310 440" />
            </g>
            <g stroke="currentColor" strokeWidth="1" strokeDasharray="5 7" className="text-slate-400/40 dark:text-white/20">
              <path d="M-20 120 L 420 90" />
              <path d="M-20 250 L 420 280" />
              <path d="M 80 -20 L 110 440" />
              <path d="M 280 -20 L 310 440" />
            </g>
          </svg>

          {/* Luminous Glowing Pins on Map */}
          <Pin x="22%" y="38%" tone="available" />
          <Pin x="58%" y="28%" tone="occupied" />
          <Pin x="48%" y="66%" tone="available" pulse />
          <Pin x="78%" y="56%" tone="reserved" />

          {/* Top Info Banner */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/85 dark:bg-slate-900/90 border border-slate-200/50 dark:border-white/10 text-[10px] font-bold text-slate-800 dark:text-white backdrop-blur shadow-lg">
              <MapPin className="size-3 text-primary" strokeWidth={2.5} />
              Hà Nội · {totals.devices} bãi đỗ
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/85 dark:bg-slate-900/90 border border-slate-200/50 dark:border-white/10 text-[9px] font-bold text-slate-800 dark:text-white backdrop-blur shadow-lg">
              <span className="size-1.5 rounded-full bg-[var(--available)] animate-pulse-dot" />
              LIVE FEED
            </div>
          </div>

          {/* Glowing bottom metadata box */}
          <div className="absolute left-4 right-4 bottom-4 rounded-2xl bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/50 dark:border-white/10 p-3.5 shadow-2xl z-20">
            <div className="flex items-center gap-3">
              <div className="grid place-items-center size-9.5 rounded-xl bg-primary/20 text-primary border border-primary/30">
                <MapPin className="size-4" strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Gần bạn nhất</p>
                <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                  Bãi đỗ Cầu Giấy · 0.4 km
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[var(--available)]/15 border border-[var(--available)]/30 text-[var(--available)] text-[10px] font-black tracking-tight font-mono">
                {totals.available || 12} TRỐNG
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Notification Box 1 (Left) */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-6 top-16 hidden sm:flex w-52 rounded-2xl bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/50 dark:border-white/10 p-3 shadow-2xl items-center gap-3 z-30"
      >
        <div className="grid place-items-center size-8.5 rounded-lg bg-[var(--available)]/20 border border-[var(--available)]/30 text-[var(--available)] shrink-0">
          <Radar className="size-4" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
            IoT Sensor #03
          </p>
          <p className="text-xs font-bold text-slate-800 dark:text-white">Slot A12 · Trống</p>
        </div>
      </motion.div>

      {/* Floating Notification Box 2 (Right) */}
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -right-6 bottom-24 hidden sm:flex w-56 rounded-2xl bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/50 dark:border-white/10 p-3 shadow-2xl items-center gap-3 z-30"
      >
        <div className="grid place-items-center size-8.5 rounded-lg bg-primary/20 border border-primary/30 text-primary shrink-0">
          <CheckCircle2 className="size-4" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
            Hệ thống đặt chỗ
          </p>
          <p className="text-xs font-bold text-slate-800 dark:text-white">Đã giữ chỗ Slot A12</p>
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
            style={{ background: color, opacity: 0.4 }}
          />
        )}
        <span
          className="relative grid place-items-center size-5.5 rounded-full shadow-2xl ring-2 ring-white dark:ring-slate-950"
          style={{ background: color }}
        >
          <span className="size-1.5 rounded-full bg-white" />
        </span>
      </div>
    </div>
  );
}
