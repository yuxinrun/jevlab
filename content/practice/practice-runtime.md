---
title: "实战：自研 Judgment Runtime"
description: "从 JudgmentProvider 到 Audit Log，实现一个可替换、可缓存、可回退的运行时。"
category: practice
categoryTitle: "第九部分 · 实战"
order: 33
tags: [实战, Runtime]
---
## 学习目标

用 TypeScript 实现一个最小但完整的 Judgment Runtime：Provider 抽象、Typed Result、Confidence Policy、Cache、Fallback 与 Audit Log。

![Judgment Runtime](/jevlab/diagrams/judgment-runtime.svg)

## 模块划分

```text
src/runtime/
  provider.ts     JudgmentProvider 接口与 JevProvider / FakeProvider
  questions.ts    Question 构造器与 schema 校验
  result.ts       Typed Result 与概率访问器
  policy.ts       Confidence Policy 与动作决策
  cache.ts        请求去重与缓存
  audit.ts        审计日志
  runtime.ts      编排入口
```

## Provider 抽象

```typescript
export interface JudgmentProvider {
  judge(req: { state: unknown; questions: Record<string, any>; model: string }): Promise<JudgeResponse>;
}

export class FakeProvider implements JudgmentProvider {
  constructor(private fixed: JudgeResponse) {}
  async judge() { return this.fixed; }
}
```

FakeProvider 让规则层的单测完全离线。

## Question 构造

```typescript
export const noul = (instructions: string, criteria?: { true?: string; false?: string }) =>
  ({ type: 'noul' as const, instructions, ...(criteria ? { criteria } : {}) });

export const choice = <K extends string>(instructions: string, criteria: Record<K, string>) =>
  ({ type: 'choice' as const, instructions, criteria });

export const score = (instructions: string, criteria: string[]) =>
  ({ type: 'score' as const, instructions, criteria });
```

## Typed Result 与概率访问

```typescript
export function chosenProbability(answer: any): number {
  switch (answer.type) {
    case 'choice': return answer.probabilities[answer.choice];
    case 'score': return answer.probabilities[answer.confidence ? String(Math.round(answer.score)) : '0'] ?? 0;
    case 'noul': return answer.noul;
    default: return 0;
  }
}
```

生产代码应对缺失 key 与 Box 的 null confidence 做防御。

## Confidence Policy

```typescript
export type Action = 'execute' | 'confirm' | 'human' | 'abstain';

export function gate(p: number, risk: 'low' | 'medium' | 'high'): Action {
  if (risk === 'high') return p >= 0.95 ? 'confirm' : 'human';
  if (risk === 'medium') return p >= 0.85 ? 'execute' : p >= 0.6 ? 'confirm' : 'human';
  return p >= 0.7 ? 'execute' : p >= 0.45 ? 'confirm' : 'abstain';
}
```

## Cache 与去重

缓存键由 `model + state hash + questions hash` 组成。对相同工单重复判断可直接返回缓存；注意缓存概率结果会掩盖分布漂移，需设置 TTL 并记录命中率。

## Fallback 链

```typescript
async function withFallback(req, primary: JudgmentProvider, secondary?: JudgmentProvider) {
  try { return await primary.judge(req); }
  catch (err) {
    audit({ kind: 'provider_error', error: String(err) });
    if (secondary) return secondary.judge(req);
    return { model: 'fallback', answers: {}, usage: { input_tokens: 0, output_tokens: 0 } };
  }
}
```

Fallback 返回的空答案应触发人工路径，而不是被当作成功。

## Audit Log

记录 request_id、model、state_hash、questions hash、answers、facts、trace、action、latency、usage。原始 PII 不入库。

## 组装 Runtime

```typescript
export async function run(input) {
  const req = buildRequest(input);
  const cached = cache.get(req);
  if (cached) return cached;
  const response = await withFallback(req, provider, fallbackProvider);
  const action = decide(response.answers, input.facts);
  audit({ req, response, action });
  cache.set(req, response);
  return action;
}
```

## 运行方法

1. `npm install typescript`。
2. 用 FakeProvider 跑单测，覆盖所有规则分支。
3. 换成 JevProvider 并设置 `TYPESAFE_API_KEY` 做集成测试。
4. 用固定样本集做回归与校准。

## 常见错误

- Provider 与策略耦合，导致无法离线测试。
- Fallback 静默返回默认值并自动执行。
- 缓存键不含模型版本。

## 延伸阅读

- [Agent Judgment Layer](/jevlab/articles/agent-judgment-layer/)
- [Evaluation Pipeline](/jevlab/articles/production-eval/)
