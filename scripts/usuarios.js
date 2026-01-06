// Verifica autenticação e permissão (apenas admin)
function checkAuth() {
  const userData = sessionStorage.getItem('userData');
  if (!userData) {
    window.location.href = 'dashboard.html';
    return false;
  }
  
  try {
    const user = JSON.parse(userData);
    // Verifica se tem permissão para gerenciar usuários (apenas admin)
    if (user.permissao !== 'admin') {
      alert('Você não tem permissão para acessar esta página.');
      window.location.href = 'dashboard.html';
      return false;
    }
    sessionStorage.setItem('dashboardAuth', 'true');
    return true;
  } catch {
    window.location.href = 'dashboard.html';
    return false;
  }
}

// Verifica autenticação ao carregar a página
if (!checkAuth()) {
  // Redirecionamento já foi feito na função checkAuth
}

// Configuração da API
const API_BASE_URL = window.API_BASE_URL || window.location.origin;
const USUARIOS_ENDPOINT = `${API_BASE_URL}/api/usuarios`;

// Variáveis globais
let allUsers = [];
let editingUserId = null;

// Elementos DOM
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const successEl = document.getElementById('success');
const usuariosGridEl = document.getElementById('usuariosGrid');
const userModal = document.getElementById('userModal');
const userForm = document.getElementById('userForm');
const modalTitle = document.getElementById('modalTitle');
const modalError = document.getElementById('modalError');
const modalSuccess = document.getElementById('modalSuccess');
const submitBtn = document.getElementById('submitBtn');

// Carrega usuários
async function loadUsers() {
  loadingEl.style.display = 'block';
  errorEl.classList.remove('show');
  usuariosGridEl.style.display = 'none';

  try {
    const response = await fetch(USUARIOS_ENDPOINT);
    
    if (!response.ok) {
      throw new Error('Erro ao carregar usuários');
    }

    const data = await response.json();
    
    if (data.ok === false) {
      throw new Error(data.message || 'Erro ao carregar usuários');
    }

    allUsers = data.usuarios || [];
    
    // Debug: verifica dados do admin
    const adminUser = allUsers.find(u => u.email === 'admin@cartaodetodos.com.br');
    if (adminUser) {
      console.log('Admin encontrado:', {
        email: adminUser.email,
        tipo: adminUser.tipo,
        tipoType: typeof adminUser.tipo,
        permissao: adminUser.permissao
      });
    }
    
    renderUsers();
    
    loadingEl.style.display = 'none';
    usuariosGridEl.style.display = 'grid';
  } catch (error) {
    console.error('Erro ao carregar usuários:', error);
    loadingEl.style.display = 'none';
    errorEl.textContent = 'Erro ao carregar usuários. Verifique se o servidor está rodando.';
    errorEl.classList.add('show');
  }
}

// Renderiza usuários
function renderUsers() {
  if (allUsers.length === 0) {
    usuariosGridEl.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: rgba(15, 31, 19, 0.5);">
        <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
        <h3>Nenhum usuário encontrado</h3>
        <p>Clique em "Novo Usuário" para criar o primeiro usuário.</p>
      </div>
    `;
    return;
  }

  usuariosGridEl.innerHTML = allUsers.map(user => {
    // Normaliza o tipo para garantir que funcione corretamente
    const tipoNormalizado = user.tipo ? String(user.tipo).toLowerCase().trim() : 'promotor';
    const badgeClass = getBadgeClass(tipoNormalizado);
    const tipoNome = getTipoNome(tipoNormalizado);
    
    return `
      <div class="user-card">
        <div class="user-header">
          <div style="flex: 1; min-width: 0;">
            <h3 class="user-name">${escapeHtml(user.nome)}</h3>
            <p class="user-email">${escapeHtml(user.email)}</p>
          </div>
          <span class="user-badge ${badgeClass}">${tipoNome}</span>
        </div>
        <div style="margin-top: 1rem; word-wrap: break-word; overflow-wrap: break-word;">
          <div style="font-size: 0.85rem; color: rgba(15, 31, 19, 0.6); margin-bottom: 0.5rem; line-height: 1.5;">
            <i class="fas fa-shield-alt"></i> Permissão: <strong>${user.permissao === 'admin' ? 'Admin' : 'Usuário'}</strong>
          </div>
        </div>
        <div class="user-actions">
          <button class="btn-action btn-edit" onclick="editUser('${user.email}')" title="Editar usuário">
            <i class="fas fa-edit"></i>
            Editar
          </button>
          <button class="btn-action btn-delete" onclick="deleteUser('${user.email}')" title="Excluir usuário">
            <i class="fas fa-trash"></i>
            Excluir
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Função auxiliar para escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Função para obter classe do badge
function getBadgeClass(tipo) {
  if (!tipo) return 'badge-promotor';
  const tipoLower = tipo.toLowerCase().trim();
  const tipos = {
    'admin': 'badge-admin',
    'coordenador': 'badge-coordenador',
    'gerente': 'badge-gerente',
    'promotor': 'badge-promotor'
  };
  return tipos[tipoLower] || 'badge-promotor';
}

// Função para obter nome do tipo
function getTipoNome(tipo) {
  if (!tipo) return 'Usuário';
  const tipoLower = tipo.toLowerCase().trim();
  const tipos = {
    'admin': 'Administrador',
    'coordenador': 'Coordenador',
    'gerente': 'Gerente',
    'promotor': 'Promotor'
  };
  return tipos[tipoLower] || tipo || 'Usuário';
}

// Abre modal para criar novo usuário
function openModal(userEmail = null) {
  editingUserId = userEmail;
  
  if (userEmail) {
    // Modo edição
    const user = allUsers.find(u => u.email === userEmail);
    if (!user) {
      showError('Usuário não encontrado');
      return;
    }

    modalTitle.textContent = 'Editar Usuário';
    document.getElementById('userId').value = userEmail;
    document.getElementById('nome').value = user.nome || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('email').disabled = true; // Email não pode ser editado
    document.getElementById('senha').value = '';
    document.getElementById('senha').required = false; // Senha não obrigatória na edição
    document.getElementById('senha').placeholder = 'Deixe em branco para manter a senha atual';
    document.getElementById('tipo').value = user.tipo || '';
    document.getElementById('permissao').value = user.permissao || '';
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';
  } else {
    // Modo criação
    modalTitle.textContent = 'Novo Usuário';
    userForm.reset();
    document.getElementById('userId').value = '';
    document.getElementById('email').disabled = false;
    document.getElementById('senha').required = true;
    document.getElementById('senha').placeholder = 'Digite a senha';
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Salvar';
  }

  modalError.classList.remove('show');
  modalSuccess.classList.remove('show');
  userModal.classList.add('active');
}

// Fecha modal
function closeModal() {
  userModal.classList.remove('active');
  userForm.reset();
  editingUserId = null;
  modalError.classList.remove('show');
  modalSuccess.classList.remove('show');
}

// Fecha modal ao clicar no overlay
function closeModalOnOverlay(event) {
  if (event.target === userModal) {
    closeModal();
  }
}

// Salva usuário (cria ou edita)
async function saveUser(event) {
  event.preventDefault();

  const userId = document.getElementById('userId').value;
  const nome = document.getElementById('nome').value.trim();
  const email = document.getElementById('email').value.trim().toLowerCase();
  const senha = document.getElementById('senha').value;
  const tipo = document.getElementById('tipo').value;
  const permissao = document.getElementById('permissao').value;

  // Validações
  if (!nome || !email || !tipo || !permissao) {
    showModalError('Preencha todos os campos obrigatórios');
    return;
  }

  if (!userId && !senha) {
    showModalError('A senha é obrigatória para novos usuários');
    return;
  }

  if (senha && senha.length < 6) {
    showModalError('A senha deve ter pelo menos 6 caracteres');
    return;
  }

  // Validação de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showModalError('Email inválido');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="loading"></span> Salvando...';

  try {
    const userData = {
      nome,
      email,
      tipo,
      permissao
    };

    // Se tem senha, adiciona ao objeto
    if (senha) {
      userData.senha = senha;
    }

    const url = userId ? `${USUARIOS_ENDPOINT}/${encodeURIComponent(userId)}` : USUARIOS_ENDPOINT;
    const method = userId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    const data = await response.json();

    if (!response.ok || data.ok === false) {
      throw new Error(data.message || 'Erro ao salvar usuário');
    }

    showModalSuccess(userId ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!');
    
    // Recarrega lista após 1 segundo
    setTimeout(() => {
      closeModal();
      loadUsers();
      showSuccess(userId ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!');
    }, 1000);

  } catch (error) {
    console.error('Erro ao salvar usuário:', error);
    showModalError(error.message || 'Erro ao salvar usuário. Tente novamente.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = editingUserId 
      ? '<i class="fas fa-save"></i> Salvar Alterações'
      : '<i class="fas fa-save"></i> Salvar';
  }
}

// Edita usuário
function editUser(email) {
  openModal(email);
}

// Exclui usuário
async function deleteUser(email) {
  // Verifica se não está tentando excluir a si mesmo
  const currentUser = JSON.parse(sessionStorage.getItem('userData') || '{}');
  if (currentUser.email === email) {
    showError('Você não pode excluir seu próprio usuário');
    return;
  }

  if (!confirm(`Tem certeza que deseja excluir o usuário "${email}"?\n\nEsta ação não pode ser desfeita.`)) {
    return;
  }

  try {
    const response = await fetch(`${USUARIOS_ENDPOINT}/${encodeURIComponent(email)}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok || data.ok === false) {
      throw new Error(data.message || 'Erro ao excluir usuário');
    }

    showSuccess('Usuário excluído com sucesso!');
    loadUsers();

  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    showError(error.message || 'Erro ao excluir usuário. Tente novamente.');
  }
}

// Mostra mensagem de erro no modal
function showModalError(message) {
  modalError.textContent = message;
  modalError.classList.add('show');
  setTimeout(() => {
    modalError.classList.remove('show');
  }, 5000);
}

// Mostra mensagem de sucesso no modal
function showModalSuccess(message) {
  modalSuccess.textContent = message;
  modalSuccess.classList.add('show');
}

// Mostra mensagem de erro
function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.add('show');
  setTimeout(() => {
    errorEl.classList.remove('show');
  }, 5000);
}

// Mostra mensagem de sucesso
function showSuccess(message) {
  successEl.textContent = message;
  successEl.classList.add('show');
  setTimeout(() => {
    successEl.classList.remove('show');
  }, 5000);
}

// Inicializa página
document.addEventListener('DOMContentLoaded', () => {
  loadUsers();
});

