// Import Express.js
const express = require('express');

// Create an Express app
const app = express();

// Middleware essencial para ler o que o WhatsApp envia
app.use(express.json());

// Pega a porta do Render ou usa a 10000 por padrão
const port = process.env.PORT || 10000;
// O Token que você configurou no painel do Facebook/Meta
const verifyToken = process.env.VERIFY_TOKEN;

// 1. Rota de Verificação (GET) - Para o Facebook validar seu link
app.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFICADO COM SUCESSO! 🎉');
    res.status(200).send(challenge);
  } else {
    console.log('FALHA NA VERIFICAÇÃO: Token incorreto.');
    res.status(403).end();
  }
});

// 2. Rota de Recebimento (POST) - Onde as mensagens chegam
app.post('/', (req, res) => {
  // RESPONDE IMEDIATAMENTE (Obrigatório para o WhatsApp)
  res.status(200).send('EVENT_RECEIVED');

  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  
  // Exibe no Log do Render tudo o que o WhatsApp mandou
  console.log(`\n--- Webhook recebido em: ${timestamp} ---`);
  console.log(JSON.stringify(req.body, null, 2));

  // Tenta extrair a mensagem de texto
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (message) {
      const de = message.from;
      const texto = message.text?.body;
      console.log(`MENSAGEM RECEBIDA! De: ${de} | Conteúdo: ${texto}`);
    }
  } catch (err) {
    console.log("Erro ao ler o conteúdo do JSON:", err.message);
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

