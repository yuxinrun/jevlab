---
title: "API 数据结构：逐字段核对"
description: "基于 OpenAPI 3.1.0 / API 0.2.0 逐字段列出请求、响应、资产与错误结构。"
category: architecture
categoryTitle: "第二部分 · 核心架构"
order: 13
tags: [API, Schema]
---
## 学习目标

在不读第二手资料的情况下，直接看懂官方 OpenAPI 中的关键 schema。

研究基线：OpenAPI 3.1.0，`info.version = 0.2.0`，server `https://api.typesafe.ai`，认证 `HTTPBearer`。

## 端点

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/v1/models` | 列出当前账号可用模型与别名 |
| POST | `/v1/systemone` | 对 state 回答一个或多个命名问题 |

`POST /v1/systemone` 接受 `application/json` 或 `multipart/form-data`。图片走 multipart：`request` 部分是 JSON，其余部分按 asset 名称上传图片文件。

## SystemOneRequest

`required: [model, state, questions]`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `model` | string | 模型名或别名，示例 `jev-latest` |
| `state` | string / object / array | 所有问题共同评估的内容 |
| `questions` | object | key 为问题 ID，value 为 Question，至少 1 项 |
| `assets` | object | 图片资产，可选，至少 1 项 |

## Question（判别器 type）

| type | 必填 | 关键约束 |
| --- | --- | --- |
| `noul` | `type` | `instructions`、可选 `criteria{true,false}` |
| `choice` | `type`,`criteria` | criteria 为 map，1–255 项 |
| `score` | `type`,`criteria` | criteria 为数组，1–10 项，有序 |
| `box` | `type` | 仅 `instructions`，不接受 criteria |

请求头：

```http
TypeSafe-Danger-Zone-Images: true
TypeSafe-Danger-Zone-Long-Context: true
```

两个 header 在 schema 中未标为 required，但使用图片/Box 或长上下文时必须显式开启。

## SystemOneResponse

`required: [model, answers, usage]`

| 字段 | 说明 |
| --- | --- |
| `model` | 实际回答问题的模型名，可能与请求别名不同 |
| `answers` | 按 question ID 组织，至少 1 项 |
| `usage.input_tokens` | 计费输入 token |
| `usage.output_tokens` | 输出 token，文档称当前免费 |

## Answer 字段速查

| type | 字段 |
| --- | --- |
| `noul` | `noul`（0–1），**无 confidence** |
| `choice` | `choice`, `confidence`, `probabilities` |
| `score` | `score`, `confidence`, `legend`, `probabilities` |
| `box` | `box{top,bottom,left,right}`, `confidence`（schema 允许 null） |

Box 坐标为图像宽高的 fraction，左上角 (0,0)，右下角 (1,1)。

## 错误结构

- `400` → `HTTPBadRequestError` / `detail`（string 或 object），文本可能被截断。
- `422` → `HTTPValidationError` / `detail: ValidationError[]`，含 `loc`、`msg`、`type`、可选 `input` 与 `ctx`。

注意：OpenAPI 中只声明了 400/422；官方 Request rules and errors 文档还列出 401、413、415、429、529。以实际行为与错误文档为准。

## 请求规则

- UTF-8 JSON，无 BOM。
- state / instructions / criteria 每字段最多 64 层嵌套。
- 不允许 NaN / Infinity。
- 请求体最大 32 MiB（压缩与解压都计入）。
- 压缩仅支持 gzip / x-gzip / zstd 单层，zstd 窗口 ≤ 8 MiB。

## 延伸阅读

- [官方 OpenAPI](https://api.typesafe.ai/openapi.json)
- [Request rules and errors](https://docs.typesafe.ai/api/errors)
