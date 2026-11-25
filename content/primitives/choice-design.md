---
title: "Choice 选项与 Criteria 设计"
description: "互斥性、粒度、命名、高基数与 complement Noul 的实操准则。"
category: primitives
categoryTitle: "第三部分 · Choice / Score / Noul / Box"
order: 15
tags: [Choice, 设计]
---
## 学习目标

设计出稳定、互斥、可维护的选项集合，避免“模型选错”其实是“选项设计错”。

## 准则一：互斥且同层级

错误示例：把 `billing`、`technical`、`urgent_bug` 放在一起——`urgent_bug` 与前两者不在同一维度。

正确做法：先按维度拆分问题，或用两级 Choice：先选类别，再选严重程度（Score）。

## 准则二：完整覆盖

Choice 会强制选一项。如果你无法保证列表覆盖所有情况：

1. 加入一个 Noul 判断“是否有任何选项适用”。
2. 在代码中对 Noul 低概率走澄清或人工路径。

不要加入 `other`——它会成为垃圾桶，掩盖真实的长尾需求。

## 准则三：描述比名字重要

```json
"criteria": {
  "refund": "The user explicitly asks for money to be returned.",
  "rebooking": "The user asks for a different flight or date.",
  "status": "The user asks when something will happen."
}
```

选项名是代码标识；criteria 文本才定义语义边界。把边界写进描述，而不是写进 prompt 注释。

## 准则四：控制基数

官方 Choice 上限 255；发布博客称超过时走两阶段（先 scoring 再 choice），可能变慢。实践建议：

- 路由类：3–20 项。
- 分类类：控制在 50 项以内。
- 极大集合：分层（先大类，再子类）或改成两次请求。

## 准则五：稳定命名

选项名一旦进入日志、缓存键和业务规则，就不要轻易改名。改名等同于接口 breaking change。

## Python 示例

```python
from typesafe_sdk import Choice, Noul, TypeSafeClient

ROUTES = {
    "billing": "Payment, invoice or subscription issues.",
    "technical": "Bugs, outages or integration failures.",
    "sales": "Pricing, plans or account upgrades.",
}

with TypeSafeClient(model="jev-1.14.0") as client:
    r = client.system_one(
        state={"message": msg},
        questions={
            "route": Choice(instructions="Main request in `message`", criteria=ROUTES),
            "route_applicable": Noul(instructions="Does any listed route describe `message`?"),
        },
    )
    route = r.answers["route"]
    p = route.probabilities[route.choice]
    if r.answers["route_applicable"].noul < 0.5 or p < 0.7:
        handle_manually(msg)
    else:
        dispatch(route.choice)
```

预期结果：模型给出 route 与分布；代码根据 Noul 与 p 决定是否自动派发。这段示例使用官方 Python SDK 的公开 API，需设置 `TYPESAFE_API_KEY` 后才能真实运行。

## 常见错误

| 错误 | 表现 | 修复 |
| --- | --- | --- |
| 选项重叠 | 概率分散在两项 | 重写 criteria 边界 |
| 缺少覆盖 | 分布平坦但仍选出一项 | 加 companion Noul |
| 描述含糊 | 结果随版本漂移 | 写清正反例 |
| 选项过多 | 延迟上升 | 分层 |

## 延伸阅读

- [Noul 原理](/jevlab/articles/noul-truth/)
- [官方文档 · Choice](https://docs.typesafe.ai/primitives/choice)
