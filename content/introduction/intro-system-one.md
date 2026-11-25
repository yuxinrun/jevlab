---
title: "System One 模型是什么？"
description: "System One 是模型类别而非具体产品：理解它的定义、来源、训练主张与能力边界。"
category: introduction
categoryTitle: "第一部分 · Jev 入门"
order: 2
tags: [System One, 概念]
---
## 学习目标

理解 System One 作为一个“模型类别”的含义，区分官方声明与可独立验证的结论，并知道它适合放在系统的哪一层。

## 定义

官方原文：

> "System One models are a class of AI models built to make fast, structured decisions that software can use directly."
> "A System One model evaluates a state and returns typed answers and probabilities."

两个关键词：

1. **structured decisions for software**：输出是代码能直接使用的值，不是给人读的文本。
2. **probabilities**：不确定性以数值形式返回，而不是藏在 token 概率里。

![System One 概念图](/jevlab/diagrams/system-one-concept.svg)

## 为什么叫 System One

名字来自 Daniel Kahneman《Thinking, Fast and Slow》中的 System 1 / System 2：前者快速、直觉、自动；后者缓慢、审慎、费力。官方博客明确说，Jev 的重点是 "fast, focused judgments"，所以属于 System One。

这里的类比是**产品定位层面的类比**，不是对模型内部机制的声明。不要据此推断 Jev 复现了人脑的认知机制。

## 官方训练主张与边界

官方概念页写道：

> "System One models are trained for calibrated decisions: their probabilities are optimized against outcomes to reflect uncertainty."

同时明确说明：校准是在一组预测上衡量的，**不保证单个答案正确**。

发布博客进一步公开了三个名称：新模型架构（未披露细节）、parallel sampler（并行采样器，未披露实现）、RLCD（Reinforcement Learning for Calibrated Decisions，优化“epistemically honest probabilities”）。这些是厂商公开声明；没有公开算法公式、训练数据、参数规模或独立评测，因此本站只做转述，不做技术推断。

## 与传统 LLM 的差异

| 维度 | System One | 传统 LLM |
| --- | --- | --- |
| 输出 | typed answers + probabilities | 自由文本 |
| 答案空间 | Choice / Score / Noul / Box 预定义 | 开放式生成 |
| 擅长 | 快速、聚焦的语义判断 | 内容生成、开放推理 |
| 不擅长 | 写回复、写代码、解释推理 | 稳定地输出可直接消费的结构 |
| 不确定性表达 | 结果层概率 | token 概率，需额外处理 |

官方说 System One "do not write replies, produce code, or generate explanations of their reasoning"。这意味着它天然适合做管线中的一个节点，而不是端到端助手。

## 工作流中的位置

一个典型模式：

1. 构造 `state`：用户消息、订单、政策文本、检索片段。
2. 一次请求里提出多个独立问题。
3. 拿到 typed answers 与概率。
4. 代码结合确定性事实（金额、权限、状态机）形成决策。
5. 不确定或高风险路径转人工。

![判断与决策分离](/jevlab/diagrams/judgment-decision.svg)

## 设计取舍

System One 的约束是优势也是限制：答案空间被预定义，意味着不会有格式漂移；但也意味着你必须先想清楚要问什么。把复杂问题塞进一个 Choice，本质上是在用 prompt 模拟决策树，会把可观测性全部丢掉。

## 常见问题

**System One 是一个产品吗？** 不是。它是模型类别；Jev 是该类别的第一个模型。

**它比 LLM 更“聪明”吗？** 官方的速度与智能声明限定在 System One tasks，且来自厂商自报评测，不能外推为通用能力。

**我能训练自己的 System One 模型吗？** 官方没有公开训练方法或开源权重；不能基于公开资料复现。

## 延伸阅读

- [Jev 是什么？](/jevlab/articles/intro-what-is-jev/)
- [为什么软件需要 Judgment Model？](/jevlab/articles/intro-why-judgment/)
- 官方：https://docs.typesafe.ai/concepts/system-one
