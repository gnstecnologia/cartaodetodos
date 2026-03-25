# Deploy na VPS

## Fluxo automático (GitHub Actions)

A cada push na `main`, o workflow em `.github/workflows/deploy.yml`:

1. conecta por SSH na VPS
2. atualiza o repositório (`git fetch` + `git reset --hard origin/main`)
3. executa `npm install --production`
4. roda `deploy/limpar-vps.sh`
5. recarrega Nginx se `deploy/nginx-cartaodetodos.conf` existir
6. reinicia PM2 (`cartaodetodos`)

## Secrets obrigatórios (GitHub)

- `SSH_PRIVATE_KEY`
- `SSH_USER`
- `SERVER_IP`
- `TARGET_DIR` (opcional, padrão `/var/www/cartaodetodos`)

## Variáveis obrigatórias na VPS (`.env`)

### Supabase

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

### GHL

- `GHL_API_BASE_URL` (`https://services.leadconnectorhq.com`)
- `GHL_API_TOKEN`
- `GHL_API_VERSION` (`2021-04-15`)
- `GHL_LOCATION_ID`
- `GHL_PIPELINE_ID`
- `GHL_STAGE_ID_INITIAL`
- `GHL_FIELD_ID_INDICATOR_CODE`
- `GHL_FIELD_ID_INDICATOR_NAME`
- `GHL_TAGS_DEFAULT`
- `GHL_INITIAL_MESSAGE_TEMPLATE`
- `GHL_WEBHOOK_SECRET`

### App

- `LANDING_BASE_URL`
- `PORT`

## Webhook GHL (conversão)

- URL: `https://SEU_DOMINIO/webhooks/ghl/conversion`
- método: `POST`
- header de segurança recomendado: `x-webhook-secret: <seu_segredo>`

## SQL de banco

Antes do primeiro deploy com Supabase, aplique:

- `supabase/migrations/20260325_initial_schema.sql`

Dados de demo (opcional), no servidor com `.env` preenchido:

```bash
npm run seed
```

## SSL / Nginx

Guia: [CONFIGURAR_SSL.md](./CONFIGURAR_SSL.md)

Comandos:

```bash
cd /var/www/cartaodetodos
sudo bash deploy/setup-nginx-ssl.sh
```

## Pós-deploy (smoke test)

1. `GET /api/health`
2. criar indicador em `/gerar-indicador.html`
3. enviar lead pela landing
4. confirmar registros no Supabase
5. validar recebimento de webhook de conversão
