const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUBMIT_PASSWORD = process.env.SUBMIT_PASSWORD;

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

const THEME_LABELS = {
  consistency: 'Consistency',
  observability: 'Observability',
  connectivity: 'Connectivity',
  throughput: 'Throughput & Efficiency',
  safety: 'Safety & Well-Being',
  sustainability: 'Sustainability & Traceability',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verify session token (submit password auth)
  const token = req.headers['x-session-token'];
  if (!token) return res.status(401).json({ error: 'No session token' });

  const role = await kvGet(`session:${token}`);
  if (!role) return res.status(401).json({ error: 'Invalid or expired session' });

  const { title, desc, benefit, themes, priority, submitter, email } = req.body;
  if (!title || !desc) return res.status(400).json({ error: 'Title and description required' });

  // Load existing queue
  let queue = [];
  const existing = await kvGet('requests:queue');
  if (existing) {
    queue = typeof existing === 'string' ? JSON.parse(existing) : existing;
  }

  // Add new request
  const newRequest = {
    id: `req_${Date.now()}`,
    title,
    desc,
    benefit: benefit || '',
    themes: themes || [],
    priority: priority || 'medium',
    submitter: submitter || 'Anonymous',
    email: email || '',
    status: 'pending',
    submittedAt: new Date().toISOString(),
    order: queue.length,
  };

  queue.push(newRequest);
  await kvSet('requests:queue', JSON.stringify(queue));

  // Send email notification if Resend is configured
  if (RESEND_API_KEY) {
    try {
      // Load admin notification emails
      let notifyEmails = [];
      const adminSettings = await kvGet('admin:settings');
      if (adminSettings) {
        const settings = typeof adminSettings === 'string' ? JSON.parse(adminSettings) : adminSettings;
        notifyEmails = settings.notifyEmails || [];
      }

      if (notifyEmails.length > 0) {
        const themeList = (themes || []).map(t => THEME_LABELS[t] || t).join(', ') || 'None selected';
        const emailHtml = `
          <div style="font-family:'DM Sans',sans-serif;max-width:600px;margin:0 auto;background:#f4f3f0;padding:2rem;">
            <div style="background:#fff;border-radius:10px;padding:2rem;border:1px solid rgba(0,0,0,.08);">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid rgba(0,0,0,.08);">
                <div style="width:28px;height:28px;background:#ED193A;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff;font-family:monospace;">CF</div>
                <div style="font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;">New Workstream Request</div>
              </div>
              <h2 style="font-size:1.2rem;font-weight:700;margin-bottom:.5rem;color:#181715;">${title}</h2>
              <div style="font-size:.8rem;color:#999;margin-bottom:1.5rem;">Submitted by ${submitter || 'Anonymous'} · Priority: ${priority}</div>
              <div style="margin-bottom:1rem;">
                <div style="font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#5c5a57;margin-bottom:.3rem;">Description</div>
                <div style="font-size:.9rem;color:#181715;line-height:1.6;">${desc}</div>
              </div>
              ${benefit ? `<div style="margin-bottom:1rem;"><div style="font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#5c5a57;margin-bottom:.3rem;">Expected Benefit</div><div style="font-size:.9rem;color:#181715;line-height:1.6;">${benefit}</div></div>` : ''}
              <div style="margin-bottom:1.5rem;">
                <div style="font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#5c5a57;margin-bottom:.3rem;">Themes</div>
                <div style="font-size:.9rem;color:#181715;">${themeList}</div>
              </div>
              <a href="${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : ''}/index.html#requests" style="display:inline-block;background:#ED193A;color:#fff;padding:.6rem 1.2rem;border-radius:5px;font-size:.85rem;font-weight:600;text-decoration:none;">View in Dashboard →</a>
            </div>
          </div>`;

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'CF × Vation <notifications@updates.vationventures.com>',
            to: notifyEmails,
            subject: `New Request: ${title}`,
            html: emailHtml,
          }),
        });
      }
    } catch (emailErr) {
      console.error('Email send error:', emailErr);
      // Don't fail the submission if email fails
    }
  }

  return res.status(200).json({ ok: true, id: newRequest.id });
}
