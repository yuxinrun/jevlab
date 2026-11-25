import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMarkdown, parseFrontmatter, escapeHtml } from '../src/utils/markdown.mjs';
import { days, levels } from './data/learning-path.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const BASE = '/jevlab/';
const SITE = 'https://yuxinrun.github.io/jevlab/';

const homeHtml = await readFile(resolve(dist, 'index.html'), 'utf8');
const assets = [
  ...homeHtml.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g),
  ...homeHtml.matchAll(/<script[^>]+type="module"[^>]*><\/script>/g),
  ...homeHtml.matchAll(/<link[^>]+rel="icon"[^>]*>/g),
].map((m) => m[0]).join('\n  ');

const manifest = JSON.parse(await readFile(resolve(root, 'public/content/manifest.json'), 'utf8'));

function pageShell({ title, description, bodyAttrs, content }) {
  return `<!doctype html>
<html lang="zh-CN" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} — JevLab</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(title)} — JevLab" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${SITE}${bodyAttrs.includes('data-slug') ? `articles/${bodyAttrs.match(/data-slug="([^"]+)"/)[1]}/` : ''}" />
  <link rel="icon" type="image/svg+xml" href="${BASE}favicon.svg" />
  ${assets}
</head>
<body ${bodyAttrs}>
  <div id="progress"></div>
  <div id="shell"></div>
  ${content}
  <footer id="site-footer"></footer>
  <button id="back-to-top" aria-label="返回顶部">↑</button>
</body>
</html>`;
}

const urls = [`${SITE}`, `${SITE}playground/`, `${SITE}learning-path/`];

for (const [index, meta] of manifest.articles.entries()) {
  const md = await readFile(resolve(root, 'public/content/md', `${meta.slug}.md`), 'utf8');
  const html = renderMarkdown(parseFrontmatter(md).body);
  const prev = manifest.articles[index - 1];
  const next = manifest.articles[index + 1];
  const content = `
  <main class="layout">
    <div class="content-area">
      <div class="doc-grid">
        <article>
          <div class="breadcrumbs"><a href="${BASE}">首页</a> / <a href="${BASE}articles/intro-what-is-jev/">教程</a> / ${escapeHtml(meta.categoryTitle)} / ${escapeHtml(meta.title)}</div>
          <header class="article-head">
            <h1>${escapeHtml(meta.title)}</h1>
            <p>${escapeHtml(meta.description)}</p>
            <div class="article-meta">
              <span class="chip">${escapeHtml(meta.categoryTitle)}</span>
              <span class="chip">研究日期 2026-11-25</span>
              <span class="chip">Jev 1.14.0 · API 0.2.0</span>
              <button class="fav-btn" id="fav-btn" type="button">☆ 收藏文章</button>
            </div>
          </header>
          <div id="article-body" class="prose">${html}</div>
          <div class="article-footer">
            <div id="pager-slot"></div>
            <div style="margin-top:18px;font-size:12.5px;color:var(--text-soft)">
              上一篇：${prev ? escapeHtml(prev.title) : '无'} · 下一篇：${next ? escapeHtml(next.title) : '无'}
            </div>
          </div>
        </article>
        <aside class="toc" id="toc"></aside>
      </div>
    </div>
  </main>`;
  const outDir = resolve(dist, 'articles', meta.slug);
  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, 'index.html'), pageShell({
    title: meta.title,
    description: meta.description,
    bodyAttrs: `data-page="article" data-slug="${meta.slug}"`,
    content,
  }), 'utf8');
  urls.push(`${SITE}articles/${meta.slug}/`);
}

// 学习路线预渲染
const learningHtml = levels.map((level, li) => {
  const levelDays = days.filter((d) => d.level === li + 1);
  return `<div class="level-divider">${escapeHtml(level)}</div>` + levelDays.map((d) => {
    const links = d.articles.map((slug) => {
      const m = manifest.articles.find((a) => a.slug === slug);
      return m ? `<a href="${BASE}articles/${slug}/">${escapeHtml(m.title)}</a>` : `<code>${slug}</code>`;
    }).join(' · ');
    return `<section class="day-card">
      <div class="day-head"><span class="day-num">DAY ${d.day}</span><h3>${escapeHtml(d.title)}</h3><span class="day-level">${escapeHtml(level)}</span></div>
      <ul>
        <li><b>学习目标：</b>${escapeHtml(d.goal)}</li>
        <li><b>推荐文章：</b>${links}</li>
        <li><b>实操任务：</b>${escapeHtml(d.task)}</li>
        <li><b>源码 / 文档阅读：</b>${escapeHtml(d.reading)}</li>
        <li><b>预期成果：</b>${escapeHtml(d.outcome)}</li>
        <li><b>自测问题：</b>${escapeHtml(d.quiz)}</li>
      </ul>
    </section>`;
  }).join('');
}).join('');

const learningFile = resolve(dist, 'learning-path/index.html');
const learningSource = await readFile(learningFile, 'utf8');
await writeFile(learningFile, learningSource.replace('<div id="path-content"><!-- 由 scripts/prerender.mjs 注入 --></div>', `<div id="path-content">${learningHtml}</div>`), 'utf8');

// Sitemap
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`;
await writeFile(resolve(dist, 'sitemap.xml'), sitemap, 'utf8');

console.log(`预渲染完成：${manifest.articles.length} 篇文章，${levels.length} 个 Level，${days.length} 天计划，${urls.length} 条 sitemap URL。`);
