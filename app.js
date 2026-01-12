const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// 1. CONFIGURAÇÃO MONGOOSE
mongoose.set('strictQuery', true);
const mongoURI = "mongodb+srv://Pratofit:002513@cluster0.ebf9rjf.mongodb.net/?appName=Cluster0";
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

// --- FUNÇÃO CORRIGIDA PARA PEGAR MÍDIA ---
async function getMediaUrl(mediaId) {
    if (!META_ACCESS_TOKEN) {
        console.error("❌ Erro: META_ACCESS_TOKEN não configurado nas variáveis de ambiente.");
        return null;
    }
    try {
        // Em 2026, usamos a v21.0 ou v22.0 da Graph API
        const response = await axios.get(`graph.facebook.com{mediaId}`, {
            headers: { 'Authorization': `Bearer ${META_ACCESS_TOKEN}` }
        });
        return response.data.url;
    } catch (error) {
        console.error("❌ Erro na API da Meta ao buscar mídia:", error.response?.data || error.message);
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
    // CORREÇÃO FINAL DA SINTAXE: Usando if simples para garantir compatibilidade total
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messageData = value?.messages?.[0];
    const contact = value?.contacts?.[0];

    if (messageData) {
      
      let textoConteudo = '';
      const tipo = messageData.type;

      if (tipo === 'text') {
          textoConteudo = messageData.text.body;
      } 
      else if (tipo === 'image') {
          const url = await getMediaUrl(messageData.image.id);
          textoConteudo = url || '[Link da Imagem Expirado ou Erro]';
      } 
      else if (tipo === 'audio' || tipo === 'voice') {
          // Acessa .audio.id ou .voice.id
          const mediaId = messageData.audio?.id || messageData.voice?.id; 
          const url = await getMediaUrl(mediaId);
          textoConteudo = url || '[Link do Áudio Expirado ou Erro]';
      }
      else {
          textoConteudo = `[Mídia do tipo: ${tipo}]`;
      }

      const novaMensagem = new Mensagem({
        idMeta: messageData.id,
        telefone: messageData.from,
        nome: contact ? contact.profile.name : "Desconhecido",
        texto: textoConteudo,
        tipo: tipo,
        timestamp: messageData.timestamp
      });

      await novaMensagem.save();
      console.log(`💾 Salvo: ${tipo} de ${novaMensagem.nome}`);
    }
  } catch (err) {
    console.error("❌ Erro no processamento:", err);
  }
});

app.listen(port, () => {
  console.log(`🚀 Servidor rodando na porta: ${port}`);
});
