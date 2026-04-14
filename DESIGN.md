# 领域对象接入设计文档 (Homework 1.1)

## A. 领域对象如何被消费
1. **View 层直接消费的是什么？**
   View 层没有直接操作 `Game` 或 `Sudoku`，而是消费了基于 Store Adapter 方案设计的 `gameManager`。
2. **View 层拿到的数据是什么？**
   UI 层仅能拿到通过 `derived` 派生出来的只读状态：`$currentGrid` (深拷贝的棋盘数组)、`$canUndo` 和 `$canRedo`。
3. **用户操作如何进入领域对象？**
   用户的按键或点击按钮行为，会调用 `gameManager.guess(move)` 等方法。Adapter 充当桥梁，内部将其路由至 `Game.guess()`，实际操作对象并更新历史栈。
4. **领域对象变化后，Svelte 为什么会更新？**
   在 `gameManager` 内部的方法中，使用了 Svelte 3 的 `update(game => { ... ; return game; })` 机制。即使内部属性改变未导致根对象内存地址变更，显式 `return` 也会使 writable store 下发订阅事件，触发衍生 store 重新计算进而刷新 DOM。

## B. 响应式机制说明
1. **依赖的机制：**
   使用了 `writable` 和 `derived`。由 `$store` 在 Svelte 组件中自动进行订阅管理。
2. **暴露与隐藏的边界：**
   响应式暴露给 UI 的只有棋盘当前状态和操作许可权（用于按钮 disable 控制）。而用于支持撤销的 `history` 和 `redoStack` 等内部机制被封装在 `createGame` 的闭包域中，禁止 UI 直接触碰。
3. **直接 Mutate 内部对象的问题：**
   如果不使用适配层的 `update()` 机制，组件直接对底层数组执行赋值（如 `game.currentSudoku.grid[0][0] = 1`），Svelte 框架的侦听器无法感知对象的深层突变，从而导致数据已经发生变化，但 UI 仍然无法自动刷新。

## C. 改进说明
1. **相比 HW1 改进了什么？**
   修复了HW1中指出的缺陷：
   - 封死了 `Game.getSudoku()` 直接泄露实体引用的边界。
   - 对构造 Game 时的初始入参和数组执行了强制克隆。
   - 移除了 `this.canUndo()` 的写法，改用局部函数。
   - 为 `Sudoku` 的 guess 添加了基础数值与越界规则校验。
2. **HW1 做法为什么不足以支撑接入？**
   HW1 中封装出的仅是独立的 JavaScript 纯对象，这类对象在进行内部数据变更时无法主动对外广播事件。前端应用想要正常响应，必须将这套状态机通过订阅模型（Adapter 层）挂载进 UI 的生命周期系统里。
3. **新设计的 Trade-off：**
   使用大量的深度拷贝行为严格保障撤销历史的安全隔离。这对内存存在微小的占用提升，但彻底杜绝了 JavaScript 常见的数组引用污染问题，保障了视图与数据严格单向的数据流。
