export const articles = [
  {
    slug: 'judgment-vs-decision', category: 'judgment', title: 'Judgment 与 Decision 分离',
    description: '本站核心原则：模型产出语义判断，代码结合事实与规则形成决策。', tags: ['核心原则', '架构'],
    body: `## 学习目标

能够用 Judgment / Decision 分离原则审查任意 AI 工作流设计，并指出“智能放错层”的反模式。

![判断与决策分离](/jevlab/diagrams/judgment-decision.svg)

## 官方原文

TypeSafe 2026-11-03 博客 *Don't Call It a Decision Model* 的核心句：

> **Jev makes judgments, code makes decisions.**

文章解释为什么公司坚持叫它 System One model 而不是 decision model：系统中的决策很少是一个原子选择。把完整决策塞进一个巨大 Choice，等于把所有边界条件、例外规则写进 criteria，形成 "prompt gymnastics"。

## 三层分工

| 层 | 内容 | 负责者 |
| --- | --- | --- |
| Facts / Logic | 金额是否 ≤ $25、状态是否 active、权限是否满足 | 代码 |
| Judgment | 用户是否想退款、是否威胁法律行动、证据是否显示重复扣款 | Jev |
| Decision | fraud_team / refund now / handoff_person / answer & continue | 代码组合 |

官方退款例子里，判断是六个小问题，最终决策由逻辑路径产生。你看到的不是“模型选择了 fraud_team”，而是“模型做了这六个判断，并遵循了这条逻辑路径”。

## 为什么必须拆

### 1. 设计清晰

拆开后能看清哪些 edge case 需要处理，哪些是语义问题，哪些是数学问题。

> "Checking 'claim eligible, unpaid' is math. Answering 'does the user want money back?' takes judgment."

### 2. 可观测

单一巨大 Choice 出错时，你只有一个概率值；拆开后能看到每个判断分数、代码事实与路径。这对事故复盘至关重要。

### 3. 可扩展

新增输出路径时只需增加相关判断和规则。官方指出所有 judgments 隔离评估，因此不必担心新判断影响已验证的旧判断。

## 反面案例

\`\`\`text
criteria = {
  "refund_if_eligible_and_angry_but_not_fraud": "...",
  "escalate_if_legal_threat_or_high_value": "...",
  "answer_normally": "..."
}
\`\`\`

问题：规则一变就要改 prompt；无法单测；无法知道是哪个条件出错；新增分支会改变已有分支的语义。

## 正确实现

\`\`\`python
j = answers
facts = {"amount": 18, "eligible": True, "verified": True}

if not facts["verified"]:
    path = "human_review"
elif j["legal_threat"].noul > 0.85:
    path = "fraud_team"
elif j["wants_refund"].noul > 0.7 and facts["eligible"]:
    path = "auto_refund"
else:
    path = "answer_and_continue"
\`\`\`

每条规则都可单测；每个判断都有日志；阈值可按风险调整。

## 权限与人工审核

即使模型与规则都给出自动路径，策略层仍应控制最终动作：

- 高风险动作（转账、删除、外发）必须二次确认或人工审批。
- 模型不确定（概率落在中间带）时不执行。
- 所有自动动作可审计、可回滚。

## 常见异议

**“这样代码会变复杂”？** 复杂度从不可见 prompt 转移到可测试代码，这是值得的。

**“模型明明能一次选出来”？** 能选不代表应该选；可观测性与权限控制是系统需求。

## 延伸阅读

- [Atomic Questions](/jevlab/articles/atomic-questions/)
- [Deterministic Logic 与可审计架构](/jevlab/articles/deterministic-logic/)
- 官方：https://typesafe.ai/blog/dont-call-it-a-decision-model`
  },

  {
    slug: 'atomic-questions', category: 'judgment', title: 'Atomic Questions：把复杂判断拆小',
    description: '原子化判断的标准、拆分方法、组合模式与验证方式。', tags: ['Atomic', '问题设计'],
    body: `## 学习目标

把一个模糊的大问题拆成可独立验证的原子问题，并用代码组合答案。

![原子问题](/jevlab/diagrams/atomic-questions.svg)

## 什么是原子问题

官方把 System One 问题类比为 “gut-check determination”：一个问题只问一件范围清晰的事，能在“一秒钟”内判断。

合格例子：

- 用户是否明确要求退款？
- 消息是否提到律师或法律行动？
- 订单金额是否大于政策上限？（这类其实应由代码回答）
- 这段回复是否引用了来源？

不合格例子：

- 分析整条消息并决定最佳处理方式。
- 判断客户是否满意并给出后续策略。

## 拆分方法

1. **列出决策涉及的所有语义条件**：意图、风险、情绪、政策匹配、证据。
2. **把可精确计算的条件移给代码**：金额、时间、状态、权限。
3. **为每个语义条件写一个问题**：优先 Noul；有顺序用 Score；互斥类别用 Choice。
4. **检查独立性**：一个问题不能依赖另一个问题的答案。
5. **放到同一请求**：共享 state，并行评估。

## 组合模式

| 模式 | 说明 |
| --- | --- |
| 全通过（AND） | 所有判断超过阈值才自动执行 |
| 任一命中（OR） | 任一风险判断命中就拦截 |
| 加权评分 | 多个 Score 按代码权重合成 |
| 分级阈值 | 不同动作使用不同阈值 |
| 短路路径 | 高风险判断优先，命中即转人工 |

## 示例：客服工单

\`\`\`python
questions = {
    "wants_refund": Noul(instructions="Does \`ticket\` explicitly request a refund?"),
    "duplicate_charge": Noul(instructions="Does \`ticket\` claim a duplicate charge?"),
    "legal_threat": Noul(instructions="Does \`ticket\` mention legal action?"),
    "frustration": Score(instructions="How frustrated is the customer?", criteria=LEVELS),
    "category": Choice(instructions="Main issue type", criteria=CATEGORIES),
}
\`\`\`

五个判断彼此隔离。代码根据 Noul 概率、Score 等级与事实字段走不同路径。

## 如何验证拆分是否合理

- **稳定性**：同一个判断在相似输入上是否稳定？
- **可解释性**：出问题时能否指出具体哪个判断错了？
- **覆盖率**：是否存在没有任何判断覆盖的边界情况？
- **回归安全**：新增判断后，旧判断结果是否变化？官方称隔离评估，仍建议用固定样本集回归测试。

## 过度拆分的代价

问题太多会增加输入 token 与认知噪声；每个判断都需要自己的阈值与评估数据。经验做法是先拆到能解释路径为止，而不是无限拆。

## 常见错误

- 在 instructions 中引用另一个问题的答案。
- 一个 Noul 同时问两件事（"Is it urgent and angry?"）。
- 把最终业务决策写成 Choice。

## 延伸阅读

- [Judgment 与 Decision 分离](/jevlab/articles/judgment-vs-decision/)
- [Parallel Evaluation](/jevlab/articles/arch-parallel/)`
  },

  {
    slug: 'deterministic-logic', category: 'judgment', title: 'Deterministic Logic 与可审计架构',
    description: '把规则、阈值、权限和日志放进代码，构建可测试、可回放的判断系统。', tags: ['工程', '审计'],
    body: `## 学习目标

设计一个可单测、可回放、可审计的判断管线，而不是依靠 prompt 隐式表达业务规则。

![Judgment Runtime](/jevlab/diagrams/judgment-runtime.svg)

## 为什么需要确定性逻辑

模型输出是概率性的；业务逻辑不应是。确定性逻辑提供：

- **可测试**：给定判断结果与事实，路径可单元测试。
- **可回放**：线上事故可用日志重放。
- **可权限控制**：高风险动作由策略层拦截。
- **可扩展**：新分支不影响已验证分支。

## 一个最小 Rule Engine

\`\`\`typescript
type Verdict = Record<string, { type: string; p?: number; score?: number; choice?: string; confidence?: number }>;
type Facts = { amount: number; verified: boolean; policyEligible: boolean };

export function decide(v: Verdict, facts: Facts) {
  const trace: string[] = [];
  if (!facts.verified) { trace.push('unverified → human_review'); return { action: 'human_review', trace }; }
  if (v.legal_threat.p! > 0.85) { trace.push('legal_threat>0.85 → fraud_team'); return { action: 'fraud_team', trace }; }
  if (v.wants_refund.p! < 0.7) { trace.push('wants_refund<0.7 → clarify'); return { action: 'clarify', trace }; }
  if (facts.policyEligible && facts.amount <= 25 && v.wants_refund.p! > 0.8) {
    trace.push('eligible & amount<=25 & p>0.8 → auto_refund'); return { action: 'auto_refund', trace };
  }
  trace.push('default → human_review'); return { action: 'human_review', trace };
}
\`\`\`

\`decide\` 是纯函数，可以用普通测试框架覆盖所有分支，不需要调用模型。

## 审计日志字段

每次请求至少记录：

\`\`\`json
{
  "request_id": "uuid",
  "model": "jev-1.14.0",
  "state_hash": "sha256:...",
  "questions": {"wants_refund": {"type": "noul", "instructions": "..."}},
  "answers": {"wants_refund": {"type": "noul", "noul": 0.92}},
  "facts": {"amount": 18, "verified": true},
  "trace": ["legal_threat<=0.85", "wants_refund>0.8", "auto_refund"],
  "action": "auto_refund",
  "latency_ms": 184,
  "usage": {"input_tokens": 428, "output_tokens": 73}
}
\`\`\`

不要在日志中保存原始 PII；保存哈希与必要字段。

## 回放与版本回归

模型别名会移动，响应中的 \`model\` 才是真实版本。生产建议：

1. 锁定版本化 ID（如 \`jev-1.14.0\`）。
2. 记录 version 与 prompt/criteria hash。
3. 新版本上线前用固定样本集回归。
4. 阈值变更同样纳入版本管理。

## 可观测性指标

- 各判断的概率分布与 confidence。
- 自动执行率、转人工率、拒绝率。
- 人工复核后的实际正确率（用于校准）。
- 延迟 p50/p95、token 成本。

## 常见错误

- 把阈值写进 instructions。
- 只记录最终 action，不记录判断与路径。
- 使用别名却不记录实际模型版本。

## 延伸阅读

- [Judgment Runtime 实战](/jevlab/articles/practice-runtime/)
- [Evaluation Pipeline](/jevlab/articles/production-eval/)`
  },
];
