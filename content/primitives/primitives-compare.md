---
title: "四种 Primitive 怎么选"
description: "用决策树和对照表确定 Choice / Score / Noul / Box 的适用范围与组合方式。"
category: primitives
categoryTitle: "第三部分 · Choice / Score / Noul / Box"
order: 20
tags: [Primitives, 决策树]
---
## 学习目标

面对一个业务需求，能快速判断应该用哪种 primitive，或是否需要拆成多个问题。

![四种原语选择](/jevlab/diagrams/primitives-compare.svg)

## 决策树

```text
需要定位图像区域？ ── 是 → Box（实验性，需 Danger Zone 头）
        │否
        ▼
答案是 yes/no 且概率本身有用？ ── 是 → Noul
        │否
        ▼
答案之间有明确顺序？ ── 是 → Score
        │否
        ▼
从预定义互斥选项中选一个 → Choice
```

## 对照表

| 类型 | 问题 | 输出 | confidence | probabilities |
| --- | --- | --- | --- | --- |
| Choice | Which option? | `choice` | 有 | 有（每个选项） |
| Score | Which level? | `score` | 有 | 有（每个等级） |
| Noul | Is this true? | `noul` | **无** | 单值 p |
| Box | Where is it? | `box` 坐标 | 有（可 null） | 无 |

## 常见组合

| 场景 | 组合 |
| --- | --- |
| 工具路由 | Choice + companion Noul |
| 风险分级 | Score + confidence gate |
| 图像定位 | Noul（存在性）+ Box（坐标） |
| 审核流 | 多个 Noul + 代码规则 |
| 复杂决策 | 多个原子判断 + 确定性逻辑 |

## 反例

- 用 Score 表达“颜色”：颜色无序，应用 Choice。
- 用 Noul 表达“非常紧急”：有序程度应用 Score。
- 用 Choice 加 `other` 兜底：应改用 companion Noul。
- 用 Box 判断目标是否存在：Box 永远返回框，必须加 Noul。

## 组合示例

```json
{
  "state": {"ticket": "..."},
  "questions": {
    "category": {"type": "choice", "instructions": "...", "criteria": {"billing": "...", "technical": "..."}},
    "category_applicable": {"type": "noul", "instructions": "Does any category apply?"},
    "urgency": {"type": "score", "instructions": "...", "criteria": ["low", "medium", "high"]},
    "contains_threat": {"type": "noul", "instructions": "..."}
  }
}
```

一次请求，四个判断，彼此隔离。代码决定最终动作。

## 延伸阅读

- [Choice 原理](/jevlab/articles/choice-principle/)
- [Score Rubric](/jevlab/articles/score-rubric/)
- [Noul 原理](/jevlab/articles/noul-truth/)
- [Box 图像定位](/jevlab/articles/box-localization/)
