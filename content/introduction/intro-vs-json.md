---
title: "Jev 与 JSON Structured Output 的区别"
description: "结构只是表面相似：判别器 schema、概率来源与错误语义完全不同。"
category: introduction
categoryTitle: "第一部分 · Jev 入门"
order: 5
tags: [对比, Schema]
---
## 学习目标

识别“结构化输出”与“类型化判断”的差异，知道为什么 schema 相同并不意味着语义相同。

## 表面相似

两者都能得到这样的 JSON：

```json
{"choice": "technical", "confidence": 0.7, "probabilities": {"billing": 0.1, "technical": 0.8, "sales": 0.1}}
```

但生成路径与保证完全不同。

## 差异一：谁定义答案空间

Structured Output 通常由应用提供 JSON Schema，LLM 被约束为“符合 schema 的文本”。schema 可以是任意嵌套结构，但模型仍是在生成 token。

Jev 的 `Question` 在 OpenAPI 中是带 `discriminator` 的 `oneOf`：

```text
type = choice → ChoiceQuestion（criteria 为 map，1–255 项）
type = score  → ScoreQuestion（criteria 为数组，1–10 项）
type = noul   → NoulQuestion（instructions + 可选 criteria）
type = box    → BoxQuestion（instructions）
```

应用不是定义一个通用 JSON 结构，而是选择四种判断原语之一。

## 差异二：概率从哪来

Structured Output 的 JSON 里可以有一个手写字段叫 `confidence`，但那是模型生成的文本，没有 schema 保证它与真实正确率有关系。

Jev 的 `probabilities` 与 `confidence` 是响应 schema 的必填字段，由模型在预定义答案空间上输出；官方 Confidence 文档给出了 Choice 与 Score 的计算公式，说明 confidence 是分布的摘要。

## 差异三：错误语义

| 场景 | Structured Output | Jev |
| --- | --- | --- |
| 选项覆盖不足 | 模型可能编造一个枚举值或直接违反 schema | Choice 仍从给定项中选择，需用 companion Noul 检测“是否适用” |
| 分布平坦 | 没有统一表示 | confidence 低，可用阈值拦截 |
| 字段缺失 | 需要重试或修复 | 响应 schema 强制必填 |

## 差异四：批量判断

Jev 允许在一次请求中提交多个问题，官方说明它们针对同一 state 并行、隔离评估。Structured Output 通常是一次生成一个对象；要并行需要自己发多次请求或-prompts 拼装。

## 实践建议

如果你的需求只是“从 LLM 得到一个合法 JSON”，structured output 足够。如果你需要**可测量的不确定性、稳定答案空间、并行原子判断**，才需要 Judgment Model。

## 常见问题

**我能让 LLM 输出一样的 probabilities 吗？** 可以让它输出数字，但无法保证这些数字经过校准或有固定语义。评估方式必须是自有标注集上的可靠性图。

## 延伸阅读

- [Choice 原理与概率分布](/jevlab/articles/choice-principle/)
- [API 数据结构](/jevlab/articles/arch-api-schema/)
- 官方：https://api.typesafe.ai/openapi.json
