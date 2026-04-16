const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function kvGet(key) {
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  const data = await res.json();
  return data.result;
}

async function kvSet(key, value) {
  const res = await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  });
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers['x-session-token'];
  if (!token) return res.status(401).json({ error: 'No session token' });

  const role = await kvGet(`session:${token}`);
  if (!role || role !== 'editor') return res.status(401).json({ error: 'Not authorized to edit' });

  const { content } = req.body;
  try {
    if (content !== undefined) await kvSet('page:content', JSON.stringify(content));
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('KV save error:', err);
    return res.status(500).json({ error: 'Failed to save' });
  }
}
