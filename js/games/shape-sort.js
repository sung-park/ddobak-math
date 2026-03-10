/**
 * Game 9: Shape Sort — classify shapes into boxes
 *
 * Levels:
 *   1: 입체 모양 분류 (직육면체/원기둥/구)
 *   2: 평면 도형 분류 (삼각형/사각형/원)
 *   3: 삼·사각형 세분류 + 원
 *   4: 직각삼각형·직사각형·정사각형 분류
 */
import { GameEngine } from '../engine/game-engine.js';
import { rewardEngine } from '../engine/reward-engine.js';
import { soundManager } from '../engine/sound-manager.js';

const SHAPE_SETS = {
  1: {
    categories: ['직육면체', '원기둥', '구'],
    shapes: [
      { name: '상자', category: '직육면체', svg: '<rect x="15" y="20" width="50" height="40" fill="#4D96FF" stroke="#333" stroke-width="2" rx="2"/><line x1="15" y1="20" x2="30" y2="10" stroke="#333" stroke-width="2"/><line x1="65" y1="20" x2="80" y2="10" stroke="#333" stroke-width="2"/><line x1="30" y1="10" x2="80" y2="10" stroke="#333" stroke-width="2"/><line x1="80" y1="10" x2="80" y2="50" stroke="#333" stroke-width="2"/><line x1="65" y1="60" x2="80" y2="50" stroke="#333" stroke-width="2"/>' },
      { name: '주사위', category: '직육면체', svg: '<rect x="20" y="20" width="45" height="45" fill="#FFD93D" stroke="#333" stroke-width="2" rx="4"/><circle cx="32" cy="32" r="3" fill="#333"/><circle cx="52" cy="52" r="3" fill="#333"/><circle cx="42" cy="42" r="3" fill="#333"/>' },
      { name: '캔', category: '원기둥', svg: '<ellipse cx="45" cy="22" rx="25" ry="8" fill="#FF6B6B" stroke="#333" stroke-width="2"/><rect x="20" y="22" width="50" height="35" fill="#FF6B6B" stroke="none"/><line x1="20" y1="22" x2="20" y2="57" stroke="#333" stroke-width="2"/><line x1="70" y1="22" x2="70" y2="57" stroke="#333" stroke-width="2"/><ellipse cx="45" cy="57" rx="25" ry="8" fill="#e05555" stroke="#333" stroke-width="2"/>' },
      { name: '둥근 기둥', category: '원기둥', svg: '<ellipse cx="45" cy="18" rx="22" ry="7" fill="#95E1D3" stroke="#333" stroke-width="2"/><rect x="23" y="18" width="44" height="40" fill="#95E1D3" stroke="none"/><line x1="23" y1="18" x2="23" y2="58" stroke="#333" stroke-width="2"/><line x1="67" y1="18" x2="67" y2="58" stroke="#333" stroke-width="2"/><ellipse cx="45" cy="58" rx="22" ry="7" fill="#7acab8" stroke="#333" stroke-width="2"/>' },
      { name: '공', category: '구', svg: '<circle cx="45" cy="40" r="25" fill="#FFB347" stroke="#333" stroke-width="2"/><ellipse cx="38" cy="32" rx="6" ry="4" fill="rgba(255,255,255,0.4)" transform="rotate(-20 38 32)"/>' },
      { name: '구슬', category: '구', svg: '<circle cx="45" cy="40" r="20" fill="#6BCB77" stroke="#333" stroke-width="2"/><ellipse cx="38" cy="34" rx="5" ry="3" fill="rgba(255,255,255,0.4)" transform="rotate(-20 38 34)"/>' },
    ]
  },
  2: {
    categories: ['삼각형', '사각형', '원'],
    shapes: [
      { name: '삼각형1', category: '삼각형', svg: '<polygon points="45,12 15,65 75,65" fill="#4ECDC4" stroke="#333" stroke-width="2"/>' },
      { name: '뾰족 삼각형', category: '삼각형', svg: '<polygon points="45,8 25,68 65,68" fill="#FF6B6B" stroke="#333" stroke-width="2"/>' },
      { name: '넓은 삼각형', category: '삼각형', svg: '<polygon points="45,20 10,65 80,65" fill="#FFD93D" stroke="#333" stroke-width="2"/>' },
      { name: '정사각형', category: '사각형', svg: '<rect x="17" y="17" width="50" height="50" fill="#4D96FF" stroke="#333" stroke-width="2"/>' },
      { name: '직사각형', category: '사각형', svg: '<rect x="12" y="22" width="60" height="35" fill="#95E1D3" stroke="#333" stroke-width="2"/>' },
      { name: '마름모', category: '사각형', svg: '<polygon points="45,12 75,40 45,68 15,40" fill="#FFB347" stroke="#333" stroke-width="2"/>' },
      { name: '원', category: '원', svg: '<circle cx="45" cy="40" r="28" fill="#F38181" stroke="#333" stroke-width="2"/>' },
      { name: '타원', category: '원', svg: '<ellipse cx="45" cy="40" rx="32" ry="22" fill="#B8E6CF" stroke="#333" stroke-width="2"/>' },
    ]
  },
  3: {
    categories: ['삼각형', '사각형', '원'],
    shapes: [
      { name: '기울어진 삼각형', category: '삼각형', svg: '<polygon points="30,15 10,65 70,55" fill="#4ECDC4" stroke="#333" stroke-width="2"/>' },
      { name: '작은 삼각형', category: '삼각형', svg: '<polygon points="45,25 30,55 60,55" fill="#FFD93D" stroke="#333" stroke-width="2"/>' },
      { name: '사다리꼴', category: '사각형', svg: '<polygon points="25,20 65,20 75,60 15,60" fill="#4D96FF" stroke="#333" stroke-width="2"/>' },
      { name: '평행사변형', category: '사각형', svg: '<polygon points="25,20 70,20 60,60 15,60" fill="#FF6B6B" stroke="#333" stroke-width="2"/>' },
      { name: '큰 원', category: '원', svg: '<circle cx="45" cy="40" r="30" fill="#95E1D3" stroke="#333" stroke-width="2"/>' },
    ]
  },
  4: {
    categories: ['직각삼각형', '직사각형', '정사각형'],
    shapes: [
      { name: '직각삼각형', category: '직각삼각형', svg: '<polygon points="15,65 15,20 70,65" fill="#4ECDC4" stroke="#333" stroke-width="2"/><rect x="15" y="55" width="10" height="10" fill="none" stroke="#333" stroke-width="1.5"/>' },
      { name: '직각삼각형2', category: '직각삼각형', svg: '<polygon points="20,60 20,25 75,60" fill="#FFD93D" stroke="#333" stroke-width="2"/><rect x="20" y="50" width="10" height="10" fill="none" stroke="#333" stroke-width="1.5"/>' },
      { name: '직사각형', category: '직사각형', svg: '<rect x="10" y="18" width="65" height="40" fill="#4D96FF" stroke="#333" stroke-width="2"/>' },
      { name: '세로 직사각형', category: '직사각형', svg: '<rect x="22" y="8" width="35" height="60" fill="#FF6B6B" stroke="#333" stroke-width="2"/>' },
      { name: '정사각형', category: '정사각형', svg: '<rect x="17" y="15" width="50" height="50" fill="#6BCB77" stroke="#333" stroke-width="2"/>' },
      { name: '기울어진 정사각형', category: '정사각형', svg: '<polygon points="45,10 75,40 45,70 15,40" fill="#FFB347" stroke="#333" stroke-width="2"/>' },
    ]
  }
};

export class ShapeSortGame {
  constructor(level, conceptId) {
    this.level = level;
    this.conceptId = conceptId;
    this.container = null;
    this.engine = null;
    this.currentQ = null;
    this.shapeSet = SHAPE_SETS[this.level] || SHAPE_SETS[2];
  }

  async render(container) {
    this.container = container;
    this.engine = new GameEngine(this, {
      conceptId: this.conceptId,
      level: this.level,
      totalQuestions: Math.min(8, this.shapeSet.shapes.length)
    });
    this.engine.onComplete((summary) => this._showResult(summary));

    container.innerHTML = `
      <div class="game-screen">
        <div class="game-topbar">
          <button class="game-topbar__back" id="game-back">←</button>
          <div class="game-topbar__question" id="question-text">도형 분류 상자</div>
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

    // Shuffle shapes
    this._shuffledShapes = [...this.shapeSet.shapes].sort(() => Math.random() - 0.5);
    this._shapeIdx = 0;

    await this.engine.start();
  }

  generateQuestion() {
    if (this._shapeIdx >= this._shuffledShapes.length) {
      this._shapeIdx = 0;
      this._shuffledShapes.sort(() => Math.random() - 0.5);
    }

    const shape = this._shuffledShapes[this._shapeIdx++];
    this.currentQ = {
      shape,
      answer: shape.category,
      choices: this.shapeSet.categories
    };

    this._renderQuestion();
    return this.currentQ;
  }

  _renderQuestion() {
    const q = this.currentQ;
    const area = this.container.querySelector('#game-area');

    area.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-lg);">
        <div style="font-size: 1.1rem; font-weight: 700;">이 도형은 어디에 넣을까?</div>

        <!-- Shape display -->
        <div style="background: var(--bg-card); border-radius: var(--radius-lg); padding: var(--space-xl); box-shadow: var(--shadow-md);">
          <svg width="90" height="80" viewBox="0 0 90 80">
            ${q.shape.svg}
          </svg>
        </div>

        <div id="feedback-msg" class="encouragement" style="min-height: 1.5em;"></div>

        <!-- Category boxes -->
        <div style="display: flex; gap: var(--space-md); justify-content: center; flex-wrap: wrap;">
          ${q.choices.map(cat => `
            <button class="btn btn-outline category-box" data-answer="${cat}" style="min-width: 90px; min-height: 72px; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 16px; font-size: 0.95rem;">
              <span style="font-size: 1.5rem;">📦</span>
              <span style="font-weight: 700;">${cat}</span>
            </button>
          `).join('')}
        </div>
        <div id="hint-container"></div>
      </div>
    `;

    area.querySelectorAll('.category-box').forEach(btn => {
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
    const boxes = this.container.querySelectorAll('.category-box');

    if (isCorrect) {
      boxes.forEach(btn => {
        if (btn.dataset.answer === this.currentQ.answer) {
          btn.classList.add('correct');
          btn.style.borderColor = 'var(--color-success)';
          btn.style.background = '#e8faf5';
        }
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
    this.container.querySelectorAll('.category-box').forEach(b => {
      b.disabled = true;
      if (b.dataset.answer === question.answer) {
        b.style.borderColor = 'var(--color-success)';
        b.style.background = '#e8faf5';
      }
    });
    const hint = this.container.querySelector('#hint-container');
    const shape = question.shape;

    let reason = '';
    if (question.answer === '삼각형' || question.answer === '직각삼각형') reason = '변이 3개니까 삼각형!';
    else if (question.answer.includes('사각') || question.answer === '정사각형') reason = '변이 4개니까 사각형!';
    else if (question.answer === '원') reason = '둥그니까 원!';
    else if (question.answer === '구') reason = '둥글둥글 공 모양!';
    else if (question.answer === '직육면체') reason = '네모난 상자 모양!';
    else if (question.answer === '원기둥') reason = '둥근 기둥 모양!';
    else reason = `이건 ${question.answer}이야!`;

    hint.innerHTML = `<div class="hint-area">${reason}</div>`;
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
      icon: summary.accuracy >= 80 ? '📐' : '🔷',
      title: summary.accuracy >= 80 ? '도형 박사!' : '도형 분류 연습 잘했어!',
      retryHash: `/game/shape-sort/${this.level}?concept=${this.conceptId}`,
      conceptId: this.conceptId,
      gameType: 'shape-sort',
      level: this.level
    });
  }

  destroy() { this.container = null; }
}
