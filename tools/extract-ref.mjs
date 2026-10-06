// One-off helper: builds reference/ref-text.txt from locally downloaded reference bundles.
// Usage: node tools/extract-ref.mjs <dir-with-index.html-and-chunk>
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
const html = readFileSync(join(dir, 'index.html'), 'utf8');
let body = html.slice(html.indexOf('<body'));
body = body.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ');
body = body.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
const chunkName = readdirSync(dir).find((f) => f.endsWith('.js') && readFileSync(join(dir, f), 'utf8').includes('desk-pink'));
const js = readFileSync(join(dir, chunkName), 'utf8');
const tail = js.slice(Math.floor(js.length * 0.55));
const strs = [...tail.matchAll(/"([^"\\]{4,200})"/g)]
  .map((m) => m[1])
  .filter((s) => /[a-z]{3,} [a-z]{2,}/i.test(s) && !/[{};=<>]|translate|px|rounded|text-|flex|grid|bg-|border-/.test(s));
mkdirSync('reference', { recursive: true });
writeFileSync('reference/ref-text.txt', body + '\n' + strs.join('\n'));
console.log(body.length, strs.length, chunkName);
