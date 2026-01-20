const fetch = require('node-fetch');

function parseNumber(str) {
  if (!str) return null;
  let s = String(str).trim();

  // Quitar espacios
  s = s.replace(/\s+/g, '');

  // Normalizar: si viene con miles y decimales raros, intentamos adivinar
  // Caso A: "1.234,56" -> 1234.56
  // Caso B: "1,234.56" -> 1234.56
  const hasDot = s.includes('.');
  const hasComma = s.includes(',');

  if (hasDot && hasComma) {
    // El último separador es el decimal
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    const decimalSep = lastDot > lastComma ? '.' : ',';
    const thousandSep = decimalSep === '.' ? ',' : '.';
    s = s.split(thousandSep).join('');
    s = s.replace(decimalSep, '.');
  } else if (hasComma && !hasDot) {
    // "344,51" -> 344.51
    s = s.replace(',', '.');
  } else {
    // "344.51" ok
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function extractBcvRateFromHtml(html) {
  // Busca "Tasa BCV" seguido del primer número que termine en "Bs/USD"
  // Ej: "Tasa BCV ... 344.51 Bs/USD"
  const re = /Tasa\s*BCV[\s\S]*?(\d[\d.,]*)\s*Bs\/USD/i;
  const m = html.match(re);
  if (!m) return null;
  return parseNumber(m[1]);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const url = 'https://www.monitordedivisavenezuela.com/';
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!r.ok) {
      throw new Error('No pude abrir Monitor de Divisas (HTTP ' + r.status + ')');
    }

    const html = await r.text();
    const rate = extractBcvRateFromHtml(html);

    if (!rate) {
      throw new Error('No pude extraer la tasa BCV desde el HTML (cambió el formato)');
    }

    return res.status(200).json({
      success: true,
      source: 'monitordedivisavenezuela.com (Tasa BCV)',
      rate
    });
  } catch (err) {
    console.error('bcv_ves error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
