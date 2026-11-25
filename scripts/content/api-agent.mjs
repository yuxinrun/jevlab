export const articles = [
  {
    slug: 'api-quickstart', category: 'api', title: 'API 与 SDK Quickstart',
    description: '用 HTTP、Python SDK 和 JavaScript SDK 完成第一次类型化判断调用。', tags: ['API', 'SDK'],
    body: `## 学习目标

在 10 分钟内用三种方式完成同一个工单路由示例，并正确解释响应字段。

## 准备

1. 在 https://console.typesafe.ai/keys 获取 API Key。
2. 设置环境变量 \`TYPESAFE_API_KEY\`。
3. 官方 Quickstart 要求 Python 3.10+ / Node.js 22+ / curl 7.76+。

不要将 Key 写入仓库或前端代码。本站 Playground 不调用真实 API。

## HTTP（curl）

\`\`\`bash
: "\${TYPESAFE_API_KEY:?Set TYPESAFE_API_KEY first.}"
curl --fail-with-body --silent --show-error \\
  https://api.typesafe.ai/v1/systemone \\
  -H "Authorization: Bearer $TYPESAFE_API_KEY" \\
  -H "Content-Type: application/json" \\
  --data-binary @- <<'JSON'
{
  "model": "jev-1.14.0",
  "state": "Our API integration started returning 500 errors 20 minutes ago.",
  "questions": {
    "department": {
      "type": "choice",
      "instructions": "Which team should handle this?",
      "criteria": {"billing": "Payment issues", "technical": "Bugs", "sales": "Pricing"}
    },
    "frustration": {
      "type": "score",
      "instructions": "How frustrated is the customer?",
      "criteria": ["Calm", "Frustrated but civil", "Very angry"]
    },
    "is_urgent": {"type": "noul", "instructions": "The message conveys urgency"}
  }
}
JSON
\`\`\`

## Python SDK

\`\`\`bash
pip install typesafe-sdk
\`\`\`

\`\`\`python
from typesafe_sdk import Choice, Noul, Score, TypeSafeClient

ticket = "Our API integration started returning 500 errors 20 minutes ago."

with TypeSafeClient(model="jev-1.14.0") as client:  # reads TYPESAFE_API_KEY
    response = client.system_one(
        state=ticket,
        questions={
            "department": Choice(instructions="Which team?", criteria={
                "billing": "Payment issues", "technical": "Bugs", "sales": "Pricing"}),
            "frustration": Score(instructions="How frustrated?", criteria=[
                "Calm", "Frustrated but civil", "Very angry"]),
            "is_urgent": Noul(instructions="Conveys urgency"),
        },
    )

print(response.answers["department"].choice)
print(response.answers["frustration"].score)
print(response.answers["is_urgent"].noul)
\`\`\`

官方 Quickstart 还展示了便捷访问器 \`response.choices["department"]\`、\`response.scores["frustration"]\`、\`response.nouls["is_urgent"]\`。具体可用属性以你安装的 SDK 版本为准。

## JavaScript / TypeScript SDK

\`\`\`bash
npm install @typesafe-ai/sdk
npm pkg set type=module
\`\`\`

\`\`\`typescript
import { choice, noul, score, TypeSafeClient } from '@typesafe-ai/sdk';

const client = new TypeSafeClient({ defaultModel: 'jev-1.14.0' });
const response = await client.systemOne({
  state: 'Our API integration started returning 500 errors 20 minutes ago.',
  questions: {
    department: choice('Which team?', {
      billing: 'Payment issues', technical: 'Bugs', sales: 'Pricing',
    }),
    frustration: score('How frustrated?', ['Calm', 'Frustrated but civil', 'Very angry']),
    is_urgent: noul('Conveys urgency'),
  },
});

console.log(response.answers.department.choice);
console.log(response.answers.frustration.score);
console.log(response.answers.is_urgent.noul);
\`\`\`

SDK 会从 questions 推断答案类型：\`res.answers.department.choice\` 的类型是 \`"billing" | "technical" | "sales"\`。

## 响应结构

\`\`\`json
{
  "model": "jev-1.14.0",
  "answers": {
    "department": {"type": "choice", "choice": "technical", "confidence": 1.0,
      "probabilities": {"billing": 0.0, "technical": 1.0, "sales": 0.0}},
    "frustration": {"type": "score", "score": 0.59, "confidence": 0.38,
      "legend": {"0": "Calm", "1": "Frustrated but civil", "2": "Very angry"},
      "probabilities": {"0": 0.41, "1": 0.59, "2": 0.0}},
    "is_urgent": {"type": "noul", "noul": 0.99}
  },
  "usage": {"input_tokens": 428, "output_tokens": 73}
}
\`\`\`

这是官方 Quickstart 的示例响应，数值会随版本与输入变化，不是你调用的真实结果。

## 预期结果与错误处理

- 期望得到三个答案与 usage。
- 如果返回 422，检查字段名与 question type。
- 如果返回 401，检查 API Key。
- 如果是图片请求，补上 \`TypeSafe-Danger-Zone-Images: true\`。

## 延伸阅读

- [API 数据结构](/jevlab/articles/arch-api-schema/)
- [错误处理与重试](/jevlab/articles/api-errors/)`
  },

  {
    slug: 'api-errors', category: 'api', title: '错误处理、限流与重试',
    description: '按官方 Request rules and errors 核对状态码、请求规则、压缩与重试策略。', tags: ['API', '可靠性'],
    body: `## 学习目标

在生产代码中正确处理 API 失败，避免把可重试错误当作业务失败。

## 状态码

| 状态 | 含义 | 处理 |
| --- | --- | --- |
| 400 | 请求规则错误，如无效 UTF-8、嵌套过深、\`max_tokens_exceeded\` | 修正请求，不重试 |
| 401 | API Key 缺失或无效 | 检查配置，不重试 |
| 413 | 请求体 > 32 MiB | 缩小请求，不重试 |
| 415 | 不支持的压缩方式或多层压缩 | 改为单层 gzip/x-gzip/zstd |
| 422 | 字段验证失败 | 按 \`detail\` 修正 |
| 429 | 超过速率限制 | 指数退避后重试 |
| 529 | 服务过载 | 指数退避后重试 |

OpenAPI 只声明 400 与 422；其他状态码来自官方 Request rules and errors 文档。

## 请求规则

- UTF-8 JSON，无 BOM。
- \`state\` / \`instructions\` / \`criteria\` 每字段最多 64 层嵌套。
- 不允许 NaN / Infinity / 超大指数。
- 大整数与标识符用字符串。
- 请求体最大 32 MiB，压缩与解压都计入。
- zstd 窗口最大 8 MiB。

## 错误响应示例

\`\`\`json
{
  "detail": [
    {"loc": ["body", "state"], "msg": "Field required", "type": "missing"}
  ]
}
\`\`\`

\`detail\` 文本可能被截断，以 \`…\` 结尾；不要依赖完整原文做匹配。

## 重试实现

\`\`\`typescript
async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (err: any) {
      const retryable = err.status === 429 || err.status === 529 || err.status >= 500;
      if (!retryable || i === attempts - 1) throw err;
      const delay = Math.min(8000, 200 * 2 ** i) + Math.random() * 100;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('unreachable');
}
\`\`\`

官方 SDK 默认带重试策略；如果自行实现 HTTP 调用，请遵守退避，不要立即连续重试。

## 超时与降级

- 设置客户端超时（例如 10s），避免请求无限等待。
- 超时后走 fallback：缓存答案、规则默认路径或转人工。
- 不要把超时重试无限叠加，防止放大器效应。

## 限流说明

官方错误文档说明 429 表示超过速率限制，但未公布公开配额表；OpenAPI 中也没有 RateLimit-* header。因此不要在代码中假设具体限额，应读取实际响应并实现退避。

## 延伸阅读

- [Cache、Fallback 与可观测性](/jevlab/playground/#routing)
- [官方错误文档](https://docs.typesafe.ai/api/errors)`
  },

  {
    slug: 'agent-judgment-layer', category: 'integration', title: 'Agent Judgment Layer',
    description: '在 Agent 架构中插入独立的判断层，连接编排器、工具、模型与人工审核。', tags: ['Agent', '架构'],
    body: `## 学习目标

把 Jev 封装为 Agent 系统里的 Judgment Provider，并划定它与 Orchestrator 的边界。

![Agent Judgment Layer](/jevlab/diagrams/agent-judgment-layer.svg)

## 分层

\`\`\`text
Orchestrator  →  决定下一步调用什么、维护循环与状态
Judgment Layer →  把语义问题转成 typed questions 并调用 Provider
Policy Layer  →  阈值、权限、人工审批、fallback
Executors     →  工具、LLM、技能、浏览器动作
Verifier      →  判断结果是否满足目标
\`\`\`

## Provider 接口

\`\`\`typescript
interface JudgmentProvider {
  judge(input: { state: unknown; questions: Record<string, Question> }): Promise<Answers>;
}

class JevProvider implements JudgmentProvider {
  constructor(private client: TypeSafeClient, private model = 'jev-1.14.0') {}
  judge(input: { state: unknown; questions: Record<string, Question> }) {
    return this.client.systemOne({ model: this.model, ...input });
  }
}
\`\`\`

抽象的价值：测试时替换为确定性 FakeProvider；生产可切换模型或供应商。

## 典型流程

1. Orchestrator 收集 state。
2. Judgment Layer 一次性提出独立问题（路由、风险、完成度）。
3. Policy Layer 根据概率与风险决定路径。
4. Executor 执行工具或模型调用。
5. Verifier 用 Noul 检查结果是否满足目标；不满足则回到循环。

## 关键设计点

- **不要让 Judgment Layer 执行动作**：它只返回判断。
- **一次请求问完独立问题**：降低延迟。
- **记录 trace**：每次路径选择都可读。
- **策略与 prompt 分离**：阈值变化不改模型调用。

## 官方线索

文档有 \`Jev with coding agents\`、\`Function calling\`、\`Skill suggestion\`、\`Guardrails for LLMs\`、\`Tool-call safety gate\` 等 cookbook；集成仓库为 typesafe-ai/skills。使用前核对当前版本。

## 常见错误

- 把 Agent 状态机写进 criteria。
- 让模型直接调用工具而绕过策略层。
- 没有 FakeProvider，导致单测依赖网络。

## 延伸阅读

- [Tool / Model / Skill Routing](/jevlab/articles/agent-routing/)
- [自研 Judgment Runtime](/jevlab/articles/practice-runtime/)`
  },

  {
    slug: 'agent-routing', category: 'integration', title: 'Tool / Model / Skill Routing',
    description: '用 Choice、Score 与置信度门控实现工具、模型和技能路由。', tags: ['Agent', 'Routing'],
    body: `## 学习目标

设计三层路由：Tool Routing、Model Routing、Skill Routing，并在每条路径前加 Confidence Gate。

![Tool Routing](/jevlab/diagrams/tool-routing.svg)
![Model Routing](/jevlab/diagrams/model-routing.svg)
![Skill Routing](/jevlab/diagrams/skill-routing.svg)

## Tool Routing

\`\`\`python
from typesafe_sdk import Choice, Noul, TypeSafeClient

TOOLS = {
    "search_web": "Need recent or external information.",
    "run_python": "Need computation or data processing.",
    "query_db": "Need internal structured data.",
}

with TypeSafeClient(model="jev-1.14.0") as client:
    r = client.system_one(
        state={"task": task, "available_tools": list(TOOLS)},
        questions={
            "tool": Choice(instructions="Which tool should be used next?", criteria=TOOLS),
            "tool_applicable": Noul(instructions="Is any available tool appropriate?"),
        },
    )
    answer = r.answers["tool"]
    p = answer.probabilities[answer.choice]
    if r.answers["tool_applicable"].noul < 0.5 or p < 0.75:
        ask_user()
    else:
        call_tool(answer.choice)
\`\`\`

## Model Routing

用 Score 评估难度：

\`\`\`text
criteria = ["trivial lookup", "single-step edit", "multi-file reasoning", "deep architectural change"]
\`\`\`

规则示例：score < 1 → 轻量模型；1–2 → 标准模型；> 2 → 推理模型。先看 confidence，低于阈值时直接走更稳妥的模型。

## Skill Routing

技能数量往往多于工具。官方 Cookbook 有 \`skill_suggestion\`。建议：

1. 先 Choice 选出最相关技能。
2. 用 companion Noul 判断是否有技能适用。
3. 概率不足时返回“无技能”，让 Orchestrator 用基础能力继续。

## Confidence Gate

![Confidence 策略](/jevlab/diagrams/confidence-policy.svg)

\`\`\`typescript
const p = answer.probabilities[answer.choice];
const threshold = risk === 'high' ? 0.9 : risk === 'medium' ? 0.75 : 0.6;
if (p < threshold) return fallback();
return execute(answer.choice);
\`\`\`

高风险动作在 gate 之后还要人工审批。

## Fallback 设计

- 返回“请求澄清”而不是猜测。
- 切换到更通用的模型或人工队列。
- 使用上一轮缓存的安全路径。
- 记录 fallback 原因用于评估。

## 常见错误

- 工具列表里塞入功能重叠的工具，导致概率分散。
- 路由结果直接执行，没有 gate。
- 每次路由都单独发一次请求，延迟叠加。

## 延伸阅读

- [Agent Routing Lab](/jevlab/playground/#routing)
- [Fallback 架构](/jevlab/diagrams/fallback.svg)`
  },

  {
    slug: 'production-eval', category: 'production', title: 'Evaluation Pipeline',
    description: '建立离线评估、在线监控与回归测试闭环，验证判断系统的真实表现。', tags: ['生产', '评估'],
    body: `## 学习目标

搭建从样本标注到阈值决策的评估闭环，不用厂商宣传数字代替自有验证。

![Evaluation Pipeline](/jevlab/diagrams/evaluation-pipeline.svg)

## 数据集

- 来源：真实流量采样（脱敏）+ 边界案例人工构造。
- 规模：起点 300–1000 条；高风险场景更多。
- 标注：每个原子判断单独标注，而不是只标最终决策。
- 分层：按语言、渠道、风险等级分层，避免单一分布。

## 离线评估步骤

1. 锁定模型版本（如 \`jev-1.14.0\`）与问题配置 hash。
2. 批量调用并保存原始响应与 trace。
3. 对每个判断计算准确率、混淆矩阵、Brier Score。
4. 画可靠性图，计算 ECE。
5. 扫描阈值，权衡自动化率与误执行率。
6. 对最终决策计算端到端正确率。

\`\`\`python
def evaluate(pairs):  # pairs: [(p, y)]
    n = len(pairs)
    brier = sum((p - y) ** 2 for p, y in pairs) / n
    acc = sum((p >= 0.5) == bool(y) for p, y in pairs) / n
    return {"brier": brier, "accuracy": acc, "n": n}
\`\`\`

## 在线监控

- 概率分布漂移（均值、方差、低置信度占比）。
- 自动执行率与人工推翻率。
- 延迟 p50/p95、错误率、429 比例。
- 人工审核队列长度。
- 响应中的 \`model\` 是否变化。

## 回归测试

把固定样本集做成 CI 测试：模型或配置变更后重跑，比较关键指标。若准确率或校准下降超过预设范围，阻断发布。

## 厂商数字的使用方式

发布博客中的 193.6x faster、444.6x cheaper 等来自厂商自报 workflow evals，原文也说明可能偏高端。可以在“官方声明”章节引用并标注来源，但不能写成你的系统收益。

## 常见错误

- 只评估最终 action，不评估原子判断。
- 用示例数据当评测集。
- 没有记录模型版本，结果无法复现。

## 延伸阅读

- [Calibration](/jevlab/articles/calibration/)
- [Deterministic Logic 与可审计架构](/jevlab/articles/deterministic-logic/)`
  },
];
