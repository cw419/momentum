# 电子宠物功能文档 / Virtual Pet Feature Documentation

## 功能概述 / Feature Overview

电子宠物是一个通过完成任务和使用时间来"养成"的虚拟宠物系统。宠物具有饥饿度、心情、健康值等属性，会随着用户的活跃程度而变化，并能够升级进化。

The Virtual Pet is a nurturing system where completing tasks and usage time help "raise" your pet. The pet has attributes like hunger, happiness, and health that change based on user activity, and can level up and evolve.

---

## 相关文件 / Related Files

### 核心文件 / Core Files

| 文件路径                            | 职责                                       |
| ----------------------------------- | ------------------------------------------ |
| `src/types/pet.ts`                  | 宠物相关的所有类型定义                     |
| `src/utils/petLogic.ts`             | 宠物逻辑计算工具函数（衰减、奖励、心情等） |
| `src/hooks/domains/usePetDomain.ts` | 宠物领域层 Hook，状态管理和业务逻辑        |
| `src/utils/storage.ts`              | 本地存储工具（包含宠物数据的读写）         |

### UI 组件 / UI Components

| 文件路径                                   | 职责                                        |
| ------------------------------------------ | ------------------------------------------- |
| `src/components/pet/PetWidget.tsx`         | 主浮动窗口组件（可拖拽、最小化）            |
| `src/components/pet/PetAvatar.tsx`         | 宠物头像展示（包含阶段 Emoji 和心情指示器） |
| `src/components/pet/PetStatsBar.tsx`       | 属性条展示（饱食度、心情、健康、经验）      |
| `src/components/pet/PetCreationDialog.tsx` | 宠物创建/领养对话框                         |
| `src/components/pet/index.ts`              | 组件导出桶文件                              |

### 集成文件 / Integration Files

| 文件路径                                        | 修改内容                                   |
| ----------------------------------------------- | ------------------------------------------ |
| `src/storage/MomentumStorage.ts`                | 添加 `getPetState` 和 `savePetState` 接口  |
| `src/storage/localStorageAdapter.ts`            | 实现本地存储适配器方法                     |
| `src/infra/storage/supabase/SupabaseStorage.ts` | 添加宠物方法（使用 localStorage 作为后备） |
| `src/hooks/domains/useSessionsDomain.ts`        | 添加 `onPetTaskCompleted` 回调参数         |
| `src/app/AppShellContainer.tsx`                 | 初始化 `usePetDomain` 并连接任务完成回调   |
| `src/app/AppShellView.tsx`                      | 渲染 `PetWidget` 组件                      |
| `src/index.css`                                 | 添加宠物动画（bounce-gentle, scale-in）    |

---

## 类型定义 / Type Definitions

### PetState（宠物状态）

```typescript
interface PetState {
  id: string; // 唯一标识
  name: string; // 宠物名称

  // 核心属性 (0-100)
  hunger: number; // 饥饿度: 0=饱, 100=饿
  happiness: number; // 心情: 0=悲伤, 100=开心
  health: number; // 健康: 0=生病, 100=健康

  // 成长系统
  level: number; // 等级 (1-100)
  experience: number; // 当前经验值
  stage: PetStage; // 进化阶段

  // 时间戳
  createdAt: Date; // 创建时间
  lastFedAt: Date; // 上次喂食时间
  lastInteractedAt: Date; // 上次互动时间
  lastDecayCalculatedAt: Date; // 上次衰减计算时间

  // UI 状态
  isVisible: boolean; // 是否可见
  position: { x: number; y: number }; // 窗口位置(百分比)
}
```

### PetStage（进化阶段）

```typescript
type PetStage = 'egg' | 'baby' | 'child' | 'teen' | 'adult' | 'elder';
```

| 阶段  | 中文名 | 等级要求 | Emoji |
| ----- | ------ | -------- | ----- |
| egg   | 蛋     | 0        | 🥒    |
| baby  | 幼崽   | 1        | 🐣    |
| child | 幼年   | 5        | 🐥    |
| teen  | 少年   | 15       | 🐤    |
| adult | 成年   | 30       | 🐔    |
| elder | 元老   | 60       | 🦅    |

### PetMood（心情状态）

```typescript
type PetMood = 'ecstatic' | 'happy' | 'neutral' | 'sad' | 'depressed';
```

| 心情      | 中文 | 分数范围 | Emoji |
| --------- | ---- | -------- | ----- |
| ecstatic  | 兴奋 | ≥85      | 🤩    |
| happy     | 开心 | ≥65      | 😊    |
| neutral   | 普通 | ≥45      | 😐    |
| sad       | 难过 | ≥25      | 😢    |
| depressed | 沮丧 | <25      | 😭    |

**心情计算公式：**

```
score = happiness × 0.5 + (100 - hunger) × 0.3 + health × 0.2
```

---

## 核心机制 / Core Mechanics

### 1. 属性衰减系统 / Stat Decay System

宠物属性会随时间自然衰减，每5分钟计算一次：

| 属性   | 衰减率    | 说明                  |
| ------ | --------- | --------------------- |
| 饥饿度 | +2/小时   | 饥饿度持续增加        |
| 心情   | -1/小时   | 心情持续下降          |
| 健康   | -0.5/小时 | 仅当饥饿度>80时才衰减 |

**健康恢复：** 当饥饿度<50且健康<100时，健康以 0.5/小时 的速度恢复。

**代码位置：** `src/utils/petLogic.ts:78` - `calculateDecay()`

### 2. 任务完成奖励系统 / Task Completion Rewards

完成任务会获得以下奖励：

| 奖励类型 | 计算公式                          | 说明                       |
| -------- | --------------------------------- | -------------------------- |
| 经验值   | `10 + floor(任务时长/10)`         | 基础10XP + 每10分钟额外1XP |
| 饱食度   | `min(20, 任务时长/3)`             | 最多减少20点饥饿           |
| 心情     | `min(10, 5 + floor(任务时长/15))` | 5-10点心情提升             |

**失败任务：** 心情 -5，无其他奖励

**代码位置：** `src/utils/petLogic.ts:130` - `calculateTaskReward()`

### 3. 升级系统 / Leveling System

**经验值需求公式：**

```
XP_required(level) = floor(100 × 1.2^(level-1))
```

| 等级 | 所需XP | 等级 | 所需XP |
| ---- | ------ | ---- | ------ |
| 1    | 100    | 10   | 516    |
| 5    | 207    | 15   | 1284   |
| 20   | 3195   | 30   | 19463  |

**升级时：** 经验值会结转到下一级（溢出部分保留）

**代码位置：** `src/utils/petLogic.ts:12` - `xpPerLevel()`

### 4. 进化系统 / Evolution System

当等级达到阈值时，宠物自动进化：

| 阶段          | 所需等级 | 进化后外观 |
| ------------- | -------- | ---------- |
| egg → baby    | 1        | 🥒 → 🐣    |
| baby → child  | 5        | 🐣 → 🐥    |
| child → teen  | 15       | 🐥 → 🐤    |
| teen → adult  | 30       | 🐤 → 🐔    |
| adult → elder | 60       | 🐔 → 🦅    |

**代码位置：** `src/utils/petLogic.ts:14-21` - `stageThresholds`

### 5. 喂食系统 / Feeding System

手动喂食效果：

| 效果       | 数值                      |
| ---------- | ------------------------- |
| 饥饿度减少 | 30 点（不超过当前饥饿值） |
| 心情增加   | `min(5, 饥饿度减少/6)`    |

**代码位置：** `src/hooks/domains/usePetDomain.ts:72` - `feedPet()`

---

## 主要函数 / Key Functions

### petLogic.ts 工具函数

| 函数名                                        | 用途                       |
| --------------------------------------------- | -------------------------- |
| `calculateDecay(pet, now)`                    | 计算基于时间的属性衰减     |
| `calculateTaskReward(pet, duration, success)` | 计算任务完成奖励           |
| `calculateMood(pet)`                          | 基于属性计算心情状态       |
| `getXpForLevel(level)`                        | 获取指定等级所需经验       |
| `getStageForLevel(level)`                     | 获取指定等级对应的进化阶段 |
| `getNextStage(stage)`                         | 获取下一个进化阶段         |
| `getLevelProgress(pet)`                       | 计算当前等级进度(0-100%)   |
| `createNewPet(name)`                          | 创建新宠物对象             |
| `getStageEmoji(stage)`                        | 获取阶段对应的 Emoji       |
| `getMoodEmoji(mood)`                          | 获取心情对应的 Emoji       |
| `getStageName(stage, lang)`                   | 获取阶段的显示名称         |
| `getMoodName(mood, lang)`                     | 获取心情的显示名称         |

### usePetDomain Hook 返回值

| 属性/方法                            | 类型                            | 用途          |
| ------------------------------------ | ------------------------------- | ------------- |
| `pet`                                | `PetState \| null`              | 当前宠物状态  |
| `mood`                               | `PetMood`                       | 当前心情      |
| `isLoading`                          | `boolean`                       | 加载状态      |
| `hasPet`                             | `boolean`                       | 是否已有宠物  |
| `createPet(name)`                    | `Promise<PetState>`             | 创建新宠物    |
| `feedPet()`                          | `Promise<FeedResult>`           | 喂食宠物      |
| `onTaskCompleted(duration, success)` | `Promise<TaskCompletionReward>` | 处理任务完成  |
| `updatePosition(x, y)`               | `Promise<void>`                 | 更新窗口位置  |
| `toggleVisibility()`                 | `Promise<void>`                 | 切换显示/隐藏 |
| `showPet()`                          | `Promise<void>`                 | 显示宠物      |

---

## 数据流 / Data Flow

```
用户完成任务
    ↓
useSessionsDomain.completeTask()
    ↓
调用 onPetTaskCompleted 回调
    ↓
usePetDomain.onTaskCompleted()
    ↓
calculateTaskReward() → 计算奖励
    ↓
更新 PetState → 保存到 localStorage
    ↓
PetWidget 重新渲染
```

---

## 存储 / Storage

宠物数据仅存储在本地 localStorage 中：

**存储键：** `momentum_pet_state`

**序列化处理：** Date 对象序列化为 ISO 字符串，读取时还原为 Date 对象

**代码位置：** `src/utils/storage.ts:178-211`

---

## UI 交互 / UI Interactions

### PetWidget 功能

- **拖拽移动：** 按住标题栏拖拽，松开时保存位置
- **最小化：** 点击最小化按钮，只显示头像
- **隐藏：** 点击关闭按钮，隐藏整个组件
- **喂食：** 点击喂食按钮或点击宠物头像

### 初始状态

新宠物创建时的默认值：

| 属性   | 默认值              |
| ------ | ------------------- |
| 饥饿度 | 50                  |
| 心情   | 70                  |
| 健康   | 100                 |
| 等级   | 1                   |
| 经验   | 0                   |
| 阶段   | egg                 |
| 位置   | (80%, 80%) - 右下角 |

---

## CSS 动画 / CSS Animations

位于 `src/index.css`：

- `animate-bounce-gentle` - 宠物头像轻微弹跳动画
- `animate-scale-in` - 对话框缩放进入动画

---

## 架构遵循 / Architecture Compliance

此功能遵循项目的三层架构：

1. **UI 层** - `src/components/pet/` 纯展示组件
2. **领域层** - `src/hooks/domains/usePetDomain.ts` 业务逻辑
3. **存储层** - `src/utils/storage.ts` + `MomentumStorage` 接口

遵循 KISS、YAGNI、DRY、SOLID 原则：

- 单一职责：每个组件/函数只做一件事
- 无过度设计：仅实现当前需要的功能
- 无重复代码：计算逻辑集中在 petLogic.ts
