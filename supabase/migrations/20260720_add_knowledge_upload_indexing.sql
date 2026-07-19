alter table public.knowledge_documents
  add column if not exists storage_bucket text not null default 'knowledge-base',
  add column if not exists original_filename text,
  add column if not exists openai_file_id text,
  add column if not exists openai_vector_store_id text,
  add column if not exists openai_vector_store_file_id text,
  add column if not exists indexing_error text;

create unique index if not exists knowledge_documents_openai_file_idx
  on public.knowledge_documents (openai_file_id)
  where openai_file_id is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'knowledge-base',
  'knowledge-base',
  false,
  26214400,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
