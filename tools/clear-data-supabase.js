/**
 * Remove todos os dados das tabelas de negócio, mantendo apenas users_profiles.
 * Uso: npm run clear-data
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_KEY no .env');
  process.exit(1);
}

if (/your_project/i.test(url) || /YOUR_PROJECT/i.test(url)) {
  console.error('SUPABASE_URL ainda é placeholder. Configure a URL real do projeto.');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Apaga todas as linhas (filtra por created_at presente em todas as tabelas alvo). */
async function deleteAll(table) {
  const { error, count } = await supabase
    .from(table)
    .delete({ count: 'exact' })
    .gte('created_at', '1970-01-01T00:00:00.000Z');
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

async function main() {
  // Ordem: filhos primeiro (FK)
  const steps = [
    ['conversions', () => deleteAll('conversions')],
    ['ghl_contacts', () => deleteAll('ghl_contacts')],
    ['ghl_events', () => deleteAll('ghl_events')],
    ['referrals', () => deleteAll('referrals')],
    ['webhook_events', () => deleteAll('webhook_events')],
    ['indicators', () => deleteAll('indicators')],
    ['audit_logs', () => deleteAll('audit_logs')],
  ];

  const totals = {};
  for (const [name, fn] of steps) {
    const n = await fn();
    totals[name] = n;
  }

  const { count: usersLeft, error: uErr } = await supabase
    .from('users_profiles')
    .select('id', { count: 'exact', head: true });
  if (uErr) throw uErr;

  console.log('Limpeza concluída. Removidos (por tabela):', totals);
  console.log('users_profiles mantidos:', usersLeft ?? '—');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
