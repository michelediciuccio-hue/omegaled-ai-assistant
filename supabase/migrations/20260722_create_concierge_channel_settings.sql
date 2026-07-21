create table if not exists public.concierge_channel_settings (
  id uuid primary key default gen_random_uuid(),
  channel text not null unique check (channel in ('website', 'whatsapp')),
  display_name text not null,
  headline text not null,
  subheadline text not null,
  welcome_message text not null,
  input_placeholder text not null,
  submit_label text not null,
  handoff_message text not null,
  quick_actions jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text
);

insert into public.concierge_channel_settings (
  channel,
  display_name,
  headline,
  subheadline,
  welcome_message,
  input_placeholder,
  submit_label,
  handoff_message,
  quick_actions
)
values
  (
    'website',
    'Concierge sito OmegaLed',
    'Concierge d’ingresso OmegaLed',
    'Chiedi e ti indico il percorso migliore. Se hai bisogno di informazioni su un prodotto, chiedi pure.',
    'Benvenuto. Posso aiutarti a trovare informazioni sui prodotti OmegaLed oppure indirizzarti verso il personale più adatto.',
    'Scrivi la tua richiesta…',
    'Invia',
    'Ho raccolto la tua richiesta e la indirizzo al personale OmegaLed più adatto.',
    '["Informazioni su un prodotto", "Assistenza tecnica", "Richiesta commerciale", "Trova il rivenditore più vicino"]'::jsonb
  ),
  (
    'whatsapp',
    'Concierge WhatsApp OmegaLed',
    'Concierge OmegaLed',
    'Dimmi di cosa hai bisogno e ti indirizzo al referente più adatto.',
    'Benvenuto in OmegaLed. Posso darti informazioni sui prodotti e aiutarti a raggiungere il reparto corretto.',
    'Scrivi il tuo messaggio…',
    'Invia',
    'Grazie. Ho raccolto i dati essenziali e preparo il passaggio al referente OmegaLed più adatto.',
    '["Prodotti", "Assistenza", "Preventivi", "Rivenditori"]'::jsonb
  )
on conflict (channel) do nothing;

alter table public.concierge_channel_settings enable row level security;

create policy "service role manages concierge settings"
on public.concierge_channel_settings
for all
to service_role
using (true)
with check (true);
