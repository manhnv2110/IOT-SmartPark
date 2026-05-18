import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useMatch,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/Header";
import { ReservationBanner } from "@/components/parking/ReservationBanner";
import { RouteBreadcrumb } from "@/components/RouteBreadcrumb";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Compass, Map, Heart } from "lucide-react";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <EmptyState
        variant="search"
        icon={Compass}
        title="Không tìm thấy trang"
        description="Trang bạn tìm không tồn tại hoặc đã được di chuyển."
        action={
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Về trang chủ
          </Link>
        }
      />
    </main>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <ErrorState
        title="Trang không tải được"
        description={error.message || "Đã có lỗi xảy ra. Hãy thử lại hoặc về trang chủ."}
        onRetry={() => {
          router.invalidate();
          reset();
        }}
        onBack={() => router.history.back()}
      />
    </main>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: "SmartPark — Tìm bãi đỗ xe IoT realtime" },
        {
          name: "description",
          content:
            "Bản đồ bãi đỗ xe thông minh với cảm biến IoT, cập nhật slot trống realtime, chỉ đường ngắn nhất và sơ đồ 3D tương tác.",
        },
        {
          property: "og:title",
          content: "SmartPark — Tìm bãi đỗ xe IoT realtime",
        },
        {
          property: "og:description",
          content:
            "Realtime parking slots, map, navigation và 3D floor plan.",
        },
        { property: "og:type", content: "website" },
        {
          property: "og:image",
          content:
            "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c6dabfae-e7ea-4f53-a03c-e9b43abf9b13/id-preview-6df3c42d--907a0947-af34-451a-8218-d96ac7797d76.lovable.app-1778516031638.png",
        },
        { name: "twitter:card", content: "summary_large_image" },
        {
          name: "twitter:title",
          content: "SmartPark — Tìm bãi đỗ xe IoT realtime",
        },
        {
          name: "twitter:description",
          content: "Realtime parking slots, map, navigation và 3D floor plan.",
        },
        {
          name: "twitter:image",
          content:
            "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c6dabfae-e7ea-4f53-a03c-e9b43abf9b13/id-preview-6df3c42d--907a0947-af34-451a-8218-d96ac7797d76.lovable.app-1778516031638.png",
        },
      ],
      links: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossOrigin: "anonymous",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
        },
        { rel: "stylesheet", href: appCss },
      ],
    }),
    shellComponent: RootShell,
    component: RootComponent,
    notFoundComponent: NotFoundComponent,
    errorComponent: ErrorComponent,
  },
);

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // Don't show breadcrumb on home page
  const isHome = !!useMatch({ from: "/", shouldThrow: false });

  return (
    <QueryClientProvider client={queryClient}>
      <a href="#main-content" className="skip-link">
        Đến nội dung chính
      </a>
      <OfflineBanner />
      <Header />
      <ReservationBanner />
      <main
        id="main-content"
        className="mx-auto max-w-7xl px-4 sm:px-6 py-6 pb-24 sm:pb-6 mt-2"
      >
        {!isHome && <RouteBreadcrumb />}
        <Outlet />
      </main>
      <footer className="mx-auto max-w-7xl px-4 sm:px-6 py-10 pb-28 sm:pb-10">
        <div className="border-t border-border pt-8">
          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
            {/* Brand */}
            <div className="space-y-3">
              <Link to="/" className="flex items-center gap-2 font-semibold text-foreground">
                <span className="size-7 rounded-lg bg-primary/15 grid place-items-center">
                  <Map className="size-3.5 text-primary" />
                </span>
                SmartPark
              </Link>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Demo IoT parking finder — cảm biến realtime, bản đồ và đặt chỗ thông minh.
              </p>
            </div>

            {/* Links */}
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Khám phá
              </p>
              <div className="flex flex-col gap-1.5">
                <Link to="/map" className="text-sm text-foreground/80 hover:text-primary transition-colors">
                  Bản đồ
                </Link>
                <Link to="/lots" className="text-sm text-foreground/80 hover:text-primary transition-colors">
                  Danh sách bãi
                </Link>
                <Link to="/insights" className="text-sm text-foreground/80 hover:text-primary transition-colors">
                  Insights
                </Link>
                <Link to="/about" className="text-sm text-foreground/80 hover:text-primary transition-colors">
                  Giới thiệu
                </Link>
              </div>
            </div>

            {/* Info */}
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Thông tin
              </p>
              <div className="flex flex-col gap-1.5">
                <p className="text-sm text-muted-foreground">
                  Cập nhật mỗi 3 giây qua IoT sensor
                </p>
                <p className="text-sm text-muted-foreground">
                  Hỗ trợ thanh toán VNPay sandbox
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border/50 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>
              © {new Date().getFullYear()} SmartPark — UET IoT Project
            </p>
            <p className="flex items-center gap-1">
              Made with <Heart className="size-3 text-[var(--occupied)] fill-[var(--occupied)]" /> in Hanoi
            </p>
          </div>
        </div>
      </footer>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
