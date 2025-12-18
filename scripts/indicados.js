// Configuração
const DASHBOARD_EMAIL = 'admin@cartaodetodos.com.br';
const DASHBOARD_PASSWORD = 'admin123';
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';
const DATA_ENDPOINT = `${API_BASE_URL}/api/dashboard`;
const TIMELINE_ENDPOINT = `${API_BASE_URL}/api/leads`;

// Variáveis globais
let currentIndicadorId = null;
let allIndicadosData = [];
let filteredIndicados = [];
const ITEMS_PER_PAGE = 20;
let currentPage = 1;

// Função para converter formato brasileiro para Date
function parseBrazilianDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return null;
  
  const trimmed = dateString.trim();
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (match) {
    const [, dia, mes, ano, hora, minuto, segundo] = match;
    const date = new Date(Date.UTC(
      parseInt(ano, 10),
      parseInt(mes, 10) - 1,
      parseInt(dia, 10),
      parseInt(hora, 10) + 3,
      parseInt(minuto, 10),
      parseInt(segundo, 10)
    ));
    return date;
  }
  
  try {
    return new Date(dateString);
  } catch {
    return null;
  }
}

// Formata data para exibição
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  try {
    if (typeof dateString === 'string') {
      const trimmed = dateString.trim();
      
      // Se já está no formato brasileiro, retorna apenas data/hora sem segundos
      const match = trimmed.match(/^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})(:\d{2})?$/);
      if (match) {
        return `${match[1]} ${match[2]}`;
      }
      
      // Tenta parse brasileiro primeiro
      const date = parseBrazilianDate(trimmed);
      if (date && !isNaN(date.getTime())) {
        const dia = String(date.getUTCDate()).padStart(2, '0');
        const mes = String(date.getUTCMonth() + 1).padStart(2, '0');
        const ano = date.getUTCFullYear();
        const hora = String(date.getUTCHours()).padStart(2, '0');
        const minuto = String(date.getUTCMinutes()).padStart(2, '0');
        return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
      }
      
      // Tenta parse ISO ou outros formatos
      const dateISO = new Date(trimmed);
      if (!isNaN(dateISO.getTime())) {
        const dia = String(dateISO.getDate()).padStart(2, '0');
        const mes = String(dateISO.getMonth() + 1).padStart(2, '0');
        const ano = dateISO.getFullYear();
        const hora = String(dateISO.getHours()).padStart(2, '0');
        const minuto = String(dateISO.getMinutes()).padStart(2, '0');
        return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
      }
    }
    
    // Se for um objeto Date
    if (dateString instanceof Date && !isNaN(dateString.getTime())) {
      const dia = String(dateString.getDate()).padStart(2, '0');
      const mes = String(dateString.getMonth() + 1).padStart(2, '0');
      const ano = dateString.getFullYear();
      const hora = String(dateString.getHours()).padStart(2, '0');
      const minuto = String(dateString.getMinutes()).padStart(2, '0');
      return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
    }
    
    return 'N/A';
  } catch (error) {
    console.error('Erro ao formatar data:', dateString, error);
    return 'N/A';
  }
}

// Verifica autenticação
function checkAuth() {
  const isAuthenticated = sessionStorage.getItem('dashboardAuth') === 'true';
  if (!isAuthenticated) {
    window.location.href = 'dashboard.html';
    return false;
  }
  return true;
}

// Logout
function logout() {
  sessionStorage.removeItem('dashboardAuth');
  window.location.href = 'dashboard.html';
}

// Obtém indicador ID da URL
function getIndicadorIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('indicador');
}

// Carrega dados dos indicados
async function loadIndicados() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const contentEl = document.getElementById('indicadosContent');

  currentIndicadorId = getIndicadorIdFromURL();
  
  if (!currentIndicadorId) {
    errorEl.textContent = 'Indicador não especificado.';
    errorEl.style.display = 'block';
    loadingEl.style.display = 'none';
    return;
  }

  loadingEl.style.display = 'block';
  errorEl.style.display = 'none';
  contentEl.style.display = 'none';

  try {
    const response = await fetch(DATA_ENDPOINT);
    
    if (!response.ok) {
      throw new Error('Erro ao buscar dados');
    }

    const data = await response.json();

    if (data.ok === false) {
      throw new Error(data.message || 'Erro ao processar dados');
    }

    // Processa dados dos indicados
    processIndicadosData(data);

    loadingEl.style.display = 'none';
    contentEl.style.display = 'block';
  } catch (error) {
    console.error('Erro ao carregar indicados:', error);
    loadingEl.style.display = 'none';
    errorEl.textContent = 'Erro ao carregar dados. Verifique se o endpoint está configurado corretamente.';
    errorEl.style.display = 'block';
  }
}

// Processa dados dos indicados
function processIndicadosData(data) {
  const indicacoes = data.indicacoes || [];
  const indicadores = data.indicadores || {};
  
  // Obtém nome do indicador
  const indicadorNome = indicadores[currentIndicadorId] || `Código ${currentIndicadorId}`;
  document.getElementById('indicadorInfo').textContent = `Indicador: ${indicadorNome} (ID: ${currentIndicadorId})`;
  
  // Filtra indicações do indicador
  allIndicadosData = indicacoes.filter(indicacao => {
    const codigo = String(indicacao.codigoIndicacao || indicacao['Código de Indicação'] || '').trim();
    return codigo === String(currentIndicadorId).trim();
  });

  // Aplica filtros (a ordenação será feita dentro de applyFilters)
  applyFilters();
}

// Aplica filtros
function applyFilters() {
  const searchTerm = (document.getElementById('searchFilter')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('statusFilter')?.value || '';
  const dateInicio = document.getElementById('dateFilterInicio')?.value || '';
  const dateFim = document.getElementById('dateFilterFim')?.value || '';
  const sortBy = document.getElementById('sortFilter')?.value || 'recentes';

  filteredIndicados = allIndicadosData.filter(indicacao => {
    // Filtro de busca (nome ou telefone)
    if (searchTerm) {
      const nome = (indicacao.nome || indicacao.Nome || '').toLowerCase();
      const telefone = (indicacao.telefone || indicacao.Telefone || '').toLowerCase();
      if (!nome.includes(searchTerm) && !telefone.includes(searchTerm)) {
        return false;
      }
    }

    // Filtro de status
    if (statusFilter) {
      const status = indicacao.status || indicacao.Status || 'Nova Indicação';
      if (status !== statusFilter) {
        return false;
      }
    }

    // Filtro de período (data inicial e/ou final)
    if (dateInicio || dateFim) {
      const dataHora = indicacao.dataHora || indicacao['Data e Hora'] || indicacao['Data de Criação'] || '';
      if (!dataHora) return false;
      
      try {
        const indicacaoDate = parseBrazilianDate(dataHora);
        if (!indicacaoDate) return false;

        // Filtro de data início
        if (dateInicio) {
          const [anoInicio, mesInicio, diaInicio] = dateInicio.split('-');
          const dataInicioStr = `${String(diaInicio).padStart(2, '0')}/${String(mesInicio).padStart(2, '0')}/${anoInicio} 00:00:00`;
          const inicio = parseBrazilianDate(dataInicioStr);
          if (!inicio || indicacaoDate < inicio) {
            return false;
          }
        }

        // Filtro de data fim
        if (dateFim) {
          const [anoFim, mesFim, diaFim] = dateFim.split('-');
          const dataFimStr = `${String(diaFim).padStart(2, '0')}/${String(mesFim).padStart(2, '0')}/${anoFim} 23:59:59`;
          const fim = parseBrazilianDate(dataFimStr);
          if (!fim || indicacaoDate > fim) {
            return false;
          }
        }
      } catch (error) {
        console.error('Erro ao processar filtro de data:', error);
        return false;
      }
    }

    return true;
  });

  // Aplica ordenação
  filteredIndicados.sort((a, b) => {
    switch (sortBy) {
      case 'recentes':
        // Mais recentes primeiro
        const dataA = parseBrazilianDate(a.dataHora || a['Data e Hora'] || a['Data de Criação'] || '');
        const dataB = parseBrazilianDate(b.dataHora || b['Data e Hora'] || b['Data de Criação'] || '');
        if (!dataA && !dataB) return 0;
        if (!dataA) return 1;
        if (!dataB) return -1;
        return dataB - dataA;
      
      case 'antigos':
        // Mais antigos primeiro
        const dataAOld = parseBrazilianDate(a.dataHora || a['Data e Hora'] || a['Data de Criação'] || '');
        const dataBOld = parseBrazilianDate(b.dataHora || b['Data e Hora'] || b['Data de Criação'] || '');
        if (!dataAOld && !dataBOld) return 0;
        if (!dataAOld) return 1;
        if (!dataBOld) return -1;
        return dataAOld - dataBOld;
      
      case 'nome-az':
        // Nome A-Z
        const nomeA = (a.nome || a.Nome || '').toLowerCase();
        const nomeB = (b.nome || b.Nome || '').toLowerCase();
        return nomeA.localeCompare(nomeB, 'pt-BR');
      
      case 'nome-za':
        // Nome Z-A
        const nomeAZ = (a.nome || a.Nome || '').toLowerCase();
        const nomeBZ = (b.nome || b.Nome || '').toLowerCase();
        return nomeBZ.localeCompare(nomeAZ, 'pt-BR');
      
      case 'status':
        // Por status (ordem: Nova Indicação, Em Contato, Em Negociação, Fechado, Perdido)
        const statusOrder = {
          'Nova Indicação': 1,
          'Em Contato': 2,
          'Em Negociação': 3,
          'Fechado': 4,
          'Perdido': 5
        };
        const statusA = statusOrder[a.status || a.Status || 'Nova Indicação'] || 99;
        const statusB = statusOrder[b.status || b.Status || 'Nova Indicação'] || 99;
        if (statusA !== statusB) return statusA - statusB;
        // Se mesmo status, ordena por data (mais recente primeiro)
        const dataAStatus = parseBrazilianDate(a.dataHora || a['Data e Hora'] || a['Data de Criação'] || '');
        const dataBStatus = parseBrazilianDate(b.dataHora || b['Data e Hora'] || b['Data de Criação'] || '');
        if (!dataAStatus && !dataBStatus) return 0;
        if (!dataAStatus) return 1;
        if (!dataBStatus) return -1;
        return dataBStatus - dataAStatus;
      
      default:
        return 0;
    }
  });

  currentPage = 1;
  renderIndicados();
}

// Limpa filtros
function clearFilters() {
  document.getElementById('searchFilter').value = '';
  document.getElementById('statusFilter').value = '';
  document.getElementById('dateFilterInicio').value = '';
  document.getElementById('dateFilterFim').value = '';
  document.getElementById('sortFilter').value = 'recentes';
  applyFilters();
}

// Obtém classe CSS do status
function getStatusClass(status) {
  const statusMap = {
    'Nova Indicação': 'status-nova',
    'Em Contato': 'status-contato',
    'Em Negociação': 'status-negociacao',
    'Fechado': 'status-fechado',
    'Perdido': 'status-perdido'
  };
  return statusMap[status] || 'status-nova';
}

// Renderiza indicados
function renderIndicados() {
  const listEl = document.getElementById('indicadosList');
  const totalPages = Math.ceil(filteredIndicados.length / ITEMS_PER_PAGE);
  
  // Anima saída dos cards existentes
  const existingCards = listEl.querySelectorAll('.indicado-card');
  const hasExistingCards = existingCards.length > 0;
  
  existingCards.forEach((card, index) => {
    card.classList.add('fade-out');
    card.style.animationDelay = `${index * 0.02}s`;
  });

  // Aguarda animação de saída antes de renderizar novos cards
  setTimeout(() => {
    if (filteredIndicados.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state" style="animation: cardFadeIn 0.5s ease forwards;">
          <i class="fas fa-inbox"></i>
          <h3>Nenhum indicado encontrado</h3>
          <p>Tente ajustar os filtros de busca.</p>
        </div>
      `;
      document.getElementById('pagination').innerHTML = '';
      return;
    }

    // Calcula índices da página atual
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageIndicados = filteredIndicados.slice(startIndex, endIndex);

    // Renderiza cards com animações escalonadas
    listEl.innerHTML = pageIndicados.map((indicacao, index) => {
    const nome = indicacao.nome || indicacao.Nome || 'Sem nome';
    const telefone = indicacao.telefone || indicacao.Telefone || 'Sem telefone';
    const dataHora = indicacao.dataHora || indicacao['Data e Hora'] || indicacao['Data de Criação'] || '';
    const status = indicacao.status || indicacao.Status || 'Nova Indicação';
    const origem = indicacao.origem || indicacao.Origem || '';
    const statusClass = getStatusClass(status);
    
    return `
      <div class="indicado-card" style="animation-delay: ${index * 0.05}s;">
        <div class="indicado-header">
          <h3 class="indicado-name">${nome}</h3>
          <span class="status-badge ${statusClass}">${status}</span>
        </div>
        
        <div class="indicado-info">
          <div class="info-item">
            <i class="fas fa-phone"></i>
            <span>${telefone}</span>
          </div>
          
          ${dataHora ? `
            <div class="info-item">
              <i class="fas fa-calendar-alt"></i>
              <span>${formatDate(dataHora)}</span>
            </div>
          ` : ''}
          
          ${origem ? `
            <div class="info-item">
              <i class="fas fa-globe"></i>
              <span>${origem}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="indicado-actions">
          <button class="action-btn" onclick="showTimeline('${indicacao.id || indicacao.ID || ''}')">
            <i class="fas fa-clock-rotate-left"></i> Ver Timeline
          </button>
        </div>
        </div>
      `;
    }).join('');

    // Adiciona animação de entrada aos cards
    setTimeout(() => {
      const cards = listEl.querySelectorAll('.indicado-card');
      cards.forEach((card, index) => {
        card.style.animation = `cardFadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.05}s forwards`;
      });
    }, 10);

    // Renderiza paginação
    renderPagination(totalPages);
  }, hasExistingCards ? 300 : 0);
}

// Renderiza paginação
function renderPagination(totalPages) {
  const paginationEl = document.getElementById('pagination');
  
  if (totalPages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }

  let paginationHTML = '';

  // Botão Anterior
  paginationHTML += `
    <button 
      class="pagination-btn" 
      onclick="changePage(${currentPage - 1})"
      ${currentPage === 1 ? 'disabled' : ''}
    >
      <i class="fas fa-chevron-left"></i>
    </button>
  `;

  // Páginas
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  if (startPage > 1) {
    paginationHTML += `<button class="pagination-btn" onclick="changePage(1)">1</button>`;
    if (startPage > 2) {
      paginationHTML += `<span style="padding: 0.75rem;">...</span>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
      <button 
        class="pagination-btn ${i === currentPage ? 'active' : ''}" 
        onclick="changePage(${i})"
      >
        ${i}
      </button>
    `;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHTML += `<span style="padding: 0.75rem;">...</span>`;
    }
    paginationHTML += `<button class="pagination-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
  }

  // Botão Próximo
  paginationHTML += `
    <button 
      class="pagination-btn" 
      onclick="changePage(${currentPage + 1})"
      ${currentPage === totalPages ? 'disabled' : ''}
    >
      <i class="fas fa-chevron-right"></i>
    </button>
  `;

  paginationEl.innerHTML = paginationHTML;
}

// Muda de página
function changePage(page) {
  const totalPages = Math.ceil(filteredIndicados.length / ITEMS_PER_PAGE);
  if (page < 1 || page > totalPages) return;
  
  currentPage = page;
  renderIndicados();
  
  // Scroll para o topo
  window.scrollTo({ top: 0, behavior: 'smooth' });
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

// Mostra timeline
async function showTimeline(leadId) {
  const timeline = await loadTimeline(leadId);
  const modal = document.getElementById('timelineModal');
  const content = document.getElementById('timelineContent');
  
  if (timeline.length === 0) {
    content.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; color: rgba(15, 31, 19, 0.5);">
        <i class="fas fa-info-circle" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
        <p>Nenhum histórico disponível para este lead.</p>
      </div>
    `;
  } else {
    content.innerHTML = timeline.map((entry, index) => {
      const statusIcons = {
        'Nova Indicação': 'fa-star',
        'Em Contato': 'fa-phone',
        'Em Negociação': 'fa-handshake',
        'Fechado': 'fa-check-circle',
        'Perdido': 'fa-times-circle'
      };
      
      const statusColors = {
        'Nova Indicação': '#2563eb',
        'Em Contato': '#f59e0b',
        'Em Negociação': '#8b5cf6',
        'Fechado': '#10b981',
        'Perdido': '#ef4444'
      };
      
      const icon = statusIcons[entry.status] || 'fa-circle';
      const color = statusColors[entry.status] || '#666';
      
      // Tenta múltiplos campos de data
      const dataHora = entry.dataHora || entry.data || entry.dataHoraStatus || entry.timestamp || '';
      
      return `
        <div style="display: flex; gap: 1rem; padding: 1rem; border-radius: 12px; background: rgba(15, 138, 60, 0.05); margin-bottom: 1rem; border-left: 4px solid ${color};">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: ${color}; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;">
            <i class="fas ${icon}"></i>
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 700; color: var(--color-dark); margin-bottom: 0.25rem;">${entry.status}</div>
            <div style="font-size: 0.9rem; color: rgba(15, 31, 19, 0.6);">${formatDate(dataHora)}</div>
            ${entry.observacao ? `<div style="margin-top: 0.5rem; font-size: 0.9rem; color: rgba(15, 31, 19, 0.7);">${entry.observacao}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }
  
  modal.style.display = 'flex';
}

// Fecha modal de timeline
function closeTimelineModal() {
  const modal = document.getElementById('timelineModal');
  modal.style.display = 'none';
}

// Fecha modal ao clicar fora
document.addEventListener('click', (e) => {
  const modal = document.getElementById('timelineModal');
  if (e.target === modal) {
    closeTimelineModal();
  }
});

// Inicialização
if (checkAuth()) {
  loadIndicados();
}

