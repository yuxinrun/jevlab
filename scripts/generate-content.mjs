import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { plainText } from '../src/utils/markdown.mjs';
import { articles as foundation } from './content/foundation.mjs';
import { articles as architecture } from './content/architecture.mjs';
import { articles as primitives } from './content/primitives.mjs';
import { articles as judgment } from './content/judgment.mjs';
import { articles as probability } from './content/probability.mjs';
import { articles as apiAgent } from './content/api-agent.mjs';
import { articles as practice } from './content/practice.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const categories = [
  { key: 'introduction', title: '第一部分 · Jev 入门' },
  { key: 'architecture', title: '第二部分 · 核心架构' },
  { key: 'primitives', title: '第三部分 · Choice / Score / Noul / Box' },
  { key: 'judgment', title: '第四部分 · Judgment Engineering' },
  { key: 'probability', title: '第五部分 · Probability / Confidence' },
  { key: 'api', title: '第六部分 · API 与 SDK' },
  { key: 'integration', title: '第七部分 · Agent 集成' },
  { key: 'production', title: '第八部分 · 生产工程化' },
  { key: 'practice', title: '第九部分 · 实战' },
];

const all = [...foundation, ...architecture, ...primitives, ...judgment, ...probability, ...apiAgent, ...practice];
const seen = new Set();
for (const article of all) {
  if (seen.has(article.slug)) throw new Error(`重复 slug: ${article.slug}`);
  seen.add(article.slug);
  if (!categories.some((c) => c.key === article.category)) throw new Error(`未知分类: ${article.category}`);
}

const manifestArticles = all.map((article, index) => {
  const categoryTitle = categories.find((c) => c.key === article.category).title;
  const frontmatter = [
    '---',
    `title: "${article.title}"`,
    `description: "${article.description}"`,
    `category: ${article.category}`,
    `categoryTitle: "${categoryTitle}"`,
    `order: ${index + 1}`,
    `tags: [${article.tags.join(', ')}]`,
    '---',
    '',
  ].join('\n');
  const markdown = frontmatter + article.body.trim() + '\n';
  return { article, markdown, meta: {
    slug: article.slug,
    title: article.title,
    description: article.description,
    category: article.category,
    categoryTitle,
    order: index + 1,
    tags: article.tags,
  } };
});

await mkdir(resolve(root, 'public/content/md'), { recursive: true });
await Promise.all(manifestArticles.map(({ article, markdown }) => Promise.all([
  (async () => {
    const dir = resolve(root, 'content', article.category);
    await mkdir(dir, { recursive: true });
    await writeFile(resolve(dir, `${article.slug}.md`), markdown, 'utf8');
  })(),
  writeFile(resolve(root, 'public/content/md', `${article.slug}.md`), markdown, 'utf8'),
])));

const manifest = { articles: manifestArticles.map((x) => x.meta), categories };
await writeFile(resolve(root, 'public/content/manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

const searchIndex = manifestArticles.map((x) => ({
  slug: x.article.slug,
  title: x.article.title,
  categoryTitle: x.meta.categoryTitle,
  description: x.article.description,
  text: plainText(x.article.body).slice(0, 4000),
}));
await writeFile(resolve(root, 'public/content/search-index.json'), JSON.stringify(searchIndex), 'utf8');

await writeFile(resolve(root, 'public/content/research-notes.json'), JSON.stringify({
  researchDate: '2026-11-25',
  model: 'jev-1.14.0',
  apiVersion: '0.2.0',
  openapi: '3.1.0',
  sdk: { python: 'typesafe-sdk (版本未在文档中固定)', javascript: '@typesafe-ai/sdk (文档关联 v0.7.0)' },
  sources: [
    'https://docs.typesafe.ai/introduction',
    'https://docs.typesafe.ai/concepts/system-one',
    'https://api.typesafe.ai/openapi.json',
    'https://docs.typesafe.ai/primitives',
    'https://docs.typesafe.ai/confidence',
    'https://docs.typesafe.ai/models',
    'https://docs.typesafe.ai/api/errors',
    'https://typesafe.ai/blog/introducing-system-one-models-and-jev',
    'https://typesafe.ai/blog/dont-call-it-a-decision-model',
    'https://typesafe.ai/blog/jev-1-14',
  ],
}, null, 2), 'utf8');

console.log(`已生成 ${all.length} 篇文章、manifest、搜索索引与研究记录。`);
