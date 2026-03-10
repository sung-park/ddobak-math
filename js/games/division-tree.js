/**
 * Game 10: Division Tree — distribute items equally to learn division
 *
 * Levels:
 *   1: 나누어떨어지는 한 자리÷한 자리
 *   2: 곱셈구구 범위 나눗셈
 *   3: 나머지 있는 나눗셈
 *   4: 두 자리÷한 자리
 */
import { GameEngine } from '../engine/game-engine.js';
import { rewardEngine } from '../engine/reward-engine.js';
import { soundManager } from '../engine/sound-manager.js';

const ITEM_EMOJIS = ['🍎', '🍊', '🍋', '🌸', '⭐', '🍬'];

export class DivisionTreeGame {
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
      totalQuestions: 6
    });
  _showResult(summary) {
    GameEngine.renderResult(this.container, summary, {
      icon: summary.accuracy >= 80 ? '🌳' : '🌱',
      title: summary.accuracy >= 80 ? '나눗셈 마스터!' : '나눗셈 연습 잘했어!',
      retryHash: `/game/division-tree/${this.level}?concept=${this.conceptId}`,
      conceptId: this.conceptId,
      gameType: 'division-tree',
      level: this.level
    });
  }
    container.innerHTML = `
      <div class="game-screen">
        <div class="game-topbar">
          <button class="game-topbar__back" id="game-back">←</button>
          <div class="game-topbar__question" id="question-text">나눗셈 나무</div>
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
    let total, divisor, quotient, remainder;
    const emoji = ITEM_EMOJIS[Math.floor(Math.random() * ITEM_EMOJIS.length)];

    if (this.level === 1) {
      // Clean division, small numbers
      divisor = randInt(2, 5);
      quotient = randInt(1, 5);
      total = divisor * quotient;
      remainder = 0;
    } else if (this.level === 2) {
      // Times table range
      divisor = randInt(2, 9);
      quotient = randInt(1, 9);
      total = divisor * quotient;
      remainder = 0;
    } else if (this.level === 3) {
      // With remainder
      divisor = randInt(2, 7);
      quotient = randInt(1, 7);
      remainder = randInt(1, divisor - 1);
      total = divisor * quotient + remainder;
    } else {
      // Two-digit ÷ one-digit
      divisor = randInt(2, 9);
      quotient = randInt(3, 15);
      remainder = Math.random() < 0.4 ? randInt(1, divisor - 1) : 0;
      total = divisor * quotient + remainder;
    }

    let questionText, answerType;

    if (this.level <= 2) {
      // Ask for quotient
      questionText = `${emoji} ${total}개를 ${divisor}명에게 똑같이 나누면?`;
      answerType = 'quotient';
    } else {
      // Ask for quotient and remainder
      questionText = `${emoji} ${total}개를 ${divisor}명에게 똑같이 나누면?`;
      answerType = remainder > 0 ? 'quotient-remainder' : 'quotient';
    }

    // Generate choices
    const answer = remainder > 0 ? `${quotient}...${remainder}` : `${quotient}`;
    const choices = this._generateChoices(quotient, remainder, divisor);

    this.currentQ = { total, divisor, quotient, remainder, emoji, answer, choices, questionText, answerType };
    this._renderQuestion();
    return this.currentQ;
  }

  _generateChoices(quotient, remainder, divisor) {
    const correct = remainder > 0 ? `${quotient}...${remainder}` : `${quotient}`;
    const wrongs = new Set();

    wrongs.add(remainder > 0 ? `${quotient + 1}...${remainder}` : `${quotient + 1}`);
    wrongs.add(remainder > 0 ? `${quotient - 1}...${remainder}` : `${quotient - 1}`);
    if (remainder > 0) {
      wrongs.add(`${quotient}...${remainder + 1 >= divisor ? 0 : remainder + 1}`);
      wrongs.add(`${quotient}`); // Forgetting remainder
    } else {
      wrongs.add(`${quotient + 2}`);
      wrongs.add(`${quotient * 2}`);
    }
    wrongs.add(`${divisor}`); // Confusing divisor with quotient

    wrongs.delete(correct);
    const valid = [...wrongs].filter(w => {
      const n = parseInt(w);
      return n > 0 && w !== correct;
    });

    const selected = valid.sort(() => Math.random() - 0.5).slice(0, 2);
    const all = [correct, ...selected];
    return all.sort(() => Math.random() - 0.5);
  }

  _renderQuestion() {
    const q = this.currentQ;
    const area = this.container.querySelector('#game-area');

    // Visual: show items and people
    const itemsPerRow = Math.min(q.total, 15);
    const rows = Math.ceil(q.total / itemsPerRow);

    area.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-md); width: 100%; max-width: 380px; margin: 0 auto;">
        <div style="font-size: 1.1rem; font-weight: 700; text-align: center; line-height: 1.5;">
          ${q.questionText}
        </div>

        <!-- Items -->
        <div style="background: var(--bg-card); border-radius: var(--radius-lg); padding: var(--space-md); width: 100%; text-align: center; box-shadow: var(--shadow-sm);">
          <div style="display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; font-size: 1.3rem; line-height: 1.8;">
            ${Array(Math.min(q.total, 30)).fill(q.emoji).join(' ')}
            ${q.total > 30 ? `<span style="font-size: 0.9rem; color: var(--text-secondary);">... (총 ${q.total}개)</span>` : ''}
          </div>
        </div>

        <!-- People -->
        <div style="display: flex; gap: var(--space-md); justify-content: center; flex-wrap: wrap;">
          ${Array(q.divisor).fill(0).map((_, i) => `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
              <div style="font-size: 1.8rem;">🧒</div>
              <div style="min-width: 48px; min-height: 24px; border: 2px dashed var(--color-primary-light); border-radius: var(--radius-sm); padding: 4px; text-align: center; font-size: 0.9rem;" id="basket-${i}"></div>
            </div>
          `).join('')}
        </div>

        <!-- Division expression -->
        <div style="font-size: 1.2rem; font-weight: 700; color: var(--text-secondary);">
          ${q.total} ÷ ${q.divisor} = ?
        </div>

        <div id="feedback-msg" class="encouragement" style="min-height: 1.5em;"></div>

        <div class="choices" id="choices-area">
          ${q.choices.map(c => `
            <button class="choice-btn" data-answer="${c}" style="min-width: 80px; font-size: 1.3rem;">${c}</button>
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
    const q = this.currentQ;

    if (isCorrect) {
      choices.forEach(btn => {
        if (btn.dataset.answer === q.answer) btn.classList.add('correct');
        btn.disabled = true;
      });

      // Fill baskets animation
      for (let i = 0; i < q.divisor; i++) {
        const basket = this.container.querySelector(`#basket-${i}`);
        if (basket) {
          basket.textContent = Array(q.quotient).fill(q.emoji).join('');
          basket.style.borderColor = 'var(--color-success)';
          basket.style.background = '#e8faf5';
        }
      }

      msg.innerHTML = `${reward.message}${q.remainder > 0 ? `<br><span style="font-size:0.9rem">나머지 ${q.remainder}개가 남아요!</span>` : ''}`;
      msg.style.color = 'var(--color-primary-dark)';

      // Show division equation
      setTimeout(() => {
        const eqn = q.remainder > 0
          ? `${q.total} ÷ ${q.divisor} = ${q.quotient} ... ${q.remainder}`
          : `${q.total} ÷ ${q.divisor} = ${q.quotient}`;
        const feedbackExtra = this.container.querySelector('#hint-container');
        if (feedbackExtra) {
          feedbackExtra.innerHTML = `<div style="font-size: 1.1rem; font-weight: 700; color: var(--color-primary-dark);">${eqn}</div>`;
        }
      }, 500);

      if (reward.coins > 0) this._coinFly(reward.coins);
      const bal = await rewardEngine.getBalance();
      this.container.querySelector('#coin-count').textContent = bal;
    } else {
      msg.textContent = reward.message;
      msg.style.color = 'var(--color-error)';
      setTimeout(() => { msg.textContent = ''; }, 800);
    }
  }

  async showHint(question, answer) {
    const q = question;
    this.container.querySelectorAll('.choice-btn').forEach(b => {
      b.disabled = true;
      if (b.dataset.answer === q.answer) b.classList.add('correct');
    });

    // Fill baskets
    for (let i = 0; i < q.divisor; i++) {
      const basket = this.container.querySelector(`#basket-${i}`);
      if (basket) basket.textContent = Array(q.quotient).fill(q.emoji).join('');
    }

    const hint = this.container.querySelector('#hint-container');
    const check = `${q.quotient} × ${q.divisor} = ${q.quotient * q.divisor}`;
    hint.innerHTML = `<div class="hint-area">
      ${q.total} ÷ ${q.divisor} = ${q.quotient}${q.remainder > 0 ? ` ... ${q.remainder}` : ''}<br>
      확인: ${check}${q.remainder > 0 ? ` + ${q.remainder} = ${q.total}` : ` = ${q.total}`}<br>
      <span style="font-size:0.9rem;color:var(--text-secondary);">${q.divisor}명에게 ${q.quotient}개씩!</span>
    </div>`;
  }

  updateProgress(current, total) {
    const fill = this.container.querySelector('#progress-fill');
    const text = this.container.querySelector('#progress-text');
    if (fill) fill.style.width = `${(current / total) * 100}%`;
    if (text) text.textContent = `${current} / ${total}`;
  }

  _coinFly(n) { for(let i=0;i<Math.min(n,3);i++){setTimeout(()=>{const el=document.createElement('div');el.className='coin-fly';el.textContent='💰';el.style.left=`${50+(Math.random()*20-10)}%`;el.style.top='50%';document.body.appendChild(el);setTimeout(()=>el.remove(),800);},i*100);} }

  _showResult(summary) {
    this.container.innerHTML = `<div class="game-result"><div class="game-result__icon">${summary.accuracy>=80?'🌳':'🌱'}</div><div class="game-result__title">${summary.accuracy>=80?'나눗셈 마스터!':'나눗셈 연습 잘했어!'}</div><div class="game-result__stats"><div class="result-stat"><div class="result-stat__value">${summary.correctCount}/${summary.totalQuestions}</div><div class="result-stat__label">정답</div></div><div class="result-stat"><div class="result-stat__value">${summary.accuracy}%</div><div class="result-stat__label">정답률</div></div><div class="result-stat"><div class="result-stat__value">${summary.totalTimeFormatted}</div><div class="result-stat__label">시간</div></div></div><div class="game-result__coins">💰 현재 잔액: ${summary.balance}원</div><div class="game-result__actions"><button class="btn btn-primary btn-lg" id="result-retry">한 번 더!</button><button class="btn btn-outline" id="result-home">홈으로</button></div></div>`;
    this.container.querySelector('#result-retry').addEventListener('click', () => { window.location.hash=`/game/division-tree/${this.level}?concept=${this.conceptId}`; window.dispatchEvent(new HashChangeEvent('hashchange')); });
    this.container.querySelector('#result-home').addEventListener('click', () => { window.location.hash='/'; });
  }

  destroy() { this.container = null; }
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
