import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Inbox, Lock, Search, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export type EmptyStateVariant = "default" | "search" | "auth" | "offline";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: EmptyStateVariant;
  className?: string;
}

/**
 * Tone classes per variant. Tất cả tham chiếu Tailwind v4 token (không hardcode HEX).
 * - default : neutral muted, dùng khi list rỗng "trung tính"
 * - search  : primary nhẹ, dùng khi không có kết quả tìm kiếm/lọc
 * - auth    : warning amber nhẹ (token `reserved`), dùng khi cần đăng nhập
 * - offline : warning amber đậm hơn, dùng khi mất kết nối / không có dữ liệu offline
 */
const VARIANT_TONE: Record<
  EmptyStateVariant,
  { iconWrap: string; iconColor: string }
> = {
  default: {
    iconWrap: "bg-muted",
    iconColor: "text-muted-foreground",
  },
  search: {
    iconWrap: "bg-primary/10",
    iconColor: "text-primary",
  },
  auth: {
    iconWrap: "bg-reserved/10",
    iconColor: "text-reserved",
  },
  offline: {
    iconWrap: "bg-reserved/20 ring-1 ring-reserved/30",
    iconColor: "text-reserved",
  },
};

const VARIANT_DEFAULT_ICON: Record<EmptyStateVariant, LucideIcon> = {
  default: Inbox,
  search: Search,
  auth: Lock,
  offline: WifiOff,
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "default",
  className,
}: EmptyStateProps) {
  const tone = VARIANT_TONE[variant];
  const Icon = icon ?? VARIANT_DEFAULT_ICON[variant];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-12 rounded-2xl glass",
        className
      )}
      data-variant={variant}
    >
      <div
        aria-hidden="true"
        className={cn(
          "size-16 rounded-2xl grid place-items-center mb-4",
          tone.iconWrap,
          tone.iconColor
        )}
      >
        <Icon className="size-8" strokeWidth={1.75} />
      </div>
      <h3 className="text-lg font-medium text-foreground text-balance">{title}</h3>
      {description ? (
        <p className="mt-1.5 text-sm text-muted-foreground max-w-sm text-pretty">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
