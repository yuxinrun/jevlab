---
title: "Jev 与 Agent Framework 的关系"
description: "明确 Jev 不是 Agent Core：它提供判断原语，Agent 负责编排、工具与执行。"
category: introduction
categoryTitle: "第一部分 · Jev 入门"
order: 8
tags: [Agent, 架构]
---
## 学习目标

理解 Jev 在 Agent 系统里的位置：一个可调用的 Judgment Provider，而不是 Agent 本身。

## Agent 系统的典型分层

![Agent Judgment Layer](/jevlab/diagrams/agent-judgment-layer.svg)

```text
User / Task
   ↓
Orchestrator（循环、计划、状态机）   ← LangGraph / 自研 runtime
   ↓
Judgment Layer                       ← Jev
   ↓
Tools / Models / Skills              ← 由策略层选择
   ↓
Verification / Human Approval        ← 完成检查与高风险审批
```

Jev 只出现在 Judgment Layer。它不管理循环、不调用工具、不持有长期记忆。

## 它能做什么

- Tool Routing：判断应该用哪个工具。
- Model Routing：判断任务难度，选择轻量模型或推理模型。
- Skill Selection：从技能列表中挑选最相关的。
- Guardrail：检测注入、越权或 PII。
- Completion Checker：判断任务是否真的完成。
- Context Filtering：判断哪些检索片段相关。

## 它不能做什么

- 自主规划多步任务。
- 执行工具调用或维护 agent state。
- 记住跨请求的对话历史（你需要把历史放进 state）。
- 决定最终业务动作。

## 一个 Coding Agent 例子

```python
answer = client.system_one(
    state={"task": task, "files": changed_files, "test_output": test_output},
    questions={
        "needs_more_tests": noul("Test output indicates missing coverage"),
        "route": choice("Next action", {"run_tests": "...", "edit_code": "...", "ask_user": "..."}),
    },
)
if answer.answers.route.probabilities[answer.answers.route.choice] < 0.75:
    ask_user()
elif answer.answers.route.choice == "run_tests":
    run_tests()
```

这里 Agent Runtime 仍然负责循环与执行；Jev 只提供两个判断。

## 官方集成线索

官方仓库 `typesafe-ai/skills` 提供面向 coding agent 的集成指导；文档也有 `Jev with coding agents`、LangChain quickstart 与 tool-call safety gate cookbook。使用时应核对当前版本，不要假设存在未列出的 SDK 方法。

## 常见问题

**Jev 能和 LangGraph 一起用吗？** 能。把 Jev 封装为一个节点，返回 typed answers 给图状态。

**它是“System 1”，那“System 2”是谁？** 官方类比为慢速推理层，通常由 LLM 或代码规划器承担；Jev 不提供 System 2 能力。

## 延伸阅读

- [Agent Judgment Layer](/jevlab/articles/agent-judgment-layer/)
- [Tool / Model / Skill Routing](/jevlab/articles/agent-routing/)
- 官方：https://github.com/typesafe-ai/skills
