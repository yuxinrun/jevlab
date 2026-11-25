---
title: "State：把上下文当作数据"
description: "State 的设计原则、允许的输入形态、结构化引用方式与常见反模式。"
category: architecture
categoryTitle: "第二部分 · 核心架构"
order: 9
tags: [State, 架构]
---
## 学习目标

学会构造一个让多个问题共享、可被精确引用、且不会拖垮上下文的 state。

## State 是什么

OpenAPI 中 `SystemOneRequest.state` 的类型是 `FlexibleNoNull`：字符串、对象或数组（非空值）。它是所有问题共同评估的内容。

```json
{
  "model": "jev-1.14.0",
  "state": {
    "ticket": {"message": "...", "created_at": "..."},
    "policy": "Cancelled flights are eligible for a full refund.",
    "history": ["...", "..."]
  },
  "questions": { "...": {} }
}
```

官方文档强调：同一 state 的问题应在同一请求中提出，它们被并行、隔离地评估。

## 设计原则

### 1. 把事实与材料分开

把可精确计算的事实（金额、状态、时间戳）作为独立字段，把语义材料（消息、政策、文档片段）作为文本字段。这样代码逻辑可以直接读事实字段，模型只读语义字段。

### 2. 用反引号路径引用

当 state 是结构化 JSON 时，官方建议在 instructions 中用路径引用：``ticket.messages[0].text``、``refund_policy``、``order.charges``。这让问题指向明确，减少歧义。

### 3. 控制上下文尺寸

Jev 1.14 的默认限制是每请求 64k tokens（state + 所有 questions）、每问题 32k tokens（state + 单个 question）。可通过 `TypeSafe-Danger-Zone-Long-Context: true` 开启 262k，但官方说明更慢且精度更低，属于 Danger Zone 能力。

### 4. 不要塞入无关材料

每个问题都看到完整 state。无关材料会增加噪声与成本。如果两组问题依赖不同材料，拆成两个请求更合适。

## 图片 state

图片通过 `assets` 声明，可用 multipart 的 `part` 或 base64 `data_base64`。图片与 Box 必须带：

```http
TypeSafe-Danger-Zone-Images: true
```

官方将 Images / Box 标记为 Dreamer-ready，表示尚未达到生产就绪标准。

![State 到答案流程](/jevlab/diagrams/state-questions-answers.svg)

## 常见反模式

| 反模式 | 后果 | 改进 |
| --- | --- | --- |
| 把整个数据库记录塞进 state | 成本高、噪声大 | 只放判断需要的字段 |
| 用自然语言重复描述已知事实 | 语义冗余 | 直接放结构化字段 |
| 在 instructions 里隐含信息来源 | 指向不清 | 用路径引用 |
| 一个问题依赖另一个问题的答案 | 无法并行 | 拆成两次请求 |

## 运行方法

本地可先用静态 JSON 文件模拟 state，验证问题设计；确认后再接真实数据。不要在日志里打印包含 PII 的 state。

## 常见问题

**state 可以是数组吗？** 可以，只要是允许的非空值类型。

**可以在 state 中放图片 URL 吗？** 官方 asset 支持 base64 或 multipart part；不要假设服务会抓取远程 URL。

## 延伸阅读

- [Questions 设计](/jevlab/articles/arch-questions/)
- [Parallel Evaluation](/jevlab/articles/arch-parallel/)
