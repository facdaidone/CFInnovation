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
  const res = await fetch(`${KV_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['SET', key, typeof value === 'string' ? value : JSON.stringify(value)]]),
  });
  return res.json();
}

export default async function handler(req, res) {
  const token = req.headers['x-session-token'];
  if (!token) return res.status(401).json({ error: 'No session token' });

  const role = await kvGet(`session:${token}`);
  if (!role || role !== 'editor') return res.status(401).json({ error: 'Editors only' });

  if (req.method === 'GET') {
    const raw = await kvGet('admin:settings');
    const settings = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : { notifyEmails: [] };
    return res.status(200).json({ settings });
  }

  if (req.method === 'POST') {
    const { settings } = req.body;
    await kvSet('admin:settings', JSON.stringify(settings));
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
