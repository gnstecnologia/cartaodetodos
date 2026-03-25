// Configuração
const DASHBOARD_EMAIL = 'admin@cartaodetodos.com.br';
const DASHBOARD_PASSWORD = 'admin123';
const API_BASE_URL = window.API_BASE_URL || window.location.origin;
const PROMOTORES_ENDPOINT = `${API_BASE_URL}/api/promotores`;

// Variáveis globais
let allPromotoresData = [];
let filteredPromotores = [];
const ITEMS_PER_PAGE = 12;
let currentPage = 1;
let valorPlano = 59.99;

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
async function checkAuth() {
  const user = await window.AuthClient.ensureAuthenticatedPage({ redirectTo: 'dashboard.html' });
  return Boolean(user);
}

// Logout
function logout() {
  window.AuthClient.logoutSession().finally(() => {
    window.location.href = 'dashboard.html';
  });
}

// Carrega dados dos promotores
async function loadPromotores() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const contentEl = document.getElementById('promotoresContent');

  loadingEl.style.display = 'block';
  errorEl.style.display = 'none';
  contentEl.style.display = 'none';

  try {
    const dataInicio = document.getElementById('dateFilterInicio')?.value || '';
    const dataFim = document.getElementById('dateFilterFim')?.value || '';
    
    let url = PROMOTORES_ENDPOINT;
    const params = new URLSearchParams();
    if (dataInicio) params.append('dataInicio', dataInicio);
    if (dataFim) params.append('dataFim', dataFim);
    if (params.toString()) url += '?' + params.toString();

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Erro ao buscar dados');
    }

    const data = await response.json();

    if (data.ok === false) {
      throw new Error(data.message || 'Erro ao processar dados');
    }

    valorPlano = data.valorPlano || 59.99;
    allPromotoresData = data.promotores || [];

    console.log('Promotores carregados:', allPromotoresData.length);
    console.log('Dados dos promotores:', allPromotoresData);

    // Aplica filtros
    applyFilters();

    loadingEl.style.display = 'none';
    contentEl.style.display = 'block';
  } catch (error) {
    console.error('Erro ao carregar promotores:', error);
    loadingEl.style.display = 'none';
    errorEl.textContent = 'Erro ao carregar dados. Verifique se o endpoint está configurado corretamente.';
    errorEl.style.display = 'block';
  }
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
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const ano = date.getFullYear();
    return `${dia}/${mes}/${ano}`;
  } catch {
    return 'N/A';
  }
}

// Aplica filtros
function applyFilters() {
  if (!allPromotoresData || allPromotoresData.length === 0) {
    console.warn('Nenhum dado de promotores disponível para filtrar');
    return;
  }

  const searchTerm = (document.getElementById('searchFilter')?.value || '').toLowerCase().trim();

  filteredPromotores = allPromotoresData.filter(promotor => {
    // Filtro de busca (nome)
    if (searchTerm) {
      const nomeMatch = promotor.nome.toLowerCase().includes(searchTerm);
      if (!nomeMatch) return false;
    }

    return true;
  });

  // Mantém ordenação por valor gerado
  filteredPromotores.sort((a, b) => (b.valorGerado || 0) - (a.valorGerado || 0));

  currentPage = 1;
  renderPromotores();
}

// Limpa filtros
function clearFilters() {
  document.getElementById('searchFilter').value = '';
  document.getElementById('dateFilterInicio').value = '';
  document.getElementById('dateFilterFim').value = '';
  loadPromotores();
}

// Renderiza promotores
function renderPromotores() {
  const gridEl = document.getElementById('promotoresGrid');
  if (!gridEl) {
    console.error('Elemento promotoresGrid não encontrado!');
    return;
  }
  
  const totalPages = Math.ceil(filteredPromotores.length / ITEMS_PER_PAGE);
  
  if (filteredPromotores.length === 0) {
    gridEl.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <h3>Nenhum promotor encontrado</h3>
        <p>Tente ajustar os filtros de busca.</p>
      </div>
    `;
    const paginationEl = document.getElementById('pagination');
    if (paginationEl) {
      paginationEl.innerHTML = '';
    }
    return;
  }

    // Calcula índices da página atual
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pagePromotores = filteredPromotores.slice(startIndex, endIndex);

  // Renderiza cards
  gridEl.innerHTML = pagePromotores.map((promotor, index) => {
    try {
      const rank = startIndex + index + 1;
      const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';
      const leadsPorStatus = promotor.leadsPorStatus || {};
      
      return `
        <div class="promotor-card" onclick="viewPromotorLeads('${encodeURIComponent(promotor.nome || '')}')" style="animation-delay: ${index * 0.05}s;">
        <div class="promotor-card-header">
          <h3 class="promotor-name">${promotor.nome || 'Sem nome'}</h3>
          <span class="promotor-rank ${rankClass}">#${rank}</span>
        </div>
        
        <div class="promotor-stats">
          <div class="stat-item valor-gerado-item">
            <span class="stat-label">
              <i class="fas fa-dollar-sign"></i>
              Valor Gerado
            </span>
            <span class="stat-value valor-gerado-value">${formatCurrency(promotor.valorGerado || 0)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">
              <i class="fas fa-hand-pointer"></i>
              Total de Leads
            </span>
            <span class="stat-value">${promotor.totalLeads || 0}</span>
          </div>
        </div>

        <div class="status-breakdown">
          ${(leadsPorStatus['Nova Indicação'] || 0) > 0 ? `
            <span class="status-badge status-nova">
              <i class="fas fa-star"></i>
              Nova: ${leadsPorStatus['Nova Indicação']}
            </span>
          ` : ''}
          ${(leadsPorStatus['Em Contato'] || 0) > 0 ? `
            <span class="status-badge status-contato">
              <i class="fas fa-phone"></i>
              Contato: ${leadsPorStatus['Em Contato']}
            </span>
          ` : ''}
          ${(leadsPorStatus['Em Negociação'] || 0) > 0 ? `
            <span class="status-badge status-negociacao">
              <i class="fas fa-handshake"></i>
              Negociação: ${leadsPorStatus['Em Negociação']}
            </span>
          ` : ''}
          ${(leadsPorStatus['Fechado'] || 0) > 0 ? `
            <span class="status-badge status-fechado">
              <i class="fas fa-check-circle"></i>
              Fechado: ${leadsPorStatus['Fechado']}
            </span>
          ` : ''}
          ${(leadsPorStatus['Perdido'] || 0) > 0 ? `
            <span class="status-badge status-perdido">
              <i class="fas fa-times-circle"></i>
              Perdido: ${leadsPorStatus['Perdido']}
            </span>
          ` : ''}
        </div>

        <div class="promotor-footer">
          <span>
            <i class="fas fa-calendar-alt"></i>
            ${promotor.primeiraData ? `Desde ${formatDate(promotor.primeiraData)}` : 'Sem histórico'}
          </span>
          ${promotor.indicadores && promotor.indicadores.length > 0 ? `
            <span>
              <i class="fas fa-users"></i>
              ${promotor.indicadores.length} indicador${promotor.indicadores.length > 1 ? 'es' : ''}
            </span>
          ` : ''}
        </div>
      </div>
      `;
    } catch (error) {
      console.error('Erro ao renderizar card do promotor:', error, promotor);
      return `<div class="promotor-card" style="border: 2px solid red;">
        <p>Erro ao carregar dados do promotor</p>
      </div>`;
    }
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
  const totalPages = Math.ceil(filteredPromotores.length / ITEMS_PER_PAGE);
  if (page < 1 || page > totalPages) return;
  
  currentPage = page;
  renderPromotores();
  
  // Scroll para o topo
}

// Exporta dados de promotores
function exportPromotoresListData(format) {
  if (!filteredPromotores || filteredPromotores.length === 0) {
    alert('Nenhum dado disponível para exportar!');
    return;
  }

  const headers = [
    'Nome',
    'Telefone',
    'Valor Gerado (R$)',
    'Total de Leads',
    'Leads Fechados',
    'Taxa de Conversão (%)'
  ];

  const rowMapper = (promotor) => {
    return [
      promotor.nome || 'N/A',
      promotor.telefone || 'N/A',
      (promotor.valorGerado || 0).toFixed(2),
      promotor.totalLeads || 0,
      promotor.leadsFechados || 0,
      (promotor.taxaConversao || 0).toFixed(2)
    ];
  };

  const agora = new Date();
  const dataStr = agora.toISOString().split('T')[0].replace(/-/g, '');
  const filename = `promotores_${dataStr}`;

  if (format === 'csv') {
    exportToCSV(filteredPromotores, filename, headers, rowMapper);
  } else if (format === 'excel') {
    exportToExcel(filteredPromotores, filename, headers, rowMapper);
  } else if (format === 'txt') {
    exportToTXT(filteredPromotores, filename, headers, rowMapper);
  }
}

// Visualiza leads do promotor
function viewPromotorLeads(promotorNome) {
  const promotorNomeDecoded = decodeURIComponent(promotorNome);
  
  // Encontra os dados do promotor
  const promotor = allPromotoresData.find(p => p.nome === promotorNomeDecoded);
  if (!promotor) return;

  // Armazena dados na sessionStorage para a página de detalhes (opcional, pode buscar da API também)
  sessionStorage.setItem('promotorDetalhes', JSON.stringify({
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
  }));

  // Redireciona para página de detalhes
  window.location.href = `promotor-detalhes.html?promotor=${encodeURIComponent(promotor.nome)}`;
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  if (await checkAuth()) {
    loadPromotores();
  }
});
