// Tells IndexNow search engines (Bing, Yandex, Seznam, Naver; Bing also feeds
// ChatGPT search and Copilot) which pages changed, right after a deploy.
// Usage: node scripts/indexnow.mjs <dist-dir> [--all]
// Without --all it submits the home page, the blog index, and any page whose
// sitemap <lastmod> is within the last 3 days (new or updated posts).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'https://trevorloula.com';
const dist = process.argv[2] ?? 'dist';
const all = process.argv.includes('--all');

const keyFile = readdirSync('public').find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) throw new Error('IndexNow key file (public/<32 hex>.txt) not found');
const key = keyFile.replace('.txt', '');

const sitemaps = readdirSync(dist).filter((f) => /^sitemap-\d+\.xml$/.test(f));
const entries = sitemaps.flatMap((f) =>
  [...readFileSync(join(dist, f), 'utf8').matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/g)]
    .map(([, loc, lastmod]) => ({ loc, lastmod: lastmod ? new Date(lastmod) : null })),
);

const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;
const urls = all
  ? entries.map((e) => e.loc)
  : [...new Set([`${SITE}/`, `${SITE}/blog/`, ...entries.filter((e) => e.lastmod && e.lastmod.getTime() >= cutoff).map((e) => e.loc)])];

console.log(`Submitting ${urls.length} URL(s) to IndexNow:\n${urls.join('\n')}`);
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(SITE).host, key, keyLocation: `${SITE}/${keyFile}`, urlList: urls }),
});
console.log(`IndexNow responded ${res.status} ${res.statusText}`);
// 200 = accepted, 202 = accepted pending key check. Anything else is worth a warning, not a failed deploy.
if (res.status >= 400) console.log(`::warning::IndexNow returned ${res.status}: ${await res.text()}`);
