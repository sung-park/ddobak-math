/**
 * Game 8: Pizza Fractions — cut and color pizza slices to learn fractions
 *
 * Levels:
 *   1: 2등분, 4등분
 *   2: 3등분, 6등분 추가
 *   3: 진분수·가분수 표현
 *   4: 대분수 + 크기 비교
 */
import { GameEngine } from '../engine/game-engine.js';
import { rewardEngine } from '../engine/reward-engine.js';
import { soundManager } from '../engine/sound-manager.js';

export class PizzaGame {
  constructor(level, conceptId) {
    this.level = level;
    this.conceptId = conceptId;
    this.container = null;
    this.engine = null;
    this.currentQ = null;
    this.selectedSlices = new Set();
  }

  async render(container) {
    this.container = container;
    this.engine = new GameEngine(this, {
      conceptId: this.conceptId,
      level: this.level,
      totalQuestions: 5
    });
    this.engine.onComplete((summary) => this._showResult(summary));

    container.innerHTML = `
      <div class="game-screen">
        <div class="game-topbar">
          <button class="game-topbar__back" id="game-back">←</button>
          <div class="game-topbar__question" id="question-text">피자 나누기</div>
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
    let denominator, numerator;

    if (this.level === 1) {
      denominator = [2, 4][Math.floor(Math.random() * 2)];
      numerator = randInt(1, denominator);
    } else if (this.level === 2) {
      denominator = [2, 3, 4, 6][Math.floor(Math.random() * 4)];
      numerator = randInt(1, denominator);
    } else if (this.level === 3) {
      denominator = [2, 3, 4, 5, 6][Math.floor(Math.random() * 5)];
      numerator = randInt(1, denominator + 2); // can be > denom (improper)
    } else {
      denominator = [2, 3, 4, 5, 6][Math.floor(Math.random() * 5)];
      numerator = randInt(1, denominator);
    }

    // For level 4, compare two fractions
    if (this.level === 4) {
      return this._generateCompareQuestion(denominator);
    }

    this.selectedSlices = new Set();
    const answer = numerator;

    this.currentQ = { numerator, denominator, answer, type: 'color' };
    this._renderQuestion();
    return this.currentQ;
  }

  _generateCompareQuestion(den) {
    const n1 = randInt(1, den);
    const n2 = randInt(1, den);
    const answer = n1 > n2 ? '>' : n1 < n2 ? '<' : '=';

    this.currentQ = {
      numerator: n1, denominator: den,
      n2, answer, type: 'compare',
      choices: ['>', '<', '=']
    };
    this._renderQuestion();
    return this.currentQ;
  }

  _renderQuestion() {
    const q = this.currentQ;
    const area = this.container.querySelector('#game-area');

    if (q.type === 'compare') {
      area.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-lg);">
          <div style="font-size: 1.1rem; font-weight: 700;">어느 쪽이 더 클까?</div>
          <div style="display: flex; align-items: center; gap: var(--space-xl);">
            <div style="text-align: center;">
              ${this._renderPizzaSVG(q.denominator, q.numerator, 100)}
              <div style="font-size: 1.3rem; font-weight: 800; margin-top: 8px;">${q.numerator}/${q.denominator}</div>
            </div>
            <div style="font-size: 2rem; font-weight: 800; color: var(--text-light);">?</div>
            <div style="text-align: center;">
              ${this._renderPizzaSVG(q.denominator, q.n2, 100)}
              <div style="font-size: 1.3rem; font-weight: 800; margin-top: 8px;">${q.n2}/${q.denominator}</div>
            </div>
          </div>
          <div id="feedback-msg" class="encouragement" style="min-height: 1.5em;"></div>
          <div class="choices">
            ${q.choices.map(c => `<button class="choice-btn" data-answer="${c}" style="font-size: 2rem; min-width: 64px;">${c}</button>`).join('')}
          </div>
          <div id="hint-container"></div>
        </div>
      `;
      area.querySelectorAll('.choice-btn').forEach(btn => {
        btn.addEventListener('click', () => { this.engine.submitAnswer(btn.dataset.answer); });
      });
      return;
    }

    // Color type: tap slices to color them
    const numPizzas = q.numerator > q.denominator ? Math.ceil(q.numerator / q.denominator) : 1;
    const totalSlots = numPizzas * q.denominator;

    area.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-md);">
        <div style="font-size: 1.15rem; font-weight: 700; text-align: center;">
          ${q.numerator}/${q.denominator}만큼 색칠해 보세요!
        </div>

        <div style="display: flex; gap: var(--space-lg); justify-content: center; flex-wrap: wrap;">
          ${Array(numPizzas).fill(0).map((_, pi) =>
            this._renderInteractivePizza(q.denominator, pi, 120)
          ).join('')}
        </div>

        <div style="font-size: 1.2rem; font-weight: 700;" id="fraction-display">
          <span id="colored-count">0</span>/${q.denominator * numPizzas > q.denominator ? q.denominator : q.denominator}
        </div>

        <div id="feedback-msg" class="encouragement" style="min-height: 1.5em;"></div>

        <button class="btn btn-primary" id="check-btn" style="min-width: 120px;">확인!</button>
        <button class="btn btn-ghost" id="reset-slices">↩ 다시 칠하기</button>
        <div id="hint-container"></div>
      </div>
    `;

    // Slice click handlers
    area.querySelectorAll('.pizza-slice').forEach(slice => {
      slice.addEventListener('click', () => {
        const idx = parseInt(slice.dataset.idx);
        if (this.selectedSlices.has(idx)) {
          this.selectedSlices.delete(idx);
          slice.style.fill = '#FFF3E0';
        } else {
          this.selectedSlices.add(idx);
          slice.style.fill = '#FF6B6B';
          soundManager.play('tap');
        }
        const display = area.querySelector('#colored-count');
        if (display) display.textContent = this.selectedSlices.size;
      });
    });

    // Check button
    area.querySelector('#check-btn').addEventListener('click', () => {
      this.engine.submitAnswer(this.selectedSlices.size);
    });

    // Reset
    area.querySelector('#reset-slices').addEventListener('click', () => {
      this.selectedSlices = new Set();
      area.querySelectorAll('.pizza-slice').forEach(s => { s.style.fill = '#FFF3E0'; });
      const display = area.querySelector('#colored-count');
      if (display) display.textContent = '0';
    });
  }

  _renderPizzaSVG(slices, colored, size) {
    const r = size / 2 - 4;
    const cx = size / 2;
    const cy = size / 2;

    let paths = '';
    for (let i = 0; i < slices; i++) {
      const startAngle = (i / slices) * 2 * Math.PI - Math.PI / 2;
      const endAngle = ((i + 1) / slices) * 2 * Math.PI - Math.PI / 2;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;
      const fill = i < colored ? '#FF6B6B' : '#FFF3E0';
      paths += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z" fill="${fill}" stroke="#D4A574" stroke-width="2"/>`;
    }

    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${paths}<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#8B6914" stroke-width="3"/></svg>`;
  }

  _renderInteractivePizza(slices, pizzaIdx, size) {
    const r = size / 2 - 4;
    const cx = size / 2;
    const cy = size / 2;

    let paths = '';
    for (let i = 0; i < slices; i++) {
      const globalIdx = pizzaIdx * slices + i;
      const startAngle = (i / slices) * 2 * Math.PI - Math.PI / 2;
      const endAngle = ((i + 1) / slices) * 2 * Math.PI - Math.PI / 2;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;
      paths += `<path class="pizza-slice" data-idx="${globalIdx}" d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z" fill="#FFF3E0" stroke="#D4A574" stroke-width="2" style="cursor: pointer; transition: fill 0.2s;"/>`;
    }

    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));">${paths}<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#8B6914" stroke-width="3" pointer-events="none"/></svg>`;
  }

  checkAnswer(userAnswer) {
    if (this.currentQ.type === 'compare') {
      return { isCorrect: userAnswer === this.currentQ.answer };
    }
    return { isCorrect: userAnswer === this.currentQ.numerator };
  }

  async showFeedback(isCorrect, reward) {
    const msg = this.container.querySelector('#feedback-msg');
    if (this.currentQ.type === 'compare') {
      const choices = this.container.querySelectorAll('.choice-btn');
      if (isCorrect) {
        choices.forEach(btn => {
          if (btn.dataset.answer === this.currentQ.answer) btn.classList.add('correct');
          btn.disabled = true;
        });
      }
    } else {
      const checkBtn = this.container.querySelector('#check-btn');
      if (checkBtn) checkBtn.disabled = true;
    }

    if (isCorrect) {
      msg.textContent = reward.message;
      msg.style.color = 'var(--color-primary-dark)';
      if (reward.coins > 0) this._coinFly(reward.coins);
      const bal = await rewardEngine.getBalance();
      this.container.querySelector('#coin-count').textContent = bal;
    } else {
      msg.textContent = reward.message;
      msg.style.color = 'var(--color-error)';
      setTimeout(() => { msg.textContent = ''; }, 800);
      // Re-enable
      const checkBtn = this.container.querySelector('#check-btn');
      if (checkBtn) setTimeout(() => { checkBtn.disabled = false; }, 800);
    }
  }

  async showHint(question, answer) {
    if (question.type === 'compare') {
      this.container.querySelectorAll('.choice-btn').forEach(b => {
        b.disabled = true;
        if (b.dataset.answer === question.answer) b.classList.add('correct');
      });
    } else {
      const checkBtn = this.container.querySelector('#check-btn');
      if (checkBtn) checkBtn.disabled = true;
    }
    const hint = this.container.querySelector('#hint-container');
    if (question.type === 'compare') {
      hint.innerHTML = `<div class="hint-area">${question.numerator}/${question.denominator} ${question.answer} ${question.n2}/${question.denominator}</div>`;
    } else {
      hint.innerHTML = `<div class="hint-area">${question.numerator}/${question.denominator}은(는) ${question.denominator}조각 중 ${question.numerator}조각을 칠하는 거야!</div>`;
    }
  }

  updateProgress(current, total) {
    const fill = this.container.querySelector('#progress-fill');
    const text = this.container.querySelector('#progress-text');
    if (fill) fill.style.width = `${(current / total) * 100}%`;
    if (text) text.textContent = `${current} / ${total}`;
  }

  _coinFly(n) { for(let i=0;i<Math.min(n,3);i++){setTimeout(()=>{const el=document.createElement('div');el.className='coin-fly';el.textContent='💰';el.style.left=`${50+(Math.random()*20-10)}%`;el.style.top='50%';document.body.appendChild(el);setTimeout(()=>el.remove(),800);},i*100);} }

  _showResult(summary) {
    GameEngine.renderResult(this.container, summary, {
      icon: summary.accuracy >= 80 ? '🍕' : '🍕',
      title: summary.accuracy >= 80 ? '분수 마스터!' : '분수 연습 잘했어!',
      retryHash: `/game/pizza/${this.level}?concept=${this.conceptId}`,
      conceptId: this.conceptId,
      gameType: 'pizza',
      level: this.level
    });
  }

  destroy() { this.container = null; }
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
