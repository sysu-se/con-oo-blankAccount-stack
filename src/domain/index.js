// 辅助函数：深度拷贝二维数组（防浅拷贝污染）
function cloneGrid(grid) {
  return grid.map(row => [...row]);
}

// 1. 创建 Sudoku 实体
export function createSudoku(input) {
  // 防御性拷贝，防止外部引用篡改
  let grid = cloneGrid(input); 

  return {
    getGrid() { 
      return cloneGrid(grid); 
    }, 
    guess({ row, col, value }) {
      // 引入领域规则：校验坐标与数值边界
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

// 2. 从 JSON 反序列化恢复 Sudoku
export function createSudokuFromJSON(json) {
  // 增加基本结构校验
  if (!json || !json.grid) throw new Error("Invalid JSON structure for Sudoku");
  return createSudoku(json.grid);
}

// 3. 创建 Game 控制对象
export function createGame({ sudoku, history = [], redoStack = [] }) {
  // 彻底拷贝初始入参，封装内部历史栈
  let currentSudoku = sudoku.clone();
  let _history = history.map(s => s.clone());
  let _redoStack = redoStack.map(s => s.clone());

  // 使用闭包函数替代 this.canUndo，保障回调执行时的上下文安全
  const canUndo = () => _history.length > 0;
  const canRedo = () => _redoStack.length > 0;

  return {
    getSudoku() { 
      // 暴露只读代理接口，防止外部获取实体后直接调用 guess 绕过历史栈记录
      return {
        getGrid: () => currentSudoku.getGrid(),
        toJSON: () => currentSudoku.toJSON(),
        toString: () => currentSudoku.toString()
      };
    },
    guess(move) {
      _history.push(currentSudoku.clone()); 
      _redoStack = []; 
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

// 4. 从 JSON 反序列化恢复 Game
export function createGameFromJSON(json) {
  return createGame({
    sudoku: createSudokuFromJSON(json.sudoku),
    history: (json.history || []).map(createSudokuFromJSON),
    redoStack: (json.redoStack || []).map(createSudokuFromJSON)
  });
}
