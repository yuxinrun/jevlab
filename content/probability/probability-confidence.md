---
title: "Probability 与 Confidence"
description: "区分概率分布与置信度摘要，掌握 Choice / Score / Noul / Box 各自的正确读法。"
category: probability
categoryTitle: "第五部分 · Probability / Confidence"
order: 24
tags: [概率, Confidence]
---
## 学习目标

准确解释 probabilities 与 confidence 的关系，并为不同 primitive 选择合适的决策信号。

![概率分布](/jevlab/diagrams/probability-distribution.svg)

## 两个不同的量

- `probabilities`：在预定义答案空间上的完整分布。
- `confidence`：把分布形状压缩成 0–1 的单一数字。

官方明确提醒：confidence 衡量分布的集中程度，**不等于“被选答案正确的概率”**。

## Choice

```text
confidence = (p_max − 1/n) / (1 − 1/n)
```

只取决于 p_max。三选项时 confidence=0.5 对应 p_max≈0.67；十选项时对应 p_max≈0.55。因此跨选项数比较 confidence 没有意义。

建议：对 `probabilities[choice]` 设阈值；必要时看 top-to-second ratio。

## Score

```text
confidence = max(0, 1 − Σ p_i |i − m| / MAD_unif)
MAD_unif = (1/n) Σ |i − (n−1)/2|
```

考虑等级距离：概率落在远端等级会更大幅降低 confidence。适合先判断“分布是否清晰”，再按 score 或等级概率路由。

## Noul

没有 confidence 字段。p 本身同时表达方向与确定性：

| p | 读法 |
| --- | --- |
| 0.95 | 强 yes |
| 0.8 | 倾向 yes |
| 0.5 | 不确定 |
| 0.2 | 倾向 no |
| 0.05 | 强 no |

需要统一数值时可算 `|2p−1|`，但方向信息会丢失。

## Box

返回 `confidence`（schema 允许 null），没有 probabilities。Box 永远返回坐标，所以“目标是否存在”必须交给 Noul。

## 校准的边界

官方概念页说 System One 为 calibrated decisions 训练，但也强调校准是**群体层面**的度量，不保证单个答案正确。你的阈值必须用自己的数据验证。

## 实践清单

1. 记录每次预测的概率与最终结果。
2. 按概率分桶计算实际准确率。
3. 对高风险动作单独评估。
4. 模型版本变化后重新校准。
5. 不要混用不同任务类型的阈值。

## 延伸阅读

- [Calibration](/jevlab/articles/calibration/)
- [Confidence 策略与人在回路](/jevlab/articles/risk-automation/)
