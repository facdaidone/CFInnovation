import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers['x-session-token'];
  if (!token) return res.status(401).json({ error: 'No session token' });

  const role = await kv.get(`session:${token}`);
  if (!role || role !== 'editor') {
    return res.status(401).json({ error: 'Not authorized to edit' });
  }

  const { content } = req.body;

  try {
    if (content !== undefined) {
      await kv.set('page:content', JSON.stringify(content));
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('KV save error:', err);
    return res.status(500).json({ error: 'Failed to save' });
  }
}
