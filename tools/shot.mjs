import { mkdirSync, writeFileSync } from 'fs';
import { open, waitReady } from './common.mjs';

const name = process.argv[2];
if (!name) { console.error('gebruik: node shot.mjs <naam>'); process.exit(1); }
const SIZES = { phone: { width: 390, height: 844 }, desk: { width: 1280, height: 800 } };
const outDir = new URL('../shots/', import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

for (const [tag, vp] of Object.entries(SIZES)) {
  const { browser, page, errors } = await open(vp);
  try {
    await waitReady(page, 120000);
    // Eerst een beeld renderen en dan direct uitlezen (preserveDrawingBuffer staat aan).
    const url = await page.evaluate(() => { window.__house.frame(); return document.getElementById('scene').toDataURL('image/png'); });
    const file = outDir + name + '-' + tag + '.png';
    writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    console.log('geschreven: ' + file + (errors.length ? ' (fouten: ' + errors[0] + ')' : ''));
  } finally {
    await browser.close();
  }
}
