const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // CORS para que el frontend pueda llamar sin peo
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const binanceApiUrl = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';

    // --------- COMPRA (BUY) ---------
    const buyPayload = {
      page: 1,
      rows: 1,
      payTypes: [],
      countries: [],
      publisherType: null,
      asset: 'USDT',
      fiat: 'VES',
      tradeType: 'BUY'
    };

    const buyResp = await fetch(binanceApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buyPayload)
    });

    if (!buyResp.ok) {
      throw new Error('Binance BUY HTTP ' + buyResp.status);
    }

    const buyData = await buyResp.json();
    let binanceBuy = null;

    if (buyData && buyData.data && buyData.data.length > 0) {
      binanceBuy = parseFloat(buyData.data[0].adv.price);
    }

    // --------- VENTA (SELL) ---------
    const sellPayload = {
      page: 1,
      rows: 1,
      payTypes: [],
      countries: [],
      publisherType: null,
      asset: 'USDT',
      fiat: 'VES',
      tradeType: 'SELL'
    };

    const sellResp = await fetch(binanceApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sellPayload)
    });

    if (!sellResp.ok) {
      throw new Error('Binance SELL HTTP ' + sellResp.status);
    }

    const sellData = await sellResp.json();
    let binanceSell = null;

    if (sellData && sellData.data && sellData.data.length > 0) {
      binanceSell = parseFloat(sellData.data[0].adv.price);
    }

    if (!binanceBuy || !binanceSell) {
      return res.status(500).json({
        success: false,
        error: 'No se pudieron obtener precios base de Binance'
      });
    }

    // --------- SIMULACIÓN KONTIGO ---------
    // Aquí ajustas a tu gusto, esto es puro spread encima de Binance
    const SPREAD_BUY = 0.015;  // +1.5% para compra
    const SPREAD_SELL = 0.020; // +2.0% para venta

    const kontigoBuy = binanceBuy * (1 + SPREAD_BUY);
    const kontigoSell = binanceSell * (1 + SPREAD_SELL);

    return res.status(200).json({
      success: true,
      source: 'Simulado desde Binance P2P',
      binance: {
        buy: binanceBuy,
        sell: binanceSell
      },
      buy: kontigoBuy,
      sell: kontigoSell,
      note: 'Kontigo simulado. No usa API oficial; se calcula desde Binance + spread.'
    });

  } catch (err) {
    console.error('Error en kontigo_ves:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
