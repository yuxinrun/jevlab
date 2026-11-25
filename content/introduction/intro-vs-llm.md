---
title: "Jev 与传统 LLM 的区别"
description: "逐项比较输出形态、答案空间、概率语义、延迟与失败模式，避免把 Jev 当成聊天模型。"
category: introduction
categoryTitle: "第一部分 · Jev 入门"
order: 4
tags: [对比, LLM]
---
## 学习目标

能够向团队解释：为什么“让 LLM 输出 JSON”与“使用类型化判断模型”不是同一件事。

![LLM 与 Jev 对比](/jevlab/diagrams/llm-vs-jev.svg)

## 六个关键差异

### 1. 输出契约

LLM 输出 token 序列；即使使用 JSON mode 或 structured output，也仍需处理解析失败、枚举外取值与字段缺失。Jev 的响应 schema 在 OpenAPI 中固定：`answers.<id>` 的结构由 question 的 `type` 判别器决定。

### 2. 答案空间

Choice 的 `criteria` 是一个 map，最多 255 个选项；Score 的 `criteria` 是有序数组，最多 10 级；Noul 返回 0–1；Box 返回归一化坐标。答案空间由请求预先定义，模型不会返回范围外的值。

### 3. 概率语义

LLM 的 token logprob 描述“下一个 token 的倾向”，不等于业务命题为真的概率。Jev 的 `probabilities` 直接覆盖你给出的选项或等级；Noul 的 `noul` 是命题为真的概率。

### 4. 失败方式

| LLM | Jev |
| --- | --- |
| 格式漂移 | 分布平坦、边界误判 |
| 幻觉内容 | 选项覆盖不足导致被迫选择 |
| 长链推理偏差 | 问题设计不当导致语义错配 |

Jev 的失败更“可测量”：你能看到完整分布，并用阈值拦截。

### 5. 延迟与成本

厂商发布博客自报：System One 形查询端到端 70–500 ms，并称比对比模型快 40–200 倍；输入价格 $0.042/MTok，输出免费。这些是**厂商声明，且限定在 System One tasks 与发布时条件**，不是独立评测，也不是长期商业承诺。

### 6. 系统角色

LLM 更适合作为生成与推理节点；Jev 更适合作为判断节点。二者可以共存：LLM 生成草稿，Jev 判断草稿是否满足来源与政策要求。

## 一个对照实验设计

不要引用厂商 benchmark 下结论。用自己的数据做对照：

1. 选 200 条真实样本并标注 gold label。
2. A 组：LLM + structured output；B 组：Jev Choice。
3. 记录准确率、格式失败率、p95 延迟、单位成本。
4. 分别画可靠性图，检查概率是否可用于阈值。
5. 只报告你自己的数据。

## 常见问题

**Jev 能写代码吗？** 官方说 System One 不生成代码。它适合判断“这段代码是否完成了任务”，而不是写代码本身。

**Jev 会解释理由吗？** 不会。这既是限制也是优势：可观测性来自多个原子判断与代码路径，而不是自由文本解释。

## 延伸阅读

- [Jev 与 JSON Structured Output 的区别](/jevlab/articles/intro-vs-json/)
- [Probability 与 Confidence](/jevlab/articles/probability-confidence/)
- 官方：https://typesafe.ai/blog/introducing-system-one-models-and-jev
