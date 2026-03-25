'use strict';

/**
 * Telefone Brasil → E.164 (+55 + DDD + número).
 * Remove espaços e símbolos; aceita com ou sem +55; remove zeros à esquerda (ex.: 021).
 */

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function stripLeadingZeros(digits) {
  let d = digits;
  while (d.length > 1 && d[0] === '0') d = d.slice(1);
  return d;
}

function validDdd(ddd) {
  const n = parseInt(ddd, 10);
  return ddd.length === 2 && n >= 11 && n <= 99;
}

/** DDD + 8 (fixo) ou 9 (celular) dígitos */
function validNational(national) {
  if (national.length === 11) {
    return national[2] === '9';
  }
  if (national.length === 10) {
    const a = national[2];
    return a >= '2' && a <= '8';
  }
  return false;
}

/**
 * @returns {{ ok: true, e164: string } | { ok: false, message: string }}
 */
function parseBrazilPhoneToE164(input) {
  const digits = stripLeadingZeros(onlyDigits(input));

  if (!digits) {
    return { ok: false, message: 'Informe o telefone com DDD e número.' };
  }

  let national;

  if (digits.startsWith('55')) {
    national = digits.slice(2);
    if (national.length !== 10 && national.length !== 11) {
      return {
        ok: false,
        message: 'Após +55, use DDD + número (10 dígitos fixo ou 11 celular).',
      };
    }
  } else if (digits.length === 10 || digits.length === 11) {
    national = digits;
  } else {
    return {
      ok: false,
      message: 'Use DDD + número: 10 dígitos (fixo) ou 11 (celular com 9). Ex.: (21) 99130-5454.',
    };
  }

  const ddd = national.slice(0, 2);
  if (!validDdd(ddd)) {
    return { ok: false, message: 'DDD inválido.' };
  }
  if (!validNational(national)) {
    return {
      ok: false,
      message: 'Número inválido. Celular: 11 dígitos (9 na frente do número). Fixo: 10 dígitos.',
    };
  }

  return { ok: true, e164: `+55${national}` };
}

function isValidBrazilPhone(input) {
  return parseBrazilPhoneToE164(input).ok;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseBrazilPhoneToE164,
    isValidBrazilPhone,
    onlyDigits,
  };
}

if (typeof window !== 'undefined') {
  window.PhoneBr = {
    parseBrazilPhoneToE164,
    isValidBrazilPhone,
    onlyDigits,
  };
}
