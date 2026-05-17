
-- 1. occupancy_snapshots
CREATE TABLE IF NOT EXISTS public.occupancy_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_device_id text NOT NULL,
  lot_name text,
  total integer NOT NULL,
  occupied integer NOT NULL,
  occupancy_rate numeric(5,4) NOT NULL,
  bucket_ts timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_occupancy_snapshots_lot_ts
  ON public.occupancy_snapshots (lot_device_id, bucket_ts DESC);

CREATE INDEX IF NOT EXISTS idx_occupancy_snapshots_ts
  ON public.occupancy_snapshots (bucket_ts DESC);

ALTER TABLE public.occupancy_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "occupancy_snapshots_select_public"
  ON public.occupancy_snapshots FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. no_show_events
CREATE TYPE public.no_show_kind AS ENUM ('no_pay', 'no_checkin');

CREATE TABLE IF NOT EXISTS public.no_show_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  booking_id uuid NOT NULL,
  lot_device_id text,
  kind public.no_show_kind NOT NULL,
  happened_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_no_show_events_user_ts
  ON public.no_show_events (user_id, happened_at DESC);

ALTER TABLE public.no_show_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no_show_events_select_own"
  ON public.no_show_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Update expire_pending_bookings to log no-pay events
CREATE OR REPLACE FUNCTION public.expire_pending_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  expired_row record;
BEGIN
  FOR expired_row IN
    SELECT id, user_id, lot_device_id
    FROM public.bookings
    WHERE status = 'pending' AND hold_expires_at < now()
  LOOP
    UPDATE public.bookings SET status = 'expired' WHERE id = expired_row.id;
    INSERT INTO public.no_show_events (user_id, booking_id, lot_device_id, kind)
    VALUES (expired_row.user_id, expired_row.id, expired_row.lot_device_id, 'no_pay');
  END LOOP;
  DELETE FROM public.slot_holds WHERE expires_at < now();
END;
$function$;
