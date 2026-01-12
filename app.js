const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// 1. CONEXÃO MONGODB
mongoose.set('strictQuery', true);
const mongoURI = "mongodb+srv://Pratofit:002513@cluster0.ebf9rjf.mongodb.net/?appName=Cluster0";
mongoose.connect(mongoURI).then(() => console.log("✅ MongoDB Conectado"));

// 2. MODELO
const Mensagem = mongoose.model('Mensagem', new mongoose.Schema({
  idMeta: String,
  telefone: String,
  nome: String,
  texto: String, 
  tipo: String,
  timestamp: Number,
  dataRecebimento: { type: Date, default: Date.now }
}));

const port = process.env.PORT || 10000;
const verifyToken = "G3rPF002513";
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN; 

// --- FUNÇÃO DE MÍDIA (AGORA COM A VERSÃO v24.0) ---
async function getMediaUrl(mediaId) {
    if (!META_ACCESS_TOKEN) {
        console.error("❌ Erro: META_ACCESS_TOKEN não encontrado nas variáveis de ambiente.");
        return null;
    }
    try {
        // A URL PRECISA DE HTTPS:// E DA VERSÃO CORRETA (v24.0)
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
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === verifyToken) {
    return res.status(200).send(req.query['hub.challenge']);
  }
  res.status(403).send('Token inválido');
});

app.post('/webhook', async (req, res) => {
  res.status(200).send('EVENT_RECEIVED');
  try {
    const entry = req.body.entry?.;
    const changes = entry?.changes?.;
    const value = changes?.value;
    const msg = value?.messages?.;
    const contact = value?.contacts?.;

    if (msg) {
      let textoConteudo = '';
      
      if (msg.type === 'text') {
        textoConteudo = msg.text.body;
      } 
      else if (msg.type === 'image') {
        const url = await getMediaUrl(msg.image.id);
        textoConteudo = url || '[Link da imagem não disponível]';
      } 
      else if (msg.type === 'audio' || msg.type === 'voice') {
        const mediaId = msg.audio?.id || msg.voice?.id;
        const url = await getMediaUrl(mediaId);
        textoConteudo = url || '[Link do áudio não disponível]';
      }

      const novaMensagem = new Mensagem({
        idMeta: msg.id,
        telefone: msg.from,
        nome: contact?.profile?.name || "Desconhecido",
        texto: textoConteudo,
        tipo: msg.type,
        timestamp: msg.timestamp
      });

      await novaMensagem.save();
      console.log(`💾 Salvo: ${msg.type} de ${novaMensagem.nome}`);
    }
  } catch (err) {
    console.error("❌ Erro no Webhook:", err.message);
  }
});

app.listen(port, () => console.log(`🚀 Servidor rodando na porta ${port}`));

