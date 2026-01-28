const fs = require('fs');
const path = require('path');

// Archivo temporal en /tmp (Vercel lo borra cada deploy, pero funciona para sesión)
const HISTORY_FILE = '/tmp/price_history.json';

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading history:', e);
  }
  return [];
}

function saveHistory(history) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (e) {
    console.error('Error saving history:', e);
  }
}

function filterByRange(history, range) {
  if (!history || history.length === 0) return [];

  const now = new Date();
  let cutoffTime;

  switch(range) {
    case '1d':
      cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  const filtered = history.filter(entry => {
    const entryTime = new Date(entry.timestamp);
    return entryTime >= cutoffTime;
  });

  // Limitar a máximo 50 puntos para no saturar el navegador
  if (filtered.length > 50) {
    const step = Math.ceil(filtered.length / 50);
    return filtered.filter((_, index) => index % step === 0);
  }

  return filtered;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Devuelve el histórico filtrado por rango
      const range = req.query.range || '1d';
      const history = loadHistory();
      const filtered = filterByRange(history, range);

      console.log(`History request: range=${range}, total=${history.length}, filtered=${filtered.length}`);

      return res.status(200).json({ 
        success: true, 
        history: filtered,
        total: history.length,
        filtered: filtered.length
      });
    }

    if (req.method === 'POST') {
      // Agrega un nuevo punto al histórico
      const { binance_buy, binance_sell, bcv, kontigo_buy, kontigo_sell, brecha } = req.body;

      if (!binance_buy || !bcv) {
        throw new Error('Faltan datos');
      }

      let history = loadHistory();

      const newEntry = {
        timestamp: new Date().toISOString(),
        binance_buy: Number(binance_buy) || 0,
        binance_sell: Number(binance_sell) || 0,
        bcv: Number(bcv) || 0,
        kontigo_buy: Number(kontigo_buy) || 0,
        kontigo_sell: Number(kontigo_sell) || 0,
        brecha: Number(brecha) || 0
      };

      history.push(newEntry);

      // Limitar a últimas 500 entradas (aprox 10 días si guardas cada 30 min)
      if (history.length > 500) {
        history = history.slice(-500);
      }

      saveHistory(history);

      return res.status(200).json({ 
        success: true, 
        message: 'Histórico actualizado',
        total: history.length
      });
    }

    return res.status(405).json({ success: false, error: 'Método no permitido' });
  } catch (err) {
    console.error('history error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
