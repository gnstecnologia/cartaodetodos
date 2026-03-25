async function checkAuth() {
  const user = await window.AuthClient.ensureAuthenticatedPage({
    adminOnly: true,
    redirectTo: 'dashboard.html',
  });
  if (!user) return false;
  return true;
}

// Configuração da API
const API_BASE_URL = window.API_BASE_URL || window.location.origin;

// Elementos do formulário
const form = document.getElementById('indicadorForm');
const submitBtn = document.getElementById('submitBtn');
const successMessage = document.getElementById('successMessage');
const resultCard = document.getElementById('resultCard');

// Campos do formulário
const nomeInput = document.getElementById('nome');
const telefoneInput = document.getElementById('telefone');
const chavePixInput = document.getElementById('chavePix');

// Elementos de resultado
const resultId = document.getElementById('resultId');
const resultNome = document.getElementById('resultNome');
const resultTelefone = document.getElementById('resultTelefone');
const resultChavePix = document.getElementById('resultChavePix');
const resultUrl = document.getElementById('resultUrl');

// Variável para armazenar a URL gerada
let urlGerada = '';

function validarTelefone(telefone) {
  return window.PhoneBr && window.PhoneBr.isValidBrazilPhone(telefone);
}

function mensagemTelefoneInvalido(val) {
  const raw = val !== undefined ? val : telefoneInput.value;
  const r = window.PhoneBr ? window.PhoneBr.parseBrazilPhoneToE164(raw) : { message: 'Telefone inválido.' };
  return r.message || 'Informe DDD + número (celular com 9).';
}

// Validação de nome (mínimo 3 caracteres)
function validarNome(nome) {
  return nome.trim().length >= 3;
}

// Validação de chave Pix (mínimo 3 caracteres)
function validarChavePix(chavePix) {
  return chavePix.trim().length >= 3;
}

// Mostrar erro em um campo
function mostrarErro(campo, mensagem) {
  const input = document.getElementById(campo);
  const errorSpan = document.getElementById(campo + 'Error');
  
  input.classList.add('error');
  input.classList.remove('success');
  errorSpan.textContent = mensagem;
  errorSpan.classList.add('show');
}

// Limpar erro de um campo
function limparErro(campo) {
  const input = document.getElementById(campo);
  const errorSpan = document.getElementById(campo + 'Error');
  
  input.classList.remove('error');
  input.classList.add('success');
  errorSpan.classList.remove('show');
}

// Validar formulário
function validarFormulario() {
  let valido = true;

  // Validar nome
  if (!validarNome(nomeInput.value)) {
    mostrarErro('nome', 'Nome deve ter pelo menos 3 caracteres');
    valido = false;
  } else {
    limparErro('nome');
  }

  // Validar telefone
  if (!validarTelefone(telefoneInput.value)) {
    mostrarErro('telefone', mensagemTelefoneInvalido(telefoneInput.value));
    valido = false;
  } else {
    limparErro('telefone');
  }

  // Validar chave Pix
  if (!validarChavePix(chavePixInput.value)) {
    mostrarErro('chavePix', 'Chave Pix deve ter pelo menos 3 caracteres');
    valido = false;
  } else {
    limparErro('chavePix');
  }

  return valido;
}

// Limpar formulário
function limparFormulario() {
  form.reset();
  nomeInput.classList.remove('error', 'success');
  telefoneInput.classList.remove('error', 'success');
  chavePixInput.classList.remove('error', 'success');
  
  document.querySelectorAll('.error-message').forEach(el => {
    el.classList.remove('show');
  });
  
  successMessage.classList.remove('show');
  resultCard.classList.remove('show');
  urlGerada = '';
}

// Mostrar mensagem de sucesso
function mostrarSucesso(mensagem) {
  successMessage.textContent = mensagem;
  successMessage.classList.add('show');
  setTimeout(() => {
    successMessage.classList.remove('show');
  }, 5000);
}

// Mostrar resultado
function mostrarResultado(indicador) {
  resultId.textContent = indicador.id;
  resultNome.textContent = indicador.nome;
  resultTelefone.textContent = indicador.telefone;
  resultChavePix.textContent = indicador.chavePix;
  resultUrl.textContent = indicador.url;
  urlGerada = indicador.url;
  resultCard.classList.add('show');
  
  // Scroll para o resultado
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Copiar URL para área de transferência
function copiarUrl(button) {
  if (!urlGerada) return;

  const btn = button?.closest?.('.copy-btn') || document.querySelector('#resultCard .copy-btn');

  navigator.clipboard.writeText(urlGerada).then(() => {
    if (!btn) return;
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
    btn.style.background = '#27ae60';
    setTimeout(() => {
      btn.innerHTML = textoOriginal;
      btn.style.background = '';
    }, 2000);
  }).catch((err) => {
    console.error('Erro ao copiar:', err);
    alert('Erro ao copiar URL. Tente selecionar e copiar manualmente.');
  });
}

// Submeter formulário
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Validar formulário
  if (!validarFormulario()) {
    return;
  }

  // Desabilitar botão e mostrar loading
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="loading"></span> Criando...';

  try {
    const telParsed = window.PhoneBr.parseBrazilPhoneToE164(telefoneInput.value.trim());
    if (!telParsed.ok) {
      throw new Error(telParsed.message);
    }

    const response = await fetch(`${API_BASE_URL}/api/indicadores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        nome: nomeInput.value.trim(),
        telefone: telParsed.e164,
        chavePix: chavePixInput.value.trim(),
      }),
    });

    const data = await response.json();

    if (data.ok) {
      mostrarSucesso('Indicador criado com sucesso!');
      mostrarResultado(data.indicador);
      form.reset();
      
      // Limpar classes de validação
      nomeInput.classList.remove('error', 'success');
      telefoneInput.classList.remove('error', 'success');
      chavePixInput.classList.remove('error', 'success');
    } else {
      mostrarErro('nome', data.message || 'Erro ao criar indicador');
      mostrarSucesso('Erro: ' + (data.message || 'Erro ao criar indicador'));
    }
  } catch (error) {
    console.error('Erro:', error);
    mostrarErro('nome', 'Erro ao conectar com o servidor. Tente novamente.');
    mostrarSucesso('Erro: Não foi possível conectar com o servidor.');
  } finally {
    // Reabilitar botão
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-check"></i> Criar Indicador';
  }
});

// Validação em tempo real
nomeInput.addEventListener('blur', () => {
  if (nomeInput.value.trim()) {
    if (validarNome(nomeInput.value)) {
      limparErro('nome');
    } else {
      mostrarErro('nome', 'Nome deve ter pelo menos 3 caracteres');
    }
  }
});

telefoneInput.addEventListener('blur', () => {
  if (telefoneInput.value.trim()) {
    if (validarTelefone(telefoneInput.value)) {
      limparErro('telefone');
    } else {
      mostrarErro('telefone', mensagemTelefoneInvalido(telefoneInput.value));
    }
  }
});

chavePixInput.addEventListener('blur', () => {
  if (chavePixInput.value.trim()) {
    if (validarChavePix(chavePixInput.value)) {
      limparErro('chavePix');
    } else {
      mostrarErro('chavePix', 'Chave Pix deve ter pelo menos 3 caracteres');
    }
  }
});

// Máscara de telefone
telefoneInput.addEventListener('input', (e) => {
  let value = e.target.value.replace(/\D/g, '');
  
  if (value.length <= 10) {
    value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  } else {
    value = value.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  }
  
  e.target.value = value;
});

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
});

