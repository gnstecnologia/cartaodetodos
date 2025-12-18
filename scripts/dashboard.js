// Configuração
const DASHBOARD_EMAIL = 'admin@cartaodetodos.com.br';
const DASHBOARD_PASSWORD = 'admin123'; // ALTERE ESTA SENHA!
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';
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

// Verifica se está autenticado
function checkAuth() {
  const isAuthenticated = sessionStorage.getItem('dashboardAuth') === 'true';
  if (isAuthenticated) {
    showDashboard();
    loadDashboard();
  } else {
    showLogin();
  }
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

// Login
document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('emailInput').value.trim().toLowerCase();
  const password = document.getElementById('passwordInput').value;
  const errorEl = document.getElementById('loginError');

  if (email === DASHBOARD_EMAIL && password === DASHBOARD_PASSWORD) {
    sessionStorage.setItem('dashboardAuth', 'true');
    showDashboard();
    loadDashboard();
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
    if (params.toString()) url += '?' + params.toString();

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Erro ao buscar dados');
    }

    const data = await response.json();

    if (data.ok === false) {
      throw new Error(data.message || 'Erro ao processar dados');
    }

    // Atualiza o mapeamento de indicadores vindos da API
    if (data.indicadores && typeof data.indicadores === 'object') {
      INDICADORES = data.indicadores;
    }

    // Processa os dados
    processDashboardData(data);

    loadingEl.style.display = 'none';
    contentEl.style.display = 'block';
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    loadingEl.style.display = 'none';
    errorEl.textContent = 'Erro ao carregar dados. Verifique se o endpoint está configurado corretamente.';
    errorEl.style.display = 'block';
  }
}

// Variável global para armazenar todos os dados (antes do filtro)
let allIndicacoesData = null;

// Variáveis para gráficos
let chartTimeline = null;
let chartPizza = null;

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
  if (dateFilterInicio) dateFilterInicio.value = '';
  if (dateFilterFim) dateFilterFim.value = '';
  applyDateFilter();
}

// Processa dados filtrados
function processFilteredData(data) {
  // Agrupa indicações por código
  const indicacoesPorCodigo = {};
  let totalIndicacoes = 0;

  if (data.indicacoes && Array.isArray(data.indicacoes)) {
    data.indicacoes.forEach((indicacao) => {
      const codigo = indicacao.codigoIndicacao || indicacao['Código de Indicação'] || 'Sem código';
      if (!indicacoesPorCodigo[codigo]) {
        indicacoesPorCodigo[codigo] = 0;
      }
      indicacoesPorCodigo[codigo]++;
      totalIndicacoes++;
    });
  }

  // Cria ranking ordenado com nomes dos indicadores
  const ranking = Object.entries(indicacoesPorCodigo)
    .map(([codigo, count]) => ({ 
      codigo, 
      nome: getNomeIndicador(codigo),
      count 
    }))
    .sort((a, b) => b.count - a.count);

  // Atualiza estatísticas
  document.getElementById('totalIndicados').textContent = totalIndicacoes;
  document.getElementById('totalIndicadores').textContent = ranking.length;
  const media = ranking.length > 0 ? Math.round(totalIndicacoes / ranking.length) : 0;
  document.getElementById('mediaIndicadores').textContent = media;

  // Atualiza tabela de ranking
  const rankingBody = document.getElementById('rankingBody');
  rankingBody.innerHTML = '';

  if (ranking.length === 0) {
    rankingBody.innerHTML = `
      <tr>
        <td colspan="3" style="grid-column: 1 / -1; text-align: center; padding: 3rem 2rem; color: rgba(15, 31, 19, 0.5); display: flex; flex-direction: column; align-items: center; gap: 1rem;">
          <i class="fas fa-inbox" style="font-size: 3rem; opacity: 0.3;"></i>
          <span>Nenhum indicado encontrado ainda.</span>
        </td>
      </tr>
    `;
  } else {
    // Limita a exibição aos top 5 indicadores (SEMPRE apenas 5)
    const top5Ranking = ranking.slice(0, 5);
    
    // Garante que nunca mais de 5 itens sejam renderizados
    for (let i = 0; i < Math.min(top5Ranking.length, 5); i++) {
      const item = top5Ranking[i];
      const row = document.createElement('tr');
      const rank = i + 1;
      let rankClass = '';
      if (rank === 1) rankClass = 'rank-1';
      else if (rank === 2) rankClass = 'rank-2';
      else if (rank === 3) rankClass = 'rank-3';

      row.innerHTML = `
        <td>
          <span class="rank-badge ${rankClass}">${rank}</span>
        </td>
        <td>
          <span class="indicador-name">
            <i class="fas fa-user"></i>
            ${item.nome}
          </span>
          <div class="indicador-code">
            <i class="fas fa-hashtag"></i>
            <span>Código: ${item.codigo}</span>
          </div>
        </td>
        <td>
          <span class="count-badge">
            <i class="fas fa-hand-pointer"></i>
            ${item.count} ${item.count !== 1 ? 'indicados' : 'indicado'}
          </span>
        </td>
      `;
      rankingBody.appendChild(row);
    }
  }

  // Atualiza gráficos
  updateCharts(data, ranking);
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
document.addEventListener('DOMContentLoaded', checkAuth);

