---
title: "为什么软件需要 Judgment Model？"
description: "从 if-statement 的语义缺口出发，解释判断模型的工程价值与适用边界。"
category: introduction
categoryTitle: "第一部分 · Jev 入门"
order: 3
tags: [架构, Judgment]
---
## 学习目标

理解“语义判断”为什么不能完全靠规则、也不能完全靠生成式 LLM，并掌握判断层的抽象位置。

## 问题：代码无法直接理解语义

软件擅长精确判断：

```python
if order.amount <= 25 and order.paid and policy.eligible:
    issue_refund(order.id)
```

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

```text
事实（Facts）      → 代码：金额、权限、时间、状态
语义判断（Judgment）→ 模型：意图、风险、等级、位置
决策（Decision）   → 代码：规则组合 + 策略阈值 + 人工审核
```

官方对此的表述是：

> "Code is great for answering what it can answer exactly. Jev answers only the small questions code can't. Logic then combines those answers into the decision."

## 一个可运行的心智模型

```typescript
type Judgment = { p: number; threshold: number };

function decide(j: Record<string, Judgment>, facts: { amount: number; verified: boolean }) {
  if (!facts.verified) return 'human_review';
  if (j.unauthorized.p >= 0.85) return 'fraud_team';
  if (j.wants_refund.p < 0.7) return 'clarify';
  if (facts.amount <= 25 && j.policy_match.p >= 0.8) return 'auto_refund';
  return 'human_review';
}
```

注意：模型只提供 `p`，所有业务含义都在代码里。这就是“智能放在正确的抽象层”。

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
- 官方：https://typesafe.ai/blog/dont-call-it-a-decision-model
