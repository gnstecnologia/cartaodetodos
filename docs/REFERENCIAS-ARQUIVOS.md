# Mapa de arquivos em uso

O servidor ([`server.js`](../server.js)) usa `express.static` na raiz do repositório para HTML, CSS, imagens e [`scripts/`](../scripts/) (JS do browser). **Não** são expostos por HTTP os prefixos `/tools/`, `/services/`, `/supabase/` nem `/.env` (middleware devolve 404).

## Páginas HTML

| Arquivo | Uso |
|---------|-----|
| `index.html` | Landing; redireciona para `obrigado.html` após envio do formulário. |
| `obrigado.html` | Obrigado pós-lead. |
| `dashboard.html` | Dashboard principal. |
| `dashboard-promotores.html` | Dashboard de promotores. |
| `indicadores.html` | Indicadores. |
| `indicados.html` | Detalhe por indicador (query string). |
| `promotores.html` | Lista de promotores. |
| `promotor-detalhes.html` | Detalhe de promotor. |
| `gerar-indicador.html` | Fluxo gerar indicador. |
| `usuarios.html` | Usuários (admin). |

## Scripts frontend (`scripts/`)

Cada `.js` é carregado por pelo menos uma página:

| Script | Página(s) típica(s) |
|--------|----------------------|
| `form-handler.js` | `index.html` |
| `dashboard.js` | `dashboard.html` |
| `dashboard-promotores.js` | `dashboard-promotores.html` |
| `indicadores.js` | `indicadores.html` |
| `indicados.js` | `indicados.html` |
| `promotores.js` | `promotores.html` |
| `promotor-detalhes.js` | `promotor-detalhes.html` |
| `gerar-indicador.js` | `gerar-indicador.html` |
| `usuarios.js` | `usuarios.html` |
| `auth.js` | Sessão via `/api/auth/*` para páginas autenticadas |
| `user-profile.js` | Várias páginas autenticadas |
| `mobile-menu.js` | `dashboard.html`, `dashboard-promotores.html` |
| `export-utils.js` | Páginas com exportação |

## Ferramentas Node (`tools/`)

Scripts executados com `npm run` (não são servidos pelo Express):

| Arquivo | Uso |
|---------|-----|
| [`tools/seed-supabase.js`](../tools/seed-supabase.js) | Dados demo no Supabase (`npm run seed`) |
| [`tools/clear-data-supabase.js`](../tools/clear-data-supabase.js) | Limpa tabelas de negócio mantendo `users_profiles` (`npm run clear-data`) |

## Backend (`services/`)

| Caminho | Uso |
|---------|-----|
| [`services/supabase/client.js`](../services/supabase/client.js) | Cliente Supabase no servidor |
| [`services/ghl/client.js`](../services/ghl/client.js) | Envio de leads ao GHL |
| [`services/logs/audit.js`](../services/logs/audit.js) | Registro de auditoria |

## Estáticos na raiz

| Arquivo | Referência |
|---------|------------|
| `styles.css` | Todas as páginas principais |
| `LOGO.webp` | Layout / nav |
| `faviconV2.png` | Favicon e ícones |
| `BACKGROUND-HERO.webp` | `styles.css`, `dashboard.html` |
| `IMAGEM LADO DA HEADLINE.png` | `index.html`, `obrigado.html` |

## Supabase (schema no repositório)

| Caminho | Uso |
|---------|-----|
| [`supabase/migrations/`](../supabase/migrations/) | SQL aplicado no painel Supabase (não lido pelo Node em runtime) |

## Infra e deploy

| Caminho | Uso |
|---------|-----|
| [`deploy/nginx-cartaodetodos.conf`](../deploy/nginx-cartaodetodos.conf) | Modelo de site Nginx na VPS |
| [`deploy/setup-nginx-ssl.sh`](../deploy/setup-nginx-ssl.sh) | Setup SSL/Nginx (executar na VPS) |
| [`deploy/limpar-vps.sh`](../deploy/limpar-vps.sh) | Limpeza pós-deploy (GitHub Actions / manual) |
| [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) | CI deploy |

Este mapa reflete a estrutura atual: backend Node/Express com dados no Supabase, integração GHL, JS de browser em `scripts/` e utilitários em `tools/`.
