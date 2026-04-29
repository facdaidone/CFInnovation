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
  if (!role) return res.status(401).json({ error: 'Invalid or expired session' });

  // GET - load queue
  if (req.method === 'GET') {
    const raw = await kvGet('requests:queue');
    const queue = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
    return res.status(200).json({ queue });
  }

  // POST - update queue — editors only
  if (req.method === 'POST') {
    if (role !== 'editor') return res.status(401).json({ error: 'Editors only' });
    const { action, id, queue: newQueue, status, themes } = req.body;

    const raw = await kvGet('requests:queue');
    let queue = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];

    if (action === 'reorder' && newQueue) {
      queue = newQueue;
    } else if (action === 'status' && id && status) {
      queue = queue.map(r => r.id === id ? { ...r, status } : r);
    } else if (action === 'updateThemes' && id && themes) {
      queue = queue.map(r => r.id === id ? { ...r, themes } : r);
    } else if (action === 'delete' && id) {
      queue = queue.filter(r => r.id !== id);
    }

    await kvSet('requests:queue', JSON.stringify(queue));
    return res.status(200).json({ ok: true, queue });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
