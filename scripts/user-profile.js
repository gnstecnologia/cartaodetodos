// Função para atualizar perfil do usuário na interface
// Esta função pode ser usada em todas as páginas do sistema

function atualizarPerfilUsuario() {
  const userData = sessionStorage.getItem('userData');
  if (!userData) return;
  
  try {
    const user = JSON.parse(userData);
    
    // Atualiza perfil no desktop
    const perfilElement = document.getElementById('userProfile');
    if (perfilElement) {
      const tipoNome = getTipoNome(user.tipo);
      perfilElement.innerHTML = `
        <i class="fas fa-user-circle"></i>
        <span>${escapeHtml(user.nome)}</span>
        <span class="user-type">${tipoNome}</span>
      `;
      perfilElement.style.display = 'inline-flex';
      perfilElement.style.cursor = 'pointer';
      perfilElement.title = 'Gerenciar usuários';
      perfilElement.onclick = () => {
        window.location.href = 'usuarios.html';
      };
    }
    
    // Atualiza perfil no mobile
    const mobilePerfilElement = document.getElementById('mobileUserProfile');
    if (mobilePerfilElement) {
      const tipoNome = getTipoNome(user.tipo);
      mobilePerfilElement.innerHTML = `
        <i class="fas fa-user-circle"></i>
        <span>${escapeHtml(user.nome)}</span>
        <span class="user-type">${tipoNome}</span>
      `;
      mobilePerfilElement.style.display = 'flex';
      mobilePerfilElement.style.cursor = 'pointer';
      mobilePerfilElement.title = 'Gerenciar usuários';
      mobilePerfilElement.onclick = () => {
        window.location.href = 'usuarios.html';
      };
    }
  } catch (e) {
    console.error('Erro ao atualizar perfil:', e);
  }
}

// Função auxiliar para obter nome do tipo
function getTipoNome(tipo) {
  const tipos = {
    'admin': 'Administrador',
    'coordenador': 'Coordenador',
    'gerente': 'Gerente',
    'promotor': 'Promotor'
  };
  return tipos[tipo] || 'Usuário';
}

// Função auxiliar para escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Atualiza perfil quando a página carrega
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', atualizarPerfilUsuario);
} else {
  atualizarPerfilUsuario();
}

