module.exports = (req, res) => {
  if (req.method === 'POST') {
    res.status(200).json({ status: 'sucesso' });
  } else {
    res.status(405).send('Método não permitido. Use POST.');
  }
};
