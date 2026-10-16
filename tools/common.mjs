import { chromium } from 'playwright';

export const BASE = process.env.HUIS_URL || 'http://127.0.0.1:8765/index.html';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-proxy-server'];
const IGNORE = /fonts\.googleapis\.com|fonts\.gstatic\.com|favicon\.ico/;

// Start Chromium en geef een pagina terug die fouten verzamelt in errors[].
// init (optioneel) draait in de pagina voor alle andere scripts (bijvoorbeeld om iets te stubben).
export async function open(viewport, query = 'debug=1&q=low', init = null) {
  const browser = await chromium.launch({ executablePath: CHROME, args: ARGS });
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  if (init) await page.addInitScript(init);
  const errors = [];
  const own = new URL(BASE).origin;
  page.on('pageerror', e => errors.push('pagina-fout: ' + e.message));
  page.on('requestfailed', r => { if (r.url().startsWith(own) && !IGNORE.test(r.url())) errors.push('mislukt verzoek: ' + r.url()); });
  page.on('response', r => { if (r.url().startsWith(own) && r.status() >= 400 && !IGNORE.test(r.url())) errors.push('HTTP ' + r.status() + ': ' + r.url()); });
  // Google Fonts hangt via de proxy, dus niet op 'load' wachten.
  await page.goto(BASE + '?' + query, { waitUntil: 'commit', timeout: 60000 });
  return { browser, page, errors };
}

export async function waitReady(page, ms = 60000) {
  await page.waitForFunction(() => window.__house && window.__house.ready, null, { timeout: ms, polling: 250 });
}
