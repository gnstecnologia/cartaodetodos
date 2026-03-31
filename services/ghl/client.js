const { writeAuditLog } = require('../logs/audit');

const GHL_API_BASE_URL = process.env.GHL_API_BASE_URL || 'https://services.leadconnectorhq.com';
const GHL_API_TOKEN = process.env.GHL_API_TOKEN;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || 'aj3gIzF3LkjDml8i9k6e';
const GHL_PIPELINE_ID = process.env.GHL_PIPELINE_ID || 'OtRnvqvykxy1dKiJcuKS';
const GHL_STAGE_ID_INITIAL = process.env.GHL_STAGE_ID_INITIAL || 'd9b228db-0206-4480-a841-4fc3fbde46c8';
const GHL_FIELD_ID_INDICATOR_ID =
  process.env.GHL_FIELD_ID_INDICATOR_ID || '8UgTjSbjJDn8z7iJqOz7';
const GHL_FIELD_ID_INDICATOR_NAME = process.env.GHL_FIELD_ID_INDICATOR_NAME || 'mODVu3L8mo4CXadSaBzA';

/** Mensagem estável para a API exibir na landing quando o GHL bloqueia telefone duplicado. */
const GHL_DUPLICATE_PHONE_USER_MESSAGE =
  'Este telefone já está cadastrado. Use outro número para concluir a indicação.';

function createGhlDuplicatePhoneError() {
  const e = new Error('GHL_DUPLICATE_PHONE');
  e.code = 'GHL_DUPLICATE_PHONE';
  e.userMessage = GHL_DUPLICATE_PHONE_USER_MESSAGE;
  return e;
}

function isDuplicateContactGhlError(err) {
  const msg = String(err?.data?.details?.message || err?.data?.message || err?.message || '');
  return /duplicated contact/i.test(msg) || /does not allow duplicated/i.test(msg);
}

function getHeaders(version) {
  if (!GHL_API_TOKEN) {
    throw new Error('GHL_API_TOKEN não configurado');
  }

  return {
    Accept: 'application/json',
    Authorization: `Bearer ${GHL_API_TOKEN}`,
    Version: version,
    'Content-Type': 'application/json',
  };
}

async function ghlRequest(path, method = 'GET', body, version = '2021-04-15') {
  const response = await fetch(`${GHL_API_BASE_URL}${path}`, {
    method,
    headers: getHeaders(version),
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const error = new Error(`GHL ${method} ${path} falhou: ${response.status}`);
    error.data = data;
    throw error;
  }

  return data;
}

async function createContact({ name, phone, indicatorId, indicatorName }) {
  return ghlRequest('/contacts/', 'POST', {
    firstName: name,
    phone,
    locationId: GHL_LOCATION_ID,
    type: 'lead',
    tags: ['indicação'],
    customFields: [
      {
        id: GHL_FIELD_ID_INDICATOR_ID,
        value: indicatorId || '',
      },
      {
        id: GHL_FIELD_ID_INDICATOR_NAME,
        value: indicatorName || '',
      },
    ],
  }, '2021-07-28');
}

async function sendSmsMessage(contactId, message) {
  return ghlRequest('/conversations/messages', 'POST', {
    type: 'SMS',
    contactId,
    message,
  });
}

async function createOpportunity({ contactId, pipelineId, stageId, name, monetaryValue = 0 }) {
  return ghlRequest('/opportunities/', 'POST', {
    locationId: GHL_LOCATION_ID,
    contactId,
    pipelineId,
    pipelineStageId: stageId,
    name,
    monetaryValue,
    status: 'open',
    source: 'Programa Indicação',
  }, '2021-04-15');
}

async function sendLeadToGhl({ referral, indicatorId, indicatorName }) {
  const result = { steps: {} };

  let contact;
  try {
    contact = await createContact({
      name: referral.nome,
      phone: referral.telefone,
      indicatorId: indicatorId || referral.indicator_id || '',
      indicatorName: indicatorName || '',
    });
  } catch (err) {
    if (isDuplicateContactGhlError(err)) {
      throw createGhlDuplicatePhoneError();
    }
    throw err;
  }

  const contactId = contact.contact?.id || contact.id || contact.data?.contact?.id;
  result.steps.contact = { ok: true, contactId, raw: contact };

  if (contactId) {
    const opp = await createOpportunity({
      contactId,
      pipelineId: GHL_PIPELINE_ID,
      stageId: GHL_STAGE_ID_INITIAL,
      name: referral.nome,
      monetaryValue: 0,
    });
    result.steps.opportunity = { ok: true, raw: opp };

    const messageTemplate =
      process.env.GHL_INITIAL_MESSAGE_TEMPLATE ||
      'Olá, {{nome_indicado}}. Tudo bem? Recebemos a sua indicação pelo {{nome_indicador}}.';

    const message = messageTemplate
      .replaceAll('{{nome_indicado}}', referral.nome)
      .replaceAll('{{nome_indicador}}', indicatorName || 'indicador responsável');

    const sms = await sendSmsMessage(contactId, message);
    result.steps.message = { ok: true, raw: sms };
  }

  await writeAuditLog('ghl_integration_success', 'referral', referral.id, result, 'success');

  return result;
}

module.exports = {
  sendLeadToGhl,
};
