// Import Express.js
const express = require('express');

// Cria o app Express
const app = express();

// Middleware essencial para ler o JSON que o WhatsApp envia
app.use(express.json());

// Porta padrão do Render
const port = process.env.PORT || 10000;

// O SEU TOKEN FIXADO
const verifyToken = "G3rPF002513"; 

// 1. ROTA DE VERIFICAÇÃO (GET) - Para o Facebook validar seu link
app.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFICADO COM SUCESSO! 🎉');
    res.status(200).send(challenge);
  } else {
    console.log('FALHA NA VERIFICAÇÃO: O token digitado no Facebook não é igual a G3rPF002513');
    res.status(403).end();
  }
});

// 2. ROTA DE RECEBIMENTO (POST) - Onde as mensagens chegam de fato
app.post('/', (req, res) => {
  // Responde imediatamente ao WhatsApp (Obrigatório)
  res.status(200).send('EVENT_RECEIVED');

  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  
  // Mostra o que chegou nos logs do Render
  console.log(`\n--- Webhook recebido em: ${timestamp} ---`);
  
  // Tenta extrair a mensagem do JSON
  try {
    if (req.body.entry && req.body.entry[0].changes && req.body.entry[0].changes[0].value.messages) {
      const message = req.body.entry[0].changes[0].value.messages[0];
      const de = message.from;
      const texto = message.text?.body || "Mensagem não é texto (pode ser imagem/áudio)";
      
      console.log(`MENSAGEM RECEBIDA! De: ${de} | Conteúdo: ${texto}`);
    } else {
      console.log("Evento recebido, mas não é uma mensagem comum (pode ser status de entrega).");
    }
  } catch (err) {
    console.log("Erro ao processar JSON:", err.message);
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port} | Token ativo: ${verifyToken}`);
});


