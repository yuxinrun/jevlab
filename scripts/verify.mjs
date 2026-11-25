import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const BASE = '/jevlab/';

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(p));
    else out.push(p);
  }
  return out;
}

const files = await walk(dist);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const problems = [];
const localRefs = new Set();

for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const refs = [...html.matchAll(/(?:href|src)="(\/jevlab\/[^"#?]*)(?:[#?][^"]*)?"/g)].map((m) => m[1]);
  for (const ref of refs) {
    localRefs.add(ref);
    const target = resolve(dist, ref.replace(BASE, ''));
    try {
      const s = await stat(target);
      if (s.isDirectory()) {
        await stat(join(target, 'index.html'));
      }
    } catch {
      problems.push(`${file.replace(dist, '.')} → ${ref}`);
    }
  }
}

let svgCount = 0, badSvg = 0;
for (const file of files.filter((f) => f.endsWith('.svg'))) {
  svgCount++;
  const text = await readFile(file, 'utf8');
  if (!/^\s*<svg[\s>]/.test(text) || !text.trimEnd().endsWith('</svg>')) {
    badSvg++;
    problems.push(`SVG 结构异常: ${file.replace(dist, '.')}`);
  }
}

const manifest = JSON.parse(await readFile(resolve(dist, 'content/manifest.json'), 'utf8'));
const articles = manifest.articles.length;
const sitemap = await readFile(resolve(dist, 'sitemap.xml'), 'utf8');
const robots = await readFile(resolve(dist, 'robots.txt'), 'utf8');

console.log(JSON.stringify({
  htmlPages: htmlFiles.length,
  articles,
  svgCount,
  badSvg,
  localRefsChecked: localRefs.size,
  sitemapUrls: (sitemap.match(/<loc>/g) || []).length,
  robotsHasSitemap: robots.includes('Sitemap: https://yuxinrun.github.io/jevlab/sitemap.xml'),
  problems,
}, null, 2));

if (problems.length) process.exitCode = 1;
