---
title: "API 与 SDK Quickstart"
description: "用 HTTP、Python SDK 和 JavaScript SDK 完成第一次类型化判断调用。"
category: api
categoryTitle: "第六部分 · API 与 SDK"
order: 27
tags: [API, SDK]
---
## 学习目标

在 10 分钟内用三种方式完成同一个工单路由示例，并正确解释响应字段。

## 准备

1. 在 https://console.typesafe.ai/keys 获取 API Key。
2. 设置环境变量 `TYPESAFE_API_KEY`。
3. 官方 Quickstart 要求 Python 3.10+ / Node.js 22+ / curl 7.76+。

不要将 Key 写入仓库或前端代码。本站 Playground 不调用真实 API。

## HTTP（curl）

```bash
: "${TYPESAFE_API_KEY:?Set TYPESAFE_API_KEY first.}"
curl --fail-with-body --silent --show-error \
  https://api.typesafe.ai/v1/systemone \
  -H "Authorization: Bearer $TYPESAFE_API_KEY" \
  -H "Content-Type: application/json" \
  --data-binary @- <<'JSON'
{
  "model": "jev-1.14.0",
  "state": "Our API integration started returning 500 errors 20 minutes ago.",
  "questions": {
    "department": {
      "type": "choice",
      "instructions": "Which team should handle this?",
      "criteria": {"billing": "Payment issues", "technical": "Bugs", "sales": "Pricing"}
    },
    "frustration": {
      "type": "score",
      "instructions": "How frustrated is the customer?",
      "criteria": ["Calm", "Frustrated but civil", "Very angry"]
    },
    "is_urgent": {"type": "noul", "instructions": "The message conveys urgency"}
  }
}
JSON
```

## Python SDK

```bash
pip install typesafe-sdk
```

```python
from typesafe_sdk import Choice, Noul, Score, TypeSafeClient

ticket = "Our API integration started returning 500 errors 20 minutes ago."

with TypeSafeClient(model="jev-1.14.0") as client:  # reads TYPESAFE_API_KEY
    response = client.system_one(
        state=ticket,
        questions={
            "department": Choice(instructions="Which team?", criteria={
                "billing": "Payment issues", "technical": "Bugs", "sales": "Pricing"}),
            "frustration": Score(instructions="How frustrated?", criteria=[
                "Calm", "Frustrated but civil", "Very angry"]),
            "is_urgent": Noul(instructions="Conveys urgency"),
        },
    )

print(response.answers["department"].choice)
print(response.answers["frustration"].score)
print(response.answers["is_urgent"].noul)
```

官方 Quickstart 还展示了便捷访问器 `response.choices["department"]`、`response.scores["frustration"]`、`response.nouls["is_urgent"]`。具体可用属性以你安装的 SDK 版本为准。

## JavaScript / TypeScript SDK

```bash
npm install @typesafe-ai/sdk
npm pkg set type=module
```

```typescript
import { choice, noul, score, TypeSafeClient } from '@typesafe-ai/sdk';

const client = new TypeSafeClient({ defaultModel: 'jev-1.14.0' });
const response = await client.systemOne({
  state: 'Our API integration started returning 500 errors 20 minutes ago.',
  questions: {
    department: choice('Which team?', {
      billing: 'Payment issues', technical: 'Bugs', sales: 'Pricing',
    }),
    frustration: score('How frustrated?', ['Calm', 'Frustrated but civil', 'Very angry']),
    is_urgent: noul('Conveys urgency'),
  },
});

console.log(response.answers.department.choice);
console.log(response.answers.frustration.score);
console.log(response.answers.is_urgent.noul);
```

SDK 会从 questions 推断答案类型：`res.answers.department.choice` 的类型是 `"billing" | "technical" | "sales"`。

## 响应结构

```json
{
  "model": "jev-1.14.0",
  "answers": {
    "department": {"type": "choice", "choice": "technical", "confidence": 1.0,
      "probabilities": {"billing": 0.0, "technical": 1.0, "sales": 0.0}},
    "frustration": {"type": "score", "score": 0.59, "confidence": 0.38,
      "legend": {"0": "Calm", "1": "Frustrated but civil", "2": "Very angry"},
      "probabilities": {"0": 0.41, "1": 0.59, "2": 0.0}},
    "is_urgent": {"type": "noul", "noul": 0.99}
  },
  "usage": {"input_tokens": 428, "output_tokens": 73}
}
```

这是官方 Quickstart 的示例响应，数值会随版本与输入变化，不是你调用的真实结果。

## 预期结果与错误处理

- 期望得到三个答案与 usage。
- 如果返回 422，检查字段名与 question type。
- 如果返回 401，检查 API Key。
- 如果是图片请求，补上 `TypeSafe-Danger-Zone-Images: true`。

## 延伸阅读

- [API 数据结构](/jevlab/articles/arch-api-schema/)
- [错误处理与重试](/jevlab/articles/api-errors/)
