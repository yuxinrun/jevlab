---
title: "Jev 与规则引擎的区别"
description: "规则引擎负责确定性逻辑，Jev 负责语义判断；两者是组合关系而非替代关系。"
category: introduction
categoryTitle: "第一部分 · Jev 入门"
order: 7
tags: [对比, 规则]
---
## 学习目标

掌握“规则处理事实、模型处理语义”的边界划分方法。

## 规则引擎的优势

规则引擎（或普通 if/else）具备：

- 确定性：相同输入必然相同输出。
- 可审计：每条规则可追踪、可单测。
- 零模型成本：无需网络调用。

凡是能写成精确表达式的判断都应该留在代码里：金额阈值、时间窗口、权限、状态机转换、幂等键。

## 规则的盲区

自然语言和图像里的事实无法直接写成表达式：

```text
“我上周就被多扣了一次，现在又要扣，请立刻退款，否则我找律师。”
```

金额、时间、权限可以提取成字段；但“是否在威胁法律行动”“是否表达强烈不满”是语义判断。

## 正确组合方式

![判断与决策分离](/jevlab/diagrams/judgment-decision.svg)

```typescript
const judgments = await judge({
  wants_refund: noul('user explicitly asks for money back'),
  legal_threat: noul('user threatens legal action'),
  category: choice('issue type', { billing: '...', technical: '...' }),
});

if (!facts.verified) return 'human_review';
if (judgments.legal_threat.noul > 0.8) return 'fraud_team';
if (judgments.wants_refund.noul > 0.7 && facts.amount <= 25) return 'auto_refund';
return 'human_review';
```

规则引擎并不消失，它从“理解语言”变成“组合判断与事实”。

## 设计动机

官方文章把错误做法称为 "putting intelligence at the wrong layer of abstraction"：把所有例外规则塞进一个巨型 Choice 的 criteria，等于让模型扮演规则引擎。这样得到的系统不可单测、不可解释、难以扩展。

## 常见问题

**能不能把所有规则写成 Noul？** 技术上可以，但成本、延迟和不确定性都会上升，且失去了确定性保证。

**规则冲突怎么办？** 用代码中的优先级与审计日志解决，不要用模型再判断一次“哪条规则更重要”。

## 延伸阅读

- [Deterministic Logic 与可审计架构](/jevlab/articles/deterministic-logic/)
- 官方：https://typesafe.ai/blog/dont-call-it-a-decision-model
