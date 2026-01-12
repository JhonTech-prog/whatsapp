const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// 1. CONFIGURAÇÃO MONGOOSE
mongoose.set('strictQuery', true);
const mongoURI = process.env.MONGO_URI || "mongodb+srv://Pratofit:002513@cluster0.ebf9rjf.mongodb.net/?appName=Cluster0";
mongoose.connect(mongoURI)
  .then(() => console.log("✅ Conectado ao MongoDB Atlas"))
  .catch(err => console.error("❌ Erro MongoDB:", err.message));

// 2. MODELO DE DADOS
const MensagemSchema = new mongoose.Schema({
  idMeta: String,
  telefone: String,
  nome: String,
  texto: String, 
  tipo: String,
  timestamp: Number,
  dataRecebimento: { type: Date, default: Date.now }
});
const Mensagem = mongoose.model('Mensagem', MensagemSchema);

const port = process.env.PORT || 10000;
const verifyToken = "G3rPF002513";
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN; 

// --- FUNÇÃO PARA PEGAR MÍDIA (CORREÇÃO DE URL 2026) ---
async function getMediaUrl(mediaId) {
    if (!META_ACCESS_TOKEN) {
        console.error("❌ Erro: META_ACCESS_TOKEN não configurado.");
        return null;
    }
    try {
        // Corrigido: https:// + v21.0 + Template String correta
        const response = await axios.get(`graph.facebook.com{mediaId}`, {
            headers: { 'Authorization': `Bearer ${META_ACCESS_TOKEN}` }
        });
        return response.data.url;
    } catch (error) {
        console.error("❌ Erro na API da Meta:", error.response?.data || error.message);
        return null;
    }
}

// 3. ROTAS

app.get('/messages', async (req, res) => {
  try {
    const mensagens = await Mensagem.find().sort({ dataRecebimento: -1 }).limit(100);
    res.status(200).json(mensagens);
  } catch (err) {
    res.status(500).send("Erro ao buscar mensagens");
  }
});

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === verifyToken) return res.status(200).send(challenge);
  res.status(403).send('Token inválido');
});

app.post('/webhook', async (req, res) => {
  res.status(200).send('EVENT_RECEIVED');

  try {
    // ACESSO SEGURO AOS ARRAYS [0] - CORRIGIDO
    const entry = req.body.entry && req.body.entry[0];
    const changes = entry && entry.changes && entry.changes[0];
    const value = changes && changes.value;
    const messageData = value && value.messages && value.messages[0];
    const contact = value && value.contacts && value.contacts[0];

    if (messageData) {
      let textoConteudo = '';
      const tipo = messageData.type;
      const nomeContato = contact?.profile?.name || "Desconhecido";

      if (tipo === 'text') {
          textoConteudo = messageData.text.body;
      } 
      else if (tipo === 'image') {
          const url = await getMediaUrl(messageData.image.id);
          textoConteudo = url || '[Link da imagem expirado/erro]';
      } 
      else if (tipo === 'audio' || tipo === 'voice') {
          const mediaId = messageData.audio ? messageData.audio.id : (messageData.voice ? messageData.voice.id : null); 
          if (mediaId) {
            const url = await getMediaUrl(mediaId);
            textoConteudo = url || '[Link do áudio expirado/erro]';
          } else {
            textoConteudo = '[ID de áudio não encontrado]';
          }
      }
      else {
          textoConteudo = `[Mídia: ${tipo}]`;
      }

      const novaMensagem = new Mensagem({
        idMeta: messageData.id,
        telefone: messageData.from,
        nome: nomeContato,
        texto: textoConteudo,
        tipo: tipo,
        timestamp: messageData.timestamp
      });

      await novaMensagem.save();
      console.log(`💾 Salvo: ${tipo} de ${nomeContato}`);
    }
  } catch (err) {
    console.error("❌ Erro no webhook:", err);
  }
});

app.listen(port, () => {
  console.log(`🚀 Servidor rodando na porta: ${port}`);
});
