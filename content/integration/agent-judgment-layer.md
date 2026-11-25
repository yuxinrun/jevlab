---
title: "Agent Judgment Layer"
description: "在 Agent 架构中插入独立的判断层，连接编排器、工具、模型与人工审核。"
category: integration
categoryTitle: "第七部分 · Agent 集成"
order: 29
tags: [Agent, 架构]
---
## 学习目标

把 Jev 封装为 Agent 系统里的 Judgment Provider，并划定它与 Orchestrator 的边界。

![Agent Judgment Layer](/jevlab/diagrams/agent-judgment-layer.svg)

## 分层

```text
Orchestrator  →  决定下一步调用什么、维护循环与状态
Judgment Layer →  把语义问题转成 typed questions 并调用 Provider
Policy Layer  →  阈值、权限、人工审批、fallback
Executors     →  工具、LLM、技能、浏览器动作
Verifier      →  判断结果是否满足目标
```

## Provider 接口

```typescript
interface JudgmentProvider {
  judge(input: { state: unknown; questions: Record<string, Question> }): Promise<Answers>;
}

class JevProvider implements JudgmentProvider {
  constructor(private client: TypeSafeClient, private model = 'jev-1.14.0') {}
  judge(input: { state: unknown; questions: Record<string, Question> }) {
    return this.client.systemOne({ model: this.model, ...input });
  }
}
```

抽象的价值：测试时替换为确定性 FakeProvider；生产可切换模型或供应商。

## 典型流程

1. Orchestrator 收集 state。
2. Judgment Layer 一次性提出独立问题（路由、风险、完成度）。
3. Policy Layer 根据概率与风险决定路径。
4. Executor 执行工具或模型调用。
5. Verifier 用 Noul 检查结果是否满足目标；不满足则回到循环。

## 关键设计点

- **不要让 Judgment Layer 执行动作**：它只返回判断。
- **一次请求问完独立问题**：降低延迟。
- **记录 trace**：每次路径选择都可读。
- **策略与 prompt 分离**：阈值变化不改模型调用。

## 官方线索

文档有 `Jev with coding agents`、`Function calling`、`Skill suggestion`、`Guardrails for LLMs`、`Tool-call safety gate` 等 cookbook；集成仓库为 typesafe-ai/skills。使用前核对当前版本。

## 常见错误

- 把 Agent 状态机写进 criteria。
- 让模型直接调用工具而绕过策略层。
- 没有 FakeProvider，导致单测依赖网络。

## 延伸阅读

- [Tool / Model / Skill Routing](/jevlab/articles/agent-routing/)
- [自研 Judgment Runtime](/jevlab/articles/practice-runtime/)
