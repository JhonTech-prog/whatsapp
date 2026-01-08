const express = require('express');
const cors = require('cors');
const app = express();

// 1. CONFIGURAÇÕES OBRIGATÓRIAS PARA O RENDER
app.set('trust proxy', 1); 

// 2. CONFIGURAÇÃO DE CORS (Blindagem contra Erro 403)
app.use(cors({ origin: '*' }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  // Resolve o problema de "pre-flight" do navegador
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Memória temporária para as mensagens (limpa se o Render reiniciar)
let minhasMensagensSalvas = [];

const port = process.env.PORT || 10000;
const verifyToken = "G3rPF002513";

// 3. ROTA DE MENSAGENS (Para o seu painel ou WhatsBulk ler)
app.get('/messages', (req, res) => {
  res.status(200).json(minhasMensagensSalvas);
});

// 4. VERIFICAÇÃO DO WHATSAPP (GET na raiz)
app.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFICADO!');
    return res.status(200).send(challenge);
  }
  return res.status(403).send('Token Inválido');
});

// 5. RECEBIMENTO DE MENSAGENS (POST na raiz)
app.post('/', (req, res) => {
  res.status(200).send('EVENT_RECEIVED');
  try {
    const body = req.body;
    if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const msg = body.entry[0].changes[0].value.messages[0];
      const novaMensagem = {
        de: msg.from,
        texto: msg.text?.body || "Mídia recebida",
        data: new Date().toLocaleString("pt-BR")
      };
      minhasMensagensSalvas.push(novaMensagem);
      if (minhasMensagensSalvas.length > 50) minhasMensagensSalvas.shift();
      console.log("✅ Mensagem arquivada:", novaMensagem.texto);
    }
  } catch (err) {
    console.log("❌ Erro ao processar:", err.message);
  }
});

app.listen(port, () => {
  console.log(`Servidor 2026 rodando na porta ${port}`);
});
