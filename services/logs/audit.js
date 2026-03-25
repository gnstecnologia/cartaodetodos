const { supabase } = require('../supabase/client');

async function writeAuditLog(eventType, entityType, entityId, payload = {}, status = 'success') {
  try {
    await supabase.from('audit_logs').insert({
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId || null,
      status,
      payload,
    });
  } catch (error) {
    console.error('Falha ao gravar audit_logs:', error.message);
  }
}

module.exports = { writeAuditLog };
