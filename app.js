const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors()); // Libera o acesso para o WhatsBulk ler
app.use(express.json());
app.set('trust proxy', 1);

// LISTA DE MENSAGENS (Onde os dados ficam guardados)
let minhasMensagensSalvas = [];

const port = process.env.PORT || 10000;
const verifyToken = "G3rPF002513";

// 1. ROTA DE VISUALIZAÇÃO (O WhatsBulk lê aqui)
app.get('/messages', (req, res) => {
  console.log(`Solicitação de leitura: Temos ${minhasMensagensSalvas.length} mensagens na lista.`);
  res.status(200).json(minhasMensagensSalvas);
});

// 2. VERIFICAÇÃO DO WHATSAPP (GET)
app.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === verifyToken) {
    return res.status(200).send(challenge);
  }
  res.status(403).send('Token inválido');
});

// 3. RECEBIMENTO (POST)
app.post('/', (req, res) => {
  res.status(200).send('EVENT_RECEIVED');
  try {
    const body = req.body;
    // Ajuste nos índices [0] para capturar a mensagem corretamente
    if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const msg = body.entry[0].changes[0].value.messages[0];
      
      const novaMensagem = {
        id: msg.id,
        de: msg.from,
        texto: msg.text?.body || "Mídia",
        data: new Date().toLocaleString("pt-BR")
      };

      minhasMensagensSalvas.push(novaMensagem);
      
      // Mantém apenas as últimas 50 para não estourar a memória
      if (minhasMensagensSalvas.length > 50) minhasMensagensSalvas.shift();

      console.log("✅ MENSAGEM ARQUIVADA COM SUCESSO!");
      console.log(`De: ${novaMensagem.de} | Texto: ${novaMensagem.texto}`);
    }
  } catch (err) {
    console.log("❌ Erro ao salvar mensagem:", err.message);
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port} - Pronto para 2026`);
});
