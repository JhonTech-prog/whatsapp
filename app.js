const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.set('trust proxy', 1);

let minhasMensagensSalvas = [];
const port = process.env.PORT || 10000;
const verifyToken = "G3rPF002513";

// Rota de Mensagens - AJUSTADA para o padrão do WhatsBulk
app.get('/messages', (req, res) => {
  res.status(200).json(minhasMensagensSalvas);
});

// Rota Raiz - CORRIGIDA (Não dá mais 403 sem motivo)
app.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Só valida o token se for uma tentativa de "subscribe" da Meta
  if (mode === 'subscribe') {
    if (token === verifyToken) {
      return res.status(200).send(challenge);
    } else {
      return res.status(403).send('Token Inválido');
    }
  }
  
  // Resposta padrão para o navegador ou WhatsBulk não dar erro 403
  res.status(200).send('Servidor Ativo! Use a rota /messages no WhatsBulk.');
});

// Recebimento de mensagens - NOMES DE CAMPOS AJUSTADOS
app.post('/', (req, res) => {
  res.status(200).send('EVENT_RECEIVED');
  try {
    const body = req.body;
    if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const msg = body.entry[0].changes[0].value.messages[0];
      const novaMensagem = {
        id: msg.id || Date.now().toString(),
        from: msg.from, // WhatsBulk espera 'from'
        text: msg.text?.body || "Mídia/Outro", // WhatsBulk espera 'text'
        timestamp: new Date().toISOString(), // WhatsBulk espera 'timestamp' ISO
        unread: true
      };
      minhasMensagensSalvas.push(novaMensagem);
      if (minhasMensagensSalvas.length > 100) minhasMensagensSalvas.shift();
      console.log("✅ Mensagem recebida de:", novaMensagem.from);
    }
  } catch (err) {
    console.log("❌ Erro:", err.message);
  }
});

app.listen(port, () => console.log(`Rodando na porta ${port}`));
