---
title: "Deterministic Logic 与可审计架构"
description: "把规则、阈值、权限和日志放进代码，构建可测试、可回放的判断系统。"
category: judgment
categoryTitle: "第四部分 · Judgment Engineering"
order: 23
tags: [工程, 审计]
---
## 学习目标

设计一个可单测、可回放、可审计的判断管线，而不是依靠 prompt 隐式表达业务规则。

![Judgment Runtime](/jevlab/diagrams/judgment-runtime.svg)

## 为什么需要确定性逻辑

模型输出是概率性的；业务逻辑不应是。确定性逻辑提供：

- **可测试**：给定判断结果与事实，路径可单元测试。
- **可回放**：线上事故可用日志重放。
- **可权限控制**：高风险动作由策略层拦截。
- **可扩展**：新分支不影响已验证分支。

## 一个最小 Rule Engine

```typescript
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
```

`decide` 是纯函数，可以用普通测试框架覆盖所有分支，不需要调用模型。

## 审计日志字段

每次请求至少记录：

```json
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
```

不要在日志中保存原始 PII；保存哈希与必要字段。

## 回放与版本回归

模型别名会移动，响应中的 `model` 才是真实版本。生产建议：

1. 锁定版本化 ID（如 `jev-1.14.0`）。
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
- [Evaluation Pipeline](/jevlab/articles/production-eval/)
