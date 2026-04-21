## HW 问题收集

列举在HW 1、HW1.1过程里，你所遇到的2~3个通过自己学习已经解决的问题，和2~3个尚未解决的问题与挑战

### 已解决

1. 怎么防止 JavaScript 中二维数组（棋盘数据）的引用污染问题？
   1. **上下文**：在实现 `Sudoku` 和 `Game` 领域对象时，外界如果直接修改 `getGrid()` 返回的数组，或者在存入 `history` 历史栈时直接 push 原对象的引用，会导致撤销重做时历史快照全被篡改。
   2. **解决手段**：通过查阅资料与反思，在 `domain/index.js` 中编写了 `cloneGrid(grid)` 深度拷贝函数，并在对象的构造、获取、快照（`clone`）以及序列化导出时全面采用了防御性拷贝策略。

2. 如何在 Svelte 中将纯面向对象（OOP）的领域模型转变为响应式状态？
   1. **上下文**：HW1 中写出的 `Game` 对象是纯静态的，直接在 UI 组件里调用 `game.guess()` 虽然底层数据变了，但无法触发 Svelte 棋盘组件的 DOM 重新渲染。
   2. **解决手段**：学习并采用了 **Store Adapter (适配器模式)**。在 `gameManager.js` 中利用 `writable` 包裹了领域对象实体，并在每次调用 `guess/undo` 后显式使用 `update(game => { ... return game })` 触发 Svelte 的响应通知，最后通过 `derived` 暴露只读的 `$currentGrid` 供 UI 消费。

### 未解决

1. 如何在领域层合理区分“初始题面(givens)”和“玩家当前作答”的业务边界？
   1. **上下文**：`src/domain/index.js`
      ```javascript
      export function createSudoku(input) {
        let grid = cloneGrid(input); // 目前只建模了单一 grid
        // ...
      }
      ```
      老师评审指出这样无法保护初始题目不被修改，也无法自然承载锁定与提示等业务逻辑，导致 UI 仍不得不继续依赖分离的旧 `userGrid`。
   2. **尝试解决手段**：打算在 `Sudoku` 内部拆分出 `clues`（只读题面）和 `workingGrid`（玩家修改）两个独立状态，并在 `guess` 函数里增加对坐标是否属于 clues 的校验拦截，目前仍在梳理如何与现存 UI 渲染对接。

2. 真实游戏的开局流程如何平滑迁移到新的领域对象上？
   1. **上下文**：虽然在适配器里写了 `gameManager.init(difficulty)`，但在整个仓库静态搜索未发现任何调用。真实的开局逻辑仍然散落在 `Welcome.svelte` 和 `Dropdown.svelte` 组件中，高度绑定了旧的 `@sudoku/game.startNew`。
   2. **尝试解决手段**：尝试修改这些界面的 onClick 事件，准备将开局动作全部指向 `gameManager.init()`，但牵扯到旧版计时器（Timer）重置等外部状态的协同，还没完全剥离重构干净。

3. 笔记（Notes）和提示（Hints）的业务状态如何统一收口进 Game 模型？
   1. **上下文**：在 `src/components/Controls/Keyboard.svelte` 和 `Actions.svelte` 等文件里，业务语义割裂：
      ```javascript
      // 普通数字输入走了新领域对象
      gameManager.guess({ row: $cursor.y, col: $cursor.x, value: num });
      // 但笔记和提示还在强依赖旧 store
      candidates.add($cursor, num);
      userGrid.applyHint($cursor);
      ```
   2. **尝试解决手段**：计划将“提示”逻辑也归属到领域对象中（提示本质也是一种 `guess`），同时考虑把“候选数(candidates)”状态也纳入 `Sudoku` 实体的职责范围。由于牵连的文件较多，目前这部分代码闭环仍具挑战性。
