// Script de teste para verificar conexão com Google Sheets
require('dotenv').config();
const { google } = require('googleapis');

async function testConnection() {
  try {
    console.log('🔍 Testando conexão com Google Sheets...\n');

    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const spreadsheetId = process.env.SPREADSHEET_ID;

    if (!serviceAccountEmail || !privateKey || !spreadsheetId) {
      console.error('❌ Variáveis de ambiente não configuradas!');
      console.error('Verifique se o arquivo .env existe e está preenchido corretamente.');
      process.exit(1);
    }

    console.log('📋 Configurações:');
    console.log(`   Service Account: ${serviceAccountEmail}`);
    console.log(`   Planilha ID: ${spreadsheetId}\n`);

    // Autenticação
    const auth = new google.auth.JWT(
      serviceAccountEmail,
      null,
      privateKey,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });

    // Testa leitura da planilha
    console.log('📖 Testando leitura da planilha...');
    const response = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
    });

    console.log(`✅ Planilha encontrada: "${response.data.properties.title}"\n`);

    // Lista as abas
    console.log('📑 Abas encontradas:');
    response.data.sheets.forEach((sheet, index) => {
      console.log(`   ${index + 1}. ${sheet.properties.title}`);
    });

    // Testa leitura da aba Leads
    const leadsSheet = process.env.GOOGLE_SHEETS_LEADS_SHEET || 'Leads';
    console.log(`\n📊 Testando leitura da aba "${leadsSheet}"...`);
    
    try {
      const valuesResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: `${leadsSheet}!A1:G1`,
      });

      if (valuesResponse.data.values && valuesResponse.data.values.length > 0) {
        const headers = valuesResponse.data.values[0];
        console.log('✅ Cabeçalhos encontrados:');
        headers.forEach((header, index) => {
          console.log(`   ${String.fromCharCode(65 + index)}: ${header || '(vazio)'}`);
        });
      } else {
        console.log('⚠️  Nenhum cabeçalho encontrado (planilha pode estar vazia)');
      }
    } catch (error) {
      if (error.message.includes('Unable to parse range')) {
        console.log(`⚠️  Aba "${leadsSheet}" não encontrada ou vazia`);
      } else {
        throw error;
      }
    }

    // Testa leitura da aba Promotor
    const promotorSheet = process.env.GOOGLE_SHEETS_PROMOTOR_SHEET || 'Promotor';
    console.log(`\n👥 Testando leitura da aba "${promotorSheet}"...`);
    
    try {
      const valuesResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: `${promotorSheet}!A1:D1`,
      });

      if (valuesResponse.data.values && valuesResponse.data.values.length > 0) {
        const headers = valuesResponse.data.values[0];
        console.log('✅ Cabeçalhos encontrados:');
        headers.forEach((header, index) => {
          console.log(`   ${String.fromCharCode(65 + index)}: ${header || '(vazio)'}`);
        });
      } else {
        console.log('⚠️  Nenhum cabeçalho encontrado (planilha pode estar vazia)');
      }
    } catch (error) {
      if (error.message.includes('Unable to parse range')) {
        console.log(`⚠️  Aba "${promotorSheet}" não encontrada ou vazia`);
      } else {
        throw error;
      }
    }

    console.log('\n✅ Conexão testada com sucesso!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Certifique-se de que a planilha está compartilhada com:');
    console.log(`      ${serviceAccountEmail}`);
    console.log('   2. Execute: npm start');
    console.log('   3. Acesse: http://localhost:3000/api/health');

  } catch (error) {
    console.error('\n❌ Erro ao testar conexão:');
    console.error(`   ${error.message}\n`);

    if (error.message.includes('PERMISSION_DENIED')) {
      console.error('💡 Solução:');
      console.error('   1. Abra a planilha no Google Sheets');
      console.error('   2. Clique em "Compartilhar"');
      console.error(`   3. Adicione: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`);
      console.error('   4. Dê permissão de "Editor"');
    } else if (error.message.includes('UNAUTHENTICATED')) {
      console.error('💡 Solução:');
      console.error('   Verifique se as credenciais no .env estão corretas');
    }

    process.exit(1);
  }
}

testConnection();

