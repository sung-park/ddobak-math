/**
 * Game 3: Multiplication Matrix — multiplication table with pattern visualization
 *
 * Levels:
 *   1: 2,5 row/col only (small area)
 *   2: 2~5 rows
 *   3: 6~9 rows
 *   4: full 9×9
 */
import { GameEngine } from '../engine/game-engine.js';
import { rewardEngine } from '../engine/reward-engine.js';
import { soundManager } from '../engine/sound-manager.js';

export class MatrixGame {
  constructor(level, conceptId) {
    this.level = level;
    this.conceptId = conceptId;
    this.container = null;
    this.engine = null;
    this.currentQ = null;
    this.grid = {}; // { "r-c": { value, filled, isTarget } }
    this.blanks = [];
    this.currentBlankIdx = 0;
    this.rows = [];
    this.cols = [];
  }

  async render(container) {
    this.container = container;
    this._setupGrid();

    this.engine = new GameEngine(this, {
      conceptId: this.conceptId,
      level: this.level,
      totalQuestions: this.blanks.length
    });

  _showResult(summary) {
    GameEngine.renderResult(this.container, summary, {
      icon: summary.accuracy >= 80 ? '✖️' : '✖️',
      title: summary.accuracy >= 80 ? '구구단 마스터!' : '구구단 연습 잘했어!',
      retryHash: `/game/matrix/${this.level}?concept=${this.conceptId}`,
      conceptId: this.conceptId,
      gameType: 'matrix',
      level: this.level
    });
  }
    container.innerHTML = `
      <div class="game-screen">
        <div class="game-topbar">
          <button class="game-topbar__back" id="game-back">←</button>
          <div class="game-topbar__question" id="question-text">구구단 매트릭스</div>
          <div class="game-topbar__coins" id="coin-display">💰 <span id="coin-count">0</span></div>
        </div>
        <div class="game-progress">
          <div class="game-progress__bar">
            <div class="game-progress__fill" id="progress-fill" style="width: 0%"></div>
          </div>
          <div class="game-progress__text" id="progress-text">0 / ${this.blanks.length}</div>
        </div>
        <div class="game-area" id="game-area" style="padding: var(--space-md); overflow: auto;"></div>
      </div>
    `;

    container.querySelector('#game-back').addEventListener('click', () => {
      window.location.hash = '/learn';
    });

    const balance = await rewardEngine.getBalance();
    container.querySelector('#coin-count').textContent = balance;

    await this.engine.start();
  }

  _setupGrid() {
    // Determine rows and cols based on level
    if (this.level === 1) {
      this.rows = [2, 5];
      this.cols = [2, 5];
    } else if (this.level === 2) {
      this.rows = [2, 3, 4, 5];
      this.cols = [2, 3, 4, 5];
    } else if (this.level === 3) {
      this.rows = [6, 7, 8, 9];
      this.cols = [6, 7, 8, 9];
    } else {
      this.rows = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      this.cols = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    }

    // Fill grid
    this.grid = {};
    for (const r of this.rows) {
      for (const c of this.cols) {
        this.grid[`${r}-${c}`] = {
          row: r, col: c,
          value: r * c,
          filled: true,
          isTarget: false
        };
      }
    }

    // Select blanks (cells to quiz)
    const numBlanks = this.level <= 2 ? 6 : this.level === 3 ? 8 : 10;
    const allKeys = Object.keys(this.grid);
    const shuffled = allKeys.sort(() => Math.random() - 0.5);
    this.blanks = shuffled.slice(0, numBlanks);

    for (const key of this.blanks) {
      this.grid[key].filled = false;
    }
  }

  generateQuestion() {
    if (this.currentBlankIdx >= this.blanks.length) {
      return null;
    }

    const key = this.blanks[this.currentBlankIdx];
    const cell = this.grid[key];

    // Mark as target
    Object.values(this.grid).forEach(c => c.isTarget = false);
    cell.isTarget = true;

    // Generate choices
    const answer = cell.value;
    const choices = this._generateChoices(answer, cell.row, cell.col);

    this.currentQ = { key, row: cell.row, col: cell.col, answer, choices };
    this.currentBlankIdx++;

    this._renderGrid();

    return this.currentQ;
  }

  _generateChoices(answer, row, col) {
    const wrongs = new Set();
    // Adjacent products
    if (row > 1) wrongs.add((row - 1) * col);
    if (row < 9) wrongs.add((row + 1) * col);
    if (col > 1) wrongs.add(row * (col - 1));
    if (col < 9) wrongs.add(row * (col + 1));
    // ±1 errors
    wrongs.add(answer + row);
    wrongs.add(answer - row);
    wrongs.add(answer + col);
    wrongs.add(answer - col);

    wrongs.delete(answer);
    const validWrongs = [...wrongs].filter(w => w > 0 && w !== answer);
    const shuffled = validWrongs.sort(() => Math.random() - 0.5);

    const choices = [answer, ...shuffled.slice(0, 3)];
    return choices.sort(() => Math.random() - 0.5);
  }

  _renderGrid() {
    const area = this.container.querySelector('#game-area');
    const { row, col } = this.currentQ;

    const gridCols = this.cols.length + 1; // +1 for header

    let html = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-md); width: 100%;">
        <div class="matrix-grid" style="grid-template-columns: repeat(${gridCols}, 44px);">
          <!-- Top-left corner -->
          <div class="matrix-cell matrix-cell--header" style="font-size: 1.2rem;">×</div>
          <!-- Column headers -->
          ${this.cols.map(c => `<div class="matrix-cell matrix-cell--header">${c}</div>`).join('')}
          <!-- Rows -->
          ${this.rows.map(r => {
            let rowHtml = `<div class="matrix-cell matrix-cell--header">${r}</div>`;
            rowHtml += this.cols.map(c => {
              const key = `${r}-${c}`;
              const cell = this.grid[key];
              if (cell.isTarget) {
                return `<div class="matrix-cell matrix-cell--target">?</div>`;
              } else if (cell.filled) {
                // Check if it's the symmetric cell
                const isSymmetric = (r === col && c === row && r !== c);
                return `<div class="matrix-cell matrix-cell--filled ${isSymmetric ? 'matrix-cell--symmetric' : ''}">${cell.value}</div>`;
              } else {
                return `<div class="matrix-cell matrix-cell--empty">?</div>`;
              }
            }).join('');
            return rowHtml;
          }).join('')}
        </div>

        <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">
          ${row} × ${col} = ?
        </div>

        <div id="feedback-msg" class="encouragement" style="min-height: 2em;"></div>

        <div class="choices" id="choices-area">
          ${this.currentQ.choices.map(c => `
            <button class="choice-btn" data-answer="${c}">${c}</button>
          `).join('')}
        </div>
      </div>
    `;

    area.innerHTML = html;

    // Bind choices
    area.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.engine.submitAnswer(parseInt(btn.dataset.answer));
      });
    });
  }

  checkAnswer(userAnswer) {
    return { isCorrect: userAnswer === this.currentQ.answer };
  }

  async showFeedback(isCorrect, reward) {
    const msg = this.container.querySelector('#feedback-msg');
    const choices = this.container.querySelectorAll('.choice-btn');

    if (isCorrect) {
      // Fill the cell
      const key = this.currentQ.key;
      this.grid[key].filled = true;

      choices.forEach(btn => {
        if (parseInt(btn.dataset.answer) === this.currentQ.answer) {
          btn.classList.add('correct');
        }
        btn.disabled = true;
      });

      msg.textContent = reward.message;
      msg.style.color = 'var(--color-primary-dark)';

      // Symmetric fill (exchange law)
      const { row, col } = this.currentQ;
      if (row !== col) {
        const symKey = `${col}-${row}`;
        if (this.grid[symKey] && !this.grid[symKey].filled) {
          this.grid[symKey].filled = true;
          // Remove from blanks if present
          const blankIdx = this.blanks.indexOf(symKey);
          if (blankIdx !== -1 && blankIdx >= this.currentBlankIdx) {
            this.blanks.splice(blankIdx, 1);
            this.engine.totalQuestions--;
          }
        }
      }

      soundManager.play('correct');

      if (reward.coins > 0) {
        this._showCoinAnimation(reward.coins);
      }

      const balance = await rewardEngine.getBalance();
      this.container.querySelector('#coin-count').textContent = balance;
    } else {
      msg.textContent = reward.message;
      msg.style.color = 'var(--color-error)';
      setTimeout(() => { msg.textContent = ''; }, 800);
    }
  }

  async showHint(question, answer) {
    const { row, col } = question;
    const choices = this.container.querySelectorAll('.choice-btn');
    choices.forEach(btn => {
      btn.disabled = true;
      if (parseInt(btn.dataset.answer) === answer) btn.classList.add('correct');
    });

    const msg = this.container.querySelector('#feedback-msg');
    msg.innerHTML = `${row} × ${col} = ${answer}<br><span style="font-size: 0.9rem; color: var(--text-secondary);">다음에 맞춰 보자!</span>`;

    // Still fill the cell so grid progresses
    this.grid[question.key].filled = true;
  }

  updateProgress(current, total) {
    const fill = this.container.querySelector('#progress-fill');
    const text = this.container.querySelector('#progress-text');
    if (fill) fill.style.width = `${(current / total) * 100}%`;
    if (text) text.textContent = `${current} / ${total}`;
  }

  _showCoinAnimation(amount) {
    for (let i = 0; i < Math.min(amount, 5); i++) {
      setTimeout(() => {
        const coin = document.createElement('div');
        coin.className = 'coin-fly';
        coin.textContent = '💰';
        coin.style.left = `${50 + (Math.random() * 20 - 10)}%`;
        coin.style.top = '60%';
        document.body.appendChild(coin);
        setTimeout(() => coin.remove(), 800);
      }, i * 100);
    }
  }

  _showResult(summary) {
    this.container.innerHTML = `
      <div class="game-result">
        <div class="game-result__icon">${summary.accuracy >= 80 ? '🌟' : summary.accuracy >= 50 ? '👏' : '💪'}</div>
        <div class="game-result__title">
          ${summary.accuracy >= 80 ? '구구단 마스터!' : summary.accuracy >= 50 ? '잘하고 있어!' : '조금만 더 연습하자!'}
        </div>
        <div class="game-result__stats">
          <div class="result-stat">
            <div class="result-stat__value">${summary.correctCount}/${summary.totalQuestions}</div>
            <div class="result-stat__label">정답</div>
          </div>
          <div class="result-stat">
            <div class="result-stat__value">${summary.accuracy}%</div>
            <div class="result-stat__label">정답률</div>
          </div>
          <div class="result-stat">
            <div class="result-stat__value">${summary.totalTimeFormatted}</div>
            <div class="result-stat__label">걸린 시간</div>
          </div>
        </div>
        <div class="game-result__coins">💰 현재 잔액: ${summary.balance}원</div>
        <div class="game-result__actions">
          <button class="btn btn-primary btn-lg" id="result-retry">한 번 더!</button>
          <button class="btn btn-outline" id="result-home">홈으로</button>
        </div>
      </div>
    `;

    this.container.querySelector('#result-retry').addEventListener('click', () => {
      window.location.hash = `/game/matrix/${this.level}?concept=${this.conceptId}`;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    this.container.querySelector('#result-home').addEventListener('click', () => {
      window.location.hash = '/';
    });
  }

  destroy() {
    this.container = null;
  }
}
