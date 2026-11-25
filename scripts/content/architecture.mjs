export const articles = [
  {
    slug: 'arch-state', category: 'architecture', title: 'State：把上下文当作数据',
    description: 'State 的设计原则、允许的输入形态、结构化引用方式与常见反模式。', tags: ['State', '架构'],
    body: `## 学习目标

学会构造一个让多个问题共享、可被精确引用、且不会拖垮上下文的 state。

## State 是什么

OpenAPI 中 \`SystemOneRequest.state\` 的类型是 \`FlexibleNoNull\`：字符串、对象或数组（非空值）。它是所有问题共同评估的内容。

\`\`\`json
{
  "model": "jev-1.14.0",
  "state": {
    "ticket": {"message": "...", "created_at": "..."},
    "policy": "Cancelled flights are eligible for a full refund.",
    "history": ["...", "..."]
  },
  "questions": { "...": {} }
}
\`\`\`

官方文档强调：同一 state 的问题应在同一请求中提出，它们被并行、隔离地评估。

## 设计原则

### 1. 把事实与材料分开

把可精确计算的事实（金额、状态、时间戳）作为独立字段，把语义材料（消息、政策、文档片段）作为文本字段。这样代码逻辑可以直接读事实字段，模型只读语义字段。

### 2. 用反引号路径引用

当 state 是结构化 JSON 时，官方建议在 instructions 中用路径引用：\`\`ticket.messages[0].text\`\`、\`\`refund_policy\`\`、\`\`order.charges\`\`。这让问题指向明确，减少歧义。

### 3. 控制上下文尺寸

Jev 1.14 的默认限制是每请求 64k tokens（state + 所有 questions）、每问题 32k tokens（state + 单个 question）。可通过 \`TypeSafe-Danger-Zone-Long-Context: true\` 开启 262k，但官方说明更慢且精度更低，属于 Danger Zone 能力。

### 4. 不要塞入无关材料

每个问题都看到完整 state。无关材料会增加噪声与成本。如果两组问题依赖不同材料，拆成两个请求更合适。

## 图片 state

图片通过 \`assets\` 声明，可用 multipart 的 \`part\` 或 base64 \`data_base64\`。图片与 Box 必须带：

\`\`\`http
TypeSafe-Danger-Zone-Images: true
\`\`\`

官方将 Images / Box 标记为 Dreamer-ready，表示尚未达到生产就绪标准。

![State 到答案流程](/jevlab/diagrams/state-questions-answers.svg)

## 常见反模式

| 反模式 | 后果 | 改进 |
| --- | --- | --- |
| 把整个数据库记录塞进 state | 成本高、噪声大 | 只放判断需要的字段 |
| 用自然语言重复描述已知事实 | 语义冗余 | 直接放结构化字段 |
| 在 instructions 里隐含信息来源 | 指向不清 | 用路径引用 |
| 一个问题依赖另一个问题的答案 | 无法并行 | 拆成两次请求 |

## 运行方法

本地可先用静态 JSON 文件模拟 state，验证问题设计；确认后再接真实数据。不要在日志里打印包含 PII 的 state。

## 常见问题

**state 可以是数组吗？** 可以，只要是允许的非空值类型。

**可以在 state 中放图片 URL 吗？** 官方 asset 支持 base64 或 multipart part；不要假设服务会抓取远程 URL。

## 延伸阅读

- [Questions 设计](/jevlab/articles/arch-questions/)
- [Parallel Evaluation](/jevlab/articles/arch-parallel/)`
  },

  {
    slug: 'arch-questions', category: 'architecture', title: 'Questions：问题即接口',
    description: '问题 ID、type、instructions、criteria 的职责划分与设计要求。', tags: ['Questions', '接口设计'],
    body: `## 学习目标

掌握四类问题的共同结构，学会把业务问题翻译成模型能稳定回答的接口。

## 一个问题的四个部分

| 部分 | 作用 | 是否发给模型 |
| --- | --- | --- |
| ID（question key） | 代码中定位答案 | 否 |
| \`type\` | 选择 primitive | 是 |
| \`instructions\` | 完整问题或判断语句 | 是 |
| \`criteria\` | 选项 / 等级 / yes-no 标准 | 是（依类型而定） |

官方特别提醒：即使 ID 已经看起来清楚的（如 \`refund_requested\`），也要在 \`instructions\` 里写完整问题。

## 各类型的 criteria

\`\`\`json
{
  "intent": {"type": "choice", "instructions": "...", "criteria": {"a": "…", "b": "…"}},
  "severity": {"type": "score", "instructions": "...", "criteria": ["...", "...", "..."]},
  "has_pii": {"type": "noul", "instructions": "...", "criteria": {"true": "...", "false": "..."}},
  "button": {"type": "box", "instructions": "the Submit button in \`screenshot\`"}
}
\`\`\`

- Choice：map，1–255 项，无序且互斥。
- Score：数组，1–10 项，**位置决定分数，从 0 开始**。
- Noul：可选 \`criteria\`，用 \`true\` / \`false\` 澄清判定标准。
- Box：不接受 criteria。

## 原子化要求

官方把 System One 问题比作 "gut-check determination"：一秒钟能答的小问题。下面这个就不合格：

> Analyze this message and determine the best course of action.

应拆成若干独立问题：是否请求退款、是否威胁法律行动、政策是否匹配、情绪等级。然后在代码中组合。

![Atomic Questions](/jevlab/diagrams/atomic-questions.svg)

## 什么时候拆成第二次请求

只有当前一个问题决定后一个问题的构造时才拆：

1. 需要用答案获取更多数据。
2. 需要决定下一个 state 的组成。
3. 需要选择下一次判断的选项列表。

否则都放在同一请求里，代码可以选择性忽略不需要的答案。

## 高基数选择

官方博客称 Choice 最多支持 255 个选项；超过时采用两阶段：先独立 scoring，再显式 choice，可能变慢。不要设计 1000 个选项的巨型 Choice。

## 常见问题

**ID 会影响模型吗？** 不会，ID 只用于响应映射。

**instructions 可以引用 state 字段吗？** 可以且推荐，用反引号路径。

## 延伸阅读

- [Atomic Questions](/jevlab/articles/atomic-questions/)
- [Choice 选项设计](/jevlab/articles/choice-design/)`
  },

  {
    slug: 'arch-typed-answers', category: 'architecture', title: 'Typed Answers：让代码直接消费判断',
    description: '四种 Answer 结构、判别器、字段必填性与 TypeScript / Python 类型消费方式。', tags: ['Schema', '类型'],
    body: `## 学习目标

读懂 \`Answer\` 判别器，能在 TypeScript 与 Python 中安全地消费答案。

## Answer 是带判别器的 oneOf

OpenAPI 中 \`Answer\` 使用 \`type\` 作为 discriminator：

| type | 必填字段 | 可选/条件字段 |
| --- | --- | --- |
| \`noul\` | \`type\`, \`noul\` | 无 confidence |
| \`choice\` | \`type\`, \`choice\`, \`confidence\`, \`probabilities\` | — |
| \`score\` | \`type\`, \`score\`, \`confidence\`, \`legend\`, \`probabilities\` | — |
| \`box\` | \`type\`, \`box\`, \`confidence\` | \`confidence\` 在 schema 中可为 null |

这是本站核对 Schema 后的结论：**NoulAnswer 没有单独的 confidence 字段**。

## 完整响应示例

\`\`\`json
{
  "model": "jev-1.14.0",
  "answers": {
    "dept": {
      "type": "choice", "choice": "technical", "confidence": 1.0,
      "probabilities": {"billing": 0.0, "technical": 1.0, "sales": 0.0}
    },
    "severity": {
      "type": "score", "score": 0.59, "confidence": 0.38,
      "legend": {"0": "Calm", "1": "Concerned", "2": "Angry"},
      "probabilities": {"0": 0.41, "1": 0.59, "2": 0.0}
    },
    "urgent": {"type": "noul", "noul": 0.99}
  },
  "usage": {"input_tokens": 428, "output_tokens": 73}
}
\`\`\`

数值来自官方文档示例，用于展示结构，不代表你的调用结果。

## TypeScript 类型消费

官方 JS SDK 会从 questions 推断答案类型：

\`\`\`typescript
import { choice, noul, score, TypeSafeClient } from '@typesafe-ai/sdk';

const client = new TypeSafeClient({ defaultModel: 'jev-1.14.0' });
const res = await client.systemOne({
  state: ticket,
  questions: {
    dept: choice('Which team?', { billing: '...', technical: '...' }),
    urgent: noul('Is this urgent?'),
  },
});

const dept: 'billing' | 'technical' = res.answers.dept.choice;
const p = res.answers.dept.probabilities[res.answers.dept.choice];
const urgentP = res.answers.urgent.noul;
\`\`\`

## Python 类型消费

\`\`\`python
from typesafe_sdk import Choice, Noul, TypeSafeClient

with TypeSafeClient(model="jev-1.14.0") as client:
    response = client.system_one(
        state=ticket,
        questions={"dept": Choice(instructions="...", criteria={"billing": "...", "technical": "..."})},
    )

answer = response.answers["dept"]
print(answer.choice, answer.confidence, answer.probabilities)
\`\`\`

Quickstart 也展示了便捷访问器 \`response.choices["dept"]\` / \`response.nouls["urgent"]\`；返回结构以你安装的 SDK 版本文档为准。

## 消费原则

1. 永远先读 \`type\`，再访问类型专属字段。
2. 对 Box 的 \`confidence\` 做 null 防御，尽管文档正文描述为 0–1 数值。
3. 记录响应中的 \`model\` 字段，它是实际回答的版本化模型 ID，可能与请求的别名不同。

## 延伸阅读

- [API 数据结构](/jevlab/articles/arch-api-schema/)
- [Probability 与 Confidence](/jevlab/articles/probability-confidence/)`
  },

  {
    slug: 'arch-parallel', category: 'architecture', title: 'Parallel Evaluation 与 Question Independence',
    description: '为什么同一请求中的问题应相互独立，以及如何利用并行与投机式提问。', tags: ['并行', '原子判断'],
    body: `## 学习目标

理解官方“同一 state、并行、隔离评估”的含义，并能据此设计请求批次。

![并行判断](/jevlab/diagrams/parallel-judgment.svg)

## 官方表述

Introduction 页面写道：任意组合的问题类型可在一次请求中提交；每个问题针对同一 state 并行、隔离评估；增加问题几乎不增加响应时间，也不会产生 context-rot。

Don't Call It a Decision Model 又强调：所有 Jev judgments 相互隔离评估，因此新增判断不会影响已验证的判断。

这些是厂商对产品行为的描述。本站不推断其内部实现（例如是否真的并发采样、如何调度 GPU），因为官方没有公开。

## 隔离带来的工程收益

1. **回归安全**：新增一个判断不会改变旧判断的结果。
2. **可组合**：不同团队可以维护不同问题，最终在代码中组合。
3. **投机式提问**：代码可能用到的问题可以一起问，之后再决定是否使用。

## 独立性的代价

问题看不到彼此的答案。因此不能这样设计：

\`\`\`text
Q1: 这是什么类型的请求？
Q2: 针对 Q1 的结果，应该采取什么动作？
\`\`\`

Q2 拿不到 Q1 的答案。正确做法是把最终动作放到代码规则里，或者拆成第二次请求。

## 批次设计准则

- 同一 state、互不依赖 → 一个请求。
- 需要前一个答案才能构造第二个问题 → 两次请求。
- 不同 state（例如不同文档片段）→ 分别请求或使用多问题 + 明确路径引用。

## 请求数量限制

官方 primitives 页说请求中的问题数量没有硬限制，限制来自上下文大小。OpenAPI 中 \`questions\` 是 \`minProperties: 1\` 的 map，没有 maxProperties。仍建议按业务语义控制批次大小，便于观测与重试。

## 延迟策略

官方 Patterns 中有 "Speculative fan-out"：先把可能用到的所有问题一起发出，并用 Noul 先做筛选。这适合工具很多、但每次只用一两个的 Agent。

## 常见问题

**并行会不会让答案互相污染？** 官方称隔离评估；但你的 instructions 不应引用其他问题的答案。

**并行等于更低价格吗？** 不等于。计费基于 input tokens；并行改善的是延迟。

## 延伸阅读

- [Atomic Questions](/jevlab/articles/atomic-questions/)
- [Speculative Fan-out 官方模式](https://docs.typesafe.ai/patterns/fan-out)`
  },

  {
    slug: 'arch-api-schema', category: 'architecture', title: 'API 数据结构：逐字段核对',
    description: '基于 OpenAPI 3.1.0 / API 0.2.0 逐字段列出请求、响应、资产与错误结构。', tags: ['API', 'Schema'],
    body: `## 学习目标

在不读第二手资料的情况下，直接看懂官方 OpenAPI 中的关键 schema。

研究基线：OpenAPI 3.1.0，\`info.version = 0.2.0\`，server \`https://api.typesafe.ai\`，认证 \`HTTPBearer\`。

## 端点

| Method | Path | 说明 |
| --- | --- | --- |
| GET | \`/v1/models\` | 列出当前账号可用模型与别名 |
| POST | \`/v1/systemone\` | 对 state 回答一个或多个命名问题 |

\`POST /v1/systemone\` 接受 \`application/json\` 或 \`multipart/form-data\`。图片走 multipart：\`request\` 部分是 JSON，其余部分按 asset 名称上传图片文件。

## SystemOneRequest

\`required: [model, state, questions]\`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| \`model\` | string | 模型名或别名，示例 \`jev-latest\` |
| \`state\` | string / object / array | 所有问题共同评估的内容 |
| \`questions\` | object | key 为问题 ID，value 为 Question，至少 1 项 |
| \`assets\` | object | 图片资产，可选，至少 1 项 |

## Question（判别器 type）

| type | 必填 | 关键约束 |
| --- | --- | --- |
| \`noul\` | \`type\` | \`instructions\`、可选 \`criteria{true,false}\` |
| \`choice\` | \`type\`,\`criteria\` | criteria 为 map，1–255 项 |
| \`score\` | \`type\`,\`criteria\` | criteria 为数组，1–10 项，有序 |
| \`box\` | \`type\` | 仅 \`instructions\`，不接受 criteria |

请求头：

\`\`\`http
TypeSafe-Danger-Zone-Images: true
TypeSafe-Danger-Zone-Long-Context: true
\`\`\`

两个 header 在 schema 中未标为 required，但使用图片/Box 或长上下文时必须显式开启。

## SystemOneResponse

\`required: [model, answers, usage]\`

| 字段 | 说明 |
| --- | --- |
| \`model\` | 实际回答问题的模型名，可能与请求别名不同 |
| \`answers\` | 按 question ID 组织，至少 1 项 |
| \`usage.input_tokens\` | 计费输入 token |
| \`usage.output_tokens\` | 输出 token，文档称当前免费 |

## Answer 字段速查

| type | 字段 |
| --- | --- |
| \`noul\` | \`noul\`（0–1），**无 confidence** |
| \`choice\` | \`choice\`, \`confidence\`, \`probabilities\` |
| \`score\` | \`score\`, \`confidence\`, \`legend\`, \`probabilities\` |
| \`box\` | \`box{top,bottom,left,right}\`, \`confidence\`（schema 允许 null） |

Box 坐标为图像宽高的 fraction，左上角 (0,0)，右下角 (1,1)。

## 错误结构

- \`400\` → \`HTTPBadRequestError\` / \`detail\`（string 或 object），文本可能被截断。
- \`422\` → \`HTTPValidationError\` / \`detail: ValidationError[]\`，含 \`loc\`、\`msg\`、\`type\`、可选 \`input\` 与 \`ctx\`。

注意：OpenAPI 中只声明了 400/422；官方 Request rules and errors 文档还列出 401、413、415、429、529。以实际行为与错误文档为准。

## 请求规则

- UTF-8 JSON，无 BOM。
- state / instructions / criteria 每字段最多 64 层嵌套。
- 不允许 NaN / Infinity。
- 请求体最大 32 MiB（压缩与解压都计入）。
- 压缩仅支持 gzip / x-gzip / zstd 单层，zstd 窗口 ≤ 8 MiB。

## 延伸阅读

- [官方 OpenAPI](https://api.typesafe.ai/openapi.json)
- [Request rules and errors](https://docs.typesafe.ai/api/errors)`
  },
];
