const SIZE = 6;
const GAME_TIME = 90;
const TILE_COUNT = 6;

const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const bestEl = document.getElementById('best');
const statusEl = document.getElementById('status');
const startBtn = document.getElementById('start-btn');

const state = {
  board: [],
  score: 0,
  timeLeft: GAME_TIME,
  best: Number(localStorage.getItem('numberChainBest') || 0),
  running: false,
  timerId: null,
};

function randomTile() {
  return Math.floor(Math.random() * TILE_COUNT) + 1;
}

function createBoard() {
  const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      board[row][col] = randomTile();
    }
  }
  return board;
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function getNeighbors(row, col) {
  return [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ].filter(([nextRow, nextCol]) => {
    return nextRow >= 0 && nextRow < SIZE && nextCol >= 0 && nextCol < SIZE;
  });
}

function collectGroup(board, startRow, startCol) {
  const target = board[startRow][startCol];
  const queue = [[startRow, startCol]];
  const visited = new Set([`${startRow},${startCol}`]);
  const cells = [];

  while (queue.length > 0) {
    const [row, col] = queue.shift();
    cells.push([row, col]);

    const neighbors = getNeighbors(row, col);
    for (const [nextRow, nextCol] of neighbors) {
      const key = `${nextRow},${nextCol}`;
      if (!visited.has(key) && board[nextRow][nextCol] === target) {
        visited.add(key);
        queue.push([nextRow, nextCol]);
      }
    }
  }

  return cells;
}

function hasAnyMatch(board) {
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (collectGroup(board, row, col).length >= 3) {
        return true;
      }
    }
  }
  return false;
}

function collapseBoard() {
  for (let col = 0; col < SIZE; col += 1) {
    const values = [];
    for (let row = SIZE - 1; row >= 0; row -= 1) {
      if (state.board[row][col] !== null) {
        values.push(state.board[row][col]);
      }
    }

    for (let row = SIZE - 1; row >= 0; row -= 1) {
      const value = values[SIZE - 1 - row];
      state.board[row][col] = value ?? null;
    }
  }

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (state.board[row][col] === null) {
        state.board[row][col] = randomTile();
      }
    }
  }
}

function clearGroup(group) {
  const groupSet = new Set(group.map(([row, col]) => `${row},${col}`));

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (groupSet.has(`${row},${col}`)) {
        state.board[row][col] = null;
      }
    }
  }

  collapseBoard();

  const cleared = group.length;
  state.score += cleared * 12 + Math.max(0, cleared - 3) * 8;
  state.timeLeft = Math.min(GAME_TIME + 20, state.timeLeft + Math.min(4, cleared / 3));

  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem('numberChainBest', String(state.best));
  }

  if (!hasAnyMatch(state.board)) {
    statusEl.textContent = '盤面をリシャッフルしました！';
    state.board = createBoard();
  } else {
    statusEl.textContent = `連鎖成功！ +${cleared * 12} 点`;
  }

  renderBoard();
  updateHud();
}

function handleCellClick(event) {
  if (!state.running) return;

  const row = Number(event.currentTarget.dataset.row);
  const col = Number(event.currentTarget.dataset.col);
  const group = collectGroup(state.board, row, col);

  if (group.length >= 3) {
    clearGroup(group);
    return;
  }

  event.currentTarget.dataset.invalid = 'true';
  statusEl.textContent = '同じ数字を3個以上つなげて消そう！';
  state.timeLeft = Math.max(0, state.timeLeft - 2);
  updateHud();

  setTimeout(() => {
    event.currentTarget.dataset.invalid = 'false';
  }, 220);
}

function renderBoard() {
  boardEl.innerHTML = '';

  state.board.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cell';
      btn.dataset.value = String(value);
      btn.dataset.row = String(rowIndex);
      btn.dataset.col = String(colIndex);
      btn.textContent = value ?? '';
      btn.disabled = !state.running;
      btn.addEventListener('click', handleCellClick);
      boardEl.appendChild(btn);
    });
  });
}

function updateHud() {
  scoreEl.textContent = String(state.score);
  timeEl.textContent = String(Math.max(0, Math.ceil(state.timeLeft)));
  bestEl.textContent = String(state.best);
}

function endGame() {
  state.running = false;
  clearInterval(state.timerId);
  statusEl.textContent = `タイムアップ！ 最終スコア: ${state.score} 点`;
  renderBoard();
  updateHud();
}

function startGame() {
  state.score = 0;
  state.timeLeft = GAME_TIME;
  state.board = createBoard();

  while (!hasAnyMatch(state.board)) {
    state.board = createBoard();
  }

  state.running = true;
  statusEl.textContent = '同じ数字を3個以上つなげて消そう！';

  clearInterval(state.timerId);
  state.timerId = setInterval(() => {
    if (!state.running) return;

    state.timeLeft -= 1;
    updateHud();

    if (state.timeLeft <= 0) {
      endGame();
    }
  }, 1000);

  renderBoard();
  updateHud();
}

startBtn.addEventListener('click', startGame);

state.best = Number(localStorage.getItem('numberChainBest') || 0);
state.board = createBoard();
while (!hasAnyMatch(state.board)) {
  state.board = createBoard();
}
renderBoard();
updateHud();
