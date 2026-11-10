// Vercel-functie: spreekt een zin uit met de stem van Luuk (Fish Audio) en geeft een mp3 terug.
// Alleen zinnen uit stem/zinnen.json worden gemaakt, en het antwoord blijft een jaar in de
// Vercel-cache staan. Zo maakt elke zin maar een keer een opname aan en kan niemand het
// Fish-tegoed opmaken met eigen teksten.
// Nodig in Vercel: FISH_API_KEY en FISH_VOICE_ID (en eventueel FISH_MODEL).
const zinnen = new Set(require('../stem/zinnen.json'));

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const tekst = url.searchParams.get('zin');
  // Alleen ?zin=..., verder niets: andere parameters zouden de cache omzeilen.
  if ([...url.searchParams.keys()].join() !== 'zin' || !zinnen.has(tekst)) {
    res.statusCode = 404; return res.end('onbekende zin');
  }
  const KEY = process.env.FISH_API_KEY, STEM = process.env.FISH_VOICE_ID;
  if (!KEY || !STEM) { res.statusCode = 503; return res.end('stem niet ingesteld'); }
  const fish = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', model: process.env.FISH_MODEL || 's2.1-pro-free' },
    body: JSON.stringify({ text: tekst, reference_id: STEM, format: 'mp3', mp3_bitrate: 64, normalize: true, latency: 'normal' }),
  });
  if (!fish.ok) {
    console.error('Fish Audio', fish.status, (await fish.text()).slice(0, 200));
    res.statusCode = 502; return res.end('stem mislukt');
  }
  const mp3 = Buffer.from(await fish.arrayBuffer());
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('CDN-Cache-Control', 'public, max-age=31536000, immutable');
  res.end(mp3);
};
