// Evita colisão de nomes globais com outros scripts que também definem `API_BASE_URL`.
const AUTH_API_BASE_URL = window.API_BASE_URL || window.location.origin;

async function fetchAuthMe() {
  const response = await fetch(`${AUTH_API_BASE_URL}/api/auth/me`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) return null;
  const data = await response.json();
  if (!data?.ok || !data.user) return null;
  return data.user;
}

async function ensureSessionFromServer() {
  const user = await fetchAuthMe();
  if (!user) return null;
  sessionStorage.setItem('dashboardAuth', 'true');
  sessionStorage.setItem('userData', JSON.stringify(user));
  return user;
}

function getSessionUser() {
  const raw = sessionStorage.getItem('userData');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function loginWithPassword(email, password) {
  const response = await fetch(`${AUTH_API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.ok || !data?.user) {
    throw new Error(data?.message || 'Credenciais inválidas');
  }
  sessionStorage.setItem('dashboardAuth', 'true');
  sessionStorage.setItem('userData', JSON.stringify(data.user));
  return data.user;
}

async function logoutSession() {
  try {
    await fetch(`${AUTH_API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (_) {
    // Ignora falha de rede no logout remoto, limpando sessão local
  }
  sessionStorage.removeItem('dashboardAuth');
  sessionStorage.removeItem('userData');
}

async function ensureAuthenticatedPage(options = {}) {
  const { adminOnly = false, redirectTo = 'dashboard.html' } = options;
  let user = getSessionUser();
  if (!user) {
    user = await ensureSessionFromServer();
  }
  if (!user) {
    window.location.href = redirectTo;
    return null;
  }
  if (adminOnly && user.permissao !== 'admin') {
    window.location.href = 'dashboard.html';
    return null;
  }
  return user;
}

window.AuthClient = {
  loginWithPassword,
  logoutSession,
  getSessionUser,
  ensureSessionFromServer,
  ensureAuthenticatedPage,
};
