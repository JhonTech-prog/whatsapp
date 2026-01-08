const express = require('express');
const app = express();

// 1. Middleware para ler JSON (Obrigatório)
app.use(express.json());

// 2. ADICIONANDO O SEU CÓDIGO (CORS)
// Isso permite que o servidor aceite requisições de outros domínios
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Configurações de conexão
const port = process.env.PORT || 10000;
const verifyToken = "G3rPF002513"; // Seu token fixado

// 3. ROTA DE VERIFICAÇÃO (GET)
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

// 4. ROTA DE RECEBIMENTO (POST)
app.post('/', (req, res) => {
  // Responde imediatamente ao WhatsApp (Obrigatório)
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;

    // Se for uma mensagem real de texto
    if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const msg = body.entry[0].changes[0].value.messages[0];
      const de = msg.from;
      const texto = msg.text?.body || "Mensagem sem texto";

      console.log(`\n✅ MENSAGEM REAL RECEBIDA!`);
      console.log(`De: ${de}`);
      console.log(`Conteúdo: ${texto}`);
      console.log(`-----------------------------------\n`);
    } 
    // Se for apenas status de entrega/leitura
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
  console.log(`CORS habilitado e Token configurado.`);
});

