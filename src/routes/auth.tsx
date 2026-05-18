import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppCard } from "@/components/ui/app-card";

const search = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => search.parse(s),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const sp = useSearch({ from: "/auth" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name, phone },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      nav({ to: sp.redirect ?? "/bookings" });
    } catch (e: any) {
      setErr(e?.message ?? "Lỗi không xác định");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <AppCard className="p-6">
        <h1 className="text-title mb-1">{mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}</h1>
        <p className="text-caption text-muted-foreground mb-5">
          {mode === "login" ? "Đăng nhập để đặt chỗ và xem vé." : "Tạo tài khoản miễn phí trong 30 giây."}
        </p>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <>
              <div>
                <Label htmlFor="name">Họ tên</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
              </div>
              <div>
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
              </div>
            </>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="pw">Mật khẩu</Label>
            <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Đăng ký"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-4 text-sm text-primary hover:underline"
        >
          {mode === "login" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
        </button>
        <div className="mt-4 text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">← Về trang chủ</Link>
        </div>
      </AppCard>
    </main>
  );
}
