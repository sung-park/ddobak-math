/**
 * Game 5: Coin Collector — combine coins to reach a target amount
 *
 * Levels:
 *   1: 10원만, 100원 이하
 *   2: 10원+50원, 200원 이하
 *   3: 10원+50원+100원, 500원 이하
 *   4: 전체 동전, 1000원 이하
 */
import { GameEngine } from '../engine/game-engine.js';
import { rewardEngine } from '../engine/reward-engine.js';
import { soundManager } from '../engine/sound-manager.js';

const COIN_TYPES = {
  1: [{ value: 10, label: '10원', color: '#CD7F32' }],
  2: [{ value: 10, label: '10원', color: '#CD7F32' }, { value: 50, label: '50원', color: '#C0C0C0' }],
  3: [{ value: 10, label: '10원', color: '#CD7F32' }, { value: 50, label: '50원', color: '#C0C0C0' }, { value: 100, label: '100원', color: '#FFD700' }],
  4: [{ value: 10, label: '10원', color: '#CD7F32' }, { value: 50, label: '50원', color: '#C0C0C0' }, { value: 100, label: '100원', color: '#FFD700' }, { value: 500, label: '500원', color: '#DAA520' }]
};

const LIMITS = { 1: 100, 2: 200, 3: 500, 4: 1000 };

export class CoinsGame {
  constructor(level, conceptId) {
    this.level = level;
    this.conceptId = conceptId;
    this.container = null;
    this.engine = null;
    this.currentQ = null;
    this.currentSum = 0;
    this.addedCoins = [];
  }

  async render(container) {
    this.container = container;
    this.engine = new GameEngine(this, {
      conceptId: this.conceptId,
      level: this.level,
      totalQuestions: 6
    });
  _showResult(summary) {
    GameEngine.renderResult(this.container, summary, {
      icon: summary.accuracy >= 80 ? '💰' : '🪙',
      title: summary.accuracy >= 80 ? '동전 수집왕!' : '동전 모으기 잘했어!',
      retryHash: `/game/coins/${this.level}?concept=${this.conceptId}`,
      conceptId: this.conceptId,
      gameType: 'coins',
      level: this.level
    });
  }
    container.innerHTML = `
      <div class="game-screen">
        <div class="game-topbar">
          <button class="game-topbar__back" id="game-back">←</button>
          <div class="game-topbar__question" id="question-text">동전 모으기</div>
          <div class="game-topbar__coins">💰 <span id="coin-count">0</span></div>
        </div>
        <div class="game-progress">
          <div class="game-progress__bar"><div class="game-progress__fill" id="progress-fill" style="width:0%"></div></div>
          <div class="game-progress__text" id="progress-text"></div>
        </div>
        <div class="game-area" id="game-area"></div>
      </div>
    `;
    container.querySelector('#game-back').addEventListener('click', () => { window.location.hash = '/learn'; });
    const bal = await rewardEngine.getBalance();
    container.querySelector('#coin-count').textContent = bal;
    await this.engine.start();
  }

  generateQuestion() {
    const coins = COIN_TYPES[this.level] || COIN_TYPES[1];
    const maxVal = LIMITS[this.level] || 100;
    const minCoin = coins[0].value;

    // Generate target as multiple of smallest coin
    let target;
    for (let i = 0; i < 50; i++) {
      target = randInt(Math.ceil(30 / minCoin), Math.floor(maxVal / minCoin)) * minCoin;
      // Make sure it's achievable with available coins and interesting
      if (target >= minCoin * 3) break;
    }

    this.currentSum = 0;
    this.addedCoins = [];
    this.currentQ = { target, answer: target, coins };
    this._renderQuestion();
    return this.currentQ;
  }

  _renderQuestion() {
    const { target, coins } = this.currentQ;
    const area = this.container.querySelector('#game-area');
    const pct = Math.min(100, Math.round((this.currentSum / target) * 100));

    area.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-md); width: 100%; max-width: 380px; margin: 0 auto;">
        <div style="font-size: 1.2rem; font-weight: 700; text-align: center;">
          ${target}원을 만들어 보세요!
        </div>

        <!-- Wallet area -->
        <div style="width: 100%; background: var(--bg-card); border-radius: var(--radius-lg); padding: var(--space-lg); box-shadow: var(--shadow-md); text-align: center;">
          <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 4px;">지갑</div>
          <div style="font-size: 2rem; font-weight: 800; margin-bottom: var(--space-sm);" id="current-sum">
            ${this.currentSum}원
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; min-height: 40px; margin-bottom: var(--space-sm);" id="wallet-coins">
            ${this.addedCoins.map(c => `<div style="width:32px;height:32px;border-radius:50%;background:${c.color};display:flex;align-items:center;justify-content:center;font-size:0.55rem;font-weight:700;color:#fff;box-shadow:0 2px 0 rgba(0,0,0,0.2);">${c.value}</div>`).join('')}
          </div>
          <!-- Progress bar -->
          <div class="progress-bar" style="height: 16px;">
            <div class="progress-bar__fill" style="width: ${pct}%; background: ${pct >= 100 ? 'var(--color-success)' : 'var(--color-primary)'}; transition: width 0.3s;"></div>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">${this.currentSum} / ${target}</div>
        </div>

        <div id="feedback-msg" class="encouragement" style="min-height: 1.5em;"></div>

        <!-- Coin tray -->
        <div style="display: flex; gap: var(--space-md); justify-content: center; flex-wrap: wrap;" id="coin-tray">
          ${coins.map(c => `
            <button class="btn btn-outline coin-tap-btn" data-value="${c.value}" style="display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 16px; min-width: 72px;">
              <div style="width:44px;height:44px;border-radius:50%;background:${c.color};display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:800;color:#fff;box-shadow:0 3px 0 rgba(0,0,0,0.2);">${c.value}</div>
              <span style="font-size: 0.85rem; font-weight: 600;">${c.label}</span>
            </button>
          `).join('')}
        </div>

        <button class="btn btn-ghost" id="coin-reset" style="color: var(--text-secondary);">↩ 다시 넣기</button>
        <div id="hint-container"></div>
      </div>
    `;

    // Coin tap
    area.querySelectorAll('.coin-tap-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const value = parseInt(btn.dataset.value);
        if (this.currentSum + value <= this.currentQ.target + 500) {
          soundManager.play('coin');
          this.currentSum += value;
          const coinType = this.currentQ.coins.find(c => c.value === value);
          this.addedCoins.push(coinType);
          this._renderQuestion();

          if (this.currentSum === this.currentQ.target) {
            soundManager.play('correct');
            this.engine.submitAnswer(this.currentSum);
          } else if (this.currentSum > this.currentQ.target) {
            soundManager.play('wrong');
            const msg = this.container.querySelector('#feedback-msg');
            msg.textContent = '너무 많아! 다시 해 볼까?';
            msg.style.color = 'var(--color-error)';
            setTimeout(() => {
              this.currentSum = 0;
              this.addedCoins = [];
              this._renderQuestion();
            }, 1000);
          }
        }
      });
    });

    // Reset
    area.querySelector('#coin-reset').addEventListener('click', () => {
      this.currentSum = 0;
      this.addedCoins = [];
      this._renderQuestion();
    });
  }

  checkAnswer(userAnswer) {
    return { isCorrect: userAnswer === this.currentQ.target };
  }

  async showFeedback(isCorrect, reward) {
    const msg = this.container.querySelector('#feedback-msg');
    if (isCorrect) {
      // Disable coin tray
      this.container.querySelectorAll('.coin-tap-btn').forEach(b => b.disabled = true);
      msg.textContent = reward.message;
      msg.style.color = 'var(--color-primary-dark)';
      if (reward.coins > 0) this._coinFly(reward.coins);
      const bal = await rewardEngine.getBalance();
      this.container.querySelector('#coin-count').textContent = bal;
    } else {
      msg.textContent = reward.message;
      msg.style.color = 'var(--color-error)';
    }
  }

  async showHint(question, answer) {
    const hint = this.container.querySelector('#hint-container');
    this.container.querySelectorAll('.coin-tap-btn').forEach(b => b.disabled = true);
    // Show one possible combination
    const coins = question.coins.slice().reverse(); // Start with biggest
    let remain = question.target;
    const combo = [];
    for (const c of coins) {
      while (remain >= c.value) {
        combo.push(c.label);
        remain -= c.value;
      }
    }
    hint.innerHTML = `<div class="hint-area">${question.target}원 = ${combo.join(' + ')}<br>이렇게 만들 수 있어!</div>`;
  }

  updateProgress(current, total) {
    const fill = this.container.querySelector('#progress-fill');
    const text = this.container.querySelector('#progress-text');
    if (fill) fill.style.width = `${(current / total) * 100}%`;
    if (text) text.textContent = `${current} / ${total}`;
  }

  _coinFly(n) {
    for (let i = 0; i < Math.min(n, 3); i++) {
      setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'coin-fly'; el.textContent = '💰';
        el.style.left = `${50 + (Math.random() * 20 - 10)}%`; el.style.top = '50%';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 800);
      }, i * 100);
    }
  }

  _showResult(summary) {
    this.container.innerHTML = `
      <div class="game-result">
        <div class="game-result__icon">${summary.accuracy >= 80 ? '💰' : '🪙'}</div>
        <div class="game-result__title">${summary.accuracy >= 80 ? '동전 수집왕!' : '동전 모으기 잘했어!'}</div>
        <div class="game-result__stats">
          <div class="result-stat"><div class="result-stat__value">${summary.correctCount}/${summary.totalQuestions}</div><div class="result-stat__label">정답</div></div>
          <div class="result-stat"><div class="result-stat__value">${summary.accuracy}%</div><div class="result-stat__label">정답률</div></div>
          <div class="result-stat"><div class="result-stat__value">${summary.totalTimeFormatted}</div><div class="result-stat__label">시간</div></div>
        </div>
        <div class="game-result__coins">💰 현재 잔액: ${summary.balance}원</div>
        <div class="game-result__actions">
          <button class="btn btn-primary btn-lg" id="result-retry">한 번 더!</button>
          <button class="btn btn-outline" id="result-home">홈으로</button>
        </div>
      </div>`;
    this.container.querySelector('#result-retry').addEventListener('click', () => {
      window.location.hash = `/game/coins/${this.level}?concept=${this.conceptId}`;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    this.container.querySelector('#result-home').addEventListener('click', () => { window.location.hash = '/'; });
  }

  destroy() { this.container = null; }
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
