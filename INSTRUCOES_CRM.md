# Instruções para o CRM Kanban

## O que foi criado

Um sistema completo de CRM em formato Kanban integrado ao dashboard existente, com as seguintes funcionalidades:

### Funcionalidades

1. **5 Colunas de Status:**
   - Nova Indicação
   - Em Contato
   - Em Negociação
   - Fechado
   - Perdido

2. **Drag and Drop:**
   - Arraste cards entre colunas para atualizar o status
   - Atualização automática na planilha do Google Sheets

3. **Informações nos Cards:**
   - Nome do lead
   - Nome do promotor
   - Telefone
   - Data da indicação

4. **Integração:**
   - Mesma autenticação do dashboard
   - Navegação entre Dashboard e CRM
   - Sincronização automática com a planilha

## Como Configurar

### 1. Atualizar Google Apps Script

Copie e cole as seguintes funções no seu Google Apps Script:

1. **Função `doPost` atualizada** (substitui a existente)
2. **Função `doPostOriginal`** (renomeada da função doPost original)
3. **Função `updateLeadStatus`** (nova função para atualizar status)
4. **Atualizar `getDashboardData`** para incluir a coluna Status

Todas essas funções estão no arquivo `google-apps-script-dashboard.js`.

### 2. Estrutura da Planilha

A aba "Leads" agora precisa ter uma coluna adicional:

| Coluna | Nome | Descrição |
|--------|------|-----------|
| A | Data/Hora | Data e hora da indicação |
| B | Nome | Nome do lead |
| C | Telefone | Telefone do lead |
| D | Código de Indicação | Código do promotor |
| E | Origem | Origem da indicação |
| **F** | **Status** | **Status do lead (Nova Indicação, Em Contato, etc.)** |

**Nota:** O sistema adiciona automaticamente a coluna "Status" se ela não existir. Novos leads são criados com status "Nova Indicação" por padrão.

### 3. Acessar o CRM

1. Acesse: `https://seusite.com/crm.html`
2. Use a mesma senha do dashboard
3. Os leads aparecerão automaticamente nas colunas corretas

## Como Usar

### Visualizar Leads

- Os leads são carregados automaticamente da planilha
- Cada lead aparece em um card na coluna correspondente ao seu status
- O contador no topo de cada coluna mostra quantos leads há em cada status

### Atualizar Status

1. **Arraste o card** da coluna atual para a nova coluna desejada
2. O status será atualizado automaticamente na planilha
3. O card aparecerá na nova coluna
4. Os contadores serão atualizados automaticamente

### Navegação

- **Botão "Dashboard"**: Volta para o dashboard de indicações
- **Botão "Atualizar"**: Recarrega os dados do CRM
- **Botão "Sair"**: Faz logout do sistema

## Status Disponíveis

| Status | Descrição |
|--------|-----------|
| Nova Indicação | Lead recém-cadastrado (padrão) |
| Em Contato | Lead em processo de contato |
| Em Negociação | Lead em negociação |
| Fechado | Lead convertido/fechado |
| Perdido | Lead perdido/desistente |

## Importante

1. **Coluna Status**: O sistema cria automaticamente a coluna "Status" se não existir
2. **Novos Leads**: Todos os novos leads começam com status "Nova Indicação"
3. **Sincronização**: As mudanças são salvas imediatamente na planilha
4. **IDs dos Leads**: Cada lead recebe um ID único baseado na sua posição na planilha

## Resolução de Problemas

### Leads não aparecem no CRM

- Verifique se a coluna "Status" existe na planilha
- Certifique-se de que os dados estão na aba "Leads"
- Clique em "Atualizar" para recarregar

### Status não atualiza

- Verifique se o Google Apps Script foi atualizado corretamente
- Verifique se a função `updateLeadStatus` está presente
- Verifique os logs do Google Apps Script para erros

### Cards não movem

- Certifique-se de que o JavaScript está carregado corretamente
- Verifique o console do navegador para erros
- Tente recarregar a página

