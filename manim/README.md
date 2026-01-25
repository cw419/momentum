# 自制力科普视频 - Manim 动画

基于 Edmond 的《如何提高自制力？》文章制作的科普视频。

## 运行方式

```bash
cd C:\Users\xfc05\Downloads\momentum\momentum-new-feature-branch\manim

# 预览单个场景（低质量快速）
manim -pql main.py IntroScene

# 渲染高质量视频
manim -pqh main.py IntroScene
```

## 场景列表

| 场景 | 内容 |
|------|------|
| IntroScene | 问题引入 |
| MathModelScene | 数学模型 |
| CTDPScene | CTDP原理 |
| RSIPScene | RSIP思想 |
| OutroScene | Momentum介绍 |

## 渲染全部场景

```bash
manim -pqh main.py
```
