create extension if not exists pgcrypto;

create table if not exists public.catalog_products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  family text not null,
  category text not null,
  series text,
  environment text check (environment in ('indoor','outdoor','vetrina','ibrido')),
  technology text,
  pixel_pitch_mm numeric,
  brightness_nits integer,
  refresh_rate_hz integer,
  ip_rating text,
  width_mm integer,
  height_mm integer,
  depth_mm integer,
  weight_kg numeric,
  average_power_w numeric,
  max_power_w numeric,
  resolution_width integer,
  resolution_height integer,
  maintenance_access text,
  controller_compatibility text[],
  player_compatibility text[],
  required_accessories text[],
  optional_accessories text[],
  warranty_months integer,
  availability_status text not null default 'unknown' check (availability_status in ('in_stock','on_order','limited','unavailable','unknown')),
  lead_time_note text,
  short_description text,
  technical_notes text,
  datasheet_url text,
  image_urls text[],
  video_urls text[],
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.catalog_products(id) on delete cascade,
  audience text not null check (audience in ('public','reseller','installer','internal')),
  price_type text not null check (price_type in ('unit','square_meter','configuration','starting_from','monthly_rental')),
  currency text not null default 'EUR',
  amount numeric(12,2) not null check (amount >= 0),
  vat_included boolean not null default false,
  min_quantity numeric,
  max_quantity numeric,
  valid_from date not null default current_date,
  valid_until date,
  includes text[] not null default '{}',
  excludes text[] not null default '{}',
  note text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_prices_validity check (valid_until is null or valid_until >= valid_from)
);

create table if not exists public.catalog_configuration_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  product_family text not null,
  priority integer not null default 100,
  conditions jsonb not null default '{}'::jsonb,
  actions jsonb not null default '{}'::jsonb,
  explanation text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists catalog_products_lookup_idx on public.catalog_products (active, family, category);
create index if not exists catalog_products_name_idx on public.catalog_products using gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(sku,'') || ' ' || coalesce(short_description,'')));
create index if not exists catalog_prices_lookup_idx on public.catalog_prices (product_id, audience, active, valid_from, valid_until);
create index if not exists catalog_rules_family_priority_idx on public.catalog_configuration_rules (product_family, active, priority);

alter table public.catalog_products enable row level security;
alter table public.catalog_prices enable row level security;
alter table public.catalog_configuration_rules enable row level security;

create policy "public can read active product catalog"
  on public.catalog_products for select to anon, authenticated
  using (active = true);

create policy "public can read public active prices"
  on public.catalog_prices for select to anon, authenticated
  using (active = true and audience = 'public' and valid_from <= current_date and (valid_until is null or valid_until >= current_date));

create policy "admins manage products"
  on public.catalog_products for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admins manage prices"
  on public.catalog_prices for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admins manage configuration rules"
  on public.catalog_configuration_rules for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists catalog_products_set_updated_at on public.catalog_products;
create trigger catalog_products_set_updated_at before update on public.catalog_products
for each row execute function public.set_updated_at();

drop trigger if exists catalog_prices_set_updated_at on public.catalog_prices;
create trigger catalog_prices_set_updated_at before update on public.catalog_prices
for each row execute function public.set_updated_at();

drop trigger if exists catalog_rules_set_updated_at on public.catalog_configuration_rules;
create trigger catalog_rules_set_updated_at before update on public.catalog_configuration_rules
for each row execute function public.set_updated_at();