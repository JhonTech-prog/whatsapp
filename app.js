const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Configurações Iniciais
app.use(cors({ origin: true }));
app.use(express.json());

// 1. CONFIGURAÇÃO MONGOOSE (Versão 2026)
mongoose.set('strictQuery', true);

// URL atualizada com "Pratofit" (P maiúsculo)
const mongoURI = "mongodb+srv://Pratofit:002513@cluster0.ebf9rjf.mongodb.net/?appName=Cluster0";

// 2. CONEXÃO COM O BANCO DE DADOS
mongoose.connect(mongoURI)
  .then(() => console.log("✅ Conectado ao MongoDB Atlas com sucesso!"))
  .catch(err => {
    console.error("❌ Erro ao conectar ao MongoDB:", err.message);
    console.log("👉 Dica: Se o erro for 'auth failed', redefina a senha 002513 no painel Database Access do Atlas.");
  });

// 3. MODELO DE DADOS
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

// 4. ROTAS DO SERVIDOR

// Listar mensagens salvas
app.get('/messages', async (req, res) => {
  try {
    const mensagens = await Mensagem.find().sort({ dataRecebimento: -1 }).limit(100);
    res.status(200).json(mensagens);
  } catch (err) {
    res.status(500).send("Erro ao buscar mensagens");
  }
});

// Webhook: Validação da Meta (GET)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === verifyToken) return res.status(200).send(challenge);
  res.status(403).send('Token inválido');
});

// Webhook: Receber e Salvar Mensagem (POST)
app.post('/webhook', async (req, res) => {
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;
    // Verificação de segurança para mensagens recebidas
    if (body.entry?.[0].changes?.[0].value.messages?.[0]) {
      const value = body.entry[0].changes[0].value;
      const msg = value.messages[0];
      const contact = value.contacts?.[0];

      const novaMensagem = new Mensagem({
        idMeta: msg.id,
        telefone: msg.from,
        nome: contact ? contact.profile.name : "Desconhecido",
        texto: msg.text ? msg.text.body : `[Evento: ${msg.type}]`,
        tipo: msg.type,
        timestamp: msg.timestamp
      });

      await novaMensagem.save();
      console.log(`💾 Mensagem de ${novaMensagem.nome} salva no banco!`);
    } else {
      console.log("ℹ️ Evento recebido não é uma mensagem nova (Status/Lido).");
    }
  } catch (err) {
    console.error("❌ Erro ao salvar mensagem:", err.message);
  }
});

// Inicialização
app.listen(port, () => {
  console.log(`🚀 Servidor 2026 rodando em: https://whatsapp-nrx3.onrender.com`);
  console.log(`📌 Porta local: ${port}`);
});

