-- ============================================================
-- SOLID – سوليد  |  Supabase project: solid_ss
-- ⚠️ RUN THIS IN THE SUPABASE DASHBOARD SQL EDITOR
--    https://aogtvkfhehaztdurvunf.supabase.co/editor
-- ============================================================

-- ----------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------
-- 2. MENU ITEMS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu_items (
  id            BIGSERIAL PRIMARY KEY,
  item_code     TEXT NOT NULL,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL,
  description   TEXT DEFAULT '',
  price         NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  available     BOOLEAN NOT NULL DEFAULT TRUE,
  featured      BOOLEAN NOT NULL DEFAULT FALSE,
  image_url     TEXT DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_item_code_key UNIQUE (item_code);

CREATE INDEX IF NOT EXISTS idx_menu_items_category
  ON public.menu_items (category);
CREATE INDEX IF NOT EXISTS idx_menu_items_featured
  ON public.menu_items (featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_menu_items_available
  ON public.menu_items (available);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------
-- 3. PROFILES
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email     TEXT NOT NULL,
  role      TEXT NOT NULL DEFAULT 'Customer'
              CHECK (role IN ('Customer','Supervisor','Admin')),
  active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role_active
  ON public.profiles (role, active);
CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON public.profiles (email);

-- ----------------------------------------------------------------
-- 4. ORDERS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id              BIGSERIAL PRIMARY KEY,
  order_number    TEXT NOT NULL,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  customer_name   TEXT NOT NULL,
  phone           TEXT NOT NULL,
  address         TEXT NOT NULL,
  notes           TEXT DEFAULT '',
  payment_method  TEXT NOT NULL DEFAULT 'cash',
  total           NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  status          TEXT NOT NULL DEFAULT 'new'
                CHECK (status IN (
                  'new','received','preparing','out_for_delivery','delivered','cancelled'
                )),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders
  ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);

CREATE INDEX IF NOT EXISTS idx_orders_user_id
  ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status
  ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number
  ON public.orders (order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status_created
  ON public.orders (status, created_at DESC);

CREATE OR REPLACE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------
-- 5. ORDER ITEMS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
  id           BIGSERIAL PRIMARY KEY,
  order_id     BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id BIGINT REFERENCES public.menu_items(id) ON DELETE SET NULL,
  item_code    TEXT NOT NULL,
  item_name    TEXT NOT NULL,
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  unit_price   NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  line_total   NUMERIC(10,2) NOT NULL CHECK (line_total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON public.order_items (order_id);

-- ----------------------------------------------------------------
-- 6. NOTIFICATIONS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id                BIGSERIAL PRIMARY KEY,
  recipient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  message           TEXT NOT NULL,
  order_id          BIGINT REFERENCES public.orders(id) ON DELETE SET NULL,
  is_read           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON public.notifications (recipient_user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON public.notifications (recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_order_id
  ON public.notifications (order_id);

-- ----------------------------------------------------------------
-- 7. APP SETTINGS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.app_settings (key, value)
VALUES
  ('payment_methods',        'cash,installments,vodafone,orange'),
  ('currency',               'EGP'),
  ('currency_symbol',        'جنيه'),
  ('restaurant_name',        'SOLID – سوليد'),
  ('delivery_fee',           '0')
ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------------------------------
-- 8. ORDER NUMBER SEQUENCE TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public._order_seq (
  day     DATE PRIMARY KEY,
  counter INT NOT NULL DEFAULT 0
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.menu_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings   ENABLE ROW LEVEL SECURITY;

-- menu_items: everyone reads, admin+supervisor writes
CREATE POLICY "menu_items_read_any" ON public.menu_items
  FOR SELECT USING (true);

CREATE POLICY "menu_items_write_admin_super" ON public.menu_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('Admin','Supervisor')
        AND profiles.active = TRUE
    )
  );

-- profiles: own read, admin+supervisor read all, own update (safe)
CREATE POLICY "profiles_read_own" ON public.profiles
  FOR SELECT USING ( profiles.id = auth.uid() );

CREATE POLICY "profiles_read_all_admin_super" ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('Admin','Supervisor')
        AND profiles.active = TRUE
    )
  );

CREATE POLICY "profiles_update_own_safe" ON public.profiles
  FOR UPDATE
  USING ( profiles.id = auth.uid() )
  WITH CHECK ( profiles.id = auth.uid() );

-- orders: own read, admin+supervisor read all, status update by admin+supervisor
CREATE POLICY "orders_read_own" ON public.orders
  FOR SELECT USING ( orders.user_id = auth.uid() );

CREATE POLICY "orders_read_all_admin_super" ON public.orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('Admin','Supervisor')
        AND profiles.active = TRUE
    )
  );

CREATE POLICY "orders_update_status_admin_super" ON public.orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('Admin','Supervisor')
        AND profiles.active = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('Admin','Supervisor')
        AND profiles.active = TRUE
    )
  );

-- order_items: readable via parent order access
CREATE POLICY "order_items_read_via_order" ON public.order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND (
          orders.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('Admin','Supervisor')
              AND p.active = TRUE
          )
        )
    )
  );

-- notifications: own read/update, admin+supervisor read all
CREATE POLICY "notifications_read_own" ON public.notifications
  FOR SELECT USING ( notifications.recipient_user_id = auth.uid() );

CREATE POLICY "notifications_read_all_admin_super" ON public.notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('Admin','Supervisor')
        AND profiles.active = TRUE
    )
  );

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE
  USING ( notifications.recipient_user_id = auth.uid() )
  WITH CHECK ( notifications.recipient_user_id = auth.uid() );

-- app_settings: everyone reads, admin+supervisor writes
CREATE POLICY "app_settings_read_any" ON public.app_settings
  FOR SELECT USING (true);

CREATE POLICY "app_settings_write_admin_super" ON public.app_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('Admin','Supervisor')
        AND profiles.active = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('Admin','Supervisor')
        AND profiles.active = TRUE
    )
  );

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- f_set_profile_role: Admin-only role changes (Customer ↔ Supervisor)
CREATE OR REPLACE FUNCTION public.f_set_profile_role(
  target_user_id UUID,
  new_role       TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  caller_active BOOLEAN;
BEGIN
  SELECT role, active INTO caller_role, caller_active
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Caller profile not found';
  END IF;

  IF caller_role <> 'Admin' OR NOT caller_active THEN
    RAISE EXCEPTION 'Only an active Admin can change roles';
  END IF;

  IF new_role NOT IN ('Customer','Supervisor') THEN
    RAISE EXCEPTION 'Cannot set role to Admin from the app. Use direct DB for Admin.';
  END IF;

  UPDATE public.profiles
  SET role = new_role,
      updated_at = now()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;
END;
$$;

-- f_toggle_profile_active: Admin-only active toggle
CREATE OR REPLACE FUNCTION public.f_toggle_profile_active(
  target_user_id UUID,
  new_active     BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  caller_active BOOLEAN;
BEGIN
  SELECT role, active INTO caller_role, caller_active
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Caller profile not found';
  END IF;

  IF caller_role <> 'Admin' OR NOT caller_active THEN
    RAISE EXCEPTION 'Only an active Admin can toggle account active state';
  END IF;

  UPDATE public.profiles
  SET active = new_active,
      updated_at = now()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;
END;
$$;

-- f_create_order: Atomic order creation (Customer only, validates prices from DB)
CREATE OR REPLACE FUNCTION public.f_create_order(
  _customer_name  TEXT,
  _phone          TEXT,
  _address        TEXT,
  _notes          TEXT DEFAULT '',
  _payment_method TEXT DEFAULT 'cash',
  _items          JSONB DEFAULT '[]'
)
RETURNS TABLE (
  order_id     BIGINT,
  order_number TEXT,
  total        NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     UUID;
  v_user_role   TEXT;
  v_user_active BOOLEAN;
  v_total       NUMERIC := 0;
  v_order_id    BIGINT;
  v_order_number TEXT;
  v_now         TIMESTAMPTZ := now();
  v_item        RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: not logged in';
  END IF;

  v_user_id := auth.uid();

  SELECT role, active INTO v_user_role, v_user_active
  FROM public.profiles
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found. Please complete signup.';
  END IF;

  IF v_user_role <> 'Customer' THEN
    RAISE EXCEPTION 'Only customers can place orders';
  END IF;

  IF NOT v_user_active THEN
    RAISE EXCEPTION 'Your account is currently inactive';
  END IF;

  IF COALESCE(NULLIF(TRIM(_customer_name), ''), '') = '' THEN
    RAISE EXCEPTION 'customer_name is required';
  END IF;
  IF COALESCE(NULLIF(TRIM(_phone), ''), '') = '' THEN
    RAISE EXCEPTION 'phone is required';
  END IF;
  IF COALESCE(NULLIF(TRIM(_address), ''), '') = '' THEN
    RAISE EXCEPTION 'address is required';
  END IF;

  IF COALESCE(NULLIF(TRIM(_payment_method), ''), '') = '' THEN
    _payment_method := 'cash';
  END IF;

  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Cannot place an empty order';
  END IF;

  DROP TABLE IF EXISTS _order_snapshot;
  CREATE TEMP TABLE _order_snapshot (
    menu_item_id BIGINT,
    item_code    TEXT,
    item_name    TEXT,
    quantity     INT,
    unit_price   NUMERIC,
    line_total   NUMERIC
  );

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(_items) AS x(
      menu_item_id BIGINT,
      quantity     INT
    )
  LOOP
    IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity for a menu item';
    END IF;

    SELECT id, item_code, name, price, available
    INTO STRICT v_item.menu_item_id, v_item.item_code, v_item.item_name,
                v_item.unit_price, v_item.available
    FROM public.menu_items
    WHERE id = v_item.menu_item_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Menu item % not found', v_item.menu_item_id;
    END IF;

    IF NOT v_item.available THEN
      RAISE EXCEPTION 'Menu item "%" is currently unavailable', v_item.item_name;
    END IF;

    INSERT INTO _order_snapshot
      (menu_item_id, item_code, item_name, quantity, unit_price, line_total)
    VALUES
      (v_item.menu_item_id, v_item.item_code, v_item.item_name,
       v_item.quantity, v_item.unit_price,
       v_item.unit_price * v_item.quantity);

    v_total := v_total + (v_item.unit_price * v_item.quantity);
  END LOOP;

  LOCK TABLE public._order_seq IN EXCLUSIVE MODE;

  INSERT INTO public._order_seq (day, counter)
  VALUES (v_now::date, 1)
  ON CONFLICT (day) DO UPDATE
    SET counter = public._order_seq.counter + 1
  RETURNING counter INTO v_order_number;

  v_order_number :=
    'SOLID-' || to_char(v_now, 'YYMMDD') || '-' ||
    lpad(v_order_number::text, 4, '0');

  INSERT INTO public.orders
    (order_number, user_id, customer_name, phone, address,
     notes, payment_method, total, status, created_at, updated_at)
  VALUES
    (v_order_number, v_user_id, _customer_name, _phone, _address,
     _notes, _payment_method, v_total, 'new', v_now, v_now)
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items
    (order_id, menu_item_id, item_code, item_name,
     quantity, unit_price, line_total)
  SELECT
    v_order_id,
    menu_item_id, item_code, item_name,
    quantity, unit_price, line_total
  FROM _order_snapshot;

  INSERT INTO public.notifications
    (recipient_user_id, title, message, order_id, is_read, created_at)
  SELECT
    p.id,
    'طلب جديد',
    format('طلب جديد #%s — %s — المجموع: %s',
            v_order_number,
            _customer_name,
            v_total::TEXT),
    v_order_id,
    FALSE,
    v_now
  FROM public.profiles p
  WHERE p.role IN ('Admin','Supervisor')
    AND p.active = TRUE
    AND p.id <> v_user_id;

  RETURN QUERY
    SELECT v_order_id, v_order_number, v_total;
END;
$$;

-- f_update_order_status: Admin/Supervisor status update
CREATE OR REPLACE FUNCTION public.f_update_order_status(
  _order_id   BIGINT,
  _new_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role   TEXT;
  v_active BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT role, active INTO v_role, v_active
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT FOUND OR v_role NOT IN ('Admin','Supervisor') OR NOT v_active THEN
    RAISE EXCEPTION 'Only an active Admin or Supervisor can update order status';
  END IF;

  IF _new_status NOT IN (
    'new','received','preparing','out_for_delivery','delivered','cancelled'
  ) THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE public.orders
  SET status = _new_status,
      updated_at = now()
  WHERE id = _order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
END;
$$;

-- ============================================================
-- CREATE FIRST ADMIN (run this AFTER creating your admin account)
-- ============================================================
-- Step 1: Create a normal user account via the app signup
-- Step 2: Run this SQL in the dashboard to make them Admin:
--
--   UPDATE public.profiles
--   SET role = 'Admin', active = true, updated_at = now()
--   WHERE email = 'your-admin-email@example.com';
--
-- IMPORTANT: Never allow Admin promotion from the frontend.
