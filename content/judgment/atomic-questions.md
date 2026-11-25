---
title: "Atomic Questions：把复杂判断拆小"
description: "原子化判断的标准、拆分方法、组合模式与验证方式。"
category: judgment
categoryTitle: "第四部分 · Judgment Engineering"
order: 22
tags: [Atomic, 问题设计]
---
## 学习目标

把一个模糊的大问题拆成可独立验证的原子问题，并用代码组合答案。

![原子问题](/jevlab/diagrams/atomic-questions.svg)

## 什么是原子问题

官方把 System One 问题类比为 “gut-check determination”：一个问题只问一件范围清晰的事，能在“一秒钟”内判断。

合格例子：

- 用户是否明确要求退款？
- 消息是否提到律师或法律行动？
- 订单金额是否大于政策上限？（这类其实应由代码回答）
- 这段回复是否引用了来源？

不合格例子：

- 分析整条消息并决定最佳处理方式。
- 判断客户是否满意并给出后续策略。

## 拆分方法

1. **列出决策涉及的所有语义条件**：意图、风险、情绪、政策匹配、证据。
2. **把可精确计算的条件移给代码**：金额、时间、状态、权限。
3. **为每个语义条件写一个问题**：优先 Noul；有顺序用 Score；互斥类别用 Choice。
4. **检查独立性**：一个问题不能依赖另一个问题的答案。
5. **放到同一请求**：共享 state，并行评估。

## 组合模式

| 模式 | 说明 |
| --- | --- |
| 全通过（AND） | 所有判断超过阈值才自动执行 |
| 任一命中（OR） | 任一风险判断命中就拦截 |
| 加权评分 | 多个 Score 按代码权重合成 |
| 分级阈值 | 不同动作使用不同阈值 |
| 短路路径 | 高风险判断优先，命中即转人工 |

## 示例：客服工单

```python
questions = {
    "wants_refund": Noul(instructions="Does `ticket` explicitly request a refund?"),
    "duplicate_charge": Noul(instructions="Does `ticket` claim a duplicate charge?"),
    "legal_threat": Noul(instructions="Does `ticket` mention legal action?"),
    "frustration": Score(instructions="How frustrated is the customer?", criteria=LEVELS),
    "category": Choice(instructions="Main issue type", criteria=CATEGORIES),
}
```

五个判断彼此隔离。代码根据 Noul 概率、Score 等级与事实字段走不同路径。

## 如何验证拆分是否合理

- **稳定性**：同一个判断在相似输入上是否稳定？
- **可解释性**：出问题时能否指出具体哪个判断错了？
- **覆盖率**：是否存在没有任何判断覆盖的边界情况？
- **回归安全**：新增判断后，旧判断结果是否变化？官方称隔离评估，仍建议用固定样本集回归测试。

## 过度拆分的代价

问题太多会增加输入 token 与认知噪声；每个判断都需要自己的阈值与评估数据。经验做法是先拆到能解释路径为止，而不是无限拆。

## 常见错误

- 在 instructions 中引用另一个问题的答案。
- 一个 Noul 同时问两件事（"Is it urgent and angry?"）。
- 把最终业务决策写成 Choice。

## 延伸阅读

- [Judgment 与 Decision 分离](/jevlab/articles/judgment-vs-decision/)
- [Parallel Evaluation](/jevlab/articles/arch-parallel/)
