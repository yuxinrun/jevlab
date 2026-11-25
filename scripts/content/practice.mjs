export const articles = [
  {
    slug: 'practice-ticket-router', category: 'practice', title: '实战：客服工单分类与路由',
    description: '用 Noul + Choice + Score 构建可审计的工单路由，完整覆盖状态、判断、规则与人工路径。', tags: ['实战', '客服'],
    body: `## 学习目标

实现一个端到端工单路由：语义判断由 Jev 提供，金额与政策由代码提供，高风险与不确定走人工。

## 需求

输入：用户消息、订单信息、退款政策。
输出：\`auto_refund\` / \`fraud_team\` / \`technical_queue\` / \`clarify\` / \`human_review\`。

## 第一步：设计 State

\`\`\`json
{
  "state": {
    "ticket": {"message": "...", "language": "zh", "created_at": "..."},
    "order": {"amount": 18, "paid": true, "status": "delivered"},
    "policy": "Cancelled or undelivered orders are eligible for a full refund within 30 days."
  }
}
\`\`\`

金额、支付状态、订单状态是事实字段，交给代码；政策文本与消息交给模型。

## 第二步：设计原子问题

\`\`\`python
from typesafe_sdk import Choice, Noul, Score, TypeSafeClient

CATEGORIES = {
    "refund": "The user wants money returned.",
    "technical": "The user reports a bug or outage.",
    "billing": "The user asks about a charge or invoice.",
    "other": "None of the above describes the request.",
}
LEVELS = ["Calm", "Concerned", "Angry", "Threatening"]

questions = {
    "category": Choice(instructions="Main request in \`ticket.message\`", criteria=CATEGORIES),
    "category_applicable": Noul(instructions="Does any category (except other) describe \`ticket.message\`?"),
    "wants_refund": Noul(instructions="Does \`ticket.message\` explicitly request a refund?"),
    "duplicate_charge": Noul(instructions="Does \`ticket.message\` claim a duplicate charge?"),
    "legal_threat": Noul(instructions="Does \`ticket.message\` mention lawyers or legal action?"),
    "frustration": Score(instructions="How upset is the customer?", criteria=LEVELS),
}
\`\`\`

注意：这里把 \`other\` 作为类别之一只是为了演示“不推荐”的写法；官方建议不要加兜底选项，改用 companion Noul。生产实现应删除 \`other\` 并保留 \`category_applicable\`。

## 第三步：调用

\`\`\`python
with TypeSafeClient(model="jev-1.14.0") as client:
    response = client.system_one(state=state, questions=questions)

a = response.answers
used_model = response.model  # 记录真实版本
\`\`\`

预期结果：\`answers\` 包含六个键，Noul 答案只有 \`noul\`，Choice 与 Score 有 \`confidence\` 与 \`probabilities\`。

## 第四步：确定性规则

\`\`\`python
def decide(a, facts):
    p_cat = a["category"].probabilities[a["category"].choice]
    trace = []

    if a["legal_threat"].noul > 0.85:
        return "fraud_team", ["legal_threat > 0.85"]
    if not facts["paid"]:
        return "human_review", ["not paid"]
    if a["category_applicable"].noul < 0.5 or p_cat < 0.7:
        return "clarify", ["category uncertain"]
    if a["frustration"].confidence < 0.5:
        trace.append("frustration unclear")
    if a["wants_refund"].noul > 0.75 and facts["eligible"] and facts["amount"] <= 100:
        return "auto_refund", trace + ["refund policy matched"]
    if a["duplicate_charge"].noul > 0.8:
        return "fraud_team", trace + ["duplicate charge"]
    return "human_review", trace + ["no rule matched"]
\`\`\`

\`decide\` 是纯函数，可直接单测所有分支。

## 第五步：人工与审计

人工队列展示判断分数、事实字段与 trace。审核结果写入标注集，用于后续阈值校准。

\`\`\`json
{"request_id":"uuid","model":"jev-1.14.0","action":"auto_refund",
 "trace":["legal_threat<=0.85","category p=0.91","refund policy matched"],
 "answers":{"wants_refund":{"type":"noul","noul":0.93}}}
\`\`\`

## 运行方法

1. 安装 \`pip install typesafe-sdk\`。
2. 设置 \`TYPESAFE_API_KEY\`。
3. 用本地 JSON 样本运行，先打印 answers 与 trace。
4. 确认路径符合预期后再接真实工单系统。

## 错误处理

- 422：检查 criteria 是否为 map（Choice）或数组（Score）。
- 429/529：指数退避。
- 低置信度：走 clarify，不自动执行。

## 常见错误

- 把政策判断全交给模型而不提取事实字段。
- 只记录最终 action，无法复盘。
- 用厂商示例阈值直接上线。

## 延伸阅读

- [Judgment 与 Decision 分离](/jevlab/articles/judgment-vs-decision/)
- [Calibration](/jevlab/articles/calibration/)`
  },

  {
    slug: 'practice-runtime', category: 'practice', title: '实战：自研 Judgment Runtime',
    description: '从 JudgmentProvider 到 Audit Log，实现一个可替换、可缓存、可回退的运行时。', tags: ['实战', 'Runtime'],
    body: `## 学习目标

用 TypeScript 实现一个最小但完整的 Judgment Runtime：Provider 抽象、Typed Result、Confidence Policy、Cache、Fallback 与 Audit Log。

![Judgment Runtime](/jevlab/diagrams/judgment-runtime.svg)

## 模块划分

\`\`\`text
src/runtime/
  provider.ts     JudgmentProvider 接口与 JevProvider / FakeProvider
  questions.ts    Question 构造器与 schema 校验
  result.ts       Typed Result 与概率访问器
  policy.ts       Confidence Policy 与动作决策
  cache.ts        请求去重与缓存
  audit.ts        审计日志
  runtime.ts      编排入口
\`\`\`

## Provider 抽象

\`\`\`typescript
export interface JudgmentProvider {
  judge(req: { state: unknown; questions: Record<string, any>; model: string }): Promise<JudgeResponse>;
}

export class FakeProvider implements JudgmentProvider {
  constructor(private fixed: JudgeResponse) {}
  async judge() { return this.fixed; }
}
\`\`\`

FakeProvider 让规则层的单测完全离线。

## Question 构造

\`\`\`typescript
export const noul = (instructions: string, criteria?: { true?: string; false?: string }) =>
  ({ type: 'noul' as const, instructions, ...(criteria ? { criteria } : {}) });

export const choice = <K extends string>(instructions: string, criteria: Record<K, string>) =>
  ({ type: 'choice' as const, instructions, criteria });

export const score = (instructions: string, criteria: string[]) =>
  ({ type: 'score' as const, instructions, criteria });
\`\`\`

## Typed Result 与概率访问

\`\`\`typescript
export function chosenProbability(answer: any): number {
  switch (answer.type) {
    case 'choice': return answer.probabilities[answer.choice];
    case 'score': return answer.probabilities[answer.confidence ? String(Math.round(answer.score)) : '0'] ?? 0;
    case 'noul': return answer.noul;
    default: return 0;
  }
}
\`\`\`

生产代码应对缺失 key 与 Box 的 null confidence 做防御。

## Confidence Policy

\`\`\`typescript
export type Action = 'execute' | 'confirm' | 'human' | 'abstain';

export function gate(p: number, risk: 'low' | 'medium' | 'high'): Action {
  if (risk === 'high') return p >= 0.95 ? 'confirm' : 'human';
  if (risk === 'medium') return p >= 0.85 ? 'execute' : p >= 0.6 ? 'confirm' : 'human';
  return p >= 0.7 ? 'execute' : p >= 0.45 ? 'confirm' : 'abstain';
}
\`\`\`

## Cache 与去重

缓存键由 \`model + state hash + questions hash\` 组成。对相同工单重复判断可直接返回缓存；注意缓存概率结果会掩盖分布漂移，需设置 TTL 并记录命中率。

## Fallback 链

\`\`\`typescript
async function withFallback(req, primary: JudgmentProvider, secondary?: JudgmentProvider) {
  try { return await primary.judge(req); }
  catch (err) {
    audit({ kind: 'provider_error', error: String(err) });
    if (secondary) return secondary.judge(req);
    return { model: 'fallback', answers: {}, usage: { input_tokens: 0, output_tokens: 0 } };
  }
}
\`\`\`

Fallback 返回的空答案应触发人工路径，而不是被当作成功。

## Audit Log

记录 request_id、model、state_hash、questions hash、answers、facts、trace、action、latency、usage。原始 PII 不入库。

## 组装 Runtime

\`\`\`typescript
export async function run(input) {
  const req = buildRequest(input);
  const cached = cache.get(req);
  if (cached) return cached;
  const response = await withFallback(req, provider, fallbackProvider);
  const action = decide(response.answers, input.facts);
  audit({ req, response, action });
  cache.set(req, response);
  return action;
}
\`\`\`

## 运行方法

1. \`npm install typescript\`。
2. 用 FakeProvider 跑单测，覆盖所有规则分支。
3. 换成 JevProvider 并设置 \`TYPESAFE_API_KEY\` 做集成测试。
4. 用固定样本集做回归与校准。

## 常见错误

- Provider 与策略耦合，导致无法离线测试。
- Fallback 静默返回默认值并自动执行。
- 缓存键不含模型版本。

## 延伸阅读

- [Agent Judgment Layer](/jevlab/articles/agent-judgment-layer/)
- [Evaluation Pipeline](/jevlab/articles/production-eval/)`
  },
];
