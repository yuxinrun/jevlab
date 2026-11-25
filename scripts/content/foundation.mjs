export const articles = [
  {
    slug: 'intro-what-is-jev', category: 'introduction', title: 'Jev 是什么？',
    description: '从官方定义出发理解 Jev 的产品定位、接口边界、版本与它不是什么。', tags: ['Jev', 'System One', '定位'],
    body: `## 学习目标

读完本文，你应该能回答：Jev 是谁做的、它解决什么问题、它的输入输出是什么、它与 Agent Framework 的边界在哪里，以及研究它时哪些结论是不能下的。

## 背景与问题

应用系统里存在大量“小判断”：用户是不是在要求退款？这条消息是否带有威胁？这个 bug 该进哪个冲刺？这些问题需要语义理解，但又不需要长篇推理。传统做法是让 LLM 生成一段文本，再让代码从中解析出结构——这一步既脆弱又不可预测。

TypeSafe 给出的答案是 Jev：直接返回结构化答案的模型服务。

> 官方定义（Introduction）："Jev is TypeSafe's flagship model and the first System One model. Send state and typed questions; get structured answers your code can use directly."

![Jev 总体架构图](/jevlab/diagrams/jev-architecture.svg)

## 它是什么

- **开发者与服务提供方**：TypeSafe。Jev 是闭源模型服务，通过 API 和官方 SDK 使用。
- **模型类别**：第一个 System One model。System One 是为快速、结构化、软件可直接使用的判断而设计的一类模型。
- **输入**：一个 \`state\`（字符串、JSON 对象或数组，图像需额外 assets）和一组带 ID 的 \`questions\`。
- **输出**：按 question ID 组织的 \`answers\`，每个答案是带类型的结构（Choice / Score / Noul / Box），以及 \`usage\`。
- **核心承诺**："Jev evaluates typed questions against a state and returns structured results directly. No text generation, no parsing."

## 它不是什么

这一点决定你能不能正确使用它：

| 它不是 | 原因 |
| --- | --- |
| Agent Framework | 它不提供循环、工具调度、记忆或状态机 |
| LangGraph 式 Orchestration Runtime | 执行图与重试策略由你的代码决定 |
| Pi 式 Agent Core | 没有自主规划或多步执行能力 |
| 可下载源码的开源模型 | 架构、权重、训练数据与采样实现均未公开 |
| 最终业务决策者 | 官方明确说：Jev makes judgments, code makes decisions |

因此，本站不会描述它的网络结构、参数量、训练语料或未公开的采样细节；这些都没有公开依据。

## 版本与 API 基线（研究日期 2026-11-25）

| 项目 | 值 | 来源 |
| --- | --- | --- |
| 最新稳定模型 | \`jev-1.14.0\`（2026-10-14 起可用） | Models / Jev 1.14 博客 |
| 默认别名 | \`jev-latest\`，SDK 默认值 | Quickstart / Models |
| Preview 别名 | \`jev-preview\`，当前也指向 1.14.0，暂无独立 preview 构建 | Models |
| API 版本 | \`0.2.0\`（OpenAPI 3.1.0） | api.typesafe.ai/openapi.json |
| 端点 | \`GET /v1/models\`、\`POST /v1/systemone\` | OpenAPI |
| Python SDK | \`typesafe-sdk\`（模块 \`typesafe_sdk\`） | SDK 文档 |
| JavaScript SDK | \`@typesafe-ai/sdk\`（文档关联 v0.7.0） | SDK 文档 |

文档URL 会变化，本站始终以 \`llms.txt\` 为索引入口，用 \`.md\` 版本核对原文。

## 一次调用的完整形状

\`\`\`bash
curl https://api.typesafe.ai/v1/systemone \\
  -H "Authorization: Bearer $TYPESAFE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "jev-1.14.0",
    "state": {"message": "My flight was cancelled. Can I get a refund?"},
    "questions": {
      "refund_requested": {"type": "noul", "instructions": "Does the message request a refund?"},
      "request_type": {
        "type": "choice",
        "instructions": "What is the main request?",
        "criteria": {"refund": "wants money back", "rebooking": "wants another flight"}
      }
    }
  }'
\`\`\`

响应按 question ID 返回：

\`\`\`json
{
  "model": "jev-1.14.0",
  "answers": {
    "refund_requested": {"type": "noul", "noul": 0.98},
    "request_type": {
      "type": "choice", "choice": "refund",
      "confidence": 0.7,
      "probabilities": {"refund": 0.85, "rebooking": 0.15}
    }
  },
  "usage": {"input_tokens": 428, "output_tokens": 73}
}
\`\`\`

上面的数值是结构示例，不是真实调用结果；实际值随输入和模型版本变化。

## 常见问题

**Jev 会不会“幻觉”？** 厂商文章称其 "can't hallucinate"，但边界是输出被预定义结构约束：它不能生成范围外的选项或类型错误。这不等于开放式事实问答绝对正确，也不能把厂商声明当作独立验证。

**我需要自己部署模型吗？** 不需要也不能。它是托管服务，通过 API Key 调用。

**可以用它替代规则引擎吗？** 不应该。精确计算交给代码，Jev 只回答代码回答不了的语义小问题。

## 设计取舍

把 Jev 放在“判断层”而不是“决策层”，换来的是可观测性与可替换性：你可以看到六个判断的分数与代码路径，而不是只有一个“模型选错了”。代价是需要自己设计问题拆分与组合规则。

## 延伸阅读

- [System One 模型是什么？](/jevlab/articles/intro-system-one/)
- [Judgment 与 Decision 分离](/jevlab/articles/judgment-vs-decision/)
- 官方：https://docs.typesafe.ai/introduction · https://docs.typesafe.ai/models`
  },

  {
    slug: 'intro-system-one', category: 'introduction', title: 'System One 模型是什么？',
    description: 'System One 是模型类别而非具体产品：理解它的定义、来源、训练主张与能力边界。', tags: ['System One', '概念'],
    body: `## 学习目标

理解 System One 作为一个“模型类别”的含义，区分官方声明与可独立验证的结论，并知道它适合放在系统的哪一层。

## 定义

官方原文：

> "System One models are a class of AI models built to make fast, structured decisions that software can use directly."
> "A System One model evaluates a state and returns typed answers and probabilities."

两个关键词：

1. **structured decisions for software**：输出是代码能直接使用的值，不是给人读的文本。
2. **probabilities**：不确定性以数值形式返回，而不是藏在 token 概率里。

![System One 概念图](/jevlab/diagrams/system-one-concept.svg)

## 为什么叫 System One

名字来自 Daniel Kahneman《Thinking, Fast and Slow》中的 System 1 / System 2：前者快速、直觉、自动；后者缓慢、审慎、费力。官方博客明确说，Jev 的重点是 "fast, focused judgments"，所以属于 System One。

这里的类比是**产品定位层面的类比**，不是对模型内部机制的声明。不要据此推断 Jev 复现了人脑的认知机制。

## 官方训练主张与边界

官方概念页写道：

> "System One models are trained for calibrated decisions: their probabilities are optimized against outcomes to reflect uncertainty."

同时明确说明：校准是在一组预测上衡量的，**不保证单个答案正确**。

发布博客进一步公开了三个名称：新模型架构（未披露细节）、parallel sampler（并行采样器，未披露实现）、RLCD（Reinforcement Learning for Calibrated Decisions，优化“epistemically honest probabilities”）。这些是厂商公开声明；没有公开算法公式、训练数据、参数规模或独立评测，因此本站只做转述，不做技术推断。

## 与传统 LLM 的差异

| 维度 | System One | 传统 LLM |
| --- | --- | --- |
| 输出 | typed answers + probabilities | 自由文本 |
| 答案空间 | Choice / Score / Noul / Box 预定义 | 开放式生成 |
| 擅长 | 快速、聚焦的语义判断 | 内容生成、开放推理 |
| 不擅长 | 写回复、写代码、解释推理 | 稳定地输出可直接消费的结构 |
| 不确定性表达 | 结果层概率 | token 概率，需额外处理 |

官方说 System One "do not write replies, produce code, or generate explanations of their reasoning"。这意味着它天然适合做管线中的一个节点，而不是端到端助手。

## 工作流中的位置

一个典型模式：

1. 构造 \`state\`：用户消息、订单、政策文本、检索片段。
2. 一次请求里提出多个独立问题。
3. 拿到 typed answers 与概率。
4. 代码结合确定性事实（金额、权限、状态机）形成决策。
5. 不确定或高风险路径转人工。

![判断与决策分离](/jevlab/diagrams/judgment-decision.svg)

## 设计取舍

System One 的约束是优势也是限制：答案空间被预定义，意味着不会有格式漂移；但也意味着你必须先想清楚要问什么。把复杂问题塞进一个 Choice，本质上是在用 prompt 模拟决策树，会把可观测性全部丢掉。

## 常见问题

**System One 是一个产品吗？** 不是。它是模型类别；Jev 是该类别的第一个模型。

**它比 LLM 更“聪明”吗？** 官方的速度与智能声明限定在 System One tasks，且来自厂商自报评测，不能外推为通用能力。

**我能训练自己的 System One 模型吗？** 官方没有公开训练方法或开源权重；不能基于公开资料复现。

## 延伸阅读

- [Jev 是什么？](/jevlab/articles/intro-what-is-jev/)
- [为什么软件需要 Judgment Model？](/jevlab/articles/intro-why-judgment/)
- 官方：https://docs.typesafe.ai/concepts/system-one`
  },

  {
    slug: 'intro-why-judgment', category: 'introduction', title: '为什么软件需要 Judgment Model？',
    description: '从 if-statement 的语义缺口出发，解释判断模型的工程价值与适用边界。', tags: ['架构', 'Judgment'],
    body: `## 学习目标

理解“语义判断”为什么不能完全靠规则、也不能完全靠生成式 LLM，并掌握判断层的抽象位置。

## 问题：代码无法直接理解语义

软件擅长精确判断：

\`\`\`python
if order.amount <= 25 and order.paid and policy.eligible:
    issue_refund(order.id)
\`\`\`

但下面这些问题没有精确答案：

- 用户消息是不是在要求退款？
- 用户是否声称遭遇未经授权的扣款？
- 这段回复是否真的引用了来源？
- 当前页面里“提交”按钮在哪里？

它们是**语义事实**，需要理解语言或图像，但答案要足够结构化，才能进入代码分支。

## 传统方案的三个痛点

1. **LLM 文本解析**：让模型输出“请用 JSON 回答”，然后用正则或 JSON parser 兜底。格式漂移、字段缺失、枚举外取值都会进入生产路径。
2. **把判断写成巨型 prompt**：把全部业务规则写进 chain-of-thought。规则一变就要重写 prompt，出错时只有一段文本可看。
3. **纯规则引擎**：无法处理自然语言与视觉输入，长尾规则膨胀后不可维护。

## 判断层的定义

Judgment Model 的职责很窄：对给定 state 回答一组范围清晰的问题，返回带概率的类型化答案。

\`\`\`text
事实（Facts）      → 代码：金额、权限、时间、状态
语义判断（Judgment）→ 模型：意图、风险、等级、位置
决策（Decision）   → 代码：规则组合 + 策略阈值 + 人工审核
\`\`\`

官方对此的表述是：

> "Code is great for answering what it can answer exactly. Jev answers only the small questions code can't. Logic then combines those answers into the decision."

## 一个可运行的心智模型

\`\`\`typescript
type Judgment = { p: number; threshold: number };

function decide(j: Record<string, Judgment>, facts: { amount: number; verified: boolean }) {
  if (!facts.verified) return 'human_review';
  if (j.unauthorized.p >= 0.85) return 'fraud_team';
  if (j.wants_refund.p < 0.7) return 'clarify';
  if (facts.amount <= 25 && j.policy_match.p >= 0.8) return 'auto_refund';
  return 'human_review';
}
\`\`\`

注意：模型只提供 \`p\`，所有业务含义都在代码里。这就是“智能放在正确的抽象层”。

## 什么时候不需要 Judgment Model

- 规则完全可枚举且输入是结构化字段：直接用代码。
- 需要生成长文本、代码或解释：用 LLM。
- 判断无法拆成清晰问题：先做需求澄清，不要先选模型。

## 工程实践

判断层上线前要回答三个问题：

1. **可观测性**：每个判断的分数是否被记录？
2. **可回退性**：概率低于阈值时是否有确定路径？
3. **可评估性**：是否有标注集验证阈值与校准？

## 延伸阅读

- [Jev 与传统 LLM 的区别](/jevlab/articles/intro-vs-llm/)
- [Atomic Questions](/jevlab/articles/atomic-questions/)
- 官方：https://typesafe.ai/blog/dont-call-it-a-decision-model`
  },

  {
    slug: 'intro-vs-llm', category: 'introduction', title: 'Jev 与传统 LLM 的区别',
    description: '逐项比较输出形态、答案空间、概率语义、延迟与失败模式，避免把 Jev 当成聊天模型。', tags: ['对比', 'LLM'],
    body: `## 学习目标

能够向团队解释：为什么“让 LLM 输出 JSON”与“使用类型化判断模型”不是同一件事。

![LLM 与 Jev 对比](/jevlab/diagrams/llm-vs-jev.svg)

## 六个关键差异

### 1. 输出契约

LLM 输出 token 序列；即使使用 JSON mode 或 structured output，也仍需处理解析失败、枚举外取值与字段缺失。Jev 的响应 schema 在 OpenAPI 中固定：\`answers.<id>\` 的结构由 question 的 \`type\` 判别器决定。

### 2. 答案空间

Choice 的 \`criteria\` 是一个 map，最多 255 个选项；Score 的 \`criteria\` 是有序数组，最多 10 级；Noul 返回 0–1；Box 返回归一化坐标。答案空间由请求预先定义，模型不会返回范围外的值。

### 3. 概率语义

LLM 的 token logprob 描述“下一个 token 的倾向”，不等于业务命题为真的概率。Jev 的 \`probabilities\` 直接覆盖你给出的选项或等级；Noul 的 \`noul\` 是命题为真的概率。

### 4. 失败方式

| LLM | Jev |
| --- | --- |
| 格式漂移 | 分布平坦、边界误判 |
| 幻觉内容 | 选项覆盖不足导致被迫选择 |
| 长链推理偏差 | 问题设计不当导致语义错配 |

Jev 的失败更“可测量”：你能看到完整分布，并用阈值拦截。

### 5. 延迟与成本

厂商发布博客自报：System One 形查询端到端 70–500 ms，并称比对比模型快 40–200 倍；输入价格 $0.042/MTok，输出免费。这些是**厂商声明，且限定在 System One tasks 与发布时条件**，不是独立评测，也不是长期商业承诺。

### 6. 系统角色

LLM 更适合作为生成与推理节点；Jev 更适合作为判断节点。二者可以共存：LLM 生成草稿，Jev 判断草稿是否满足来源与政策要求。

## 一个对照实验设计

不要引用厂商 benchmark 下结论。用自己的数据做对照：

1. 选 200 条真实样本并标注 gold label。
2. A 组：LLM + structured output；B 组：Jev Choice。
3. 记录准确率、格式失败率、p95 延迟、单位成本。
4. 分别画可靠性图，检查概率是否可用于阈值。
5. 只报告你自己的数据。

## 常见问题

**Jev 能写代码吗？** 官方说 System One 不生成代码。它适合判断“这段代码是否完成了任务”，而不是写代码本身。

**Jev 会解释理由吗？** 不会。这既是限制也是优势：可观测性来自多个原子判断与代码路径，而不是自由文本解释。

## 延伸阅读

- [Jev 与 JSON Structured Output 的区别](/jevlab/articles/intro-vs-json/)
- [Probability 与 Confidence](/jevlab/articles/probability-confidence/)
- 官方：https://typesafe.ai/blog/introducing-system-one-models-and-jev`
  },

  {
    slug: 'intro-vs-json', category: 'introduction', title: 'Jev 与 JSON Structured Output 的区别',
    description: '结构只是表面相似：判别器 schema、概率来源与错误语义完全不同。', tags: ['对比', 'Schema'],
    body: `## 学习目标

识别“结构化输出”与“类型化判断”的差异，知道为什么 schema 相同并不意味着语义相同。

## 表面相似

两者都能得到这样的 JSON：

\`\`\`json
{"choice": "technical", "confidence": 0.7, "probabilities": {"billing": 0.1, "technical": 0.8, "sales": 0.1}}
\`\`\`

但生成路径与保证完全不同。

## 差异一：谁定义答案空间

Structured Output 通常由应用提供 JSON Schema，LLM 被约束为“符合 schema 的文本”。schema 可以是任意嵌套结构，但模型仍是在生成 token。

Jev 的 \`Question\` 在 OpenAPI 中是带 \`discriminator\` 的 \`oneOf\`：

\`\`\`text
type = choice → ChoiceQuestion（criteria 为 map，1–255 项）
type = score  → ScoreQuestion（criteria 为数组，1–10 项）
type = noul   → NoulQuestion（instructions + 可选 criteria）
type = box    → BoxQuestion（instructions）
\`\`\`

应用不是定义一个通用 JSON 结构，而是选择四种判断原语之一。

## 差异二：概率从哪来

Structured Output 的 JSON 里可以有一个手写字段叫 \`confidence\`，但那是模型生成的文本，没有 schema 保证它与真实正确率有关系。

Jev 的 \`probabilities\` 与 \`confidence\` 是响应 schema 的必填字段，由模型在预定义答案空间上输出；官方 Confidence 文档给出了 Choice 与 Score 的计算公式，说明 confidence 是分布的摘要。

## 差异三：错误语义

| 场景 | Structured Output | Jev |
| --- | --- | --- |
| 选项覆盖不足 | 模型可能编造一个枚举值或直接违反 schema | Choice 仍从给定项中选择，需用 companion Noul 检测“是否适用” |
| 分布平坦 | 没有统一表示 | confidence 低，可用阈值拦截 |
| 字段缺失 | 需要重试或修复 | 响应 schema 强制必填 |

## 差异四：批量判断

Jev 允许在一次请求中提交多个问题，官方说明它们针对同一 state 并行、隔离评估。Structured Output 通常是一次生成一个对象；要并行需要自己发多次请求或-prompts 拼装。

## 实践建议

如果你的需求只是“从 LLM 得到一个合法 JSON”，structured output 足够。如果你需要**可测量的不确定性、稳定答案空间、并行原子判断**，才需要 Judgment Model。

## 常见问题

**我能让 LLM 输出一样的 probabilities 吗？** 可以让它输出数字，但无法保证这些数字经过校准或有固定语义。评估方式必须是自有标注集上的可靠性图。

## 延伸阅读

- [Choice 原理与概率分布](/jevlab/articles/choice-principle/)
- [API 数据结构](/jevlab/articles/arch-api-schema/)
- 官方：https://api.typesafe.ai/openapi.json`
  },

  {
    slug: 'intro-vs-classifier', category: 'introduction', title: 'Jev 与分类模型的区别',
    description: '从标签空间、输入形态、冷启动与概率校准角度比较判别式分类模型与 System One。', tags: ['对比', '分类'],
    body: `## 学习目标

理解什么时候该训练分类器，什么时候该调用 Judgment Model。

## 传统分类模型

监督分类流程：收集标注数据 → 训练模型 → 固定标签空间 → 部署。它擅长高吞吐、低延迟、稳定分布的任务，例如垃圾邮件过滤。

优点：成本可控、行为稳定、可用自有数据定制。
缺点：标签空间变更要重新训练；长尾与语义漂移需要持续标注；输入通常是向量化文本或图像，规则与上下文难以注入。

## Jev 的做法

Jev 不需要你训练模型，而是在请求里临时定义答案空间：

\`\`\`python
from typesafe_sdk import Choice, TypeSafeClient

with TypeSafeClient(model="jev-1.14.0") as client:
    response = client.system_one(
        state={"ticket": message, "policy": policy_text},
        questions={"intent": Choice(
            instructions="What is the primary intent in \`ticket\`?",
            criteria={"refund": "wants money back", "status": "asks for status"},
        )},
    )
\`\`\`

改标签只需改 \`criteria\`，不需要训练。上下文可以同时放消息、政策文档和历史摘要。

## 关键差异

| 维度 | 分类模型 | Jev |
| --- | --- | --- |
| 标签空间 | 训练时固定 | 请求时定义（Choice ≤255） |
| 领域适配 | fine-tune / 数据标注 | state + instructions + criteria |
| 输入 | 通常是单一文本/图像 | 文本、JSON、图像资产组合 |
| 概率 | 依赖模型校准方法 | 结果层概率，官方称针对校准训练 |
| 定制权重 | 可以有 | 官方明确不按账户做 fine-tune/LoRA |

最后一点很重要：官方文档写明 Jev 不为单个账户定制权重，所有账户使用同一套权重。所谓“领域适配”是通过输入设计完成的。

## 什么时候仍应选分类器

- 标签体系长期稳定、流量巨大、延迟与成本极敏感。
- 有充足标注数据且分布稳定。
- 需要完全私有化部署。

## 什么时候选 Jev

- 标签随业务快速变化。
- 判断依赖多段上下文与自然语言政策。
- 需要把多个语义判断组合成工作流。

## 常见问题

**Jev 是否取代分类器？** 不是。它是另一种折中：用更灵活的输入换取调用成本与厂商依赖。

## 延伸阅读

- [高基数选择与选项设计](/jevlab/articles/choice-design/)
- [Models 官方文档](https://docs.typesafe.ai/models)`
  },

  {
    slug: 'intro-vs-rules', category: 'introduction', title: 'Jev 与规则引擎的区别',
    description: '规则引擎负责确定性逻辑，Jev 负责语义判断；两者是组合关系而非替代关系。', tags: ['对比', '规则'],
    body: `## 学习目标

掌握“规则处理事实、模型处理语义”的边界划分方法。

## 规则引擎的优势

规则引擎（或普通 if/else）具备：

- 确定性：相同输入必然相同输出。
- 可审计：每条规则可追踪、可单测。
- 零模型成本：无需网络调用。

凡是能写成精确表达式的判断都应该留在代码里：金额阈值、时间窗口、权限、状态机转换、幂等键。

## 规则的盲区

自然语言和图像里的事实无法直接写成表达式：

\`\`\`text
“我上周就被多扣了一次，现在又要扣，请立刻退款，否则我找律师。”
\`\`\`

金额、时间、权限可以提取成字段；但“是否在威胁法律行动”“是否表达强烈不满”是语义判断。

## 正确组合方式

![判断与决策分离](/jevlab/diagrams/judgment-decision.svg)

\`\`\`typescript
const judgments = await judge({
  wants_refund: noul('user explicitly asks for money back'),
  legal_threat: noul('user threatens legal action'),
  category: choice('issue type', { billing: '...', technical: '...' }),
});

if (!facts.verified) return 'human_review';
if (judgments.legal_threat.noul > 0.8) return 'fraud_team';
if (judgments.wants_refund.noul > 0.7 && facts.amount <= 25) return 'auto_refund';
return 'human_review';
\`\`\`

规则引擎并不消失，它从“理解语言”变成“组合判断与事实”。

## 设计动机

官方文章把错误做法称为 "putting intelligence at the wrong layer of abstraction"：把所有例外规则塞进一个巨型 Choice 的 criteria，等于让模型扮演规则引擎。这样得到的系统不可单测、不可解释、难以扩展。

## 常见问题

**能不能把所有规则写成 Noul？** 技术上可以，但成本、延迟和不确定性都会上升，且失去了确定性保证。

**规则冲突怎么办？** 用代码中的优先级与审计日志解决，不要用模型再判断一次“哪条规则更重要”。

## 延伸阅读

- [Deterministic Logic 与可审计架构](/jevlab/articles/deterministic-logic/)
- 官方：https://typesafe.ai/blog/dont-call-it-a-decision-model`
  },

  {
    slug: 'intro-vs-agent-framework', category: 'introduction', title: 'Jev 与 Agent Framework 的关系',
    description: '明确 Jev 不是 Agent Core：它提供判断原语，Agent 负责编排、工具与执行。', tags: ['Agent', '架构'],
    body: `## 学习目标

理解 Jev 在 Agent 系统里的位置：一个可调用的 Judgment Provider，而不是 Agent 本身。

## Agent 系统的典型分层

![Agent Judgment Layer](/jevlab/diagrams/agent-judgment-layer.svg)

\`\`\`text
User / Task
   ↓
Orchestrator（循环、计划、状态机）   ← LangGraph / 自研 runtime
   ↓
Judgment Layer                       ← Jev
   ↓
Tools / Models / Skills              ← 由策略层选择
   ↓
Verification / Human Approval        ← 完成检查与高风险审批
\`\`\`

Jev 只出现在 Judgment Layer。它不管理循环、不调用工具、不持有长期记忆。

## 它能做什么

- Tool Routing：判断应该用哪个工具。
- Model Routing：判断任务难度，选择轻量模型或推理模型。
- Skill Selection：从技能列表中挑选最相关的。
- Guardrail：检测注入、越权或 PII。
- Completion Checker：判断任务是否真的完成。
- Context Filtering：判断哪些检索片段相关。

## 它不能做什么

- 自主规划多步任务。
- 执行工具调用或维护 agent state。
- 记住跨请求的对话历史（你需要把历史放进 state）。
- 决定最终业务动作。

## 一个 Coding Agent 例子

\`\`\`python
answer = client.system_one(
    state={"task": task, "files": changed_files, "test_output": test_output},
    questions={
        "needs_more_tests": noul("Test output indicates missing coverage"),
        "route": choice("Next action", {"run_tests": "...", "edit_code": "...", "ask_user": "..."}),
    },
)
if answer.answers.route.probabilities[answer.answers.route.choice] < 0.75:
    ask_user()
elif answer.answers.route.choice == "run_tests":
    run_tests()
\`\`\`

这里 Agent Runtime 仍然负责循环与执行；Jev 只提供两个判断。

## 官方集成线索

官方仓库 \`typesafe-ai/skills\` 提供面向 coding agent 的集成指导；文档也有 \`Jev with coding agents\`、LangChain quickstart 与 tool-call safety gate cookbook。使用时应核对当前版本，不要假设存在未列出的 SDK 方法。

## 常见问题

**Jev 能和 LangGraph 一起用吗？** 能。把 Jev 封装为一个节点，返回 typed answers 给图状态。

**它是“System 1”，那“System 2”是谁？** 官方类比为慢速推理层，通常由 LLM 或代码规划器承担；Jev 不提供 System 2 能力。

## 延伸阅读

- [Agent Judgment Layer](/jevlab/articles/agent-judgment-layer/)
- [Tool / Model / Skill Routing](/jevlab/articles/agent-routing/)
- 官方：https://github.com/typesafe-ai/skills`
  },
];
