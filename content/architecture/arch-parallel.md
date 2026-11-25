---
title: "Parallel Evaluation 与 Question Independence"
description: "为什么同一请求中的问题应相互独立，以及如何利用并行与投机式提问。"
category: architecture
categoryTitle: "第二部分 · 核心架构"
order: 12
tags: [并行, 原子判断]
---
## 学习目标

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

```text
Q1: 这是什么类型的请求？
Q2: 针对 Q1 的结果，应该采取什么动作？
```

Q2 拿不到 Q1 的答案。正确做法是把最终动作放到代码规则里，或者拆成第二次请求。

## 批次设计准则

- 同一 state、互不依赖 → 一个请求。
- 需要前一个答案才能构造第二个问题 → 两次请求。
- 不同 state（例如不同文档片段）→ 分别请求或使用多问题 + 明确路径引用。

## 请求数量限制

官方 primitives 页说请求中的问题数量没有硬限制，限制来自上下文大小。OpenAPI 中 `questions` 是 `minProperties: 1` 的 map，没有 maxProperties。仍建议按业务语义控制批次大小，便于观测与重试。

## 延迟策略

官方 Patterns 中有 "Speculative fan-out"：先把可能用到的所有问题一起发出，并用 Noul 先做筛选。这适合工具很多、但每次只用一两个的 Agent。

## 常见问题

**并行会不会让答案互相污染？** 官方称隔离评估；但你的 instructions 不应引用其他问题的答案。

**并行等于更低价格吗？** 不等于。计费基于 input tokens；并行改善的是延迟。

## 延伸阅读

- [Atomic Questions](/jevlab/articles/atomic-questions/)
- [Speculative Fan-out 官方模式](https://docs.typesafe.ai/patterns/fan-out)
