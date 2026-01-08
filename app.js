const express = require('express');
const cors = require('cors');
const app = express();

// 1. CONFIGURAÇÃO DE CORS (O que resolve o erro 403)
app.use(cors({
  origin: '*', // Permite qualquer site (WhatsBulk) acessar
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 2. LEITURA DE JSON
app.use(express.json());

// Memória temporária
let minhasMensagensSalvas = [];

const port = process.env.PORT || 10000;
const verifyToken = "G3rPF002513";

// 3. ROTA QUE O WHATSBULK VAI LER
// Se o erro 403 persistir, tente acessar seu-link.onrender.com no navegador
app.get('/messages', (req, res) => {
  res.status(200).json(minhasMensagensSalvas);
});

// 4. VERIFICAÇÃO DO WHATSAPP (GET RAIZ)
app.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.status(403).send('Token de verificação inválido');
});

// 5. RECEBIMENTO DE MENSAGENS (POST RAIZ)
app.post('/', (req, res) => {
  res.status(200).send('EVENT_RECEIVED');
  try {
    const body = req.body;
    if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const msg = body.entry[0].changes[0].value.messages[0];
      const novaMensagem = {
        de: msg.from,
        texto: msg.text?.body || "Mídia/Emoji",
        data: new Date().toLocaleString("pt-BR")
      };
      minhasMensagensSalvas.push(novaMensagem);
      if (minhasMensagensSalvas.length > 50) minhasMensagensSalvas.shift();
      console.log("✅ Mensagem salva:", novaMensagem.texto);
    }
  } catch (err) {
    console.log("❌ Erro no processamento:", err.message);
  }
});

app.listen(port, () => {
  console.log(`Servidor ON na porta ${port} - CORS liberado`);
});
