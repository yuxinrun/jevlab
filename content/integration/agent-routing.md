---
title: "Tool / Model / Skill Routing"
description: "用 Choice、Score 与置信度门控实现工具、模型和技能路由。"
category: integration
categoryTitle: "第七部分 · Agent 集成"
order: 30
tags: [Agent, Routing]
---
## 学习目标

设计三层路由：Tool Routing、Model Routing、Skill Routing，并在每条路径前加 Confidence Gate。

![Tool Routing](/jevlab/diagrams/tool-routing.svg)
![Model Routing](/jevlab/diagrams/model-routing.svg)
![Skill Routing](/jevlab/diagrams/skill-routing.svg)

## Tool Routing

```python
from typesafe_sdk import Choice, Noul, TypeSafeClient

TOOLS = {
    "search_web": "Need recent or external information.",
    "run_python": "Need computation or data processing.",
    "query_db": "Need internal structured data.",
}

with TypeSafeClient(model="jev-1.14.0") as client:
    r = client.system_one(
        state={"task": task, "available_tools": list(TOOLS)},
        questions={
            "tool": Choice(instructions="Which tool should be used next?", criteria=TOOLS),
            "tool_applicable": Noul(instructions="Is any available tool appropriate?"),
        },
    )
    answer = r.answers["tool"]
    p = answer.probabilities[answer.choice]
    if r.answers["tool_applicable"].noul < 0.5 or p < 0.75:
        ask_user()
    else:
        call_tool(answer.choice)
```

## Model Routing

用 Score 评估难度：

```text
criteria = ["trivial lookup", "single-step edit", "multi-file reasoning", "deep architectural change"]
```

规则示例：score < 1 → 轻量模型；1–2 → 标准模型；> 2 → 推理模型。先看 confidence，低于阈值时直接走更稳妥的模型。

## Skill Routing

技能数量往往多于工具。官方 Cookbook 有 `skill_suggestion`。建议：

1. 先 Choice 选出最相关技能。
2. 用 companion Noul 判断是否有技能适用。
3. 概率不足时返回“无技能”，让 Orchestrator 用基础能力继续。

## Confidence Gate

![Confidence 策略](/jevlab/diagrams/confidence-policy.svg)

```typescript
const p = answer.probabilities[answer.choice];
const threshold = risk === 'high' ? 0.9 : risk === 'medium' ? 0.75 : 0.6;
if (p < threshold) return fallback();
return execute(answer.choice);
```

高风险动作在 gate 之后还要人工审批。

## Fallback 设计

- 返回“请求澄清”而不是猜测。
- 切换到更通用的模型或人工队列。
- 使用上一轮缓存的安全路径。
- 记录 fallback 原因用于评估。

## 常见错误

- 工具列表里塞入功能重叠的工具，导致概率分散。
- 路由结果直接执行，没有 gate。
- 每次路由都单独发一次请求，延迟叠加。

## 延伸阅读

- [Agent Routing Lab](/jevlab/playground/#routing)
- [Fallback 架构](/jevlab/diagrams/fallback.svg)
