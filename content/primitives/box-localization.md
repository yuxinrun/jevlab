---
title: "Box 图像定位：实验性能力"
description: "Box 的坐标格式、Danger Zone 头、Dreamer-ready 状态与必须搭配 Noul 的原因。"
category: primitives
categoryTitle: "第三部分 · Choice / Score / Noul / Box"
order: 19
tags: [Box, 图像, 实验性]
---
## 学习目标

知道 Box 能做什么、不能做什么，以及为什么它不能被写成“稳定生产功能”。

![Box 定位](/jevlab/diagrams/box.svg)

## 成熟度声明（研究日期 2026-11-25）

- 官方文档把 Images 与 Box 标记为 **Dreamer-ready**：尚未达到生产就绪标准，适合原型与实验。
- 必须显式发送 `TypeSafe-Danger-Zone-Images: true`。
- Box 问题需要 Jev 1.14；JS SDK 文档提示 box 请求应使用 `jev-preview`，而 Models 页说明 `jev-preview` 当前指向 `jev-1.14.0`。以你使用的 SDK 版本文档为准。
- 官方 1.14 博客称这些功能仍有较多 jaggedness，**不建议用于生产场景**；多模态表现通常弱于纯文本。

本站因此不把 Box 描述为稳定能力。

## 请求示例（官方 multipart 形式）

```bash
curl https://api.typesafe.ai/v1/systemone \
  -H "Authorization: Bearer $TYPESAFE_API_KEY" \
  -H "TypeSafe-Danger-Zone-Images: true" \
  -F 'request={
    "model": "jev-1.14.0",
    "state": {"photo": "kitchen-1"},
    "assets": {"kitchen-1": {"type": "image", "part": "kitchen-photo"}},
    "questions": {
      "mug_visible": {"type": "noul", "instructions": "Is there a coffee mug in `photo`?"},
      "mug": {"type": "box", "instructions": "the coffee mug in `photo`"}
    }
  };type=application/json' \
  -F 'kitchen-photo=@kitchen.jpg;type=image/jpeg'
```

图片仅支持 PNG / JPEG；asset 名称必须唯一且恰好被一处引用。

## 响应结构

```json
{
  "mug": {
    "type": "box",
    "box": {"top": 0.25, "bottom": 0.82, "left": 0.44, "right": 0.84},
    "confidence": 0.92
  }
}
```

坐标是图像宽高比例：左上角 (0,0)，右下角 (1,1)。转像素：

```python
x1 = round(box["left"] * width)
y1 = round(box["top"] * height)
x2 = round(box["right"] * width)
y2 = round(box["bottom"] * height)
```

OpenAPI 中 `BoxAnswer.confidence` 允许 null；文档正文描述为 0–1 数值。生产代码应同时处理数值与 null。

## Box 永远返回一个框

官方明确提醒：即使目标不在图中，Box 也会返回坐标，没有 “not found” 答案。因此必须搭配 Noul：

```python
visible = r.answers["mug_visible"].noul
if visible > 0.7:
    use_box(r.answers["mug"].box)
else:
    ignore_box()
```

## 低置信度处理

官方建议：换更清晰的图片、使用更高分辨率的局部裁剪、裁剪前适当扩大边界避免切掉目标。不要在没有验证的情况下把低置信度结果用于自动化点击。

## Browser Agent 的启示

GUI 元素定位是 Box 的诱人场景，但实验性状态意味着：

- 必须保留人工确认或重试路径。
- 不能把坐标直接当作可执行动作。
- 应记录每次定位的 confidence 与最终成功率。

## 延伸阅读

- [官方 Box 文档](https://docs.typesafe.ai/primitives/box)
- [Jev 1.14 发布博客](https://typesafe.ai/blog/jev-1-14)
