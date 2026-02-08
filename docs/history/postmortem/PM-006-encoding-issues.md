# PM-006: 字符编码问题 (Mojibake)

**严重程度**: Low
**影响版本**: new-feature-branch (before commit 9fae93f)
**修复提交**: `9fae93f`

---

## 1. 概述

国际化文案（i18n）中的中文参数被错误地以 Windows-1252/ANSI 编码保存，导致显示为乱码（mojibake），如 `æ...` 这种字符序列。问题在"宠物"功能关闭后暴露，因为关闭提示使用了这组被损坏的文案。

## 2. 影响范围

### 用户可见症状

- 部分中文文案显示为乱码（如 `æ\x9c\x80å\x90\x8e`）
- 宠物功能关闭提示不可读
- 用户可能误以为是浏览器或系统问题

### 影响面

- 中文用户
- 涉及特定文案的功能入口

## 3. 根因分析

### 3.1 Mojibake 形成过程

```
原始中文: "最后" (UTF-8: E6 9C 80 E5 90 8E)

错误保存时（编辑器用 Windows-1252 编码打开 UTF-8 文件）:
E6 9C 80 E5 90 8E
↓  ↓  ↓  ↓  ↓  ↓
æ  \x9c \x80 å  \x90 \x8e

结果: "æ\x9c\x80å\x90\x8e" 被保存到文件
```

### 3.2 问题代码（修复前）

```typescript
// 某处的 i18n 定义文件
export const petMessages = {
  closePrompt: tr('æ\x9c\x80å\x90\x8e...', 'Last...'), // ❌ 乱码
};
```

### 3.3 为什么问题会隐藏

- 英文回退机制：当中文不可用时显示英文
- 大部分文案正常，只有被特定编辑器修改过的文件受影响
- 宠物功能不常用，问题被延迟发现

## 4. 修复方案

### 4.1 自动纠错机制

```typescript
// I18nProvider.tsx
function tr(zhText: string, enText: string): string {
  const lang = useLanguage();

  if (lang === 'zh') {
    // ✅ 检测并修复 mojibake
    if (isMojibake(zhText)) {
      const fixed = tryFixMojibake(zhText);
      if (fixed) {
        return fixed;
      }
    }
    return zhText;
  }

  return enText;
}

function isMojibake(text: string): boolean {
  // 中文文案应该包含汉字
  // 如果不包含汉字，可能是 mojibake
  const hasChineseChar = /[\u4e00-\u9fff]/.test(text);
  const hasSuspiciousPattern = /[æåã]/.test(text); // Windows-1252 典型特征

  return !hasChineseChar && hasSuspiciousPattern;
}

function tryFixMojibake(text: string): string | null {
  try {
    // 尝试 Windows-1252 → UTF-8 转换
    const bytes = new Uint8Array([...text].map((c) => c.charCodeAt(0)));
    const decoded = new TextDecoder('utf-8').decode(bytes);

    // 验证转换结果包含汉字
    if (/[\u4e00-\u9fff]/.test(decoded)) {
      return decoded;
    }
  } catch {
    // 转换失败，返回原文
  }
  return null;
}
```

### 4.2 根本修复：重新保存文件

```bash
# 找出可能损坏的文件
find src -name "*.ts" -o -name "*.tsx" | xargs file | grep -v "UTF-8"

# 使用正确编码重新保存
# 在 VSCode 中：右下角编码 → "Reopen with Encoding" → UTF-8
# 然后：右下角编码 → "Save with Encoding" → UTF-8
```

## 5. 预防措施

### 5.1 编辑器配置

```json
// .vscode/settings.json
{
  "files.encoding": "utf8",
  "files.autoGuessEncoding": false
}

// .editorconfig
[*]
charset = utf-8
```

### 5.2 Git 配置

```bash
# 确保 Git 使用 UTF-8
git config --global core.quotepath false
git config --global i18n.commitencoding utf-8
git config --global i18n.logoutputencoding utf-8
```

### 5.3 代码审查清单

- [ ] 新增的中文文案是否正常显示？
- [ ] 文件是否以 UTF-8 编码保存？
- [ ] 是否有可疑的 `æ`, `å`, `ã` 字符？

### 5.4 CI 检查

```bash
# 在 CI 中检查文件编码
#!/bin/bash
for file in $(find src -name "*.ts" -o -name "*.tsx"); do
  encoding=$(file -b --mime-encoding "$file")
  if [ "$encoding" != "utf-8" ] && [ "$encoding" != "us-ascii" ]; then
    echo "ERROR: $file has encoding $encoding (expected utf-8)"
    exit 1
  fi
done
```

## 6. 相关提交

| Commit    | 描述                              |
| --------- | --------------------------------- |
| `9fae93f` | 修复：i18n tr() 自动纠错 mojibake |

## 7. 经验教训

> **核心教训**: 字符编码问题往往隐藏很深，因为：
>
> 1. 回退机制掩盖了问题
> 2. 部分内容正常，让问题看起来是"个案"
> 3. 开发者环境可能与问题环境不同
>
> 预防胜于治疗：统一编辑器配置，在 CI 中检查编码。

### 编码问题的常见来源

```
1. 编辑器默认编码不是 UTF-8
   └── 解决：统一 .editorconfig 和 IDE 设置

2. 文件在 Windows 和 macOS/Linux 间传输
   └── 解决：使用 Git 并配置正确的编码

3. 复制粘贴时编码丢失
   └── 解决：从可信源复制，验证结果

4. 外部工具处理文件
   └── 解决：检查工具的编码设置
```

---

_作者: Postmortem Analysis System_
_日期: 2026-01-12_
