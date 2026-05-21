async function analyzeLocationWithAI(imageUrl, onChunk) {
  // Try server-side function first (no key needed from the user)
  try {
    const res = await fetch('/api/ai-hint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl }),
    });
    if (res.ok) {
      const { text } = await res.json();
      onChunk(text);
      return;
    }
  } catch {}

  // Fallback: direct Anthropic call if the user has their own key in Settings
  const apiKey = CONFIG.anthropicKey;
  if (!apiKey) throw new Error('NO_AI_KEY');

  const PROMPT = `Look at this street-level photo and give a quick 2–3 sentence location overview. Mention the most obvious visual clues (landscape, architecture, road signs, vegetation, vehicles) and your best guess for the country or region. No headers, no bullet points — just a natural, concise paragraph.`;
  const base64 = await fetchAsBase64(imageUrl);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      stream: true,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
          { type: 'text', text: PROMPT },
        ],
      }],
    }),
  });

  if (!response.ok) {
    let msg = `AI error ${response.status}`;
    try { const e = await response.json(); msg = e?.error?.message || msg; } catch {}
    throw new Error(msg);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.type === 'content_block_delta' && data.delta?.text) onChunk(data.delta.text);
      } catch {}
    }
  }
}

async function fetchAsBase64(url) {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error('Could not load image');
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
