export default function handler(req, res) {
  res.status(503).json({ error: 'Community votes are not currently enabled.' });
}
