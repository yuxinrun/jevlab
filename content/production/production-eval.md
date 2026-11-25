---
title: "Evaluation Pipeline"
description: "建立离线评估、在线监控与回归测试闭环，验证判断系统的真实表现。"
category: production
categoryTitle: "第八部分 · 生产工程化"
order: 31
tags: [生产, 评估]
---
## 学习目标

搭建从样本标注到阈值决策的评估闭环，不用厂商宣传数字代替自有验证。

![Evaluation Pipeline](/jevlab/diagrams/evaluation-pipeline.svg)

## 数据集

- 来源：真实流量采样（脱敏）+ 边界案例人工构造。
- 规模：起点 300–1000 条；高风险场景更多。
- 标注：每个原子判断单独标注，而不是只标最终决策。
- 分层：按语言、渠道、风险等级分层，避免单一分布。

## 离线评估步骤

1. 锁定模型版本（如 `jev-1.14.0`）与问题配置 hash。
2. 批量调用并保存原始响应与 trace。
3. 对每个判断计算准确率、混淆矩阵、Brier Score。
4. 画可靠性图，计算 ECE。
5. 扫描阈值，权衡自动化率与误执行率。
6. 对最终决策计算端到端正确率。

```python
def evaluate(pairs):  # pairs: [(p, y)]
    n = len(pairs)
    brier = sum((p - y) ** 2 for p, y in pairs) / n
    acc = sum((p >= 0.5) == bool(y) for p, y in pairs) / n
    return {"brier": brier, "accuracy": acc, "n": n}
```

## 在线监控

- 概率分布漂移（均值、方差、低置信度占比）。
- 自动执行率与人工推翻率。
- 延迟 p50/p95、错误率、429 比例。
- 人工审核队列长度。
- 响应中的 `model` 是否变化。

## 回归测试

把固定样本集做成 CI 测试：模型或配置变更后重跑，比较关键指标。若准确率或校准下降超过预设范围，阻断发布。

## 厂商数字的使用方式

发布博客中的 193.6x faster、444.6x cheaper 等来自厂商自报 workflow evals，原文也说明可能偏高端。可以在“官方声明”章节引用并标注来源，但不能写成你的系统收益。

## 常见错误

- 只评估最终 action，不评估原子判断。
- 用示例数据当评测集。
- 没有记录模型版本，结果无法复现。

## 延伸阅读

- [Calibration](/jevlab/articles/calibration/)
- [Deterministic Logic 与可审计架构](/jevlab/articles/deterministic-logic/)
