const fetch = require('node-fetch');

function parseNumber(str) {
  if (!str) return null;
  let s = String(str).trim();

  // Quitar espacios
  s = s.replace(/\s+/g, '');

  // Casos típicos: 344.51   /   344,51   /   1.234,56   /   1,234.56
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
    s = s.replace(',', '.');
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// Probaremos varios patrones por si la web cambia el texto
function extractBcvRateFromHtml(html) {
  const patterns = [
    /Tasa\s*BCV[\s\S]*?(\d[\d.,]*)\s*Bs\/USD/i,
    /Tasa\s*BCV[\s\S]*?(\d[\d.,]*)\s*Bs\s*\/\s*USD/i,
    /Tasa\s*oficial[\s\S]*?(\d[\d.,]*)\s*Bs\/USD/i,
    /BCV[\s\S]*?(\d[\d.,]*)\s*Bs\/USD/i
  ];

  for (const re of patterns) {
    const m = html.match(re);
    if (m) {
      const val = parseNumber(m[1]);
      if (val) return val;
    }
  }

  return null;
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    if (!r.ok) {
      throw new Error('No pude abrir Monitor de Divisas (HTTP ' + r.status + ')');
    }

    const html = await r.text();

    // DEBUG básico: si quieres, puedes loguear un pedazo del HTML
    // console.log(html.slice(0, 1000));

    const rate = extractBcvRateFromHtml(html);

    if (!rate) {
      throw new Error('No pude extraer la tasa BCV desde el HTML (regex no hizo match)');
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
