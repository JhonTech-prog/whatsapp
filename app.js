const express = require('express');
const app = express();

// Middleware para ler JSON
app.use(express.json());

// Configurações
const port = process.env.PORT || 10000;
const verifyToken = "G3rPF002513"; // Seu token fixado

// 1. ROTA DE VERIFICAÇÃO (GET)
app.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFICADO! 🎉');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// 2. ROTA DE RECEBIMENTO (POST) - CÓDIGO COMPLETO E LIMPO
app.post('/', (req, res) => {
  // Responde imediatamente ao WhatsApp
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;

    // Verifica se existem mensagens no pacote recebido
    if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const msg = body.entry[0].changes[0].value.messages[0];
      const de = msg.from;
      const texto = msg.text?.body || "Mensagem não é texto (imagem/emoji/link)";

      console.log(`\n✅ MENSAGEM REAL RECEBIDA!`);
      console.log(`De: ${de}`);
      console.log(`Conteúdo: ${texto}`);
      console.log(`-----------------------------------\n`);
    } 
    // Verifica se é apenas um status (entregue/lida)
    else if (body.entry?.[0]?.changes?.[0]?.value?.statuses) {
      console.log("ℹ️ Status de mensagem recebido (entregue ou lida).");
    }
  } catch (err) {
    console.log("❌ Erro ao processar dados:", err.message);
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor ativo na porta ${port} em 2026`);
});

