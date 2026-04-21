export function requireToken(req, res, next) {
  const expected = process.env.API_TOKEN ?? '';
  if (!expected) return res.status(500).json({ ok: false, error: 'API_TOKEN not configured' });

  const h = req.headers.authorization ?? '';
  const token = h.startsWith('Bearer ') ? h.slice('Bearer '.length).trim() : '';
  if (!token || token !== expected) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  return next();
}

