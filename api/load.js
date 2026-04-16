import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const content = await kv.get('page:content');
    return res.status(200).json({
      content: content ? JSON.parse(content) : null,
    });
  } catch (err) {
    console.error('KV load error:', err);
    return res.status(500).json({ error: 'Failed to load' });
  }
}
