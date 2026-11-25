---
title: "Jev 是什么？"
description: "从官方定义出发理解 Jev 的产品定位、接口边界、版本与它不是什么。"
category: introduction
categoryTitle: "第一部分 · Jev 入门"
order: 1
tags: [Jev, System One, 定位]
---
## 学习目标

读完本文，你应该能回答：Jev 是谁做的、它解决什么问题、它的输入输出是什么、它与 Agent Framework 的边界在哪里，以及研究它时哪些结论是不能下的。

## 背景与问题

应用系统里存在大量“小判断”：用户是不是在要求退款？这条消息是否带有威胁？这个 bug 该进哪个冲刺？这些问题需要语义理解，但又不需要长篇推理。传统做法是让 LLM 生成一段文本，再让代码从中解析出结构——这一步既脆弱又不可预测。

TypeSafe 给出的答案是 Jev：直接返回结构化答案的模型服务。

> 官方定义（Introduction）："Jev is TypeSafe's flagship model and the first System One model. Send state and typed questions; get structured answers your code can use directly."

![Jev 总体架构图](/jevlab/diagrams/jev-architecture.svg)

## 它是什么

- **开发者与服务提供方**：TypeSafe。Jev 是闭源模型服务，通过 API 和官方 SDK 使用。
- **模型类别**：第一个 System One model。System One 是为快速、结构化、软件可直接使用的判断而设计的一类模型。
- **输入**：一个 `state`（字符串、JSON 对象或数组，图像需额外 assets）和一组带 ID 的 `questions`。
- **输出**：按 question ID 组织的 `answers`，每个答案是带类型的结构（Choice / Score / Noul / Box），以及 `usage`。
- **核心承诺**："Jev evaluates typed questions against a state and returns structured results directly. No text generation, no parsing."

## 它不是什么

这一点决定你能不能正确使用它：

| 它不是 | 原因 |
| --- | --- |
| Agent Framework | 它不提供循环、工具调度、记忆或状态机 |
| LangGraph 式 Orchestration Runtime | 执行图与重试策略由你的代码决定 |
| Pi 式 Agent Core | 没有自主规划或多步执行能力 |
| 可下载源码的开源模型 | 架构、权重、训练数据与采样实现均未公开 |
| 最终业务决策者 | 官方明确说：Jev makes judgments, code makes decisions |

因此，本站不会描述它的网络结构、参数量、训练语料或未公开的采样细节；这些都没有公开依据。

## 版本与 API 基线（研究日期 2026-11-25）

| 项目 | 值 | 来源 |
| --- | --- | --- |
| 最新稳定模型 | `jev-1.14.0`（2026-10-14 起可用） | Models / Jev 1.14 博客 |
| 默认别名 | `jev-latest`，SDK 默认值 | Quickstart / Models |
| Preview 别名 | `jev-preview`，当前也指向 1.14.0，暂无独立 preview 构建 | Models |
| API 版本 | `0.2.0`（OpenAPI 3.1.0） | api.typesafe.ai/openapi.json |
| 端点 | `GET /v1/models`、`POST /v1/systemone` | OpenAPI |
| Python SDK | `typesafe-sdk`（模块 `typesafe_sdk`） | SDK 文档 |
| JavaScript SDK | `@typesafe-ai/sdk`（文档关联 v0.7.0） | SDK 文档 |

文档URL 会变化，本站始终以 `llms.txt` 为索引入口，用 `.md` 版本核对原文。

## 一次调用的完整形状

```bash
curl https://api.typesafe.ai/v1/systemone \
  -H "Authorization: Bearer $TYPESAFE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "jev-1.14.0",
    "state": {"message": "My flight was cancelled. Can I get a refund?"},
    "questions": {
      "refund_requested": {"type": "noul", "instructions": "Does the message request a refund?"},
      "request_type": {
        "type": "choice",
        "instructions": "What is the main request?",
        "criteria": {"refund": "wants money back", "rebooking": "wants another flight"}
      }
    }
  }'
```

响应按 question ID 返回：

```json
{
  "model": "jev-1.14.0",
  "answers": {
    "refund_requested": {"type": "noul", "noul": 0.98},
    "request_type": {
      "type": "choice", "choice": "refund",
      "confidence": 0.7,
      "probabilities": {"refund": 0.85, "rebooking": 0.15}
    }
  },
  "usage": {"input_tokens": 428, "output_tokens": 73}
}
```

上面的数值是结构示例，不是真实调用结果；实际值随输入和模型版本变化。

## 常见问题

**Jev 会不会“幻觉”？** 厂商文章称其 "can't hallucinate"，但边界是输出被预定义结构约束：它不能生成范围外的选项或类型错误。这不等于开放式事实问答绝对正确，也不能把厂商声明当作独立验证。

**我需要自己部署模型吗？** 不需要也不能。它是托管服务，通过 API Key 调用。

**可以用它替代规则引擎吗？** 不应该。精确计算交给代码，Jev 只回答代码回答不了的语义小问题。

## 设计取舍

把 Jev 放在“判断层”而不是“决策层”，换来的是可观测性与可替换性：你可以看到六个判断的分数与代码路径，而不是只有一个“模型选错了”。代价是需要自己设计问题拆分与组合规则。

## 延伸阅读

- [System One 模型是什么？](/jevlab/articles/intro-system-one/)
- [Judgment 与 Decision 分离](/jevlab/articles/judgment-vs-decision/)
- 官方：https://docs.typesafe.ai/introduction · https://docs.typesafe.ai/models
