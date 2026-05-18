import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, MapPin, Boxes, Navigation, Sparkles } from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import { AppCard } from "@/components/ui/app-card";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Giới thiệu — SmartPark" },
      {
        name: "description",
        content:
          "SmartPark là demo end-to-end cho hệ thống tìm bãi đỗ xe IoT realtime với bản đồ, chỉ đường và sơ đồ 3D.",
      },
    ],
  }),
  component: About,
});

const features = [
  { icon: MapPin, title: "Bản đồ realtime", desc: "Pin theo trạng thái slot, cập nhật mỗi 3 giây từ cảm biến IoT." },
  { icon: Navigation, title: "Chỉ đường turn-by-turn", desc: "Tích hợp OSRM với 3 chế độ ô tô / xe máy / đi bộ + ETA động." },
  { icon: Boxes, title: "Sơ đồ 3D từng tầng", desc: "Three.js render mỗi slot, click để giữ chỗ và A* dẫn đường trong bãi." },
  { icon: Sparkles, title: "Trải nghiệm mượt", desc: "Polling thích ứng, lazy load 3D, focus ring rõ — đạt chuẩn HCI cơ bản." },
];

function About() {
  return (
    <div className="space-y-10 max-w-4xl mx-auto">
      <header className="text-center space-y-3 pt-4">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs uppercase tracking-wider text-primary">
          <Sparkles className="size-3" /> Về dự án
        </span>
        <h1 className="text-display font-bold tracking-tight">
          <span className="bg-gradient-to-r from-primary to-[oklch(0.55_0.22_220)] bg-clip-text text-transparent">
            SmartPark
          </span>
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl mx-auto text-pretty">
          Demo end-to-end cho hệ thống tìm bãi đỗ xe IoT realtime. Dữ liệu cảm biến
          được kéo qua server proxy mỗi 3 giây — bảo mật apiKey và ổn định khi URL ngrok thay đổi.
        </p>
      </header>

      <section>
        <SectionHeader title="Tính năng nổi bật" />
        <div className="grid sm:grid-cols-2 gap-4">
          {features.map((f) => (
            <AppCard key={f.title} className="flex items-start gap-3">
              <div className="size-10 rounded-xl bg-primary/10 grid place-items-center text-primary shrink-0">
                <f.icon className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            </AppCard>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader
          title="Kết nối API IoT"
          description="Cấu hình URL và apiKey qua biến môi trường server."
        />
        <AppCard className="space-y-3">
          <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto">
{`PARKING_API_URL=https://your-ngrok.ngrok-free.app
PARKING_API_KEY=abc`}
          </pre>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              "Mặc định fallback URL có sẵn nếu chưa cấu hình.",
              "Polling thích ứng: tự động giãn nhịp khi không có thay đổi.",
              "Có lịch sử chỉ đường (5 chuyến gần nhất, lưu local).",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-[var(--available)] shrink-0 mt-0.5" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </AppCard>
      </section>

      <div className="text-center pt-4">
        <Link
          to="/map"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 glow-primary transition-opacity"
        >
          <MapPin className="size-4" /> Mở bản đồ ngay
        </Link>
      </div>
    </div>
  );
}
