-- ═══════════════════════════════════════════════════════════════════════════
-- RLS Policies cho SmartPark
-- Chạy trong Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Enable RLS on all tables ───────────────────────────────────────────────
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.no_show_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occupancy_snapshots ENABLE ROW LEVEL SECURITY;

-- ─── BOOKINGS ───────────────────────────────────────────────────────────────
-- User có thể xem booking của mình
CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = user_id);

-- User có thể tạo booking cho mình
CREATE POLICY "Users can create own bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User có thể update booking của mình (cancel, etc.)
CREATE POLICY "Users can update own bookings"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role (webhook) có thể update bất kỳ booking nào
-- (Handled by supabaseAdmin which bypasses RLS)

-- ─── PAYMENTS ───────────────────────────────────────────────────────────────
-- User có thể xem payments của booking mình
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = payments.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

-- Insert payments chỉ qua service role (webhook) — không cần policy INSERT cho user

-- ─── PROFILES ───────────────────────────────────────────────────────────────
-- User có thể xem profile của mình
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- User có thể tạo profile
CREATE POLICY "Users can create own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- User có thể update profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ─── SLOT_HOLDS ─────────────────────────────────────────────────────────────
-- User có thể xem slot holds liên quan tới booking của mình
CREATE POLICY "Users can view own slot holds"
  ON public.slot_holds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = slot_holds.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

-- User có thể tạo slot hold (khi đặt booking)
CREATE POLICY "Users can create slot holds"
  ON public.slot_holds FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = slot_holds.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

-- User có thể xoá slot hold của mình (khi huỷ)
CREATE POLICY "Users can delete own slot holds"
  ON public.slot_holds FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = slot_holds.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

-- ─── NO_SHOW_EVENTS ────────────────────────────────────────────────────────
-- User có thể xem no-show events của mình
CREATE POLICY "Users can view own no show events"
  ON public.no_show_events FOR SELECT
  USING (auth.uid() = user_id);

-- ─── OCCUPANCY_SNAPSHOTS ────────────────────────────────────────────────────
-- Ai cũng đọc được (public data)
CREATE POLICY "Anyone can view occupancy snapshots"
  ON public.occupancy_snapshots FOR SELECT
  USING (true);

-- Insert chỉ qua service role (server cron) — không cần policy cho user
