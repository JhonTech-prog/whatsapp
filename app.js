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

// 2. ROTA PRINCIPAL (Confirmação de Status)
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'Servidor Webhook 2026 Online',
    timestamp: new Date().toLocaleString("pt-BR"),
    rotas_disponiveis: {
      mensagens: '/messages',
      webhook_meta: '/webhook'
    },
    memoria_mensagens: `${minhasMensagensSalvas.length} mensagens arquivadas`
  });
});

// 3. ROTA DE LEITURA (O seu painel/Front-end lê aqui)
app.get('/messages', (req, res) => {
  res.status(200).json(minhasMensagensSalvas);
});

// 4. ROTA DE VERIFICAÇÃO DO WHATSAPP (Aperto de mão com a Meta)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ WEBHOOK VERIFICADO E ATIVO NA META!');
    return res.status(200).send(challenge);
  }
  res.status(403).send('Token de verificação inválido');
});

// 5. ROTA DE RECEBIMENTO DE MENSAGENS
app.post('/webhook', (req, res) => {
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;

    if (body.entry && 
        body.entry[0].changes && 
        body.entry[0].changes[0].value.messages && 
        body.entry[0].changes[0].value.messages[0]) {
      
      const msg = body.entry[0].changes[0].value.messages[0];
      const contacts = body.entry[0].changes[0].value.contacts;
      const nomeRemetente = contacts ? contacts[0].profile.name : "Desconhecido";
      
      const novaMensagem = {
        id: msg.id,
        de: msg.from,
        telefone: msg.from,      // 🚀 CRUCIAL: O que seu front-end está procurando
        wa_id: msg.from,         // 🚀 Adicional por compatibilidade
        nome: nomeRemetente,
        texto: msg.text ? msg.text.body : "Mídia ou Outro tipo",
        tipo: msg.type,
        data: new Date().toLocaleString("pt-BR"),
        timestamp: Math.floor(Date.now() / 1000) // Formato Unix que muitos front-ends usam
      };

      // Adiciona ao início da lista
      minhasMensagensSalvas.unshift(novaMensagem);

      // Mantém apenas as últimas 50
      if (minhasMensagensSalvas.length > 50) minhasMensagensSalvas.pop();

      console.log(`📩 MENSAGEM RECEBIDA: [${nomeRemetente}] - ${novaMensagem.texto}`);
    } else {
      console.log("ℹ️ Evento de status recebido.");
    }
  } catch (err) {
    console.error("❌ Erro ao processar o Webhook:", err.message);
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`🚀 Servidor Webhook 2026 Ativo na porta ${port}`);
});


