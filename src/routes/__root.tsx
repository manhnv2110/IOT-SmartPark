import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useMatch,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/Header";
import { ReservationBanner } from "@/components/parking/ReservationBanner";
import { RouteBreadcrumb } from "@/components/RouteBreadcrumb";
import { EmptyState } from "@/components/ui/empty-state";
import { Compass, Map, Heart } from "lucide-react";
import appCss from "../styles.css?url";
// Side-effect import: installs idempotent global `error` and `unhandledrejection`
// listeners that forward thrown values into `error-capture` (Auth_Reporter).
// Idempotent because ESM caches the module — the listeners attach once per realm.
// See Requirement 17.1.
import "@/lib/error-capture";
import { renderErrorPage } from "@/lib/error-page";

function NotFoundComponent() {
  return (
    <main className="mx-auto max-w-md px-4 py-20">
      <EmptyState
        variant="search"
        icon={Compass}
        title="Không tìm thấy trang"
        description="Trang bạn tìm không tồn tại hoặc đã được di chuyển."
        action={
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Về trang chủ
          </Link>
        }
      />
    </main>
  );
}

function ErrorComponent({ error }: { error: Error; reset: () => void }) {
  // Route-level error boundary. Forward to `error-capture` (Auth_Reporter) by
  // dispatching a global `error` event so the listeners installed by
  // `src/lib/error-capture` record this for the SSR fallback path. Then render
  // the canonical graceful error page from `src/lib/error-page.ts` inside a
  // sandboxed iframe so we get a single source of truth for that markup.
  // See Requirement 17.1.
  useEffect(() => {
    console.error(error);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new ErrorEvent("error", {
          error,
          message: error.message,
          filename: "",
          lineno: 0,
          colno: 0,
        }),
      );
    }
  }, [error]);

  return (
    <iframe
      title="Error"
      srcDoc={renderErrorPage()}
      sandbox="allow-same-origin allow-scripts allow-top-navigation"
      style={{ border: 0, width: "100%", height: "100vh", display: "block" }}
    />
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: "SmartPark — Bãi đỗ xe thông minh IoT" },
        {
          name: "description",
          content:
            "Hệ thống tìm bãi đỗ xe thông minh với cảm biến IoT, cập nhật slot trống realtime, chỉ đường và đặt chỗ tức thì.",
        },
        {
          property: "og:title",
          content: "SmartPark — Bãi đỗ xe thông minh IoT",
        },
        {
          property: "og:description",
          content:
            "Realtime parking slots, map, navigation và 3D floor plan.",
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
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
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap",
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
  const isHome = !!useMatch({ from: "/", shouldThrow: false });

  return (
    <QueryClientProvider client={queryClient}>
      <div className="stripe-bg-lines min-h-screen flex flex-col relative overflow-hidden">
        <a href="#main" className="skip-link">
          Đến nội dung chính
        </a>
        <Header />
        <ReservationBanner />
        <main
          id="main"
          className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 pb-24 sm:pb-8 flex-1 z-10 relative"
        >
          {!isHome && <RouteBreadcrumb />}
          <Outlet />
        </main>

        {/* Premium footer redesigned */}
        <footer className="border-t border-border mt-auto backdrop-blur-md bg-card/10 z-10 relative">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-2">
                <Link to="/" className="flex items-center gap-2.5 font-bold text-foreground text-sm tracking-tight">
                  <span className="size-6 rounded-lg bg-primary/10 grid place-items-center">
                    <Map className="size-3.5 text-primary" strokeWidth={2.5} />
                  </span>
                  SmartPark
                </Link>
                <p className="text-xs text-muted-foreground">
                  Hệ thống định vị & đặt chỗ bãi đỗ xe thông minh IoT thời gian thực.
                </p>
              </div>
              <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-muted-foreground">
                <Link to="/map" className="hover:text-primary transition-colors">
                  Bản đồ
                </Link>
                <Link to="/lots" className="hover:text-primary transition-colors">
                  Bãi đỗ
                </Link>
                <Link to="/insights" className="hover:text-primary transition-colors">
                  Insights
                </Link>
                <Link to="/about" className="hover:text-primary transition-colors">
                  Giới thiệu
                </Link>
              </nav>
            </div>
            <div className="mt-8 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-medium text-muted-foreground/80">
              <p>© {new Date().getFullYear()} SmartPark — UET IoT Project. Mọi quyền được bảo lưu.</p>
              <p className="flex items-center gap-1.5">
                Được phát triển với <Heart className="size-3 text-destructive fill-destructive" /> tại Hà Nội
              </p>
            </div>
          </div>
        </footer>
      </div>

      {/*
        Sonner is mounted exactly once at the root. Toast deduplication is
        achieved by passing a stable `id` to `toast(...)` calls (e.g.
        `toast.success(msg, { id: 'lock:success' })`) — Sonner replaces the
        existing toast with the same `id` instead of stacking duplicates,
        yielding at most one visible toast per second per `toastId`.
        See Requirement 10.1.
      */}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
