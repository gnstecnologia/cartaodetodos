-- Cadastro dinâmico de promotores (criado automaticamente via leads/webhook)
create table if not exists public.promoters (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nome_norm text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Nome normalizado é único para evitar duplicação por caixa/espaços
create unique index if not exists idx_promoters_nome_norm_unique on public.promoters(nome_norm);
create index if not exists idx_promoters_created_at on public.promoters(created_at desc);

-- Relaciona referral ao promotor cadastrado
alter table public.referrals
  add column if not exists promotor_id uuid references public.promoters(id) on delete set null;

create index if not exists idx_referrals_promotor_id on public.referrals(promotor_id);

-- Trigger updated_at
drop trigger if exists trg_promoters_updated_at on public.promoters;
create trigger trg_promoters_updated_at
before update on public.promoters
for each row execute function public.set_updated_at();

-- RLS (mantém simples como o schema inicial)
alter table public.promoters enable row level security;

drop policy if exists promoters_read on public.promoters;
create policy promoters_read on public.promoters
for select using (true);

comment on table public.promoters is
  'Cadastro dinâmico de promotores (criado automaticamente a partir de leads e webhooks).';

comment on column public.promoters.nome is
  'Nome de exibição do promotor.';

comment on column public.promoters.nome_norm is
  'Nome normalizado (trim, espaços colapsados, lowercase) usado para deduplicar.';

comment on column public.referrals.promotor_id is
  'Chave do promotor cadastrado (cadastro dinâmico).';

