---
title: "错误处理、限流与重试"
description: "按官方 Request rules and errors 核对状态码、请求规则、压缩与重试策略。"
category: api
categoryTitle: "第六部分 · API 与 SDK"
order: 28
tags: [API, 可靠性]
---
## 学习目标

在生产代码中正确处理 API 失败，避免把可重试错误当作业务失败。

## 状态码

| 状态 | 含义 | 处理 |
| --- | --- | --- |
| 400 | 请求规则错误，如无效 UTF-8、嵌套过深、`max_tokens_exceeded` | 修正请求，不重试 |
| 401 | API Key 缺失或无效 | 检查配置，不重试 |
| 413 | 请求体 > 32 MiB | 缩小请求，不重试 |
| 415 | 不支持的压缩方式或多层压缩 | 改为单层 gzip/x-gzip/zstd |
| 422 | 字段验证失败 | 按 `detail` 修正 |
| 429 | 超过速率限制 | 指数退避后重试 |
| 529 | 服务过载 | 指数退避后重试 |

OpenAPI 只声明 400 与 422；其他状态码来自官方 Request rules and errors 文档。

## 请求规则

- UTF-8 JSON，无 BOM。
- `state` / `instructions` / `criteria` 每字段最多 64 层嵌套。
- 不允许 NaN / Infinity / 超大指数。
- 大整数与标识符用字符串。
- 请求体最大 32 MiB，压缩与解压都计入。
- zstd 窗口最大 8 MiB。

## 错误响应示例

```json
{
  "detail": [
    {"loc": ["body", "state"], "msg": "Field required", "type": "missing"}
  ]
}
```

`detail` 文本可能被截断，以 `…` 结尾；不要依赖完整原文做匹配。

## 重试实现

```typescript
async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (err: any) {
      const retryable = err.status === 429 || err.status === 529 || err.status >= 500;
      if (!retryable || i === attempts - 1) throw err;
      const delay = Math.min(8000, 200 * 2 ** i) + Math.random() * 100;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('unreachable');
}
```

官方 SDK 默认带重试策略；如果自行实现 HTTP 调用，请遵守退避，不要立即连续重试。

## 超时与降级

- 设置客户端超时（例如 10s），避免请求无限等待。
- 超时后走 fallback：缓存答案、规则默认路径或转人工。
- 不要把超时重试无限叠加，防止放大器效应。

## 限流说明

官方错误文档说明 429 表示超过速率限制，但未公布公开配额表；OpenAPI 中也没有 RateLimit-* header。因此不要在代码中假设具体限额，应读取实际响应并实现退避。

## 延伸阅读

- [Cache、Fallback 与可观测性](/jevlab/playground/#routing)
- [官方错误文档](https://docs.typesafe.ai/api/errors)
