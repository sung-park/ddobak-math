/**
 * Game 6: Counting Farm — group & count objects by bundles
 *
 * Levels:
 *   1: 2개씩 묶기 (10개 이하)
 *   2: 5개씩 묶기 (25개 이하)
 *   3: 3,4개씩 묶기
 *   4: 다양한 묶음 + 곱셈식 완성
 */
import { GameEngine } from '../engine/game-engine.js';
import { rewardEngine } from '../engine/reward-engine.js';
import { soundManager } from '../engine/sound-manager.js';

const EMOJIS = ['🍎', '⭐', '🌸', '🐣', '🍊', '🦋'];

export class CountingFarmGame {
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
      icon: summary.accuracy >= 80 ? '🌾' : '🌱',
      title: summary.accuracy >= 80 ? '묶어 세기 천재!' : '잘했어! 연습하면 더 잘할 수 있어!',
      retryHash: `/game/counting-farm/${this.level}?concept=${this.conceptId}`,
      conceptId: this.conceptId,
      gameType: 'counting-farm',
      level: this.level
    });
  }
    container.innerHTML = `
      <div class="game-screen">
        <div class="game-topbar">
          <button class="game-topbar__back" id="game-back">←</button>
          <div class="game-topbar__question" id="question-text">묶어 세기 농장</div>
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
    let groupSize, numGroups;

    if (this.level === 1) {
      groupSize = 2;
      numGroups = randInt(2, 5);
    } else if (this.level === 2) {
      groupSize = 5;
      numGroups = randInt(2, 5);
    } else if (this.level === 3) {
      groupSize = [3, 4][Math.floor(Math.random() * 2)];
      numGroups = randInt(2, 5);
    } else {
      groupSize = randInt(2, 6);
      numGroups = randInt(2, 5);
    }

    const total = groupSize * numGroups;
    const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    const answer = total;

    const choices = this._generateChoices(total, groupSize, numGroups);

    this.currentQ = { groupSize, numGroups, total, emoji, answer, choices };
    this._renderQuestion();
    return this.currentQ;
  }

  _generateChoices(answer, groupSize, numGroups) {
    const wrongs = new Set();
    wrongs.add(groupSize * (numGroups + 1));
    wrongs.add(groupSize * (numGroups - 1));
    wrongs.add(answer + groupSize);
    wrongs.add(answer - groupSize);
    wrongs.add(answer + 1);
    wrongs.add(answer - 1);
    wrongs.delete(answer);

    const valid = [...wrongs].filter(w => w > 0 && w !== answer);
    const selected = valid.sort(() => Math.random() - 0.5).slice(0, 2);
    const choices = [answer, ...selected];
    return choices.sort(() => Math.random() - 0.5);
  }

  _renderQuestion() {
    const { groupSize, numGroups, total, emoji } = this.currentQ;
    const area = this.container.querySelector('#game-area');

    // Show items in groups
    const groups = [];
    for (let g = 0; g < numGroups; g++) {
      groups.push(Array(groupSize).fill(emoji).join(' '));
    }

    area.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-md); width: 100%;">
        <div style="font-size: 1.15rem; font-weight: 700; text-align: center;">
          ${emoji}을(를) ${groupSize}개씩 묶어 보세요!
        </div>

        <!-- Objects display -->
        <div style="display: flex; flex-wrap: wrap; gap: var(--space-md); justify-content: center; padding: var(--space-md);">
          ${groups.map((g, idx) => `
            <div style="display: flex; gap: 4px; padding: 10px 14px; border: 3px dashed var(--color-primary-light); border-radius: var(--radius-md); background: rgba(78,205,196,0.08); position: relative;">
              <div style="font-size: 1.5rem; letter-spacing: 4px;">${g}</div>
              <div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--color-primary); color: #fff; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 10px;">${groupSize * (idx + 1)}</div>
            </div>
          `).join('')}
        </div>

        ${this.level >= 4 ? `
          <div style="font-size: 1.1rem; font-weight: 600; color: var(--text-secondary);">
            ${numGroups}묶음 × ${groupSize}개 = ?
          </div>
        ` : ''}

        <div style="font-size: 1.15rem; font-weight: 700;">모두 몇 개일까요?</div>

        <div id="feedback-msg" class="encouragement" style="min-height: 1.5em;"></div>

        <div class="choices" id="choices-area">
          ${this.currentQ.choices.map(c => `
            <button class="choice-btn" data-answer="${c}" style="min-width: 72px; font-size: 1.4rem;">${c}</button>
          `).join('')}
        </div>
        <div id="hint-container"></div>
      </div>
    `;

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
      if (parseInt(b.dataset.answer) === answer) b.classList.add('correct');
    });
    const hint = this.container.querySelector('#hint-container');
    hint.innerHTML = `<div class="hint-area">${question.numGroups}묶음 × ${question.groupSize}개 = ${answer}개!<br>${Array(question.numGroups).fill(question.groupSize).join(' + ')} = ${answer}</div>`;
  }

  updateProgress(current, total) {
    const fill = this.container.querySelector('#progress-fill');
    const text = this.container.querySelector('#progress-text');
    if (fill) fill.style.width = `${(current / total) * 100}%`;
    if (text) text.textContent = `${current} / ${total}`;
  }

  _coinFly(n) { for (let i = 0; i < Math.min(n,3); i++) { setTimeout(() => { const el = document.createElement('div'); el.className='coin-fly'; el.textContent='💰'; el.style.left=`${50+(Math.random()*20-10)}%`; el.style.top='50%'; document.body.appendChild(el); setTimeout(()=>el.remove(),800); }, i*100); } }

  _showResult(summary) {
    this.container.innerHTML = `<div class="game-result"><div class="game-result__icon">${summary.accuracy>=80?'🌾':'🌱'}</div><div class="game-result__title">${summary.accuracy>=80?'묶어 세기 천재!':'잘했어! 연습하면 더 잘할 수 있어!'}</div><div class="game-result__stats"><div class="result-stat"><div class="result-stat__value">${summary.correctCount}/${summary.totalQuestions}</div><div class="result-stat__label">정답</div></div><div class="result-stat"><div class="result-stat__value">${summary.accuracy}%</div><div class="result-stat__label">정답률</div></div><div class="result-stat"><div class="result-stat__value">${summary.totalTimeFormatted}</div><div class="result-stat__label">시간</div></div></div><div class="game-result__coins">💰 현재 잔액: ${summary.balance}원</div><div class="game-result__actions"><button class="btn btn-primary btn-lg" id="result-retry">한 번 더!</button><button class="btn btn-outline" id="result-home">홈으로</button></div></div>`;
    this.container.querySelector('#result-retry').addEventListener('click', () => { window.location.hash=`/game/counting-farm/${this.level}?concept=${this.conceptId}`; window.dispatchEvent(new HashChangeEvent('hashchange')); });
    this.container.querySelector('#result-home').addEventListener('click', () => { window.location.hash='/'; });
  }

  destroy() { this.container = null; }
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
