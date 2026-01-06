# Cartão de Todos - Sistema de Gestão

Sistema completo de gestão para o programa de indicação Cartão de Todos, incluindo CRM, dashboards administrativos e gerenciamento de usuários.

## 🚀 Funcionalidades

- **Landing Page**: Captura de leads com integração ao Google Sheets
- **CRM**: Gerenciamento visual de leads em formato Kanban
- **Dashboards**: Visualização de métricas e indicadores
- **Gerenciamento de Promotores**: Controle de promotores e seus leads
- **Sistema de Usuários**: Autenticação e controle de permissões
- **Exportação de Dados**: Exportação em CSV, Excel e TXT

## 📋 Requisitos

- Node.js 18+ 
- npm ou yarn
- Google Sheets API configurada
- Servidor VPS com PM2 (para produção)

## ⚙️ Instalação

1. Clone o repositório:
```bash
git clone https://github.com/gnstecnologia/cartaodetodos.git
cd cartaodetodos
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente criando um arquivo `.env`:
```env
SPREADSHEET_ID=seu_spreadsheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=seu_service_account@email.com
GOOGLE_PRIVATE_KEY="sua_chave_privada"
GOOGLE_SHEETS_LEADS_SHEET=Leads
GOOGLE_SHEETS_PROMOTORES_SHEET=Promotores
GOOGLE_SHEETS_USUARIOS_SHEET=Usuarios
PORT=3000
```

4. Inicie o servidor:
```bash
npm start
# ou para desenvolvimento
npm run dev
```

O sistema estará disponível em `http://localhost:3000`

## 🔐 Usuários Padrão

- **Admin**: `admin@cartaodetodos.com.br` / `admin123`
- **Coordenador**: `coordenador@cartaodetodos.com.br` / `coordenador123`
- **Gerente**: `gerente@cartaodetodos.com.br` / `gerente123`

⚠️ **IMPORTANTE**: Altere as senhas padrão após o primeiro acesso!

## 📁 Estrutura do Projeto

```
cartaodetodos/
├── scripts/           # Scripts JavaScript do frontend
├── .github/
│   └── workflows/     # GitHub Actions para deploy
├── server.js          # Servidor Node.js/Express
├── package.json       # Dependências do projeto
└── *.html            # Páginas da aplicação
```

## 🚢 Deploy

O deploy é automatizado via GitHub Actions. A cada push na branch `main`, o sistema é automaticamente deployado na VPS.

### Variáveis necessárias no GitHub Secrets:

- `SSH_PRIVATE_KEY`: Chave SSH privada para acesso à VPS
- `SSH_USER`: Usuário SSH da VPS
- `SERVER_IP`: IP do servidor
- `TARGET_DIR`: Diretório de destino (padrão: `/var/www/cartaodetodos`)

## 📝 Páginas do Sistema

- `/` - Landing page
- `/dashboard.html` - Dashboard principal
- `/crm.html` - CRM (gerenciamento de leads)
- `/promotores.html` - Lista de promotores
- `/indicadores.html` - Indicadores e métricas
- `/usuarios.html` - Gerenciamento de usuários (admin only)

## 🛠️ Tecnologias

- **Backend**: Node.js, Express
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Storage**: Google Sheets API
- **Process Manager**: PM2
- **Deploy**: GitHub Actions

## 📄 Licença

Este projeto é proprietário.

## 👥 Suporte

Para suporte, entre em contato com a equipe de desenvolvimento.
