require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos (HTML, CSS, JS, imagens)
app.use(express.static(__dirname));

// Configuração do Google Sheets
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const LEADS_SHEET = process.env.GOOGLE_SHEETS_LEADS_SHEET || 'Leads';
// Nome da aba no Google Sheets onde ficam os Indicadores (pode ser "Promotor", "Indicador", etc.)
const PROMOTOR_SHEET = process.env.GOOGLE_SHEETS_PROMOTOR_SHEET || 'Promotor';

// Autenticação Google Sheets
let sheets;
let auth;

async function initGoogleSheets() {
  try {
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!serviceAccountEmail || !privateKey) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY devem estar configurados no .env');
    }

    auth = new google.auth.JWT(
      serviceAccountEmail,
      null,
      privateKey,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    sheets = google.sheets({ version: 'v4', auth });
    console.log('✅ Google Sheets API conectada com sucesso');
  } catch (error) {
    console.error('❌ Erro ao conectar Google Sheets:', error.message);
    process.exit(1);
  }
}

// Função auxiliar para obter data/hora em formato brasileiro (DD/MM/YYYY HH:mm:ss) de São Paulo
function getSaoPauloBrazilianFormat() {
  const now = new Date();
  // São Paulo está UTC-3
  const saoPauloOffset = -3 * 60; // -3 horas em minutos
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const saoPauloTime = new Date(utc + (saoPauloOffset * 60000));
  
  // Como saoPauloTime é criado com offset -3, precisamos pegar os componentes UTC
  // mas tratá-los como horário local de São Paulo
  // Para isso, pegamos os componentes UTC diretamente
  const dia = String(saoPauloTime.getUTCDate()).padStart(2, '0');
  const mes = String(saoPauloTime.getUTCMonth() + 1).padStart(2, '0');
  const ano = saoPauloTime.getUTCFullYear();
  const hora = String(saoPauloTime.getUTCHours()).padStart(2, '0');
  const minuto = String(saoPauloTime.getUTCMinutes()).padStart(2, '0');
  const segundo = String(saoPauloTime.getUTCSeconds()).padStart(2, '0');
  
  return `${dia}/${mes}/${ano} ${hora}:${minuto}:${segundo}`;
}

// Função auxiliar para obter data/hora em formato ISO de São Paulo (para colunas ISO)
function getSaoPauloISOString() {
  const now = new Date();
  // São Paulo está UTC-3
  const saoPauloOffset = -3 * 60; // -3 horas em minutos
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const saoPauloTime = new Date(utc + (saoPauloOffset * 60000));
  return saoPauloTime.toISOString();
}

// Função para converter formato brasileiro (DD/MM/YYYY HH:mm:ss) para Date object
// Considera UTC-3 (São Paulo)
// O formato "DD/MM/YYYY HH:mm:ss" representa hora local de São Paulo
// Para converter para Date object (que trabalha em UTC), precisamos somar 3 horas
function parseBrazilianDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return null;
  
  // Remove espaços extras
  const trimmed = dateString.trim();
  
  // Tenta formato DD/MM/YYYY HH:mm:ss
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (match) {
    const [, dia, mes, ano, hora, minuto, segundo] = match;
    // A data no formato brasileiro está em horário de São Paulo (UTC-3)
    // Para converter para Date (UTC), precisamos criar como UTC+3 (somar 3 horas)
    // new Date() espera mês 0-11, então subtrai 1 do mês
    const date = new Date(Date.UTC(
      parseInt(ano, 10),
      parseInt(mes, 10) - 1,
      parseInt(dia, 10),
      parseInt(hora, 10) + 3, // Soma 3 horas para compensar UTC-3
      parseInt(minuto, 10),
      parseInt(segundo, 10)
    ));
    
    return date;
  }
  
  // Tenta formato ISO como fallback
  try {
    return new Date(dateString);
  } catch {
    return null;
  }
}

// Função para ler dados da planilha
async function readSheet(sheetName, range = null) {
  try {
    const fullRange = range ? `${sheetName}!${range}` : sheetName;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: fullRange,
    });
    return response.data.values || [];
  } catch (error) {
    console.error(`Erro ao ler planilha ${sheetName}:`, error.message);
    throw error;
  }
}

// Função para escrever dados na planilha
async function writeSheet(sheetName, range, values) {
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!${range}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });
  } catch (error) {
    console.error(`Erro ao escrever na planilha ${sheetName}:`, error.message);
    throw error;
  }
}

// Função para adicionar linha na planilha
async function appendRow(sheetName, values) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: [values] },
    });
  } catch (error) {
    console.error(`Erro ao adicionar linha na planilha ${sheetName}:`, error.message);
    throw error;
  }
}

// Função para atualizar célula específica
async function updateCell(sheetName, row, col, value) {
  try {
    const colLetter = String.fromCharCode(64 + col); // A=1, B=2, etc.
    await writeSheet(sheetName, `${colLetter}${row}`, [[value]]);
  } catch (error) {
    console.error(`Erro ao atualizar célula:`, error.message);
    throw error;
  }
}

// Função para encontrar índice da coluna pelo nome
function findColumnIndex(headers, columnName) {
  return headers.findIndex(h => 
    h && h.toString().toLowerCase().trim() === columnName.toLowerCase().trim()
  );
}

// Função para garantir que as colunas necessárias existam na aba Leads
async function ensureColumnsExist() {
  try {
    const data = await readSheet(LEADS_SHEET, 'A1:Z1');
    const headers = data[0] || [];
    
    // Colunas base
    const requiredColumns = [
      'Data e Hora',           // A - Data de criação do lead
      'Nome',                  // B
      'Telefone',              // C
      'Código de Indicação',   // D
      'Origem',                // E
      'Site',                  // F
      'Status',                // G - Status atual
      'Data de Criação',       // H - Data de criação (ISO)
      // Colunas de log por status (com data/hora ISO quando passou por cada status)
      'Nova Indicação',        // I - Data/hora quando entrou neste status
      'Em Contato',            // J - Data/hora quando entrou neste status
      'Em Negociação',         // K - Data/hora quando entrou neste status
      'Fechado',               // L - Data/hora quando entrou neste status
      'Perdido',               // M - Data/hora quando entrou neste status
      // Colunas antigas (mantidas para compatibilidade)
      'Log de Status',         // N - JSON (mantido para compatibilidade)
      'Última Mudança de Status', // O
      'Data Última Mudança'    // P
    ];

    const missingColumns = [];
    const existingHeaders = headers.map(h => h && h.toString().trim());

    requiredColumns.forEach(col => {
      if (!existingHeaders.includes(col)) {
        missingColumns.push(col);
      }
    });

    if (missingColumns.length > 0) {
      // Adiciona colunas faltantes
      const lastCol = headers.length;
      const newHeaders = [...headers];
      missingColumns.forEach((col, idx) => {
        newHeaders[lastCol + idx] = col;
      });

      await writeSheet(LEADS_SHEET, 'A1', [newHeaders]);
      console.log(`✅ Colunas adicionadas na aba Leads: ${missingColumns.join(', ')}`);
    }
  } catch (error) {
    console.error('Erro ao verificar colunas:', error.message);
  }
}

// Função para garantir que as colunas necessárias existam na aba Promotor (onde ficam os Indicadores)
async function ensurePromotorColumnsExist() {
  try {
    const data = await readSheet(PROMOTOR_SHEET, 'A1:Z1');
    const headers = data[0] || [];
    
    const requiredColumns = [
      'ID',
      'Nome',
      'Telefone',
      'Chave Pix',
      'URL',
      'Data de Criação',      // Data/hora ISO quando o indicador foi criado
      'Total de Indicações'   // Contador de quantos leads indicou
    ];

    const missingColumns = [];
    const existingHeaders = headers.map(h => h && h.toString().trim());

    requiredColumns.forEach(col => {
      if (!existingHeaders.includes(col)) {
        missingColumns.push(col);
      }
    });

    if (missingColumns.length > 0) {
      // Adiciona colunas faltantes
      const lastCol = headers.length;
      const newHeaders = [...headers];
      missingColumns.forEach((col, idx) => {
        newHeaders[lastCol + idx] = col;
      });

      await writeSheet(PROMOTOR_SHEET, 'A1', [newHeaders]);
      console.log(`✅ Colunas adicionadas na aba Promotor: ${missingColumns.join(', ')}`);
    }
  } catch (error) {
    console.error('Erro ao verificar colunas do Promotor:', error.message);
  }
}

// ROTA: Receber lead do formulário
app.post('/api/leads', async (req, res) => {
  try {
    const { nome, telefone, codigoIndicacao } = req.body;

    if (!nome || !telefone) {
      return res.status(400).json({
        ok: false,
        message: 'Nome e telefone são obrigatórios'
      });
    }

    // Garante que as colunas existam
    await ensureColumnsExist();

    const dataHoraLegivel = getSaoPauloBrazilianFormat(); // Formato brasileiro para "Data e Hora"
    const dataHoraISO = getSaoPauloISOString(); // Formato ISO para outras colunas
    const origem = 'landing-cartao-de-todos';
    const status = 'Nova Indicação';
    const logStatus = JSON.stringify([{
      status: 'Nova Indicação',
      data: dataHoraISO,
      origem: 'sistema'
    }]);

    // Busca índices das colunas
    const leadsData = await readSheet(LEADS_SHEET, 'A1:Z1');
    const headers = leadsData[0] || [];
    
    // Encontra índices de todas as colunas necessárias
    const dataHoraIndex = findColumnIndex(headers, 'Data e Hora');
    const nomeIndex = findColumnIndex(headers, 'Nome');
    const telefoneIndex = findColumnIndex(headers, 'Telefone');
    const codigoIndex = findColumnIndex(headers, 'Código de Indicação');
    const origemIndex = findColumnIndex(headers, 'Origem');
    const siteIndex = findColumnIndex(headers, 'Site');
    const statusIndex = findColumnIndex(headers, 'Status');
    const dataCriacaoIndex = findColumnIndex(headers, 'Data de Criação');
    const novaIndicacaoIndex = findColumnIndex(headers, 'Nova Indicação');
    const logStatusIndex = findColumnIndex(headers, 'Log de Status');
    const ultimaMudancaIndex = findColumnIndex(headers, 'Última Mudança de Status');
    const dataUltimaMudancaIndex = findColumnIndex(headers, 'Data Última Mudança');

    // Cria array com todas as colunas (preenche com valores vazios e depois atualiza as necessárias)
    const maxCols = Math.max(headers.length, 20); // Garante espaço para todas as colunas
    const row = new Array(maxCols).fill('');
    
    // Preenche colunas básicas usando os índices encontrados
    if (dataHoraIndex !== -1) row[dataHoraIndex] = dataHoraLegivel; // Data e Hora (formato brasileiro DD/MM/YYYY HH:mm:ss)
    if (nomeIndex !== -1) row[nomeIndex] = nome; // Nome
    if (telefoneIndex !== -1) row[telefoneIndex] = telefone; // Telefone
    if (codigoIndex !== -1) row[codigoIndex] = codigoIndicacao || ''; // Código de Indicação
    if (origemIndex !== -1) row[origemIndex] = origem; // Origem
    if (siteIndex !== -1) row[siteIndex] = ''; // Site
    if (statusIndex !== -1) row[statusIndex] = status; // Status
    if (dataCriacaoIndex !== -1) row[dataCriacaoIndex] = dataHoraISO; // Data de Criação (ISO)
    if (novaIndicacaoIndex !== -1) row[novaIndicacaoIndex] = dataHoraISO; // Nova Indicação (data/hora ISO)
    if (logStatusIndex !== -1) row[logStatusIndex] = logStatus; // Log de Status (JSON)
    if (ultimaMudancaIndex !== -1) row[ultimaMudancaIndex] = status; // Última Mudança de Status
    if (dataUltimaMudancaIndex !== -1) row[dataUltimaMudancaIndex] = dataHoraISO; // Data Última Mudança

    await appendRow(LEADS_SHEET, row);

    // Envia para webhook se configurado
    const webhookUrl = process.env.WEBHOOK_URL;
    if (webhookUrl) {
      try {
        // Usa https module para enviar webhook
        const https = require('https');
        const { URL } = require('url');
        const parsedUrl = new URL(webhookUrl);
        const data = JSON.stringify({
          nome,
          telefone,
          codigoIndicacao: codigoIndicacao || '',
          recebidoEm: dataHoraISO,
          origem
        });

        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || 443,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
          }
        };

        const req = https.request(options, (res) => {
          // Webhook enviado
        });
        req.on('error', (error) => {
          console.error('Erro ao enviar webhook:', error.message);
        });
        req.write(data);
        req.end();
      } catch (webhookError) {
        console.error('Erro ao enviar webhook:', webhookError.message);
      }
    }

    res.json({
      ok: true,
      message: 'Lead cadastrado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao cadastrar lead:', error);
    res.status(500).json({
      ok: false,
      message: 'Erro ao cadastrar lead: ' + error.message
    });
  }
});

// ROTA: Buscar dados do dashboard
app.get('/api/dashboard', async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;

    // Busca leads
    const leadsData = await readSheet(LEADS_SHEET);
    if (leadsData.length === 0) {
      return res.json({
        ok: true,
        indicacoes: [], // Array de indicados (leads)
        indicadores: {}
      });
    }

    const headers = leadsData[0];
    const rows = leadsData.slice(1);

    // Encontra índices das colunas
    const dataIndex = findColumnIndex(headers, 'Data e Hora') !== -1 
      ? findColumnIndex(headers, 'Data e Hora')
      : findColumnIndex(headers, 'Data/Hora');
    const nomeIndex = findColumnIndex(headers, 'Nome');
    const telefoneIndex = findColumnIndex(headers, 'Telefone');
    const codigoIndex = findColumnIndex(headers, 'Código de Indicação');
    const origemIndex = findColumnIndex(headers, 'Origem');
    const statusIndex = findColumnIndex(headers, 'Status');
    const logIndex = findColumnIndex(headers, 'Log de Status');

    // Converte para objetos
    let indicacoes = rows.map((row, idx) => {
      const indicacao = {
        id: idx + 2, // +2 porque começa na linha 2 (linha 1 é header)
        nome: row[nomeIndex] || '',
        telefone: row[telefoneIndex] || '',
        codigoIndicacao: row[codigoIndex] || '',
        origem: row[origemIndex] || '',
        status: row[statusIndex] || 'Nova Indicação',
        dataHora: row[dataIndex] || '',
      };

      // Parse do log se existir
      if (row[logIndex]) {
        try {
          indicacao.logStatus = JSON.parse(row[logIndex]);
        } catch {
          indicacao.logStatus = [];
        }
      } else {
        indicacao.logStatus = [];
      }

      return indicacao;
    });

    // Filtra por data se fornecido
    if (dataInicio || dataFim) {
      indicacoes = indicacoes.filter(indicacao => {
        if (!indicacao.dataHora) return false;
        
        try {
          // Converte formato brasileiro (DD/MM/YYYY HH:mm:ss) para Date
          const indicacaoDate = parseBrazilianDate(indicacao.dataHora);
          if (!indicacaoDate) return false;

          if (dataInicio) {
            // dataInicio vem no formato YYYY-MM-DD do input type="date"
            // Criamos string no formato brasileiro e convertemos usando parseBrazilianDate
            const [anoInicio, mesInicio, diaInicio] = dataInicio.split('-');
            const dataInicioStr = `${String(diaInicio).padStart(2, '0')}/${String(mesInicio).padStart(2, '0')}/${anoInicio} 00:00:00`;
            const inicio = parseBrazilianDate(dataInicioStr);
            if (!inicio) return false;
            
            // Compara se a data do lead é >= data início
            if (indicacaoDate < inicio) return false;
          }

          if (dataFim) {
            // dataFim vem no formato YYYY-MM-DD do input type="date"
            // Criamos string no formato brasileiro para o fim do dia e convertemos
            const [anoFim, mesFim, diaFim] = dataFim.split('-');
            const dataFimStr = `${String(diaFim).padStart(2, '0')}/${String(mesFim).padStart(2, '0')}/${anoFim} 23:59:59`;
            const fim = parseBrazilianDate(dataFimStr);
            if (!fim) return false;
            
            // Compara se a data do lead é <= data fim (fim do dia)
            if (indicacaoDate > fim) return false;
          }

          return true;
        } catch {
          return false;
        }
      });
    }

    // Busca indicadores (da aba Promotor no Google Sheets - nome da aba pode mudar depois)
    const indicadoresData = await readSheet(PROMOTOR_SHEET);
    const indicadores = {};
    const indicadoresList = [];
    
    if (indicadoresData.length > 1) {
      const indicadorHeaders = indicadoresData[0];
      const indicadorRows = indicadoresData.slice(1);
      
      const idIndex = findColumnIndex(indicadorHeaders, 'ID');
      const nomeIndex = findColumnIndex(indicadorHeaders, 'Nome');
      const telefoneIndex = findColumnIndex(indicadorHeaders, 'Telefone');

      indicadorRows.forEach(row => {
        const id = row[idIndex];
        const nome = row[nomeIndex];
        const telefone = row[telefoneIndex] || '';
        
        if (id && nome) {
          indicadores[String(id)] = nome;
          indicadoresList.push({
            id: String(id),
            nome,
            telefone
          });
        }
      });
    }

    res.json({
      ok: true,
      indicacoes, // Array de indicados (leads)
      indicadores,
      indicadoresList
    });
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({
      ok: false,
      message: 'Erro ao buscar dados: ' + error.message
    });
  }
});

// ROTA: Buscar dados dos promotores (com métricas agrupadas)
app.get('/api/promotores', async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;
    const VALOR_PLANO = 59.99; // Valor mensal do plano

    // Função auxiliar para parse de data (aceita com e sem segundos)
    const parseDateFlex = (dateString) => {
      if (!dateString) return null;
      
      // Tenta parse brasileiro padrão (com segundos)
      let date = parseBrazilianDate(dateString);
      if (date) return date;
      
      // Tenta formato DD/MM/YYYY HH:mm (sem segundos)
      const trimmed = String(dateString).trim();
      const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
      if (match) {
        const [, dia, mes, ano, hora, minuto] = match;
        date = new Date(Date.UTC(
          parseInt(ano, 10),
          parseInt(mes, 10) - 1,
          parseInt(dia, 10),
          parseInt(hora, 10) + 3,
          parseInt(minuto, 10),
          0
        ));
        if (!isNaN(date.getTime())) return date;
      }
      
      // Tenta formato ISO
      try {
        date = new Date(dateString);
        if (!isNaN(date.getTime())) return date;
      } catch {}
      
      return null;
    };

    // Tenta buscar da aba "Vendedores" primeiro, depois "Leads"
    let leadsData;
    try {
      leadsData = await readSheet('Vendedores');
    } catch {
      leadsData = await readSheet(LEADS_SHEET);
    }

    if (leadsData.length === 0) {
      return res.json({
        ok: true,
        promotores: []
      });
    }

    const headers = leadsData[0];
    const rows = leadsData.slice(1);

    // Encontra índices das colunas (flexível para diferentes nomes)
    const findColumnIndexFlex = (possibleNames) => {
      for (const name of possibleNames) {
        const idx = findColumnIndex(headers, name);
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const dataIndex = findColumnIndexFlex(['inicio atendimento', 'Data e Hora', 'Data/Hora', 'dataHora']);
    const nomeIndex = findColumnIndexFlex(['nome lead', 'Nome', 'nome']);
    const telefoneIndex = findColumnIndexFlex(['telefone lead', 'Telefone', 'telefone']);
    const promotorIndex = findColumnIndexFlex(['promotor', 'Promotor']);
    const statusIndex = findColumnIndexFlex(['status', 'Status']);
    const vendedorIndex = findColumnIndexFlex(['vendedor', 'Vendedor']);

    // Converte para objetos, filtrando linhas vazias
    let leads = rows
      .map((row, idx) => {
        const nome = nomeIndex >= 0 ? String(row[nomeIndex] || '').trim() : '';
        const promotor = promotorIndex >= 0 ? String(row[promotorIndex] || '').trim() : '';
        
        // Ignora linhas sem nome ou sem promotor
        if (!nome || !promotor) return null;
        
        return {
          id: idx + 2,
          nome: nome,
          telefone: telefoneIndex >= 0 ? String(row[telefoneIndex] || '').trim() : '',
          promotor: promotor,
          vendedor: vendedorIndex >= 0 ? String(row[vendedorIndex] || '').trim() : '',
          status: statusIndex >= 0 ? String(row[statusIndex] || 'Nova Indicação').trim() : 'Nova Indicação',
          dataHora: dataIndex >= 0 ? String(row[dataIndex] || '').trim() : '',
          protocolo: row[6] ? String(row[6] || '').trim() : '' // protocolo atendimento (coluna G)
        };
      })
      .filter(lead => lead !== null); // Remove linhas null

    // Filtra por data se fornecido
    if (dataInicio || dataFim) {
      leads = leads.filter(lead => {
        if (!lead.dataHora) return false;
        
        try {
          const leadDate = parseDateFlex(lead.dataHora);
          if (!leadDate) return false;

          if (dataInicio) {
            const [anoInicio, mesInicio, diaInicio] = dataInicio.split('-');
            const dataInicioStr = `${String(diaInicio).padStart(2, '0')}/${String(mesInicio).padStart(2, '0')}/${anoInicio} 00:00:00`;
            const inicio = parseDateFlex(dataInicioStr);
            if (!inicio || leadDate < inicio) return false;
          }

          if (dataFim) {
            const [anoFim, mesFim, diaFim] = dataFim.split('-');
            const dataFimStr = `${String(diaFim).padStart(2, '0')}/${String(mesFim).padStart(2, '0')}/${anoFim} 23:59:59`;
            const fim = parseDateFlex(dataFimStr);
            if (!fim || leadDate > fim) return false;
          }

          return true;
        } catch {
          return false;
        }
      });
    }

    // Agrupa por VENDEDOR (coluna A) - que são os "Promotores" na página
    const promotoresMap = {};

    leads.forEach(lead => {
      // Usa VENDEDOR (coluna A) como chave, não PROMOTOR (coluna F)
      const vendedorNome = lead.vendedor;
      if (!vendedorNome) return;

      if (!promotoresMap[vendedorNome]) {
        promotoresMap[vendedorNome] = {
          nome: vendedorNome,
          totalLeads: 0,
          leadsPorStatus: {
            'Nova Indicação': 0,
            'Em contato': 0,
            'Em Contato': 0,
            'Em Negociação': 0,
            'Em negociação': 0,
            'Fechado': 0,
            'fechado': 0,
            'Perdido': 0,
            'perdido': 0
          },
          leads: [],
          primeiraData: null,
          ultimaData: null,
          indicadores: new Set() // Agora armazena os indicadores/promotores associados
        };
      }

      const promotor = promotoresMap[vendedorNome];
      promotor.totalLeads++;
      promotor.leads.push(lead);

      // Conta por status (normaliza o nome do status)
      let status = String(lead.status || 'Nova Indicação').trim();
      
      // Normaliza variações comuns
      const statusNormalizado = status.toLowerCase();
      if (statusNormalizado === 'em contato') {
        status = 'Em Contato';
      } else if (statusNormalizado === 'em negociação' || statusNormalizado === 'em negociacao') {
        status = 'Em Negociação';
      } else if (statusNormalizado === 'nova indicação' || statusNormalizado === 'nova indicacao') {
        status = 'Nova Indicação';
      } else if (statusNormalizado === 'fechado') {
        status = 'Fechado';
      } else if (statusNormalizado === 'perdido') {
        status = 'Perdido';
      } else {
        // Mantém o status original mas capitaliza
        status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
      }
      
      // Incrementa o contador
      if (promotor.leadsPorStatus[status] !== undefined) {
        promotor.leadsPorStatus[status]++;
      } else {
        // Se não for um status padrão, adiciona como 'Nova Indicação'
        promotor.leadsPorStatus['Nova Indicação']++;
        console.log('⚠️ Status desconhecido:', status, 'Lead:', lead.nome);
      }

      // Data mais antiga e mais recente
      if (lead.dataHora) {
        try {
          const leadDate = parseDateFlex(lead.dataHora);
          if (leadDate && !isNaN(leadDate.getTime())) {
            if (!promotor.primeiraData || leadDate < promotor.primeiraData) {
              promotor.primeiraData = leadDate;
            }
            if (!promotor.ultimaData || leadDate > promotor.ultimaData) {
              promotor.ultimaData = leadDate;
            }
          }
        } catch (e) {
          console.error('Erro ao parsear data:', lead.dataHora, e);
        }
      }

      // Indicadores únicos (os promotores da coluna F que geraram os leads)
      if (lead.promotor && lead.promotor.trim()) {
        promotor.indicadores.add(lead.promotor.trim());
      }
    });

    // Converte para array e calcula métricas
    const promotores = Object.values(promotoresMap).map(promotor => {
      // Normaliza leadsPorStatus (soma variações e variações de capitalização)
      const leadsPorStatusNormalizado = {
        'Nova Indicação': (promotor.leadsPorStatus['Nova Indicação'] || 0) + (promotor.leadsPorStatus['nova indicação'] || 0) + (promotor.leadsPorStatus['Nova indicacao'] || 0),
        'Em Contato': (promotor.leadsPorStatus['Em Contato'] || 0) + (promotor.leadsPorStatus['Em contato'] || 0) + (promotor.leadsPorStatus['em contato'] || 0),
        'Em Negociação': (promotor.leadsPorStatus['Em Negociação'] || 0) + (promotor.leadsPorStatus['Em negociação'] || 0) + (promotor.leadsPorStatus['em negociação'] || 0) + (promotor.leadsPorStatus['Em negociacao'] || 0),
        'Fechado': (promotor.leadsPorStatus['Fechado'] || 0) + (promotor.leadsPorStatus['fechado'] || 0),
        'Perdido': (promotor.leadsPorStatus['Perdido'] || 0) + (promotor.leadsPorStatus['perdido'] || 0)
      };
      
      // Debug: log dos status encontrados
      console.log(`📊 Promotor ${promotor.nome}:`, {
        totalLeads: promotor.totalLeads,
        statusRaw: promotor.leadsPorStatus,
        statusNormalizado: leadsPorStatusNormalizado
      });
      
      // Calcula valor gerado (R$ 59,99 por lead fechado)
      const leadsFechados = leadsPorStatusNormalizado['Fechado'] || 0;
      const valorGerado = leadsFechados * VALOR_PLANO;

      // Calcula taxa de conversão (Fechados / Total)
      const taxaConversao = promotor.totalLeads > 0 
        ? ((leadsFechados / promotor.totalLeads) * 100).toFixed(1)
        : 0;

      // Taxa de perda (Perdidos / Total)
      const leadsPerdidos = leadsPorStatusNormalizado['Perdido'] || 0;
      const taxaPerda = promotor.totalLeads > 0
        ? ((leadsPerdidos / promotor.totalLeads) * 100).toFixed(1)
        : 0;

      return {
        nome: promotor.nome, // Nome do VENDEDOR (coluna A)
        totalLeads: promotor.totalLeads,
        leadsPorStatus: leadsPorStatusNormalizado,
        leadsFechados,
        valorGerado: parseFloat(valorGerado.toFixed(2)),
        taxaConversao: parseFloat(taxaConversao),
        taxaPerda: parseFloat(taxaPerda),
        primeiraData: promotor.primeiraData ? promotor.primeiraData.toISOString() : null,
        ultimaData: promotor.ultimaData ? promotor.ultimaData.toISOString() : null,
        indicadores: Array.from(promotor.indicadores).sort(), // Indicadores/promotores que geraram os leads
        leads: promotor.leads // Inclui todos os leads para detalhamento
      };
    });

    // Ordena por valor gerado (maior primeiro), depois por total de leads
    promotores.sort((a, b) => {
      if (b.valorGerado !== a.valorGerado) {
        return b.valorGerado - a.valorGerado;
      }
      return b.totalLeads - a.totalLeads;
    });

    res.json({
      ok: true,
      promotores,
      valorPlano: VALOR_PLANO
    });
  } catch (error) {
    console.error('Erro ao buscar dados dos promotores:', error);
    res.status(500).json({
      ok: false,
      message: 'Erro ao buscar dados: ' + error.message
    });
  }
});

// ROTA: Atualizar status do lead
app.post('/api/leads/:leadId/status', async (req, res) => {
  try {
    const leadId = parseInt(req.params.leadId);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        ok: false,
        message: 'Status é obrigatório'
      });
    }

    // Busca a linha do lead
    const leadsData = await readSheet(LEADS_SHEET);
    if (leadsData.length < leadId) {
      return res.status(404).json({
        ok: false,
        message: 'Lead não encontrado'
      });
    }

    const headers = leadsData[0];
    const row = leadsData[leadId - 1]; // -1 porque leadId é baseado em índice + 2

    const statusIndex = findColumnIndex(headers, 'Status');
    const logIndex = findColumnIndex(headers, 'Log de Status');
    const ultimaMudancaIndex = findColumnIndex(headers, 'Última Mudança de Status');
    const dataUltimaMudancaIndex = findColumnIndex(headers, 'Data Última Mudança');
    
    // Índices das colunas de status individuais
    const novaIndicacaoIndex = findColumnIndex(headers, 'Nova Indicação');
    const emContatoIndex = findColumnIndex(headers, 'Em Contato');
    const emNegociacaoIndex = findColumnIndex(headers, 'Em Negociação');
    const fechadoIndex = findColumnIndex(headers, 'Fechado');
    const perdidoIndex = findColumnIndex(headers, 'Perdido');

    // Obtém log atual
    let logStatus = [];
    if (row[logIndex]) {
      try {
        logStatus = JSON.parse(row[logIndex]);
      } catch {
        logStatus = [];
      }
    }

    // Data/hora atual em ISO
    const dataHoraAtual = getSaoPauloISOString();

    // Adiciona nova entrada no log
    const novaEntrada = {
      status: status,
      data: dataHoraAtual,
      origem: 'sistema'
    };
    logStatus.push(novaEntrada);

    // Atualiza as células básicas
    const statusCol = statusIndex + 1;
    const logCol = logIndex + 1;
    const ultimaMudancaCol = ultimaMudancaIndex + 1;
    const dataUltimaMudancaCol = dataUltimaMudancaIndex + 1;

    await updateCell(LEADS_SHEET, leadId, statusCol, status);
    await updateCell(LEADS_SHEET, leadId, logCol, JSON.stringify(logStatus));
    await updateCell(LEADS_SHEET, leadId, ultimaMudancaCol, status);
    await updateCell(LEADS_SHEET, leadId, dataUltimaMudancaCol, dataHoraAtual);

    // Atualiza a coluna específica do status com a data/hora ISO
    // Quando o lead passa por um status, preenche a coluna daquele status com a data/hora
    if (status === 'Nova Indicação' && novaIndicacaoIndex !== -1) {
      await updateCell(LEADS_SHEET, leadId, novaIndicacaoIndex + 1, dataHoraAtual);
    } else if (status === 'Em Contato' && emContatoIndex !== -1) {
      await updateCell(LEADS_SHEET, leadId, emContatoIndex + 1, dataHoraAtual);
    } else if (status === 'Em Negociação' && emNegociacaoIndex !== -1) {
      await updateCell(LEADS_SHEET, leadId, emNegociacaoIndex + 1, dataHoraAtual);
    } else if (status === 'Fechado' && fechadoIndex !== -1) {
      await updateCell(LEADS_SHEET, leadId, fechadoIndex + 1, dataHoraAtual);
    } else if (status === 'Perdido' && perdidoIndex !== -1) {
      await updateCell(LEADS_SHEET, leadId, perdidoIndex + 1, dataHoraAtual);
    }

    res.json({
      ok: true,
      message: 'Status atualizado com sucesso',
      log: logStatus
    });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({
      ok: false,
      message: 'Erro ao atualizar status: ' + error.message
    });
  }
});

// ROTA: Buscar timeline do lead
app.get('/api/leads/:leadId/timeline', async (req, res) => {
  try {
    const leadId = parseInt(req.params.leadId);

    const leadsData = await readSheet(LEADS_SHEET);
    if (leadsData.length < leadId) {
      return res.status(404).json({
        ok: false,
        message: 'Lead não encontrado'
      });
    }

    const headers = leadsData[0];
    const row = leadsData[leadId - 1];

    const logIndex = findColumnIndex(headers, 'Log de Status');
    const dataIndex = findColumnIndex(headers, 'Data e Hora') !== -1 
      ? findColumnIndex(headers, 'Data e Hora')
      : findColumnIndex(headers, 'Data/Hora');

    let logStatus = [];
    if (row[logIndex]) {
      try {
        logStatus = JSON.parse(row[logIndex]);
      } catch {
        logStatus = [];
      }
    }

    // Se não tem log, cria um com a data de criação
    if (logStatus.length === 0 && row[dataIndex]) {
      logStatus = [{
        status: 'Nova Indicação',
        data: row[dataIndex],
        origem: 'sistema'
      }];
    }

    res.json({
      ok: true,
      timeline: logStatus,
      dataCriacao: row[dataIndex] || ''
    });
  } catch (error) {
    console.error('Erro ao buscar timeline:', error);
    res.status(500).json({
      ok: false,
      message: 'Erro ao buscar timeline: ' + error.message
    });
  }
});

// ROTA: Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, status: 'online' });
});

// Inicializa servidor
async function startServer() {
  await initGoogleSheets();
  await ensureColumnsExist();
  await ensurePromotorColumnsExist();

  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Planilha: ${SPREADSHEET_ID}`);
  });
}

// Para Vercel (serverless)
if (process.env.VERCEL) {
  // Inicializa Google Sheets antes de exportar
  initGoogleSheets().then(() => {
    ensureColumnsExist();
    ensurePromotorColumnsExist();
  }).catch(console.error);
  
  module.exports = app;
} else {
  // Para desenvolvimento local
  startServer().catch(console.error);
}

