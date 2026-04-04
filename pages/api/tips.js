export default function handler(req, res) {
  res.status(503).json({ error: 'Community tips are not currently enabled.' });
}
