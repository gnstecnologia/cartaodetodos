// Configuração
const DASHBOARD_EMAIL = 'admin@cartaodetodos.com.br';
const DASHBOARD_PASSWORD = 'admin123'; // ALTERE ESTA SENHA! (mesma do dashboard)
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';
const DATA_ENDPOINT = `${API_BASE_URL}/api/dashboard`;
const UPDATE_ENDPOINT = `${API_BASE_URL}/api/leads`;
const TIMELINE_ENDPOINT = `${API_BASE_URL}/api/leads`;

// Variável global para armazenar os indicadores
let INDICADORES = {};
let INDICADORES_LIST = []; // Lista completa de indicadores para filtro
let allLeadsData = null; // Armazena todos os leads para filtragem

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

// Mapeamento de status
const STATUS_MAP = {
  'nova': 'Nova Indicação',
  'contato': 'Em Contato',
  'negociacao': 'Em Negociação',
  'fechado': 'Fechado',
  'perdido': 'Perdido'
};

// Verifica se está autenticado
function checkAuth() {
  const isAuthenticated = sessionStorage.getItem('dashboardAuth') === 'true';
  if (isAuthenticated) {
    showCRM();
    loadCRM();
  } else {
    showLogin();
  }
}

// Mostra tela de login
function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('crmScreen').style.display = 'none';
}

// Mostra CRM
function showCRM() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('crmScreen').style.display = 'block';
}

// Login
document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('emailInput').value.trim().toLowerCase();
  const password = document.getElementById('passwordInput').value;
  const errorEl = document.getElementById('loginError');

  if (email === DASHBOARD_EMAIL && password === DASHBOARD_PASSWORD) {
    sessionStorage.setItem('dashboardAuth', 'true');
    showCRM();
    loadCRM();
    errorEl.style.display = 'none';
    document.getElementById('emailInput').value = '';
    document.getElementById('passwordInput').value = '';
  } else {
    errorEl.textContent = 'E-mail ou senha incorretos!';
    errorEl.style.display = 'block';
    document.getElementById('passwordInput').value = '';
  }
});

// Logout
function logout() {
  sessionStorage.removeItem('dashboardAuth');
  showLogin();
  document.getElementById('emailInput').value = '';
  document.getElementById('passwordInput').value = '';
}

// Carrega dados do CRM (SEM aplicar filtros de data no servidor, apenas no cliente)
async function loadCRM() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const boardEl = document.getElementById('kanbanBoard');

  loadingEl.style.display = 'block';
  errorEl.style.display = 'none';
  boardEl.style.display = 'none';

  try {
    // Busca TODOS os dados da API (sem filtros no servidor)
    // Os filtros serão aplicados no cliente para garantir que funcionem corretamente
    const response = await fetch(DATA_ENDPOINT);
    
    if (!response.ok) {
      throw new Error('Erro ao buscar dados');
    }

    const data = await response.json();

    if (data.ok === false) {
      throw new Error(data.message || 'Erro ao processar dados');
    }

    // Salva todos os dados para filtragem
    allLeadsData = data;

    // Atualiza o mapeamento de indicadores
    if (data.indicadores && typeof data.indicadores === 'object') {
      INDICADORES = data.indicadores;
    }
    
    // Usa lista completa de indicadores se disponível
    if (data.indicadoresList && Array.isArray(data.indicadoresList)) {
      INDICADORES_LIST = data.indicadoresList;
    } else {
      // Fallback: cria lista a partir do objeto
      INDICADORES_LIST = Object.entries(INDICADORES).map(([id, nome]) => ({
        id,
        nome,
        telefone: ''
      }));
    }

    // Aplica filtros e processa (filtros aplicados no cliente)
    applyFilters();

    loadingEl.style.display = 'none';
    boardEl.style.display = 'flex';
    
    // Inicializa drag and drop após carregar
    initDragAndDrop();
  } catch (error) {
    console.error('Erro ao carregar CRM:', error);
    loadingEl.style.display = 'none';
    errorEl.textContent = 'Erro ao carregar dados. Verifique se o endpoint está configurado corretamente.';
    errorEl.style.display = 'block';
  }
}

// Aplica filtros (indicador e data) - TODOS OS FILTROS SÃO OPCIONAIS
function applyFilters() {
  if (!allLeadsData) {
    // Se não tem dados, recarrega
    loadCRM();
    return;
  }

  let indicacoes = [...(allLeadsData.indicacoes || [])];

  // Filtro de indicador - OPCIONAL (só aplica se selecionado)
  const indicadorSelect = document.getElementById('indicadorFilter');
  const indicadorHidden = document.getElementById('indicadorFilterHidden');
  
  // Tenta pegar o valor do select ou do campo oculto
  let indicadorFilter = indicadorSelect?.value || indicadorHidden?.value || 'all';
  
  console.log('🔍 Aplicando filtros...');
  console.log('Indicador selecionado (select):', indicadorSelect?.value);
  console.log('Indicador selecionado (hidden):', indicadorHidden?.value);
  console.log('Indicador filtro final:', indicadorFilter);
  console.log('Total de leads antes do filtro:', indicacoes.length);
  
  if (indicadorFilter && indicadorFilter !== 'all') {
    const filterCodigo = String(indicadorFilter).trim();
    console.log('🔍 Filtrando por código:', filterCodigo);
    
    indicacoes = indicacoes.filter(lead => {
      // Tenta múltiplas formas de obter o código
      const codigo = String(
        lead.codigoIndicacao || 
        lead['Código de Indicação'] || 
        lead.codigo ||
        ''
      ).trim();
      
      // Comparação exata (case-sensitive)
      const match = codigo === filterCodigo;
      
      if (match) {
        console.log('✅ Lead encontrado:', lead.nome, 'Código:', codigo);
      }
      return match;
    });
    
    console.log('📊 Total de leads após filtro de indicador:', indicacoes.length);
  } else {
    console.log('ℹ️ Sem filtro de indicador (mostrando todos)');
  }

  // Filtro de período - OPCIONAL (só aplica se pelo menos uma data for selecionada)
  const dataInicio = document.getElementById('dateFilterInicio')?.value;
  const dataFim = document.getElementById('dateFilterFim')?.value;
  
  // Só aplica filtro de data se pelo menos uma data foi informada
  if (dataInicio || dataFim) {
    console.log('📅 Aplicando filtro de data...');
    console.log('Data início:', dataInicio);
    console.log('Data fim:', dataFim);
    
    indicacoes = indicacoes.filter(lead => {
      // Tenta múltiplas formas de obter a data
      const dataHora = lead.dataHora || lead['Data e Hora'] || lead['Data de Criação'] || lead['Data/Hora'] || '';
      if (!dataHora) {
        console.log('⚠️ Lead sem data:', lead.nome);
        return false;
      }
      
      try {
        // Converte formato brasileiro (DD/MM/YYYY HH:mm:ss) para Date
        const leadDate = parseBrazilianDate(dataHora);
        if (!leadDate) {
          console.log('⚠️ Não foi possível converter data:', dataHora);
          return false;
        }

        // Se tem data inicial, filtra por ela
        if (dataInicio) {
          // dataInicio vem no formato YYYY-MM-DD do input type="date"
          // Criamos string no formato brasileiro e convertemos usando parseBrazilianDate
          const [anoInicio, mesInicio, diaInicio] = dataInicio.split('-');
          const dataInicioStr = `${String(diaInicio).padStart(2, '0')}/${String(mesInicio).padStart(2, '0')}/${anoInicio} 00:00:00`;
          const inicio = parseBrazilianDate(dataInicioStr);
          if (!inicio) {
            console.log('⚠️ Erro ao criar data início');
            return false;
          }
          
          // Compara se a data do lead é >= data início (início do dia)
          if (leadDate < inicio) {
            console.log('❌ Lead antes da data início:', lead.nome, 'Data:', dataHora);
            return false;
          }
        }

        // Se tem data final, filtra por ela
        if (dataFim) {
          // dataFim vem no formato YYYY-MM-DD do input type="date"
          // Criamos string no formato brasileiro para o fim do dia e convertemos
          const [anoFim, mesFim, diaFim] = dataFim.split('-');
          const dataFimStr = `${String(diaFim).padStart(2, '0')}/${String(mesFim).padStart(2, '0')}/${anoFim} 23:59:59`;
          const fim = parseBrazilianDate(dataFimStr);
          if (!fim) {
            console.log('⚠️ Erro ao criar data fim');
            return false;
          }
          
          // Compara se a data do lead é <= data fim (fim do dia)
          if (leadDate > fim) {
            console.log('❌ Lead depois da data fim:', lead.nome, 'Data:', dataHora);
            return false;
          }
        }

        console.log('✅ Lead dentro do período:', lead.nome, 'Data:', dataHora);
        return true;
      } catch (error) {
        console.error('❌ Erro ao processar data do lead:', lead.nome, error);
        return false;
      }
    });
    
    console.log('📊 Total de leads após filtro de data:', indicacoes.length);
  }

  // Se nenhum filtro foi aplicado, mostra todos os leads
  // Processa os dados filtrados (ou todos se não houver filtros)
  console.log('📊 Total de leads após todos os filtros:', indicacoes.length);
  processCRMData({ ...allLeadsData, indicacoes });
}

// Processa e exibe os dados no Kanban
function processCRMData(data) {
  // Limpa todas as colunas
  Object.keys(STATUS_MAP).forEach(status => {
    const container = document.getElementById(`cards-${status}`);
    container.innerHTML = '';
    document.getElementById(`count-${status}`).textContent = '0';
  });

  if (!data.indicacoes || !Array.isArray(data.indicacoes)) {
    return;
  }

  // Agrupa leads por status
  const leadsByStatus = {
    'nova': [],
    'contato': [],
    'negociacao': [],
    'fechado': [],
    'perdido': []
  };

  data.indicacoes.forEach((lead, index) => {
    // Pega o status do lead (padrão: 'nova' se não tiver)
    let status = (lead.status || lead.Status || 'nova').toLowerCase().trim();
    
    // Normaliza o status
    if (status === 'nova indicação' || status === 'novo') status = 'nova';
    if (status === 'em contato' || status === 'contato') status = 'contato';
    if (status === 'em negociação' || status === 'negociação' || status === 'negociacao') status = 'negociacao';
    if (status === 'fechado' || status === 'concluído' || status === 'concluido') status = 'fechado';
    if (status === 'perdido' || status === 'perdida') status = 'perdido';
    
    // Se o status não for válido, coloca como 'nova'
    if (!leadsByStatus[status]) {
      status = 'nova';
    }

    // Adiciona um ID único se não tiver
    if (!lead.id && !lead.ID) {
      lead.id = `lead-${index}`;
    }

    leadsByStatus[status].push(lead);
  });

  // Renderiza os cards em cada coluna
  Object.keys(leadsByStatus).forEach(status => {
    const container = document.getElementById(`cards-${status}`);
    const column = document.querySelector(`[data-status="${status}"]`);
    const count = leadsByStatus[status].length;
    document.getElementById(`count-${status}`).textContent = count;

    if (count === 0) {
      container.innerHTML = '<div class="empty-column">Nenhum lead nesta etapa</div>';
    } else {
      leadsByStatus[status].forEach((lead, index) => {
        const card = createCard(lead, status);
        // Adiciona delay de animação baseado no índice
        card.style.animationDelay = `${index * 0.05}s`;
        container.appendChild(card);
      });
    }
  });
}

// Cria um card do Kanban
function createCard(lead, status = null) {
  const card = document.createElement('div');
  card.className = 'kanban-card';
  card.draggable = true;
  card.dataset.leadId = lead.id || lead.ID || '';
  const cardStatus = status || getLeadStatus(lead);
  card.dataset.currentStatus = cardStatus;

  const nome = lead.nome || lead.Nome || 'Sem nome';
  const telefone = lead.telefone || lead.Telefone || 'Sem telefone';
  const codigo = lead.codigoIndicacao || lead['Código de Indicação'] || '';
  const indicadorNome = INDICADORES[codigo] || INDICADORES[String(codigo)] || `Código ${codigo}`;
  const dataHora = lead.dataHora || lead['Data/Hora'] || lead['Data e Hora'] || '';

  card.innerHTML = `
    <div class="card-header">
      <h4 class="card-name">${nome}</h4>
    </div>
    <div class="card-indicador">
      <i class="fas fa-user"></i> ${indicadorNome}
    </div>
    <div class="card-info">
      <div class="card-info-item">
        <i class="fas fa-phone"></i>
        <span>${telefone}</span>
      </div>
      ${dataHora ? `<div class="card-info-item"><i class="fas fa-calendar-alt"></i><span>${formatDate(dataHora)}</span></div>` : ''}
      <div class="card-info-item">
        <button onclick="showTimeline('${lead.id || lead.ID || ''}')" 
          style="background: var(--color-background); color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem;">
          <i class="fas fa-clock-rotate-left"></i> Ver Timeline
        </button>
      </div>
    </div>
  `;

  return card;
}

// Obtém o status do lead
function getLeadStatus(lead) {
  let status = (lead.status || lead.Status || 'nova').toLowerCase().trim();
  if (status === 'nova indicação' || status === 'novo') return 'nova';
  if (status === 'em contato' || status === 'contato') return 'contato';
  if (status === 'em negociação' || status === 'negociação' || status === 'negociacao') return 'negociacao';
  if (status === 'fechado' || status === 'concluído' || status === 'concluido') return 'fechado';
  if (status === 'perdido' || status === 'perdida') return 'perdido';
  return 'nova';
}

// Formata data
function formatDate(dateString) {
  if (!dateString) return '';
  
  try {
    // Se já está no formato brasileiro DD/MM/YYYY HH:mm:ss, retorna como está
    const match = dateString.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (match) {
      // Retorna no formato DD/MM/YYYY HH:mm
      return `${match[1]}/${match[2]}/${match[3]} ${match[4]}:${match[5]}`;
    }
    
    // Tenta fazer parse da data (ISO ou outros formatos)
    const date = parseBrazilianDate(dateString) || new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    
    // Formata no padrão brasileiro
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

// Inicializa drag and drop
function initDragAndDrop() {
  const cards = document.querySelectorAll('.kanban-card');
  const columns = document.querySelectorAll('.kanban-column');

  cards.forEach(card => {
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
  });

  columns.forEach(column => {
    column.addEventListener('dragover', handleDragOver);
    column.addEventListener('drop', handleDrop);
    column.addEventListener('dragenter', handleDragEnter);
    column.addEventListener('dragleave', handleDragLeave);
  });
}

let draggedCard = null;

function handleDragStart(e) {
  draggedCard = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  document.querySelectorAll('.kanban-column').forEach(col => {
    col.classList.remove('drag-over');
  });
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragEnter(e) {
  e.preventDefault();
  const column = this.closest('.kanban-column');
  if (column) {
    column.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  // Só remove se realmente saiu da coluna (não apenas de um filho)
  const column = this.closest('.kanban-column');
  if (column && !column.contains(e.relatedTarget)) {
    column.classList.remove('drag-over');
  }
}

async function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();

  if (!draggedCard) return false;

  const column = this.closest('.kanban-column');
  if (!column) return false;

  const newStatus = column.dataset.status;
  const leadId = draggedCard.dataset.leadId;
  const oldStatus = draggedCard.dataset.currentStatus;

  // Se o status não mudou, não faz nada
  if (newStatus === oldStatus) {
    column.classList.remove('drag-over');
    return false;
  }

  // Move o card visualmente
  const cardsContainer = column.querySelector('.cards-container');
  if (cardsContainer) {
    cardsContainer.appendChild(draggedCard);
    draggedCard.dataset.currentStatus = newStatus;

    // Remove mensagem de vazio se existir
    const emptyMsg = cardsContainer.querySelector('.empty-column');
    if (emptyMsg) {
      emptyMsg.remove();
    }

    // Atualiza contadores
    updateCounters();

    // Atualiza na planilha
    try {
      await updateLeadStatus(leadId, newStatus);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      // Reverte visualmente se der erro
      const oldContainer = document.querySelector(`[data-status="${oldStatus}"] .cards-container`);
      if (oldContainer) {
        oldContainer.appendChild(draggedCard);
        draggedCard.dataset.currentStatus = oldStatus;
        updateCounters();
        alert('Erro ao atualizar status. Tente novamente.');
      }
    }
  }

  column.classList.remove('drag-over');
  draggedCard = null;
  return false;
}

// Atualiza contadores
function updateCounters() {
  Object.keys(STATUS_MAP).forEach(status => {
    const container = document.getElementById(`cards-${status}`);
    const count = container.querySelectorAll('.kanban-card').length;
    document.getElementById(`count-${status}`).textContent = count;
    
    if (count === 0 && !container.querySelector('.empty-column')) {
      container.innerHTML = '<div class="empty-column">Nenhum lead nesta etapa</div>';
    }
  });
}

// Atualiza status do lead na planilha
async function updateLeadStatus(leadId, newStatus) {
  const statusText = STATUS_MAP[newStatus] || newStatus;
  
  try {
    const response = await fetch(`${UPDATE_ENDPOINT}/${leadId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: statusText })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na resposta:', errorText);
      throw new Error('Erro ao atualizar status: ' + response.status);
    }

    const result = await response.json();
    if (result.ok === false) {
      throw new Error(result.message || 'Erro ao atualizar status');
    }

    return result;
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    throw error;
  }
}

// Busca timeline do lead
async function loadTimeline(leadId) {
  try {
    const response = await fetch(`${TIMELINE_ENDPOINT}/${leadId}/timeline`);
    if (!response.ok) throw new Error('Erro ao buscar timeline');
    const data = await response.json();
    return data.timeline || [];
  } catch (error) {
    console.error('Erro ao buscar timeline:', error);
    return [];
  }
}

// Função para fechar modal
function closeModal(modal) {
  modal.style.opacity = '0';
  modal.style.transform = 'scale(0.95)';
  setTimeout(() => {
    modal.remove();
  }, 200);
}

// Mostra timeline do lead em modal
async function showTimeline(leadId) {
  const timeline = await loadTimeline(leadId);
  
  const modal = document.createElement('div');
  modal.className = 'timeline-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 2rem;
    opacity: 0;
    animation: fadeInModal 0.3s ease-out forwards;
  `;

  const modalContent = document.createElement('div');
  modalContent.className = 'timeline-modal-content';
  modalContent.style.cssText = `
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.95));
    backdrop-filter: blur(20px);
    border-radius: 24px;
    padding: 0;
    max-width: 700px;
    width: 100%;
    max-height: 85vh;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.5) inset;
    border: 1px solid rgba(255, 255, 255, 0.3);
    display: flex;
    flex-direction: column;
    transform: scale(0.95);
    animation: slideUpModal 0.3s ease-out forwards;
  `;

  // Header do modal com botão X
  const modalHeader = document.createElement('div');
  modalHeader.style.cssText = `
    padding: 1.5rem 2rem;
    border-bottom: 2px solid rgba(15, 138, 60, 0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(135deg, rgba(15, 138, 60, 0.05), rgba(19, 192, 83, 0.05));
  `;

  const modalTitle = document.createElement('h2');
  modalTitle.style.cssText = `
    margin: 0;
    color: var(--color-background);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-family: 'Inter', 'Source Sans 3', sans-serif;
    font-size: 1.5rem;
    font-weight: 700;
  `;
  modalTitle.innerHTML = `
    <i class="fas fa-history" style="font-size: 1.5rem;"></i>
    Timeline do Lead
  `;

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '<i class="fas fa-times"></i>';
  closeBtn.style.cssText = `
    background: rgba(15, 138, 60, 0.1);
    border: 2px solid rgba(15, 138, 60, 0.2);
    color: var(--color-background);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    transition: all 0.3s ease;
    padding: 0;
  `;
  closeBtn.onmouseover = function() {
    this.style.background = 'var(--color-background)';
    this.style.color = 'white';
    this.style.transform = 'rotate(90deg) scale(1.1)';
  };
  closeBtn.onmouseout = function() {
    this.style.background = 'rgba(15, 138, 60, 0.1)';
    this.style.color = 'var(--color-background)';
    this.style.transform = 'rotate(0deg) scale(1)';
  };
  closeBtn.onclick = () => closeModal(modal);

  modalHeader.appendChild(modalTitle);
  modalHeader.appendChild(closeBtn);

  // Body do modal
  const modalBody = document.createElement('div');
  modalBody.style.cssText = `
    padding: 2rem;
    overflow-y: auto;
    flex: 1;
  `;

  let timelineHTML = '';
  
  if (timeline.length === 0) {
    timelineHTML = `
      <div style="text-align: center; padding: 3rem 1rem; color: rgba(15, 31, 19, 0.5);">
        <i class="fas fa-info-circle" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
        <p style="font-size: 1.1rem; margin: 0;">Nenhum histórico disponível</p>
      </div>
    `;
  } else {
    timelineHTML = '<div style="display: flex; flex-direction: column; gap: 1.5rem;">';
    timeline.forEach((entry, idx) => {
      const date = new Date(entry.data);
      const formattedDate = date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const statusIcons = {
        'Nova Indicação': { icon: 'fa-star', color: '#2563eb' },
        'Em Contato': { icon: 'fa-phone', color: '#f59e0b' },
        'Em Negociação': { icon: 'fa-handshake', color: '#8b5cf6' },
        'Fechado': { icon: 'fa-check-circle', color: '#10b981' },
        'Perdido': { icon: 'fa-times-circle', color: '#ef4444' }
      };
      
      const statusConfig = statusIcons[entry.status] || { icon: 'fa-circle', color: 'var(--color-background)' };
      
      timelineHTML += `
        <div style="
          border-left: 4px solid ${statusConfig.color};
          padding-left: 1.5rem;
          padding-bottom: 1.5rem;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          position: relative;
          transition: all 0.3s ease;
        " onmouseover="this.style.transform='translateX(5px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" onmouseout="this.style.transform='translateX(0)'; this.style.boxShadow='none'">
          <div style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, ${statusConfig.color}, ${statusConfig.color}dd);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.1rem;
            box-shadow: 0 4px 12px ${statusConfig.color}40;
            flex-shrink: 0;
          ">
            <i class="fas ${statusConfig.icon}"></i>
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 700; color: var(--color-dark); font-size: 1.1rem; margin-bottom: 0.5rem;">
              ${entry.status}
            </div>
            <div style="font-size: 0.9rem; color: rgba(15, 31, 19, 0.6); display: flex; align-items: center; gap: 0.5rem;">
              <i class="fas fa-clock" style="font-size: 0.85rem;"></i>
              ${formattedDate}
            </div>
          </div>
        </div>
      `;
    });
    timelineHTML += '</div>';
  }

  modalBody.innerHTML = timelineHTML;

  // Footer do modal
  const modalFooter = document.createElement('div');
  modalFooter.style.cssText = `
    padding: 1.5rem 2rem;
    border-top: 2px solid rgba(15, 138, 60, 0.1);
    display: flex;
    justify-content: flex-end;
    background: rgba(15, 138, 60, 0.02);
  `;

  const closeFooterBtn = document.createElement('button');
  closeFooterBtn.innerHTML = '<i class="fas fa-times"></i> Fechar';
  closeFooterBtn.style.cssText = `
    padding: 0.75rem 2rem;
    background: linear-gradient(135deg, var(--color-background), #13c053);
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 700;
    font-family: 'Inter', 'Ubuntu', sans-serif;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(15, 138, 60, 0.3);
  `;
  closeFooterBtn.onmouseover = function() {
    this.style.transform = 'translateY(-2px)';
    this.style.boxShadow = '0 6px 20px rgba(15, 138, 60, 0.4)';
  };
  closeFooterBtn.onmouseout = function() {
    this.style.transform = 'translateY(0)';
    this.style.boxShadow = '0 4px 12px rgba(15, 138, 60, 0.3)';
  };
  closeFooterBtn.onclick = () => closeModal(modal);

  modalFooter.appendChild(closeFooterBtn);

  modalContent.appendChild(modalHeader);
  modalContent.appendChild(modalBody);
  modalContent.appendChild(modalFooter);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  // Fechar ao clicar fora
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal(modal);
    }
  });

  // Fechar com ESC
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal(modal);
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

// Funções para filtro de indicador
function showIndicadorDropdown() {
  const dropdown = document.getElementById('indicadorDropdown');
  if (dropdown) {
    populateIndicadorDropdown();
    dropdown.style.display = 'block';
  }
}

function hideIndicadorDropdown() {
  const dropdown = document.getElementById('indicadorDropdown');
  if (dropdown) {
    dropdown.style.display = 'none';
  }
}

function populateIndicadorDropdown() {
  const dropdown = document.getElementById('indicadorDropdown');
  const select = document.getElementById('indicadorFilter');
  const input = document.getElementById('indicadorFilterInput');
  
  if (!dropdown || !select) return;

  dropdown.innerHTML = '';
  
  // Adiciona opção "Todos"
  const allOption = document.createElement('div');
  allOption.style.cssText = 'padding: 0.75rem; cursor: pointer; border-bottom: 1px solid rgba(15, 138, 60, 0.1);';
  allOption.textContent = 'Todos os Indicadores';
  allOption.onclick = () => {
    select.value = 'all';
    input.value = '';
    const hiddenField = document.getElementById('indicadorFilterHidden');
    if (hiddenField) {
      hiddenField.value = 'all';
    }
    hideIndicadorDropdown();
      // Aplica filtro automaticamente após seleção
      applyFilters();
  };
  dropdown.appendChild(allOption);

  // Filtra indicadores baseado no input
  const searchTerm = (input?.value || '').toLowerCase();
  const filtered = INDICADORES_LIST.filter(p => 
    p.nome.toLowerCase().includes(searchTerm) || 
    p.id.toLowerCase().includes(searchTerm)
  );

  filtered.forEach(indicador => {
    const option = document.createElement('div');
    option.style.cssText = 'padding: 0.75rem; cursor: pointer; border-bottom: 1px solid rgba(15, 138, 60, 0.1);';
    option.innerHTML = `
      <div style="font-weight: 700; color: var(--color-background);">${indicador.nome}</div>
      <div style="font-size: 0.85rem; color: #666;">ID: ${indicador.id}</div>
    `;
    option.onclick = () => {
      select.value = indicador.id;
      input.value = indicador.nome;
      // Atualiza também o campo oculto para garantir
      const hiddenField = document.getElementById('indicadorFilterHidden');
      if (hiddenField) {
        hiddenField.value = indicador.id;
      }
      hideIndicadorDropdown();
      console.log('Indicador selecionado:', indicador.nome, 'ID:', indicador.id);
      console.log('Valor do select:', select.value);
      // Aplica filtro automaticamente após seleção
      applyFilters();
    };
    dropdown.appendChild(option);
  });

  if (filtered.length === 0) {
    const noResults = document.createElement('div');
    noResults.style.cssText = 'padding: 0.75rem; color: #666; text-align: center;';
    noResults.textContent = 'Nenhum indicador encontrado';
    dropdown.appendChild(noResults);
  }
}

function filterIndicadores() {
  populateIndicadorDropdown();
}

function clearFilters() {
  const indicadorInput = document.getElementById('indicadorFilterInput');
  const indicadorSelect = document.getElementById('indicadorFilter');
  const dateInicio = document.getElementById('dateFilterInicio');
  const dateFim = document.getElementById('dateFilterFim');

  if (indicadorInput) indicadorInput.value = '';
  if (indicadorSelect) indicadorSelect.value = 'all';
  if (dateInicio) dateInicio.value = '';
  if (dateFim) dateFim.value = '';

  // Limpa os filtros e recarrega todos os dados
  loadCRM();
}

// Inicializa quando a página carrega
document.addEventListener('DOMContentLoaded', checkAuth);

