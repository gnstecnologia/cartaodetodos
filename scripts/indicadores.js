// Configuração
const DASHBOARD_EMAIL = 'admin@cartaodetodos.com.br';
const DASHBOARD_PASSWORD = 'admin123';
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';
const DATA_ENDPOINT = `${API_BASE_URL}/api/dashboard`;

// Variáveis globais
let allIndicadoresData = [];
let filteredIndicadores = [];
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

// Carrega dados dos indicadores
async function loadIndicadores() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const contentEl = document.getElementById('indicadoresContent');

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

    // Processa dados dos indicadores
    processIndicadoresData(data);

    loadingEl.style.display = 'none';
    contentEl.style.display = 'block';
  } catch (error) {
    console.error('Erro ao carregar indicadores:', error);
    loadingEl.style.display = 'none';
    errorEl.textContent = 'Erro ao carregar dados. Verifique se o endpoint está configurado corretamente.';
    errorEl.style.display = 'block';
  }
}

// Processa dados dos indicadores
function processIndicadoresData(data) {
  const indicacoes = data.indicacoes || [];
  const indicadoresList = data.indicadoresList || [];
  
  // Agrupa indicações por código do indicador
  const indicacoesPorIndicador = {};
  
  indicacoes.forEach(indicacao => {
    const codigo = String(indicacao.codigoIndicacao || indicacao['Código de Indicação'] || '').trim();
    if (!codigo || codigo === '') return;
    
    if (!indicacoesPorIndicador[codigo]) {
      indicacoesPorIndicador[codigo] = {
        codigo,
        indicacoes: [],
        primeiraData: null,
        ultimaData: null
      };
    }
    
    indicacoesPorIndicador[codigo].indicacoes.push(indicacao);
    
    // Calcula primeira e última data
    const dataHora = indicacao.dataHora || indicacao['Data e Hora'] || indicacao['Data de Criação'] || '';
    if (dataHora) {
      const dataObj = parseBrazilianDate(dataHora);
      if (dataObj) {
        if (!indicacoesPorIndicador[codigo].primeiraData || dataObj < indicacoesPorIndicador[codigo].primeiraData) {
          indicacoesPorIndicador[codigo].primeiraData = dataObj;
        }
        if (!indicacoesPorIndicador[codigo].ultimaData || dataObj > indicacoesPorIndicador[codigo].ultimaData) {
          indicacoesPorIndicador[codigo].ultimaData = dataObj;
        }
      }
    }
  });

  // Cria array de indicadores com informações
  allIndicadoresData = indicadoresList.map(indicador => {
    const codigo = String(indicador.id).trim();
    const info = indicacoesPorIndicador[codigo] || {
      codigo,
      indicacoes: [],
      primeiraData: null,
      ultimaData: null
    };
    
    return {
      id: codigo,
      nome: indicador.nome || `Código ${codigo}`,
      telefone: indicador.telefone || '',
      totalIndicacoes: info.indicacoes.length,
      primeiraData: info.primeiraData,
      ultimaData: info.ultimaData,
      indicacoes: info.indicacoes
    };
  });

  // Aplica filtros (a ordenação será feita dentro de applyFilters)
  applyFilters();
}

// Formata data para exibição
function formatDate(date) {
  if (!date) return 'N/A';
  
  if (date instanceof Date) {
    const dia = String(date.getUTCDate()).padStart(2, '0');
    const mes = String(date.getUTCMonth() + 1).padStart(2, '0');
    const ano = date.getUTCFullYear();
    return `${dia}/${mes}/${ano}`;
  }
  
  return date;
}

// Aplica filtros
function applyFilters() {
  const searchTerm = (document.getElementById('searchFilter')?.value || '').toLowerCase().trim();
  const dateInicio = document.getElementById('dateFilterInicio')?.value || '';
  const dateFim = document.getElementById('dateFilterFim')?.value || '';
  const sortBy = document.getElementById('sortFilter')?.value || 'recentes';

  filteredIndicadores = allIndicadoresData.filter(indicador => {
    // Filtro de busca (nome ou ID)
    if (searchTerm) {
      const nomeMatch = indicador.nome.toLowerCase().includes(searchTerm);
      const idMatch = indicador.id.toLowerCase().includes(searchTerm);
      if (!nomeMatch && !idMatch) return false;
    }

    // Filtro de período (data inicial e/ou final)
    if (dateInicio || dateFim) {
      // Usa a primeira data do indicador para filtro
      if (!indicador.primeiraData) {
        // Se não tem data e foi especificado um período, exclui
        return false;
      }

      const primeiraData = new Date(indicador.primeiraData);
      primeiraData.setUTCHours(0, 0, 0, 0);

      // Filtro de data início
      if (dateInicio) {
        const filterInicio = new Date(dateInicio + 'T00:00:00');
        if (primeiraData < filterInicio) {
          return false;
        }
      }

      // Filtro de data fim
      if (dateFim) {
        const filterFim = new Date(dateFim + 'T23:59:59');
        if (primeiraData > filterFim) {
          return false;
        }
      }
    }

    return true;
  });

  // Aplica ordenação
  filteredIndicadores.sort((a, b) => {
    switch (sortBy) {
      case 'recentes':
        // Mais recentes primeiro (última indicação)
        if (!a.ultimaData && !b.ultimaData) return 0;
        if (!a.ultimaData) return 1;
        if (!b.ultimaData) return -1;
        return b.ultimaData - a.ultimaData;
      
      case 'antigos':
        // Mais antigos primeiro (primeira indicação)
        if (!a.primeiraData && !b.primeiraData) return 0;
        if (!a.primeiraData) return 1;
        if (!b.primeiraData) return -1;
        return a.primeiraData - b.primeiraData;
      
      case 'mais-indicacoes':
        // Mais indicações primeiro
        return b.totalIndicacoes - a.totalIndicacoes;
      
      case 'menos-indicacoes':
        // Menos indicações primeiro
        return a.totalIndicacoes - b.totalIndicacoes;
      
      case 'nome-az':
        // Nome A-Z
        return a.nome.localeCompare(b.nome, 'pt-BR');
      
      case 'nome-za':
        // Nome Z-A
        return b.nome.localeCompare(a.nome, 'pt-BR');
      
      default:
        return 0;
    }
  });

  currentPage = 1;
  renderIndicadores();
}

// Limpa filtros
function clearFilters() {
  document.getElementById('searchFilter').value = '';
  document.getElementById('dateFilterInicio').value = '';
  document.getElementById('dateFilterFim').value = '';
  document.getElementById('sortFilter').value = 'recentes';
  applyFilters();
}

// Renderiza indicadores
function renderIndicadores() {
  const gridEl = document.getElementById('indicadoresGrid');
  const totalPages = Math.ceil(filteredIndicadores.length / ITEMS_PER_PAGE);
  
  // Anima saída dos cards existentes
  const existingCards = gridEl.querySelectorAll('.indicador-card');
  const hasExistingCards = existingCards.length > 0;
  
  existingCards.forEach((card, index) => {
    card.classList.add('fade-out');
    card.style.animationDelay = `${index * 0.02}s`;
  });

  // Aguarda animação de saída antes de renderizar novos cards
  setTimeout(() => {
    if (filteredIndicadores.length === 0) {
      gridEl.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; animation: cardFadeIn 0.5s ease forwards;">
          <i class="fas fa-inbox"></i>
          <h3>Nenhum indicador encontrado</h3>
          <p>Tente ajustar os filtros de busca.</p>
        </div>
      `;
      document.getElementById('pagination').innerHTML = '';
      return;
    }

    // Calcula índices da página atual
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageIndicadores = filteredIndicadores.slice(startIndex, endIndex);

    // Renderiza cards com animações escalonadas
    gridEl.innerHTML = pageIndicadores.map((indicador, index) => `
      <div class="indicador-card" onclick="viewIndicadorIndicados('${indicador.id}')" style="animation-delay: ${index * 0.05}s; opacity: 0;">
      <div class="indicador-card-header">
        <h3 class="indicador-name">${indicador.nome}</h3>
        <span class="indicador-id">ID: ${indicador.id}</span>
      </div>
      
      ${indicador.telefone ? `
        <div style="font-size: 0.9rem; color: rgba(15, 31, 19, 0.6); margin-bottom: 0.5rem;">
          <i class="fas fa-phone"></i> ${indicador.telefone}
        </div>
      ` : ''}
      
      <div class="indicador-stats">
        <div class="stat-item">
          <span class="stat-label">
            <i class="fas fa-hand-pointer"></i>
            Total de Indicados
          </span>
          <span class="stat-value">${indicador.totalIndicacoes}</span>
        </div>
        
        ${indicador.primeiraData ? `
          <div class="indicador-date">
            <i class="fas fa-calendar-plus"></i>
            Primeiro indicado: ${formatDate(indicador.primeiraData)}
          </div>
        ` : ''}
        
        ${indicador.ultimaData ? `
          <div class="indicador-date">
            <i class="fas fa-calendar-check"></i>
            Último indicado: ${formatDate(indicador.ultimaData)}
          </div>
        ` : ''}
      </div>
    </div>
    `).join('');

    // Adiciona animação de entrada aos cards
    setTimeout(() => {
      const cards = gridEl.querySelectorAll('.indicador-card');
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
  const totalPages = Math.ceil(filteredIndicadores.length / ITEMS_PER_PAGE);
  if (page < 1 || page > totalPages) return;
  
  currentPage = page;
  renderIndicadores();
  
  // Scroll para o topo
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Visualiza indicados do indicador
function viewIndicadorIndicados(indicadorId) {
  window.location.href = `indicados.html?indicador=${encodeURIComponent(indicadorId)}`;
}

// Inicialização
if (checkAuth()) {
  loadIndicadores();
}

