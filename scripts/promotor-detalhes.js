// Configuração
const DASHBOARD_EMAIL = 'admin@cartaodetodos.com.br';
const DASHBOARD_PASSWORD = 'admin123';
const API_BASE_URL = window.API_BASE_URL || window.location.origin;

// Variáveis globais
let promotorData = null;
let allLeads = [];
let filteredLeads = [];
const ITEMS_PER_PAGE = 20;
let currentPage = 1;
const VALOR_PLANO = 59.99;

function statusLegivelUi(internal) {
  if (internal === 'Nova Indicação') return 'Novo indicado';
  if (internal === 'Fechado') return 'Ganho';
  return internal;
}

// Função para converter formato brasileiro para Date
function parseBrazilianDate(dateString) {
  if (dateString == null || dateString === '') return null;
  const trimmed = String(dateString).trim();
  if (!trimmed) return null;
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
    const params = new URLSearchParams(window.location.search);
    const promotorNomeEncoded = params.get('promotor');
    if (!promotorNomeEncoded) {
      throw new Error('Nome não especificado na URL');
    }
    const promotorNome = decodeURIComponent(promotorNomeEncoded);

    let storedParsed = null;
    try {
      const raw = sessionStorage.getItem('promotorDetalhes');
      if (raw) storedParsed = JSON.parse(raw);
    } catch {
      storedParsed = null;
    }

    const sessionMatches =
      storedParsed &&
      (storedParsed.nome || '').trim().toLowerCase() === promotorNome.trim().toLowerCase();

    if (sessionMatches) {
      promotorData = storedParsed;
    } else {
      const response = await fetch(`${API_BASE_URL}/api/promotores`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Erro ao buscar dados da API');
      }

      const data = await response.json();
      if (data.ok === false) {
        throw new Error(data.message || 'Erro ao processar dados');
      }

      const list = data.promotores || [];
      const row = list.find((p) => {
        const n = (p.nome || '').trim();
        return n.toLowerCase() === promotorNome.trim().toLowerCase();
      });

      if (!row) {
        throw new Error(`Promotor "${promotorNome}" não encontrado neste período`);
      }

      promotorData = {
        nome: row.nome,
        leads: row.leads,
        metricas: {
          totalLeads: row.totalLeads,
          leadsFechados: row.leadsFechados,
          valorGerado: row.valorGerado,
          taxaConversao: row.taxaConversao,
          taxaPerda: row.taxaPerda,
          leadsPorStatus: row.leadsPorStatus,
          indicadores: row.indicadores,
        },
      };
    }

    // Garante que cada lead tem um ID único
    allLeads = (promotorData.leads || []).map((lead, index) => {
      if (!lead.id && !lead.ID) {
        lead.id = `${lead.nome || 'lead'}_${lead.telefone || index}_${index}`;
      }
      return lead;
    });
    console.log('Leads carregados:', allLeads.length);

    const nomeEl = document.getElementById('promotorNome');
    if (nomeEl) {
      nomeEl.innerHTML = `
      <i class="fas fa-user-tie"></i>
      ${promotorData.nome}
    `;
    } else {
      console.error('Elemento promotorNome não encontrado!');
    }

    const introEl = document.getElementById('promotorLeadsIntro');
    if (introEl) {
      const n = allLeads.length;
      introEl.innerHTML = `
        <i class="fas fa-layer-group" aria-hidden="true"></i>
        <span class="promotor-context-banner__count">${n} lead${n === 1 ? '' : 's'}</span>
        <span class="promotor-context-banner__sep">·</span>
        <span class="promotor-context-banner__hint">Mesmo padrão visual de <strong>Indicadores</strong> → <strong>Indicados</strong></span>
      `;
    }

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
  if (!promotorData || !promotorData.metricas) {
    console.error('Dados do promotor não disponíveis para renderizar métricas');
    return;
  }

  const metricas = promotorData.metricas;
  const metricasGrid = document.getElementById('metricasGrid');

  if (!metricasGrid) {
    console.error('Elemento metricasGrid não encontrado!');
    return;
  }

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
  if (!listEl) {
    console.error('Elemento leadsList não encontrado!');
    return;
  }

  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
  console.log('Renderizando leads:', filteredLeads.length, 'Total de páginas:', totalPages);

  if (filteredLeads.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <h3>Nenhum lead encontrado</h3>
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
  const pageLeads = filteredLeads.slice(startIndex, endIndex);

  // Renderiza cards (mesmo padrão visual de indicados.html)
  listEl.innerHTML = pageLeads.map((lead, pageIndex) => {
    const nome = lead.nome || 'Sem nome';
    const telefone = lead.telefone || 'Sem telefone';
    const status = lead.status || 'Nova Indicação';
    const statusExibir = lead.statusLegivel || statusLegivelUi(status);
    const entrouRaw = lead.dataHora || lead.createdAt || '';
    const ganhoRaw = lead.fechadoEm || lead.fechado_em || '';
    const indicadorNome = lead.indicadorNome || '';
    const promotorNomeLead = lead.promotorNome || '';
    const statusClass = getStatusClass(status);

    const leadId = lead.id || lead.ID || `${(lead.nome || 'lead').replace(/[^a-zA-Z0-9]/g, '_')}_${(lead.telefone || '').replace(/[^a-zA-Z0-9]/g, '_')}`;

    const delay = ((currentPage - 1) * ITEMS_PER_PAGE + pageIndex) * 0.05;

    return `
      <div class="indicado-card" style="animation-delay: ${delay}s;">
        <div class="indicado-header">
          <h3 class="indicado-name">${nome}</h3>
          <span class="status-badge ${statusClass}">${statusExibir}</span>
        </div>
        <div class="indicado-info">
          <div class="info-item">
            <i class="fas fa-phone"></i>
            <span>${telefone}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-calendar-plus"></i>
            <span>Entrou: ${entrouRaw ? formatDate(entrouRaw) : 'N/A'}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-check-circle"></i>
            <span>Ganho: ${ganhoRaw ? formatDate(ganhoRaw) : '—'}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-users"></i>
            <span>Indicador: ${indicadorNome || '—'}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-user-tie"></i>
            <span>Promotor: ${promotorNomeLead || '—'}</span>
          </div>
          ${
            lead.status === 'Fechado'
              ? `
          <div class="info-item info-item--valor">
            <i class="fas fa-dollar-sign"></i>
            <span>Valor: ${formatCurrency(VALOR_PLANO)}/mês</span>
          </div>`
              : ''
          }
        </div>
        <div class="indicado-actions">
          <button type="button" class="action-btn" onclick='showTimeline(${JSON.stringify(String(leadId))})' title="Ver timeline do lead">
            <i class="fas fa-clock-rotate-left"></i>
            Ver Timeline
          </button>
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
}

// Exporta dados de leads do promotor
function exportPromotorLeadsData(format) {
  if (!filteredLeads || filteredLeads.length === 0) {
    alert('Nenhum dado disponível para exportar!');
    return;
  }

  const headers = [
    'Data e Hora',
    'Nome',
    'Telefone',
    'Indicador',
    'Promotor',
    'Status',
    'Valor (R$)',
  ];

  const rowMapper = (lead) => {
    const dataHora = lead.dataHora
      ? new Date(lead.dataHora).toLocaleString('pt-BR')
      : 'N/A';
    const valor = lead.status === 'Fechado' ? '59.99' : '0.00';
    return [
      dataHora,
      lead.nome || 'N/A',
      lead.telefone || 'N/A',
      lead.indicadorNome || '',
      lead.promotorNome || '',
      lead.statusLegivel || statusLegivelUi(lead.status || 'N/A'),
      valor,
    ];
  };

  const agora = new Date();
  const dataStr = agora.toISOString().split('T')[0].replace(/-/g, '');
  const promotorNome = promotorData?.nome || 'promotor';
  const filename = `leads_${promotorNome}_${dataStr}`.replace(/[^a-zA-Z0-9_]/g, '_');

  if (format === 'csv') {
    exportToCSV(filteredLeads, filename, headers, rowMapper);
  } else if (format === 'excel') {
    exportToExcel(filteredLeads, filename, headers, rowMapper);
  } else if (format === 'txt') {
    exportToTXT(filteredLeads, filename, headers, rowMapper);
  }
}

// Busca timeline do lead
async function loadTimeline(leadId) {
  try {
    // Primeiro, procura o lead nos dados já carregados
    // O leadId pode ser um ID numérico ou um identificador composto
    let lead = null;
    
    // Tenta encontrar por ID direto primeiro
    if (!isNaN(leadId)) {
      lead = allLeads.find(l => {
        const id = l.id || l.ID;
        return id && String(id) === String(leadId);
      });
    }
    
    // Se não encontrou, tenta pelo identificador composto (nome_telefone_index)
    if (!lead) {
      lead = allLeads.find((l, index) => {
        const nomeSanitizado = (l.nome || 'lead').replace(/[^a-zA-Z0-9]/g, '_');
        const telefoneSanitizado = (l.telefone || index).replace(/[^a-zA-Z0-9]/g, '_');
        const idGerado = `${nomeSanitizado}_${telefoneSanitizado}_${index}`;
        return String(idGerado) === String(leadId);
      });
    }
    
    // Se ainda não encontrou, tenta match parcial (nome e telefone)
    if (!lead) {
      lead = allLeads.find(l => {
        const nomeSanitizado = (l.nome || 'lead').replace(/[^a-zA-Z0-9]/g, '_');
        const telefoneSanitizado = (l.telefone || '').replace(/[^a-zA-Z0-9]/g, '_');
        return leadId.includes(nomeSanitizado) && leadId.includes(telefoneSanitizado);
      });
    }
    
    // Se encontrou o lead e tem logStatus, usa ele
    if (lead && lead.logStatus) {
      try {
        const timeline = typeof lead.logStatus === 'string' 
          ? JSON.parse(lead.logStatus) 
          : lead.logStatus;
        if (Array.isArray(timeline) && timeline.length > 0) {
          return timeline;
        }
      } catch (error) {
        console.error('Erro ao parsear logStatus:', error);
      }
    }
    
    // Se não tem logStatus no lead, tenta buscar pela API usando ID numérico
    if (!isNaN(leadId)) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/leads/${leadId}/timeline`, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          if (data.timeline && data.timeline.length > 0) {
            return data.timeline;
          }
        }
      } catch (error) {
        console.error('Erro ao buscar timeline da API:', error);
      }
    }
    
    // Se não encontrou timeline, cria uma básica com a data de criação
    if (lead && lead.dataHora) {
      return [{
        status: lead.status || 'Nova Indicação',
        data: lead.dataHora,
        origem: 'sistema'
      }];
    }
    
    return [];
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
  
  if (!modal || !content) {
    console.error('Modal de timeline não encontrado!');
    return;
  }
  
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
      
      const status = entry.status || entry.Status || 'Nova Indicação';
      const tituloStatus = entry.statusLegivel || statusLegivelUi(status);
      const icon = statusIcons[status] || 'fa-circle';
      const color = statusColors[status] || '#666';
      
      // Tenta múltiplos campos de data
      const dataHora = entry.data || entry.dataHora || entry.dataHoraStatus || entry.timestamp || entry.dataHora || '';
      
      return `
        <div style="display: flex; gap: 1rem; padding: 1rem; border-radius: 12px; background: rgba(15, 138, 60, 0.05); margin-bottom: 1rem; border-left: 4px solid ${color};">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: ${color}; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;">
            <i class="fas ${icon}"></i>
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 700; color: var(--color-dark); margin-bottom: 0.25rem;">${tituloStatus}</div>
            <div style="font-size: 0.9rem; color: rgba(15, 31, 19, 0.6);">${dataHora ? formatDate(dataHora) : 'Data não disponível'}</div>
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
  if (modal) {
    modal.style.display = 'none';
  }
}

// Fecha modal ao clicar fora
document.addEventListener('click', (e) => {
  const modal = document.getElementById('timelineModal');
  if (modal && e.target === modal) {
    closeTimelineModal();
  }
});

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
if (await checkAuth()) {
  loadPromotorData();
}
});

