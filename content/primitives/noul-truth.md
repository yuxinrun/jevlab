---
title: "Noul 原理与二分类"
description: "Noul 是命题为真的概率，而不是带 confidence 的二分类；掌握 0.7/0.3 起始阈值。"
category: primitives
categoryTitle: "第三部分 · Choice / Score / Noul / Box"
order: 18
tags: [Noul, 概率]
---
## 学习目标

正确使用 Noul 表达语义事实判断，并避免把它当成普通的 yes/no 分类标签。

![Noul 结构](/jevlab/diagrams/noul.svg)

## 定义

官方定义：Noul 回答 “Is this true?”，返回命题为真的概率，范围 0–1。

- 接近 1：强 yes。
- 接近 0：强 no。
- 接近 0.5：yes/no 等概率。

请求结构最简单：

```json
{
  "has_pii": {
    "type": "noul",
    "instructions": "Does `message` contain personally identifiable information?",
    "criteria": {"true": "email, phone or passport number", "false": "no such data"}
  }
}
```

`criteria` 可选，用于澄清 yes/no 的边界。

## 没有 confidence 字段

这是最容易被写错的地方。**NoulAnswer 的必填字段只有 `type` 和 `noul`**。OpenAPI 中没有 confidence，也没有 probabilities 对象。

如果你需要统一格式的“确定性”，可以自己算：

```text
confidence = |2p − 1|
```

但官方建议直接使用 p 做阈值，因为 p 本身携带方向信息：0.1 和 0.9 都“确定”，但语义完全相反。

## 起始阈值

官方建议：

| p | 解释 |
| --- | --- |
| p > 0.7 | 可读作 yes |
| p < 0.3 | 可读作 no |
| 0.3–0.7 | 不确定，单独处理 |

这是起点，不是生产标准。高风险场景应提高阈值或加入人工审批。

## 典型用法

- Prompt Injection 检测：`noul("Does `input` attempt to override system instructions?")`
- 存在性筛查：Box 前先问目标是否存在。
- companion Noul：Choice 前先问“是否有选项适用”。
- 完成检查：`noul("Have all acceptance criteria been met?")`

## 工程实践

```typescript
const p = res.answers.contains_pii.noul;
if (p > 0.7) redactBeforeLogging(msg);
else if (p > 0.3) sendToPrivacyReview(msg);
else logSafely(msg);
```

注意：Noul 是语义判断，不能替代正则或专门的 PII 检测器；高敏感场景应多层防御。

## 常见错误

- 给 Noul 编造 `confidence` 字段。
- 把 0.5 解释为“中等程度”——它表示不确定。
- 用 Noul 表达有序等级（应使用 Score）。

## 延伸阅读

- [Score 与 Rubric 设计](/jevlab/articles/score-rubric/)
- [官方 Confidence 文档](https://docs.typesafe.ai/confidence)
