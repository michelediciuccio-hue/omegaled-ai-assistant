create extension if not exists pgcrypto;

create table if not exists public.ai_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  version integer not null unique,
  status text not null check (status in ('draft', 'published', 'archived')),
  blocks jsonb not null,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  constraint ai_prompt_versions_blocks_array check (jsonb_typeof(blocks) = 'array')
);

create index if not exists ai_prompt_versions_status_version_idx
  on public.ai_prompt_versions (status, version desc);

alter table public.ai_prompt_versions enable row level security;

create policy "authenticated users can read prompt versions"
  on public.ai_prompt_versions
  for select
  to authenticated
  using (true);

create policy "admins can insert prompt versions"
  on public.ai_prompt_versions
  for insert
  to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admins can update prompt versions"
  on public.ai_prompt_versions
  for update
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function public.publish_ai_prompt_version(target_id uuid)
returns public.ai_prompt_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  published_record public.ai_prompt_versions;
begin
  if (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'Not authorized';
  end if;

  update public.ai_prompt_versions
    set status = 'archived'
    where status = 'published';

  update public.ai_prompt_versions
    set status = 'published', published_at = now()
    where id = target_id
    returning * into published_record;

  if published_record.id is null then
    raise exception 'Prompt version not found';
  end if;

  return published_record;
end;
$$;

revoke all on function public.publish_ai_prompt_version(uuid) from public;
grant execute on function public.publish_ai_prompt_version(uuid) to authenticated;
