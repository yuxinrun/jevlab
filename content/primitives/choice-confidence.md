---
title: "Choice Confidence 与阈值"
description: "用官方公式理解 confidence，并学会用 p_max、ratio 与风险分级设计路由策略。"
category: primitives
categoryTitle: "第三部分 · Choice / Score / Noul / Box"
order: 16
tags: [Confidence, 阈值]
---
## 学习目标

能解释 confidence 的含义，知道什么时候不该用它，并设计按风险分级的阈值。

## confidence 是分布的摘要

官方公式（n 个选项，p_max 为最高概率）：

```text
confidence = (p_max − 1/n) / (1 − 1/n)
```

均匀分布时为 0；全部集中在单一选项时为 1。含义是“比均匀分布高出多少”。

```python
def choice_confidence(probabilities: list[float]) -> float:
    n = len(probabilities)
    return (max(probabilities) - 1 / n) / (1 - 1 / n)
```

## 它不告诉你什么

- 不区分第二名强弱：`(0.6, 0.3, 0.1)` 与 `(0.6, 0.2, 0.2)` 都是 0.4。
- 不等于“答案正确的概率”。
- 依赖选项数量：不同 n 的 confidence 不可直接横向比较。

因此官方建议 Choice 场景通常对 `p = probabilities[choice]` 设阈值，而不是对 confidence 设阈值。

## 三个可选指标

| 指标 | 含义 | 适用 |
| --- | --- | --- |
| `p_max` | 所选选项概率 | 阈值可解释，依赖选项数 |
| `p_max / p_second` | 第一对第二优势 | 实际只在头两名间决策 |
| `confidence` | 归一化集中度 | 跨选项数比较分布形状 |

## 三档动作

| 区间 | 动作 |
| --- | --- |
| 高概率 | 自动执行 |
| 中概率 | 确认、标记审核、收集更多信息 |
| 低概率 | 不执行，转人工或澄清 |

## 按风险分级

```typescript
const a = res.answers.action;
const p = a.probabilities[a.choice];

if (p < 0.67) return routeToHuman();
if (a.choice === 'check_balance') return showBalance();
if (a.choice === 'approve_transfer') {
  return p > 0.93 ? confirmThenExecute() : askUserToConfirm();
}
return askUserToConfirm();
```

同样的 p，对不同动作意味着不同风险容忍度。这是“策略层”的职责，不应写进模型 prompt。

## 阈值如何校准

1. 标注一批真实样本。
2. 记录选择结果与 p。
3. 画 reliability diagram：按 p 分桶，比较平均 p 与实际正确率。
4. 选择满足目标错误率的阈值。
5. 模型版本变化时重做。

## 常见错误

- 直接用厂商示例里的 0.93 当生产阈值。
- 用 confidence 跨不同选项数的任务比较。
- 阈值只有一个，不区分动作风险。

## 延伸阅读

- [Probability 与 Confidence](/jevlab/articles/probability-confidence/)
- [Calibration](/jevlab/articles/calibration/)
