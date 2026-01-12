const express = require('express');
const cors = require('cors');
const app = express();

// 1. CONFIGURAÇÕES INICIAIS
app.use(cors({ origin: true }));
app.use(express.json());
app.set('trust proxy', 1);

let minhasMensagensSalvas = [];

const port = process.env.PORT || 10000;
const verifyToken = "G3rPF002513"; // Certifique-se que este é o token no painel da Meta

// 2. ROTA PRINCIPAL (Status)
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'Servidor Webhook 2026 Online',
    timestamp: new Date().toLocaleString("pt-BR"),
    memoria_mensagens: `${minhasMensagensSalvas.length} mensagens arquivadas`
  });
});

// 3. ROTA DE LEITURA (Para o seu Front-end)
app.get('/messages', (req, res) => {
  res.status(200).json(minhasMensagensSalvas);
});

// 4. VERIFICAÇÃO DO WHATSAPP (Aperto de mão)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ WEBHOOK VERIFICADO COM SUCESSO!');
    return res.status(200).send(challenge);
  }
  res.status(403).send('Token inválido');
});

// 5. RECEBIMENTO DE MENSAGENS (Onde o erro ocorria)
app.post('/webhook', (req, res) => {
  // Notifica a Meta que recebemos os dados (evita reenvios infinitos)
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;

    // A estrutura correta da Meta exige acessar o índice [0] dos arrays
    if (body.entry && 
        body.entry[0].changes && 
        body.entry[0].changes[0].value.messages && 
        body.entry[0].changes[0].value.messages[0]) {
      
      const value = body.entry[0].changes[0].value;
      const msg = value.messages[0];
      const contact = value.contacts ? value.contacts[0] : null;
      
      const nomeRemetente = contact ? contact.profile.name : "Desconhecido";
      let conteudoTexto = msg.text ? msg.text.body : `[Tipo: ${msg.type}]`;

      const novaMensagem = {
        id: msg.id,
        de: msg.from,
        telefone: msg.from,
        nome: nomeRemetente,
        texto: conteudoTexto,
        tipo: msg.type,
        data: new Date().toLocaleString("pt-BR"),
        timestamp: msg.timestamp || Math.floor(Date.now() / 1000)
      };

      // Adiciona ao topo da lista
      minhasMensagensSalvas.unshift(novaMensagem);

      // Mantém apenas as últimas 50 para não estourar a memória do Render
      if (minhasMensagensSalvas.length > 50) minhasMensagensSalvas.pop();

      console.log(`📩 MENSAGEM DE: ${nomeRemetente} - CONTEÚDO: ${conteudoTexto}`);
    } else {
      // Ignora atualizações de status (lido, entregue, etc)
      console.log("ℹ️ Evento recebido (Status/Outros), ignorando processamento.");
    }
  } catch (err) {
    console.error("❌ Erro ao processar o Webhook:", err.message);
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`🚀 Servidor Webhook 2026 Ativo na porta ${port}`);
});
