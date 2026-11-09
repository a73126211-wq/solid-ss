-- ============================================================
-- SOLID - سوليد  |  Supabase project: solid_ss (ref: aogtvkfhehaztdurvunf)
-- Initial schema + RLS + indexes + seed first admin via RPC
-- Run once:  psql -h aogtvkfhehaztdurvunf.supabase.co -U postgres -d postgres -f 0001_initial_schema.sql
--   (password = DB_PASSWORD from .env.local)
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
-- 3. PROFILES  (one row per auth.users)
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
-- 5. ORDER ITEMS  (snapshot of menu item at order time)
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
-- 6. NOTIFICATIONS  (admin + supervisors only)
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
-- 7. APP SETTINGS  (key/value, admin-editable)
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
--   format: SOLID-YYMMDD-XXXX  (XXXX serial per day)
--   We implement this in the RPC create_order so it is atomic.
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

CREATE POLICY "men