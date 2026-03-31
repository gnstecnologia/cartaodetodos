document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('leadCaptureForm');
  if (!form) {
    return;
  }

  const feedbackEl = form.querySelector('.form-feedback');
  const submitBtn = form.querySelector('button[type="submit"]');
  const codigoInput = form.querySelector('#codigoIndicacao');
  const telefoneInput = form.querySelector('#telefone');

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

  const baseUrl = String(window.API_BASE_URL || window.location.origin || '').replace(/\/$/, '');
  const endpoint =
    (window.LANDING_CONFIG && window.LANDING_CONFIG.submitEndpoint) ||
    `${baseUrl}/api/leads`;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!submitBtn) {
      return;
    }

    // Valida apenas os campos obrigatórios (nome e telefone)
    const nome = form.nome.value.trim();
    const telefoneRaw = form.telefone.value.trim();

    if (!nome || !telefoneRaw) {
      updateFeedback('Preencha todos os campos obrigatórios.', true);
      return;
    }

    const phone = window.PhoneBr.parseBrazilPhoneToE164(telefoneRaw);
    if (!phone.ok) {
      updateFeedback(phone.message, true);
      return;
    }

    // Sempre tenta buscar o código da URL (mesmo que já tenha sido buscado antes)
    const codigoExtraido = extrairCodigoDaURL();
    if (codigoExtraido && codigoInput) {
      codigoInput.value = codigoExtraido;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const promotorDaUrl =
      (urlParams.get('promotorNome') || urlParams.get('promotor') || '').trim() || '';

    const formData = {
      nome: nome,
      telefone: phone.e164,
      codigoIndicacao: codigoInput ? codigoInput.value.trim() : '',
      promotorNome: promotorDaUrl,
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
        if (response.status === 409 && telefoneInput) {
          telefoneInput.focus();
        }
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

  if (telefoneInput && window.PhoneBr) {
    telefoneInput.addEventListener('blur', () => {
      const v = telefoneInput.value.trim();
      if (!v) return;
      const r = window.PhoneBr.parseBrazilPhoneToE164(v);
      updateFeedback(r.ok ? '' : r.message, !r.ok);
    });
  }

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

