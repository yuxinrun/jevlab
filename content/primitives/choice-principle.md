---
title: "Choice 原理与概率分布"
description: "Choice 的答案空间、probabilities 与 confidence 的关系，以及为什么它会强制选一个。"
category: primitives
categoryTitle: "第三部分 · Choice / Score / Noul / Box"
order: 14
tags: [Choice, 概率]
---
## 学习目标

理解 Choice 的语义契约：从给定选项中选择一个，并返回完整分布。

![Choice 结构](/jevlab/diagrams/choice.svg)

## 什么时候用 Choice

官方定义：从**已知且无顺序关系**的选项中选一个。典型场景：意图分类、工具路由、模型路由、文档分类、技能选择。

如果用 Choice 表达“严重程度”，就丢失了等级顺序信息；那应该用 Score。

## 请求结构

```json
{
  "intent": {
    "type": "choice",
    "instructions": "What is the primary intent in `ticket.message`?",
    "criteria": {
      "refund": "The user wants money returned.",
      "rebooking": "The user wants a replacement flight.",
      "information": "The user only asks for information."
    }
  }
}
```

`criteria` 是必填 map，1–255 项。选项名建议使用稳定的机器标识（snake_case），描述写给模型看。

## 响应结构

```json
{
  "type": "choice",
  "choice": "refund",
  "confidence": 0.7,
  "probabilities": {"refund": 0.85, "rebooking": 0.10, "information": 0.05}
}
```

`probabilities` 覆盖所有给定选项，总和约等于 1；`choice` 是概率最高的选项。

## 概率分布怎么用

1. **Top probability**：`p = probabilities[choice]`，直接表示所选选项的概率。
2. **Top-to-second ratio**：`p_max / p_second`，衡量第一名相对第二名的优势。
3. **confidence**：分布集中度的归一化摘要。

官方 confidence 文档给出 Choice 公式：

```text
confidence = (p_max - 1/n) / (1 - 1/n)
```

例如三选项时 `(0.6, 0.3, 0.1)` 与 `(0.6, 0.2, 0.2)` 的 confidence 都是 0.4——它不区分第二名强弱。

## 强制选择与 companion Noul

Choice 总会返回一个选项，即使没有合适项。不要加入 `other` 或 `none of the above` 这类兜底选项；官方建议加一个独立的 Noul 判断“是否有选项适用”，然后在代码中处理。

```python
questions = {
    "route": Choice(instructions="...", criteria={...}),
    "any_match": Noul(instructions="Does at least one route describe the request?"),
}
```

## 阈值策略

官方建议对“将执行选项的概率”设阈值，而不是对 confidence 设阈值：

```python
a = response.answers["route"]
p = a.probabilities[a.choice]
if p < 0.67:
    route_to_human()
elif a.choice == "check_balance":
    show_balance()
elif a.choice == "approve_transfer" and p > 0.93:
    confirm_then_execute()
```

同一个系统里，低风险动作阈值可以低，高风险动作必须高。

## 常见问题

**概率会不会是 0 或 1？** 官方示例中出现 0 和 1；工程上仍应做边界防御。

**阈值多少合适？** 没有通用值。从保守阈值开始，用自己的标注数据评估。

## 延伸阅读

- [Choice 选项与 Criteria 设计](/jevlab/articles/choice-design/)
- [Choice Confidence 与阈值](/jevlab/articles/choice-confidence/)
