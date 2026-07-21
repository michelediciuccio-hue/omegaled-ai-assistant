create extension if not exists pgcrypto;

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  category text not null default 'generale',
  source_type text not null check (source_type in ('manual','pdf','docx','txt','url','faq','datasheet','catalog')),
  audience text not null default 'public' check (audience in ('public','reseller','installer','internal')),
  status text not null default 'draft' check (status in ('draft','ready','active','archived','error')),
  description text,
  body_text text,
  source_url text,
  storage_bucket text,
  storage_path text,
  mime_type text,
  file_name text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  version integer not null default 1 check (version > 0),
  checksum text,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default false,
  indexed_at timestamptz,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  version integer not null check (version > 0),
  title text not null,
  description text,
  body_text text,
  source_url text,
  storage_bucket text,
  storage_path text,
  mime_type text,
  file_name text,
  file_size_bytes bigint,
  checksum text,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  unique(document_id, version)
);

create index if not exists knowledge_documents_lookup_idx on public.knowledge_documents (active, status, audience, category);
create index if not exists knowledge_documents_search_idx on public.knowledge_documents using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(body_text,'')));
create index if not exists knowledge_versions_document_idx on public.knowledge_document_versions (document_id, version desc);

alter table public.knowledge_documents enable row level security;
alter table public.knowledge_document_versions enable row level security;

create policy "public reads active public knowledge"
  on public.knowledge_documents for select to anon, authenticated
  using (active = true and status = 'active' and audience = 'public');

create policy "admins manage knowledge documents"
  on public.knowledge_documents for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admins manage knowledge versions"
  on public.knowledge_document_versions for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function public.set_knowledge_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists knowledge_documents_set_updated_at on public.knowledge_documents;
create trigger knowledge_documents_set_updated_at before update on public.knowledge_documents
for each row execute function public.set_knowledge_updated_at();
