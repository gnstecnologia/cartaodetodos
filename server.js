require('dotenv').config();

const crypto = require('crypto');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { supabase, supabaseUrl } = require('./services/supabase/client');
const { sendLeadToGhl } = require('./services/ghl/client');
const { writeAuditLog } = require('./services/logs/audit');
const { parseBrazilPhoneToE164 } = require('./scripts/phone-br.js');

const app = express();
const PORT = process.env.PORT || 3000;
const DEFAULT_LANDING_BASE_URL = process.env.LANDING_BASE_URL || 'https://cartaodetodos.companygenesis.com.br';
const SUPABASE_ANON_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const AUTH_COOKIE_NAME = 'ctd_access_token';
const REFRESH_COOKIE_NAME = 'ctd_refresh_token';
const COOKIE_MAX_AGE_SECONDS = Number(process.env.AUTH_COOKIE_MAX_AGE_SECONDS || 60 * 60 * 8);
const COOKIE_SECURE = String(process.env.AUTH_COOKIE_SECURE || (process.env.NODE_ENV === 'production' ? 'true' : 'false')) === 'true';
const COOKIE_DOMAIN = String(process.env.AUTH_COOKIE_DOMAIN || '').trim() || undefined;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const STATIC_BLOCK_PREFIXES = ['/tools', '/services', '/supabase'];
app.use((req, res, next) => {
  const pathOnly = (req.path || '').split('?')[0];
  if (pathOnly === '/.env' || pathOnly.startsWith('/.env/')) {
    return res.status(404).end();
  }
  for (const prefix of STATIC_BLOCK_PREFIXES) {
    if (pathOnly === prefix || pathOnly.startsWith(`${prefix}/`)) {
      return res.status(404).end();
    }
  }
  next();
});
app.use(
  express.static(__dirname, {
    setHeaders(res, filePath) {
      const rel = path.relative(__dirname, filePath);
      if (
        rel === path.join('scripts', 'auth.js') ||
        rel === path.join('scripts', 'dashboard.js') ||
        rel === path.join('scripts', 'phone-br.js') ||
        rel === path.join('scripts', 'form-handler.js') ||
        rel === path.join('scripts', 'gerar-indicador.js') ||
        rel === 'dashboard.html' ||
        rel === 'index.html' ||
        rel === 'gerar-indicador.html'
      ) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
      }
    },
  }),
);

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  if (!raw) return {};
  return raw.split(';').reduce((acc, item) => {
    const index = item.indexOf('=');
    if (index <= 0) return acc;
    const key = item.slice(0, index).trim();
    const value = item.slice(index + 1).trim();
    acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  parts.push(`Path=${options.path || '/'}`);
  return parts.join('; ');
}

function setAuthCookies(res, session) {
  const cookieOptions = {
    path: '/',
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'Lax',
    maxAge: COOKIE_MAX_AGE_SECONDS,
    domain: COOKIE_DOMAIN,
  };
  // Duas cabeçalhos Set-Cookie: res.append evita perder um cookie com setHeader([...]).
  res.append('Set-Cookie', serializeCookie(AUTH_COOKIE_NAME, session.access_token, cookieOptions));
  res.append('Set-Cookie', serializeCookie(REFRESH_COOKIE_NAME, session.refresh_token, cookieOptions));
}

function clearAuthCookies(res) {
  const clearOptions = {
    path: '/',
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'Lax',
    maxAge: 0,
    domain: COOKIE_DOMAIN,
  };
  res.append('Set-Cookie', serializeCookie(AUTH_COOKIE_NAME, '', clearOptions));
  res.append('Set-Cookie', serializeCookie(REFRESH_COOKIE_NAME, '', clearOptions));
}

function createAnonClient(accessToken) {
  if (!SUPABASE_ANON_KEY) {
    throw new Error('Defina SUPABASE_PUBLISHABLE_KEY (ou SUPABASE_ANON_KEY) no ambiente');
  }
  const globalHeaders = {};
  if (accessToken) globalHeaders.Authorization = `Bearer ${accessToken}`;

  return createClient(supabaseUrl, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: globalHeaders },
  });
}

async function fetchSessionUser(accessToken) {
  if (!accessToken) return null;
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) return null;
  return data.user;
}

async function hydrateRequestUser(req, accessToken) {
  const user = await fetchSessionUser(accessToken);
  if (!user) return null;

  const userClient = createAnonClient(accessToken);
  const { data: profile } = await userClient
    .from('users_profiles')
    .select('id,email,nome,tipo,permissao')
    .eq('id', user.id)
    .maybeSingle();

  return {
    authUser: user,
    profile: profile || null,
    accessToken,
    userClient,
  };
}

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const cookies = parseCookies(req);
    const accessToken = bearerToken || cookies[AUTH_COOKIE_NAME] || '';
    const sessionData = await hydrateRequestUser(req, accessToken);
    if (!sessionData) return res.status(401).json({ ok: false, message: 'Não autenticado' });

    req.authUser = sessionData.authUser;
    req.user = sessionData.profile || {
      id: sessionData.authUser.id,
      email: sessionData.authUser.email || '',
      nome: sessionData.authUser.user_metadata?.nome || '',
      tipo: 'promotor',
      permissao: 'usuario',
    };
    req.userClient = sessionData.userClient;
    req.accessToken = sessionData.accessToken;
    next();
  } catch (error) {
    res.status(401).json({ ok: false, message: 'Sessão inválida' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.permissao !== 'admin') {
    return res.status(403).json({ ok: false, message: 'Acesso restrito a administradores' });
  }
  next();
}

function getSaoPauloISODate() {
  return new Date().toISOString();
}

function formatBrazilianDateTime(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour12: false,
  });
}

function normalizeStatus(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return 'Nova Indicação';
  if (
    raw === 'nova indicação' ||
    raw === 'nova indicacao' ||
    raw === 'novo indicado' ||
    raw === 'novo indicado(a)'
  ) {
    return 'Nova Indicação';
  }
  if (raw === 'em contato') return 'Em Contato';
  if (raw === 'em negociação' || raw === 'em negociacao') return 'Em Negociação';
  if (raw === 'fechado' || raw === 'ganho') return 'Fechado';
  if (raw === 'perdido') return 'Perdido';
  return value;
}

/** Rótulos de negócio: entrada na base (captura + GHL) vs ganho no webhook. */
function statusLegivel(internalStatus) {
  const s = normalizeStatus(internalStatus);
  if (s === 'Nova Indicação') return 'Novo indicado';
  if (s === 'Fechado') return 'Ganho';
  return s;
}

/**
 * Se o referral ainda não tem indicador, tenta resolver pelo payload do webhook de ganho (código ou Nome Indicador).
 */
async function resolveIndicatorPatchFromWebhookPayload(db, referral, payload) {
  if (referral.indicator_id) return {};
  const indicadorCode = extractIndicadorCodeFromGhlPayload(payload);
  const nomeIndicador =
    (payload['Nome Indicador'] && String(payload['Nome Indicador']).trim()) ||
    (payload['nome_indicador'] && String(payload['nome_indicador']).trim()) ||
    null;

  if (indicadorCode) {
    const { data: ind } = await db
      .from('indicators')
      .select('id,code')
      .eq('code', String(indicadorCode))
      .maybeSingle();
    if (ind) {
      return { indicator_id: ind.id, codigo_indicacao: ind.code };
    }
  }

  if (nomeIndicador) {
    const { data: indicators } = await db.from('indicators').select('id,code,nome').limit(500);
    const hit = (indicators || []).find(
      (i) => (i.nome || '').trim().toLowerCase() === nomeIndicador.toLowerCase(),
    );
    if (hit) {
      return { indicator_id: hit.id, codigo_indicacao: hit.code };
    }
  }

  return {};
}

/** Extrai nome do promotor de payloads GHL (customData / raiz / campos com espaço no nome). */
function extractPromotorNomeFromGhlPayload(payload) {
  const p = payload || {};
  const c = p.customData || p.custom_data || {};
  const raw =
    c.promotorNome ??
    c.promotor_nome ??
    c.promotor ??
    c['Nome Promotor'] ??
    p.promotorNome ??
    p.promotorName ??
    p.promotor ??
    p['Nome Promotor'] ??
    p['Promotor'];
  if (raw == null) return null;
  const s = String(raw).trim();
  return s || null;
}

/** GHL envia contact_id (snake_case) no workflow de indicação. */
function extractGhlContactIdFromPayload(payload) {
  const p = payload || {};
  if (p.contact_id != null && String(p.contact_id).trim()) return String(p.contact_id).trim();
  if (p.contactId != null && String(p.contactId).trim()) return String(p.contactId).trim();
  if (p.contact?.id != null && String(p.contact.id).trim()) return String(p.contact.id).trim();
  if (p.data?.contactId != null && String(p.data.contactId).trim()) return String(p.data.contactId).trim();
  return null;
}

/** Responsável no ganho: owner (pipeline) ou user do payload; fallback userName/assignedTo. */
function extractGhlAtendenteFromPayload(payload) {
  const p = payload || {};
  const owner = p.owner != null ? String(p.owner).trim() : '';
  if (owner) return owner;
  const u = p.user;
  if (u && (u.firstName || u.lastName)) {
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
    if (name) return name;
  }
  if (p.userName != null && String(p.userName).trim()) return String(p.userName).trim();
  if (p.assignedTo != null && String(p.assignedTo).trim()) return String(p.assignedTo).trim();
  if (p.data?.assignedTo != null && String(p.data.assignedTo).trim()) return String(p.data.assignedTo).trim();
  return null;
}

/** Código/id do indicador: ID Indicador (GHL) ou customData.indicatorCode etc. */
function extractIndicadorCodeFromGhlPayload(payload) {
  const p = payload || {};
  const c = p.customData || p.custom_data || {};
  const candidates = [
    p['ID Indicador'],
    p['Id Indicador'],
    p.id_indicador,
    c.indicatorCode,
    c.codigoIndicacao,
    c.codigo_indicacao,
    p.indicatorCode,
  ];
  for (const v of candidates) {
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
}

function normalizeWebhookPhoneToE164(raw) {
  if (raw == null || String(raw).trim() === '') return null;
  const parsed = parseBrazilPhoneToE164(String(raw).trim());
  return parsed.ok ? parsed.e164 : null;
}

/** Resolve referral do ganho: contato GHL → código indicador → nome indicador + telefone → só telefone. */
async function findReferralForConversionWebhook(db, payload) {
  const contactId = extractGhlContactIdFromPayload(payload);
  let referral = null;

  if (contactId) {
    const { data: refMap } = await db
      .from('ghl_contacts')
      .select('referral_id')
      .eq('ghl_contact_id', String(contactId))
      .maybeSingle();
    if (refMap?.referral_id) {
      const { data: refData } = await db.from('referrals').select('*').eq('id', refMap.referral_id).maybeSingle();
      referral = refData || null;
    }
  }

  const phoneE164 = normalizeWebhookPhoneToE164(payload.phone || payload.phoneNumber);
  const indicadorCode = extractIndicadorCodeFromGhlPayload(payload);
  const nomeIndicador =
    (payload['Nome Indicador'] && String(payload['Nome Indicador']).trim()) ||
    (payload['nome_indicador'] && String(payload['nome_indicador']).trim()) ||
    null;

  async function latestReferral(qb) {
    const { data } = await qb.order('created_at', { ascending: false }).limit(1).maybeSingle();
    return data || null;
  }

  if (!referral && indicadorCode) {
    let qb = db.from('referrals').select('*').eq('codigo_indicacao', String(indicadorCode));
    if (phoneE164) qb = qb.eq('telefone', phoneE164);
    referral = await latestReferral(qb);
  }

  if (!referral && nomeIndicador) {
    const { data: indicators } = await db.from('indicators').select('id,code,nome').limit(500);
    const hit = (indicators || []).find(
      (i) => (i.nome || '').trim().toLowerCase() === nomeIndicador.toLowerCase(),
    );
    if (hit) {
      let qb = db.from('referrals').select('*').eq('indicator_id', hit.id);
      if (phoneE164) qb = qb.eq('telefone', phoneE164);
      referral = await latestReferral(qb);
    }
  }

  if (!referral && phoneE164) {
    referral = await latestReferral(db.from('referrals').select('*').eq('telefone', phoneE164));
  }

  return referral;
}

function buildClosingRanking(closedList, field, emptyLabel) {
  const total = closedList.length;
  const counts = new Map();
  for (const r of closedList) {
    const v = r[field];
    const nome = (v && String(v).trim()) ? String(v).trim() : emptyLabel;
    counts.set(nome, (counts.get(nome) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([nome, fechados]) => ({
      nome,
      fechados,
      percentualSobreFechamentosNoPeriodo:
        total > 0 ? Number(((fechados / total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.fechados - a.fechados);
}

/** Promotor único: captura (promotor_nome) ou GHL no ganho (responsavel_nome) — mesma pessoa no negócio. */
function promotorNomeUnificado(row) {
  return (row.promotor_nome || row.responsavel_nome || '').trim();
}

function buildPromotorRankingUnified(closedList) {
  const total = closedList.length;
  const counts = new Map();
  const emptyLabel = 'Promotor não informado';
  for (const r of closedList) {
    const nome = promotorNomeUnificado(r) || emptyLabel;
    counts.set(nome, (counts.get(nome) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([nome, fechados]) => ({
      nome,
      fechados,
      percentualSobreFechamentosNoPeriodo:
        total > 0 ? Number(((fechados / total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.fechados - a.fechados);
}

const VALOR_PLANO_PROMOTOR = 59.99;

function aggregateReferralsByPromotor(referrals, indicatorById) {
  const emptyLabel = 'Promotor não informado';
  const grouped = new Map();

  for (const lead of referrals || []) {
    const keyRaw = promotorNomeUnificado(lead);
    const key = keyRaw || emptyLabel;

    if (!grouped.has(key)) {
      grouped.set(key, {
        nome: key,
        totalLeads: 0,
        leadsPorStatus: {
          'Nova Indicação': 0,
          'Em Contato': 0,
          'Em Negociação': 0,
          Fechado: 0,
          Perdido: 0,
        },
        indicadores: new Set(),
        leads: [],
      });
    }

    const bucket = grouped.get(key);
    const status = normalizeStatus(lead.status);
    bucket.totalLeads += 1;
    if (bucket.leadsPorStatus[status] !== undefined) bucket.leadsPorStatus[status] += 1;

    const indicator = lead.indicator_id ? indicatorById.get(lead.indicator_id) : null;
    if (indicator?.nome) bucket.indicadores.add(indicator.nome);

    bucket.leads.push({
      id: lead.id,
      nome: lead.nome,
      telefone: lead.telefone,
      status,
      statusLegivel: statusLegivel(status),
      dataHora: lead.data_hora || formatBrazilianDateTime(lead.created_at),
      indicadorNome: indicator?.nome || lead.codigo_indicacao || '',
      promotorNome: keyRaw || '',
    });
  }

  return [...grouped.values()]
    .map((p) => {
      const leadsFechados = p.leadsPorStatus.Fechado || 0;
      const valorGerado = Number((leadsFechados * VALOR_PLANO_PROMOTOR).toFixed(2));
      const taxaConversao = p.totalLeads
        ? Number(((leadsFechados / p.totalLeads) * 100).toFixed(1))
        : 0;
      const taxaPerda = p.totalLeads
        ? Number((((p.leadsPorStatus.Perdido || 0) / p.totalLeads) * 100).toFixed(1))
        : 0;
      const leadsContato =
        (p.leadsPorStatus['Em Contato'] || 0) + (p.leadsPorStatus['Em Negociação'] || 0);
      return {
        nome: p.nome,
        totalLeads: p.totalLeads,
        leadsPorStatus: p.leadsPorStatus,
        leadsFechados,
        leadsContato,
        leadsPerdidos: p.leadsPorStatus.Perdido || 0,
        valorGerado,
        taxaConversao,
        taxaPerda,
        indicadores: [...p.indicadores].sort(),
        numIndicadores: p.indicadores.size,
        leads: p.leads,
      };
    })
    .sort((a, b) => b.valorGerado - a.valorGerado || b.totalLeads - a.totalLeads);
}

/** Métricas: cohort por data de entrada vs fechamentos por fechado_em (ganho/webhook). */
function buildDashboardMetricas(referralsCreatedInFilter, closedRowsForFechamentoPeriod) {
  const ind = referralsCreatedInFilter || [];
  const totalIndicadosNoPeriodo = ind.length;
  let fechadosEntreIndicadosDoPeriodo = 0;
  let perdidosEntreIndicadosDoPeriodo = 0;
  for (const r of ind) {
    const s = normalizeStatus(r.status);
    if (s === 'Fechado') fechadosEntreIndicadosDoPeriodo += 1;
    else if (s === 'Perdido') perdidosEntreIndicadosDoPeriodo += 1;
  }
  const emAndamentoEntreIndicadosDoPeriodo = Math.max(
    0,
    totalIndicadosNoPeriodo - fechadosEntreIndicadosDoPeriodo - perdidosEntreIndicadosDoPeriodo,
  );
  const taxaFechamentoSobreIndicadosPercent =
    totalIndicadosNoPeriodo > 0
      ? Number(((fechadosEntreIndicadosDoPeriodo / totalIndicadosNoPeriodo) * 100).toFixed(1))
      : 0;

  const closedList = (closedRowsForFechamentoPeriod || []).filter(
    (r) => normalizeStatus(r.status) === 'Fechado',
  );
  const fechamentosPorDataGanhoNoPeriodo = closedList.length;

  const promotoresRanking = buildPromotorRankingUnified(closedList);

  return {
    totalIndicadosNoPeriodo,
    fechadosEntreIndicadosDoPeriodo,
    perdidosEntreIndicadosDoPeriodo,
    emAndamentoEntreIndicadosDoPeriodo,
    taxaFechamentoSobreIndicadosPercent,
    fechamentosPorDataGanhoNoPeriodo,
    promotoresRanking,
    legendas: {
      cohortEntrada:
        'Indicado = pessoa indicada. Indicadores no filtro: status atual desses leads (entrada no período).',
      fechamentosDataGanho:
        'Ganhos no período usam a data em que o deal foi fechado (fechado_em / webhook).',
      promotores:
        'Promotor = quem trabalha o lead (nome na captura ou no GHL ao ganhar). Mesma pessoa; ranking unifica os dois campos.',
      papéis:
        'Indicado: cliente indicado. Indicador: dono do código de indicação. Promotor: responsável pela venda.',
      etapasLead:
        'Novo indicado: lead criado (indicação + contato/mensagem no GHL). Ganho: o mesmo lead confirmado pelo webhook de conversão; aí gravamos promotor (custom/campo) e responsável no GHL e vinculamos o indicador se ainda faltava.',
    },
  };
}

function randomCode(size = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(size);
  let code = '';
  for (let i = 0; i < size; i += 1) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
}

async function generateUniqueIndicatorCode(dbClient = supabase) {
  for (let i = 0; i < 10; i += 1) {
    const code = randomCode(8);
    const { data } = await dbClient.from('indicators').select('id').eq('code', code).maybeSingle();
    if (!data) return code;
  }
  throw new Error('Não foi possível gerar código único para indicador');
}

app.get('/api/health', (req, res) => {
  res.status(200).json({ ok: true, status: 'online', timestamp: new Date().toISOString() });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) {
      return res.status(400).json({ ok: false, message: 'E-mail e senha são obrigatórios' });
    }

    const anonClient = createAnonClient();
    const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
    if (error || !data?.session || !data?.user) {
      return res.status(401).json({ ok: false, message: 'Credenciais inválidas' });
    }

    const userClient = createAnonClient(data.session.access_token);
    const { data: profile } = await userClient
      .from('users_profiles')
      .select('id,email,nome,tipo,permissao')
      .eq('id', data.user.id)
      .maybeSingle();

    setAuthCookies(res, data.session);
    return res.json({
      ok: true,
      user: profile || {
        id: data.user.id,
        email: data.user.email || email,
        nome: data.user.user_metadata?.nome || '',
        tipo: 'promotor',
        permissao: 'usuario',
      },
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: `Erro ao autenticar: ${error.message}` });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  clearAuthCookies(res);
  res.json({ ok: true });
});

app.post('/api/auth/refresh', async (req, res) => {
  try {
    const cookies = parseCookies(req);
    const refreshToken = cookies[REFRESH_COOKIE_NAME];
    if (!refreshToken) return res.status(401).json({ ok: false, message: 'Sem refresh token' });

    const anonClient = createAnonClient();
    const { data, error } = await anonClient.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data?.session) return res.status(401).json({ ok: false, message: 'Sessão expirada' });

    setAuthCookies(res, data.session);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, message: `Erro ao renovar sessão: ${error.message}` });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  res.json({ ok: true, user: req.user });
});

app.post('/api/leads', async (req, res) => {
  try {
    const { nome, telefone, codigoIndicacao, promotorNome } = req.body;

    if (!nome || !telefone) {
      return res.status(400).json({ ok: false, message: 'Nome e telefone são obrigatórios' });
    }

    const phoneParsed = parseBrazilPhoneToE164(telefone);
    if (!phoneParsed.ok) {
      return res.status(400).json({ ok: false, message: phoneParsed.message });
    }
    const telefoneE164 = phoneParsed.e164;

    let indicator = null;
    if (codigoIndicacao) {
      const indicatorResp = await supabase
        .from('indicators')
        .select('id,nome,code')
        .eq('code', String(codigoIndicacao).trim())
        .maybeSingle();
      indicator = indicatorResp.data || null;
    }

    const createdAt = getSaoPauloISODate();
    const initialLog = [{ status: 'Nova Indicação', data: createdAt, origem: 'sistema' }];

    const promotorTrim =
      promotorNome != null && String(promotorNome).trim() ? String(promotorNome).trim() : null;

    const { data: referral, error } = await supabase
      .from('referrals')
      .insert({
        nome: String(nome).trim(),
        telefone: telefoneE164,
        indicator_id: indicator?.id || null,
        codigo_indicacao: indicator?.code || String(codigoIndicacao || '').trim() || null,
        promotor_nome: promotorTrim,
        status: 'Nova Indicação',
        origem: 'landing-cartao-de-todos',
        data_hora: formatBrazilianDateTime(createdAt),
        data_criacao_iso: createdAt,
        log_status: initialLog,
        nova_indicacao_em: createdAt,
      })
      .select('*')
      .single();

    if (error) throw error;

    try {
      const ghlResult = await sendLeadToGhl({ referral, indicatorName: indicator?.nome || null });
      const contactId = ghlResult?.steps?.contact?.contactId || null;

      await supabase.from('ghl_events').insert({
        referral_id: referral.id,
        event_type: 'lead_created',
        status: 'success',
        payload: ghlResult,
      });

      if (contactId) {
        await supabase.from('ghl_contacts').upsert({
          referral_id: referral.id,
          ghl_contact_id: String(contactId),
        });
      }
    } catch (ghlError) {
      await supabase.from('ghl_events').insert({
        referral_id: referral.id,
        event_type: 'lead_created',
        status: 'error',
        payload: { message: ghlError.message, details: ghlError.data || null },
      });
      await writeAuditLog('ghl_integration_error', 'referral', referral.id, { message: ghlError.message }, 'error');
    }

    res.json({ ok: true, message: 'Lead cadastrado com sucesso' });
  } catch (error) {
    console.error('Erro ao cadastrar lead:', error);
    res.status(500).json({ ok: false, message: `Erro ao cadastrar lead: ${error.message}` });
  }
});

app.get('/api/dashboard', requireAuth, async (req, res) => {
  try {
    const db = req.userClient;
    const { dataInicio, dataFim } = req.query;

    // select('*') evita erro 500 se a coluna promotor_nome ainda não existir no banco (migração pendente).
    let query = db.from('referrals').select('*');

    if (dataInicio) {
      query = query.gte('created_at', `${dataInicio}T00:00:00.000Z`);
    }
    if (dataFim) {
      query = query.lte('created_at', `${dataFim}T23:59:59.999Z`);
    }

    const { data: referrals, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    let closedQuery = db.from('referrals').select('*').not('fechado_em', 'is', null);
    if (dataInicio) {
      closedQuery = closedQuery.gte('fechado_em', `${dataInicio}T00:00:00.000Z`);
    }
    if (dataFim) {
      closedQuery = closedQuery.lte('fechado_em', `${dataFim}T23:59:59.999Z`);
    }
    const { data: closedRows, error: closedErr } = await closedQuery;
    if (closedErr) throw closedErr;

    const metricas = buildDashboardMetricas(referrals || [], closedRows || []);

    const indicators = {};
    const { data: indicatorsMapRows } = await db.from('indicators').select('code,nome').eq('ativo', true);
    (indicatorsMapRows || []).forEach((item) => {
      indicators[String(item.code)] = item.nome;
    });

    const { data: indicatorRows } = await db
      .from('indicators')
      .select('code,nome,telefone')
      .eq('ativo', true)
      .order('created_at', { ascending: true });

    const indicadoresList = (indicatorRows || []).map((row) => ({
      id: row.code,
      nome: row.nome,
      telefone: row.telefone || '',
    }));

    const indicacoes = (referrals || []).map((row) => {
      const status = normalizeStatus(row.status);
      return {
        id: row.id,
        nome: row.nome,
        telefone: row.telefone,
        codigoIndicacao: row.codigo_indicacao || '',
        origem: row.origem || '',
        status,
        statusLegivel: statusLegivel(status),
        dataHora: row.data_hora || formatBrazilianDateTime(row.data_criacao_iso || row.created_at),
        logStatus: Array.isArray(row.log_status) ? row.log_status : [],
        responsavelNome: row.responsavel_nome || '',
        promotorNome: promotorNomeUnificado(row) || '',
        fechadoEm: row.fechado_em || null,
        perdidoEm: row.perdido_em || null,
      };
    });

    res.json({
      ok: true,
      indicacoes,
      indicadores: indicators,
      indicadoresList,
      metricas,
      legendasEtapas:
        'Novo indicado = entrada na base (indicação + GHL). Ganho = webhook de conversão no mesmo lead: grava promotor, responsável no GHL e vincula indicador a partir do payload, se ainda faltava.',
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    res.status(500).json({ ok: false, message: `Erro ao buscar dados: ${error.message}` });
  }
});

app.get('/api/promotores', requireAuth, async (req, res) => {
  try {
    const db = req.userClient;
    const { dataInicio, dataFim } = req.query;

    let query = db.from('referrals').select('*');

    if (dataInicio) query = query.gte('created_at', `${dataInicio}T00:00:00.000Z`);
    if (dataFim) query = query.lte('created_at', `${dataFim}T23:59:59.999Z`);

    const { data: referrals, error } = await query;
    if (error) throw error;

    const { data: indicatorsData } = await db.from('indicators').select('id,nome,code');
    const indicatorById = new Map((indicatorsData || []).map((i) => [i.id, i]));

    const promotores = aggregateReferralsByPromotor(referrals, indicatorById);

    res.json({
      ok: true,
      promotores,
      valorPlano: VALOR_PLANO_PROMOTOR,
      legendas: {
        promotores:
          'Agrupado pelo promotor: nome na captura (URL) ou no GHL ao fechar — tratado como a mesma pessoa.',
        etapas:
          'Novo indicado = lead na base. Ganho = mesmo lead no webhook de conversão (atualiza métricas de promotor e indicador).',
      },
    });
  } catch (error) {
    console.error('Erro ao buscar promotores:', error);
    res.status(500).json({ ok: false, message: `Erro ao buscar dados: ${error.message}` });
  }
});

app.post('/api/leads/:leadId/status', requireAuth, async (req, res) => {
  try {
    const db = req.userClient;
    const { leadId } = req.params;
    const status = normalizeStatus(req.body.status);

    if (!status) {
      return res.status(400).json({ ok: false, message: 'Status é obrigatório' });
    }

    const { data: lead, error: fetchError } = await db
      .from('referrals')
      .select('id,status,log_status')
      .eq('id', leadId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!lead) return res.status(404).json({ ok: false, message: 'Lead não encontrado' });

    const now = getSaoPauloISODate();
    const timeline = Array.isArray(lead.log_status) ? [...lead.log_status] : [];
    timeline.push({ status, data: now, origem: 'sistema' });

    const patch = {
      status,
      log_status: timeline,
      ultima_mudanca_status: status,
      data_ultima_mudanca: now,
    };

    if (status === 'Nova Indicação') patch.nova_indicacao_em = now;
    if (status === 'Em Contato') patch.em_contato_em = now;
    if (status === 'Em Negociação') patch.em_negociacao_em = now;
    if (status === 'Fechado') patch.fechado_em = now;
    if (status === 'Perdido') patch.perdido_em = now;

    const { error: updateError } = await db.from('referrals').update(patch).eq('id', leadId);
    if (updateError) throw updateError;

    await writeAuditLog('lead_status_updated', 'referral', leadId, { status }, 'success');

    res.json({ ok: true, message: 'Status atualizado com sucesso', log: timeline });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ ok: false, message: `Erro ao atualizar status: ${error.message}` });
  }
});

app.get('/api/leads/:leadId/timeline', requireAuth, async (req, res) => {
  try {
    const db = req.userClient;
    const { leadId } = req.params;
    const { data: lead, error } = await db
      .from('referrals')
      .select('id,log_status,data_hora,data_criacao_iso,created_at')
      .eq('id', leadId)
      .maybeSingle();

    if (error) throw error;
    if (!lead) return res.status(404).json({ ok: false, message: 'Lead não encontrado' });

    const rawTimeline = Array.isArray(lead.log_status) ? lead.log_status : [];
    const timeline = rawTimeline.map((e) => {
      const st = e?.status ?? e?.Status;
      return {
        ...e,
        statusLegivel: statusLegivel(st),
      };
    });

    res.json({
      ok: true,
      timeline,
      dataCriacao: lead.data_hora || formatBrazilianDateTime(lead.data_criacao_iso || lead.created_at),
    });
  } catch (error) {
    console.error('Erro ao buscar timeline:', error);
    res.status(500).json({ ok: false, message: `Erro ao buscar timeline: ${error.message}` });
  }
});

app.post('/api/indicadores', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Service role: escrita após requireAdmin (evita RLS is_admin() divergente de auth.users ↔ users_profiles).
    const db = supabase;
    const { nome, telefone, chavePix } = req.body;
    if (!nome || !telefone || !chavePix) {
      return res.status(400).json({ ok: false, message: 'Nome, Telefone e Chave Pix são obrigatórios' });
    }

    const telIndicador = parseBrazilPhoneToE164(telefone);
    if (!telIndicador.ok) {
      return res.status(400).json({ ok: false, message: telIndicador.message });
    }

    const code = await generateUniqueIndicatorCode(db);
    const url = `${DEFAULT_LANDING_BASE_URL}/?codigo=${encodeURIComponent(code)}`;

    const { data, error } = await db
      .from('indicators')
      .insert({
        nome: String(nome).trim(),
        telefone: telIndicador.e164,
        chave_pix: String(chavePix).trim(),
        code,
        url,
        total_indicacoes: 0,
      })
      .select('*')
      .single();

    if (error) throw error;

    await writeAuditLog('indicator_created', 'indicator', data.id, { nome: data.nome, code: data.code }, 'success');

    res.json({
      ok: true,
      message: 'Indicador criado com sucesso',
      indicador: {
        id: data.code,
        nome: data.nome,
        telefone: data.telefone,
        chavePix: data.chave_pix,
        url: data.url,
      },
    });
  } catch (error) {
    console.error('Erro ao criar indicador:', error);
    res.status(500).json({ ok: false, message: `Erro ao criar indicador: ${error.message}` });
  }
});

app.get('/api/usuarios', requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = req.userClient;
    const { data, error } = await db
      .from('users_profiles')
      .select('id,email,nome,tipo,permissao,created_at')
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ ok: true, usuarios: data || [] });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ ok: false, message: `Erro ao listar usuários: ${error.message}` });
  }
});

app.post('/api/usuarios', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { nome, email, senha, tipo, permissao } = req.body;
    if (!nome || !email || !senha || !tipo || !permissao) {
      return res.status(400).json({ ok: false, message: 'Todos os campos são obrigatórios' });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const { data: exists } = await supabase.from('users_profiles').select('email').eq('email', emailNorm).maybeSingle();
    if (exists) return res.status(400).json({ ok: false, message: 'Email já cadastrado' });

    const { data: authResult, error: authError } = await supabase.auth.admin.createUser({
      email: emailNorm,
      password: String(senha),
      email_confirm: true,
      user_metadata: { nome: String(nome).trim(), tipo, permissao },
    });
    if (authError) throw authError;

    const userId = authResult?.user?.id;
    if (!userId) throw new Error('Não foi possível criar usuário no Auth');

    const { error } = await supabase.from('users_profiles').insert({
      id: userId,
      nome: String(nome).trim(),
      email: emailNorm,
      tipo,
      permissao,
      senha: null,
    });
    if (error) {
      await supabase.auth.admin.deleteUser(userId);
      throw error;
    }

    res.json({ ok: true, message: 'Usuário criado com sucesso', usuario: { id: userId, nome, email: emailNorm, tipo, permissao } });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ ok: false, message: `Erro ao criar usuário: ${error.message}` });
  }
});

app.put('/api/usuarios/:email', requireAuth, requireAdmin, async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase().trim();
    const { nome, senha, tipo, permissao } = req.body;

    if (!nome || !tipo || !permissao) {
      return res.status(400).json({ ok: false, message: 'Nome, tipo e permissão são obrigatórios' });
    }

    const { data: target, error: targetError } = await supabase
      .from('users_profiles')
      .select('id,email')
      .eq('email', email)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) return res.status(404).json({ ok: false, message: 'Usuário não encontrado' });

    const patch = { nome: String(nome).trim(), tipo, permissao };
    const { error } = await supabase.from('users_profiles').update(patch).eq('id', target.id);
    if (error) throw error;

    const authPatch = {
      user_metadata: { nome: patch.nome, tipo: patch.tipo, permissao: patch.permissao },
    };
    if (senha && String(senha).trim()) authPatch.password = String(senha).trim();
    const { error: authError } = await supabase.auth.admin.updateUserById(target.id, authPatch);
    if (authError) throw authError;

    res.json({ ok: true, message: 'Usuário atualizado com sucesso', usuario: { id: target.id, email, ...patch } });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ ok: false, message: `Erro ao atualizar usuário: ${error.message}` });
  }
});

app.delete('/api/usuarios/:email', requireAuth, requireAdmin, async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).toLowerCase().trim();
    const { data: target, error: targetError } = await supabase
      .from('users_profiles')
      .select('id,email')
      .eq('email', email)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) return res.status(404).json({ ok: false, message: 'Usuário não encontrado' });

    const { error: authError } = await supabase.auth.admin.deleteUser(target.id);
    if (authError) throw authError;

    res.json({ ok: true, message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ ok: false, message: `Erro ao excluir usuário: ${error.message}` });
  }
});

app.post('/webhooks/ghl/conversion', async (req, res) => {
  const secretHeader = req.headers['x-webhook-secret'];
  const expectedSecret = process.env.GHL_WEBHOOK_SECRET;

  if (expectedSecret && secretHeader !== expectedSecret) {
    return res.status(401).json({ ok: false, message: 'Webhook não autorizado' });
  }

  try {
    const payload = req.body || {};
    const rawString = JSON.stringify(payload);
    const hash = crypto.createHash('sha256').update(rawString).digest('hex');

    const { data: alreadyProcessed } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('idempotency_key', hash)
      .maybeSingle();

    if (alreadyProcessed) {
      return res.json({ ok: true, message: 'Evento já processado' });
    }

    const { data: eventRow, error: eventError } = await supabase
      .from('webhook_events')
      .insert({
        source: 'ghl',
        event_type: payload.type || 'conversion',
        payload,
        headers: {
          'user-agent': req.headers['user-agent'] || '',
          'x-webhook-secret': secretHeader ? 'present' : 'missing',
        },
        idempotency_key: hash,
        status: 'received',
      })
      .select('*')
      .single();

    if (eventError) throw eventError;

    const atendente = extractGhlAtendenteFromPayload(payload);
    const referral = await findReferralForConversionWebhook(supabase, payload);

    if (referral) {
      const indicatorPatch = await resolveIndicatorPatchFromWebhookPayload(supabase, referral, payload);
      const indicatorIdForConversion = indicatorPatch.indicator_id ?? referral.indicator_id;

      await supabase.from('conversions').insert({
        referral_id: referral.id,
        indicator_id: indicatorIdForConversion,
        atendente_nome: atendente,
        webhook_event_id: eventRow.id,
        payload,
      });

      const timeline = Array.isArray(referral.log_status) ? [...referral.log_status] : [];
      const now = getSaoPauloISODate();
      timeline.push({ status: 'Fechado', data: now, origem: 'webhook-ghl' });

      const promotorWebhook = extractPromotorNomeFromGhlPayload(payload);
      const promotorFinal =
        promotorWebhook || (referral.promotor_nome && String(referral.promotor_nome).trim()) || null;

      const updatePayload = {
        status: 'Fechado',
        fechado_em: now,
        log_status: timeline,
        promotor_nome: promotorFinal,
        ...indicatorPatch,
      };
      if (atendente) updatePayload.responsavel_nome = atendente;

      await supabase.from('referrals').update(updatePayload).eq('id', referral.id);

      await writeAuditLog('conversion_received', 'referral', referral.id, { webhookEventId: eventRow.id }, 'success');
    }

    await supabase.from('webhook_events').update({ status: 'processed' }).eq('id', eventRow.id);

    res.json({ ok: true, message: 'Webhook processado com sucesso' });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ ok: false, message: `Erro ao processar webhook: ${error.message}` });
  }
});

async function startServer() {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log('✅ Backend usando Supabase + GHL');
  });
}

if (process.env.VERCEL) {
  module.exports = app;
} else {
  startServer().catch((error) => {
    console.error('Falha ao iniciar servidor:', error);
    process.exit(1);
  });
}
