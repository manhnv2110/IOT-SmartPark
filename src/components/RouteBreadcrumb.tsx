import { Link, useMatches } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";

/**
 * `RouteBreadcrumb` đọc các match từ TanStack Router để dựng breadcrumb
 * từ cấp 2 trở đi. Mỗi route có thể tự khai báo nhãn qua `staticData.title`;
 * fallback dùng segment URL.
 */
const TITLE_MAP: Record<string, string> = {
  "/": "Trang chủ",
  "/about": "Giới thiệu",
  "/auth": "Đăng nhập",
  "/map": "Bản đồ",
  "/lots": "Bãi đỗ",
  "/lots/$deviceId": "Chi tiết",
  "/insights": "Insights",
  "/favorites": "Yêu thích",
  "/bookings": "Đơn của tôi",
  "/booking/new": "Đặt chỗ",
  "/booking/$id/pay": "Thanh toán",
  "/booking/$id/ticket": "Vé",
};

export function RouteBreadcrumb() {
  const matches = useMatches();

  // Bỏ qua route gốc + các route không có path. Cần ≥ 2 mức (root + ≥ 2 segment).
  const segments = matches.filter((m) => m.routeId !== "__root__");
  if (segments.length <= 1) return null;

  return (
    <nav
      aria-label="Đường dẫn trang"
      className="mb-4 text-xs text-muted-foreground flex items-center gap-1 flex-wrap"
    >
      <Link
        to="/"
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        aria-label="Trang chủ"
      >
        <Home className="size-3.5" aria-hidden="true" />
      </Link>
      {segments.map((m, i) => {
        const isLast = i === segments.length - 1;
        const label = TITLE_MAP[m.routeId] ?? prettifySegment(m.pathname);
        return (
          <span key={m.id} className="inline-flex items-center gap-1">
            <ChevronRight className="size-3 opacity-50" aria-hidden="true" />
            {isLast ? (
              <span aria-current="page" className="text-foreground font-medium">
                {label}
              </span>
            ) : (
              <Link
                to={m.pathname}
                className="hover:text-foreground transition-colors"
              >
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function prettifySegment(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  if (!last) return "—";
  return decodeURIComponent(last);
}
