import { kv } from '@vercel/kv';
import { randomBytes } from 'crypto';

const VIEW_PASSWORD = process.env.VIEW_PASSWORD;
const EDIT_PASSWORD = process.env.EDIT_PASSWORD;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password, type } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  // Check which password matches
  let role = null;
  if (password === VIEW_PASSWORD) role = 'viewer';
  if (password === EDIT_PASSWORD) role = 'editor'; // editors can also view

  if (!role) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  // Generate a session token and store it in KV with 8hr expiry
  const token = randomBytes(32).toString('hex');
  await kv.set(`session:${token}`, role, { ex: 60 * 60 * 8 });

  return res.status(200).json({ token, role });
}
