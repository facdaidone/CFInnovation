const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const VIEW_PASSWORD = process.env.VIEW_PASSWORD;
const EDIT_PASSWORD = process.env.EDIT_PASSWORD;
const SUBMIT_PASSWORD = process.env.SUBMIT_PASSWORD;

async function kvSet(key, value, exSeconds) {
  const args = ['SET', key, value];
  if (exSeconds) args.push('EX', exSeconds);
  const res = await fetch(`${KV_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([args]),
  });
  return res.json();
}

function generateToken() {
  const arr = new Uint8Array(32);
  for (let i = 0; i < 32; i++) arr[i] = Math.floor(Math.random() * 256);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });

  let role = null;
  if (password === VIEW_PASSWORD) role = 'viewer';
  if (password === EDIT_PASSWORD) role = 'editor';
  if (password === SUBMIT_PASSWORD) role = 'submitter';
  // Editor password also grants submit access
  if (password === EDIT_PASSWORD) role = 'editor';

  if (!role) return res.status(401).json({ error: 'Incorrect password' });

  const token = generateToken();
  await kvSet(`session:${token}`, role, 60 * 60 * 8);

  return res.status(200).json({ token, role });
}
