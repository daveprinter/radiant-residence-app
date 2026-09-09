-- helper
CREATE OR REPLACE FUNCTION public.is_team(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (select 1 from public.user_roles where user_id = _uid and role in ('admin','staff','rider'))
$$;

-- SERVICES
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Clothes',
  emoji text NOT NULL DEFAULT '🧺',
  subtitle text NOT NULL DEFAULT '',
  base_price integer NOT NULL DEFAULT 0,
  old_price integer,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services public read" ON public.services FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "services admin write" ON public.services FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "services admin update" ON public.services FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "services admin delete" ON public.services FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- COUPONS
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'fixed',
  amount integer NOT NULL DEFAULT 0,
  min_order integer NOT NULL DEFAULT 0,
  max_discount integer,
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons read" ON public.coupons FOR SELECT TO authenticated USING (true);
CREATE POLICY "coupons admin insert" ON public.coupons FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "coupons update" ON public.coupons FOR UPDATE TO authenticated USING (true);
CREATE POLICY "coupons admin delete" ON public.coupons FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_code text NOT NULL,
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id),
  discount integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "redemptions read" ON public.coupon_redemptions FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "redemptions insert" ON public.coupon_redemptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- PAYMENTS
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id),
  method text NOT NULL DEFAULT 'mpesa',
  amount integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  reference text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments read" ON public.payments FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "payments insert" ON public.payments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "payments update" ON public.payments FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));

-- WALLET
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT 'topup',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet read" ON public.wallet_transactions FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "wallet insert" ON public.wallet_transactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(),'admin'));

-- LOYALTY
CREATE TABLE public.loyalty_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  points integer NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT 'order',
  order_id uuid REFERENCES public.orders(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.loyalty_ledger TO authenticated;
GRANT ALL ON public.loyalty_ledger TO service_role;
ALTER TABLE public.loyalty_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loyalty read" ON public.loyalty_ledger FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "loyalty insert" ON public.loyalty_ledger FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(),'admin'));

-- REVIEWS
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  user_id uuid NOT NULL,
  quality integer NOT NULL DEFAULT 5,
  delivery integer NOT NULL DEFAULT 5,
  service integer NOT NULL DEFAULT 5,
  overall integer NOT NULL DEFAULT 5,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);
GRANT SELECT, INSERT, UPDATE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews read" ON public.reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "reviews insert" ON public.reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "reviews update" ON public.reviews FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "notifications insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "notifications update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'));

-- WITHDRAWALS
CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  method text NOT NULL DEFAULT 'mpesa',
  destination text NOT NULL DEFAULT '',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "withdrawals read" ON public.withdrawals FOR SELECT TO authenticated USING (partner_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "withdrawals insert" ON public.withdrawals FOR INSERT TO authenticated WITH CHECK (partner_id = auth.uid());
CREATE POLICY "withdrawals admin update" ON public.withdrawals FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));

-- MARKETING MATERIALS
CREATE TABLE public.marketing_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'poster',
  url text NOT NULL DEFAULT '',
  body text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_materials TO authenticated;
GRANT ALL ON public.marketing_materials TO service_role;
ALTER TABLE public.marketing_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materials read" ON public.marketing_materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "materials admin insert" ON public.marketing_materials FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "materials admin update" ON public.marketing_materials FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "materials admin delete" ON public.marketing_materials FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- SETTINGS
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings read" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "settings admin insert" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "settings admin update" ON public.app_settings FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));

-- AUDIT LOG
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_name text NOT NULL DEFAULT '',
  action text NOT NULL,
  detail text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit admin read" ON public.audit_logs FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "audit insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

-- ORDER EXTRAS
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS subtotal integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS delivery_mode text NOT NULL DEFAULT 'pickup_delivery',
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'unassigned',
  ADD COLUMN IF NOT EXISTS rider_id uuid,
  ADD COLUMN IF NOT EXISTS staff_id uuid,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';

-- team access to orders and items
CREATE POLICY "orders team read" ON public.orders FOR SELECT TO authenticated USING (public.is_team(auth.uid()));
CREATE POLICY "orders team update" ON public.orders FOR UPDATE TO authenticated USING (public.is_team(auth.uid()));
CREATE POLICY "order items team read" ON public.order_items FOR SELECT TO authenticated USING (public.is_team(auth.uid()));
CREATE POLICY "order items team update" ON public.order_items FOR UPDATE TO authenticated USING (public.is_team(auth.uid()));
CREATE POLICY "profiles team read" ON public.profiles FOR SELECT TO authenticated USING (public.is_team(auth.uid()));

-- seed catalogue + settings + starter coupons
INSERT INTO public.services (key,name,category,emoji,subtitle,base_price,old_price,options,sort_order) VALUES
 ('clothes','Clothes','Clothes','👕','1 laundry basket · wash & fold',350,NULL,'[]',1),
 ('carpet','Carpet','Carpets','🧶','Deep clean per piece',150,200,'[]',2),
 ('duvet','Duvet','Bedding','🛏️','Deep clean',500,NULL,'[{"label":"Single","price":500},{"label":"Double","price":700},{"label":"King","price":900}]',3),
 ('sofa','Sofa set','Other','🛋️','Choose seater',450,NULL,'[{"label":"1-seater","price":450},{"label":"2-seater","price":800},{"label":"3-seater","price":1200}]',4),
 ('shoes','Shoes','Shoes','👟','Per pair',300,NULL,'[]',5),
 ('curtains','Curtains','Curtains','🪟','Per panel',250,NULL,'[]',6),
 ('blankets','Blankets','Bedding','🧻','Per blanket',450,NULL,'[]',7),
 ('suits','Suits','Suits','🤵','Dry clean per suit',600,NULL,'[]',8),
 ('towels','Towels','Towels','🧖','Per 5 towels',200,NULL,'[]',9)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.app_settings (key,value) VALUES
 ('business','{"name":"BrightRide Laundry","phone":"+254 701 987338","email":"hello@brightride.co.ke","currency":"KSh","tax_percent":0,"address":"Nairobi, Kenya"}'),
 ('delivery','{"fee":150,"free_above":3000}'),
 ('loyalty','{"points_per_100":1,"ksh_per_point":0.5}'),
 ('commission','{"percent":10,"min_withdrawal":1000}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.coupons (code,description,kind,amount,min_order,expires_at) VALUES
 ('WELCOME100','KSh 100 off your next laundry order','fixed',100,500,now() + interval '90 days'),
 ('NEWCUSTOMER','KSh 200 off orders above KSh 1,000','fixed',200,1000,now() + interval '90 days'),
 ('CLEAN10','10% off any order','percent',10,0,now() + interval '90 days')
ON CONFLICT (code) DO NOTHING;