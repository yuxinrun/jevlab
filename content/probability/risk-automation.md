---
title: "Confidence 策略与 Human-in-the-loop"
description: "三档动作、风险分级阈值、弃权与人工审核的工程实现。"
category: probability
categoryTitle: "第五部分 · Probability / Confidence"
order: 26
tags: [策略, 人工审核]
---
## 学习目标

设计一套可解释、可审计的自动化策略，让模型不确定时系统安全地停下来。

![Confidence 策略](/jevlab/diagrams/confidence-policy.svg)

## 三档动作

| 区间 | 动作 |
| --- | --- |
| 高概率 | 自动执行 |
| 中概率 | 请求确认、标记审核、收集更多信息 |
| 低概率 | 不执行，转人工或回退 |

官方文档强调阈值应随风险变化：查看余额这种低风险动作可以更宽松，批准转账必须更严格。

## 策略实现

```typescript
type Action = 'auto' | 'confirm' | 'human' | 'abstain';

function policy(p: number, risk: 'low' | 'medium' | 'high'): Action {
  const thresholds = {
    low:    { auto: 0.70, review: 0.45 },
    medium: { auto: 0.85, review: 0.60 },
    high:   { auto: 0.95, review: 0.75 },
  }[risk];
  if (p >= thresholds.auto) return 'auto';
  if (p >= thresholds.review) return 'confirm';
  return 'human';
}
```

对 Noul 直接用 `p`；对 Choice 用 `probabilities[choice]`；对 Score 先看 confidence 再看目标等级概率。

## 弃权（Abstention）

弃权不是失败，而是系统的安全能力。触发条件：

- 概率落在中间带。
- Choice 的 companion Noul 显示没有合适选项。
- Score confidence 低于阈值。
- Box confidence 为 null 或很低。
- 输入超出已知分布（例如超长上下文）。

## 人工审核队列

人工界面应展示：

1. 原始 state（脱敏后）。
2. 每个判断的分数与 instructions。
3. 代码事实字段。
4. 规则路径（trace）。
5. 建议动作与风险等级。

审核结果要回流为标注数据，用于阈值校准与回归测试。

## 高风险动作清单

以下动作即使概率很高也建议二次确认：

- 转账、退款、删除数据。
- 向外发送消息或邮件。
- 修改权限或生产配置。
- 自动点击 UI（Box 实验能力）。

## 指标

- 自动化率：无需人工的比例。
- 误自动化率：自动执行后被人工推翻的比例。
- 弃权率与人工负载。
- 平均处理时间与成本。

## 常见错误

- 用厂商示例阈值直接上线。
- 人工审核不回流数据。
- 把“模型不确定”当作“模型失败”隐藏掉。

## 延伸阅读

- [Probability 与 Confidence](/jevlab/articles/probability-confidence/)
- [Human-in-the-loop 图](/jevlab/diagrams/human-in-the-loop.svg)
