---
title: "Typed Answers：让代码直接消费判断"
description: "四种 Answer 结构、判别器、字段必填性与 TypeScript / Python 类型消费方式。"
category: architecture
categoryTitle: "第二部分 · 核心架构"
order: 11
tags: [Schema, 类型]
---
## 学习目标

读懂 `Answer` 判别器，能在 TypeScript 与 Python 中安全地消费答案。

## Answer 是带判别器的 oneOf

OpenAPI 中 `Answer` 使用 `type` 作为 discriminator：

| type | 必填字段 | 可选/条件字段 |
| --- | --- | --- |
| `noul` | `type`, `noul` | 无 confidence |
| `choice` | `type`, `choice`, `confidence`, `probabilities` | — |
| `score` | `type`, `score`, `confidence`, `legend`, `probabilities` | — |
| `box` | `type`, `box`, `confidence` | `confidence` 在 schema 中可为 null |

这是本站核对 Schema 后的结论：**NoulAnswer 没有单独的 confidence 字段**。

## 完整响应示例

```json
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
```

数值来自官方文档示例，用于展示结构，不代表你的调用结果。

## TypeScript 类型消费

官方 JS SDK 会从 questions 推断答案类型：

```typescript
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
```

## Python 类型消费

```python
from typesafe_sdk import Choice, Noul, TypeSafeClient

with TypeSafeClient(model="jev-1.14.0") as client:
    response = client.system_one(
        state=ticket,
        questions={"dept": Choice(instructions="...", criteria={"billing": "...", "technical": "..."})},
    )

answer = response.answers["dept"]
print(answer.choice, answer.confidence, answer.probabilities)
```

Quickstart 也展示了便捷访问器 `response.choices["dept"]` / `response.nouls["urgent"]`；返回结构以你安装的 SDK 版本文档为准。

## 消费原则

1. 永远先读 `type`，再访问类型专属字段。
2. 对 Box 的 `confidence` 做 null 防御，尽管文档正文描述为 0–1 数值。
3. 记录响应中的 `model` 字段，它是实际回答的版本化模型 ID，可能与请求的别名不同。

## 延伸阅读

- [API 数据结构](/jevlab/articles/arch-api-schema/)
- [Probability 与 Confidence](/jevlab/articles/probability-confidence/)
