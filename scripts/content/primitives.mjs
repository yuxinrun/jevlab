export const articles = [
  {
    slug: 'choice-principle', category: 'primitives', title: 'Choice 原理与概率分布',
    description: 'Choice 的答案空间、probabilities 与 confidence 的关系，以及为什么它会强制选一个。', tags: ['Choice', '概率'],
    body: `## 学习目标

理解 Choice 的语义契约：从给定选项中选择一个，并返回完整分布。

![Choice 结构](/jevlab/diagrams/choice.svg)

## 什么时候用 Choice

官方定义：从**已知且无顺序关系**的选项中选一个。典型场景：意图分类、工具路由、模型路由、文档分类、技能选择。

如果用 Choice 表达“严重程度”，就丢失了等级顺序信息；那应该用 Score。

## 请求结构

\`\`\`json
{
  "intent": {
    "type": "choice",
    "instructions": "What is the primary intent in \`ticket.message\`?",
    "criteria": {
      "refund": "The user wants money returned.",
      "rebooking": "The user wants a replacement flight.",
      "information": "The user only asks for information."
    }
  }
}
\`\`\`

\`criteria\` 是必填 map，1–255 项。选项名建议使用稳定的机器标识（snake_case），描述写给模型看。

## 响应结构

\`\`\`json
{
  "type": "choice",
  "choice": "refund",
  "confidence": 0.7,
  "probabilities": {"refund": 0.85, "rebooking": 0.10, "information": 0.05}
}
\`\`\`

\`probabilities\` 覆盖所有给定选项，总和约等于 1；\`choice\` 是概率最高的选项。

## 概率分布怎么用

1. **Top probability**：\`p = probabilities[choice]\`，直接表示所选选项的概率。
2. **Top-to-second ratio**：\`p_max / p_second\`，衡量第一名相对第二名的优势。
3. **confidence**：分布集中度的归一化摘要。

官方 confidence 文档给出 Choice 公式：

\`\`\`text
confidence = (p_max - 1/n) / (1 - 1/n)
\`\`\`

例如三选项时 \`(0.6, 0.3, 0.1)\` 与 \`(0.6, 0.2, 0.2)\` 的 confidence 都是 0.4——它不区分第二名强弱。

## 强制选择与 companion Noul

Choice 总会返回一个选项，即使没有合适项。不要加入 \`other\` 或 \`none of the above\` 这类兜底选项；官方建议加一个独立的 Noul 判断“是否有选项适用”，然后在代码中处理。

\`\`\`python
questions = {
    "route": Choice(instructions="...", criteria={...}),
    "any_match": Noul(instructions="Does at least one route describe the request?"),
}
\`\`\`

## 阈值策略

官方建议对“将执行选项的概率”设阈值，而不是对 confidence 设阈值：

\`\`\`python
a = response.answers["route"]
p = a.probabilities[a.choice]
if p < 0.67:
    route_to_human()
elif a.choice == "check_balance":
    show_balance()
elif a.choice == "approve_transfer" and p > 0.93:
    confirm_then_execute()
\`\`\`

同一个系统里，低风险动作阈值可以低，高风险动作必须高。

## 常见问题

**概率会不会是 0 或 1？** 官方示例中出现 0 和 1；工程上仍应做边界防御。

**阈值多少合适？** 没有通用值。从保守阈值开始，用自己的标注数据评估。

## 延伸阅读

- [Choice 选项与 Criteria 设计](/jevlab/articles/choice-design/)
- [Choice Confidence 与阈值](/jevlab/articles/choice-confidence/)`
  },

  {
    slug: 'choice-design', category: 'primitives', title: 'Choice 选项与 Criteria 设计',
    description: '互斥性、粒度、命名、高基数与 complement Noul 的实操准则。', tags: ['Choice', '设计'],
    body: `## 学习目标

设计出稳定、互斥、可维护的选项集合，避免“模型选错”其实是“选项设计错”。

## 准则一：互斥且同层级

错误示例：把 \`billing\`、\`technical\`、\`urgent_bug\` 放在一起——\`urgent_bug\` 与前两者不在同一维度。

正确做法：先按维度拆分问题，或用两级 Choice：先选类别，再选严重程度（Score）。

## 准则二：完整覆盖

Choice 会强制选一项。如果你无法保证列表覆盖所有情况：

1. 加入一个 Noul 判断“是否有任何选项适用”。
2. 在代码中对 Noul 低概率走澄清或人工路径。

不要加入 \`other\`——它会成为垃圾桶，掩盖真实的长尾需求。

## 准则三：描述比名字重要

\`\`\`json
"criteria": {
  "refund": "The user explicitly asks for money to be returned.",
  "rebooking": "The user asks for a different flight or date.",
  "status": "The user asks when something will happen."
}
\`\`\`

选项名是代码标识；criteria 文本才定义语义边界。把边界写进描述，而不是写进 prompt 注释。

## 准则四：控制基数

官方 Choice 上限 255；发布博客称超过时走两阶段（先 scoring 再 choice），可能变慢。实践建议：

- 路由类：3–20 项。
- 分类类：控制在 50 项以内。
- 极大集合：分层（先大类，再子类）或改成两次请求。

## 准则五：稳定命名

选项名一旦进入日志、缓存键和业务规则，就不要轻易改名。改名等同于接口 breaking change。

## Python 示例

\`\`\`python
from typesafe_sdk import Choice, Noul, TypeSafeClient

ROUTES = {
    "billing": "Payment, invoice or subscription issues.",
    "technical": "Bugs, outages or integration failures.",
    "sales": "Pricing, plans or account upgrades.",
}

with TypeSafeClient(model="jev-1.14.0") as client:
    r = client.system_one(
        state={"message": msg},
        questions={
            "route": Choice(instructions="Main request in \`message\`", criteria=ROUTES),
            "route_applicable": Noul(instructions="Does any listed route describe \`message\`?"),
        },
    )
    route = r.answers["route"]
    p = route.probabilities[route.choice]
    if r.answers["route_applicable"].noul < 0.5 or p < 0.7:
        handle_manually(msg)
    else:
        dispatch(route.choice)
\`\`\`

预期结果：模型给出 route 与分布；代码根据 Noul 与 p 决定是否自动派发。这段示例使用官方 Python SDK 的公开 API，需设置 \`TYPESAFE_API_KEY\` 后才能真实运行。

## 常见错误

| 错误 | 表现 | 修复 |
| --- | --- | --- |
| 选项重叠 | 概率分散在两项 | 重写 criteria 边界 |
| 缺少覆盖 | 分布平坦但仍选出一项 | 加 companion Noul |
| 描述含糊 | 结果随版本漂移 | 写清正反例 |
| 选项过多 | 延迟上升 | 分层 |

## 延伸阅读

- [Noul 原理](/jevlab/articles/noul-truth/)
- [官方文档 · Choice](https://docs.typesafe.ai/primitives/choice)`
  },

  {
    slug: 'choice-confidence', category: 'primitives', title: 'Choice Confidence 与阈值',
    description: '用官方公式理解 confidence，并学会用 p_max、ratio 与风险分级设计路由策略。', tags: ['Confidence', '阈值'],
    body: `## 学习目标

能解释 confidence 的含义，知道什么时候不该用它，并设计按风险分级的阈值。

## confidence 是分布的摘要

官方公式（n 个选项，p_max 为最高概率）：

\`\`\`text
confidence = (p_max − 1/n) / (1 − 1/n)
\`\`\`

均匀分布时为 0；全部集中在单一选项时为 1。含义是“比均匀分布高出多少”。

\`\`\`python
def choice_confidence(probabilities: list[float]) -> float:
    n = len(probabilities)
    return (max(probabilities) - 1 / n) / (1 - 1 / n)
\`\`\`

## 它不告诉你什么

- 不区分第二名强弱：\`(0.6, 0.3, 0.1)\` 与 \`(0.6, 0.2, 0.2)\` 都是 0.4。
- 不等于“答案正确的概率”。
- 依赖选项数量：不同 n 的 confidence 不可直接横向比较。

因此官方建议 Choice 场景通常对 \`p = probabilities[choice]\` 设阈值，而不是对 confidence 设阈值。

## 三个可选指标

| 指标 | 含义 | 适用 |
| --- | --- | --- |
| \`p_max\` | 所选选项概率 | 阈值可解释，依赖选项数 |
| \`p_max / p_second\` | 第一对第二优势 | 实际只在头两名间决策 |
| \`confidence\` | 归一化集中度 | 跨选项数比较分布形状 |

## 三档动作

| 区间 | 动作 |
| --- | --- |
| 高概率 | 自动执行 |
| 中概率 | 确认、标记审核、收集更多信息 |
| 低概率 | 不执行，转人工或澄清 |

## 按风险分级

\`\`\`typescript
const a = res.answers.action;
const p = a.probabilities[a.choice];

if (p < 0.67) return routeToHuman();
if (a.choice === 'check_balance') return showBalance();
if (a.choice === 'approve_transfer') {
  return p > 0.93 ? confirmThenExecute() : askUserToConfirm();
}
return askUserToConfirm();
\`\`\`

同样的 p，对不同动作意味着不同风险容忍度。这是“策略层”的职责，不应写进模型 prompt。

## 阈值如何校准

1. 标注一批真实样本。
2. 记录选择结果与 p。
3. 画 reliability diagram：按 p 分桶，比较平均 p 与实际正确率。
4. 选择满足目标错误率的阈值。
5. 模型版本变化时重做。

## 常见错误

- 直接用厂商示例里的 0.93 当生产阈值。
- 用 confidence 跨不同选项数的任务比较。
- 阈值只有一个，不区分动作风险。

## 延伸阅读

- [Probability 与 Confidence](/jevlab/articles/probability-confidence/)
- [Calibration](/jevlab/articles/calibration/)`
  },

  {
    slug: 'score-rubric', category: 'primitives', title: 'Score 与 Rubric 设计',
    description: '有序等级、score 的加权平均性质、legend 与 confidence 的等级距离语义。', tags: ['Score', 'Rubric'],
    body: `## 学习目标

设计有序 rubric，解释 score 为什么可以是小数，并正确设置 Score 的阈值。

![Score 结构](/jevlab/diagrams/score.svg)

## Score 回答什么

官方定义：在有顺序的等级谱系上定位。适合 bug 严重度、客户沮丧程度、技能水平、风险等级。

请求中 \`criteria\` 是有序数组，位置决定 score，**从 0 开始**：

\`\`\`json
{
  "severity": {
    "type": "score",
    "instructions": "How severe is \`bug_report\`?",
    "criteria": ["Cosmetic", "Minor", "Major", "Blocks release"]
  }
}
\`\`\`

## 响应字段

\`\`\`json
{
  "type": "score",
  "score": 1.42,
  "confidence": 0.55,
  "legend": {"0": "Cosmetic", "1": "Minor", "2": "Major", "3": "Blocks release"},
  "probabilities": {"0": 0.10, "1": 0.48, "2": 0.37, "3": 0.05}
}
\`\`\`

\`score\` 是概率加权平均，可以落在两个整数等级之间。\`legend\` 把编号映射回描述，\`probabilities\` 是每个等级的概率。

## confidence 的等级距离语义

Score 的 confidence 不只是看最高概率，还看概率离最高等级有多远：

\`\`\`text
confidence = max(0, 1 − Σ p_i |i − m| / MAD_unif)
MAD_unif = (1/n) Σ |i − (n−1)/2|
\`\`\`

官方例子：三等级时 \`(0, 0.5, 0.5)\` → 0.25（相邻分裂），\`(0.5, 0, 0.5)\` → 0（两端分裂）。远端分裂更严重。

## Rubric 设计原则

1. **等级必须有明确顺序**，不能是不同类型。
2. **每级写可观察的行为**，不要写“比较好”“有点严重”。
3. **等级数量 3–5 通常足够**；Schema 上限是 10。
4. **包含边界案例描述**，例如“阻塞发布”需说明具体影响。
5. **不要让相邻等级只差一个形容词**。

## 路由示例

\`\`\`python
s = response.answers["severity"]
if s.confidence < 0.5:
    send_to_triage(report_id)
elif s.score < 1.5:
    add_to_backlog(report_id)
elif s.score < 2.5:
    add_to_sprint(report_id)
else:
    message_on_call(report_id)
\`\`\`

官方建议：先用 confidence 判断分布是否清晰，再按 score 或指定等级概率路由。

## 常见错误

- 把 score 当成整数等级使用，忽略中间值。
- 概率分裂在两端却只看 score 平均值（平均落在中间，掩盖极端意见）。
- 等级描述重叠导致长期低 confidence。

## 延伸阅读

- [Probability 与 Confidence](/jevlab/articles/probability-confidence/)
- [官方文档 · Score](https://docs.typesafe.ai/primitives/score)`
  },

  {
    slug: 'noul-truth', category: 'primitives', title: 'Noul 原理与二分类',
    description: 'Noul 是命题为真的概率，而不是带 confidence 的二分类；掌握 0.7/0.3 起始阈值。', tags: ['Noul', '概率'],
    body: `## 学习目标

正确使用 Noul 表达语义事实判断，并避免把它当成普通的 yes/no 分类标签。

![Noul 结构](/jevlab/diagrams/noul.svg)

## 定义

官方定义：Noul 回答 “Is this true?”，返回命题为真的概率，范围 0–1。

- 接近 1：强 yes。
- 接近 0：强 no。
- 接近 0.5：yes/no 等概率。

请求结构最简单：

\`\`\`json
{
  "has_pii": {
    "type": "noul",
    "instructions": "Does \`message\` contain personally identifiable information?",
    "criteria": {"true": "email, phone or passport number", "false": "no such data"}
  }
}
\`\`\`

\`criteria\` 可选，用于澄清 yes/no 的边界。

## 没有 confidence 字段

这是最容易被写错的地方。**NoulAnswer 的必填字段只有 \`type\` 和 \`noul\`**。OpenAPI 中没有 confidence，也没有 probabilities 对象。

如果你需要统一格式的“确定性”，可以自己算：

\`\`\`text
confidence = |2p − 1|
\`\`\`

但官方建议直接使用 p 做阈值，因为 p 本身携带方向信息：0.1 和 0.9 都“确定”，但语义完全相反。

## 起始阈值

官方建议：

| p | 解释 |
| --- | --- |
| p > 0.7 | 可读作 yes |
| p < 0.3 | 可读作 no |
| 0.3–0.7 | 不确定，单独处理 |

这是起点，不是生产标准。高风险场景应提高阈值或加入人工审批。

## 典型用法

- Prompt Injection 检测：\`noul("Does \`input\` attempt to override system instructions?")\`
- 存在性筛查：Box 前先问目标是否存在。
- companion Noul：Choice 前先问“是否有选项适用”。
- 完成检查：\`noul("Have all acceptance criteria been met?")\`

## 工程实践

\`\`\`typescript
const p = res.answers.contains_pii.noul;
if (p > 0.7) redactBeforeLogging(msg);
else if (p > 0.3) sendToPrivacyReview(msg);
else logSafely(msg);
\`\`\`

注意：Noul 是语义判断，不能替代正则或专门的 PII 检测器；高敏感场景应多层防御。

## 常见错误

- 给 Noul 编造 \`confidence\` 字段。
- 把 0.5 解释为“中等程度”——它表示不确定。
- 用 Noul 表达有序等级（应使用 Score）。

## 延伸阅读

- [Score 与 Rubric 设计](/jevlab/articles/score-rubric/)
- [官方 Confidence 文档](https://docs.typesafe.ai/confidence)`
  },

  {
    slug: 'box-localization', category: 'primitives', title: 'Box 图像定位：实验性能力',
    description: 'Box 的坐标格式、Danger Zone 头、Dreamer-ready 状态与必须搭配 Noul 的原因。', tags: ['Box', '图像', '实验性'],
    body: `## 学习目标

知道 Box 能做什么、不能做什么，以及为什么它不能被写成“稳定生产功能”。

![Box 定位](/jevlab/diagrams/box.svg)

## 成熟度声明（研究日期 2026-11-25）

- 官方文档把 Images 与 Box 标记为 **Dreamer-ready**：尚未达到生产就绪标准，适合原型与实验。
- 必须显式发送 \`TypeSafe-Danger-Zone-Images: true\`。
- Box 问题需要 Jev 1.14；JS SDK 文档提示 box 请求应使用 \`jev-preview\`，而 Models 页说明 \`jev-preview\` 当前指向 \`jev-1.14.0\`。以你使用的 SDK 版本文档为准。
- 官方 1.14 博客称这些功能仍有较多 jaggedness，**不建议用于生产场景**；多模态表现通常弱于纯文本。

本站因此不把 Box 描述为稳定能力。

## 请求示例（官方 multipart 形式）

\`\`\`bash
curl https://api.typesafe.ai/v1/systemone \\
  -H "Authorization: Bearer $TYPESAFE_API_KEY" \\
  -H "TypeSafe-Danger-Zone-Images: true" \\
  -F 'request={
    "model": "jev-1.14.0",
    "state": {"photo": "kitchen-1"},
    "assets": {"kitchen-1": {"type": "image", "part": "kitchen-photo"}},
    "questions": {
      "mug_visible": {"type": "noul", "instructions": "Is there a coffee mug in \`photo\`?"},
      "mug": {"type": "box", "instructions": "the coffee mug in \`photo\`"}
    }
  };type=application/json' \\
  -F 'kitchen-photo=@kitchen.jpg;type=image/jpeg'
\`\`\`

图片仅支持 PNG / JPEG；asset 名称必须唯一且恰好被一处引用。

## 响应结构

\`\`\`json
{
  "mug": {
    "type": "box",
    "box": {"top": 0.25, "bottom": 0.82, "left": 0.44, "right": 0.84},
    "confidence": 0.92
  }
}
\`\`\`

坐标是图像宽高比例：左上角 (0,0)，右下角 (1,1)。转像素：

\`\`\`python
x1 = round(box["left"] * width)
y1 = round(box["top"] * height)
x2 = round(box["right"] * width)
y2 = round(box["bottom"] * height)
\`\`\`

OpenAPI 中 \`BoxAnswer.confidence\` 允许 null；文档正文描述为 0–1 数值。生产代码应同时处理数值与 null。

## Box 永远返回一个框

官方明确提醒：即使目标不在图中，Box 也会返回坐标，没有 “not found” 答案。因此必须搭配 Noul：

\`\`\`python
visible = r.answers["mug_visible"].noul
if visible > 0.7:
    use_box(r.answers["mug"].box)
else:
    ignore_box()
\`\`\`

## 低置信度处理

官方建议：换更清晰的图片、使用更高分辨率的局部裁剪、裁剪前适当扩大边界避免切掉目标。不要在没有验证的情况下把低置信度结果用于自动化点击。

## Browser Agent 的启示

GUI 元素定位是 Box 的诱人场景，但实验性状态意味着：

- 必须保留人工确认或重试路径。
- 不能把坐标直接当作可执行动作。
- 应记录每次定位的 confidence 与最终成功率。

## 延伸阅读

- [官方 Box 文档](https://docs.typesafe.ai/primitives/box)
- [Jev 1.14 发布博客](https://typesafe.ai/blog/jev-1-14)`
  },

  {
    slug: 'primitives-compare', category: 'primitives', title: '四种 Primitive 怎么选',
    description: '用决策树和对照表确定 Choice / Score / Noul / Box 的适用范围与组合方式。', tags: ['Primitives', '决策树'],
    body: `## 学习目标

面对一个业务需求，能快速判断应该用哪种 primitive，或是否需要拆成多个问题。

![四种原语选择](/jevlab/diagrams/primitives-compare.svg)

## 决策树

\`\`\`text
需要定位图像区域？ ── 是 → Box（实验性，需 Danger Zone 头）
        │否
        ▼
答案是 yes/no 且概率本身有用？ ── 是 → Noul
        │否
        ▼
答案之间有明确顺序？ ── 是 → Score
        │否
        ▼
从预定义互斥选项中选一个 → Choice
\`\`\`

## 对照表

| 类型 | 问题 | 输出 | confidence | probabilities |
| --- | --- | --- | --- | --- |
| Choice | Which option? | \`choice\` | 有 | 有（每个选项） |
| Score | Which level? | \`score\` | 有 | 有（每个等级） |
| Noul | Is this true? | \`noul\` | **无** | 单值 p |
| Box | Where is it? | \`box\` 坐标 | 有（可 null） | 无 |

## 常见组合

| 场景 | 组合 |
| --- | --- |
| 工具路由 | Choice + companion Noul |
| 风险分级 | Score + confidence gate |
| 图像定位 | Noul（存在性）+ Box（坐标） |
| 审核流 | 多个 Noul + 代码规则 |
| 复杂决策 | 多个原子判断 + 确定性逻辑 |

## 反例

- 用 Score 表达“颜色”：颜色无序，应用 Choice。
- 用 Noul 表达“非常紧急”：有序程度应用 Score。
- 用 Choice 加 \`other\` 兜底：应改用 companion Noul。
- 用 Box 判断目标是否存在：Box 永远返回框，必须加 Noul。

## 组合示例

\`\`\`json
{
  "state": {"ticket": "..."},
  "questions": {
    "category": {"type": "choice", "instructions": "...", "criteria": {"billing": "...", "technical": "..."}},
    "category_applicable": {"type": "noul", "instructions": "Does any category apply?"},
    "urgency": {"type": "score", "instructions": "...", "criteria": ["low", "medium", "high"]},
    "contains_threat": {"type": "noul", "instructions": "..."}
  }
}
\`\`\`

一次请求，四个判断，彼此隔离。代码决定最终动作。

## 延伸阅读

- [Choice 原理](/jevlab/articles/choice-principle/)
- [Score Rubric](/jevlab/articles/score-rubric/)
- [Noul 原理](/jevlab/articles/noul-truth/)
- [Box 图像定位](/jevlab/articles/box-localization/)`
  },
];
