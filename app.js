const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' })); // Aumentado para suportar Base64

// 1. CONFIGURAÇÃO MONGOOSE
mongoose.set('strictQuery', true);
const mongoURI = process.env.MONGO_URI || "mongodb+srv://Pratofit:002513@cluster0.ebf9rjf.mongodb.net/?appName=Cluster0";
mongoose.connect(mongoURI)
  .then(() => console.log("✅ Conectado ao MongoDB Atlas"))
  .catch(err => console.error("❌ Erro MongoDB:", err.message));

// 2. MODELO DE DADOS (Atualizado para suportar mídias longas)
const MensagemSchema = new mongoose.Schema({
  idMeta: String,
  telefone: String,
  nome: String,
  texto: String, // Aqui salvaremos o texto ou o Base64 da mídia
  tipo: String,
  timestamp: Number,
  dataRecebimento: { type: Date, default: Date.now }
});
const Mensagem = mongoose.model('Mensagem', MensagemSchema);

const port = process.env.PORT || 10000;
const verifyToken = "G3rPF002513";
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN; 

// --- FUNÇÃO 1: PEGAR URL DA MÍDIA ---
async function getMediaUrl(mediaId) {
    try {
        const idLimpo = String(mediaId).replace(/\s/g, '');
        const urlFinal = new URL(`graph.facebook.com{idLimpo}`);
        const response = await axios.get(urlFinal.href, {
            headers: { 'Authorization': `Bearer ${META_ACCESS_TOKEN.trim()}` }
        });
        return response.data.url;
    } catch (error) {
        console.error("❌ Erro ao obter URL:", error.message);
        return null;
    }
}

// --- FUNÇÃO 2: BAIXAR E CONVERTER PARA BASE64 (SALVAMENTO PERMANENTE) ---
async function downloadMediaAsBase64(url) {
    try {
        const response = await axios.get(url, {
            headers: { 'Authorization': `Bearer ${META_ACCESS_TOKEN.trim()}` },
            responseType: 'arraybuffer'
        });
        const contentType = response.headers['content-type'];
        const base64 = Buffer.from(response.data, 'binary').toString('base64');
        return `data:${contentType};base64,${base64}`;
    } catch (error) {
        console.error("❌ Erro no download do binário:", error.message);
        return null;
    }
}

// 3. ROTAS WEBHOOK
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
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messageData = value?.messages?.[0];
    const contact = value?.contacts?.[0];

    if (messageData) {
      let conteudoParaSalvar = '';
      const tipo = messageData.type;
      const nomeContato = contact?.profile?.name || "Desconhecido";

      if (tipo === 'text') {
          conteudoParaSalvar = messageData.text.body;
      } 
      else if (tipo === 'image' || tipo === 'audio' || tipo === 'voice') {
          const midiaId = messageData.image?.id || messageData.audio?.id || messageData.voice?.id;
          console.log(`📸 Processando mídia (${tipo})...`);
          
          const urlTemporaria = await getMediaUrl(midiaId);
          if (urlTemporaria) {
              // DOWNLOAD REAL DO ARQUIVO
              const base64Data = await downloadMediaAsBase64(urlTemporaria);
              conteudoParaSalvar = base64Data || `[Erro ao baixar binário da mídia]`;
          } else {
              conteudoParaSalvar = `[Erro ao obter URL da Meta]`;
          }
      } else {
          conteudoParaSalvar = `[Mídia não suportada: ${tipo}]`;
      }

      const novaMensagem = new Mensagem({
        idMeta: messageData.id,
        telefone: messageData.from,
        nome: nomeContato,
        texto: conteudoParaSalvar,
        tipo: tipo,
        timestamp: messageData.timestamp
      });

      await novaMensagem.save();
      console.log(`💾 SALVO PERMANENTE: ${tipo} de ${nomeContato}`);
    }
  } catch (err) {
    console.error("❌ Erro Geral:", err);
  }
});

app.get('/messages', async (req, res) => {
    try {
      const mensagens = await Mensagem.find().sort({ dataRecebimento: -1 }).limit(50);
      res.status(200).json(mensagens);
    } catch (err) {
      res.status(500).send("Erro ao buscar mensagens");
    }
});

app.listen(port, () => console.log(`🚀 Servidor 2026 Ativo | v24.0 | Porta: ${port}`));
