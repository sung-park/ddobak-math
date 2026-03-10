/**
 * Game 2: Block Calculator — addition/subtraction with carry/borrow visualization
 *
 * Levels:
 *   1: single + single (no carry)
 *   2: single + single (with carry)
 *   3: two-digit ± two-digit
 *   4: three-digit ± three-digit
 */
import { GameEngine } from '../engine/game-engine.js';
import { rewardEngine } from '../engine/reward-engine.js';
import { soundManager } from '../engine/sound-manager.js';

export class BlockCalcGame {
  constructor(level, conceptId) {
    this.level = level;
    this.conceptId = conceptId;
    this.container = null;
    this.engine = null;
    this.currentQ = null;
    this.recentQuestions = [];
  }

  async render(container) {
    this.container = container;
    this.engine = new GameEngine(this, {
      conceptId: this.conceptId,
      level: this.level,
      totalQuestions: this.level <= 2 ? 8 : 6
    });

  _showResult(summary) {
    GameEngine.renderResult(this.container, summary, {
      icon: summary.accuracy >= 80 ? '🧮' : '🧮',
      title: summary.accuracy >= 80 ? '계산 천재!' : '계산 연습 잘했어!',
      retryHash: `/game/block-calc/${this.level}?concept=${this.conceptId}`,
      conceptId: this.conceptId,
      gameType: 'block-calc',
      level: this.level
    });
  }
    // Render game shell
    container.innerHTML = `
      <div class="game-screen">
        <div class="game-topbar">
          <button class="game-topbar__back" id="game-back">←</button>
          <div class="game-topbar__question" id="question-text">준비!</div>
          <div class="game-topbar__coins" id="coin-display">💰 <span id="coin-count">0</span></div>
        </div>
        <div class="game-progress">
          <div class="game-progress__bar">
            <div class="game-progress__fill" id="progress-fill" style="width: 0%"></div>
          </div>
          <div class="game-progress__text" id="progress-text">0 / 0</div>
        </div>
        <div class="game-area" id="game-area"></div>
      </div>
    `;

    container.querySelector('#game-back').addEventListener('click', () => {
      window.location.hash = '/learn';
    });

    // Start
    const balance = await rewardEngine.getBalance();
    container.querySelector('#coin-count').textContent = balance;
    await this.engine.start();
  }

  /** Generate a math question based on level */
  generateQuestion() {
    let a, b, op, answer;

    for (let attempt = 0; attempt < 50; attempt++) {
      if (this.level === 1) {
        // Single digit, no carry
        a = randInt(1, 9);
        b = randInt(1, 9 - a);
        op = '+';
        answer = a + b;
      } else if (this.level === 2) {
        // Single digit with carry, or simple subtraction
        if (Math.random() < 0.6) {
          a = randInt(2, 9);
          b = randInt(10 - a, 9);
          op = '+';
          answer = a + b;
        } else {
          a = randInt(11, 18);
          b = randInt(2, Math.min(9, a - 1));
          op = '-';
          answer = a - b;
        }
      } else if (this.level === 3) {
        // Two-digit ± two-digit
        if (Math.random() < 0.5) {
          a = randInt(12, 89);
          b = randInt(11, 99 - a);
          op = '+';
          answer = a + b;
        } else {
          a = randInt(21, 99);
          b = randInt(11, a - 1);
          op = '-';
          answer = a - b;
        }
      } else {
        // Three-digit ± three-digit
        if (Math.random() < 0.5) {
          a = randInt(100, 800);
          b = randInt(100, 999 - a);
          op = '+';
          answer = a + b;
        } else {
          a = randInt(200, 999);
          b = randInt(100, a - 1);
          op = '-';
          answer = a - b;
        }
      }

      // Avoid repeats
      const key = `${a}${op}${b}`;
      if (!this.recentQuestions.includes(key)) {
        this.recentQuestions.push(key);
        if (this.recentQuestions.length > 5) this.recentQuestions.shift();
        break;
      }
    }

    // Generate choices (wrong answers based on common mistakes)
    const choices = this._generateChoices(answer, op, a, b);

    this.currentQ = { a, b, op, answer, choices };

    // Render the question
    this._renderQuestion();

    return this.currentQ;
  }

  _generateChoices(answer, op, a, b) {
    const wrongs = new Set();

    // Common mistake: forget carry/borrow
    if (op === '+') {
      wrongs.add(answer - 10); // Forgot carry
      wrongs.add(answer + 10); // Extra carry
    } else {
      wrongs.add(answer + 10); // Forgot borrow
      wrongs.add(answer - 10); // Extra borrow
    }
    // ±1 errors
    wrongs.add(answer + 1);
    wrongs.add(answer - 1);
    // ±2
    wrongs.add(answer + 2);
    wrongs.add(answer - 2);

    // Remove invalid
    wrongs.delete(answer);
    const validWrongs = [...wrongs].filter(w => w >= 0 && w !== answer);

    // Pick 2 wrong answers
    const shuffled = validWrongs.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 2);

    // Build choices array
    const choices = [answer, ...selected];
    // Shuffle
    return choices.sort(() => Math.random() - 0.5);
  }

  _renderQuestion() {
    const { a, b, op, choices } = this.currentQ;
    const area = this.container.querySelector('#game-area');
    const questionText = this.container.querySelector('#question-text');
    questionText.textContent = `${a} ${op} ${b} = ?`;

    // Build block visualization
    const aDigits = this._getDigits(a);
    const bDigits = this._getDigits(b);

    area.innerHTML = `
      <div class="block-area">
        <!-- Visual representation -->
        <div style="display: flex; gap: var(--space-xl); justify-content: center; margin-bottom: var(--space-md);">
          ${this._renderBlockColumns(aDigits, 'A')}
        </div>
        <div class="operator">${op}</div>
        <div style="display: flex; gap: var(--space-xl); justify-content: center; margin-bottom: var(--space-md);">
          ${this._renderBlockColumns(bDigits, 'B')}
        </div>
        <div class="divider-line"></div>

        <div id="feedback-msg" class="encouragement" style="min-height: 2em;"></div>

        <!-- Answer choices -->
        <div class="choices" id="choices-area">
          ${choices.map(c => `
            <button class="choice-btn" data-answer="${c}">${c}</button>
          `).join('')}
        </div>

        <div id="hint-container"></div>
      </div>
    `;

    // Bind choice events
    area.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.engine.submitAnswer(parseInt(btn.dataset.answer));
      });
    });
  }

  _getDigits(num) {
    const digits = [];
    if (num >= 100) digits.push(Math.floor(num / 100));
    if (num >= 10) digits.push(Math.floor((num % 100) / 10));
    digits.push(num % 10);
    // Pad to at least match level
    while (digits.length < (this.level >= 4 ? 3 : this.level >= 3 ? 2 : 1)) {
      digits.unshift(0);
    }
    return digits;
  }

  _renderBlockColumns(digits, prefix) {
    const labels = ['백의 자리', '십의 자리', '일의 자리'];
    const classes = ['hundreds', 'tens', 'ones'];
    const blockClasses = ['hundred', 'ten', 'one'];
    const offset = 3 - digits.length;

    return digits.map((count, i) => {
      const idx = offset + i;
      return `
        <div class="block-column">
          <div class="block-column__label">${labels[idx]}</div>
          <div class="block-container block-container--${classes[idx]}">
            ${Array(count).fill(0).map(() =>
              `<div class="block block--${blockClasses[idx]} appearing"></div>`
            ).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  checkAnswer(userAnswer) {
    return { isCorrect: userAnswer === this.currentQ.answer };
  }

  async showFeedback(isCorrect, reward) {
    const msg = this.container.querySelector('#feedback-msg');
    const choices = this.container.querySelectorAll('.choice-btn');

    if (isCorrect) {
      // Highlight correct button
      choices.forEach(btn => {
        if (parseInt(btn.dataset.answer) === this.currentQ.answer) {
          btn.classList.add('correct');
        }
        btn.disabled = true;
      });
      msg.textContent = reward.message;
      msg.style.color = 'var(--color-primary-dark)';

      // Show coin animation
      if (reward.coins > 0) {
        this._showCoinAnimation(reward.coins);
      }

      // Combo banner
      if (reward.isCombo) {
        this._showComboBanner(reward.message);
      }

      // Update coin display
      const balance = await rewardEngine.getBalance();
      this.container.querySelector('#coin-count').textContent = balance;
    } else {
      // Highlight wrong
      choices.forEach(btn => {
        if (parseInt(btn.dataset.answer) === this.currentQ.answer) return;
        if (btn.classList.contains('correct')) return;
      });
      msg.textContent = reward.message;
      msg.style.color = 'var(--color-error)';

      // Re-enable for retry
      setTimeout(() => {
        msg.textContent = '';
        choices.forEach(btn => btn.classList.remove('wrong'));
      }, 800);
    }
  }

  async showHint(question, answer) {
    const { a, b, op } = question;
    const hintContainer = this.container.querySelector('#hint-container');
    const choices = this.container.querySelectorAll('.choice-btn');

    // Disable all choices and highlight correct
    choices.forEach(btn => {
      btn.disabled = true;
      if (parseInt(btn.dataset.answer) === answer) {
        btn.classList.add('correct');
      }
    });

    // Build hint explanation
    let explanation = '';
    if (this.level <= 2) {
      explanation = `${a} ${op} ${b} = ${answer}`;
    } else if (op === '+') {
      const onesA = a % 10, tensA = Math.floor(a / 10) % 10;
      const onesB = b % 10, tensB = Math.floor(b / 10) % 10;
      const onesSum = onesA + onesB;
      const carry = onesSum >= 10 ? 1 : 0;
      explanation = `일의 자리: ${onesA}+${onesB}=${onesSum}${carry ? ' (10이 넘으니까 올림!)' : ''}<br>`;
      explanation += `십의 자리: ${tensA}+${tensB}${carry ? '+1' : ''}=${tensA + tensB + carry}<br>`;
      explanation += `정답: ${answer}`;
    } else {
      explanation = `${a} ${op} ${b} = ${answer}`;
    }

    hintContainer.innerHTML = `
      <div class="hint-area">
        <div style="margin-bottom: 8px;">어려웠지? 정답을 알려줄게!</div>
        <div style="font-size: 1.2rem; font-weight: 700;">${explanation}</div>
        <div style="margin-top: 8px; color: var(--text-secondary);">다음에 또 나오면 맞출 수 있어!</div>
      </div>
    `;
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

  _showComboBanner(message) {
    const banner = document.createElement('div');
    banner.className = 'combo-banner';
    banner.textContent = message;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 1200);
  }

  _showResult(summary) {
    this.container.innerHTML = `
      <div class="game-result">
        <div class="game-result__icon">${summary.accuracy >= 80 ? '🌟' : summary.accuracy >= 50 ? '👏' : '💪'}</div>
        <div class="game-result__title">
          ${summary.accuracy >= 80 ? '정말 잘했어!' : summary.accuracy >= 50 ? '좋아, 잘하고 있어!' : '괜찮아, 연습하면 돼!'}
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
      window.location.hash = `/game/block-calc/${this.level}?concept=${this.conceptId}`;
      // Force re-render
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

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
