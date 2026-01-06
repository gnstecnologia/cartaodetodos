// Configuração de usuários do sistema
// Este arquivo contém as credenciais dos usuários autorizados
// Os usuários são carregados da API (Google Sheets), mas mantemos usuários padrão como fallback

// Usuários padrão (usados apenas se a API não estiver disponível ou na primeira vez)
const USUARIOS_PADRAO = [
  {
    email: 'admin@cartaodetodos.com.br',
    senha: 'admin123', // ALTERE ESTA SENHA EM PRODUÇÃO!
    nome: 'Administrador',
    tipo: 'admin',
    permissao: 'admin'
  },
  {
    email: 'coordenador@cartaodetodos.com.br',
    senha: 'coordenador123', // ALTERE ESTA SENHA EM PRODUÇÃO!
    nome: 'Coordenador Gerente',
    tipo: 'coordenador',
    permissao: 'admin'
  },
  {
    email: 'gerente@cartaodetodos.com.br',
    senha: 'gerente123', // ALTERE ESTA SENHA EM PRODUÇÃO!
    nome: 'Gerente',
    tipo: 'gerente',
    permissao: 'admin'
  }
];

// Cache de usuários carregados da API
let usuariosCache = null;
let usuariosCacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Função para carregar usuários da API
async function carregarUsuariosDaAPI() {
  const API_BASE_URL = window.API_BASE_URL || window.location.origin;
  const USUARIOS_ENDPOINT = `${API_BASE_URL}/api/usuarios`;

  try {
    const response = await fetch(USUARIOS_ENDPOINT);
    if (!response.ok) {
      throw new Error('Erro ao carregar usuários');
    }

    const data = await response.json();
    if (data.ok && data.usuarios) {
      usuariosCache = data.usuarios;
      usuariosCacheTime = Date.now();
      return data.usuarios;
    }
    return null;
  } catch (error) {
    console.warn('Erro ao carregar usuários da API, usando usuários padrão:', error);
    return null;
  }
}

// Função para obter lista de usuários (da API ou padrão)
async function obterUsuarios() {
  // Verifica cache
  if (usuariosCache && usuariosCacheTime && (Date.now() - usuariosCacheTime) < CACHE_DURATION) {
    return usuariosCache;
  }

  // Tenta carregar da API
  const usuariosAPI = await carregarUsuariosDaAPI();
  if (usuariosAPI && usuariosAPI.length > 0) {
    return usuariosAPI;
  }

  // Fallback para usuários padrão
  return USUARIOS_PADRAO;
}

// Função para verificar credenciais de login
async function verificarCredenciais(email, senha) {
  // Normaliza o email (remove espaços e converte para minúsculas)
  const emailNormalizado = email.trim().toLowerCase();
  
  // Carrega usuários (da API ou padrão)
  const usuarios = await obterUsuarios();
  
  // Busca o usuário pelo email
  const usuario = usuarios.find(u => u.email.toLowerCase() === emailNormalizado);
  
  // Verifica se o usuário existe e se a senha está correta
  if (usuario && usuario.senha === senha) {
    return {
      sucesso: true,
      usuario: {
        email: usuario.email,
        nome: usuario.nome,
        tipo: usuario.tipo,
        permissao: usuario.permissao
      }
    };
  }
  
  // Retorna erro se as credenciais estiverem incorretas
  return {
    sucesso: false,
    usuario: null
  };
}

// Função para invalidar cache (útil após criar/editar/excluir usuário)
function invalidarCacheUsuarios() {
  usuariosCache = null;
  usuariosCacheTime = null;
}
