import { mkdirSync, writeFileSync } from 'fs';
import { open, waitReady } from './common.mjs';

const name = process.argv[2];
const room = process.argv[3];   // optioneel: close-up van één kamer (via __house.focusRoom)
if (!name) { console.error('gebruik: node shot.mjs <naam> [kamer-id]'); process.exit(1); }
const SIZES = { phone: { width: 390, height: 844 }, desk: { width: 1280, height: 800 } };
const outDir = new URL('../shots/', import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

for (const [tag, vp] of Object.entries(SIZES)) {
  const { browser, page, errors } = await open(vp);
  try {
    await waitReady(page, 120000);
    // Wachten tot de kamers zijn ingericht (stap B); lukt dat niet, dan toch een beeld maken.
    await page.waitForFunction(() => window.__house.stageB === 'done', null, { timeout: 60000, polling: 250 }).catch(() => {});
    if (room) await page.evaluate(id => window.__house.focusRoom(id), room);
    // Eerst een beeld renderen en dan direct uitlezen (preserveDrawingBuffer staat aan).
    const url = await page.evaluate(() => { window.__house.frame(); return document.getElementById('scene').toDataURL('image/png'); });
    const file = outDir + name + '-' + tag + '.png';
    writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    console.log('geschreven: ' + file + (errors.length ? ' (fouten: ' + errors[0] + ')' : ''));
  } finally {
    await browser.close();
  }
}
