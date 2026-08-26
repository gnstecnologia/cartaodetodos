// Configuração
const API_BASE_URL = window.API_BASE_URL || window.location.origin;
const DATA_ENDPOINT = `${API_BASE_URL}/api/dashboard`;

// Variável global para armazenar os indicadores vindos da API
let INDICADORES = {};

// Função para obter o nome do indicador pelo código
function getNomeIndicador(codigo) {
  if (!codigo || codigo === 'Sem código' || String(codigo).trim() === '') {
    return 'Sem código';
  }
  const codigoStr = String(codigo).trim();
  
  // Tenta buscar como string primeiro
  if (INDICADORES[codigoStr]) {
    return INDICADORES[codigoStr];
  }
  
  // Se o código for numérico, tenta buscar como número também
  if (!isNaN(codigoStr) && codigoStr !== '') {
    const codigoNum = Number(codigoStr);
    if (INDICADORES[codigoNum]) {
      return INDICADORES[codigoNum];
    }
  }
  
  // Se não encontrou, retorna o código formatado
  return `Código ${codigoStr}`;
}

// Evita chamadas concorrentes (ex.: scripts duplicados / eventos repetidos).
let checkAuthPromise = null;

// Verifica se está autenticado
async function checkAuth() {
  if (checkAuthPromise) return checkAuthPromise;
  checkAuthPromise = (async () => {
    try {
      const user = await window.AuthClient.ensureAuthenticatedPage({ redirectTo: 'dashboard.html' });
      if (user) {
        showDashboard();
        loadDashboard();
        atualizarPerfilUsuario();
        return true;
      }
      showLogin();
      return false;
    } finally {
      checkAuthPromise = null;
    }
  })();
  return checkAuthPromise;
}

// Mostra tela de login
function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('dashboardScreen').style.display = 'none';
}

// Mostra dashboard
function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboardScreen').style.display = 'block';
}

// Função para atualizar perfil do usuário na interface
function atualizarPerfilUsuario() {
  const userData = sessionStorage.getItem('userData');
  if (!userData) return;
  
  try {
    const user = JSON.parse(userData);
    const perfilElement = document.getElementById('userProfile');
    if (perfilElement) {
      perfilElement.innerHTML = `
        <i class="fas fa-user-circle"></i>
        <span>${user.nome}</span>
        <span class="user-type">${user.tipo === 'coordenador' ? 'Coordenador' : user.tipo === 'gerente' ? 'Gerente' : 'Promotor'}</span>
      `;
      perfilElement.style.display = 'inline-flex';
    }
    
    // Esconde botão "Gerar Novo Indicador" para promotores
    const gerarIndicadorBtn = document.querySelector('a[href="gerar-indicador.html"]');
    if (gerarIndicadorBtn && user.permissao !== 'admin') {
      gerarIndicadorBtn.style.display = 'none';
    } else if (gerarIndicadorBtn) {
      gerarIndicadorBtn.style.display = 'inline-flex';
    }
  } catch (e) {
    console.error('Erro ao atualizar perfil:', e);
  }
}

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('emailInput').value.trim().toLowerCase();
  const password = document.getElementById('passwordInput').value;
  const errorEl = document.getElementById('loginError');
  const submitBtn = document.querySelector('#loginForm button[type="submit"]');
  
  // Desabilita botão durante verificação
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';

  try {
    const user = await window.AuthClient.loginWithPassword(email, password);

    if (user) {
      showDashboard();
      loadDashboard();
      atualizarPerfilUsuario();
      errorEl.style.display = 'none';
      document.getElementById('emailInput').value = '';
      document.getElementById('passwordInput').value = '';
    } else {
      errorEl.textContent = 'E-mail ou senha incorretos!';
      errorEl.style.display = 'block';
      document.getElementById('passwordInput').value = '';
    }
  } catch (error) {
    console.error('Erro ao verificar credenciais:', error);
    errorEl.textContent = 'Erro ao verificar credenciais. Tente novamente.';
    errorEl.style.display = 'block';
  } finally {
    // Reabilita botão
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Entrar';
  }
});

// Logout
function logout() {
  window.AuthClient.logoutSession().finally(() => {
    showLogin();
    document.getElementById('emailInput').value = '';
    document.getElementById('passwordInput').value = '';
  });
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
    // Busca dados da API
    const dataInicio = document.getElementById('dateFilterInicio')?.value || '';
    const dataFim = document.getElementById('dateFilterFim')?.value || '';
    
    let url = DATA_ENDPOINT;
    const params = new URLSearchParams();
    if (dataInicio) params.append('dataInicio', dataInicio);
    if (dataFim) params.append('dataFim', dataFim);
    const indicador = document.getElementById('indicadorFilter')?.value || '';
    if (indicador) params.append('indicador', indicador);
    if (params.toString()) url += '?' + params.toString();

    const response = await fetch(url, { credentials: 'include' });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.ok === false) {
      throw new Error(
        data.message ||
          (response.status === 401 ? 'Sessão expirada. Entre novamente.' : `Erro ao buscar dados (${response.status})`),
      );
    }

    // Atualiza o mapeamento de indicadores vindos da API
    if (data.indicadores && typeof data.indicadores === 'object') {
      INDICADORES = data.indicadores;
    }
    populateIndicadorFilter(data.indicadoresList || [], indicador);

    // Processa os dados
    processDashboardData(data);

    loadingEl.style.display = 'none';
    contentEl.style.display = 'block';
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    loadingEl.style.display = 'none';
    errorEl.textContent = error.message || 'Erro ao carregar dados. Verifique a conexão ou faça login novamente.';
    errorEl.style.display = 'block';
  }
}

// Variável global para armazenar todos os dados (antes do filtro)
let allIndicacoesData = null;

// Variáveis para gráficos
let chartTimeline = null;
let chartPizza = null;
let chartStatusFunil = null;

// Processa e exibe os dados
function processDashboardData(data) {
  // Salva todos os dados para filtragem
  allIndicacoesData = data;

  // Processa diretamente (filtro já foi aplicado no servidor)
  processFilteredData(data);
}

// Aplica filtro de data (agora recarrega os dados com filtro)
function applyDateFilter() {
  if (!allIndicacoesData) {
    loadDashboard();
    return;
  }

  // Recarrega os dados com os filtros aplicados
  loadDashboard();
}

// Limpa o filtro de data
function clearDateFilter() {
  const dateFilterInicio = document.getElementById('dateFilterInicio');
  const dateFilterFim = document.getElementById('dateFilterFim');
  const indicadorFilter = document.getElementById('indicadorFilter');
  if (dateFilterInicio) dateFilterInicio.value = '';
  if (dateFilterFim) dateFilterFim.value = '';
  if (indicadorFilter) indicadorFilter.value = '';
  applyDateFilter();
}

function formatCurrencyBrl(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
}

function populateIndicadorFilter(list, selected) {
  const select = document.getElementById('indicadorFilter');
  if (!select) return;
  const current = selected || select.value || '';
  const options = ['<option value="">Todos</option>']
    .concat(
      (list || [])
        .slice()
        .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'))
        .map(
          (item) =>
            `<option value="${escapeHtmlDash(item.id)}"${String(item.id) === String(current) ? ' selected' : ''}>${escapeHtmlDash(item.nome)} (${escapeHtmlDash(item.id)})</option>`,
        ),
    );
  select.innerHTML = options.join('');
}

function refreshPromotoresRanking() {
  if (allIndicacoesData?.metricas) {
    updateMetricasAvancadas(allIndicacoesData.metricas);
  }
}

// Exporta dados do dashboard
function exportDashboardData(format) {
  if (!allIndicacoesData || !allIndicacoesData.indicacoes) {
    alert('Nenhum dado disponível para exportar!');
    return;
  }

  const indicacoes = allIndicacoesData.indicacoes || [];
  const dataInicio = document.getElementById('dateFilterInicio')?.value || '';
  const dataFim = document.getElementById('dateFilterFim')?.value || '';

  // Filtra por data se houver filtros aplicados
  let dadosFiltrados = indicacoes;
  if (dataInicio || dataFim) {
    dadosFiltrados = indicacoes.filter(indicacao => {
      if (!indicacao.dataHora) return false;
      const dataIndicacao = new Date(indicacao.dataHora);
      if (dataInicio) {
        const inicio = new Date(dataInicio);
        if (dataIndicacao < inicio) return false;
      }
      if (dataFim) {
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999);
        if (dataIndicacao > fim) return false;
      }
      return true;
    });
  }

  // Define cabeçalhos
  const headers = [
    'Data e Hora',
    'Nome',
    'Telefone',
    'Código de Indicação',
    'Indicador',
    'Promotor',
    'Origem',
    'Status',
    'Data fechamento',
  ];

  // Mapeia dados para exportação
  const rowMapper = (indicacao) => {
    const dataHora = indicacao.dataHora 
      ? new Date(indicacao.dataHora).toLocaleString('pt-BR')
      : 'N/A';
    const nome = indicacao.nome || indicacao.Nome || 'N/A';
    const telefone = indicacao.telefone || indicacao.Telefone || 'N/A';
    const codigo = indicacao.codigoIndicacao || indicacao['Código de Indicação'] || 'Sem código';
    const indicador = getNomeIndicador(codigo);
    const origem = indicacao.origem || indicacao.Origem || 'N/A';
    const status = indicacao.statusLegivel || indicacao.status || indicacao.Status || 'N/A';
    const promotor = indicacao.promotorNome || '';
    const fechado = indicacao.fechadoEm
      ? new Date(indicacao.fechadoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      : '';

    return [dataHora, nome, telefone, codigo, indicador, promotor, origem, status, fechado];
  };

  // Gera nome do arquivo com data
  const agora = new Date();
  const dataStr = agora.toISOString().split('T')[0].replace(/-/g, '');
  const filename = `dashboard_indicados_${dataStr}`;

  // Exporta conforme formato
  if (format === 'csv') {
    exportToCSV(dadosFiltrados, filename, headers, rowMapper);
  } else if (format === 'excel') {
    exportToExcel(dadosFiltrados, filename, headers, rowMapper);
  } else if (format === 'txt') {
    exportToTXT(dadosFiltrados, filename, headers, rowMapper);
  }
}

// Processa dados filtrados
function processFilteredData(data) {
  const rankingBody = document.getElementById('rankingBody');
  if (!rankingBody) {
    console.error('Elemento rankingBody não encontrado no DOM');
    return;
  }

  const indicadoresRanking = Array.isArray(data.metricas?.indicadoresRanking)
    ? data.metricas.indicadoresRanking
    : [];

  let ranking = indicadoresRanking.map((row) => ({
    codigo: row.codigo,
    nome: row.nome || getNomeIndicador(row.codigo),
    count: row.totalIndicados || 0,
    ganhos: row.ganhos || 0,
    taxaConversao: row.taxaConversao || 0,
    comissaoTotal: row.comissaoTotal || 0,
  }));

  if (ranking.length === 0 && data.indicacoes) {
    const indicacoesPorCodigo = {};
    data.indicacoes.forEach((indicacao) => {
      const codigo = indicacao.codigoIndicacao || indicacao['Código de Indicação'] || 'Sem código';
      if (!indicacoesPorCodigo[codigo]) {
        indicacoesPorCodigo[codigo] = { count: 0, ganhos: 0 };
      }
      indicacoesPorCodigo[codigo].count += 1;
      if ((indicacao.status || '') === 'Fechado' || (indicacao.statusLegivel || '') === 'Ganho') {
        indicacoesPorCodigo[codigo].ganhos += 1;
      }
    });
    const valorPlano = data.valorPlano || data.metricas?.valorPlano || 59.99;
    ranking = Object.entries(indicacoesPorCodigo)
      .map(([codigo, info]) => ({
        codigo,
        nome: getNomeIndicador(codigo),
        count: info.count,
        ganhos: info.ganhos,
        taxaConversao: info.count ? Number(((info.ganhos / info.count) * 100).toFixed(1)) : 0,
        comissaoTotal: Number((info.ganhos * valorPlano).toFixed(2)),
      }))
      .sort((a, b) => b.comissaoTotal - a.comissaoTotal || b.count - a.count);
  }

  const totalIndicacoes = ranking.reduce((sum, item) => sum + item.count, 0);
  const media = ranking.length > 0 ? Math.round(totalIndicacoes / ranking.length) : 0;
  const elInd = document.getElementById('totalIndicados');
  const elInds = document.getElementById('totalIndicadores');
  const elMed = document.getElementById('mediaIndicadores');
  if (elInd) elInd.textContent = data.metricas?.totalIndicadosNoPeriodo ?? totalIndicacoes;
  if (elInds) elInds.textContent = ranking.length;
  if (elMed) elMed.textContent = media;

  const metaInd = document.getElementById('statMetaIndicadores');
  if (metaInd) {
    metaInd.textContent =
      ranking.length > 0
        ? ranking.length + ' indicador' + (ranking.length !== 1 ? 'es' : '') + ' · média ' + media + ' por indicador'
        : 'Sem indicações no período filtrado';
  }

  rankingBody.innerHTML = '';

  if (ranking.length === 0) {
    rankingBody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;padding:3rem 2rem;color:rgba(15,31,19,0.5);">Nenhum indicado encontrado ainda.</td></tr>';
  } else {
    const top5Ranking = ranking.slice(0, 5);
    for (let i = 0; i < Math.min(top5Ranking.length, 5); i++) {
      const item = top5Ranking[i];
      const row = document.createElement('tr');
      const rank = i + 1;
      let rankClass = '';
      if (rank === 1) rankClass = 'rank-1';
      else if (rank === 2) rankClass = 'rank-2';
      else if (rank === 3) rankClass = 'rank-3';

      row.innerHTML =
        '<td><span class="rank-badge ' + rankClass + '">' + rank + '</span></td>' +
        '<td><span class="indicador-name"><i class="fas fa-user"></i> ' + escapeHtmlDash(item.nome) + '</span>' +
        '<div class="indicador-code"><i class="fas fa-hashtag"></i> <span>' + escapeHtmlDash(item.codigo) + '</span></div></td>' +
        '<td style="text-align:center;font-weight:700;">' + item.count + '</td>' +
        '<td style="text-align:center;font-weight:700;">' + item.ganhos + '</td>' +
        '<td style="text-align:center;font-weight:700;">' + item.taxaConversao + '%</td>' +
        '<td style="text-align:right;font-weight:800;color:#0f8a3c;">' + formatCurrencyBrl(item.comissaoTotal) + '</td>';
      rankingBody.appendChild(row);
    }
  }

  updateCharts(data, ranking);
  updateMetricasAvancadas(data.metricas);
}

function updateMetricasAvancadas(m) {
  if (!m) return;
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  set('metricFechadosCohort', String(m.fechadosEntreIndicadosDoPeriodo ?? 0));
  set('metricTaxaFechamento', (m.taxaFechamentoSobreIndicadosPercent ?? 0) + '%');
  set('metricFechamentosDataGanho', String(m.fechamentosPorDataGanhoNoPeriodo ?? 0));
  set('metricComissaoTotal', formatCurrencyBrl(m.comissaoTotalPeriodo ?? 0));

  const metric = document.getElementById('promotorRankingMetric')?.value || 'valor';
  const rows = [...(m.promotoresRanking || [])].sort((a, b) => {
    if (metric === 'conversao') {
      return (b.taxaConversao || 0) - (a.taxaConversao || 0) || (b.fechados || 0) - (a.fechados || 0);
    }
    return (b.valorGerado || 0) - (a.valorGerado || 0) || (b.fechados || 0) - (a.fechados || 0);
  });

  const legProm = document.getElementById('legendaPromotoresRanking');
  if (legProm) {
    legProm.textContent =
      metric === 'conversao'
        ? 'Ordenado por taxa de conversão (ganhos ÷ leads do período).'
        : 'Ordenado por valor gerado (R$ 59,99 × ganhos).';
  }

  const tbody = document.getElementById('promotoresRankingTableBody');
  if (tbody) {
    if (!rows.length) {
      tbody.innerHTML =
        '<tr><td colspan="4" style="text-align:center;padding:1.5rem;opacity:0.7;">Nenhum vendedor no período filtrado.</td></tr>';
    } else {
      tbody.innerHTML = rows
        .slice(0, 10)
        .map((r) => {
          const taxaClass = metric === 'conversao' ? 'metric-highlight' : 'metric-muted';
          const valorClass = metric === 'valor' ? 'metric-highlight' : 'metric-muted';
          return (
            '<tr>' +
            '<td>' + escapeHtmlDash(r.nome) + '</td>' +
            '<td style="text-align:center;font-weight:700;">' + (r.fechados ?? 0) + '</td>' +
            '<td style="text-align:center;" class="' + taxaClass + '">' + (r.taxaConversao ?? 0) + '%</td>' +
            '<td style="text-align:right;" class="' + valorClass + '">' + formatCurrencyBrl(r.valorGerado) + '</td>' +
            '</tr>'
          );
        })
        .join('');
    }
  }

  updateStatusFunilChart(m);
}

function escapeHtmlDash(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateStatusFunilChart(metricas) {
  const ctx = document.getElementById('chartStatusFunil');
  if (!ctx || !metricas) return;

  const f = metricas.fechadosEntreIndicadosDoPeriodo || 0;
  const e = metricas.emAndamentoEntreIndicadosDoPeriodo || 0;

  if (chartStatusFunil) {
    chartStatusFunil.destroy();
  }

  chartStatusFunil = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Ganhos', 'Em andamento'],
      datasets: [
        {
          data: [f, e],
          backgroundColor: [
            'rgba(15, 138, 60, 0.92)',
            'rgba(90, 110, 120, 0.45)',
          ],
          borderWidth: 3,
          borderColor: '#ffffff',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1.15,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { family: 'Inter', size: 12 } },
        },
        tooltip: {
          callbacks: {
            label(ctx) {
              const v = ctx.raw || 0;
              const sum = f + e;
              const pct = sum ? ((v / sum) * 100).toFixed(1) : 0;
              return ` ${ctx.label}: ${v} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

// Atualiza gráficos
function updateCharts(data, ranking) {
  // Gráfico de Timeline (últimos 7 dias)
  updateTimelineChart(data);
  
  // Gráfico de Pizza (Top 5)
  updatePizzaChart(ranking);
}

// Gráfico de linha - Indicados por período
function updateTimelineChart(data) {
  const ctx = document.getElementById('chartTimeline');
  if (!ctx) return;

  // Agrupa indicados por data (últimos 7 dias)
  const last7Days = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    last7Days.push({
      date: date.toISOString().split('T')[0],
      count: 0
    });
  }

  if (data.indicacoes && Array.isArray(data.indicacoes)) {
    data.indicacoes.forEach(indicacao => {
      const dataHora = indicacao.dataHora || '';
      if (dataHora) {
        // Tenta extrair a data do formato brasileiro ou ISO
        let dateStr = '';
        const match = dataHora.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (match) {
          dateStr = `${match[3]}-${match[2]}-${match[1]}`;
        } else {
          dateStr = dataHora.split('T')[0];
        }
        
        const dayData = last7Days.find(d => d.date === dateStr);
        if (dayData) {
          dayData.count++;
        }
      }
    });
  }

  const labels = last7Days.map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' });
  });
  const values = last7Days.map(d => d.count);

  if (chartTimeline) {
    chartTimeline.destroy();
  }

  chartTimeline = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Indicados',
        data: values,
        borderColor: '#0f8a3c',
        backgroundColor: 'rgba(15, 138, 60, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: '#0f8a3c',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: { family: 'Inter', size: 14, weight: 'bold' },
          bodyFont: { family: 'Inter', size: 13 },
          borderColor: '#0f8a3c',
          borderWidth: 1,
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            font: { family: 'Inter', size: 11 }
          },
          grid: {
            color: 'rgba(15, 138, 60, 0.1)'
          }
        },
        x: {
          ticks: {
            font: { family: 'Inter', size: 11 }
          },
          grid: {
            display: false
          }
        }
      },
      animation: {
        duration: 1500,
        easing: 'easeInOutQuart'
      }
    }
  });
}

// Gráfico de pizza - Top 5 Indicadores
function updatePizzaChart(ranking) {
  const ctx = document.getElementById('chartPizza');
  if (!ctx) return;

  if (!ranking || ranking.length === 0) {
    if (chartPizza) {
      chartPizza.destroy();
      chartPizza = null;
    }
    return;
  }

  const top5 = ranking.slice(0, 5);
  const othersCount = ranking.slice(5).reduce((sum, item) => sum + item.count, 0);

  const labels = top5.map(item => item.nome);
  const values = top5.map(item => item.count);
  
  if (othersCount > 0) {
    labels.push('Outros');
    values.push(othersCount);
  }

  const colors = [
    'rgba(15, 138, 60, 0.9)',   // Verde principal
    'rgba(19, 192, 83, 0.9)',   // Verde claro
    'rgba(166, 255, 0, 0.9)',   // Verde highlight
    'rgba(15, 138, 60, 0.7)',   // Verde médio
    'rgba(19, 192, 83, 0.7)',   // Verde claro médio
    'rgba(15, 138, 60, 0.5)'    // Outros
  ];

  if (chartPizza) {
    chartPizza.destroy();
  }

  chartPizza = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 3,
        borderColor: '#ffffff',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 15,
            font: { family: 'Inter', size: 12, weight: '500' },
            usePointStyle: true,
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: { family: 'Inter', size: 14, weight: 'bold' },
          bodyFont: { family: 'Inter', size: 13 },
          borderColor: '#0f8a3c',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${context.parsed} (${percentage}%)`;
            }
          }
        }
      },
      cutout: '60%',
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1500,
        easing: 'easeInOutQuart'
      }
    }
  });
}

// Inicializa quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  
  // Inicializa botões de exportação após um pequeno delay
  setTimeout(initializeExportButtons, 500);
});

// Inicializa botões de exportação
function initializeExportButtons() {
  addExportButtonsStyles();
  const container = document.getElementById('exportButtonsContainer');
  if (container) {
    container.innerHTML = createExportButtons('exportButtons');
    
    // Coleta dados do dashboard para exportação
    const dashboardData = {
      resumo: {
        totalIndicadores: document.getElementById('totalIndicadores')?.textContent || '0',
        totalIndicacoes: document.getElementById('totalIndicados')?.textContent || '0',
        mediaIndicadores: document.getElementById('mediaIndicadores')?.textContent || '0'
      }
    };
    
    // Adiciona event listeners
    document.getElementById('exportCSV')?.addEventListener('click', () => {
      const dados = formatDashboardForExport(dashboardData);
      exportToCSV(dados, `dashboard_${new Date().toISOString().split('T')[0]}.csv`);
    });
    
    document.getElementById('exportExcel')?.addEventListener('click', () => {
      const dados = formatDashboardForExport(dashboardData);
      exportToExcel(dados, `dashboard_${new Date().toISOString().split('T')[0]}.xlsx`);
    });
  }
}

