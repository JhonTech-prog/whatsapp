const express = require('express');
const cors = require('cors'); // <--- Importado primeiro
const app = express();

// 1. O CORS PRECISA SER O PRIMEIRO MIDDLEWARE (Resolução do 403)
app.use(cors()); 
app.options('*', cors()); // Habilita pre-flight para todas as rotas

// 2. HEADERS MANUAIS (Reforço para o WhatsBulk)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});

app.use(express.json());
app.set('trust proxy', 1);

let minhasMensagensSalvas = [];
const port = process.env.PORT || 10000;
const verifyToken = "G3rPF002513";

// Rota para o WhatsBulk ler (GET /messages)
app.get('/messages', (req, res) => {
  console.log("WhatsBulk solicitou mensagens...");
  res.status(200).json(minhasMensagensSalvas);
});

// Verificação do WhatsApp (GET /)
app.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.status(403).send('Erro: Token de verificação inválido');
});

// Recebimento de mensagens (POST /)
app.post('/', (req, res) => {
  res.status(200).send('EVENT_RECEIVED');
  try {
    const body = req.body;
    if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const msg = body.entry[0].changes[0].value.messages[0];
      const novaMensagem = {
        de: msg.from,
        texto: msg.text?.body || "Mídia",
        data: new Date().toLocaleString("pt-BR")
      };
      minhasMensagensSalvas.push(novaMensagem);
      if (minhasMensagensSalvas.length > 50) minhasMensagensSalvas.shift();
      console.log("✅ Mensagem arquivada:", novaMensagem.texto);
    }
  } catch (err) {
    console.log("❌ Erro no processamento:", err.message);
  }
});

app.listen(port, () => {
  console.log(`Servidor 2026 rodando na porta ${port}`);
});
