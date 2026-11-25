---
title: "Jev 与分类模型的区别"
description: "从标签空间、输入形态、冷启动与概率校准角度比较判别式分类模型与 System One。"
category: introduction
categoryTitle: "第一部分 · Jev 入门"
order: 6
tags: [对比, 分类]
---
## 学习目标

理解什么时候该训练分类器，什么时候该调用 Judgment Model。

## 传统分类模型

监督分类流程：收集标注数据 → 训练模型 → 固定标签空间 → 部署。它擅长高吞吐、低延迟、稳定分布的任务，例如垃圾邮件过滤。

优点：成本可控、行为稳定、可用自有数据定制。
缺点：标签空间变更要重新训练；长尾与语义漂移需要持续标注；输入通常是向量化文本或图像，规则与上下文难以注入。

## Jev 的做法

Jev 不需要你训练模型，而是在请求里临时定义答案空间：

```python
from typesafe_sdk import Choice, TypeSafeClient

with TypeSafeClient(model="jev-1.14.0") as client:
    response = client.system_one(
        state={"ticket": message, "policy": policy_text},
        questions={"intent": Choice(
            instructions="What is the primary intent in `ticket`?",
            criteria={"refund": "wants money back", "status": "asks for status"},
        )},
    )
```

改标签只需改 `criteria`，不需要训练。上下文可以同时放消息、政策文档和历史摘要。

## 关键差异

| 维度 | 分类模型 | Jev |
| --- | --- | --- |
| 标签空间 | 训练时固定 | 请求时定义（Choice ≤255） |
| 领域适配 | fine-tune / 数据标注 | state + instructions + criteria |
| 输入 | 通常是单一文本/图像 | 文本、JSON、图像资产组合 |
| 概率 | 依赖模型校准方法 | 结果层概率，官方称针对校准训练 |
| 定制权重 | 可以有 | 官方明确不按账户做 fine-tune/LoRA |

最后一点很重要：官方文档写明 Jev 不为单个账户定制权重，所有账户使用同一套权重。所谓“领域适配”是通过输入设计完成的。

## 什么时候仍应选分类器

- 标签体系长期稳定、流量巨大、延迟与成本极敏感。
- 有充足标注数据且分布稳定。
- 需要完全私有化部署。

## 什么时候选 Jev

- 标签随业务快速变化。
- 判断依赖多段上下文与自然语言政策。
- 需要把多个语义判断组合成工作流。

## 常见问题

**Jev 是否取代分类器？** 不是。它是另一种折中：用更灵活的输入换取调用成本与厂商依赖。

## 延伸阅读

- [高基数选择与选项设计](/jevlab/articles/choice-design/)
- [Models 官方文档](https://docs.typesafe.ai/models)
