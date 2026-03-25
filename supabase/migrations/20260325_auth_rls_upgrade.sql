-- Migração de autenticação para Supabase Auth + RLS por usuário

-- users_profiles passa a ser vinculado ao auth.users
alter table public.users_profiles
  alter column id drop default;

alter table public.users_profiles
  alter column senha drop not null;

-- Remove políticas antigas abertas
drop policy if exists users_profiles_read on public.users_profiles;
drop policy if exists indicators_read on public.indicators;
drop policy if exists referrals_read on public.referrals;
drop policy if exists conversions_read on public.conversions;
drop policy if exists ghl_events_read on public.ghl_events;
drop policy if exists webhook_events_read on public.webhook_events;
drop policy if exists audit_logs_read on public.audit_logs;

-- Função helper para checar admin no banco (evita lógica duplicada)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.users_profiles up
    where up.id = auth.uid()
      and up.permissao = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- users_profiles: usuário vê o próprio perfil; admin gerencia geral
create policy users_profiles_select on public.users_profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy users_profiles_insert on public.users_profiles
for insert
to authenticated
with check (public.is_admin());

create policy users_profiles_update on public.users_profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy users_profiles_delete on public.users_profiles
for delete
to authenticated
using (public.is_admin());

-- Leitura geral para usuários autenticados
create policy indicators_select_authenticated on public.indicators
for select
to authenticated
using (true);

create policy referrals_select_authenticated on public.referrals
for select
to authenticated
using (true);

create policy conversions_select_authenticated on public.conversions
for select
to authenticated
using (true);

create policy ghl_events_select_authenticated on public.ghl_events
for select
to authenticated
using (true);

create policy webhook_events_select_authenticated on public.webhook_events
for select
to authenticated
using (true);

create policy audit_logs_select_authenticated on public.audit_logs
for select
to authenticated
using (true);

create policy ghl_contacts_select_authenticated on public.ghl_contacts
for select
to authenticated
using (true);

-- Escrita somente admin nas tabelas do painel
create policy indicators_admin_write on public.indicators
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy referrals_write_authenticated on public.referrals
for all
to authenticated
using (true)
with check (true);

create policy conversions_admin_write on public.conversions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy ghl_contacts_admin_write on public.ghl_contacts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy ghl_events_admin_write on public.ghl_events
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy webhook_events_admin_write on public.webhook_events
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy audit_logs_admin_write on public.audit_logs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
