export const articles = [
  {
    slug: 'probability-confidence', category: 'probability', title: 'Probability 与 Confidence',
    description: '区分概率分布与置信度摘要，掌握 Choice / Score / Noul / Box 各自的正确读法。', tags: ['概率', 'Confidence'],
    body: `## 学习目标

准确解释 probabilities 与 confidence 的关系，并为不同 primitive 选择合适的决策信号。

![概率分布](/jevlab/diagrams/probability-distribution.svg)

## 两个不同的量

- \`probabilities\`：在预定义答案空间上的完整分布。
- \`confidence\`：把分布形状压缩成 0–1 的单一数字。

官方明确提醒：confidence 衡量分布的集中程度，**不等于“被选答案正确的概率”**。

## Choice

\`\`\`text
confidence = (p_max − 1/n) / (1 − 1/n)
\`\`\`

只取决于 p_max。三选项时 confidence=0.5 对应 p_max≈0.67；十选项时对应 p_max≈0.55。因此跨选项数比较 confidence 没有意义。

建议：对 \`probabilities[choice]\` 设阈值；必要时看 top-to-second ratio。

## Score

\`\`\`text
confidence = max(0, 1 − Σ p_i |i − m| / MAD_unif)
MAD_unif = (1/n) Σ |i − (n−1)/2|
\`\`\`

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

需要统一数值时可算 \`|2p−1|\`，但方向信息会丢失。

## Box

返回 \`confidence\`（schema 允许 null），没有 probabilities。Box 永远返回坐标，所以“目标是否存在”必须交给 Noul。

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
- [Confidence 策略与人在回路](/jevlab/articles/risk-automation/)`
  },

  {
    slug: 'calibration', category: 'probability', title: 'Calibration：让概率可信',
    description: '可靠性图、Brier Score、ECE 的计算与上线前校准流程。', tags: ['校准', '评估'],
    body: `## 学习目标

能用自有数据判断模型概率是否可信，并知道厂商“已校准”声明不能替代你的验证。

![校准](/jevlab/diagrams/calibration.svg)

## 什么是校准

如果模型在 100 个预测上给出 p=0.8，那么其中大约 80 个应该为真。这就是校准的直观含义：预测概率与实际频率一致。

它是群体性质。单个样本 p=0.8 仍可能错，20% 的错误率正是概率表达的含义。

## 可靠性图（Reliability Diagram）

把预测按置信度分桶（常用 5 或 10 桶），计算每桶平均预测概率与实际正确率，画出二者关系。完美校准时点落在对角线上。

\`\`\`python
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
\`\`\`

## Brier Score

\`\`\`text
BS = (1/N) Σ (p_i − y_i)²
\`\`\`

同时衡量校准与区分度，越低越好。适合作为总体指标。

## Expected Calibration Error

\`\`\`text
ECE = Σ (n_b / N) · |acc_b − conf_b|
\`\`\`

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
- [Evaluation Pipeline](/jevlab/articles/production-eval/)`
  },

  {
    slug: 'risk-automation', category: 'probability', title: 'Confidence 策略与 Human-in-the-loop',
    description: '三档动作、风险分级阈值、弃权与人工审核的工程实现。', tags: ['策略', '人工审核'],
    body: `## 学习目标

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

\`\`\`typescript
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
\`\`\`

对 Noul 直接用 \`p\`；对 Choice 用 \`probabilities[choice]\`；对 Score 先看 confidence 再看目标等级概率。

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
- [Human-in-the-loop 图](/jevlab/diagrams/human-in-the-loop.svg)`
  },
];
