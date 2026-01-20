const fetch = require('node-fetch');

// Limpia y convierte un número con cualquier formato venezolano
function parseNumber(str) {
  if (!str) return null;
  let s = str.trim();

  // Quitar espacios
  s = s.replace(/\s+/g, '');

  // Si tiene miles y decimales mezclados
  if (s.includes('.') && s.includes(',')) {
    // Determinar cuál es decimal (el último separador)
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    const decimal = lastDot > lastComma ? '.' : ',';
    const thousand = decimal === '.' ? ',' : '.';

    s = s.split(thousand).join(''); // quitar miles
    s = s.replace(decimal, '.');    // dejar decimal en punto
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

module.exports = async (req, reHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const url = "https://www.monitordedivisavenezuela.com/";
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    if (!r.ok) {
      throw new Error("HTTP " + r.status);
    }

    const html = await r.text();

    // Regex ULTRA flexible:
    // Busca "Tasa BCV", luego cualquier vaina HTML, luego un número antes de "Bs"
    const regex = /Tasa\s*BCV[\s\S]*?(\d{1,3}(?:[\.,]\d{3})*[\.,]\d{1,2})(?=\s*Bs)/i;

    const match = html.match(regex);

    if (!match) {
      throw new Error("No pude extraer la tasa BCV (la página cambió otra vez)");
    }

    const rate = parseNumber(match[1]);

    if (!rate) {
      throw new Error("El número encontrado no se pudo convertir");
    }

    return res.status(200).json({
      success: true,
      source: "MonitorDeDivisaVenezuela.com",
      rate
    });

  } catch (err) {
    console.error("bcv_ves error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
