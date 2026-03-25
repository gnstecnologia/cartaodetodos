/**
 * Insere indicadores e indicações mock no Supabase (desenvolvimento / demo).
 * Idempotente: remove antes linhas com origem "seed-mock" e recria.
 *
 * Uso: npm run seed
 * Requer: SUPABASE_URL, SUPABASE_SERVICE_KEY, LANDING_BASE_URL (opcional)
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const landingBase = process.env.LANDING_BASE_URL || 'https://cartaodetodos.companygenesis.com.br';

if (!supabaseUrl || !supabaseKey) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_KEY no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function brDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false });
}

function logStatus(status, iso) {
  return [{ status, data: iso, origem: 'sistema' }];
}

async function main() {
  const { error: delErr } = await supabase.from('referrals').delete().eq('origem', 'seed-mock');
  if (delErr) throw delErr;

  const mockIndicators = [
    {
      code: 'MOCKIND1',
      nome: 'Rafael Indicador',
      telefone: '11999990001',
      chave_pix: 'rafael.mock@email.com',
      url: `${landingBase}/?codigo=MOCKIND1`,
      ativo: true,
      total_indicacoes: 0,
    },
    {
      code: 'MOCKIND2',
      nome: 'Ana Indicadora',
      telefone: '11999990002',
      chave_pix: '11999990002',
      url: `${landingBase}/?codigo=MOCKIND2`,
      ativo: true,
      total_indicacoes: 0,
    },
    {
      code: 'MOCKIND3',
      nome: 'Carlos Promotor',
      telefone: '11999990003',
      chave_pix: 'carlos@email.com',
      url: `${landingBase}/?codigo=MOCKIND3`,
      ativo: true,
      total_indicacoes: 0,
    },
  ];

  const { error: upsertIndErr } = await supabase.from('indicators').upsert(mockIndicators, {
    onConflict: 'code',
  });
  if (upsertIndErr) throw upsertIndErr;

  const { data: rows, error: fetchErr } = await supabase
    .from('indicators')
    .select('id,code,nome')
    .in(
      'code',
      mockIndicators.map((m) => m.code),
    );
  if (fetchErr) throw fetchErr;

  const byCode = Object.fromEntries((rows || []).map((r) => [r.code, r]));
  for (const code of mockIndicators.map((m) => m.code)) {
    if (!byCode[code]) {
      throw new Error(`Indicador com code=${code} não encontrado após upsert`);
    }
  }

  const now0 = new Date();
  const mkIso = (minOffset) => new Date(now0.getTime() - minOffset * 60 * 1000).toISOString();

  const mockReferrals = [
    {
      nome: 'Fernando Cliente',
      telefone: '11988881111',
      indicator_id: byCode.MOCKIND1.id,
      codigo_indicacao: 'MOCKIND1',
      origem: 'seed-mock',
      status: 'Nova Indicação',
      responsavel_nome: 'Maria Silva',
      data_criacao_iso: mkIso(120),
      data_hora: brDateTime(mkIso(120)),
      log_status: logStatus('Nova Indicação', mkIso(120)),
      nova_indicacao_em: mkIso(120),
    },
    {
      nome: 'Paula Santos',
      telefone: '11988882222',
      indicator_id: byCode.MOCKIND1.id,
      codigo_indicacao: 'MOCKIND1',
      origem: 'seed-mock',
      status: 'Em Contato',
      responsavel_nome: 'Maria Silva',
      data_criacao_iso: mkIso(100),
      data_hora: brDateTime(mkIso(100)),
      log_status: [
        { status: 'Nova Indicação', data: mkIso(100), origem: 'sistema' },
        { status: 'Em Contato', data: mkIso(95), origem: 'sistema' },
      ],
      nova_indicacao_em: mkIso(100),
      em_contato_em: mkIso(95),
    },
    {
      nome: 'Lucas Oliveira',
      telefone: '11988883333',
      indicator_id: byCode.MOCKIND2.id,
      codigo_indicacao: 'MOCKIND2',
      origem: 'seed-mock',
      status: 'Fechado',
      responsavel_nome: 'João Vendas',
      data_criacao_iso: mkIso(200),
      data_hora: brDateTime(mkIso(200)),
      log_status: [
        { status: 'Nova Indicação', data: mkIso(200), origem: 'sistema' },
        { status: 'Fechado', data: mkIso(180), origem: 'sistema' },
      ],
      fechado_em: mkIso(180),
    },
    {
      nome: 'Juliana Costa',
      telefone: '11988884444',
      indicator_id: byCode.MOCKIND2.id,
      codigo_indicacao: 'MOCKIND2',
      origem: 'seed-mock',
      status: 'Perdido',
      responsavel_nome: 'João Vendas',
      data_criacao_iso: mkIso(150),
      data_hora: brDateTime(mkIso(150)),
      log_status: [
        { status: 'Nova Indicação', data: mkIso(150), origem: 'sistema' },
        { status: 'Perdido', data: mkIso(140), origem: 'sistema' },
      ],
      perdido_em: mkIso(140),
    },
    {
      nome: 'Bruno Almeida',
      telefone: '30988885555',
      indicator_id: byCode.MOCKIND3.id,
      codigo_indicacao: 'MOCKIND3',
      origem: 'seed-mock',
      status: 'Em Negociação',
      responsavel_nome: 'Maria Silva',
      data_criacao_iso: mkIso(60),
      data_hora: brDateTime(mkIso(60)),
      log_status: [
        { status: 'Nova Indicação', data: mkIso(60), origem: 'sistema' },
        { status: 'Em Negociação', data: mkIso(50), origem: 'sistema' },
      ],
      em_negociacao_em: mkIso(50),
    },
  ];

  const { error: insErr } = await supabase.from('referrals').insert(mockReferrals);
  if (insErr) throw insErr;

  for (const code of mockIndicators.map((m) => m.code)) {
    const { count, error: cErr } = await supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('codigo_indicacao', code);
    if (cErr) throw cErr;
    await supabase.from('indicators').update({ total_indicacoes: count || 0 }).eq('code', code);
  }

  console.log('Seed concluído:', {
    indicadores: mockIndicators.length,
    indicacoes: mockReferrals.length,
    codigos: mockIndicators.map((m) => m.code),
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
