const https = require('https');
const http  = require('http');

exports.handler = async function (event) {
  try {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors() };
    if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: cors(), body: 'Method not allowed' };

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return { statusCode: 503, headers: cors(), body: JSON.stringify({ error: 'NOT_CONFIGURED' }) };

    let imageUrl;
    try { ({ imageUrl } = JSON.parse(event.body)); }
    catch { return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Bad request' }) }; }

    // Fetch image using built-in Node https (works on all Netlify runtimes)
    const imgBuf = await nodeGet(imageUrl);
    if (!imgBuf) return { statusCode: 502, headers: cors(), body: JSON.stringify({ error: 'Could not fetch image' }) };
    const base64    = imgBuf.toString('base64');
    const mediaType = 'image/jpeg';

    const PROMPT = `Look at this street-level photo and give a quick 2–3 sentence location overview. Mention the most obvious visual clues (landscape, architecture, road signs, vegetation, vehicles) and your best guess for the country or region. No headers, no bullet points — just a natural, concise paragraph.`;

    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
        { type: 'text', text: PROMPT },
      ]}],
    });

    const data = await nodePost('api.anthropic.com', '/v1/messages', {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    }, body);

    const text = data?.content?.[0]?.text;
    if (!text) return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: 'Empty AI response' }) };
    return { statusCode: 200, headers: cors(), body: JSON.stringify({ text }) };

  } catch (err) {
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: err.message }) };
  }
};

function nodeGet(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function nodePost(host, path, headers, body) {
  return new Promise((resolve, reject) => {
    const req = https.request({ host, path, method: 'POST', headers: { ...headers, 'content-length': Buffer.byteLength(body) } }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch { resolve(null); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function cors() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
