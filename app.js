const express = require('express');
const cors = require = require('cors');
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
        body.entry.changes && 
        body.entry.changes.value.messages && 
        body.entry.changes.value.messages) {
      
      const msg = body.entry.changes.value.messages;
      const contacts = body.entry.changes.value.contacts;
      const nomeRemetente = contacts ? contacts.profile.name : "Desconhecido";
      
      // Lógica aprimorada para o conteúdo da mensagem:
      let conteudoTexto = "Tipo de mensagem desconhecido";
      if (msg.text) {
          conteudoTexto = msg.text.body;
      } else if (msg.type === "image") {
          conteudoTexto = "[Imagem]";
      } else if (msg.type === "audio") {
          conteudoTexto = "[Áudio]";
      } else if (msg.type === "video") {
          conteudoTexto = "[Vídeo]";
      } else if (msg.type === "sticker") {
          conteudoTexto = "[Figurinha]";
      }

      const novaMensagem = {
        id: msg.id,
        de: msg.from,
        telefone: msg.from,
        wa_id: msg.from,
        nome: nomeRemetente,
        texto: conteudoTexto, // <-- AGORA COM O CONTEÚDO CORRETO
        tipo: msg.type,
        data: new Date().toLocaleString("pt-BR"),
        timestamp: Math.floor(Date.now() / 1000)
      };

      minhasMensagensSalvas.unshift(novaMensagem);

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


