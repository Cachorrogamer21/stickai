// Webhook para manter a função ativa no Vercel
module.exports = (req, res) => {
  // Configurar CORS para permitir requisições de qualquer origem
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  // Responder com status OK
  res.status(200).json({ 
    status: 'alive',
    timestamp: new Date().toISOString()
  });
}; 