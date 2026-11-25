// 浏览器本地模拟实验室：不调用 API，不需要 API Key。
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function bars(container, labels, values, colors) {
  const max = Math.max(0.0001, ...values);
  container.innerHTML = labels.map((label, i) => `
    <div class="bar-row">
      <span title="${esc(label)}">${esc(label)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(values[i] / max) * 100}%;background:${colors[i % colors.length]}"></div></div>
      <b>${values[i].toFixed(3)}</b>
    </div>`).join('');
}

function choiceConfidence(probs) {
  const n = probs.length;
  if (n <= 1) return 1;
  return Math.max(0, (Math.max(...probs) - 1 / n) / (1 - 1 / n));
}

function scoreConfidence(probs) {
  const n = probs.length;
  if (n <= 1) return 1;
  const m = probs.indexOf(Math.max(...probs));
  const spread = probs.reduce((acc, p, i) => acc + p * Math.abs(i - m), 0);
  const uniformSpread = probs.reduce((acc, _, i) => acc + Math.abs(i - (n - 1) / 2), 0) / n;
  return Math.max(0, 1 - spread / (uniformSpread || 1));
}

function normalize(nums) {
  const clean = nums.map((n) => (Number.isFinite(n) ? Math.max(0, n) : 0));
  const sum = clean.reduce((a, b) => a + b, 0);
  return sum > 0 ? clean.map((n) => n / sum) : clean.map(() => 1 / (clean.length || 1));
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function initChoice() {
  const root = $('#choice');
  if (!root) return;
  $('#choice-run', root).addEventListener('click', () => {
    const options = $('#choice-options', root).value.split('\n').map((s) => s.trim()).filter(Boolean);
    const raw = $('#choice-probs', root).value.split(/[,，\s]+/).filter(Boolean).map(Number);
    const probs = normalize(raw.length === options.length ? raw : options.map(() => 1 / options.length));
    const max = Math.max(...probs);
    const idx = probs.indexOf(max);
    const conf = choiceConfidence(probs);
    const threshold = Number($('#choice-threshold', root).value);
    bars($('#choice-bars', root), options, probs, ['#5b6cf0', '#a266e8', '#12b8b8', '#e8a33d', '#e4657f']);
    const decision = max >= threshold ? '自动执行' : '转人工 / 请求澄清';
    $('#choice-result', root).innerHTML = `
      <div class="result-pill">最高概率选项 <b>${esc(options[idx] || '—')}</b></div>
      <div class="result-pill">p_max <b>${max.toFixed(3)}</b></div>
      <div class="result-pill">confidence <b>${conf.toFixed(3)}</b></div>
      <div class="result-pill">策略 <b>${decision}</b></div>
      <p class="lab-note">模拟公式：confidence = (p_max − 1/n) / (1 − 1/n)。Choice 的 confidence 只取决于最高概率，不区分第二名强弱；实际路由建议对“将执行选项的概率”设阈值。</p>`;
  });
}

function initScore() {
  const root = $('#score');
  if (!root) return;
  $('#score-run', root).addEventListener('click', () => {
    const levels = $('#score-levels', root).value.split('\n').map((s) => s.trim()).filter(Boolean);
    const sample = $('#score-sample', root).value || 'sample';
    const rand = hash(sample);
    const raw = levels.map(() => 0.05 + rand() * 0.95);
    const probs = normalize(raw);
    const score = probs.reduce((acc, p, i) => acc + p * i, 0);
    const conf = scoreConfidence(probs);
    bars($('#score-bars', root), levels.map((l, i) => `${i}: ${l}`), probs, ['#12b8b8', '#5b6cf0', '#a266e8', '#e8a33d']);
    $('#score-result', root).innerHTML = `
      <div class="result-pill">score <b>${score.toFixed(2)}</b> / ${levels.length - 1}</div>
      <div class="result-pill">confidence <b>${conf.toFixed(3)}</b></div>
      <p class="lab-note">本地确定性伪随机模拟，输入相同则分布相同，不代表真实 Jev 输出。Score 的 confidence 使用等级距离加权：远端分裂比相邻分裂更降低置信度。</p>`;
  });
}

function initNoul() {
  const root = $('#noul');
  if (!root) return;
  const slider = $('#noul-p', root);
  const paint = () => {
    const p = Number(slider.value) / 100;
    $('#noul-value', root).textContent = p.toFixed(2);
    const conf = Math.abs(2 * p - 1);
    const label = p > 0.7 ? 'yes' : p < 0.3 ? 'no' : '不确定区间（单独处理）';
    bars($('#noul-bars', root), ['yes', 'no'], [p, 1 - p], ['#a266e8', '#5b6cf0']);
    $('#noul-result', root).innerHTML = `
      <div class="result-pill">命题 <b>${esc($('#noul-statement', root).value || '（未输入）')}</b></div>
      <div class="result-pill">倾向 <b>${label}</b></div>
      <div class="result-pill">|2p−1| <b>${conf.toFixed(2)}</b></div>
      <p class="lab-note">官方 NoulAnswer 只有 noul 字段，没有单独 confidence。0.5 表示 yes/no 等概率，不是“中等程度”。</p>`;
  };
  slider.addEventListener('input', paint);
  $('#noul-statement', root).addEventListener('input', paint);
  paint();
}

function initProbability() {
  const root = $('#probability');
  if (!root) return;
  $('#prob-run', root).addEventListener('click', () => {
    const lines = $('#prob-input', root).value.split('\n').map((s) => s.trim()).filter(Boolean);
    const blocks = lines.map((line, i) => {
      const [name, nums] = line.split(/[:：]/);
      const labels = nums ? nums.split(/[,，\s]+/).filter(Boolean) : ['yes', 'no'];
      const values = normalize(labels.map(Number));
      return `<div style="margin-bottom:14px"><h4>${esc(name || `Q${i + 1}`)}</h4><div id="prob-bars-${i}"></div></div>`;
    });
    $('#prob-output', root).innerHTML = blocks.join('');
    lines.forEach((line, i) => {
      const [, nums] = line.split(/[:：]/);
      const labels = nums ? nums.split(/[,，\s]+/).filter(Boolean) : ['yes', 'no'];
      bars($(`#prob-bars-${i}`, root), labels, normalize(labels.map(Number)), ['#5b6cf0', '#a266e8', '#12b8b8', '#e8a33d']);
    });
  });
}

function reliabilitySvg(buckets) {
  const W = 560, H = 340, pad = 48;
  const scaleX = (x) => pad + x * (W - pad * 2);
  const scaleY = (y) => H - pad - y * (H - pad * 2);
  const grid = [0, 0.25, 0.5, 0.75, 1].map((v) => `
    <line x1="${scaleX(v)}" y1="${pad}" x2="${scaleX(v)}" y2="${H - pad}" stroke="#dfe4ee"/>
    <line x1="${pad}" y1="${scaleY(v)}" x2="${W - pad}" y2="${scaleY(v)}" stroke="#dfe4ee"/>
    <text x="${scaleX(v) - 8}" y="${H - 18}" font-size="11" fill="#7a89a5">${v}</text>
    <text x="10" y="${scaleY(v) + 4}" font-size="11" fill="#7a89a5">${v}</text>`).join('');
  const points = buckets.filter((b) => b.count > 0).map((b) => `${scaleX(b.conf)},${scaleY(b.acc)}`).join(' ');
  const bars = buckets.filter((b) => b.count > 0).map((b) => `
    <rect x="${scaleX(b.conf) - 3}" y="${scaleY(b.acc)}" width="6" height="${H - pad - scaleY(b.acc)}" fill="#7c4ddb" opacity=".65"/>`).join('');
  return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="可靠性图：预测置信度与实际准确率">
    <rect width="${W}" height="${H}" fill="#ffffff" rx="10"/>${grid}
    <line x1="${pad}" y1="${H - pad}" x2="${W - pad}" y2="${pad}" stroke="#0e9f9f" stroke-dasharray="6 5" stroke-width="2"/>
    <polyline points="${points}" fill="none" stroke="#5b6cf0" stroke-width="2.5"/>
    ${bars}
    <text x="${W / 2 - 70}" y="${H - 4}" font-size="11" fill="#52607a">预测置信度</text>
    <text x="8" y="20" font-size="11" fill="#52607a">实际准确率</text>
  </svg>`;
}

function initCalibration() {
  const root = $('#calibration');
  if (!root) return;
  $('#cal-run', root).addEventListener('click', () => {
    const n = Math.min(2000, Math.max(100, Number($('#cal-n', root).value) || 600));
    const noise = Number($('#cal-noise', root).value) / 100;
    const rand = hash($('#cal-seed', root).value || 'jevlab');
    const samples = [];
    for (let i = 0; i < n; i++) {
      const p = 0.05 + rand() * 0.9;
      const biased = Math.min(0.99, Math.max(0.01, p + (rand() - 0.5) * noise));
      const y = rand() < biased ? 1 : 0;
      samples.push({ p: biased, y });
    }
    const buckets = Array.from({ length: 5 }, (_, i) => ({ conf: (i + 0.5) / 5, count: 0, correct: 0 }));
    let brier = 0;
    samples.forEach(({ p, y }) => {
      brier += (p - y) ** 2;
      const b = buckets[Math.min(4, Math.floor(p * 5))];
      b.count++; b.correct += y;
    });
    brier /= n;
    buckets.forEach((b) => { b.acc = b.count ? b.correct / b.count : 0; });
    const ece = buckets.reduce((acc, b) => acc + (b.count / n) * Math.abs(b.acc - b.conf), 0);
    $('#cal-chart', root).innerHTML = reliabilitySvg(buckets);
    $('#cal-table', root).innerHTML = '<div class="table-wrap"><table><thead><tr><th>置信度桶</th><th>样本数</th><th>实际准确率</th><th>gap</th></tr></thead><tbody>' +
      buckets.map((b) => `<tr><td>${b.conf.toFixed(1)}</td><td>${b.count}</td><td>${b.acc.toFixed(3)}</td><td>${Math.abs(b.acc - b.conf).toFixed(3)}</td></tr>`).join('') + '</tbody></table></div>';
    $('#cal-stats', root).innerHTML = `<div class="stat"><b>${brier.toFixed(4)}</b><span>Brier Score（越低越好）</span></div>
      <div class="stat"><b>${ece.toFixed(4)}</b><span>Expected Calibration Error</span></div>
      <div class="stat"><b>${n}</b><span>模拟样本数</span></div>`;
  });
}

function initBuilder() {
  const root = $('#builder');
  if (!root) return;
  let rows = [
    { name: 'wants_refund', p: 0.92, threshold: 0.7 },
    { name: 'unauthorized', p: 0.81, threshold: 0.8 },
    { name: 'policy_eligible', p: 0.96, threshold: 0.75 },
  ];
  const renderRows = () => {
    $('#builder-rows', root).innerHTML = rows.map((r, i) => `
      <div class="bar-row" style="grid-template-columns:1fr 88px 88px 30px">
        <input type="text" data-i="${i}" data-k="name" value="${esc(r.name)}" aria-label="判断名称" />
        <input type="number" step="0.01" min="0" max="1" data-i="${i}" data-k="p" value="${r.p}" aria-label="概率" />
        <input type="number" step="0.01" min="0" max="1" data-i="${i}" data-k="threshold" value="${r.threshold}" aria-label="阈值" />
        <button class="icon-btn" data-del="${i}" aria-label="删除">×</button>
      </div>`).join('');
    $$('input[data-i]', root).forEach((el) => el.addEventListener('change', () => {
      rows[Number(el.dataset.i)][el.dataset.k] = el.dataset.k === 'name' ? el.value : Number(el.value);
    }));
    $$('[data-del]', root).forEach((el) => el.addEventListener('click', () => {
      rows.splice(Number(el.dataset.del), 1); renderRows();
    }));
  };
  $('#builder-add', root).addEventListener('click', () => {
    rows.push({ name: `judgment_${rows.length + 1}`, p: 0.8, threshold: 0.7 }); renderRows();
  });
  $('#builder-run', root).addEventListener('click', () => {
    const mode = $('#builder-mode', root).value;
    const passed = rows.filter((r) => r.p >= r.threshold);
    const ok = mode === 'all' ? passed.length === rows.length : passed.length >= Math.ceil(rows.length / 2);
    const path = rows.map((r) => `<div class="path-node"><b>${esc(r.name)}</b> = ${r.p.toFixed(2)} ${r.p >= r.threshold ? '✓ 通过' : '✗ 未通过'}（阈值 ${r.threshold}）</div>`).join('');
    const action = ok
      ? ($('#builder-risk', root).value === 'high' ? '→ 二次人工审批' : '→ 自动执行')
      : '→ 转人工审核（不执行）';
    $('#builder-output', root).innerHTML = `<h4>执行路径</h4>${path || '<p>暂无判断</p>'}
      <div class="path-node"><b>确定性规则</b>：${mode === 'all' ? '全部通过' : '多数通过'}</div>
      <div class="path-node"><b>最终决策</b> ${action}</div>
      <p class="lab-note">模型只产出判断，最终动作由代码规则与风险策略决定。</p>`;
  });
  renderRows();
}

function initRouting() {
  const root = $('#routing');
  if (!root) return;
  const slider = $('#routing-p', root);
  const syncLabel = () => { $('#routing-p-label', root).textContent = (Number(slider.value) / 100).toFixed(2); };
  slider.addEventListener('input', syncLabel);
  syncLabel();
  $('#routing-run', root).addEventListener('click', () => {
    const kind = $('#routing-kind', root).value;
    const p = Number($('#routing-p', root).value) / 100;
    const risk = $('#routing-risk', root).value;
    const human = $('#routing-human', root).checked;
    const fallback = $('#routing-fallback', root).checked;
    const threshold = risk === 'high' ? 0.9 : risk === 'medium' ? 0.75 : 0.6;
    const names = { tool: ['search_web', 'run_python', 'query_db'], model: ['jev-1.14.0', 'reasoning-model'], skill: ['summarize', 'translate', 'review_code'] };
    const chosen = names[kind][Math.min(names[kind].length - 1, Math.floor(p * names[kind].length))];
    const steps = [
      `<div class="path-node">State → Choice 判断意图：${esc(kind)}（p=${p.toFixed(2)}）</div>`,
      `<div class="path-node">Confidence Gate：阈值 ${threshold} → ${p >= threshold ? '通过' : '未通过'}</div>`,
    ];
    if (p >= threshold) {
      steps.push(`<div class="path-node">调用 <b>${esc(chosen)}</b></div>`);
      if (human && risk === 'high') steps.push('<div class="path-node">Human Approval → 人工确认后执行</div>');
      steps.push('<div class="path-node">Completion Checker → 验证结果后返回</div>');
    } else if (fallback) {
      steps.push('<div class="path-node">Fallback → 降级为安全路径 / 请求澄清</div>');
    } else {
      steps.push('<div class="path-node">停止：不执行任何动作</div>');
    }
    $('#routing-output', root).innerHTML = steps.join('');
  });
}

export function initLabs() {
  initChoice(); initScore(); initNoul(); initProbability();
  initCalibration(); initBuilder(); initRouting();
  $('#cal-run')?.click();
  $('#builder-run')?.click();
  $('#routing-run')?.click();
  $('#choice-run')?.click();
  $('#score-run')?.click();
}
