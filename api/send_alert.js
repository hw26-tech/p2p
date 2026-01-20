const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Solo POST' });
  }

  try {
    const { email, brecha, binance, bcv } = req.body;

    if (!email || !brecha) {
      throw new Error('Faltan email o brecha');
    }

    // Configurar nodemailer (usando Gmail o tu servicio)
    // IMPORTANTE: Usa variables de entorno en Vercel
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `🚨 Alerta: Brecha Binance vs BCV llegó a ${brecha.toFixed(2)}%`,
      html: `
        <h2>Alerta de Brecha Cambiaria</h2>
        <p>La brecha entre Binance y BCV ha alcanzado <strong>${brecha.toFixed(2)}%</strong></p>
        <hr>
        <p><strong>Binance (promedio):</strong> Bs ${binance.toFixed(2)}</p>
        <p><strong>BCV:</strong> Bs ${bcv.toFixed(2)}</p>
        <p><strong>Diferencia:</strong> Bs ${(binance - bcv).toFixed(2)}</p>
        <hr>
        <p>Revisa la página: <a href="https://p2p-price.vercel.app">p2p-price.vercel.app</a></p>
      `
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ success: true, message: 'Email enviado' });
  } catch (err) {
    console.error('send_alert error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};