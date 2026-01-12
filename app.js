const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));

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

// --- FUNÇÃO GETMEDIAURL REVISADA (BLINDADA PARA NODE 22) ---
async function getMediaUrl(mediaId) {
    // 1. Limpeza rigorosa do Token (remove aspas e espaços acidentais)
    const tokenRaw = process.env.META_ACCESS_TOKEN || "";
    const tokenLimpo = tokenRaw.replace(/["']/g, "").trim();

    if (!tokenLimpo) {
        console.error("❌ Erro: META_ACCESS_TOKEN não configurado no Render.");
        return null;
    }

    try {
        // 2. Limpeza do ID (remove qualquer coisa que não seja número ou letra)
        const idLimpo = String(mediaId).replace(/[^a-zA-Z0-9]/g, '');
        
        // 3. Construção da URL manual para evitar erros de interpolação
        const urlFinal = "graph.facebook.com" + idLimpo;
        
        console.log("🔗 Solicitando ID: " + idLimpo);

        const response = await axios({
            method: 'get',
            url: urlFinal,
            headers: { 
                'Authorization': 'Bearer ' + tokenLimpo,
                'Accept': 'application/json'
            }
        });

        return response.data.url;
    } catch (error) {
        console.error("❌ Erro na API da Meta (v24.0):", error.message);
        if (error.response) console.error("Detalhes da Meta:", error.response.data);
        return null;
    }
}

// --- FUNÇÃO DOWNLOAD (SALVAMENTO PERMANENTE) ---
async function downloadMediaAsBase64(url) {
    const tokenRaw = process.env.META_ACCESS_TOKEN || "";
    const tokenLimpo = tokenRaw.replace(/["']/g, "").trim();

    try {
        const response = await axios.get(url, {
            headers: { 'Authorization': 'Bearer ' + tokenLimpo },
            responseType: 'arraybuffer'
        });
        const contentType = response.headers['content-type'];
        const base64 = Buffer.from(response.data, 'binary').toString('base64');
        return `data:${contentType};base64,${base64}`;
    } catch (error) {
        console.error("❌ Erro no download do arquivo:", error.message);
        return null;
    }
}

// 3. ROTAS
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
          
          const urlTemporaria = await getMediaUrl(midiaId);
          if (urlTemporaria) {
              const base64Data = await downloadMediaAsBase64(urlTemporaria);
              conteudoParaSalvar = base64Data || `[Erro ao converter ${tipo}]`;
          } else {
              conteudoParaSalvar = `[Erro na URL da Meta para ${tipo}]`;
          }
      } else {
          conteudoParaSalvar = `[Mídia: ${tipo}]`;
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
    console.error("❌ Erro Geral Webhook:", err);
  }
});

app.get('/messages', async (req, res) => {
    try {
      const mensagens = await Mensagem.find().sort({ dataRecebimento: -1 }).limit(50);
      res.status(200).json(mensagens);
    } catch (err) {
      res.status(500).send("Erro ao buscar");
    }
});

app.listen(port, () => console.log(`🚀 Servidor Ativo v24.0 | Porta: ${port}`));
