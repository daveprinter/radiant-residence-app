-- ROLES ---------------------------------------------------------------
create type public.app_role as enum ('customer','partner','admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select, insert on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "insert own role" on public.user_roles for insert to authenticated
  with check (user_id = auth.uid() and role <> 'admin');

-- PROFILES ------------------------------------------------------------
create table public.profiles (
  id uuid primary key,
  first_name text not null default '',
  last_name text not null default '',
  email text not null default '',
  phone text not null default '',
  address text,
  latitude double precision,
  longitude double precision,
  referral_code text unique,
  referred_by text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "read own profile" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "insert own profile" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- ORDERS --------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  code text not null,
  status text not null default 'pending',
  total integer not null default 0,
  eta timestamptz,
  pickup_address text,
  note text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;

create policy "own orders read" on public.orders for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own orders insert" on public.orders for insert to authenticated
  with check (user_id = auth.uid());
create policy "orders update" on public.orders for update to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  label text not null,
  variant text,
  emoji text not null default '🧺',
  quantity integer not null default 1,
  unit_price integer not null default 0,
  stage text not null default 'queued',
  progress integer not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;

create policy "order items read" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(),'admin'))));
create policy "order items insert" on public.order_items for insert to authenticated
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "order items update" on public.order_items for update to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(),'admin'))));

-- COMPLAINTS ----------------------------------------------------------
create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  order_code text,
  category text not null default 'Other',
  body text not null,
  status text not null default 'submitted',
  response text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.complaints to authenticated;
grant all on public.complaints to service_role;
alter table public.complaints enable row level security;

create policy "complaints read" on public.complaints for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "complaints insert" on public.complaints for insert to authenticated
  with check (user_id = auth.uid());
create policy "complaints update" on public.complaints for update to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- MESSAGES ------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  sender_id uuid not null,
  from_staff boolean not null default false,
  body text,
  image_url text,
  created_at timestamptz not null default now()
);
grant select, insert on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;

create policy "messages read" on public.messages for select to authenticated
  using (customer_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "messages insert" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and (customer_id = auth.uid() or public.has_role(auth.uid(),'admin')));

alter publication supabase_realtime add table public.messages;

-- REFERRALS -----------------------------------------------------------
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null,
  customer_id uuid not null,
  customer_name text not null default '',
  revenue integer not null default 0,
  commission integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.referrals to authenticated;
grant all on public.referrals to service_role;
alter table public.referrals enable row level security;

create policy "referrals read" on public.referrals for select to authenticated
  using (partner_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "referrals insert" on public.referrals for insert to authenticated
  with check (partner_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.email_registered(_email text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where lower(email) = lower(_email))
$$;
grant execute on function public.email_registered(text) to anon, authenticated;