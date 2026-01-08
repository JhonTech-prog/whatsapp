const express = require('express');
const cors = require('cors'); 
const app = express();

// Ativa o CORS para o WhatsBulk e outras ferramentas
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

let minhasMensagensSalvas = [];
const port = process.env.PORT || 10000;
const verifyToken = "G3rPF002513";

// Rota para o WhatsBulk ler as mensagens
app.get('/messages', (req, res) => {
  res.json(minhasMensagensSalvas);
});

// Verificação do Webhook (GET)
app.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// Recebimento de mensagens (POST)
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
    console.log("❌ Erro:", err.message);
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port} em 2026`);
});
