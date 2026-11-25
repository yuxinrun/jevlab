---
title: "Questions：问题即接口"
description: "问题 ID、type、instructions、criteria 的职责划分与设计要求。"
category: architecture
categoryTitle: "第二部分 · 核心架构"
order: 10
tags: [Questions, 接口设计]
---
## 学习目标

掌握四类问题的共同结构，学会把业务问题翻译成模型能稳定回答的接口。

## 一个问题的四个部分

| 部分 | 作用 | 是否发给模型 |
| --- | --- | --- |
| ID（question key） | 代码中定位答案 | 否 |
| `type` | 选择 primitive | 是 |
| `instructions` | 完整问题或判断语句 | 是 |
| `criteria` | 选项 / 等级 / yes-no 标准 | 是（依类型而定） |

官方特别提醒：即使 ID 已经看起来清楚的（如 `refund_requested`），也要在 `instructions` 里写完整问题。

## 各类型的 criteria

```json
{
  "intent": {"type": "choice", "instructions": "...", "criteria": {"a": "…", "b": "…"}},
  "severity": {"type": "score", "instructions": "...", "criteria": ["...", "...", "..."]},
  "has_pii": {"type": "noul", "instructions": "...", "criteria": {"true": "...", "false": "..."}},
  "button": {"type": "box", "instructions": "the Submit button in `screenshot`"}
}
```

- Choice：map，1–255 项，无序且互斥。
- Score：数组，1–10 项，**位置决定分数，从 0 开始**。
- Noul：可选 `criteria`，用 `true` / `false` 澄清判定标准。
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
- [Choice 选项设计](/jevlab/articles/choice-design/)
