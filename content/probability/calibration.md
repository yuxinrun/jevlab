---
title: "Calibration：让概率可信"
description: "可靠性图、Brier Score、ECE 的计算与上线前校准流程。"
category: probability
categoryTitle: "第五部分 · Probability / Confidence"
order: 25
tags: [校准, 评估]
---
## 学习目标

能用自有数据判断模型概率是否可信，并知道厂商“已校准”声明不能替代你的验证。

![校准](/jevlab/diagrams/calibration.svg)

## 什么是校准

如果模型在 100 个预测上给出 p=0.8，那么其中大约 80 个应该为真。这就是校准的直观含义：预测概率与实际频率一致。

它是群体性质。单个样本 p=0.8 仍可能错，20% 的错误率正是概率表达的含义。

## 可靠性图（Reliability Diagram）

把预测按置信度分桶（常用 5 或 10 桶），计算每桶平均预测概率与实际正确率，画出二者关系。完美校准时点落在对角线上。

```python
def reliability(samples, bins=5):
    result = []
    for i in range(bins):
        lo, hi = i / bins, (i + 1) / bins
        bucket = [s for s in samples if lo <= s['p'] < hi]
        if not bucket: continue
        avg_p = sum(s['p'] for s in bucket) / len(bucket)
        acc = sum(s['y'] for s in bucket) / len(bucket)
        result.append((avg_p, acc, len(bucket)))
    return result
```

## Brier Score

```text
BS = (1/N) Σ (p_i − y_i)²
```

同时衡量校准与区分度，越低越好。适合作为总体指标。

## Expected Calibration Error

```text
ECE = Σ (n_b / N) · |acc_b − conf_b|
```

按桶加权平均 gap，直接反映校准误差。分桶数会影响结果，需固定后比较。

## 上线流程

1. 收集 300–1000 条带标注的真实样本。
2. 锁定模型版本与问题配置。
3. 导出概率与最终结果。
4. 画可靠性图，计算 BS / ECE。
5. 确定阈值：在满足目标错误率的前提下最大化自动化率。
6. 上线后持续监控，出现漂移时重做。

## 厂商声明如何处理

发布博客中的速度、成本、workflow eval 数字都是 TypeSafe 自报，且评测条件由厂商设计。引用时必须标注“厂商声明”，不要写成“独立验证结论”。本站所有性能数字都遵循这一规则。

## 常见错误

- 用同一个阈值覆盖所有动作风险。
- 只看准确率不看概率质量。
- 样本量太小就得出校准结论。
- 模型升级后沿用旧阈值。

## 延伸阅读

- [Playground · Calibration Lab](/jevlab/playground/#calibration)
- [Evaluation Pipeline](/jevlab/articles/production-eval/)
