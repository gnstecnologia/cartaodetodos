document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('leadCaptureForm');
  if (!form) {
    return;
  }

  const feedbackEl = form.querySelector('.form-feedback');
  const submitBtn = form.querySelector('button[type="submit"]');
  const codigoInput = form.querySelector('#codigoIndicacao');

  // Função para extrair o código de indicação da URL
  function extrairCodigoDaURL() {
    const urlParams = new URLSearchParams(window.location.search);
    let codigo = urlParams.get('codigo');
    
    // Se não encontrou no query string, tenta extrair do pathname
    // Exemplo: /123 ou /codigo/123
    if (!codigo) {
      const pathParts = window.location.pathname.split('/').filter(part => part);
      // Pega o último segmento do path como código
      if (pathParts.length > 0) {
        const ultimoSegmento = pathParts[pathParts.length - 1];
        // Verifica se é um número
        if (/^\d+$/.test(ultimoSegmento)) {
          codigo = ultimoSegmento;
        }
      }
    }
    
    return codigo;
  }

  // Preenche o campo oculto com o código da URL
  const codigoIndicacao = extrairCodigoDaURL();
  if (codigoIndicacao && codigoInput) {
    codigoInput.value = codigoIndicacao;
  }

  const endpoint =
    (window.LANDING_CONFIG && window.LANDING_CONFIG.submitEndpoint) ||
    'http://localhost:3000/api/leads';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!submitBtn) {
      return;
    }

    // Valida apenas os campos obrigatórios (nome e telefone)
    const nome = form.nome.value.trim();
    const telefone = form.telefone.value.trim();

    if (!nome || !telefone) {
      updateFeedback('Preencha todos os campos obrigatórios.', true);
      return;
    }

    // Sempre tenta buscar o código da URL (mesmo que já tenha sido buscado antes)
    const codigoExtraido = extrairCodigoDaURL();
    if (codigoExtraido && codigoInput) {
      codigoInput.value = codigoExtraido;
    }

    // Prepara os dados do formulário (código pode estar vazio)
    const formData = {
      nome: nome,
      telefone: telefone,
      codigoIndicacao: codigoInput ? codigoInput.value.trim() : '',
    };

    toggleSubmitState(true);
    updateFeedback('Enviando...', false);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok || result.ok === false) {
        updateFeedback(
          result.message || 'Não foi possível enviar agora. Tente novamente em instantes.',
          true
        );
        return;
      }

      // Redireciona para a página de agradecimento
      window.location.href = 'obrigado.html';
    } catch (error) {
      console.error('Erro ao enviar formulário', error);
      updateFeedback(
        'Não foi possível enviar agora. Tente novamente em instantes.',
        true
      );
    } finally {
      toggleSubmitState(false);
    }
  });

  function toggleSubmitState(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? 'Enviando...' : 'Enviar';
  }

  function updateFeedback(message, isError) {
    if (!feedbackEl) {
      return;
    }
    const text = message ? String(message).trim() : '';
    feedbackEl.textContent = text;
    feedbackEl.style.color = isError ? '#c02020' : '#0f8a3c';
    feedbackEl.style.display = text ? 'block' : 'none';
  }
});

