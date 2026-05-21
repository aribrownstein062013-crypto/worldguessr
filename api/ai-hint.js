const https = require('https');
const http  = require('http');

module.exports = async function (req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'Method not allowed' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(503).json({ error: 'NOT_CONFIGURED' }); return; }

  let imageUrl;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    imageUrl = body?.imageUrl;
  } catch { res.status(400).json({ error: 'Bad request' }); return; }

  if (!imageUrl) { res.status(400).json({ error: 'imageUrl required' }); return; }

  try {
    const imgBuf = await nodeGet(imageUrl);
    if (!imgBuf) { res.status(502).json({ error: 'Could not fetch image' }); return; }

    const base64 = imgBuf.toString('base64');
    const PROMPT = `Look at this street-level photo and give a quick 2–3 sentence location overview. Mention the most obvious visual clues (landscape, architecture, road signs, vegetation, vehicles) and your best guess for the country or region. No headers, no bullet points — just a natural, concise paragraph.`;

    const payload = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
        { type: 'text', text: PROMPT },
      ]}],
    });

    const data = await nodePost('api.anthropic.com', '/v1/messages', {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    }, payload);

    const text = data?.content?.[0]?.text;
    if (!text) { res.status(500).json({ error: 'Empty AI response' }); return; }
    res.status(200).json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
}

function nodeGet(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, r => {
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function nodePost(host, path, headers, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { host, path, method: 'POST', headers: { ...headers, 'content-length': Buffer.byteLength(body) } },
      r => {
        const chunks = [];
        r.on('data', c => chunks.push(c));
        r.on('end', () => {
          try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
          catch { resolve(null); }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
