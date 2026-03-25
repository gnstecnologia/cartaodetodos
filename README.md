# Cartão de Todos — Plataforma de Indicação

Plataforma de indicação com frontend em HTML/CSS/JS, backend em Node/Express e persistência em Supabase. O CRM interno foi descontinuado: o fluxo comercial agora integra com GHL (GoHighLevel).

## Requisitos

- Node.js 18+
- Projeto Supabase configurado
- Token da API GHL da subconta

## Rodar localmente

```bash
git clone https://github.com/gnstecnologia/cartaodetodos.git
cd cartaodetodos
npm install
cp .env.example .env
```

Preencha o `.env` e rode:

```bash
npm start
# ou
npm run dev
```

Acesse `http://localhost:3000`.

## Variáveis de ambiente

Veja o arquivo [`.env.example`](.env.example).

Blocos principais:

- **Supabase**: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_PUBLISHABLE_KEY`
- **GHL**: `GHL_API_TOKEN`, `GHL_LOCATION_ID`, `GHL_PIPELINE_ID`, `GHL_STAGE_ID_INITIAL`, campos customizados (`GHL_FIELD_ID_*`), `GHL_WEBHOOK_SECRET`
- **Auth/Cookies**: `AUTH_COOKIE_MAX_AGE_SECONDS`, `AUTH_COOKIE_SECURE`
- **App**: `LANDING_BASE_URL`, `PORT`

O backend **não usa mais Google Sheets**; dados vêm só do Supabase.

## Autenticação e autorização

- Login do painel usa **Supabase Auth** via backend (`/api/auth/login`, `/api/auth/me`, `/api/auth/logout`).
- Sessão é mantida em cookie `HttpOnly` (não acessível por JavaScript do browser).
- Autorização de dados é aplicada no banco com **RLS** (políticas em migration de auth/RLS).
- Gestão de usuários é restrita a admin (`/api/usuarios`), sem exposição de senha.

## Banco (Supabase)

1. Aplicar os SQLs em ordem:
   - [supabase/migrations/20260325_initial_schema.sql](supabase/migrations/20260325_initial_schema.sql)
   - [supabase/migrations/20260325_auth_rls_upgrade.sql](supabase/migrations/20260325_auth_rls_upgrade.sql)
2. (Opcional) popular dados de demonstração (script em `tools/seed-supabase.js`):

```bash
npm run seed
```

Para apagar indicadores, indicações, logs GHL/webhook/auditoria e **manter só** `users_profiles` (script em `tools/clear-data-supabase.js`):

```bash
npm run clear-data
```

## Webhook de conversão GHL

Endpoint:

- `POST /webhooks/ghl/conversion`

Validação por segredo:

- Header `x-webhook-secret` deve bater com `GHL_WEBHOOK_SECRET`.

## Documentação

- [docs/DEPLOY.md](docs/DEPLOY.md)
- [docs/CONFIGURAR_SSL.md](docs/CONFIGURAR_SSL.md)
- [docs/REFERENCIAS-ARQUIVOS.md](docs/REFERENCIAS-ARQUIVOS.md)

## Observação de segurança

As credenciais previamente expostas devem ser rotacionadas antes de produção (Supabase e GHL).
