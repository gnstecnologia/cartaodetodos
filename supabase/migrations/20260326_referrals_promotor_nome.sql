-- Campo de negócio: promotor da indicação (distinto do responsável/televendas no GHL)
alter table public.referrals
  add column if not exists promotor_nome text;

comment on column public.referrals.promotor_nome is
  'Nome do promotor vinculado ao lead (URL, formulário ou custom fields do GHL no webhook).';
