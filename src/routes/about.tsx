import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  MapPin,
  Navigation,
  Boxes,
  Sparkles,
  Brain,
  Zap,
  CreditCard,
  Shield,
  ArrowRight,
} from "lucide-react";
import { AppCard } from "@/components/ui/app-card";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Giới thiệu — SmartPark" },
      {
        name: "description",
        content:
          "SmartPark — hệ thống tìm bãi đỗ xe IoT thông minh với bản đồ realtime, chỉ đường và đặt chỗ tức thì.",
      },
    ],
  }),
  component: About,
});

const features = [
  {
    icon: MapPin,
    title: "Bản đồ realtime",
    desc: "Xem trạng thái slot trống/đầy trên bản đồ, cập nhật tự động mỗi 3 giây từ cảm biến IoT.",
    color: "bg-[var(--available)]/15 text-[var(--available)]",
  },
  {
    icon: Navigation,
    title: "Chỉ đường thông minh",
    desc: "Tích hợp OSRM với 3 chế độ ô tô, xe máy, đi bộ — kèm ETA chính xác đến từng bãi.",
    color: "bg-primary/15 text-primary",
  },
  {
    icon: Boxes,
    title: "Sơ đồ 3D tương tác",
    desc: "Three.js render từng slot theo tầng. Click chọn chỗ, thuật toán A* dẫn đường trong bãi.",
    color: "bg-[var(--reserved)]/15 text-[var(--reserved)]",
  },
  {
    icon: Brain,
    title: "AI Insights",
    desc: "Dự báo lấp đầy, gợi ý bãi tối ưu, giá động theo nhu cầu — tất cả trong một bảng điều khiển.",
    color: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  },
  {
    icon: CreditCard,
    title: "Thanh toán VNPay",
    desc: "Đặt chỗ và thanh toán trực tuyến an toàn qua cổng VNPay — hỗ trợ ATM, QR, thẻ quốc tế.",
    color: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
  {
    icon: Zap,
    title: "Trải nghiệm mượt mà",
    desc: "Polling thích ứng, lazy load 3D, dark mode, responsive — tối ưu cho mọi thiết bị.",
    color: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
];

const stats = [
  { label: "Cập nhật", value: "3s", sub: "Realtime IoT" },
  { label: "Bản đồ", value: "3D", sub: "Tương tác" },
  { label: "Thanh toán", value: "VNPay", sub: "Sandbox" },
  { label: "Insights", value: "AI", sub: "Dự báo" },
];

function About() {
  return (
    <div className="space-y-16 max-w-5xl mx-auto pb-8">
      {/* Hero */}
      <header className="text-center space-y-5 pt-6 sm:pt-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-4"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-primary">
            <Sparkles className="size-3" />
            Về dự án
          </span>
          <h1 className="text-display font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary to-[var(--mint)] bg-clip-text text-transparent">
              SmartPark
            </span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto text-pretty leading-relaxed">
            Hệ thống tìm bãi đỗ xe IoT thông minh — từ cảm biến đến chỗ đỗ, mọi thứ realtime
            và tự động. Dữ liệu cập nhật mỗi 3 giây, đặt chỗ chỉ trong vài chạm.
          </p>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto"
        >
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl bg-card border border-border p-3.5 text-center"
            >
              <p className="text-xl font-bold text-primary tabular-nums">{s.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                {s.sub}
              </p>
            </div>
          ))}
        </motion.div>
      </header>

      {/* Features grid */}
      <section>
        <div className="text-center mb-8">
          <p className="text-caption">Tính năng</p>
          <h2 className="mt-2 text-headline text-foreground">
            Mọi thứ bạn cần cho việc đỗ xe
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <AppCard className="flex items-start gap-4 h-full hover:-translate-y-0.5 hover:shadow-[var(--shadow-2)] transition-all">
                <div
                  className={`size-11 rounded-xl grid place-items-center shrink-0 ${f.color}`}
                >
                  <f.icon className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </AppCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Tech stack */}
      <section>
        <div className="text-center mb-8">
          <p className="text-caption">Công nghệ</p>
          <h2 className="mt-2 text-headline text-foreground">
            Xây dựng trên nền tảng hiện đại
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { name: "React 19", desc: "Frontend" },
            { name: "TanStack Start", desc: "Full-stack SSR" },
            { name: "Supabase", desc: "Database & Auth" },
            { name: "Three.js", desc: "3D Visualization" },
            { name: "Leaflet", desc: "Maps & Routing" },
            { name: "VNPay", desc: "Payments" },
            { name: "Tailwind CSS", desc: "Styling" },
            { name: "Cloudflare", desc: "Deployment" },
          ].map((t) => (
            <div
              key={t.name}
              className="rounded-xl border border-border bg-card/50 p-3.5 text-center hover:bg-card transition-colors"
            >
              <p className="text-sm font-semibold text-foreground">{t.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center">
        <div className="rounded-3xl gradient-soft p-8 sm:p-12 border border-border">
          <Shield className="size-8 mx-auto text-primary mb-4" />
          <h2 className="text-headline text-foreground">Sẵn sàng trải nghiệm?</h2>
          <p className="mt-2 text-body max-w-md mx-auto">
            Mở bản đồ, tìm bãi gần nhất và đặt chỗ chỉ trong vài bước.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/map"
              className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:-translate-y-0.5 transition-transform shadow-[var(--shadow-2)]"
            >
              <MapPin className="size-4" />
              Mở bản đồ
            </Link>
            <Link
              to="/lots"
              className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-card border border-border text-foreground font-medium text-sm hover:bg-accent/40 transition-colors"
            >
              Xem bãi đỗ
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
