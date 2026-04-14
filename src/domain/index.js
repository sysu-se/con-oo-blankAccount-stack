// 辅助函数：深度拷贝二维数组（防浅拷贝污染）
function cloneGrid(grid) {
  return grid.map(row => [...row]);
}

// 1. 创建 Sudoku 实体
export function createSudoku(input) {
  let grid = cloneGrid(input); // 防御性拷贝

  return {
    getGrid() { 
      return cloneGrid(grid); // 每次返回深拷贝，确保领域绝对封装
    }, 
    guess({ row, col, value }) {
      // 增加基本的数独领域规则校验
      if (row >= 0 && row < 9 && col >= 0 && col < 9 && value >= 0 && value <= 9) {
        grid[row][col] = value;
      }
    },
    clone() { 
      return createSudoku(grid); 
    },
    toJSON() { 
      return { grid: cloneGrid(grid) }; 
    },
    toString() { 
      return grid.map(row => row.join(' ')).join('\n'); 
    }
  };
}

export function createSudokuFromJSON(json) {
  if (!json || !json.grid) throw new Error("Invalid JSON structure");
  return createSudoku(json.grid);
}

// 2. 创建 Game 控制对象
export function createGame({ sudoku, history = [], redoStack = [] }) {
  // 防御性拷贝初始传入的对象和数组，防止外部保留引用篡改内部状态
  let currentSudoku = sudoku.clone();
  let _history = history.map(s => s.clone());
  let _redoStack = redoStack.map(s => s.clone());

  // 使用内部闭包函数，消除 undo/redo 对动态 this 的依赖
  const canUndo = () => _history.length > 0;
  const canRedo = () => _redoStack.length > 0;

  return {
    getSudoku() { 
      // 暴露只读代理，防止外部绕过 Game 直接调用 sudoku.guess()
      return {
        getGrid: () => currentSudoku.getGrid(),
        toJSON: () => currentSudoku.toJSON(),
        toString: () => currentSudoku.toString()
      };
    },
    guess(move) {
      _history.push(currentSudoku.clone()); // 存入历史快照
      _redoStack = []; // 发生新分支，清空重做栈
      currentSudoku.guess(move);
    },
    undo() {
      if (canUndo()) {
        _redoStack.push(currentSudoku.clone());
        currentSudoku = _history.pop();
      }
    },
    redo() {
      if (canRedo()) {
        _history.push(currentSudoku.clone());
        currentSudoku = _redoStack.pop();
      }
    },
    canUndo,
    canRedo,
    toJSON() {
      return {
        sudoku: currentSudoku.toJSON(),
        history: _history.map(s => s.toJSON()),
        redoStack: _redoStack.map(s => s.toJSON())
      };
    }
  };
}

export function createGameFromJSON(json) {
  return createGame({
    sudoku: createSudokuFromJSON(json.sudoku),
    history: (json.history || []).map(createSudokuFromJSON),
    redoStack: (json.redoStack || []).map(createSudokuFromJSON)
  });
}
