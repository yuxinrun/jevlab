import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'public/diagrams');
await mkdir(outDir, { recursive: true });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const C = { blue: '#5b6cf0', purple: '#a266e8', cyan: '#12b8b8', amber: '#e8a33d', red: '#e4657f', ink: '#18213a', soft: '#64708a', line: '#9aa8c4', bg: '#f8fafc' };

function frame(w, h, title, body, dark = false) {
  const bg = dark ? '#0d1426' : C.bg;
  const titleColor = dark ? '#e8edfa' : C.ink;
  const grid = dark ? '#1c2942' : '#e6ebf4';
  let lines = '';
  for (let x = 0; x < w; x += 40) lines += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${grid}" stroke-width="1"/>`;
  for (let y = 0; y < h; y += 40) lines += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${grid}" stroke-width="1"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
  <rect width="${w}" height="${h}" fill="${bg}" rx="14"/>${lines}
  <text x="28" y="42" font-family="system-ui,sans-serif" font-size="22" font-weight="700" fill="${titleColor}">${esc(title)}</text>
  ${body}
</svg>`;
}

function node(x, y, w, h, label, opts = {}) {
  const fill = opts.fill || '#ffffff';
  const stroke = opts.stroke || C.line;
  const color = opts.color || C.ink;
  const size = opts.size || 15;
  const lines = Array.isArray(label) ? label : [label];
  const lineH = size + 6;
  const startY = y + h / 2 - ((lines.length - 1) * lineH) / 2 + 5;
  const texts = lines.map((l, i) => `<text x="${x + w / 2}" y="${startY + i * lineH}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${size}" font-weight="${opts.bold === false ? 500 : 700}" fill="${color}">${esc(l)}</text>`).join('');
  const sub = opts.sub ? `<text x="${x + w / 2}" y="${y + h + 18}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" fill="${C.soft}">${esc(opts.sub)}</text>` : '';
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="2"/>${texts}${sub}</g>`;
}

function arrow(x1, y1, x2, y2, label = '', opts = {}) {
  const color = opts.color || C.line;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const text = label ? `<text x="${mx}" y="${my - 8}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" fill="${C.soft}">${esc(label)}</text>` : '';
  return `<g><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2" marker-end="url(#a)"/>${text}</g>`;
}

const defs = `<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${C.line}"/></marker></defs>`;
const wrap = (title, body, w = 900, h = 520) => frame(w, h, title, defs + body);

const diagrams = {};

diagrams['hero-judgment-graph'] = frame(960, 540, 'Judgment Graph — State → Questions → Code', defs + `
  ${node(40, 120, 170, 92, ['State', 'text · JSON · image'], { fill: '#16233d', stroke: '#4b6bd6', color: '#dbe6ff', size: 16 })}
  ${node(300, 62, 200, 78, 'Noul · 是否存在风险?', { fill: '#2a1d4d', stroke: C.purple, color: '#e9ddff', size: 14 })}
  ${node(300, 164, 200, 78, 'Choice · 走哪条路径?', { fill: '#1b2c55', stroke: C.blue, color: '#dbe6ff', size: 14 })}
  ${node(300, 266, 200, 78, 'Score · 严重度等级', { fill: '#12393e', stroke: C.cyan, color: '#d5fbf7', size: 14 })}
  ${node(300, 368, 200, 78, 'Box · 元素在哪?', { fill: '#3c2c18', stroke: C.amber, color: '#ffecd2', size: 14, sub: 'Dreamer-ready' })}
  ${arrow(210, 166, 295, 101, '并行')}
  ${arrow(210, 166, 295, 203)}
  ${arrow(210, 170, 295, 305)}
  ${arrow(210, 174, 295, 407)}
  ${node(610, 180, 190, 86, ['Deterministic Logic', '规则 · 权限 · 阈值'], { fill: '#16233d', stroke: C.cyan, color: '#d5fbf7', size: 15 })}
  ${arrow(500, 101, 605, 205)}
  ${arrow(500, 203, 605, 215)}
  ${arrow(500, 305, 605, 230)}
  ${arrow(500, 407, 605, 245)}
  ${node(850, 180, 78, 86, 'Action', { fill: '#2a1d4d', stroke: C.purple, color: '#ffe8ff', size: 14 })}
  ${arrow(800, 223, 846, 223)}
  <text x="40" y="495" font-family="system-ui,sans-serif" font-size="13" fill="#9aa8c4">Jev 负责语义判断 · 代码负责最终决策 · 不确定与高风险路径转人工</text>
`, 960, 540, true);

diagrams['jev-architecture'] = wrap('Jev 总体架构', `
  ${node(40, 110, 190, 90, ['Client / SDK', 'Python · JS · HTTP'], { fill: '#eef1ff', stroke: C.blue })}
  ${node(310, 110, 200, 90, ['System One API', 'POST /v1/systemone'], { fill: '#f3ecff', stroke: C.purple })}
  ${node(590, 110, 230, 90, ['Jev 1.14', 'typed judgments'], { fill: '#e8f9f7', stroke: C.cyan })}
  ${arrow(230, 155, 305, 155, 'state + questions')}
  ${arrow(510, 155, 585, 155, 'Bearer key')}
  ${node(90, 280, 220, 84, ['Typed Answers', 'choice / score / noul / box'], { fill: '#f8fafc', stroke: C.blue, size: 14 })}
  ${node(375, 280, 220, 84, ['Deterministic Logic', 'facts · rules · thresholds'], { fill: '#f8fafc', stroke: C.cyan, size: 14 })}
  ${node(660, 280, 190, 84, ['Decision', 'action / human'], { fill: '#fff4e6', stroke: C.amber })}
  ${arrow(700, 200, 200, 275, 'answers + probabilities')}
  ${arrow(310, 322, 370, 322)}
  ${arrow(595, 322, 655, 322)}
`);

diagrams['system-one-concept'] = wrap('System One 模型概念', `
  ${node(60, 100, 250, 100, ['State', '自然语言 / JSON / 图像'], { fill: '#eef1ff', stroke: C.blue })}
  ${node(370, 100, 250, 100, ['System One Model', '快速 · 聚焦 · 结构化'], { fill: '#f3ecff', stroke: C.purple })}
  ${node(680, 100, 180, 100, ['Typed Answers', '+ Probabilities'], { fill: '#e8f9f7', stroke: C.cyan, size: 14 })}
  ${arrow(310, 150, 365, 150)}
  ${arrow(620, 150, 675, 150)}
  ${node(110, 290, 300, 80, ['不生成回复 / 代码 / 推理说明'], { fill: '#fff0f2', stroke: C.red, size: 15 })}
  ${node(490, 290, 300, 80, ['校准概率（厂商声明）', '群体层面，不保证单样本正确'], { fill: '#fff7e8', stroke: C.amber, size: 14 })}
  <text x="60" y="430" font-family="system-ui,sans-serif" font-size="14" fill="${C.soft}">名字来自 Kahneman 的 System 1：快速、直觉式判断。这是定位类比，不代表内部机制。</text>
`);

diagrams['llm-vs-jev'] = wrap('传统 LLM 与 Jev 对比', `
  ${node(50, 90, 360, 70, '传统 LLM：自由文本生成', { fill: '#eef1ff', stroke: C.blue })}
  ${node(50, 185, 360, 70, '应用：解析 / 校验 / 重试', { fill: '#fff4e6', stroke: C.amber })}
  ${node(50, 280, 360, 70, '决策：依赖解析结果', { fill: '#f8fafc', stroke: C.line })}
  ${arrow(230, 160, 230, 180)}
  ${arrow(230, 255, 230, 275)}
  ${node(500, 90, 360, 70, 'Jev：typed questions', { fill: '#f3ecff', stroke: C.purple })}
  ${node(500, 185, 360, 70, 'Answers：probabilities + confidence', { fill: '#e8f9f7', stroke: C.cyan, size: 14 })}
  ${node(500, 280, 360, 70, '决策：代码直接分支', { fill: '#f8fafc', stroke: C.line })}
  ${arrow(680, 160, 680, 180)}
  ${arrow(680, 255, 680, 275)}
`);

diagrams['state-questions-answers'] = wrap('State → Questions → Answers', `
  ${node(40, 130, 190, 100, ['State', '共享上下文'], { fill: '#eef1ff', stroke: C.blue })}
  ${node(300, 70, 220, 80, 'Noul · 意图存在?', { fill: '#f3ecff', stroke: C.purple, size: 14 })}
  ${node(300, 170, 220, 80, 'Choice · 类别', { fill: '#f3ecff', stroke: C.purple, size: 14 })}
  ${node(300, 270, 220, 80, 'Score · 严重度', { fill: '#f3ecff', stroke: C.purple, size: 14 })}
  ${arrow(230, 175, 295, 110)}
  ${arrow(230, 180, 295, 210)}
  ${arrow(230, 190, 295, 310)}
  ${node(620, 130, 230, 120, ['Answers', '按 question ID 组织', '概率 · confidence'], { fill: '#e8f9f7', stroke: C.cyan, size: 14 })}
  ${arrow(520, 110, 615, 165)}
  ${arrow(520, 210, 615, 190)}
  ${arrow(520, 310, 615, 215)}
`);

diagrams['choice'] = wrap('Choice：从预定义选项中选择', `
  ${node(50, 120, 210, 90, ['State', 'ticket message'], { fill: '#eef1ff', stroke: C.blue })}
  ${node(330, 70, 230, 70, 'Choice Question', { fill: '#f3ecff', stroke: C.purple })}
  ${node(330, 160, 230, 70, 'criteria: map (1–255)', { fill: '#f8fafc', stroke: C.line, size: 14 })}
  ${arrow(260, 165, 325, 105)}
  ${arrow(445, 140, 445, 155)}
  ${node(640, 80, 220, 80, ['choice: "refund"', 'confidence'], { fill: '#e8f9f7', stroke: C.cyan, size: 14 })}
  ${node(640, 190, 220, 100, ['probabilities', 'refund 0.85', 'rebook 0.10', 'info 0.05'], { fill: '#f8fafc', stroke: C.cyan, size: 13 })}
  ${arrow(560, 105, 635, 120)}
  ${arrow(560, 105, 635, 220)}
  <text x="50" y="370" font-family="system-ui,sans-serif" font-size="14" fill="${C.soft}">Choice 总会选一项：用 companion Noul 判断“是否有选项适用”。</text>
`);

diagrams['score'] = wrap('Score：有序等级上的位置', `
  ${node(45, 120, 180, 90, 'State', { fill: '#eef1ff', stroke: C.blue })}
  ${node(280, 120, 230, 90, ['Score Question', 'criteria: ordered array'], { fill: '#e8f9f7', stroke: C.cyan, size: 14 })}
  ${arrow(225, 165, 275, 165)}
  ${node(575, 60, 130, 60, '0 · Calm', { fill: '#f8fafc', stroke: C.line, size: 14 })}
  ${node(575, 130, 130, 60, '1 · Concerned', { fill: '#f8fafc', stroke: C.line, size: 13 })}
  ${node(575, 200, 130, 60, '2 · Angry', { fill: '#f8fafc', stroke: C.line, size: 14 })}
  ${node(575, 270, 130, 60, '3 · Threat', { fill: '#f8fafc', stroke: C.line, size: 14 })}
  ${arrow(510, 165, 570, 90)}
  ${arrow(510, 165, 570, 160)}
  ${arrow(510, 165, 570, 230)}
  ${arrow(510, 165, 570, 300)}
  ${node(740, 130, 140, 100, ['score 1.42', 'confidence', 'legend'], { fill: '#f3ecff', stroke: C.purple, size: 13 })}
  ${arrow(705, 160, 735, 180)}
  <text x="45" y="400" font-family="system-ui,sans-serif" font-size="14" fill="${C.soft}">score 是概率加权平均，可落在等级之间；confidence 考虑等级距离。</text>
`);

diagrams['noul'] = wrap('Noul：命题为真的概率', `
  ${node(70, 110, 220, 90, ['State', 'message / policy'], { fill: '#eef1ff', stroke: C.blue })}
  ${node(370, 110, 230, 90, ['Noul Question', 'Is this true?'], { fill: '#f3ecff', stroke: C.purple })}
  ${arrow(290, 155, 365, 155)}
  ${node(680, 110, 180, 90, ['noul = 0.92', '无 confidence'], { fill: '#e8f9f7', stroke: C.cyan, size: 14 })}
  ${arrow(600, 155, 675, 155)}
  ${node(120, 300, 190, 70, 'p > 0.7 → yes', { fill: '#e8f9f7', stroke: C.cyan })}
  ${node(355, 300, 190, 70, '0.3–0.7 → 不确定', { fill: '#fff7e8', stroke: C.amber, size: 14 })}
  ${node(590, 300, 190, 70, 'p < 0.3 → no', { fill: '#fff0f2', stroke: C.red })}
  <text x="120" y="430" font-family="system-ui,sans-serif" font-size="14" fill="${C.soft}">0.5 表示 yes/no 等概率，不是“中等程度”。</text>
`);

diagrams['box'] = wrap('Box：图像中的归一化边界框', `
  <rect x="80" y="90" width="360" height="260" rx="10" fill="#eef1ff" stroke="${C.blue}" stroke-width="2"/>
  <rect x="190" y="150" width="130" height="110" rx="6" fill="none" stroke="${C.amber}" stroke-width="4" stroke-dasharray="8 5"/>
  <text x="255" y="215" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" fill="${C.amber}">target</text>
  <text x="90" y="120" font-family="system-ui,sans-serif" font-size="13" fill="${C.soft}">(0,0)</text>
  <text x="370" y="338" font-family="system-ui,sans-serif" font-size="13" fill="${C.soft}">(1,1)</text>
  ${node(520, 90, 320, 80, ['box: top/bottom/left/right', '0–1 fraction'], { fill: '#f8fafc', stroke: C.cyan, size: 14 })}
  ${node(520, 195, 320, 80, ['confidence: number | null', 'Dreamer-ready · Danger Zone'], { fill: '#fff4e6', stroke: C.amber, size: 13 })}
  ${node(520, 300, 320, 80, ['Box 永远返回坐标', '必须搭配 Noul 判断存在性'], { fill: '#fff0f2', stroke: C.red, size: 13 })}
`);

diagrams['parallel-judgment'] = wrap('Parallel Evaluation：并行、隔离评估', `
  ${node(360, 70, 200, 70, ['State', 'single request'], { fill: '#eef1ff', stroke: C.blue, size: 14 })}
  ${node(60, 200, 180, 70, 'Noul #1', { fill: '#f3ecff', stroke: C.purple })}
  ${node(260, 200, 180, 70, 'Choice #2', { fill: '#f3ecff', stroke: C.purple })}
  ${node(460, 200, 180, 70, 'Score #3', { fill: '#f3ecff', stroke: C.purple })}
  ${node(660, 200, 180, 70, 'Noul #4', { fill: '#f3ecff', stroke: C.purple })}
  ${arrow(450, 140, 150, 195)}
  ${arrow(450, 140, 350, 195)}
  ${arrow(450, 140, 550, 195)}
  ${arrow(450, 140, 750, 195)}
  ${node(280, 350, 340, 70, ['Code：组合答案，形成决策路径'], { fill: '#e8f9f7', stroke: C.cyan, size: 15 })}
  ${arrow(150, 270, 350, 345)}
  ${arrow(350, 270, 420, 345)}
  ${arrow(550, 270, 500, 345)}
  ${arrow(750, 270, 560, 345)}
`);

diagrams['atomic-questions'] = wrap('Atomic Questions：拆小再组合', `
  ${node(45, 110, 230, 90, ['一个大问题', '“决定最佳处理方案”'], { fill: '#fff0f2', stroke: C.red, size: 14 })}
  ${arrow(280, 155, 330, 155, '拆分')}
  ${node(350, 55, 210, 66, 'Noul · 要求退款?', { fill: '#f3ecff', stroke: C.purple, size: 13 })}
  ${node(350, 135, 210, 66, 'Noul · 法律威胁?', { fill: '#f3ecff', stroke: C.purple, size: 13 })}
  ${node(350, 215, 210, 66, 'Score · 情绪等级', { fill: '#f3ecff', stroke: C.purple, size: 13 })}
  ${node(350, 295, 210, 66, 'Choice · 问题类别', { fill: '#f3ecff', stroke: C.purple, size: 13 })}
  ${node(650, 160, 210, 90, ['代码规则', '组合 + 权限 + 阈值'], { fill: '#e8f9f7', stroke: C.cyan, size: 14 })}
  ${arrow(560, 88, 645, 175)}
  ${arrow(560, 168, 645, 190)}
  ${arrow(560, 248, 645, 205)}
  ${arrow(560, 328, 645, 225)}
`);

diagrams['judgment-decision'] = wrap('Judgment / Decision 分离', `
  ${node(40, 130, 160, 90, 'Input', { fill: '#eef1ff', stroke: C.blue })}
  ${node(260, 70, 220, 80, ['Jev · Judgments', '语义小问题'], { fill: '#f3ecff', stroke: C.purple, size: 14 })}
  ${node(260, 210, 220, 80, ['Code · Facts', '金额 / 权限 / 状态'], { fill: '#e8f9f7', stroke: C.cyan, size: 14 })}
  ${arrow(200, 165, 255, 110)}
  ${arrow(200, 170, 255, 250)}
  ${node(560, 140, 220, 90, ['Logic · Rules', '规则 + 阈值 + trace'], { fill: '#f8fafc', stroke: C.line, size: 14 })}
  ${arrow(480, 110, 555, 165)}
  ${arrow(480, 250, 555, 200)}
  ${node(830, 140, 55, 90, 'Decision', { fill: '#fff4e6', stroke: C.amber, size: 11 })}
  ${arrow(780, 185, 825, 185)}
  <text x="260" y="380" font-family="system-ui,sans-serif" font-size="15" fill="${C.ink}">Jev makes judgments, code makes decisions.</text>
  <text x="260" y="410" font-family="system-ui,sans-serif" font-size="13" fill="${C.soft}">高风险与不确定情况由人工审核处理。</text>
`);

diagrams['probability-distribution'] = wrap('Probability Distribution', `
  ${node(50, 90, 200, 80, ['Choice 分布', '0.85 / 0.10 / 0.05'], { fill: '#eef1ff', stroke: C.blue, size: 14 })}
  ${node(50, 210, 200, 80, ['Score 分布', '0.10 / 0.59 / 0.31'], { fill: '#e8f9f7', stroke: C.cyan, size: 14 })}
  ${node(50, 330, 200, 80, ['Noul', 'p = 0.92'], { fill: '#f3ecff', stroke: C.purple })}
  ${[[0.85, 'refund', C.blue], [0.10, 'rebook', C.purple], [0.05, 'info', C.cyan]].map(([v, l, c], i) => `
    <text x="330" y="${115 + i * 34}" font-family="system-ui,sans-serif" font-size="13" fill="${C.ink}">${l}</text>
    <rect x="410" y="${102 + i * 34}" width="${v * 340}" height="20" rx="6" fill="${c}"/>
    <text x="${420 + v * 340}" y="${117 + i * 34}" font-family="system-ui,sans-serif" font-size="12" fill="${C.soft}">${v}</text>`).join('')}
  ${[[0.10, 0], [0.59, 1], [0.31, 2]].map(([v, i]) => `
    <rect x="${410 + i * 115}" y="${290 - v * 220}" width="80" height="${v * 220}" rx="6" fill="${C.cyan}" opacity=".75"/>
    <text x="${450 + i * 115}" y="${305}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" fill="${C.soft}">L${i}</text>`).join('')}
`);

diagrams['confidence-policy'] = wrap('Confidence-aware Automation', `
  ${node(60, 110, 220, 90, ['Judgment', 'p / confidence'], { fill: '#eef1ff', stroke: C.blue, size: 14 })}
  ${arrow(280, 155, 330, 155)}
  ${node(350, 50, 200, 70, ['高概率 → 自动执行'], { fill: '#e8f9f7', stroke: C.cyan })}
  ${node(350, 150, 200, 70, ['中间带 → 请求确认'], { fill: '#fff7e8', stroke: C.amber })}
  ${node(350, 250, 200, 70, ['低概率 → 转人工'], { fill: '#fff0f2', stroke: C.red })}
  ${arrow(300, 150, 345, 85)}
  ${arrow(300, 155, 345, 185)}
  ${arrow(300, 160, 345, 285)}
  ${node(650, 150, 210, 90, ['Policy Layer', '风险分级阈值'], { fill: '#f3ecff', stroke: C.purple, size: 14 })}
  ${arrow(550, 85, 645, 165)}
  ${arrow(550, 185, 645, 190)}
  ${arrow(550, 285, 645, 215)}
  <text x="60" y="400" font-family="system-ui,sans-serif" font-size="14" fill="${C.soft}">同一概率在不同风险动作上应有不同阈值。</text>
`);

diagrams['calibration'] = wrap('Calibration：可靠性图', `
  <rect x="90" y="70" width="420" height="340" rx="10" fill="#ffffff" stroke="${C.line}"/>
  ${[0, .25, .5, .75, 1].map((v) => `<line x1="${90 + v * 420}" y1="70" x2="${90 + v * 420}" y2="410" stroke="#e6ebf4"/><line x1="90" y1="${410 - v * 340}" x2="510" y2="${410 - v * 340}" stroke="#e6ebf4"/>`).join('')}
  <line x1="90" y1="410" x2="510" y2="70" stroke="${C.cyan}" stroke-dasharray="7 5" stroke-width="2"/>
  <polyline points="130,385 218,330 306,250 394,175 470,105" fill="none" stroke="${C.blue}" stroke-width="3"/>
  ${[[130, 385], [218, 330], [306, 250], [394, 175], [470, 105]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="${C.purple}"/>`).join('')}
  ${node(590, 100, 250, 80, ['Brier Score', 'Σ(p−y)² / N'], { fill: '#f3ecff', stroke: C.purple, size: 14 })}
  ${node(590, 210, 250, 80, ['ECE', '按桶加权 |acc−conf|'], { fill: '#e8f9f7', stroke: C.cyan, size: 14 })}
  ${node(590, 320, 250, 80, ['用自有数据校准'], { fill: '#fff7e8', stroke: C.amber })}
`);

diagrams['agent-judgment-layer'] = wrap('Agent Judgment Layer', `
  ${node(35, 130, 150, 90, ['Orchestrator', '循环 / 状态'], { fill: '#eef1ff', stroke: C.blue, size: 14 })}
  ${node(250, 130, 190, 90, ['Judgment Layer', 'Jev Provider'], { fill: '#f3ecff', stroke: C.purple, size: 14 })}
  ${node(510, 70, 180, 70, ['Policy', '阈值 / 权限'], { fill: '#fff7e8', stroke: C.amber, size: 14 })}
  ${node(510, 190, 180, 70, ['Executors', '工具 / LLM'], { fill: '#e8f9f7', stroke: C.cyan, size: 14 })}
  ${node(760, 130, 120, 90, ['Verifier', '完成检查'], { fill: '#f8fafc', stroke: C.line, size: 14 })}
  ${arrow(185, 175, 245, 175)}
  ${arrow(440, 165, 505, 105)}
  ${arrow(440, 185, 505, 225)}
  ${arrow(690, 105, 755, 155)}
  ${arrow(690, 225, 755, 195)}
  ${arrow(820, 220, 120, 215, '下一轮')}
`);

diagrams['tool-routing'] = wrap('Tool Routing', `
  ${node(40, 130, 180, 90, ['Task', 'user request'], { fill: '#eef1ff', stroke: C.blue, size: 14 })}
  ${node(280, 130, 200, 90, ['Choice', 'tool candidates'], { fill: '#f3ecff', stroke: C.purple, size: 14 })}
  ${node(540, 130, 180, 90, ['Confidence Gate'], { fill: '#fff7e8', stroke: C.amber, size: 14 })}
  ${arrow(220, 175, 275, 175)}
  ${arrow(480, 175, 535, 175)}
  ${node(770, 50, 115, 60, 'search_web', { fill: '#e8f9f7', stroke: C.cyan, size: 13 })}
  ${node(770, 130, 115, 60, 'run_python', { fill: '#e8f9f7', stroke: C.cyan, size: 13 })}
  ${node(770, 210, 115, 60, 'query_db', { fill: '#e8f9f7', stroke: C.cyan, size: 13 })}
  ${arrow(720, 160, 765, 80)}
  ${arrow(720, 175, 765, 160)}
  ${arrow(720, 190, 765, 240)}
  ${node(540, 300, 180, 70, ['p < 阈值 → 不调用'], { fill: '#fff0f2', stroke: C.red, size: 13 })}
  ${arrow(630, 220, 630, 295)}
`);

diagrams['model-routing'] = wrap('Model Routing', `
  ${node(45, 130, 180, 90, 'State', { fill: '#eef1ff', stroke: C.blue })}
  ${node(285, 130, 210, 90, ['Score', 'task difficulty'], { fill: '#e8f9f7', stroke: C.cyan, size: 14 })}
  ${arrow(225, 175, 280, 175)}
  ${node(570, 60, 280, 70, ['score < 1 → 轻量模型'], { fill: '#f8fafc', stroke: C.line, size: 14 })}
  ${node(570, 150, 280, 70, ['1–2 → 标准模型'], { fill: '#f8fafc', stroke: C.line, size: 14 })}
  ${node(570, 240, 280, 70, ['> 2 → 推理模型'], { fill: '#f8fafc', stroke: C.line, size: 14 })}
  ${arrow(495, 160, 565, 95)}
  ${arrow(495, 175, 565, 185)}
  ${arrow(495, 190, 565, 275)}
  <text x="45" y="400" font-family="system-ui,sans-serif" font-size="14" fill="${C.soft}">先看 confidence；分布不清时优先选择更稳妥的模型。</text>
`);

diagrams['skill-routing'] = wrap('Skill Routing', `
  ${node(45, 130, 180, 90, 'Task', { fill: '#eef1ff', stroke: C.blue })}
  ${node(280, 130, 210, 90, ['Choice', 'skill list'], { fill: '#f3ecff', stroke: C.purple, size: 14 })}
  ${arrow(225, 175, 275, 175)}
  ${node(555, 60, 300, 66, 'summarize', { fill: '#f8fafc', stroke: C.line })}
  ${node(555, 145, 300, 66, 'translate', { fill: '#f8fafc', stroke: C.line })}
  ${node(555, 230, 300, 66, 'review_code', { fill: '#f8fafc', stroke: C.line })}
  ${arrow(490, 160, 550, 93)}
  ${arrow(490, 175, 550, 178)}
  ${arrow(490, 190, 550, 263)}
  ${node(555, 330, 300, 66, ['companion Noul：有技能适用吗?'], { fill: '#fff7e8', stroke: C.amber, size: 13 })}
`);

diagrams['human-in-the-loop'] = wrap('Human-in-the-loop', `
  ${node(45, 140, 170, 90, ['Judgment + Rules'], { fill: '#f3ecff', stroke: C.purple, size: 14 })}
  ${node(280, 140, 190, 90, ['Confidence Gate'], { fill: '#fff7e8', stroke: C.amber, size: 14 })}
  ${arrow(215, 185, 275, 185)}
  ${node(540, 60, 190, 70, ['自动执行'], { fill: '#e8f9f7', stroke: C.cyan })}
  ${node(540, 180, 190, 70, ['人工审核队列'], { fill: '#eef1ff', stroke: C.blue })}
  ${node(540, 300, 190, 70, ['请求澄清'], { fill: '#fff0f2', stroke: C.red })}
  ${arrow(470, 170, 535, 95)}
  ${arrow(470, 185, 535, 215)}
  ${arrow(470, 200, 535, 335)}
  ${node(790, 180, 95, 70, 'Label', { fill: '#f8fafc', stroke: C.line, size: 14 })}
  ${arrow(730, 215, 785, 215)}
  <text x="540" y="410" font-family="system-ui,sans-serif" font-size="13" fill="${C.soft}">审核结果回流为标注数据，用于阈值校准与回归测试。</text>
`);

diagrams['multi-provider'] = wrap('Multi-Provider 架构', `
  ${node(40, 140, 180, 90, ['Application'], { fill: '#eef1ff', stroke: C.blue })}
  ${node(280, 140, 220, 90, ['JudgmentProvider', '统一接口'], { fill: '#f3ecff', stroke: C.purple, size: 14 })}
  ${arrow(220, 185, 275, 185)}
  ${node(580, 55, 250, 66, 'JevProvider', { fill: '#e8f9f7', stroke: C.cyan })}
  ${node(580, 150, 250, 66, 'FakeProvider（测试）', { fill: '#f8fafc', stroke: C.line, size: 14 })}
  ${node(580, 245, 250, 66, 'FallbackProvider', { fill: '#fff7e8', stroke: C.amber, size: 14 })}
  ${arrow(500, 170, 575, 88)}
  ${arrow(500, 185, 575, 183)}
  ${arrow(500, 200, 575, 278)}
  <text x="580" y="360" font-family="system-ui,sans-serif" font-size="13" fill="${C.soft}">策略层不依赖具体供应商；单测使用确定性 Fake。</text>
`);

diagrams['fallback'] = wrap('Fallback 架构', `
  ${node(45, 140, 170, 90, ['Request'], { fill: '#eef1ff', stroke: C.blue })}
  ${node(275, 140, 180, 90, ['Primary Provider'], { fill: '#f3ecff', stroke: C.purple, size: 14 })}
  ${arrow(215, 185, 270, 185)}
  ${node(520, 60, 200, 70, ['成功 → 正常路径'], { fill: '#e8f9f7', stroke: C.cyan, size: 14 })}
  ${node(520, 180, 200, 70, ['429 / 529 / timeout'], { fill: '#fff7e8', stroke: C.amber, size: 14 })}
  ${arrow(455, 170, 515, 95)}
  ${arrow(455, 200, 515, 215)}
  ${node(770, 110, 115, 70, ['退避重试'], { fill: '#f8fafc', stroke: C.line, size: 13 })}
  ${node(770, 220, 115, 70, ['Fallback'], { fill: '#fff0f2', stroke: C.red, size: 13 })}
  ${arrow(720, 205, 765, 145)}
  ${arrow(720, 235, 765, 255)}
  <text x="275" y="380" font-family="system-ui,sans-serif" font-size="14" fill="${C.soft}">Fallback 不得静默返回默认答案并自动执行；应转人工或安全路径。</text>
`);

diagrams['evaluation-pipeline'] = wrap('Evaluation Pipeline', `
  ${node(35, 130, 140, 80, ['真实样本', '脱敏采样'], { fill: '#eef1ff', stroke: C.blue, size: 14 })}
  ${node(205, 130, 140, 80, ['标注', '原子判断'], { fill: '#f3ecff', stroke: C.purple, size: 14 })}
  ${node(375, 130, 140, 80, ['批量调用', '锁定版本'], { fill: '#e8f9f7', stroke: C.cyan, size: 14 })}
  ${node(545, 130, 140, 80, ['指标计算', 'BS / ECE'], { fill: '#f8fafc', stroke: C.line, size: 14 })}
  ${node(715, 130, 150, 80, ['阈值决策'], { fill: '#fff7e8', stroke: C.amber, size: 14 })}
  ${arrow(175, 170, 200, 170)}${arrow(345, 170, 370, 170)}${arrow(515, 170, 540, 170)}${arrow(685, 170, 710, 170)}
  ${node(205, 300, 220, 70, ['在线监控', '漂移 / 推翻率'], { fill: '#f8fafc', stroke: C.line, size: 14 })}
  ${node(500, 300, 220, 70, ['回归测试', 'CI 阻断发布'], { fill: '#f8fafc', stroke: C.line, size: 14 })}
  ${arrow(275, 210, 300, 295)}
  ${arrow(615, 210, 600, 295)}
`);

diagrams['judgment-runtime'] = wrap('Judgment Runtime 架构', `
  ${node(35, 120, 150, 80, ['Input', 'state + facts'], { fill: '#eef1ff', stroke: C.blue, size: 14 })}
  ${node(215, 60, 170, 70, ['Questions', '构造器'], { fill: '#f3ecff', stroke: C.purple, size: 14 })}
  ${node(215, 175, 170, 70, ['Cache', 'hash + TTL'], { fill: '#f8fafc', stroke: C.line, size: 14 })}
  ${node(430, 120, 170, 80, ['Provider', 'Jev / Fake'], { fill: '#e8f9f7', stroke: C.cyan, size: 14 })}
  ${node(645, 60, 200, 70, ['Policy', '阈值 / 风险'], { fill: '#fff7e8', stroke: C.amber, size: 14 })}
  ${node(645, 180, 200, 70, ['Audit Log', 'trace / usage'], { fill: '#f8fafc', stroke: C.line, size: 14 })}
  ${arrow(185, 150, 210, 95)}
  ${arrow(185, 175, 210, 205)}
  ${arrow(385, 95, 425, 140)}
  ${arrow(385, 205, 425, 175)}
  ${arrow(600, 145, 640, 95)}
  ${arrow(600, 175, 640, 205)}
  ${arrow(185, 250, 745, 255, 'fallback → human')}
`);

diagrams['primitives-compare'] = wrap('四种 Primitive 的选择路径', `
  ${node(340, 60, 220, 60, '要判断什么?', { fill: '#eef1ff', stroke: C.blue })}
  ${node(45, 170, 180, 66, ['图像中的位置?'], { fill: '#fff4e6', stroke: C.amber, size: 14 })}
  ${node(255, 170, 180, 66, ['命题为真吗?'], { fill: '#f3ecff', stroke: C.purple, size: 14 })}
  ${node(465, 170, 180, 66, ['有序等级?'], { fill: '#e8f9f7', stroke: C.cyan, size: 14 })}
  ${node(675, 170, 180, 66, ['互斥选项?'], { fill: '#eef1ff', stroke: C.blue, size: 14 })}
  ${arrow(400, 120, 135, 165)}${arrow(420, 120, 345, 165)}${arrow(480, 120, 555, 165)}${arrow(520, 120, 765, 165)}
  ${node(45, 300, 180, 60, 'Box（实验性）', { fill: '#f8fafc', stroke: C.amber, size: 14 })}
  ${node(255, 300, 180, 60, 'Noul', { fill: '#f8fafc', stroke: C.purple })}
  ${node(465, 300, 180, 60, 'Score', { fill: '#f8fafc', stroke: C.cyan })}
  ${node(675, 300, 180, 60, 'Choice', { fill: '#f8fafc', stroke: C.blue })}
  ${arrow(135, 236, 135, 295)}${arrow(345, 236, 345, 295)}${arrow(555, 236, 555, 295)}${arrow(765, 236, 765, 295)}
`);

for (const [name, content] of Object.entries(diagrams)) {
  await writeFile(resolve(outDir, `${name}.svg`), content, 'utf8');
}
console.log(`已生成 ${Object.keys(diagrams).length} 张本地 SVG 图。`);
