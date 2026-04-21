# HW1.1 领域对象接入与重构说明

## 上下文 (Context)
本次作业 (HW 1.1) 的核心目标是将 Homework 1 中设计的纯领域对象 (`Sudoku` 和 `Game`) 真正接入到现有的 Svelte 3 前端游戏流程中。
在先前的版本中，领域对象处于孤立的测试状态，UI 组件（如键盘和操作栏）直接越过领域对象修改底层的二维数组状态，导致面向对象设计边界失效，且无法利用 Svelte 的响应式机制驱动界面更新。本次重构基于**方案 A (Store Adapter)**，通过引入 `gameManager` 适配层连接领域模型与视图层。

## 已解决问题 (Resolved Issues)
通过重构 `src/domain/index.js` 及 Svelte 状态库，已彻底解决以下缺陷（包含 `review.docx` 中的评审反馈）：

* **修复 Game 聚合边界泄露**：移除了 `Game` 直接暴露底层可变 `Sudoku` 实例的后门，`getSudoku()` 现返回仅含读取方法的代理对象。确保所有的写操作强制经过 `Game.guess()`，维护了会话的一致性。
* **修复动态 `this` 丢失隐患**：将 `undo`/`redo` 依赖的 `this.canUndo()` 改为闭包级别函数声明，确保其在 Svelte Store 适配层作为回调执行时的上下文安全。
* **强化防御性深拷贝**：在实体的初始化、快照推入历史栈、以及数据读取导出时，全面引入深拷贝机制（`cloneGrid`）。彻底阻断了外部数组引用导致的历史记录和内部状态污染。
* **完成 Svelte 响应式接入**：彻底移除了 UI 组件中原有的 `userGrid.set()` 等直接突变操作，建立了 `gameManager` (Store Adapter)。通过 Svelte 的 `writable.update()` 包裹领域对象的方法调用，并利用 `derived` store 向 UI 暴露只读的 `$currentGrid`、`$canUndo` 状态，实现了顺滑的数据流转与视图刷新。

## 未解决问题 (Unresolved Issues)
* **本地数据持久化**：当前的历史栈与盘面快照仅保存在适配器闭包的内存中，浏览器刷新后游戏进度（含 Undo/Redo 历史）会重置。暂未实现基于 `localStorage` 的状态持久化（不在当前作业强要求范围内）。
* **新版框架特性迁移**：当前的响应式方案严格遵守了现有工程的 Svelte 3/4 规范（使用 `$store` 与 `writable`）。若未来工程迁移至 Svelte 5，当前的适配层可以平滑重构为基于 `Runes` 的信号机制，而底层的纯领域逻辑已实现完全解耦，届时无需任何修改。
