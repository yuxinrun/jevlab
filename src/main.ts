import './styles/main.css';
import { renderMarkdown, parseFrontmatter } from './utils/markdown.mjs';

type ArticleMeta = {
  slug: string;
  title: string;
  description: string;
  category: string;
  categoryTitle: string;
  order: number;
  tags: string[];
};
type Manifest = { articles: ArticleMeta[]; categories: { key: string; title: string }[] };

const BASE = '/jevlab/';
const page = document.body.dataset.page || 'home';
let manifest: Manifest | null = null;

function icon(name: string): string {
  const paths: Record<string, string> = {
    logo: '<rect x="2" y="2" width="28" height="28" rx="8" fill="url(#lg)"/><path d="M9 22V10l7 7 7-7v12" stroke="#fff" stroke-width="2.2" fill="none" stroke-linejoin="round"/>',
  };
  return `<svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#5b6cf0"/><stop offset="1" stop-color="#a05ae8"/></linearGradient></defs>${paths[name]}</svg>`;
}

function shell() {
  const host = document.getElementById('shell');
  if (!host) return;
  host.innerHTML = `
    <header class="topbar">
      <button class="icon-btn menu-btn" id="menu-btn" aria-label="打开导航">☰</button>
      <a class="logo" href="${BASE}">${icon('logo')}<span>Jev<em>Lab</em></span></a>
      <div class="spacer"></div>
      <nav class="topnav" aria-label="主导航">
        <a href="${BASE}" data-nav="home">首页</a>
        <a href="${BASE}articles/intro-what-is-jev/" data-nav="docs">教程</a>
        <a href="${BASE}playground/" data-nav="playground">Playground</a>
        <a href="${BASE}learning-path/" data-nav="learning">30 天路线</a>
      </nav>
      <div class="search-box">
        <input id="search-input" type="search" placeholder="搜索文章…" aria-label="全站搜索" autocomplete="off" />
        <div class="search-results" id="search-results" role="listbox"></div>
      </div>
      <button class="icon-btn" id="theme-btn" aria-label="切换深浅主题" title="切换深浅主题">◐</button>
    </header>
    <div class="scrim" id="scrim"></div>`;
  const footer = document.getElementById('site-footer');
  if (footer) {
    footer.innerHTML = `JevLab · Jev &amp; System One Engineering Knowledge Base ·
      <a href="https://github.com/yuxinrun/jevlab" target="_blank" rel="noopener">GitHub</a> ·
      <a href="https://docs.typesafe.ai/" target="_blank" rel="noopener">TypeSafe 官方文档</a><br />
      研究日期 2026-11-25 · Jev 1.14.0 · API 0.2.0 · 本站为独立技术教程，非 TypeSafe 官方站点。`;
  }
}

function activeTopNav() {
  const key = page === 'home' ? 'home' : page === 'playground' ? 'playground' : page === 'learning' ? 'learning' : 'docs';
  document.querySelectorAll<HTMLAnchorElement>('[data-nav]').forEach((a) => {
    if (a.dataset.nav === key) { a.classList.add('active'); a.setAttribute('aria-current', 'page'); }
  });
}

async function loadManifest(): Promise<Manifest | null> {
  if (manifest) return manifest;
  try {
    const res = await fetch(`${BASE}content/manifest.json`);
    if (!res.ok) return null;
    manifest = await res.json() as Manifest;
    return manifest;
  } catch { return null; }
}

function favorites(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem('jevlab:favorites') || '[]')); }
  catch { return new Set(); }
}

async function buildSidebar() {
  const layout = document.querySelector('.layout');
  if (!layout) return;
  const data = await loadManifest();
  const favs = favorites();
  const side = document.createElement('aside');
  side.className = 'sidebar';
  side.id = 'sidebar';
  const groups = data?.categories.map((c) => {
    const items = (data?.articles || []).filter((a) => a.category === c.key);
    return `<h4>${c.title}</h4>${items.map((a) => `<a href="${BASE}articles/${a.slug}/" data-slug="${a.slug}" class="${favs.has(a.slug) ? 'fav' : ''}">${a.title}</a>`).join('')}`;
  }).join('') || '<h4>教程</h4><p>加载中或索引不可用。</p>';
  side.innerHTML = `<h4>知识库</h4>
    <div class="side-links">
      <a href="${BASE}">首页</a><a href="${BASE}playground/">Playground</a><a href="${BASE}learning-path/">30 天路线</a>
    </div>${groups}
    <h4>官方来源</h4>
    <div class="side-links">
      <a href="https://docs.typesafe.ai/" target="_blank" rel="noopener">Docs</a>
      <a href="https://api.typesafe.ai/openapi.json" target="_blank" rel="noopener">OpenAPI</a>
      <a href="https://typesafe.ai/blog/" target="_blank" rel="noopener">Blog</a>
    </div>`;
  layout.prepend(side);
  const scrim = document.createElement('div');
  scrim.className = 'scrim'; scrim.id = 'scrim';
  document.body.appendChild(scrim);
  const menuBtn = document.getElementById('menu-btn') as HTMLButtonElement | null;
  const close = () => { side.classList.remove('open'); scrim.classList.remove('open'); };
  menuBtn?.addEventListener('click', () => { side.classList.toggle('open'); scrim.classList.toggle('open'); });
  scrim.addEventListener('click', close);
  side.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
  const current = document.body.dataset.slug;
  if (current) {
    const link = side.querySelector<HTMLAnchorElement>(`[data-slug="${current}"]`);
    link?.classList.add('active');
    link?.scrollIntoView({ block: 'nearest' });
  }
}

function initTheme() {
  const saved = localStorage.getItem('jevlab:theme');
  if (saved === 'dark' || saved === 'light') document.documentElement.dataset.theme = saved;
  document.getElementById('theme-btn')?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('jevlab:theme', next);
  });
}

type SearchDoc = { slug: string; title: string; categoryTitle: string; description: string; text: string };
let searchDocs: SearchDoc[] | null = null;

function initSearch() {
  const input = document.getElementById('search-input') as HTMLInputElement | null;
  const box = document.getElementById('search-results');
  if (!input || !box) return;
  let timer = 0;
  const render = (q: string) => {
    if (!q.trim()) { box.classList.remove('open'); box.innerHTML = ''; return; }
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const hits = (searchDocs || []).filter((d) => terms.every((t) => (d.title + d.description + d.text).toLowerCase().includes(t))).slice(0, 12);
    box.innerHTML = hits.length
      ? hits.map((d) => `<a href="${BASE}articles/${d.slug}/"><b>${d.title}</b><small>${d.categoryTitle} · ${d.description.slice(0, 72)}</small></a>`).join('')
      : '<div style="padding:12px;color:var(--text-soft)">没有找到匹配文章</div>';
    box.classList.add('open');
  };
  input.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(async () => {
      if (!searchDocs) {
        try {
          const res = await fetch(`${BASE}content/search-index.json`);
          searchDocs = res.ok ? await res.json() as SearchDoc[] : [];
        } catch { searchDocs = []; }
      }
      render(input.value);
    }, 120);
  });
  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.search-box')) box.classList.remove('open');
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape') box.classList.remove('open'); });
}

function initProgress() {
  const bar = document.getElementById('progress');
  const back = document.getElementById('back-to-top') as HTMLButtonElement | null;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
    if (back) back.style.display = window.scrollY > 400 ? 'block' : 'none';
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
  back?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function initToc() {
  const article = document.querySelector('article');
  const toc = document.getElementById('toc');
  if (!article || !toc) return;
  const headings = Array.from(article.querySelectorAll<HTMLHeadingElement>('h2, h3'));
  toc.innerHTML = '<strong>本页目录</strong>' + headings.map((h) => `<a class="lvl-${h.tagName === 'H3' ? 3 : 2}" href="#${h.id}">${h.textContent}</a>`).join('');
  const links = Array.from(toc.querySelectorAll<HTMLAnchorElement>('a'));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`));
    });
  }, { rootMargin: '-80px 0px -70% 0px' });
  headings.forEach((h) => observer.observe(h));
}

function initCodeCopy() {
  document.querySelectorAll<HTMLPreElement>('pre').forEach((pre) => {
    const btn = document.createElement('button');
    btn.className = 'copy-btn'; btn.textContent = '复制'; btn.type = 'button';
    btn.addEventListener('click', async () => {
      const code = pre.querySelector('code')?.textContent || '';
      try {
        await navigator.clipboard.writeText(code);
        btn.textContent = '已复制';
        window.setTimeout(() => { btn.textContent = '复制'; }, 1400);
      } catch { btn.textContent = '失败'; }
    });
    pre.appendChild(btn);
  });
}

async function initFavorites() {
  const btn = document.getElementById('fav-btn') as HTMLButtonElement | null;
  const slug = document.body.dataset.slug;
  if (!btn || !slug) return;
  const favs = favorites();
  const paint = () => { btn.textContent = favs.has(slug) ? '★ 已收藏' : '☆ 收藏文章'; };
  paint();
  btn.addEventListener('click', () => {
    if (favs.has(slug)) favs.delete(slug); else favs.add(slug);
    localStorage.setItem('jevlab:favorites', JSON.stringify([...favs]));
    paint();
    const sideLink = document.querySelector<HTMLAnchorElement>(`.sidebar [data-slug="${slug}"]`);
    sideLink?.classList.toggle('fav', favs.has(slug));
  });
}

function initPager() {
  const slot = document.getElementById('pager-slot');
  const slug = document.body.dataset.slug;
  if (!slot || !slug || !manifest) return;
  const list = manifest.articles;
  const idx = list.findIndex((a) => a.slug === slug);
  if (idx < 0) return;
  const prev = list[idx - 1];
  const next = list[idx + 1];
  slot.innerHTML = `<div class="pager">
    ${prev ? `<a href="${BASE}articles/${prev.slug}/"><small>← 上一篇</small>${prev.title}</a>` : '<span></span>'}
    ${next ? `<a href="${BASE}articles/${next.slug}/"><small>下一篇 →</small>${next.title}</a>` : '<span></span>'}
  </div>`;
}

async function initArticle() {
  const body = document.getElementById('article-body');
  const slug = document.body.dataset.slug;
  if (!body || !slug) return;
  const res = await fetch(`${BASE}content/md/${slug}.md`);
  if (res.ok) body.innerHTML = renderMarkdown(parseFrontmatter(await res.text()).body);
  await buildSidebar();
  initToc();
  initPager();
  initFavorites();
}

function initNotFound() {
  const el = document.getElementById('notfound-path');
  if (el) el.textContent = window.location.pathname;
}

async function boot() {
  shell();
  initTheme();
  activeTopNav();
  initSearch();
  initProgress();
  initNotFound();
  if (page === 'article') await initArticle();
  else await buildSidebar();
  initCodeCopy();
  if (page === 'playground') {
    const mod = await import('./lab/labs.mjs');
    mod.initLabs();
  }
}

boot();
