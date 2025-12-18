// Configuração
const DASHBOARD_EMAIL = 'admin@cartaodetodos.com.br';
const DASHBOARD_PASSWORD = 'admin123';
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

// Variáveis globais
let promotorData = null;
let allLeads = [];
let filteredLeads = [];
const ITEMS_PER_PAGE = 20;
let currentPage = 1;
const VALOR_PLANO = 59.99;

// Função para converter formato brasileiro para Date
function parseBrazilianDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return null;
  
  const trimmed = dateString.trim();
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  if (match) {
    const [, dia, mes, ano, hora, minuto] = match;
    const date = new Date(Date.UTC(
      parseInt(ano, 10),
      parseInt(mes, 10) - 1,
      parseInt(dia, 10),
      parseInt(hora, 10) + 3,
      parseInt(minuto, 10),
      0
    ));
    return date;
  }
  
  try {
    return new Date(dateString);
  } catch {
    return null;
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

// Formata valor em reais
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Formata data para exibição
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  try {
    const date = parseBrazilianDate(dateString);
    if (!date || isNaN(date.getTime())) return 'N/A';
    
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const ano = date.getFullYear();
    const hora = String(date.getHours()).padStart(2, '0');
    const minuto = String(date.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
  } catch {
    return 'N/A';
  }
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

// Carrega dados do promotor
async function loadPromotorData() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const contentEl = document.getElementById('content');

  loadingEl.style.display = 'block';
  errorEl.style.display = 'none';
  contentEl.style.display = 'none';

  try {
    // Tenta buscar do sessionStorage primeiro
    let stored = sessionStorage.getItem('promotorDetalhes');
    
    // Se não tiver no sessionStorage, busca da API usando parâmetro da URL
    if (!stored) {
      const params = new URLSearchParams(window.location.search);
      const promotorNome = params.get('promotor');
      
      if (!promotorNome) {
        throw new Error('Promotor não especificado');
      }

      // Busca dados da API
      const response = await fetch(`${API_BASE_URL}/api/promotores`);
      if (!response.ok) {
        throw new Error('Erro ao buscar dados da API');
      }

      const data = await response.json();
      if (data.ok === false) {
        throw new Error(data.message || 'Erro ao processar dados');
      }

      // Encontra o promotor pelo nome
      const promotor = data.promotores.find(p => p.nome === decodeURIComponent(promotorNome));
      if (!promotor) {
        throw new Error('Promotor não encontrado');
      }

      // Prepara dados no formato esperado
      promotorData = {
        nome: promotor.nome,
        leads: promotor.leads,
        metricas: {
          totalLeads: promotor.totalLeads,
          leadsFechados: promotor.leadsFechados,
          valorGerado: promotor.valorGerado,
          taxaConversao: promotor.taxaConversao,
          taxaPerda: promotor.taxaPerda,
          leadsPorStatus: promotor.leadsPorStatus,
          indicadores: promotor.indicadores
        }
      };
    } else {
      promotorData = JSON.parse(stored);
    }

    allLeads = promotorData.leads || [];

    // Atualiza título
    document.getElementById('promotorNome').innerHTML = `
      <i class="fas fa-user-tie"></i>
      ${promotorData.nome}
    `;

    // Renderiza métricas
    renderMetricas();

    // Aplica filtros iniciais
    applyFilters();

    loadingEl.style.display = 'none';
    contentEl.style.display = 'block';
  } catch (error) {
    console.error('Erro ao carregar dados do promotor:', error);
    loadingEl.style.display = 'none';
    errorEl.textContent = 'Erro ao carregar dados. ' + error.message;
    errorEl.style.display = 'block';
  }
}

// Renderiza métricas
function renderMetricas() {
  const metricas = promotorData.metricas;
  const metricasGrid = document.getElementById('metricasGrid');

  metricasGrid.innerHTML = `
    <div class="metrica-card valor-gerado-card">
      <div class="metrica-label">
        <i class="fas fa-dollar-sign"></i>
        Valor Gerado
      </div>
      <div class="metrica-value">${formatCurrency(metricas.valorGerado)}</div>
    </div>
    <div class="metrica-card">
      <div class="metrica-label">
        <i class="fas fa-hand-pointer"></i>
        Total de Leads
      </div>
      <div class="metrica-value">${metricas.totalLeads}</div>
    </div>
    <div class="metrica-card">
      <div class="metrica-label">
        <i class="fas fa-check-circle"></i>
        Leads Fechados
      </div>
      <div class="metrica-value">${metricas.leadsFechados}</div>
    </div>
    <div class="metrica-card">
      <div class="metrica-label">
        <i class="fas fa-percentage"></i>
        Taxa de Conversão
      </div>
      <div class="metrica-value">${metricas.taxaConversao}%</div>
    </div>
    <div class="metrica-card">
      <div class="metrica-label">
        <i class="fas fa-times-circle"></i>
        Taxa de Perda
      </div>
      <div class="metrica-value">${metricas.taxaPerda}%</div>
    </div>
        ${metricas.indicadores && metricas.indicadores.length > 0 ? `
          <div class="metrica-card">
            <div class="metrica-label">
              <i class="fas fa-users"></i>
              Indicadores
            </div>
            <div class="metrica-value">${metricas.indicadores.length}</div>
          </div>
        ` : ''}
  `;
}

// Aplica filtros
function applyFilters() {
  const searchTerm = (document.getElementById('searchFilter')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('statusFilter')?.value || '';
  const sortBy = document.getElementById('sortFilter')?.value || 'recentes';

  filteredLeads = allLeads.filter(lead => {
    // Filtro de busca (nome ou telefone)
    if (searchTerm) {
      const nome = (lead.nome || '').toLowerCase();
      const telefone = (lead.telefone || '').toLowerCase();
      if (!nome.includes(searchTerm) && !telefone.includes(searchTerm)) {
        return false;
      }
    }

    // Filtro de status
    if (statusFilter) {
      const status = lead.status || 'Nova Indicação';
      if (status !== statusFilter) {
        return false;
      }
    }

    return true;
  });

  // Aplica ordenação
  filteredLeads.sort((a, b) => {
    switch (sortBy) {
      case 'recentes':
        const dataA = parseBrazilianDate(a.dataHora || '');
        const dataB = parseBrazilianDate(b.dataHora || '');
        if (!dataA && !dataB) return 0;
        if (!dataA) return 1;
        if (!dataB) return -1;
        return dataB - dataA;
      
      case 'antigos':
        const dataAOld = parseBrazilianDate(a.dataHora || '');
        const dataBOld = parseBrazilianDate(b.dataHora || '');
        if (!dataAOld && !dataBOld) return 0;
        if (!dataAOld) return 1;
        if (!dataBOld) return -1;
        return dataAOld - dataBOld;
      
      case 'nome-az':
        const nomeA = (a.nome || '').toLowerCase();
        const nomeB = (b.nome || '').toLowerCase();
        return nomeA.localeCompare(nomeB, 'pt-BR');
      
      case 'nome-za':
        const nomeAZ = (a.nome || '').toLowerCase();
        const nomeBZ = (b.nome || '').toLowerCase();
        return nomeBZ.localeCompare(nomeAZ, 'pt-BR');
      
      default:
        return 0;
    }
  });

  currentPage = 1;
  renderLeads();
}

// Limpa filtros
function clearFilters() {
  document.getElementById('searchFilter').value = '';
  document.getElementById('statusFilter').value = '';
  document.getElementById('sortFilter').value = 'recentes';
  applyFilters();
}

// Renderiza leads
function renderLeads() {
  const listEl = document.getElementById('leadsList');
  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);

  if (filteredLeads.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <h3>Nenhum lead encontrado</h3>
        <p>Tente ajustar os filtros de busca.</p>
      </div>
    `;
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  // Calcula índices da página atual
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pageLeads = filteredLeads.slice(startIndex, endIndex);

  // Renderiza cards
  listEl.innerHTML = pageLeads.map(lead => {
    const nome = lead.nome || 'Sem nome';
    const telefone = lead.telefone || 'Sem telefone';
    const status = lead.status || 'Nova Indicação';
    const dataHora = lead.dataHora || '';
    const vendedor = lead.vendedor || '';
    const statusClass = getStatusClass(status);

    return `
      <div class="lead-card">
        <div class="lead-header">
          <h3 class="lead-name">${nome}</h3>
          <span class="status-badge ${statusClass}">${status}</span>
        </div>
        <div class="lead-info">
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
          ${vendedor ? `
            <div class="info-item">
              <i class="fas fa-user-tie"></i>
              <span>Vendedor: ${vendedor}</span>
            </div>
          ` : ''}
          ${lead.status === 'Fechado' ? `
            <div class="info-item">
              <i class="fas fa-dollar-sign" style="color: #10b981;"></i>
              <span style="color: #10b981; font-weight: 700;">Valor: ${formatCurrency(VALOR_PLANO)}/mês</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Renderiza paginação
  renderPagination(totalPages);
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
  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
  if (page < 1 || page > totalPages) return;
  
  currentPage = page;
  renderLeads();
  
  // Scroll para o topo
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Inicialização
if (checkAuth()) {
  loadPromotorData();
}

