const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// 1. CONFIGURAÇÕES DO MONGOOSE (Ajuste para 2026)
mongoose.set('strictQuery', true); // Remove o DeprecationWarning do seu log

const mongoURI = "mongodb+srv://pratofit:002513@cluster0.ebf9rjf.mongodb.net/?appName=Cluster0";

// 2. CONEXÃO COM O BANCO
mongoose.connect(mongoURI)
  .then(() => console.log("✅ Conectado ao MongoDB Atlas com sucesso!"))
  .catch(err => {
    console.error("❌ Erro ao conectar ao MongoDB:", err.message);
    console.log("👉 Lembrete: Verifique se o IP 0.0.0.0/0 está liberado no Atlas!");
  });

// 3. DEFINIÇÃO DO MODELO
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

// ROTA DE LEITURA
app.get('/messages', async (req, res) => {
  try {
    const mensagens = await Mensagem.find().sort({ dataRecebimento: -1 }).limit(100);
    res.status(200).json(mensagens);
  } catch (err) {
    res.status(500).send("Erro ao buscar mensagens");
  }
});

// WEBHOOK - VALIDAÇÃO (GET)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === verifyToken) return res.status(200).send(challenge);
  res.status(403).send('Token inválido');
});

// WEBHOOK - RECEBIMENTO (POST)
app.post('/webhook', async (req, res) => {
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;
    if (body.entry?.[0].changes?.[0].value.messages?.[0]) {
      const value = body.entry[0].changes[0].value;
      const msg = value.messages[0];
      const contact = value.contacts?.[0];

      const novaMensagem = new Mensagem({
        idMeta: msg.id,
        telefone: msg.from,
        nome: contact ? contact.profile.name : "Desconhecido",
        texto: msg.text ? msg.text.body : `[Tipo: ${msg.type}]`,
        tipo: msg.type,
        timestamp: msg.timestamp
      });

      await novaMensagem.save();
      console.log(`💾 Salvo no Banco: ${novaMensagem.nome}`);
    } else {
        console.log("ℹ️ Evento recebido (Status/Outros), ignorando processamento.");
    }
  } catch (err) {
    console.error("❌ Erro ao processar/salvar:", err.message);
  }
});

app.listen(port, () => console.log(`🚀 Servidor 2026 operando na porta ${port}`));
