/**
 * Migra credenciais de users_profiles (legado) para Supabase Auth (auth.users).
 *
 * Objetivos:
 * - Criar usuários no Supabase Auth usando users_profiles.senha (apenas se não existirem).
 * - Atualizar users_profiles.id para o auth user id (para compatibilidade com RLS e requireAuth).
 * - Opcionalmente zerar users_profiles.senha após sincronizar.
 *
 * Uso:
 *   node tools/migrate-users-to-supabase-auth.js
 *
 * Requer:
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_KEY no .env');
  process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data: profiles, error } = await sb
    .from('users_profiles')
    .select('id,email,nome,tipo,permissao,senha')
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!profiles || profiles.length === 0) {
    console.log('Nenhum usuário encontrado em users_profiles.');
    return;
  }

  let created = 0;
  let updated = 0;
  const rows = [];

  for (const p of profiles) {
    const email = String(p.email).trim().toLowerCase();
    if (!email) continue;

    // Ignora usuários sem senha legado (após migração completa, senha deve ficar null)
    if (!p.senha) {
      rows.push({ email, status: 'skip-sem-senha' });
      continue;
    }

    async function findAuthUserByEmail(targetEmail) {
      // Supabase-js (v2) neste projeto não expõe getUserByEmail; então paginamos.
      const perPage = 100;
      let page = 1;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const res = await sb.auth.admin.listUsers({ page, perPage });
        const users = res?.data?.users || [];
        const match = users.find((u) => String(u.email).toLowerCase() === targetEmail);
        if (match) return match;
        const lastPage = res?.data?.lastPage || 1;
        if (page >= lastPage) return null;
        page += 1;
      }
    }

    // Tenta buscar usuário no Supabase Auth
    let authUser = await findAuthUserByEmail(email);

    if (!authUser) {
      try {
        const createRes = await sb.auth.admin.createUser({
          email,
          password: String(p.senha),
          email_confirm: true,
          user_metadata: {
            nome: p.nome || '',
            tipo: p.tipo || 'promotor',
            permissao: p.permissao || 'usuario',
          },
        });
        authUser = createRes?.data?.user || null;
        if (!authUser) throw new Error(`Falha ao criar auth user para ${email}`);
        created += 1;
      } catch (e) {
        // Se já existir, busca novamente e segue
        authUser = await findAuthUserByEmail(email);
      }
    }

    if (!authUser) {
      throw new Error(`Não foi possível localizar/criar auth user para ${email}`);
    }

    const authId = authUser.id;

    const { error: updErr } = await sb
      .from('users_profiles')
      .update({
        id: authId,
        nome: p.nome || '',
        tipo: p.tipo || 'promotor',
        permissao: p.permissao || 'usuario',
        // Mantemos `senha` por enquanto porque a coluna pode ainda estar NOT NULL
        // (a migration de auth/RLS ajusta essa restrição e permite limpeza futura).
      })
      .eq('email', email);

    if (updErr) throw updErr;
    updated += 1;

    rows.push({
      email,
      authId,
      createdNew: !p.id || p.id !== authId,
    });
  }

  console.log('Migração users_profiles -> auth.users concluída:', { created, updated });
  console.log('Resumo por email (primeiros 20):', rows.slice(0, 20));
}

main().catch((e) => {
  console.error('Erro na migração:', e);
  process.exit(1);
});

