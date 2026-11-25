---
title: "Judgment 与 Decision 分离"
description: "本站核心原则：模型产出语义判断，代码结合事实与规则形成决策。"
category: judgment
categoryTitle: "第四部分 · Judgment Engineering"
order: 21
tags: [核心原则, 架构]
---
## 学习目标

能够用 Judgment / Decision 分离原则审查任意 AI 工作流设计，并指出“智能放错层”的反模式。

![判断与决策分离](/jevlab/diagrams/judgment-decision.svg)

## 官方原文

TypeSafe 2026-11-03 博客 *Don't Call It a Decision Model* 的核心句：

> **Jev makes judgments, code makes decisions.**

文章解释为什么公司坚持叫它 System One model 而不是 decision model：系统中的决策很少是一个原子选择。把完整决策塞进一个巨大 Choice，等于把所有边界条件、例外规则写进 criteria，形成 "prompt gymnastics"。

## 三层分工

| 层 | 内容 | 负责者 |
| --- | --- | --- |
| Facts / Logic | 金额是否 ≤ $25、状态是否 active、权限是否满足 | 代码 |
| Judgment | 用户是否想退款、是否威胁法律行动、证据是否显示重复扣款 | Jev |
| Decision | fraud_team / refund now / handoff_person / answer & continue | 代码组合 |

官方退款例子里，判断是六个小问题，最终决策由逻辑路径产生。你看到的不是“模型选择了 fraud_team”，而是“模型做了这六个判断，并遵循了这条逻辑路径”。

## 为什么必须拆

### 1. 设计清晰

拆开后能看清哪些 edge case 需要处理，哪些是语义问题，哪些是数学问题。

> "Checking 'claim eligible, unpaid' is math. Answering 'does the user want money back?' takes judgment."

### 2. 可观测

单一巨大 Choice 出错时，你只有一个概率值；拆开后能看到每个判断分数、代码事实与路径。这对事故复盘至关重要。

### 3. 可扩展

新增输出路径时只需增加相关判断和规则。官方指出所有 judgments 隔离评估，因此不必担心新判断影响已验证的旧判断。

## 反面案例

```text
criteria = {
  "refund_if_eligible_and_angry_but_not_fraud": "...",
  "escalate_if_legal_threat_or_high_value": "...",
  "answer_normally": "..."
}
```

问题：规则一变就要改 prompt；无法单测；无法知道是哪个条件出错；新增分支会改变已有分支的语义。

## 正确实现

```python
j = answers
facts = {"amount": 18, "eligible": True, "verified": True}

if not facts["verified"]:
    path = "human_review"
elif j["legal_threat"].noul > 0.85:
    path = "fraud_team"
elif j["wants_refund"].noul > 0.7 and facts["eligible"]:
    path = "auto_refund"
else:
    path = "answer_and_continue"
```

每条规则都可单测；每个判断都有日志；阈值可按风险调整。

## 权限与人工审核

即使模型与规则都给出自动路径，策略层仍应控制最终动作：

- 高风险动作（转账、删除、外发）必须二次确认或人工审批。
- 模型不确定（概率落在中间带）时不执行。
- 所有自动动作可审计、可回滚。

## 常见异议

**“这样代码会变复杂”？** 复杂度从不可见 prompt 转移到可测试代码，这是值得的。

**“模型明明能一次选出来”？** 能选不代表应该选；可观测性与权限控制是系统需求。

## 延伸阅读

- [Atomic Questions](/jevlab/articles/atomic-questions/)
- [Deterministic Logic 与可审计架构](/jevlab/articles/deterministic-logic/)
- 官方：https://typesafe.ai/blog/dont-call-it-a-decision-model
