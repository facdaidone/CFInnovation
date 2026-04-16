const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function kvGet(key) {
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  const data = await res.json();
  return data.result;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers['x-session-token'];
  if (!token) return res.status(401).json({ error: 'No session token' });

  const role = await kvGet(`session:${token}`);
  if (!role) return res.status(401).json({ error: 'Invalid or expired session' });

  try {
    const raw = await kvGet('page:content');
    const content = raw ? JSON.parse(raw) : null;
    return res.status(200).json({ content, role });
  } catch (err) {
    console.error('KV load error:', err);
    return res.status(500).json({ error: 'Failed to load' });
  }
}
