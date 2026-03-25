-- Schema inicial da plataforma (Supabase)
create extension if not exists "pgcrypto";

create table if not exists public.users_profiles (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null unique,
  senha text not null,
  tipo text not null default 'promotor',
  permissao text not null default 'usuario',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.indicators (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  chave_pix text not null,
  code text not null unique,
  url text not null,
  ativo boolean not null default true,
  total_indicacoes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  indicator_id uuid references public.indicators(id) on delete set null,
  codigo_indicacao text,
  origem text,
  status text not null default 'Nova Indicação',
  data_hora text,
  data_criacao_iso timestamptz,
  log_status jsonb not null default '[]'::jsonb,
  ultima_mudanca_status text,
  data_ultima_mudanca timestamptz,
  nova_indicacao_em timestamptz,
  em_contato_em timestamptz,
  em_negociacao_em timestamptz,
  fechado_em timestamptz,
  perdido_em timestamptz,
  responsavel_nome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_referrals_indicator_id on public.referrals(indicator_id);
create index if not exists idx_referrals_codigo_indicacao on public.referrals(codigo_indicacao);
create index if not exists idx_referrals_status on public.referrals(status);
create index if not exists idx_referrals_created_at on public.referrals(created_at desc);

create table if not exists public.ghl_contacts (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null unique references public.referrals(id) on delete cascade,
  ghl_contact_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ghl_events (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid references public.referrals(id) on delete set null,
  event_type text not null,
  status text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ghl_events_referral_id on public.ghl_events(referral_id);
create index if not exists idx_ghl_events_event_type on public.ghl_events(event_type);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  event_type text not null,
  payload jsonb not null,
  headers jsonb,
  idempotency_key text unique,
  status text not null default 'received',
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.conversions (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  indicator_id uuid references public.indicators(id) on delete set null,
  atendente_nome text,
  webhook_event_id uuid references public.webhook_events(id) on delete set null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_conversions_referral_id on public.conversions(referral_id);
create index if not exists idx_conversions_indicator_id on public.conversions(indicator_id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  entity_type text,
  entity_id text,
  status text not null default 'success',
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_event_type on public.audit_logs(event_type);
create index if not exists idx_audit_logs_entity_type on public.audit_logs(entity_type);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_profiles_updated_at on public.users_profiles;
create trigger trg_users_profiles_updated_at
before update on public.users_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_indicators_updated_at on public.indicators;
create trigger trg_indicators_updated_at
before update on public.indicators
for each row execute function public.set_updated_at();

drop trigger if exists trg_referrals_updated_at on public.referrals;
create trigger trg_referrals_updated_at
before update on public.referrals
for each row execute function public.set_updated_at();

alter table public.users_profiles enable row level security;
alter table public.indicators enable row level security;
alter table public.referrals enable row level security;
alter table public.ghl_contacts enable row level security;
alter table public.ghl_events enable row level security;
alter table public.webhook_events enable row level security;
alter table public.conversions enable row level security;
alter table public.audit_logs enable row level security;

-- Políticas simples para ambiente inicial
drop policy if exists users_profiles_read on public.users_profiles;
create policy users_profiles_read on public.users_profiles
for select using (true);

drop policy if exists indicators_read on public.indicators;
create policy indicators_read on public.indicators
for select using (true);

drop policy if exists referrals_read on public.referrals;
create policy referrals_read on public.referrals
for select using (true);

drop policy if exists conversions_read on public.conversions;
create policy conversions_read on public.conversions
for select using (true);

drop policy if exists ghl_events_read on public.ghl_events;
create policy ghl_events_read on public.ghl_events
for select using (true);

drop policy if exists webhook_events_read on public.webhook_events;
create policy webhook_events_read on public.webhook_events
for select using (true);

drop policy if exists audit_logs_read on public.audit_logs;
create policy audit_logs_read on public.audit_logs
for select using (true);
