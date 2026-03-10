/**
 * Game 13: Pattern Puzzle — find and continue patterns
 *
 * Levels:
 *   1: 도형/색 반복 패턴 (AB, AAB)
 *   2: 숫자 규칙 찾기 (+1, +2, +5, +10)
 *   3: 곱셈 규칙 (×2, ×3)
 *   4: 복합 패턴 (두 단계 규칙)
 */
import { GameEngine } from '../engine/game-engine.js';
import { rewardEngine } from '../engine/reward-engine.js';
import { soundManager } from '../engine/sound-manager.js';

const SHAPE_SETS = [
  ['🔴', '🔵'], ['⭐', '🌙'], ['🟡', '🟢'], ['🔷', '🔶'],
  ['🌸', '🍀'], ['❤️', '💙'], ['🟠', '🟣']
];

export class PatternGame {
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
          <div class="game-topbar__question" id="question-text">규칙 찾기</div>
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
    if (this.level === 1) {
      return this._generateShapePattern();
    } else if (this.level === 2) {
      return this._generateAddPattern();
    } else if (this.level === 3) {
      return this._generateMultPattern();
    } else {
      return this._generateComplexPattern();
    }
  }

  _generateShapePattern() {
    const shapes = SHAPE_SETS[randInt(0, SHAPE_SETS.length - 1)];
    const patternTypes = [
      [0, 1],       // AB
      [0, 0, 1],    // AAB
      [0, 1, 1],    // ABB
      [0, 1, 0, 1]  // ABAB (same as AB but 4-unit)
    ];
    const pattern = patternTypes[randInt(0, patternTypes.length - 1)];

    // Generate sequence: show 2-3 full repeats + ask for next
    const repeats = pattern.length <= 2 ? 3 : 2;
    const sequence = [];
    for (let r = 0; r < repeats; r++) {
      for (const idx of pattern) {
        sequence.push(shapes[idx]);
      }
    }
    // The answer is the next item
    const nextIdx = pattern[0]; // Start of next repeat
    const answer = shapes[nextIdx];
    const display = [...sequence, '?'];

    const choices = [shapes[0], shapes[1]];
    if (shapes.length > 2) choices.push(shapes[2]);
    // Ensure answer is included
    if (!choices.includes(answer)) choices[0] = answer;

    const ruleText = pattern.map(i => shapes[i]).join('') + ' 반복';

    this.currentQ = {
      type: 'shape', display, answer, choices: choices.sort(() => Math.random() - 0.5),
      questionText: '다음에 올 것은?', ruleText
    };
    this._renderQuestion();
    return this.currentQ;
  }

  _generateAddPattern() {
    const steps = [1, 2, 3, 5, 10];
    const step = steps[randInt(0, steps.length - 1)];
    const start = randInt(1, 20);
    const isAdd = Math.random() < 0.8;

    const sequence = [];
    for (let i = 0; i < 5; i++) {
      sequence.push(isAdd ? start + step * i : start - step * i);
    }
    // Check no negative
    if (sequence.some(v => v < 0)) {
      return this._generateAddPattern(); // Retry
    }

    const answer = `${isAdd ? start + step * 5 : start - step * 5}`;
    if (parseInt(answer) < 0) return this._generateAddPattern();

    const display = [...sequence.map(String), '?'];

    const wrongs = new Set();
    const ans = parseInt(answer);
    wrongs.add(`${ans + step}`);
    wrongs.add(`${ans - step}`);
    wrongs.add(`${ans + 1}`);
    wrongs.delete(answer);
    const valid = [...wrongs].filter(w => parseInt(w) >= 0).slice(0, 2);
    const choices = [answer, ...valid].sort(() => Math.random() - 0.5);

    const ruleText = isAdd ? `+${step}씩 커져요` : `-${step}씩 작아져요`;

    this.currentQ = {
      type: 'number', display, answer, choices,
      questionText: '규칙을 찾아 빈칸을 채우세요!', ruleText, step, isAdd
    };
    this._renderQuestion();
    return this.currentQ;
  }

  _generateMultPattern() {
    const multipliers = [2, 3, 5];
    const mult = multipliers[randInt(0, multipliers.length - 1)];
    const start = randInt(1, 4);

    const sequence = [];
    let val = start;
    for (let i = 0; i < 4; i++) {
      sequence.push(val);
      val *= mult;
    }
    const answer = `${val}`;

    const display = [...sequence.map(String), '?'];

    const wrongs = new Set();
    const ans = parseInt(answer);
    wrongs.add(`${ans + mult}`);
    wrongs.add(`${ans - mult}`);
    wrongs.add(`${sequence[sequence.length - 1] + sequence[sequence.length - 1]}`);
    wrongs.delete(answer);
    const valid = [...wrongs].filter(w => parseInt(w) > 0).slice(0, 2);
    const choices = [answer, ...valid].sort(() => Math.random() - 0.5);

    const ruleText = `×${mult}씩 커져요`;

    this.currentQ = {
      type: 'number', display, answer, choices,
      questionText: '규칙을 찾아 빈칸을 채우세요!', ruleText
    };
    this._renderQuestion();
    return this.currentQ;
  }

  _generateComplexPattern() {
    // Two-step: +a, +b alternating or +a, ×b
    const type = Math.random() < 0.5 ? 'alt-add' : 'growing';

    if (type === 'alt-add') {
      const a = randInt(1, 3);
      const b = randInt(2, 5);
      const start = randInt(1, 10);
      const sequence = [start];
      for (let i = 1; i < 6; i++) {
        sequence.push(sequence[i - 1] + (i % 2 === 1 ? a : b));
      }
      const answer = `${sequence[5] + a}`; // Next step is +a
      const display = [...sequence.map(String), '?'];

      const wrongs = new Set();
      const ans = parseInt(answer);
      wrongs.add(`${ans + 1}`);
      wrongs.add(`${ans - 1}`);
      wrongs.add(`${sequence[5] + b}`);
      wrongs.delete(answer);
      const valid = [...wrongs].filter(w => parseInt(w) > 0).slice(0, 2);
      const choices = [answer, ...valid].sort(() => Math.random() - 0.5);

      const ruleText = `+${a}, +${b}이 번갈아 나와요`;

      this.currentQ = {
        type: 'number', display, answer, choices,
        questionText: '규칙을 찾아 빈칸을 채우세요!', ruleText
      };
    } else {
      // Growing gap: +1, +2, +3, +4, ...
      const start = randInt(1, 5);
      const sequence = [start];
      for (let i = 1; i <= 5; i++) {
        sequence.push(sequence[i - 1] + i);
      }
      const answer = `${sequence[5] + 6}`;
      const display = [...sequence.map(String), '?'];

      const wrongs = new Set();
      const ans = parseInt(answer);
      wrongs.add(`${ans + 1}`);
      wrongs.add(`${ans - 1}`);
      wrongs.add(`${sequence[5] + 5}`);
      wrongs.delete(answer);
      const valid = [...wrongs].filter(w => parseInt(w) > 0).slice(0, 2);
      const choices = [answer, ...valid].sort(() => Math.random() - 0.5);

      const ruleText = '+1, +2, +3, +4 ... 차이가 1씩 커져요';

      this.currentQ = {
        type: 'number', display, answer, choices,
        questionText: '규칙을 찾아 빈칸을 채우세요!', ruleText
      };
    }

    this._renderQuestion();
    return this.currentQ;
  }

  _renderQuestion() {
    const q = this.currentQ;
    const area = this.container.querySelector('#game-area');
    const isShape = q.type === 'shape';

    area.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-md); width: 100%; max-width: 400px; margin: 0 auto;">
        <div style="font-size: 1.1rem; font-weight: 700; text-align: center;">${q.questionText}</div>

        <!-- Pattern display -->
        <div style="background: var(--bg-card); border-radius: var(--radius-lg); padding: var(--space-lg); box-shadow: var(--shadow-md); width: 100%; overflow-x: auto;">
          <div style="display: flex; gap: ${isShape ? '8px' : '12px'}; justify-content: center; align-items: center; flex-wrap: wrap;">
            ${q.display.map((item, i) => {
              const isBlank = item === '?';
              if (isShape) {
                return `<div style="font-size: ${isBlank ? '1.6rem' : '2rem'}; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; ${isBlank ? 'border: 3px dashed var(--color-primary); border-radius: var(--radius-md); color: var(--color-primary); font-weight: 800;' : ''}">${item}</div>`;
              } else {
                return `<div style="min-width: 40px; height: 44px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; font-weight: 700; ${isBlank ? 'border: 3px dashed var(--color-primary); border-radius: var(--radius-md); color: var(--color-primary);' : 'background: var(--color-primary-light); border-radius: var(--radius-sm); color: var(--color-primary-dark);'} padding: 0 8px;">${item}</div>`;
              }
            }).join(isShape ? '' : `<div style="color: var(--text-secondary); font-size: 1rem;">→</div>`)}
          </div>
        </div>

        <div id="feedback-msg" class="encouragement" style="min-height: 1.5em;"></div>

        <div class="choices" id="choices-area">
          ${q.choices.map(c => `
            <button class="choice-btn" data-answer="${c}" style="min-width: ${isShape ? '64px' : '80px'}; font-size: ${isShape ? '1.8rem' : '1.3rem'};">${c}</button>
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
    hint.innerHTML = `<div class="hint-area">규칙: ${question.ruleText}<br>정답: ${question.answer}</div>`;
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
      icon: summary.accuracy >= 80 ? '🔍' : '🧩',
      title: summary.accuracy >= 80 ? '규칙 탐정!' : '규칙 찾기 잘했어!',
      retryHash: `/game/pattern/${this.level}?concept=${this.conceptId}`,
      conceptId: this.conceptId,
      gameType: 'pattern',
      level: this.level
    });
  }

  destroy() { this.container = null; }
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
