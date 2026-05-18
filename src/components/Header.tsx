import { Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { Map, List, Ticket, Brain, User, LogOut, Moon, Sun, Menu, X } from "lucide-react";
import { LiveBadge } from "@/components/parking/LiveBadge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Item = {
  to: string;
  label: string;
  icon: typeof Map;
};

const ITEMS: Item[] = [
  { to: "/map", label: "Bản đồ", icon: Map },
  { to: "/lots", label: "Danh sách", icon: List },
  { to: "/insights", label: "Insights", icon: Brain },
  { to: "/bookings", label: "Đơn của tôi", icon: Ticket },
];

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}

export function Header() {
  const { user, loading } = useAuth();
  const { dark, toggle: toggleDark } = useDarkMode();

  return (
    <>
      {/* Floating top nav (desktop + tablet) */}
      <header className="sticky top-4 z-50 mx-auto max-w-6xl px-3 sm:px-4">
        <div
          role="banner"
          className="glass-strong rounded-2xl h-14 px-3 sm:px-4 flex items-center justify-between gap-3"
        >
          <Link
            to="/"
            aria-label="SmartPark — Trang chủ"
            className="flex items-center gap-2.5 font-semibold tracking-tight text-foreground"
          >
            <span
              aria-hidden
              className="grid place-items-center size-8 rounded-xl bg-primary/15 text-primary"
            >
              <Map className="size-4" strokeWidth={2.25} />
            </span>
            <span className="hidden sm:inline text-[15px]">SmartPark</span>
          </Link>

          <nav
            aria-label="Điều hướng chính"
            className="hidden sm:flex items-center gap-0.5"
          >
            {ITEMS.map((it) => (
              <NavItem key={it.to} {...it} />
            ))}
          </nav>

          <div className="hidden sm:flex items-center gap-2">
            <LiveBadge />
            <button
              onClick={toggleDark}
              className="size-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
              aria-label={dark ? "Chế độ sáng" : "Chế độ tối"}
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            {!loading && (
              user ? (
                <UserMenu email={user.email ?? ""} />
              ) : (
                <Link
                  to="/auth"
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Đăng nhập
                </Link>
              )
            )}
          </div>

          {/* mobile right-side */}
          <div className="sm:hidden flex items-center gap-2">
            <LiveBadge />
            <button
              onClick={toggleDark}
              className="size-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              aria-label={dark ? "Chế độ sáng" : "Chế độ tối"}
            >
              {dark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
            </button>
            {!loading && !user && (
              <Link
                to="/auth"
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-primary text-primary-foreground"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Bottom dock (mobile only) — Fitts's Law */}
      <nav
        aria-label="Điều hướng (mobile)"
        className="sm:hidden fixed bottom-3 inset-x-3 z-50 glass-strong rounded-2xl px-2 py-1.5 flex items-center justify-around"
        style={{ paddingBottom: "calc(0.375rem + env(safe-area-inset-bottom))" }}
      >
        {ITEMS.map((it) => (
          <MobileTab key={it.to} {...it} />
        ))}
        <MobileTab
          to={user ? "/bookings" : "/auth"}
          label={user ? "Tôi" : "Đăng nhập"}
          icon={User}
        />
      </nav>
    </>
  );
}

function UserMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, handleClickOutside]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors",
          open ? "bg-accent text-foreground" : "text-foreground hover:bg-accent/60"
        )}
      >
        <div className="size-6 rounded-full bg-primary/15 grid place-items-center">
          <User className="size-3.5 text-primary" />
        </div>
        <span className="max-w-[120px] truncate hidden md:inline">{email}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 glass-strong rounded-xl p-1.5 shadow-lg border border-border/50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2 text-xs text-muted-foreground truncate border-b border-border/50 mb-1">
            {email}
          </div>
          <Link
            to="/bookings"
            className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg hover:bg-accent/60 transition-colors"
            onClick={() => setOpen(false)}
          >
            <Ticket className="size-4" />
            Đơn của tôi
          </Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              setOpen(false);
              window.location.href = "/";
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg hover:bg-destructive/10 transition-colors text-destructive"
          >
            <LogOut className="size-4" />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

function NavItem({ to, label, icon: Icon }: Item) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="group relative px-3 py-2 rounded-xl flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
      activeProps={{
        className:
          "px-3 py-2 rounded-xl flex items-center gap-2 text-sm font-medium text-primary bg-primary/10",
      }}
    >
      <Icon className="size-4" strokeWidth={2} />
      <span>{label}</span>
    </Link>
  );
}

function MobileTab({ to, label, icon: Icon }: Item) {
  return (
    <Link
      to={to}
      aria-label={label}
      className={cn(
        "flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors",
      )}
      activeProps={{
        className:
          "flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium text-primary bg-primary/10",
      }}
    >
      <Icon className="size-5" strokeWidth={2} />
      <span>{label}</span>
    </Link>
  );
}
