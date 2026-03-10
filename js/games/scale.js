/**
 * Game 7: Scale — compare sizes with a balance scale
 *
 * Levels:
 *   1: 한 자리 수 비교
 *   2: 두 자리 수 비교
 *   3: 세 자리 수 비교
 *   4: 분수 크기 비교
 */
import { GameEngine } from '../engine/game-engine.js';
import { rewardEngine } from '../engine/reward-engine.js';
import { soundManager } from '../engine/sound-manager.js';

export class ScaleGame {
  constructor(level, conceptId) {
    this.level = level;
    this.conceptId = conceptId;
    this.container = null;
    this.engine = null;
    this.currentQ = null;
  }

  async render(container) {
    this.container = container;
    this.engine = new GameEngine(this, {
      conceptId: this.conceptId,
      level: this.level,
      totalQuestions: 8
    });
    this.engine.onComplete((summary) => this._showResult(summary));

    container.innerHTML = `
      <div class="game-screen">
        <div class="game-topbar">
          <button class="game-topbar__back" id="game-back">←</button>
          <div class="game-topbar__question" id="question-text">크기 비교 저울</div>
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
    let left, right, leftDisplay, rightDisplay, answer;

    if (this.level === 1) {
      left = randInt(1, 9);
      right = randInt(1, 9);
      leftDisplay = `${left}`;
      rightDisplay = `${right}`;
    } else if (this.level === 2) {
      left = randInt(10, 99);
      right = randInt(10, 99);
      leftDisplay = `${left}`;
      rightDisplay = `${right}`;
    } else if (this.level === 3) {
      left = randInt(100, 999);
      right = randInt(100, 999);
      leftDisplay = `${left}`;
      rightDisplay = `${right}`;
    } else {
      // Fraction comparison (same denominator or same numerator)
      if (Math.random() < 0.5) {
        // Same denominator
        const den = randInt(2, 8);
        const num1 = randInt(1, den);
        const num2 = randInt(1, den);
        left = num1 / den;
        right = num2 / den;
        leftDisplay = `${num1}/${den}`;
        rightDisplay = `${num2}/${den}`;
      } else {
        // Unit fractions (same numerator = 1)
        const den1 = randInt(2, 9);
        const den2 = randInt(2, 9);
        left = 1 / den1;
        right = 1 / den2;
        leftDisplay = `1/${den1}`;
        rightDisplay = `1/${den2}`;
      }
    }

    if (left > right) answer = '>';
    else if (left < right) answer = '<';
    else answer = '=';

    this.currentQ = { left, right, leftDisplay, rightDisplay, answer, choices: ['>', '<', '='] };
    this._renderQuestion();
    return this.currentQ;
  }

  _renderQuestion() {
    const q = this.currentQ;
    const area = this.container.querySelector('#game-area');

    // Scale tilt
    let tilt = 0; // degrees. Positive = left heavy (down)
    const diff = q.left - q.right;
    const maxRange = this.level === 4 ? 1 : (this.level === 3 ? 999 : (this.level === 2 ? 99 : 9));

    area.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-lg); width: 100%;">
        <div style="font-size: 1.15rem; font-weight: 700;">어느 쪽이 더 클까?</div>

        <!-- Scale visualization -->
        <div style="position: relative; width: 280px; height: 180px;">
          <!-- Beam -->
          <div id="scale-beam" style="position: absolute; top: 60px; left: 20px; right: 20px; height: 6px; background: var(--text-primary); border-radius: 3px; transform-origin: center; transform: rotate(0deg); transition: transform 0.6s ease;">
            <!-- Left plate -->
            <div style="position: absolute; left: -10px; top: -50px; width: 100px; text-align: center;">
              <div style="font-size: ${this.level===4 ? '1.5rem' : '2rem'}; font-weight: 800;">${q.leftDisplay}</div>
              <div style="width: 80px; height: 6px; background: var(--text-secondary); border-radius: 3px; margin: 8px auto 0;"></div>
            </div>
            <!-- Right plate -->
            <div style="position: absolute; right: -10px; top: -50px; width: 100px; text-align: center;">
              <div style="font-size: ${this.level===4 ? '1.5rem' : '2rem'}; font-weight: 800;">${q.rightDisplay}</div>
              <div style="width: 80px; height: 6px; background: var(--text-secondary); border-radius: 3px; margin: 8px auto 0;"></div>
            </div>
          </div>
          <!-- Fulcrum -->
          <div style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 24px solid transparent; border-right: 24px solid transparent; border-bottom: 40px solid var(--text-primary);"></div>
        </div>

        <div id="feedback-msg" class="encouragement" style="min-height: 1.5em;"></div>

        <!-- Comparison buttons -->
        <div class="choices" id="choices-area" style="gap: var(--space-lg);">
          ${q.choices.map(c => `
            <button class="choice-btn" data-answer="${c}" style="min-width: 72px; font-size: 2rem; padding: 12px 24px;">${c}</button>
          `).join('')}
        </div>
        <div id="hint-container"></div>
      </div>
    `;

    area.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.engine.submitAnswer(btn.dataset.answer);
      });
    });
  }

  checkAnswer(userAnswer) {
    return { isCorrect: userAnswer === this.currentQ.answer };
  }

  async showFeedback(isCorrect, reward) {
    const msg = this.container.querySelector('#feedback-msg');
    const choices = this.container.querySelectorAll('.choice-btn');
    const beam = this.container.querySelector('#scale-beam');

    if (isCorrect) {
      choices.forEach(btn => {
        if (btn.dataset.answer === this.currentQ.answer) btn.classList.add('correct');
        btn.disabled = true;
      });

      // Animate scale tilt
      if (beam) {
        const tilt = this.currentQ.answer === '>' ? -12 : this.currentQ.answer === '<' ? 12 : 0;
        beam.style.transform = `rotate(${tilt}deg)`;
      }

      msg.textContent = reward.message;
      msg.style.color = 'var(--color-primary-dark)';
      if (reward.coins > 0) this._coinFly(reward.coins);
      const bal = await rewardEngine.getBalance();
      this.container.querySelector('#coin-count').textContent = bal;
    } else {
      msg.textContent = reward.message;
      msg.style.color = 'var(--color-error)';
      // Shake the scale
      if (beam) {
        beam.style.animation = 'wrongShake 0.4s ease';
        setTimeout(() => { beam.style.animation = ''; }, 400);
      }
      setTimeout(() => { msg.textContent = ''; }, 800);
    }
  }

  async showHint(question, answer) {
    this.container.querySelectorAll('.choice-btn').forEach(b => {
      b.disabled = true;
      if (b.dataset.answer === question.answer) b.classList.add('correct');
    });
    const beam = this.container.querySelector('#scale-beam');
    if (beam) {
      const tilt = question.answer === '>' ? -12 : question.answer === '<' ? 12 : 0;
      beam.style.transform = `rotate(${tilt}deg)`;
    }
    const hint = this.container.querySelector('#hint-container');
    const symbol = question.answer;
    hint.innerHTML = `<div class="hint-area">${question.leftDisplay} ${symbol} ${question.rightDisplay}<br>${question.answer === '>' ? '왼쪽이 더 커요!' : question.answer === '<' ? '오른쪽이 더 커요!' : '둘이 같아요!'}</div>`;
  }

  updateProgress(current, total) {
    const fill = this.container.querySelector('#progress-fill');
    const text = this.container.querySelector('#progress-text');
    if (fill) fill.style.width = `${(current / total) * 100}%`;
    if (text) text.textContent = `${current} / ${total}`;
  }

  _coinFly(n) { for (let i=0;i<Math.min(n,3);i++){setTimeout(()=>{const el=document.createElement('div');el.className='coin-fly';el.textContent='💰';el.style.left=`${50+(Math.random()*20-10)}%`;el.style.top='50%';document.body.appendChild(el);setTimeout(()=>el.remove(),800);},i*100);} }

  _showResult(summary) {
    this.container.innerHTML = `<div class="game-result"><div class="game-result__icon">${summary.accuracy>=80?'⚖️':'🏋️'}</div><div class="game-result__title">${summary.accuracy>=80?'비교의 달인!':'크기 비교 연습 잘했어!'}</div><div class="game-result__stats"><div class="result-stat"><div class="result-stat__value">${summary.correctCount}/${summary.totalQuestions}</div><div class="result-stat__label">정답</div></div><div class="result-stat"><div class="result-stat__value">${summary.accuracy}%</div><div class="result-stat__label">정답률</div></div><div class="result-stat"><div class="result-stat__value">${summary.totalTimeFormatted}</div><div class="result-stat__label">시간</div></div></div><div class="game-result__coins">💰 현재 잔액: ${summary.balance}원</div><div class="game-result__actions"><button class="btn btn-primary btn-lg" id="result-retry">한 번 더!</button><button class="btn btn-outline" id="result-home">홈으로</button></div></div>`;
    this.container.querySelector('#result-retry').addEventListener('click', () => { window.location.hash=`/game/scale/${this.level}?concept=${this.conceptId}`; window.dispatchEvent(new HashChangeEvent('hashchange')); });
    this.container.querySelector('#result-home').addEventListener('click', () => { window.location.hash='/'; });
  }

  destroy() { this.container = null; }
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
