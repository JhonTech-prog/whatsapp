const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// 1. CONFIGURAÇÃO MONGOOSE
mongoose.set('strictQuery', true);
// DICA: Em produção, coloque esta string no process.env.MONGO_URI
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

// --- FUNÇÃO CORRIGIDA: PEGAR URL DA MÍDIA ---
async function getMediaUrl(mediaId) {
    if (!META_ACCESS_TOKEN) {
        console.error("❌ Erro: META_ACCESS_TOKEN não configurado.");
        return null;
    }
    try {
        // CORREÇÃO: URL completa com https e versão v21.0 (padrão em 2026)
        const response = await axios.get(`graph.facebook.com{mediaId}`, {
            headers: { 'Authorization': `Bearer ${META_ACCESS_TOKEN}` }
        });
        
        // Retorna a URL temporária para download
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

// Verificação do Webhook (Configuração no Painel da Meta)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === verifyToken) return res.status(200).send(challenge);
  res.status(403).send('Token inválido');
});

// Recebimento de Mensagens
app.post('/webhook', async (req, res) => {
  // Resposta imediata para a Meta (obrigatório)
  res.status(200).send('EVENT_RECEIVED');

  try {
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
          // Busca URL da imagem usando o ID recebido
          const url = await getMediaUrl(messageData.image.id);
          textoConteudo = url || '[Erro ao buscar URL da imagem]';
      } 
      else if (tipo === 'audio' || tipo === 'voice') {
          // Captura ID independente se vier como objeto audio ou voice
          const mediaId = messageData.audio?.id || messageData.voice?.id; 
          const url = await getMediaUrl(mediaId);
          textoConteudo = url || '[Erro ao buscar URL do áudio]';
      }
      else {
          textoConteudo = `[Mídia tipo: ${tipo}]`;
      }

      const novaMensagem = new Mensagem({
        idMeta: messageData.id,
        telefone: messageData.from,
        nome: contact ? contact.profile.name : "Usuário WhatsApp",
        texto: textoConteudo,
        tipo: tipo,
        timestamp: messageData.timestamp
      });

      await novaMensagem.save();
      console.log(`💾 Mensagem salva! Tipo: ${tipo} | Remetente: ${novaMensagem.nome}`);
    }
  } catch (err) {
    console.error("❌ Erro no processamento do Webhook:", err.message);
  }
});

app.listen(port, () => {
  console.log(`🚀 Servidor 2026 Ativo na porta: ${port}`);
});
