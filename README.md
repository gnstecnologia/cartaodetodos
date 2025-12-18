# Landing Page Cartão de Todos

Projeto em Node.js + HTML/CSS para divulgar o Cartão de Todos e captar leads.

## Fluxo principal

- `index.html`, `styles.css` e `scripts/form-handler.js` compõem a landing page estática.
- O formulário envia dados via `POST` para um endpoint externo (ex.: Google Apps Script) definido em `scripts/form-handler.js`.
- O endpoint externo fica responsável por:
  - Encaminhar o lead para o webhook desejado.
  - Registrar a linha na planilha do Google Sheets usando a conta de serviço.

## Integrando com Google Apps Script

1. Crie um novo projeto em [script.google.com](https://script.google.com).
2. Cole um código semelhante ao exemplo abaixo:
   ```javascript
   const WEBHOOK_URL = 'https://backend.kukuna.com.br/webhook/...';
   const SPREADSHEET_ID = '1XIFm-gc_bYHLOWzzXrfDHEIPx0WjXtoOYv3TLKPtwjg';
   const SHEET_NAME = 'Leads';

   function doPost(e) {
     const data = JSON.parse(e.postData.contents);

     // 1. Enviar dados ao webhook
     UrlFetchApp.fetch(WEBHOOK_URL, {
       method: 'post',
       contentType: 'application/json',
       payload: JSON.stringify(data),
       muteHttpExceptions: true,
     });

     // 2. Registrar na planilha
     const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
     sheet.appendRow([
       new Date(),
       data.nome,
       data.telefone,
       data.codigoIndicacao,
     ]);

     return ContentService.createTextOutput(
       JSON.stringify({ message: 'Cadastro enviado com sucesso!', status: 'ok' })
     ).setMimeType(ContentService.MimeType.JSON);
   }
   ```
3. Clique em **Implantar > Nova implantação**, escolha **Aplicativo da Web** e permita acesso para “Qualquer pessoa”.
4. Copie a URL gerada da implantação.
5. No arquivo `scripts/form-handler.js`, atualize a constante `endpoint` (ou defina `window.LANDING_CONFIG.submitEndpoint`) com essa URL.

> Dica: se precisar usar a conta de serviço em vez do Apps Script, você pode hospedar a lógica em Cloud Run, Vercel Functions, Netlify Functions etc., desde que mantenha a API disponível para o front.

## Deploy em hospedagem estática (ex.: Hostinger)

1. Faça upload de `index.html`, `styles.css`, diretório `scripts/` e demais assets (imagens, favicon).
2. Certifique-se de que o endpoint configurado no front está acessível via HTTPS e com CORS liberado.
3. Abra a página publicada e faça um envio de teste; verifique o webhook e a planilha.

## Notas sobre a versão Node

O diretório `server/` mantém a implementação original em Node/Express para quem preferir rodar tudo em um backend próprio. Caso opte por ela:

1. `npm install`
2. Configurar `.env` conforme descrições anteriores.
3. `npm start` e acessar `http://localhost:3000`.

## Próximos passos sugeridos

- Proteger o webhook (tokens/segredos) se estiver público.
- Adicionar monitoramento/alerta em caso de erro no Apps Script.
- Configurar deploy automatizado (Git FTP, CI/CD) conforme necessidade.

