async function analyzeLocationWithAI(imageUrl, onChunk) {
  const res = await fetch('/api/ai-hint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl }),
  });
  if (!res.ok) throw new Error('AI unavailable');
  const { text } = await res.json();
  if (!text) throw new Error('Empty response');
  onChunk(text);
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
