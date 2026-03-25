require('dotenv').config();

const crypto = require('crypto');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { supabase, supabaseUrl } = require('./services/supabase/client');
const { sendLeadToGhl } = require('./services/ghl/client');
const { writeAuditLog } = require('./services/logs/audit');

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
        rel === 'dashboard.html'
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
  if (raw === 'nova indicação' || raw === 'nova indicacao') return 'Nova Indicação';
  if (raw === 'em contato') return 'Em Contato';
  if (raw === 'em negociação' || raw === 'em negociacao') return 'Em Negociação';
  if (raw === 'fechado' || raw === 'ganho') return 'Fechado';
  if (raw === 'perdido') return 'Perdido';
  return value;
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
    const { nome, telefone, codigoIndicacao } = req.body;

    if (!nome || !telefone) {
      return res.status(400).json({ ok: false, message: 'Nome e telefone são obrigatórios' });
    }

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

    const { data: referral, error } = await supabase
      .from('referrals')
      .insert({
        nome: String(nome).trim(),
        telefone: String(telefone).trim(),
        indicator_id: indicator?.id || null,
        codigo_indicacao: indicator?.code || String(codigoIndicacao || '').trim() || null,
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

    let query = db
      .from('referrals')
      .select('id,nome,telefone,codigo_indicacao,origem,status,data_hora,data_criacao_iso,log_status,indicator_id,created_at');

    if (dataInicio) {
      query = query.gte('created_at', `${dataInicio}T00:00:00.000Z`);
    }
    if (dataFim) {
      query = query.lte('created_at', `${dataFim}T23:59:59.999Z`);
    }

    const { data: referrals, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

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

    const indicacoes = (referrals || []).map((row) => ({
      id: row.id,
      nome: row.nome,
      telefone: row.telefone,
      codigoIndicacao: row.codigo_indicacao || '',
      origem: row.origem || '',
      status: normalizeStatus(row.status),
      dataHora: row.data_hora || formatBrazilianDateTime(row.data_criacao_iso || row.created_at),
      logStatus: Array.isArray(row.log_status) ? row.log_status : [],
    }));

    res.json({
      ok: true,
      indicacoes,
      indicadores: indicators,
      indicadoresList,
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

    let query = db
      .from('referrals')
      .select('id,nome,telefone,status,data_hora,codigo_indicacao,responsavel_nome,indicator_id,created_at');

    if (dataInicio) query = query.gte('created_at', `${dataInicio}T00:00:00.000Z`);
    if (dataFim) query = query.lte('created_at', `${dataFim}T23:59:59.999Z`);

    const { data: referrals, error } = await query;
    if (error) throw error;

    const { data: indicatorsData } = await db.from('indicators').select('id,nome,code');
    const indicatorById = new Map((indicatorsData || []).map((i) => [i.id, i]));

    const VALOR_PLANO = 59.99;
    const grouped = new Map();

    (referrals || []).forEach((lead) => {
      const key = (lead.responsavel_nome || 'Sem atendente').trim();
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
        dataHora: lead.data_hora || formatBrazilianDateTime(lead.created_at),
        promotor: indicator?.nome || lead.codigo_indicacao || '',
        vendedor: key,
      });
    });

    const promotores = [...grouped.values()].map((p) => {
      const leadsFechados = p.leadsPorStatus.Fechado || 0;
      const valorGerado = Number((leadsFechados * VALOR_PLANO).toFixed(2));
      const taxaConversao = p.totalLeads ? Number(((leadsFechados / p.totalLeads) * 100).toFixed(1)) : 0;
      const taxaPerda = p.totalLeads ? Number((((p.leadsPorStatus.Perdido || 0) / p.totalLeads) * 100).toFixed(1)) : 0;

      return {
        nome: p.nome,
        totalLeads: p.totalLeads,
        leadsPorStatus: p.leadsPorStatus,
        leadsFechados,
        valorGerado,
        taxaConversao,
        taxaPerda,
        indicadores: [...p.indicadores].sort(),
        leads: p.leads,
      };
    });

    promotores.sort((a, b) => b.valorGerado - a.valorGerado || b.totalLeads - a.totalLeads);

    res.json({ ok: true, promotores, valorPlano: VALOR_PLANO });
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

    const timeline = Array.isArray(lead.log_status) ? lead.log_status : [];

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
    const db = req.userClient;
    const { nome, telefone, chavePix } = req.body;
    if (!nome || !telefone || !chavePix) {
      return res.status(400).json({ ok: false, message: 'Nome, Telefone e Chave Pix são obrigatórios' });
    }

    const code = await generateUniqueIndicatorCode(db);
    const url = `${DEFAULT_LANDING_BASE_URL}/?codigo=${encodeURIComponent(code)}`;

    const { data, error } = await db
      .from('indicators')
      .insert({
        nome: String(nome).trim(),
        telefone: String(telefone).trim(),
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

    const contactId = payload.contactId || payload.contact?.id || payload.data?.contactId || null;
    const atendente = payload.userName || payload.assignedTo || payload.data?.assignedTo || null;
    const indicadorCode = payload.customData?.indicatorCode || payload.indicatorCode || null;

    let referral = null;
    if (contactId) {
      const { data: refMap } = await supabase
        .from('ghl_contacts')
        .select('referral_id')
        .eq('ghl_contact_id', String(contactId))
        .maybeSingle();

      if (refMap?.referral_id) {
        const { data: refData } = await supabase.from('referrals').select('*').eq('id', refMap.referral_id).maybeSingle();
        referral = refData || null;
      }
    }

    if (!referral && indicadorCode) {
      const { data: candidate } = await supabase
        .from('referrals')
        .select('*')
        .eq('codigo_indicacao', String(indicadorCode))
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      referral = candidate || null;
    }

    if (referral) {
      await supabase.from('conversions').insert({
        referral_id: referral.id,
        indicator_id: referral.indicator_id,
        atendente_nome: atendente,
        webhook_event_id: eventRow.id,
        payload,
      });

      const timeline = Array.isArray(referral.log_status) ? [...referral.log_status] : [];
      const now = getSaoPauloISODate();
      timeline.push({ status: 'Fechado', data: now, origem: 'webhook-ghl' });

      await supabase.from('referrals').update({
        status: 'Fechado',
        responsavel_nome: atendente,
        fechado_em: now,
        log_status: timeline,
      }).eq('id', referral.id);

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
