/**
 * Game 1: Number Playground — number line position quiz
 *
 * Levels:
 *   1: 0~9, step 1, 3 choices
 *   2: 0~50, step 5, 4 choices
 *   3: 0~100, step 10, 4 choices
 *   4: 100~1000, step 100, 4 choices
 */
import { GameEngine } from '../engine/game-engine.js';
import { rewardEngine } from '../engine/reward-engine.js';
import { soundManager } from '../engine/sound-manager.js';

export class NumberLineGame {
  constructor(level, conceptId) {
    this.level = level;
    this.conceptId = conceptId;
    this.container = null;
    this.engine = null;
    this.currentQ = null;
    this.recentQuestions = [];
    this.config = this._getLevelConfig();
  }

  _getLevelConfig() {
    switch (this.level) {
      case 1: return { min: 0, max: 9, step: 1, numChoices: 3, totalQ: 8 };
      case 2: return { min: 0, max: 50, step: 5, numChoices: 4, totalQ: 8 };
      case 3: return { min: 0, max: 100, step: 10, numChoices: 4, totalQ: 8 };
      case 4: return { min: 100, max: 1000, step: 100, numChoices: 4, totalQ: 8 };
      default: return { min: 0, max: 9, step: 1, numChoices: 3, totalQ: 8 };
    }
  }

  async render(container) {
    this.container = container;
    this.engine = new GameEngine(this, {
      conceptId: this.conceptId,
      level: this.level,
      totalQuestions: this.config.totalQ
    });

  _showResult(summary) {
    GameEngine.renderResult(this.container, summary, {
      icon: summary.accuracy >= 80 ? '📍' : '📍',
      title: summary.accuracy >= 80 ? '수 직선 마스터!' : '수 직선 연습 잘했어!',
      retryHash: `/game/number-line/${this.level}?concept=${this.conceptId}`,
      conceptId: this.conceptId,
      gameType: 'number-line',
      level: this.level
    });
  }
    container.innerHTML = `
      <div class="game-screen">
        <div class="game-topbar">
          <button class="game-topbar__back" id="game-back">←</button>
          <div class="game-topbar__question" id="question-text">수 놀이터</div>
          <div class="game-topbar__coins" id="coin-display">💰 <span id="coin-count">0</span></div>
        </div>
        <div class="game-progress">
          <div class="game-progress__bar">
            <div class="game-progress__fill" id="progress-fill" style="width: 0%"></div>
          </div>
          <div class="game-progress__text" id="progress-text">0 / ${this.config.totalQ}</div>
        </div>
        <div class="game-area" id="game-area"></div>
      </div>
    `;

    container.querySelector('#game-back').addEventListener('click', () => {
      window.location.hash = '/learn';
    });

    const balance = await rewardEngine.getBalance();
    container.querySelector('#coin-count').textContent = balance;

    await this.engine.start();
  }

  generateQuestion() {
    const { min, max, step, numChoices } = this.config;

    // Generate the target number
    let target;
    for (let attempt = 0; attempt < 50; attempt++) {
      // Pick a position along the number line (not at endpoints)
      const numSteps = (max - min) / step;
      const stepIdx = Math.floor(Math.random() * (numSteps - 1)) + 1; // Avoid 0 and max
      target = min + stepIdx * step;

      if (!this.recentQuestions.includes(target)) {
        this.recentQuestions.push(target);
        if (this.recentQuestions.length > 5) this.recentQuestions.shift();
        break;
      }
    }

    // Generate anchor points (known positions on number line)
    const anchors = new Set();
    anchors.add(min);
    anchors.add(max);
    // Add some middle anchors
    const midStep = Math.max(step, Math.floor((max - min) / 5));
    for (let v = min; v <= max; v += midStep) {
      anchors.add(v);
    }
    anchors.delete(target); // Target is the question

    // Generate wrong choices
    const wrongs = new Set();
    wrongs.add(target + step);
    wrongs.add(target - step);
    wrongs.add(target + step * 2);
    wrongs.add(target - step * 2);
    // Adjacent values
    if (step > 1) {
      wrongs.add(target + 1);
      wrongs.add(target - 1);
    }
    wrongs.delete(target);

    const validWrongs = [...wrongs].filter(w => w >= min && w <= max && w !== target);
    const shuffledWrongs = validWrongs.sort(() => Math.random() - 0.5);
    const choices = [target, ...shuffledWrongs.slice(0, numChoices - 1)].sort(() => Math.random() - 0.5);

    this.currentQ = { target, anchors: [...anchors].sort((a, b) => a - b), choices, answer: target };
    this._renderQuestion();

    return this.currentQ;
  }

  _renderQuestion() {
    const { target, anchors, choices } = this.currentQ;
    const { min, max } = this.config;
    const area = this.container.querySelector('#game-area');
    const questionText = this.container.querySelector('#question-text');

    questionText.textContent = '이 자리에 어떤 수가 올까?';

    // Calculate positions
    const lineWidth = Math.min(600, window.innerWidth - 60);
    const range = max - min;

    area.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-lg); width: 100%;">
        <!-- Number Line -->
        <div class="number-line-area" style="width: 100%; overflow-x: auto;">
          <div style="position: relative; width: ${lineWidth}px; height: 100px; margin: 0 auto; padding: 0 20px;">
            <!-- Track -->
            <div style="position: absolute; top: 40px; left: 20px; right: 20px; height: 4px; background: var(--text-light); border-radius: 2px;"></div>

            <!-- Ticks and labels -->
            ${anchors.map(v => {
              const pct = ((v - min) / range) * 100;
              return `
                <div style="position: absolute; left: calc(20px + ${pct}% * (${lineWidth - 40}px / ${lineWidth}px * 100) / 100); top: 28px; transform: translateX(-50%);">
                  <div style="width: 3px; height: 28px; background: var(--text-secondary); margin: 0 auto;"></div>
                  <div style="text-align: center; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-top: 4px;">${v}</div>
                </div>
              `;
            }).join('')}

            <!-- Target position (?) -->
            <div style="position: absolute; left: calc(20px + ${((target - min) / range) * 100}% * (${lineWidth - 40}px / ${lineWidth}px * 100) / 100); top: 8px; transform: translateX(-50%);">
              <div style="font-size: 1.5rem; font-weight: 800; color: var(--color-secondary); text-align: center; animation: targetBounce 1s ease infinite;">?</div>
              <div style="width: 3px; height: 28px; background: var(--color-secondary); margin: 4px auto 0;"></div>
            </div>
          </div>
        </div>

        <div id="feedback-msg" class="encouragement" style="min-height: 2em;"></div>

        <!-- Choices -->
        <div class="choices" id="choices-area">
          ${choices.map(c => `
            <button class="choice-btn" data-answer="${c}" style="min-width: 80px; font-size: 1.5rem;">${c}</button>
          `).join('')}
        </div>

        <div id="hint-container"></div>
      </div>
    `;

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
      choices.forEach(btn => {
        if (parseInt(btn.dataset.answer) === this.currentQ.answer) btn.classList.add('correct');
        btn.disabled = true;
      });
      msg.textContent = reward.message;
      msg.style.color = 'var(--color-primary-dark)';

      if (reward.coins > 0) this._showCoinAnimation(reward.coins);

      const balance = await rewardEngine.getBalance();
      this.container.querySelector('#coin-count').textContent = balance;
    } else {
      msg.textContent = reward.message;
      msg.style.color = 'var(--color-error)';
      setTimeout(() => { msg.textContent = ''; }, 800);
    }
  }

  async showHint(question, answer) {
    const choices = this.container.querySelectorAll('.choice-btn');
    choices.forEach(btn => {
      btn.disabled = true;
      if (parseInt(btn.dataset.answer) === answer) btn.classList.add('correct');
    });

    const hintContainer = this.container.querySelector('#hint-container');
    hintContainer.innerHTML = `
      <div class="hint-area">
        <div style="font-size: 1.3rem; font-weight: 700; margin-bottom: 8px;">정답: ${answer}</div>
        <div style="color: var(--text-secondary);">이 자리에 ${answer}이(가) 와야 해요!<br>다음에 꼭 맞출 수 있어!</div>
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

  _showResult(summary) {
    this.container.innerHTML = `
      <div class="game-result">
        <div class="game-result__icon">${summary.accuracy >= 80 ? '🌟' : summary.accuracy >= 50 ? '👏' : '💪'}</div>
        <div class="game-result__title">
          ${summary.accuracy >= 80 ? '수 놀이터 짱!' : summary.accuracy >= 50 ? '잘하고 있어!' : '다음엔 더 잘할 수 있어!'}
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
      window.location.hash = `/game/number-line/${this.level}?concept=${this.conceptId}`;
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
