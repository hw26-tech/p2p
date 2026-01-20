const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Usamos el API de Monitor Dólar Venezuela
    const apiUrl = 'https://api.monitordolar.com/api/1.0/rates';
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error('API Monitor Dólar no disponible');
    }

    const data = await response.json();
    let paralleloRate = null;

    // Extraer la tasa del paralelo
    if (data && data.VES && data.VES.paralelo) {
      paralleloRate = parseFloat(data.VES.paralelo);
    }

    if (!paralleloRate) {
      throw new Error('No se encontró tasa paralelo en la respuesta');
    }

    // Simulamos Kontigo con un spread sobre la tasa paralela
    const SPREAD_BUY = 0.005;   // +0.5% para compra
    const SPREAD_SELL = 0.010;  // +1.0% para venta

    const buyPrice = paralleloRate * (1 + SPREAD_BUY);
    const sellPrice = paralleloRate * (1 + SPREAD_SELL);

    return res.status(200).json({
      success: true,
      source: 'Kontigo (simulado desde paralelo)',
      buy: buyPrice,
      sell: sellPrice,
      baseRate: paralleloRate,
      note: 'Kontigo no tiene API pública. Esto es una aproximación basada en tasa paralela + spread.'
    });

  } catch (error) {
    console.error('Error en kontigo_ves:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
