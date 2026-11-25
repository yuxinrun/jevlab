// 轻量 Markdown 渲染器：不依赖第三方库，浏览器与 Node 构建脚本共用。
export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[`*_~]/g, '')
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}

function inline(text) {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img loading="lazy" src="$2" alt="$1" />');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return out;
}

export function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const meta = {};
  let body = source;
  if (match) {
    body = source.slice(match[0].length);
    for (const line of match[1].split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (!m) continue;
      let value = m[2].trim();
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map((v) => v.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
      } else {
        value = value.replace(/^['"]|['"]$/g, '');
      }
      meta[m[1]] = value;
    }
  }
  return { meta, body };
}

export function renderMarkdown(source) {
  const lines = String(source).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  const ids = new Map();

  const headingId = (text) => {
    const base = slugify(text);
    const count = ids.get(base) || 0;
    ids.set(base, count + 1);
    return count ? `${base}-${count + 1}` : base;
  };

  while (i < lines.length) {
    const line = lines[i];

    // 代码块
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1] || 'text';
      const buf = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      out.push(`<pre><span class="lang-label">${escapeHtml(lang)}</span><code>${escapeHtml(buf.join('\n'))}</code></pre>`);
      continue;
    }

    // 空行
    if (!line.trim()) { i++; continue; }

    // 标题
    const h = line.match(/^(#{1,4})\s+(.+)$/);
    if (h) {
      const level = h[1].length;
      const text = h[2].trim();
      const id = headingId(text);
      out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      i++;
      continue;
    }

    // 分隔线
    if (/^(---|\*\*\*)\s*$/.test(line)) { out.push('<hr />'); i++; continue; }

    // 表格
    if (line.includes('|') && lines[i + 1] && /^\s*\|?[\s:-]+\|/.test(lines[i + 1])) {
      const cells = (row) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) { rows.push(cells(lines[i])); i++; }
      out.push('<div class="table-wrap"><table><thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
        rows.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>');
      continue;
    }

    // 引用
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
      out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`);
      continue;
    }

    // 列表
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''));
        i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>` + items.map((item) => `<li>${inline(item)}</li>`).join('') + `</${tag}>`);
      continue;
    }

    // 段落（合并到下一个空行或特殊块）
    const para = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|>\s?|---\s*$|\*\*\*\s*$|\s*([-*]|\d+\.)\s+)/.test(lines[i]) && !lines[i].includes('|')) {
      para.push(lines[i]); i++;
    }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }

  return out.join('\n');
}

export function plainText(source) {
  return String(source)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`\[\]()!|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
