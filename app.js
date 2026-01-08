const express = require('express');
const app = express();

// 1. Permite que o servidor leia JSON
app.use(express.json());

// 2. ESSA É A PARTE QUE RESOLVE O ERRO DA "URL DA PONTE"
// Adiciona o header Access-Control-Allow-Origin: *
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // Permite qualquer site acessar
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  next();
});

// Configurações
const port = process.env.PORT || 10000;
const verifyToken = "G3rPF002513";

// 3. Rota GET (Verificação)
app.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// 4. Rota POST (WhatsApp)
app.post('/', (req, res) => {
  res.status(200).send('EVENT_RECEIVED');
  console.log("Dados recebidos:", JSON.stringify(req.body));
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

