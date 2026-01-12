const express = require('express');
const cors = require('cors');
const app = express();

// 1. CONFIGURAÇÕES INICIAIS E CORS (Libera para o seu painel ver as mensagens)
app.use(cors({ origin: true })); // Libera acesso de qualquer front-end (incluindo seu site)
app.use(express.json());
app.set('trust proxy', 1);

// Memória temporária - Atenção: se o Render reiniciar ou você fizer Deploy, ela zera.
let minhasMensagensSalvas = [];

const port = process.env.PORT || 10000;
const verifyToken = "G3rPF002513"; // Seu token fixo

// 2. ROTA DE LEITURA (O seu painel/WhatsBulk lê aqui de segundo em segundo)
// Esta rota está correta e não exige o token da Meta.
app.get('/messages', (req, res) => {
  res.status(200).json(minhasMensagensSalvas);
});

// 3. ROTA DE VERIFICAÇÃO DO WHATSAPP (GET /webhook)
// O CAMINHO FOI ALTERADO DE '/' PARA '/webhook'
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFICADO COM SUCESSO! 🎉');
    return res.status(200).send(challenge);
  }
  res.status(403).send('Token de verificação inválido');
});

// 4. ROTA DE RECEBIMENTO DE MENSAGENS (POST /webhook)
// O CAMINHO FOI ALTERADO DE '/' PARA '/webhook'
app.post('/webhook', (req, res) => {
  // Resposta obrigatória e imediata para a Meta
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;

    // VERIFICAÇÃO PROFUNDA DO JSON (Onde a mensagem se esconde)
    if (body.entry && 
        body.entry[0].changes && 
        body.entry[0].changes[0].value.messages && 
        body.entry[0].changes[0].value.messages[0]) {
      
      const msg = body.entry[0].changes[0].value.messages[0];
      
      const novaMensagem = {
        id: msg.id,
        de: msg.from,
        texto: msg.text?.body || "Mensagem de mídia (imagem/áudio/vídeo)",
        data: new Date().toLocaleString("pt-BR")
      };

      // Adiciona na lista para o painel visualizar
      minhasMensagensSalvas.push(novaMensagem);

      // Mantém apenas as últimas 50 mensagens na memória
      if (minhasMensagensSalvas.length > 50) minhasMensagensSalvas.shift();

      console.log(`✅ MENSAGEM ARQUIVADA: [${novaMensagem.de}] disse: ${novaMensagem.texto}`);
    } else {
      // Isso captura eventos de status (enviado, lido, entregue) que não são mensagens
      console.log("ℹ️ Evento recebido, mas não contém nova mensagem de texto.");
    }
  } catch (err) {
    console.log("❌ Erro ao processar o POST do WhatsApp:", err.message);
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor Webhook 2026 Ativo na porta ${port}`);
});
