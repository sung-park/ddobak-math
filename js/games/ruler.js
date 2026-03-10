/**
 * Game 11: Ruler — measure lengths and convert units
 *
 * Levels:
 *   1: cm 단위 읽기 (1~10cm)
 *   2: cm 단위 길이 재기 (1~20cm)
 *   3: mm 포함 길이 읽기
 *   4: m와 cm / L와 mL / kg과 g 단위 환산
 */
import { GameEngine } from '../engine/game-engine.js';
import { rewardEngine } from '../engine/reward-engine.js';
import { soundManager } from '../engine/sound-manager.js';

const OBJECTS = ['연필', '지우개', '크레파스', '리본', '막대', '종이'];

export class RulerGame {
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
    this.engine.onComplete((summary) => this._showResult(summary));

    container.innerHTML = `
      <div class="game-screen">
        <div class="game-topbar">
          <button class="game-topbar__back" id="game-back">←</button>
          <div class="game-topbar__question" id="question-text">길이 재기</div>
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
    if (this.level <= 2) {
      return this._generateCmQuestion();
    } else if (this.level === 3) {
      return this._generateMmQuestion();
    } else {
      return this._generateConversionQuestion();
    }
  }

  _generateCmQuestion() {
    const maxLen = this.level === 1 ? 10 : 20;
    const length = randInt(1, maxLen);
    const obj = OBJECTS[randInt(0, OBJECTS.length - 1)];
    const answer = `${length}cm`;
    const choices = this._numChoices(length, 'cm', 1, maxLen);

    this.currentQ = { length, unit: 'cm', obj, answer, choices, questionType: 'measure' };
    this._renderQuestion();
    return this.currentQ;
  }

  _generateMmQuestion() {
    const cm = randInt(1, 12);
    const mm = randInt(1, 9);
    const obj = OBJECTS[randInt(0, OBJECTS.length - 1)];
    const answer = `${cm}cm ${mm}mm`;
    const choices = this._generateMmChoices(cm, mm);

    this.currentQ = { length: cm * 10 + mm, cm, mm, unit: 'mm', obj, answer, choices, questionType: 'measure' };
    this._renderQuestion();
    return this.currentQ;
  }

  _generateConversionQuestion() {
    const types = [
      { from: 'm', to: 'cm', factor: 100, maxVal: 5 },
      { from: 'cm', to: 'mm', factor: 10, maxVal: 15 },
      { from: 'km', to: 'm', factor: 1000, maxVal: 3 },
      { from: 'kg', to: 'g', factor: 1000, maxVal: 5 },
      { from: 'L', to: 'mL', factor: 1000, maxVal: 3 }
    ];
    const t = types[randInt(0, types.length - 1)];
    const val = randInt(1, t.maxVal);
    const converted = val * t.factor;
    const questionText = `${val}${t.from} = ?${t.to}`;
    const answer = `${converted}${t.to}`;

    const wrongs = new Set();
    wrongs.add(`${converted + t.factor}${t.to}`);
    wrongs.add(`${converted - t.factor}${t.to}`);
    wrongs.add(`${val * 10}${t.to}`);
    wrongs.add(`${val}${t.to}`);
    wrongs.delete(answer);
    const valid = [...wrongs].filter(w => parseInt(w) > 0).slice(0, 2);
    const choices = [answer, ...valid].sort(() => Math.random() - 0.5);

    this.currentQ = { questionType: 'convert', questionText, answer, choices, from: t.from, to: t.to, val, converted };
    this._renderQuestion();
    return this.currentQ;
  }

  _numChoices(val, unit, min, max) {
    const correct = `${val}${unit}`;
    const wrongs = new Set();
    wrongs.add(`${val + 1}${unit}`);
    wrongs.add(`${val - 1}${unit}`);
    wrongs.add(`${val + 2}${unit}`);
    if (val > 2) wrongs.add(`${val - 2}${unit}`);
    wrongs.delete(correct);
    const valid = [...wrongs].filter(w => parseInt(w) >= min && parseInt(w) <= max + 2).slice(0, 2);
    return [correct, ...valid].sort(() => Math.random() - 0.5);
  }

  _generateMmChoices(cm, mm) {
    const correct = `${cm}cm ${mm}mm`;
    const wrongs = new Set();
    wrongs.add(`${cm}cm ${mm + 1 > 9 ? mm - 1 : mm + 1}mm`);
    wrongs.add(`${cm + 1}cm ${mm}mm`);
    wrongs.add(`${cm - 1 < 1 ? cm + 2 : cm - 1}cm ${mm}mm`);
    wrongs.delete(correct);
    const valid = [...wrongs].filter(w => !w.startsWith('0')).slice(0, 2);
    return [correct, ...valid].sort(() => Math.random() - 0.5);
  }

  _renderQuestion() {
    const q = this.currentQ;
    const area = this.container.querySelector('#game-area');

    if (q.questionType === 'convert') {
      area.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-md); width: 100%; max-width: 380px; margin: 0 auto;">
          <div style="font-size: 1.15rem; font-weight: 700;">단위를 바꿔 보세요!</div>
          <div style="background: var(--bg-card); border-radius: var(--radius-lg); padding: var(--space-xl); box-shadow: var(--shadow-md); text-align: center;">
            <div style="font-size: 2rem; font-weight: 800; color: var(--color-primary-dark);">${q.questionText}</div>
          </div>
          <div id="feedback-msg" class="encouragement" style="min-height: 1.5em;"></div>
          <div class="choices" id="choices-area">
            ${q.choices.map(c => `<button class="choice-btn" data-answer="${c}" style="min-width: 100px; font-size: 1.2rem;">${c}</button>`).join('')}
          </div>
          <div id="hint-container"></div>
        </div>
      `;
    } else {
      // Visual ruler
      const totalMm = q.unit === 'mm' ? q.length : q.length * 10;
      const rulerWidthPx = Math.min(320, totalMm * 2 + 40);
      const scale = (rulerWidthPx - 40) / totalMm;

      let ticks = '';
      const maxCm = Math.ceil(totalMm / 10) + 1;
      for (let i = 0; i <= maxCm; i++) {
        const x = 20 + i * 10 * scale;
        if (x > rulerWidthPx - 5) break;
        ticks += `<line x1="${x}" y1="0" x2="${x}" y2="20" stroke="#333" stroke-width="1.5"/>`;
        ticks += `<text x="${x}" y="34" text-anchor="middle" font-size="10" fill="#333">${i}</text>`;
        // mm ticks
        if (this.level >= 3) {
          for (let m = 1; m < 10; m++) {
            const mx = x + m * scale;
            if (mx > rulerWidthPx - 5) break;
            ticks += `<line x1="${mx}" y1="0" x2="${mx}" y2="${m === 5 ? 14 : 8}" stroke="#999" stroke-width="0.8"/>`;
          }
        }
      }

      // Object bar above ruler
      const objWidth = totalMm * scale;

      area.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-md); width: 100%; max-width: 400px; margin: 0 auto;">
          <div style="font-size: 1.15rem; font-weight: 700; text-align: center;">
            ${q.obj}의 길이는 얼마일까요?
          </div>

          <div style="background: var(--bg-card); border-radius: var(--radius-lg); padding: var(--space-lg) var(--space-md); box-shadow: var(--shadow-md); overflow-x: auto; width: 100%;">
            <svg width="${rulerWidthPx}" height="70" viewBox="0 0 ${rulerWidthPx} 70" style="display: block; margin: 0 auto;">
              <!-- Object bar -->
              <rect x="20" y="-8" width="${objWidth}" height="12" rx="3" fill="var(--color-primary)" opacity="0.7"/>
              <text x="${20 + objWidth / 2}" y="0" text-anchor="middle" font-size="9" fill="#fff">?</text>
              <!-- Ruler body -->
              <rect x="0" y="0" width="${rulerWidthPx}" height="40" rx="4" fill="#FFF8E1" stroke="#D4A574" stroke-width="1.5"/>
              ${ticks}
              <text x="${rulerWidthPx - 12}" y="34" font-size="8" fill="#999">cm</text>
            </svg>
          </div>

          <div id="feedback-msg" class="encouragement" style="min-height: 1.5em;"></div>
          <div class="choices" id="choices-area">
            ${q.choices.map(c => `<button class="choice-btn" data-answer="${c}" style="min-width: 90px; font-size: 1.2rem;">${c}</button>`).join('')}
          </div>
          <div id="hint-container"></div>
        </div>
      `;
    }

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
    if (isCorrect) {
      choices.forEach(btn => {
        if (btn.dataset.answer === this.currentQ.answer) btn.classList.add('correct');
        btn.disabled = true;
      });
      msg.textContent = reward.message;
      msg.style.color = 'var(--color-primary-dark)';
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
    this.container.querySelectorAll('.choice-btn').forEach(b => {
      b.disabled = true;
      if (b.dataset.answer === question.answer) b.classList.add('correct');
    });
    const hint = this.container.querySelector('#hint-container');
    if (question.questionType === 'convert') {
      hint.innerHTML = `<div class="hint-area">${question.val}${question.from} = ${question.converted}${question.to}<br>1${question.from} = ${question.converted / question.val}${question.to}이니까!</div>`;
    } else if (question.unit === 'mm') {
      hint.innerHTML = `<div class="hint-area">큰 눈금 ${question.cm}칸, 작은 눈금 ${question.mm}칸!<br>→ ${question.answer}</div>`;
    } else {
      hint.innerHTML = `<div class="hint-area">눈금을 세어 보면 ${question.length}칸!<br>→ ${question.answer}</div>`;
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
      icon: summary.accuracy >= 80 ? '📏' : '📐',
      title: summary.accuracy >= 80 ? '측정 달인!' : '길이 재기 연습 잘했어!',
      retryHash: `/game/ruler/${this.level}?concept=${this.conceptId}`,
      conceptId: this.conceptId,
      gameType: 'ruler',
      level: this.level
    });
  }

  destroy() { this.container = null; }
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
