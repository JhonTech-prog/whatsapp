const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));

// 1. CONFIGURAÇÃO MONGOOSE
mongoose.set('strictQuery', true);
const mongoURI = process.env.MONGO_URI || "mongodb+srv://Pratofit:002513@cluster0.ebf9rjf.mongodb.net/?appName=Cluster0";
mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB Conectado"))
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

// --- FUNÇÕES DE MÍDIA CORRIGIDAS (BARRA ADICIONADA) ---

async function getMediaUrl(mediaId) {
    const tokenRaw = process.env.META_ACCESS_TOKEN || "";
    const tokenLimpo = tokenRaw.replace(/["']/g, "").trim();

    try {
        const idLimpo = String(mediaId).replace(/[^0-9]/g, '');
        // CORREÇÃO: Adicionada a URL correta com https://, versão da API e barra
        const urlFinal = "https://graph.facebook.com/v19.0/" + idLimpo;
        
        console.log("🔗 Buscando URL correta em: " + urlFinal);

        const response = await fetch(urlFinal, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + tokenLimpo }
        });

        const data = await response.json();
        if (data && data.url) return data.url;
        
        console.error("❌ Resposta da Meta sem URL:", data);
        return null;
    } catch (error) {
        console.error("❌ Erro na montagem da URL:", error.message);
        return null;
    }
}

async function downloadMediaAsBase64(url) {
    const tokenRaw = process.env.META_ACCESS_TOKEN || "";
    const tokenLimpo = tokenRaw.replace(/["']/g, "").trim();

    try {
	const response = await fetch(url, {
		method: 'GET',
		headers: { 'Authorization': 'Bearer ' + tokenLimpo }
	});

// Endpoint para buscar contatos únicos a partir das mensagens
app.get('/contacts-from-messages', async (req, res) => {
  try {
    const contatos = await Mensagem.aggregate([
      {
        $group: {
          _id: "$telefone",
          nome: { $first: "$nome" }
        }
      },
      {
        $project: {
          _id: 0,
          phone: "$_id",
          name: "$nome"
        }
      }
    ]);
    res.json(contatos);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar contatos' });
  }
});

        const arrayBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        return "data:" + contentType + ";base64," + base64;
    } catch (error) {
        console.error("❌ Erro no download do binário:", error.message);
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
    const body = req.body;
    if (!body.entry || !body.entry[0].changes) return;

    const value = body.entry[0].changes[0].value;
    if (!value.messages) return;

    const messageData = value.messages[0];
    const contact = value.contacts ? value.contacts[0] : null;
    
    let conteudoParaSalvar = '';
    const tipo = messageData.type;
    const nomeContato = contact ? contact.profile.name : "Desconhecido";

    if (tipo === 'text') {
        conteudoParaSalvar = messageData.text.body;
    } 
    else if (tipo === 'image' || tipo === 'audio' || tipo === 'voice') {
        const midiaObj = messageData[tipo] || messageData.voice || messageData.audio;
        const midiaId = midiaObj ? midiaObj.id : null;
        
        if (midiaId) {
            const urlTemp = await getMediaUrl(midiaId);
            if (urlTemp) {
                const base64 = await downloadMediaAsBase64(urlTemp);
                conteudoParaSalvar = base64 || "[Erro na conversão Base64]";
            } else {
                conteudoParaSalvar = "[Erro ao obter URL temporária da Meta]";
            }
        }
    }

    const novaMensagem = new Mensagem({
      idMeta: messageData.id,
      telefone: messageData.from,
      nome: nomeContato,
      texto: conteudoParaSalvar || "[Mídia não processada]",
      tipo: tipo,
      timestamp: messageData.timestamp
    });

    await novaMensagem.save();
    console.log("💾 SALVO COM SUCESSO: " + tipo + " de " + nomeContato);

  } catch (err) {
    console.error("❌ Erro Geral Webhook:", err.message);
  }
});

app.get('/messages', async (req, res) => {
    try {
      const mensagens = await Mensagem.find().sort({ dataRecebimento: -1 }).limit(20);
      res.status(200).json(mensagens);
    } catch (err) {
      res.status(500).send("Erro ao buscar");
    }
});

app.listen(port, () => console.log("🚀 Servidor Online 2026 porta " + port));
