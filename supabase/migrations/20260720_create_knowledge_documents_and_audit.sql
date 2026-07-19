create extension if not exists pgcrypto;

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  category text not null,
  audience text not null default 'public' check (audience in ('public','reseller','installer','internal')),
  source_type text not null check (source_type in ('manual','pdf','docx','csv','url','faq','procedure','datasheet','case_study')),
  status text not null default 'draft' check (status in ('draft','published','archived','processing','error')),
  language text not null default 'it',
  summary text,
  content text,
  source_url text,
  storage_path text,
  mime_type text,
  file_size_bytes bigint,
  version_label text,
  manufacturer text,
  product_skus text[] not null default '{}',
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  checksum text,
  indexed_at timestamptz,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists knowledge_documents_status_idx
  on public.knowledge_documents (status, category, audience, updated_at desc);
create index if not exists knowledge_documents_search_idx
  on public.knowledge_documents using gin (
    to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(content,''))
  );
create index if not exists knowledge_documents_tags_idx
  on public.knowledge_documents using gin (tags);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  resource_type text not null,
  resource_id text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_resource_idx
  on public.admin_audit_log (resource_type, resource_id, created_at desc);
create index if not exists admin_audit_log_actor_idx
  on public.admin_audit_log (actor_email, created_at desc);

alter table public.knowledge_documents enable row level security;
alter table public.admin_audit_log enable row level security;

create policy "authenticated users can read knowledge documents"
  on public.knowledge_documents for select to authenticated using (true);

create policy "admins can manage knowledge documents"
  on public.knowledge_documents for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admins can read audit log"
  on public.admin_audit_log for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admins can insert audit log"
  on public.admin_audit_log for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');