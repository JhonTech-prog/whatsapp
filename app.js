const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({ origin: true }));
app.use(express.json());
app.set('trust proxy', 1);

let minhasMensagensSalvas = [];
const port = process.env.PORT || 10000;
const verifyToken = "G3rPF002513";

// 1. STATUS DO SERVIDOR
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'Servidor Webhook 2026 Online',
    timestamp: new Date().toLocaleString("pt-BR"),
    memoria: `${minhasMensagensSalvas.length} mensagens arquivadas`
  });
});

// 2. PAINEL DE LEITURA
app.get('/messages', (req, res) => {
  res.status(200).json(minhasMensagensSalvas);
});

// 3. VERIFICAÇÃO COM A META (GET)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ WEBHOOK ATIVO');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// 4. RECEBIMENTO DE MENSAGENS (POST)
app.post('/webhook', (req, res) => {
  // Resposta imediata para a Meta não reenviar o pacote
  res.status(200).send('EVENT_RECEIVED');

  const body = req.body;

  try {
    // A estrutura da Meta sempre vem dentro de entry[0].changes[0]
    if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const value = body.entry[0].changes[0].value;
      const msg = value.messages[0];
      const contact = value.contacts?.[0];

      const novaMensagem = {
        id: msg.id,
        de: msg.from,
        nome: contact?.profile?.name || "Desconhecido",
        texto: msg.text?.body || `[Tipo: ${msg.type}]`,
        tipo: msg.type,
        data: new Date().toLocaleString("pt-BR"),
        timestamp: msg.timestamp // Usando o timestamp original da Meta
      };

      minhasMensagensSalvas.unshift(novaMensagem);
      if (minhasMensagensSalvas.length > 50) minhasMensagensSalvas.pop();

      console.log(`📩 Nova mensagem de ${novaMensagem.nome}: ${novaMensagem.texto}`);
    }
  } catch (err) {
    console.error("❌ Erro no processamento:", err.message);
  }
});

app.listen(port, () => console.log(`🚀 Webhook 2026 rodando na porta ${port}`));

