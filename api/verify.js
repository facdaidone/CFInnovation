import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers['x-session-token'];
  if (!token) return res.status(401).json({ error: 'No token' });

  const role = await kv.get(`session:${token}`);
  if (!role) return res.status(401).json({ error: 'Invalid or expired session' });

  return res.status(200).json({ role });
}
