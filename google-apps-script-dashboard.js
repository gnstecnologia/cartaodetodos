// ============================================
// CÓDIGO COMPLETO PARA O GOOGLE APPS SCRIPT
// ============================================
// Copie e cole este código no seu Google Apps Script
// Adicione esta função junto com a função doPost existente

const WEBHOOK_URL = 'https://backend.kukuna.com.br/webhook/87/Gqj9E1Vm5zv9o7PULYMDuv78P9pNHXyClyKQFkcb6r';
const SPREADSHEET_ID = '1LEUBhIGrXZ5A_WUyvof-47iwd1P-5-DpIw2BcO-k9yY';
const SHEET_NAME = 'Leads';

// Função existente doPost (mantenha como está)
function doPost(e) {
  try {
    let payload = {};

    if (e.postData && e.postData.type === 'application/json') {
      payload = JSON.parse(e.postData.contents || '{}');
    } else if (e.parameter) {
      payload = {
        nome: e.parameter.nome,
        telefone: e.parameter.telefone,
        codigoIndicacao: e.parameter.codigoIndicacao,
      };
    }

    const body = {
      nome: payload.nome || '',
      telefone: payload.telefone || '',
      codigoIndicacao: payload.codigoIndicacao || '',
      recebidoEm: new Date().toISOString(),
      origem: 'landing-cartao-de-todos',
    };

    // Variáveis para rastrear o status
    let webhookStatus = null;
    let webhookResponseCode = null;
    let webhookError = null;
    let sheetStatus = null;

    // 1. Enviar para o webhook
    try {
      const webhookResponse = UrlFetchApp.fetch(WEBHOOK_URL, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(body),
        muteHttpExceptions: true,
      });
      
      webhookResponseCode = webhookResponse.getResponseCode();
      webhookStatus = webhookResponseCode >= 200 && webhookResponseCode < 300 ? 'sucesso' : 'erro';
      
      console.log('Webhook enviado:', {
        status: webhookResponseCode,
        nome: body.nome,
        telefone: body.telefone,
        codigoIndicacao: body.codigoIndicacao,
      });
    } catch (webhookErrorObj) {
      webhookStatus = 'erro';
      webhookError = webhookErrorObj.message;
      console.error('Erro ao enviar webhook:', webhookErrorObj);
    }

    // 2. Salvar na planilha do Google Sheets
    try {
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      let sheet = spreadsheet.getSheetByName(SHEET_NAME);
      
      if (!sheet) {
        sheet = spreadsheet.insertSheet(SHEET_NAME);
        sheet.getRange(1, 1, 1, 5).setValues([['Data/Hora', 'Nome', 'Telefone', 'Código de Indicação', 'Origem']]);
        sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
      }
      
      sheet.appendRow([
        new Date(),
        body.nome,
        body.telefone,
        body.codigoIndicacao,
        body.origem,
      ]);
      
      sheetStatus = 'sucesso';
      console.log('Planilha atualizada:', {
        nome: body.nome,
        telefone: body.telefone,
        codigoIndicacao: body.codigoIndicacao,
      });
    } catch (sheetError) {
      sheetStatus = 'erro';
      console.error('Erro ao salvar na planilha:', sheetError);
      return ContentService
        .createTextOutput(JSON.stringify({ 
          ok: false, 
          message: 'Erro ao salvar na planilha: ' + sheetError.message,
          webhookStatus: webhookStatus,
          webhookResponseCode: webhookResponseCode,
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Retorna resposta detalhada
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        status: 200,
        webhookStatus: webhookStatus,
        webhookResponseCode: webhookResponseCode,
        webhookError: webhookError,
        sheetStatus: sheetStatus,
        message: webhookStatus === 'sucesso' 
          ? 'Dados enviados com sucesso para webhook e planilha!' 
          : 'Dados salvos na planilha, mas houve problema no webhook',
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    console.error('Erro geral:', err);
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: false, 
        message: err.message 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// NOVA FUNÇÃO PARA O DASHBOARD
// ============================================
// Adicione esta função no seu Google Apps Script

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

function doPost(e) {
  // Verifica se é uma requisição para atualizar status do CRM
  // Pode vir como e.parameter (form data) ou e.postData (JSON)
  let action = null;
  if (e.parameter && e.parameter.action) {
    action = e.parameter.action;
  } else if (e.postData && e.postData.type === 'application/json') {
    try {
      const payload = JSON.parse(e.postData.contents || '{}');
      action = payload.action;
    } catch (err) {
      // Ignora erro de parse
    }
  }
  
  if (action === 'updateStatus') {
    return updateLeadStatus(e);
  }
  
  // Se não for updateStatus, usa a função doPost original para receber leads
  return doPostOriginal(e);
}

// Renomeia a função doPost original
function doPostOriginal(e) {
  try {
    let payload = {};

    if (e.postData && e.postData.type === 'application/json') {
      payload = JSON.parse(e.postData.contents || '{}');
    } else if (e.parameter) {
      payload = {
        nome: e.parameter.nome,
        telefone: e.parameter.telefone,
        codigoIndicacao: e.parameter.codigoIndicacao,
      };
    }

    const body = {
      nome: payload.nome || '',
      telefone: payload.telefone || '',
      codigoIndicacao: payload.codigoIndicacao || '',
      recebidoEm: new Date().toISOString(),
      origem: 'landing-cartao-de-todos',
    };

    // Variáveis para rastrear o status
    let webhookStatus = null;
    let webhookResponseCode = null;
    let webhookError = null;
    let sheetStatus = null;

    // 1. Enviar para o webhook
    try {
      const webhookResponse = UrlFetchApp.fetch(WEBHOOK_URL, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(body),
        muteHttpExceptions: true,
      });
      
      webhookResponseCode = webhookResponse.getResponseCode();
      webhookStatus = webhookResponseCode >= 200 && webhookResponseCode < 300 ? 'sucesso' : 'erro';
      
      console.log('Webhook enviado:', {
        status: webhookResponseCode,
        nome: body.nome,
        telefone: body.telefone,
        codigoIndicacao: body.codigoIndicacao,
      });
    } catch (webhookErrorObj) {
      webhookStatus = 'erro';
      webhookError = webhookErrorObj.message;
      console.error('Erro ao enviar webhook:', webhookErrorObj);
    }

    // 2. Salvar na planilha do Google Sheets
    try {
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      let sheet = spreadsheet.getSheetByName(SHEET_NAME);
      
      if (!sheet) {
        sheet = spreadsheet.insertSheet(SHEET_NAME);
        sheet.getRange(1, 1, 1, 6).setValues([['Data/Hora', 'Nome', 'Telefone', 'Código de Indicação', 'Origem', 'Status']]);
        sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
      } else {
        // Verifica se a coluna Status existe, se não, adiciona
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const statusIndex = headers.indexOf('Status');
        if (statusIndex < 0) {
          // Adiciona coluna Status
          const lastCol = sheet.getLastColumn();
          sheet.getRange(1, lastCol + 1).setValue('Status');
          sheet.getRange(1, lastCol + 1).setFontWeight('bold');
        }
      }
      
      // Pega a última coluna para adicionar o status
      const lastCol = sheet.getLastColumn();
      const statusCol = lastCol;
      
      // Verifica se a coluna Status existe
      const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      let statusIndex = headers.indexOf('Status');
      if (statusIndex < 0) {
        statusIndex = lastCol;
        sheet.getRange(1, statusIndex + 1).setValue('Status');
        sheet.getRange(1, statusIndex + 1).setFontWeight('bold');
      }
      
      const newRow = [
        new Date(),
        body.nome,
        body.telefone,
        body.codigoIndicacao,
        body.origem,
        'Nova Indicação' // Status padrão para novos leads
      ];
      
      sheet.appendRow(newRow);
      
      sheetStatus = 'sucesso';
      console.log('Planilha atualizada:', {
        nome: body.nome,
        telefone: body.telefone,
        codigoIndicacao: body.codigoIndicacao,
      });
    } catch (sheetError) {
      sheetStatus = 'erro';
      console.error('Erro ao salvar na planilha:', sheetError);
      return ContentService
        .createTextOutput(JSON.stringify({ 
          ok: false, 
          message: 'Erro ao salvar na planilha: ' + sheetError.message,
          webhookStatus: webhookStatus,
          webhookResponseCode: webhookResponseCode,
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Retorna resposta detalhada
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        status: 200,
        webhookStatus: webhookStatus,
        webhookResponseCode: webhookResponseCode,
        webhookError: webhookError,
        sheetStatus: sheetStatus,
        message: webhookStatus === 'sucesso' 
          ? 'Dados enviados com sucesso para webhook e planilha!' 
          : 'Dados salvos na planilha, mas houve problema no webhook',
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    console.error('Erro geral:', err);
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: false, 
        message: err.message 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Função para atualizar status de um lead
function updateLeadStatus(e) {
  try {
    let payload = {};
    
    if (e.postData && e.postData.type === 'application/json') {
      payload = JSON.parse(e.postData.contents || '{}');
    } else if (e.parameter) {
      payload = {
        leadId: e.parameter.leadId,
        status: e.parameter.status
      };
    }

    const leadId = payload.leadId;
    const newStatus = payload.status || 'Nova Indicação';

    if (!leadId) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          ok: false, 
          message: 'ID do lead não fornecido' 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          ok: false, 
          message: 'Aba "Leads" não encontrada' 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Busca a coluna Status
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    let statusColIndex = headers.indexOf('Status');
    
    // Se não encontrar, adiciona a coluna
    if (statusColIndex < 0) {
      const lastCol = sheet.getLastColumn();
      statusColIndex = lastCol;
      sheet.getRange(1, statusColIndex + 1).setValue('Status');
      sheet.getRange(1, statusColIndex + 1).setFontWeight('bold');
      statusColIndex = lastCol; // Agora é a última coluna
    }
    
    // statusColIndex é baseado em 0, precisa converter para baseado em 1 (coluna da planilha)
    const statusColumn = statusColIndex + 1;

    // Busca o lead pelo ID
    // O ID vem no formato "lead-1", "lead-2", etc., onde o número corresponde ao índice do array (0-based)
    const data = sheet.getDataRange().getValues();
    let found = false;
    
    // Extrai o número do ID (ex: "lead-1" -> 1, que corresponde ao índice 0 no array de dados)
    let dataIndex = null;
    if (leadId && leadId.toString().includes('lead-')) {
      const match = leadId.toString().match(/lead-(\d+)/);
      if (match && match[1]) {
        // lead-1 = primeiro item do array (índice 0) = linha 2 da planilha
        dataIndex = parseInt(match[1]) - 1;
      }
    } else if (!isNaN(leadId)) {
      dataIndex = parseInt(leadId) - 1;
    }
    
    // Se encontrou o índice, atualiza
    if (dataIndex !== null && dataIndex >= 0 && dataIndex < data.length - 1) {
      // dataIndex é baseado em 0, precisa adicionar 2 (1 para pular cabeçalho + 1 para base 1)
      const actualRow = dataIndex + 2;
      if (actualRow <= sheet.getLastRow()) {
        sheet.getRange(actualRow, statusColumn).setValue(newStatus);
        found = true;
      }
    }
    
    // Se não encontrou, tenta buscar pela primeira coluna ou pelo índice
    if (!found) {
      for (let i = 0; i < data.length - 1; i++) {
        const rowId = data[i + 1][0]; // Primeira coluna da linha de dados
        const currentId = `lead-${i + 1}`;
        if (String(rowId) === String(leadId) || String(currentId) === String(leadId)) {
          const actualRow = i + 2; // +2 porque i começa em 0 e linha 1 é cabeçalho
          sheet.getRange(actualRow, statusColumn).setValue(newStatus);
          found = true;
          break;
        }
      }
    }

    if (!found) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          ok: false, 
          message: 'Lead não encontrado' 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        message: 'Status atualizado com sucesso',
        status: newStatus
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: false, 
        message: 'Erro ao atualizar status: ' + error.message 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getDashboardData() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const leadsSheet = spreadsheet.getSheetByName(SHEET_NAME);
    // Aba no Google Sheets onde ficam os Indicadores (pode ser "Promotor", "Indicador", etc.)
    const promotorSheet = spreadsheet.getSheetByName('Promotor');

    if (!leadsSheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          ok: false, 
          message: 'Aba "Leads" não encontrada' 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ============================================
    // Busca dados da aba "Leads"
    // ============================================
    const leadsData = leadsSheet.getDataRange().getValues();
    
    // Se não houver dados além do cabeçalho
    let indicacoes = [];
    if (leadsData.length > 1) {
      // Pula o cabeçalho (primeira linha)
      const headers = leadsData[0];
      const rows = leadsData.slice(1);

      // Encontra os índices das colunas (case-insensitive)
      const findColumnIndex = (headerName) => {
        return headers.findIndex(h => 
          String(h).toLowerCase().trim() === headerName.toLowerCase().trim()
        );
      };

      const nomeIndex = findColumnIndex('Nome');
      const telefoneIndex = findColumnIndex('Telefone');
      const codigoIndex = findColumnIndex('Código de Indicação');
      
      // Tenta "Data/Hora" primeiro, depois "Data e Hora"
      let dataIndex = findColumnIndex('Data/Hora');
      if (dataIndex < 0) {
        dataIndex = findColumnIndex('Data e Hora');
      }
      
      const origemIndex = findColumnIndex('Origem');
      const statusIndex = findColumnIndex('Status');

      // Converte para array de objetos
      indicacoes = rows
        .filter(row => row.some(cell => cell !== '')) // Remove linhas vazias
        .map((row, index) => {
          return {
            id: `lead-${index + 1}`, // ID único para cada lead
            nome: nomeIndex >= 0 ? (row[nomeIndex] || '') : '',
            telefone: telefoneIndex >= 0 ? (row[telefoneIndex] || '') : '',
            codigoIndicacao: codigoIndex >= 0 ? (row[codigoIndex] || 'Sem código') : 'Sem código',
            dataHora: dataIndex >= 0 ? (row[dataIndex] || '') : '',
            origem: origemIndex >= 0 ? (row[origemIndex] || '') : '',
            status: statusIndex >= 0 ? (row[statusIndex] || 'Nova Indicação') : 'Nova Indicação',
          };
        });
    }

    // ============================================
    // Busca dados da aba "Promotor" (onde ficam os Indicadores)
    // ============================================
    let indicadores = {};
    
    if (promotorSheet) {
      const indicadorData = promotorSheet.getDataRange().getValues();
      
      if (indicadorData.length > 1) {
        // Pula o cabeçalho (primeira linha)
        const indicadorHeaders = indicadorData[0];
        const indicadorRows = indicadorData.slice(1);

        // Encontra os índices das colunas (case-insensitive)
        const findColumnIndex = (headerName) => {
          return indicadorHeaders.findIndex(h => 
            String(h).toLowerCase().trim() === headerName.toLowerCase().trim()
          );
        };

        // Procura pelas colunas "ID" (código) e "Nome"
        // Tenta primeiro "ID", depois "Código", depois "Codigo"
        let codigoIndex = findColumnIndex('ID');
        if (codigoIndex < 0) {
          codigoIndex = findColumnIndex('Código');
        }
        if (codigoIndex < 0) {
          codigoIndex = findColumnIndex('Codigo');
        }
        
        // Procura pela coluna "Nome"
        let nomeIndex = findColumnIndex('Nome');
        if (nomeIndex < 0) {
          // Fallback: tenta "Nome do Promotor" (compatibilidade com planilhas antigas)
          nomeIndex = findColumnIndex('Nome do Promotor');
        }

        // Cria o mapeamento código -> nome
        indicadorRows
          .filter(row => row.some(cell => cell !== '')) // Remove linhas vazias
          .forEach((row) => {
            // Converte o código para string (pode ser número ou texto)
            const codigo = codigoIndex >= 0 ? String(row[codigoIndex] || '').trim() : '';
            const nome = nomeIndex >= 0 ? String(row[nomeIndex] || '').trim() : '';
            
            if (codigo && nome) {
              // Armazena o nome usando o código como chave (sempre como string)
              indicadores[codigo] = nome;
              // Também armazena como número caso o código seja numérico (para garantir match)
              if (!isNaN(codigo) && codigo !== '') {
                indicadores[Number(codigo)] = nome;
              }
            }
          });
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: true, 
        indicacoes: indicacoes, // Array de indicados (leads)
        indicadores: indicadores,
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

