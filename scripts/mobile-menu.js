// Script reutilizável para menu mobile

function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const overlay = document.getElementById('mobileMenuOverlay');
  const toggle = document.querySelector('.mobile-menu-toggle');
  
  if (!menu || !overlay) return;
  
  menu.classList.toggle('active');
  overlay.classList.toggle('active');
  if (toggle) {
    toggle.classList.toggle('active');
    // Esconde o botão hambúrguer quando o menu está aberto
    if (menu.classList.contains('active')) {
      toggle.style.display = 'none';
    } else {
      toggle.style.display = 'flex';
    }
  }
  
  // Previne scroll do body quando menu está aberto
  if (menu.classList.contains('active')) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

function closeMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const overlay = document.getElementById('mobileMenuOverlay');
  const toggle = document.querySelector('.mobile-menu-toggle');
  
  if (!menu || !overlay) return;
  
  menu.classList.remove('active');
  overlay.classList.remove('active');
  if (toggle) {
    toggle.classList.remove('active');
    toggle.style.display = 'flex';
  }
  document.body.style.overflow = '';
}

// Inicializa menu mobile
document.addEventListener('DOMContentLoaded', function() {
  const overlay = document.getElementById('mobileMenuOverlay');
  if (overlay) {
    overlay.addEventListener('click', closeMobileMenu);
  }

  // Fecha menu ao clicar em um link
  const menuItems = document.querySelectorAll('.mobile-menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      setTimeout(closeMobileMenu, 300);
    });
  });

  // Atualiza perfil no menu mobile
  function updateMobileProfile() {
    const userData = sessionStorage.getItem('userData');
    if (!userData) return;
    
    try {
      const user = JSON.parse(userData);
      const mobileProfile = document.getElementById('mobileUserProfile');
      if (mobileProfile) {
        mobileProfile.innerHTML = `
          <i class="fas fa-user-circle"></i>
          <span>${user.nome}</span>
          <span class="user-type">${user.tipo === 'coordenador' ? 'Coordenador' : user.tipo === 'gerente' ? 'Gerente' : 'Promotor'}</span>
        `;
        mobileProfile.style.display = 'flex';
      }

      // Esconde botão gerar indicador para promotores
      const mobileGerarBtn = document.getElementById('mobileGerarIndicador');
      if (mobileGerarBtn && user.permissao !== 'admin') {
        mobileGerarBtn.style.display = 'none';
      } else if (mobileGerarBtn) {
        mobileGerarBtn.style.display = 'flex';
      }
    } catch (e) {
      console.error('Erro ao atualizar perfil mobile:', e);
    }
  }

  // Atualiza perfil quando carregar
  updateMobileProfile();
  
  // Observa mudanças no sessionStorage
  window.addEventListener('storage', updateMobileProfile);
});

