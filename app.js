const express = require('express');
const cors = require('cors');
const app = express();

// 1. CONFIGURAÇÕES INICIAIS E CORS
app.use(cors({ origin: true }));
app.use(express.json());
app.set('trust proxy', 1);

let minhasMensagensSalvas = [];

const port = process.env.PORT || 10000;
const verifyToken = "G3rPF002513";

// 2. ROTA PRINCIPAL (Para não dar "Cannot GET /")
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'Servidor Webhook 2026 Online',
    rotas_disponiveis: {
      mensagens: '/messages',
      webhook_meta: '/webhook'
    },
    memoria_mensagens: `${minhasMensagensSalvas.length} mensagens arquivadas`
  });
});

// 3. ROTA DE LEITURA (O seu painel/WhatsBulk lê aqui)
app.get('/messages', (req, res) => {
  res.status(200).json(minhasMensagensSalvas);
});

// 4. ROTA DE VERIFICAÇÃO DO WHATSAPP (GET /webhook)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFICADO COM SUCESSO! 🎉');
    return res.status(200).send(challenge);
  }
  res.status(403).send('Token de verificação inválido');
});

// 5. ROTA DE RECEBIMENTO DE MENSAGENS (POST /webhook)
app.post('/webhook', (req, res) => {
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;

    if (body.entry && body.entry.changes && body.entry.changes.value.messages && body.entry.changes.value.messages) {
      const msg = body.entry.changes.value.messages;
      
      const novaMensagem = {
        id: msg.id,
        de: msg.from,
        texto: msg.text?.body || "Mensagem de mídia (imagem/áudio/vídeo)",
        data: new Date().toLocaleString("pt-BR")
      };

      minhasMensagensSalvas.push(novaMensagem);

      if (minhasMensagensSalvas.length > 50) minhasMensagensSalvas.shift();

      console.log(`✅ MENSAGEM ARQUIVADA: [${novaMensagem.de}] disse: ${novaMensagem.texto}`);
    } else {
      console.log("ℹ️ Evento recebido, mas não contém nova mensagem de texto.");
    }
  } catch (err) {
    console.log("❌ Erro ao processar o POST do WhatsApp:", err.message);
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor Webhook 2026 Ativo na porta ${port}`);
});
