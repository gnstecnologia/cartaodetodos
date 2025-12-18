# Instruções para Configurar o Dashboard

## Passo 1: Adicionar Função no Google Apps Script

Abra seu Google Apps Script e adicione esta nova função:

```javascript
function doGet(e) {
  // Verifica se é uma requisição para buscar dados do dashboard
  if (e.parameter.action === 'getData') {
    return getDashboardData();
  }
  
  // Retorna erro se não for uma ação válida
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, message: 'Ação não encontrada' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getDashboardData() {
  try {
    const SPREADSHEET_ID = '1LEUBhIGrXZ5A_WUyvof-47iwd1P-5-DpIw2BcO-k9yY';
    const SHEET_NAME = 'Leads';

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          ok: false, 
          message: 'Planilha não encontrada' 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Pega todos os dados da planilha
    const data = sheet.getDataRange().getValues();
    
    // Pula o cabeçalho (primeira linha)
    const headers = data[0];
    const rows = data.slice(1);

    // Encontra os índices das colunas
    const nomeIndex = headers.indexOf('Nome');
    const telefoneIndex = headers.indexOf('Telefone');
    const codigoIndex = headers.indexOf('Código de Indicação');
    const dataIndex = headers.indexOf('Data/Hora');
    const origemIndex = headers.indexOf('Origem');

    // Converte para array de objetos
    const indicacoes = rows.map((row) => {
      return {
        nome: nomeIndex >= 0 ? row[nomeIndex] : '',
        telefone: telefoneIndex >= 0 ? row[telefoneIndex] : '',
        codigoIndicacao: codigoIndex >= 0 ? (row[codigoIndex] || 'Sem código') : 'Sem código',
        dataHora: dataIndex >= 0 ? row[dataIndex] : '',
        origem: origemIndex >= 0 ? row[origemIndex] : '',
      };
    });

    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        indicacoes: indicacoes,
        total: indicacoes.length
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('Erro ao buscar dados:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: false, 
        message: 'Erro ao buscar dados: ' + error.message 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

## Passo 2: Publicar como Web App

1. No Google Apps Script, clique em "Publicar" > "Implantar como aplicativo da web"
2. Selecione:
   - **Executar como**: Eu mesmo
   - **Quem tem acesso**: Qualquer pessoa, mesmo anônimo
3. Clique em "Implantar"
4. Copie a URL gerada

## Passo 3: Atualizar URL no Dashboard

Abra o arquivo `scripts/dashboard.js` e atualize a constante `DATA_ENDPOINT` com a URL que você copiou, adicionando `?action=getData` no final.

Exemplo:
```javascript
const DATA_ENDPOINT = 'SUA_URL_AQUI/exec?action=getData';
```

## Passo 4: Alterar Senha do Dashboard

No arquivo `scripts/dashboard.js`, altere a constante `DASHBOARD_PASSWORD`:

```javascript
const DASHBOARD_PASSWORD = 'SUA_SENHA_AQUI';
```

## Acesso ao Dashboard

Acesse: `https://seusite.com/dashboard.html`

Digite a senha configurada para visualizar os dados.

