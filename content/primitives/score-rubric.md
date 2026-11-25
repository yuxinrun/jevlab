---
title: "Score 与 Rubric 设计"
description: "有序等级、score 的加权平均性质、legend 与 confidence 的等级距离语义。"
category: primitives
categoryTitle: "第三部分 · Choice / Score / Noul / Box"
order: 17
tags: [Score, Rubric]
---
## 学习目标

设计有序 rubric，解释 score 为什么可以是小数，并正确设置 Score 的阈值。

![Score 结构](/jevlab/diagrams/score.svg)

## Score 回答什么

官方定义：在有顺序的等级谱系上定位。适合 bug 严重度、客户沮丧程度、技能水平、风险等级。

请求中 `criteria` 是有序数组，位置决定 score，**从 0 开始**：

```json
{
  "severity": {
    "type": "score",
    "instructions": "How severe is `bug_report`?",
    "criteria": ["Cosmetic", "Minor", "Major", "Blocks release"]
  }
}
```

## 响应字段

```json
{
  "type": "score",
  "score": 1.42,
  "confidence": 0.55,
  "legend": {"0": "Cosmetic", "1": "Minor", "2": "Major", "3": "Blocks release"},
  "probabilities": {"0": 0.10, "1": 0.48, "2": 0.37, "3": 0.05}
}
```

`score` 是概率加权平均，可以落在两个整数等级之间。`legend` 把编号映射回描述，`probabilities` 是每个等级的概率。

## confidence 的等级距离语义

Score 的 confidence 不只是看最高概率，还看概率离最高等级有多远：

```text
confidence = max(0, 1 − Σ p_i |i − m| / MAD_unif)
MAD_unif = (1/n) Σ |i − (n−1)/2|
```

官方例子：三等级时 `(0, 0.5, 0.5)` → 0.25（相邻分裂），`(0.5, 0, 0.5)` → 0（两端分裂）。远端分裂更严重。

## Rubric 设计原则

1. **等级必须有明确顺序**，不能是不同类型。
2. **每级写可观察的行为**，不要写“比较好”“有点严重”。
3. **等级数量 3–5 通常足够**；Schema 上限是 10。
4. **包含边界案例描述**，例如“阻塞发布”需说明具体影响。
5. **不要让相邻等级只差一个形容词**。

## 路由示例

```python
s = response.answers["severity"]
if s.confidence < 0.5:
    send_to_triage(report_id)
elif s.score < 1.5:
    add_to_backlog(report_id)
elif s.score < 2.5:
    add_to_sprint(report_id)
else:
    message_on_call(report_id)
```

官方建议：先用 confidence 判断分布是否清晰，再按 score 或指定等级概率路由。

## 常见错误

- 把 score 当成整数等级使用，忽略中间值。
- 概率分裂在两端却只看 score 平均值（平均落在中间，掩盖极端意见）。
- 等级描述重叠导致长期低 confidence。

## 延伸阅读

- [Probability 与 Confidence](/jevlab/articles/probability-confidence/)
- [官方文档 · Score](https://docs.typesafe.ai/primitives/score)
