# con-oo-blankAccount-stack - Review

## Review 结论

当前实现有一定的领域封装意识，但还没有把 `Sudoku/Game` 变成真实的游戏核心。静态阅读显示，开局、渲染、胜负判断、提示等主流程仍主要依赖旧的 `grid/userGrid/game` store，领域对象与 Svelte UI 之间形成了分裂状态，因此从作业要求看，这次接入尚未达标。

## 总体评价

| 维度 | 评价 |
| --- | --- |
| OOP | fair |
| JS Convention | fair |
| Sudoku Business | poor |
| OOD | poor |

## 缺点

### 1. `Sudoku` 只建模了单一 grid，缺少“题面 clues”和“玩家当前盘面”的业务边界

- 严重程度：core
- 位置：src/domain/index.js:7-29
- 原因：当前 `Sudoku` 只有一个 `grid`，无法表达哪些格子是初始给定、哪些格子允许玩家填写，也无法自然承载分享题面、锁定 givens、提示等业务语义。这也是为什么 UI 仍不得不继续依赖 `src/node_modules/@sudoku/stores/grid.js` 中分离的 `grid`/`userGrid`：领域模型没有把数独游戏的核心概念建完整。

### 2. 开局流程没有真正走领域对象，`gameManager.init()` 实际未接入真实入口

- 严重程度：core
- 位置：src/node_modules/@sudoku/stores/gameManager.js:11-16
- 原因：`gameManager` 提供了创建 `Sudoku/Game` 的 `init(difficulty)`，但静态搜索未发现任何调用。真实开局入口仍在 `src/components/Modal/Types/Welcome.svelte:16-20` 和 `src/components/Header/Dropdown.svelte:20-22,51-53`，它们调用的是旧的 `@sudoku/game.startNew/startCustom`，因此“开始一局游戏”这一最关键流程并没有通过领域对象完成。

### 3. 棋盘渲染和胜负判断仍然消费旧 store，而不是领域对象导出的视图状态

- 严重程度：core
- 位置：src/components/Board/index.svelte:3-5,40-51
- 原因：棋盘组件订阅的是 `grid/userGrid/invalidCells`，不是 `gameManager` 的 `currentGrid`；`currentGrid` 在仓库内没有任何消费点。与此同时，胜负判断仍来自 `src/App.svelte:6-15` 对 `src/node_modules/@sudoku/stores/game.js:1-18` 的订阅。结果是 UI 看到的局面、冲突检测和是否通关都不以 `Game/Sudoku` 为准，领域对象没有成为单一事实来源。

### 4. 输入、笔记、提示分别写向不同状态源，导致流程和历史语义割裂

- 严重程度：major
- 位置：src/components/Controls/Keyboard.svelte:10-25；src/components/Controls/ActionBar/Actions.svelte:15-21
- 原因：普通数字输入走 `gameManager.guess(...)`，但笔记仍直接改 `candidates`，提示仍直接调用 `userGrid.applyHint(...)`。这意味着即便 `gameManager` 被初始化，棋盘值、候选数、提示结果和 undo/redo 也不会共享同一套状态演进；尤其是 note 模式下还会额外调用 `gameManager.guess(... value: 0)`，把“记笔记”与“清空格子”耦合在一起，业务语义不清晰。

### 5. `Sudoku` 缺少显式校验能力，`guess` 只做坐标和值范围检查

- 严重程度：major
- 位置：src/domain/index.js:15-20
- 原因：作业要求里 `Sudoku` 至少应提供校验能力，但当前对象没有 `validate`、`isValidMove`、`getInvalidCells` 等接口。`guess` 只是把 0-9 写进格子，不检查行列宫规则，也不保护初始 givens，导致业务规则继续散落在外部 `invalidCells` 等 store 中，领域对象没有承担应有的业务职责。

### 6. `Game.guess()` 在确认变更是否有效之前就写入 history 并清空 redo

- 严重程度：major
- 位置：src/domain/index.js:60-64
- 原因：`Game.guess()` 先 `push(currentSudoku.clone())`、再清空 `_redoStack`，最后才调用 `currentSudoku.guess(move)`。如果 move 非法、越界，或者本质上是 no-op，仍会生成一个新的撤销步并丢失 redo 历史。这说明 `Game` 没有把“命令是否真的导致状态迁移”建模清楚。

## 优点

### 1. 对 grid 采取了防御性拷贝，能较好避免引用污染

- 位置：src/domain/index.js:1-29
- 原因：`cloneGrid()` 被用于构造、`getGrid()`、`toJSON()` 和 `clone()`，这使外部代码较难通过共享数组引用意外篡改内部状态；对 JS 中常见的浅拷贝问题有明确防御。

### 2. `Game` 已把 undo/redo 和序列化集中到一个对象中

- 位置：src/domain/index.js:41-86
- 原因：历史栈、重做栈和当前 `Sudoku` 被统一封装在 `Game` 闭包里，`undo()`/`redo()`/`toJSON()` 也集中在同一处，这比把撤销重做逻辑散落在多个组件里更接近合理的应用服务边界。

### 3. `getSudoku()` 没有直接泄露可变实体，边界意识是对的

- 位置：src/domain/index.js:52-58
- 原因：UI 侧拿到的是只读能力集合，而不是带 `guess()` 的可变对象，这可以减少绕过 `Game` 历史管理直接改盘面的风险。

### 4. 接入方向选择了 Svelte 3 更合适的 Store Adapter 模式

- 位置：src/node_modules/@sudoku/stores/gameManager.js:40-44；src/components/Controls/Keyboard.svelte:23-24；src/components/Controls/ActionBar/Actions.svelte:27-33
- 原因：`gameManager` 用 `writable/derived` 包装领域对象，并让键盘输入、撤销、重做优先调用 adapter 命令接口，而不是继续把这些关键逻辑直接写在组件里。虽然接入尚未完成，但方向本身符合本次作业推荐方案。

## 补充说明

- 所有结论均基于静态阅读；未运行测试，也未启动 Svelte 页面进行交互验证。
- 关于“未真正接入 Svelte 主流程”的结论来自静态调用链分析：仓库内未发现 `gameManager.init()` 的调用，而棋盘渲染、胜负判断、分享、提示仍主要依赖 `grid`/`userGrid`/`game` 相关旧 store。
- 本次评审按要求只覆盖 `src/domain/*` 及其直接相关的 Svelte 接入代码；未扩展到无关目录。
