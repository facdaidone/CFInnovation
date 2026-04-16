import { kv } from '@vercel/kv';

const EDIT_PASSWORD = process.env.EDIT_PASSWORD || 'changeme';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password, content } = req.body;

  if (!password || password !== EDIT_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }

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
