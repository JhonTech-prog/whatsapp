const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose'); // 1. Importa o Mongoose
const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// 2. CONEXÃO COM MONGODB (SUA STRING DEFINITIVA)
// Lembre-se de substituir <password> pela sua senha real '002513' na URL, ou usar variáveis de ambiente no Render!
const mongoURI = "mongodb+srv://pratofit:002513@cluster0.ebf9rjf.mongodb.net/?appName=Cluster0";

mongoose.connect(mongoURI)
  .then(() => console.log("✅ Conectado ao MongoDB Atlas"))
  .catch(err => console.error("❌ Erro ao conectar ao MongoDB:", err));

// 3. DEFINIÇÃO DO MODELO (O "esqueleto" da mensagem)
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

// ROTA DE LEITURA (Busca tudo o que está no banco)
app.get('/messages', async (req, res) => {
  try {
    // Busca as últimas 100 mensagens ordenadas pela mais recente
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

// RECEBIMENTO E SALVAMENTO
app.post('/webhook', async (req, res) => {
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;
    // Uso de Optional Chaining (?.) para um código mais seguro em 2026
    if (body.entry?.[0].changes?.[0].value.messages?.[0]) {
      const value = body.entry[0].changes[0].value;
      const msg = value.messages[0];
      const contact = value.contacts?.[0];

      // 4. SALVANDO NO BANCO DE DADOS
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
        // Log de eventos de status (lido, entregue, etc) que estamos ignorando salvar
        console.log("ℹ️ Evento recebido (Status/Outros), ignorando processamento.");
    }
  } catch (err) {
    console.error("❌ Erro ao processar/salvar:", err.message);
  }
});

app.listen(port, () => console.log(`🚀 Servidor 2026 com Banco de Dados na porta ${port}`));


