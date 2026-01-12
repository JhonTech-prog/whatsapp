const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios'); // Importa o Axios

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// 1. CONFIGURAÇÃO MONGOOSE
mongoose.set('strictQuery', true);
const mongoURI = "mongodb+srv://Pratofit:002513@cluster0.ebf9rjf.mongodb.net/?appName=Cluster0";
mongoose.connect(mongoURI)
  .then(() => console.log("✅ Conectado ao MongoDB Atlas com sucesso!"))
  .catch(err => console.error("❌ Erro ao conectar ao MongoDB:", err.message));

// 2. MODELO DE DADOS
// Aumentei o tamanho do campo texto para caber URLs de imagens longas
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
// Variável de ambiente OBRIGATÓRIA no Render
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN; 

// --- FUNÇÃO MÁGICA: PEGAR O LINK DA IMAGEM ---
async function getMediaUrl(mediaId) {
    if (!META_ACCESS_TOKEN) {
        console.error("TOKEN de acesso da Meta não configurado!");
        return null;
    }
    try {
        const response = await axios.get(`graph.facebook.com{mediaId}`, {
            headers: {
                'Authorization': `Bearer ${META_ACCESS_TOKEN}`
            }
        });
        return response.data.url; // Retorna o link temporário
    } catch (error) {
        console.error("Erro ao obter URL da mídia:", error.message);
        return null;
    }
}
// --- FIM DA FUNÇÃO MÁGICA ---


// 3. ROTAS DO SERVIDOR (GET e POST do Webhook)

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

// WEBHOOK: RECEBIMENTO E SALVAMENTO (AGORA COM SUPORTE A IMAGENS)
app.post('/webhook', async (req, res) => {
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;
    if (body.entry?..changes?..value.messages?.[0]) {
      const value = body.entry.changes.value;
      const msg = value.messages[0];
      const contact = value.contacts?.[0];
      
      let textoMensagem = '';
      if (msg.type === 'text') {
          textoMensagem = msg.text.body;
      } else if (msg.type === 'image') {
          // AQUI USAMOS A FUNÇÃO NOVA!
          const imageUrl = await getMediaUrl(msg.image.id);
          textoMensagem = imageUrl || '[Erro ao obter link da imagem]';
      } else {
          textoMensagem = `[Tipo: ${msg.type}]`;
      }

      const novaMensagem = new Mensagem({
        idMeta: msg.id,
        telefone: msg.from,
        nome: contact ? contact.profile.name : "Desconhecido",
        texto: textoMensagem, // Agora salva o link da imagem ou o texto
        tipo: msg.type,
        timestamp: msg.timestamp
      });

      await novaMensagem.save();
      console.log(`💾 Mensagem de ${novaMensagem.nome} salva. Tipo: ${msg.type}`);
    }
  } catch (err) {
    console.error("❌ Erro ao processar/salvar:", err.message);
  }
});

// Inicialização
app.listen(port, () => {
  console.log(`🚀 Servidor 2026 rodando em: https://whatsapp-nrx3.onrender.com`);
});



