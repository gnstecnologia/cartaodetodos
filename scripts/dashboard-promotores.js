// Configuração
const DASHBOARD_EMAIL = 'admin@cartaodetodos.com.br';
const DASHBOARD_PASSWORD = 'admin123';
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';
const PROMOTORES_ENDPOINT = `${API_BASE_URL}/api/promotores`;

// Variáveis globais
let allPromotoresData = [];
let filteredPromotoresData = [];
let chartTimeline = null;
let chartStatus = null;
let chartComparativo = null;
let chartFunil = null;

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

// Formata valor em reais
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Formata data
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

// Carrega dados do dashboard
async function loadDashboard() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const contentEl = document.getElementById('dashboardContent');

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

    allPromotoresData = data.promotores || [];
    applyFilters();

    loadingEl.style.display = 'none';
    contentEl.style.display = 'block';
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    loadingEl.style.display = 'none';
    errorEl.textContent = 'Erro ao carregar dados. ' + error.message;
    errorEl.style.display = 'block';
  }
}

// Aplica filtros
function applyFilters() {
  const searchTerm = (document.getElementById('searchFilter')?.value || '').toLowerCase().trim();
  const sortBy = document.getElementById('sortFilter')?.value || 'valor';

  filteredPromotoresData = allPromotoresData.filter(promotor => {
    if (searchTerm) {
      const nomeMatch = promotor.nome.toLowerCase().includes(searchTerm);
      if (!nomeMatch) return false;
    }
    return true;
  });

  // Ordena
  filteredPromotoresData.sort((a, b) => {
    switch (sortBy) {
      case 'valor':
        return b.valorGerado - a.valorGerado;
      case 'leads':
        return b.totalLeads - a.totalLeads;
      case 'conversao':
        return b.taxaConversao - a.taxaConversao;
      case 'nome':
        return a.nome.localeCompare(b.nome, 'pt-BR');
      default:
        return 0;
    }
  });

  updateMetrics();
  updateCharts();
  updateRanking();
}

// Limpa filtros
function clearFilters() {
  document.getElementById('searchFilter').value = '';
  document.getElementById('dateFilterInicio').value = '';
  document.getElementById('dateFilterFim').value = '';
  document.getElementById('sortFilter').value = 'valor';
  loadDashboard();
}

// Atualiza métricas principais
function updateMetrics() {
  const totalPromotores = filteredPromotoresData.length;
  const totalLeads = filteredPromotoresData.reduce((sum, p) => sum + p.totalLeads, 0);
  const totalValorGerado = filteredPromotoresData.reduce((sum, p) => sum + p.valorGerado, 0);
  const totalFechados = filteredPromotoresData.reduce((sum, p) => sum + p.leadsFechados, 0);
  const taxaMediaConversao = totalLeads > 0 
    ? ((totalFechados / totalLeads) * 100).toFixed(1)
    : 0;

  document.getElementById('totalPromotores').textContent = totalPromotores;
  document.getElementById('totalLeads').textContent = totalLeads;
  document.getElementById('valorTotalGerado').textContent = formatCurrency(totalValorGerado);
  document.getElementById('taxaMediaConversao').textContent = `${taxaMediaConversao}%`;
}

// Atualiza todos os gráficos
function updateCharts() {
  updateTimelineChart();
  updateStatusChart();
  updateComparativoChart();
  updateFunilChart();
}

// Gráfico de evolução temporal
function updateTimelineChart() {
  const ctx = document.getElementById('chartTimeline');
  if (!ctx) return;

  // Agrupa leads por data (últimos 7 dias)
  const last7Days = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    last7Days.push({
      date: date.toISOString().split('T')[0],
      leads: 0,
      valor: 0
    });
  }

  filteredPromotoresData.forEach(promotor => {
    promotor.leads.forEach(lead => {
      if (lead.dataHora) {
        try {
          const date = new Date(lead.dataHora);
          if (!isNaN(date.getTime())) {
            const dateStr = date.toISOString().split('T')[0];
            const dayData = last7Days.find(d => d.date === dateStr);
            if (dayData) {
              dayData.leads++;
              if (lead.status === 'Fechado') {
                dayData.valor += 59.99;
              }
            }
          }
        } catch {}
      }
    });
  });

  const labels = last7Days.map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' });
  });

  if (chartTimeline) {
    chartTimeline.destroy();
  }

  chartTimeline = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Leads',
          data: last7Days.map(d => d.leads),
          borderColor: '#0f8a3c',
          backgroundColor: 'rgba(15, 138, 60, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          yAxisID: 'y',
        },
        {
          label: 'Valor Gerado (R$)',
          data: last7Days.map(d => d.valor),
          borderColor: '#FF8C00',
          backgroundColor: 'rgba(255, 140, 0, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          yAxisID: 'y1',
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      aspectRatio: 3.5,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
        }
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          beginAtZero: true,
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          beginAtZero: true,
          grid: {
            drawOnChartArea: false,
          },
        }
      }
    }
  });
}

// Gráfico de distribuição por status
function updateStatusChart() {
  const ctx = document.getElementById('chartStatus');
  if (!ctx) return;

  const statusData = {
    'Nova Indicação': 0,
    'Em Contato': 0,
    'Em Negociação': 0,
    'Fechado': 0,
    'Perdido': 0
  };

  filteredPromotoresData.forEach(promotor => {
    Object.keys(statusData).forEach(status => {
      statusData[status] += promotor.leadsPorStatus[status] || 0;
    });
  });

  const labels = Object.keys(statusData).filter(k => statusData[k] > 0);
  const values = labels.map(k => statusData[k]);
  const colors = [
    'rgba(37, 99, 235, 0.8)',
    'rgba(245, 158, 11, 0.8)',
    'rgba(139, 92, 246, 0.8)',
    'rgba(16, 185, 129, 0.8)',
    'rgba(239, 68, 68, 0.8)'
  ];

  if (chartStatus) {
    chartStatus.destroy();
  }

  chartStatus = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
        }
      }
    }
  });
}

// Gráfico comparativo entre promotores (Top 10)
function updateComparativoChart() {
  const ctx = document.getElementById('chartComparativo');
  if (!ctx) return;

  const top10 = filteredPromotoresData.slice(0, 10);

  if (chartComparativo) {
    chartComparativo.destroy();
  }

  chartComparativo = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top10.map(p => p.nome),
      datasets: [
        {
          label: 'Total de Leads',
          data: top10.map(p => p.totalLeads),
          backgroundColor: 'rgba(15, 138, 60, 0.8)',
        },
        {
          label: 'Leads Fechados',
          data: top10.map(p => p.leadsFechados),
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: 'top',
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Gráfico de funil de conversão
function updateFunilChart() {
  const ctx = document.getElementById('chartFunil');
  if (!ctx) return;

  const funil = {
    'Nova Indicação': 0,
    'Em Contato': 0,
    'Em Negociação': 0,
    'Fechado': 0,
    'Perdido': 0
  };

  filteredPromotoresData.forEach(promotor => {
    Object.keys(funil).forEach(status => {
      funil[status] += promotor.leadsPorStatus[status] || 0;
    });
  });

  const labels = ['Nova Indicação', 'Em Contato', 'Em Negociação', 'Fechado'];
  const values = labels.map(l => funil[l]);

  if (chartFunil) {
    chartFunil.destroy();
  }

  chartFunil = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Leads',
        data: values,
        backgroundColor: [
          'rgba(37, 99, 235, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)'
        ],
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          beginAtZero: true
        }
      }
    }
  });
}

// Atualiza ranking
function updateRanking() {
  const rankingEl = document.getElementById('rankingTable');
  if (!rankingEl) return;

  if (filteredPromotoresData.length === 0) {
    rankingEl.innerHTML = '<p style="text-align: center; color: rgba(15, 31, 19, 0.5);">Nenhum promotor encontrado</p>';
    return;
  }

  const rankingHTML = `
    <table class="ranking-table">
      <tbody>
        ${filteredPromotoresData.map((promotor, index) => {
          const rank = index + 1;
          const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';
          return `
            <tr onclick="viewPromotorDetalhes('${encodeURIComponent(promotor.nome)}')" style="cursor: pointer;">
              <td style="display: flex; justify-content: center; align-items: center;">
                <span class="rank-badge ${rankClass}">${rank}</span>
              </td>
              <td style="display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; overflow: visible; flex: 1;">
                <div style="font-family: 'Source Sans 3', sans-serif; font-size: 1rem; font-weight: 700; color: var(--color-dark); word-break: break-word; overflow-wrap: break-word;">
                  ${promotor.nome}
                </div>
                ${promotor.indicadores && promotor.indicadores.length > 0 ? `
                  <div style="font-size: 0.75rem; color: rgba(15, 31, 19, 0.6); display: flex; align-items: center; gap: 0.5rem; white-space: nowrap;">
                    <i class="fas fa-users"></i> 
                    <span>${promotor.indicadores.length} indicador${promotor.indicadores.length > 1 ? 'es' : ''}</span>
                  </div>
                ` : ''}
              </td>
              <td style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; min-width: 0; overflow: visible; flex-shrink: 0;">
                <div style="font-family: 'Source Sans 3', sans-serif; font-size: 1rem; font-weight: 700; color: var(--color-background); margin-bottom: 0.25rem; white-space: nowrap;">
                  ${formatCurrency(promotor.valorGerado)}
                </div>
                <div style="font-size: 0.7rem; color: rgba(15, 31, 19, 0.5); text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">Valor Gerado</div>
              </td>
              <td style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; min-width: 0; overflow: visible; flex-shrink: 0;">
                <div style="font-family: 'Source Sans 3', sans-serif; font-size: 1rem; font-weight: 700; color: var(--color-background); margin-bottom: 0.25rem; white-space: nowrap;">
                  ${promotor.totalLeads}
                </div>
                <div style="font-size: 0.7rem; color: rgba(15, 31, 19, 0.5); text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">Total Leads</div>
              </td>
              <td style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; min-width: 0; overflow: visible; flex-shrink: 0;">
                <div style="font-family: 'Source Sans 3', sans-serif; font-size: 1rem; font-weight: 700; color: var(--color-background); margin-bottom: 0.25rem; white-space: nowrap;">
                  ${promotor.taxaConversao}%
                </div>
                <div style="font-size: 0.7rem; color: rgba(15, 31, 19, 0.5); text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">Conversão</div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  rankingEl.innerHTML = rankingHTML;
}

// Visualiza detalhes do promotor
function viewPromotorDetalhes(promotorNome) {
  window.location.href = `promotor-detalhes.html?promotor=${encodeURIComponent(promotorNome)}`;
}

// Inicialização
if (checkAuth()) {
  loadDashboard();
}

