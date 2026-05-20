import { Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { Map, List, Ticket, Brain, User, LogOut, Moon, Sun } from "lucide-react";
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
  { to: "/lots", label: "Bãi đỗ", icon: List },
  { to: "/insights", label: "Insights", icon: Brain },
  { to: "/bookings", label: "Vé của tôi", icon: Ticket },
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
      {/* Premium Stripe-like Floating Top Navigation */}
      <header className="sticky top-5 z-50 mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div
          role="banner"
          className="glass rounded-full h-15 px-5 flex items-center justify-between gap-4 border border-white/10 dark:border-white/5 shadow-2xl transition-all duration-300 hover:border-primary/20 dark:hover:border-primary/30"
        >
          {/* Logo */}
          <Link
            to="/"
            aria-label="SmartPark — Trang chủ"
            className="flex items-center gap-2.5 font-bold tracking-tight text-foreground transition-transform hover:scale-[1.02]"
          >
            <span
              aria-hidden
              className="grid place-items-center size-8.5 rounded-full bg-primary/10 text-primary border border-primary/20"
            >
              <Map className="size-4" strokeWidth={2.5} />
            </span>
            <span className="hidden sm:inline text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-primary">
              SmartPark
            </span>
          </Link>

          {/* Main Desktop Navigation */}
          <nav
            aria-label="Điều hướng chính"
            className="hidden sm:flex items-center gap-1 bg-muted/30 dark:bg-muted/10 p-1.5 rounded-full border border-border/30"
          >
            {ITEMS.map((it) => (
              <NavItem key={it.to} {...it} />
            ))}
          </nav>

          {/* Right actions */}
          <div className="hidden sm:flex items-center gap-3">
            <LiveBadge />
            <button
              onClick={toggleDark}
              className="size-8.5 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all border border-transparent hover:border-border/40"
              aria-label={dark ? "Chế độ sáng" : "Chế độ tối"}
            >
              {dark ? <Sun className="size-4" strokeWidth={2} /> : <Moon className="size-4" strokeWidth={2} />}
            </button>
            {!loading && (
              user ? (
                <UserMenu email={user.email ?? ""} />
              ) : (
                <Link
                  to="/auth"
                  className="px-4.5 py-1.5 rounded-full text-xs font-bold stripe-btn text-primary-foreground"
                >
                  Đăng nhập
                </Link>
              )
            )}
          </div>

          {/* Mobile Right Action Bar */}
          <div className="sm:hidden flex items-center gap-2.5">
            <LiveBadge />
            <button
              onClick={toggleDark}
              className="size-8 grid place-items-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
              aria-label={dark ? "Chế độ sáng" : "Chế độ tối"}
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            {!loading && !user && (
              <Link
                to="/auth"
                className="px-3.5 py-1.5 rounded-full text-[11px] font-bold stripe-btn text-primary-foreground"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Bottom Floating Navigation Dock for Mobile (Fitts's Law Compliant) */}
      <nav
        aria-label="Điều hướng (mobile)"
        className="sm:hidden fixed bottom-4 inset-x-4 z-50 glass rounded-full px-3 py-2 flex items-center justify-around shadow-2xl border border-white/10"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
      >
        {ITEMS.map((it) => (
          <MobileTab key={it.to} {...it} />
        ))}
        <MobileTab
          to={user ? "/bookings" : "/auth"}
          label={user ? "Cá nhân" : "Đăng nhập"}
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
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border border-border/40 backdrop-blur",
          open ? "bg-accent/80 text-foreground" : "text-foreground hover:bg-accent/60"
        )}
      >
        <div className="size-6 rounded-full bg-primary/10 grid place-items-center border border-primary/20">
          <User className="size-3 text-primary" />
        </div>
        <span className="max-w-[110px] truncate hidden md:inline">{email}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2.5 w-52 glass-strong rounded-2xl p-1.5 shadow-2xl border border-border/60 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="px-3.5 py-2.5 text-[10px] uppercase font-bold tracking-wider text-muted-foreground border-b border-border/40 mb-1">
            Tài khoản
          </div>
          <Link
            to="/bookings"
            className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium rounded-xl hover:bg-accent/60 transition-colors"
            onClick={() => setOpen(false)}
          >
            <Ticket className="size-4 text-primary" />
            Vé của tôi
          </Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              setOpen(false);
              window.location.href = "/";
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold rounded-xl hover:bg-destructive/10 transition-colors text-destructive"
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
      className="group relative px-4 py-2 rounded-full flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all duration-200"
      activeProps={{
        className:
          "px-4 py-2 rounded-full flex items-center gap-2 text-xs font-bold text-primary bg-card shadow-sm border border-border/40",
      }}
    >
      <Icon className="size-3.5 group-hover:scale-105 transition-transform" strokeWidth={2.5} />
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
        "flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-2xl text-[9px] font-bold text-muted-foreground hover:text-foreground transition-colors",
      )}
      activeProps={{
        className:
          "flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-2xl text-[9px] font-bold text-primary bg-primary/5",
      }}
    >
      <Icon className="size-4.5" strokeWidth={2.5} />
      <span>{label}</span>
    </Link>
  );
}
