import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
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
import { Compass } from "lucide-react";
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

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
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
});

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
        className="mx-auto max-w-7xl px-4 sm:px-6 py-6 pb-24 sm:pb-6"
      >
        <RouteBreadcrumb />
        <Outlet />
      </main>
      <footer className="mx-auto max-w-7xl px-4 sm:px-6 py-10 pb-28 sm:pb-10 text-xs text-muted-foreground">
        <div className="border-t border-border pt-6 flex flex-wrap items-center justify-between gap-3">
          <p>
            © {new Date().getFullYear()} SmartPark — Demo IoT parking finder
          </p>
          <p className="opacity-70">Cập nhật mỗi 3 giây</p>
        </div>
      </footer>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
