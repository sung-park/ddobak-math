/**
 * Game 12: Bar Graph — read and interpret bar graphs
 *
 * Levels:
 *   1: 그래프 읽기 (가장 많은/적은 것)
 *   2: 그래프에서 값 읽기
 *   3: 표 → 그래프 완성 (빈칸 채우기)
 *   4: 그래프 비교 + 합계/차이 계산
 */
import { GameEngine } from '../engine/game-engine.js';
import { rewardEngine } from '../engine/reward-engine.js';
import { soundManager } from '../engine/sound-manager.js';

const THEMES = [
  { title: '좋아하는 과일', items: ['사과', '바나나', '포도', '딸기', '수박'], colors: ['#FF6B6B', '#FFD93D', '#9B59B6', '#E74C3C', '#2ECC71'] },
  { title: '좋아하는 동물', items: ['강아지', '고양이', '토끼', '햄스터', '물고기'], colors: ['#CD7F32', '#FFB347', '#F5F5DC', '#FFD700', '#4D96FF'] },
  { title: '좋아하는 계절', items: ['봄', '여름', '가을', '겨울'], colors: ['#FF69B4', '#4ECDC4', '#FF8C42', '#87CEEB'] },
  { title: '좋아하는 운동', items: ['축구', '달리기', '수영', '줄넘기'], colors: ['#2ECC71', '#E67E22', '#3498DB', '#E74C3C'] }
];

export class BarGraphGame {
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
      icon: summary.accuracy >= 80 ? '📊' : '📈',
      title: summary.accuracy >= 80 ? '그래프 박사!' : '그래프 읽기 잘했어!',
      retryHash: `/game/bar-graph/${this.level}?concept=${this.conceptId}`,
      conceptId: this.conceptId,
      gameType: 'bar-graph',
      level: this.level
    });
  }
    container.innerHTML = `
      <div class="game-screen">
        <div class="game-topbar">
          <button class="game-topbar__back" id="game-back">←</button>
          <div class="game-topbar__question" id="question-text">그래프 읽기</div>
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
    const theme = THEMES[randInt(0, THEMES.length - 1)];
    const count = this.level <= 2 ? Math.min(4, theme.items.length) : theme.items.length;
    const items = theme.items.slice(0, count);
    const colors = theme.colors.slice(0, count);
    const maxVal = this.level <= 2 ? 8 : 12;
    const values = items.map(() => randInt(1, maxVal));

    // Ensure at least one unique max and min
    const maxIdx = randInt(0, items.length - 1);
    values[maxIdx] = maxVal;
    let minIdx = (maxIdx + 1) % items.length;
    values[minIdx] = 1;

    if (this.level === 1) {
      return this._generateMaxMinQuestion(theme.title, items, values, colors);
    } else if (this.level === 2) {
      return this._generateReadValueQuestion(theme.title, items, values, colors);
    } else if (this.level === 3) {
      return this._generateFillQuestion(theme.title, items, values, colors);
    } else {
      return this._generateCalcQuestion(theme.title, items, values, colors);
    }
  }

  _generateMaxMinQuestion(title, items, values, colors) {
    const isMax = Math.random() < 0.5;
    const targetVal = isMax ? Math.max(...values) : Math.min(...values);
    const targetIdx = values.indexOf(targetVal);
    const questionText = isMax ? '가장 많은 것은?' : '가장 적은 것은?';
    const answer = items[targetIdx];
    const wrongs = items.filter(it => it !== answer).sort(() => Math.random() - 0.5).slice(0, 2);
    const choices = [answer, ...wrongs].sort(() => Math.random() - 0.5);

    this.currentQ = { title, items, values, colors, questionText, answer, choices, graphType: 'full' };
    this._renderQuestion();
    return this.currentQ;
  }

  _generateReadValueQuestion(title, items, values, colors) {
    const idx = randInt(0, items.length - 1);
    const questionText = `'${items[idx]}'은(는) 몇 명?`;
    const answer = `${values[idx]}명`;

    const wrongs = new Set();
    wrongs.add(`${values[idx] + 1}명`);
    wrongs.add(`${values[idx] - 1}명`);
    wrongs.add(`${values[idx] + 2}명`);
    wrongs.delete(answer);
    const valid = [...wrongs].filter(w => parseInt(w) > 0).slice(0, 2);
    const choices = [answer, ...valid].sort(() => Math.random() - 0.5);

    this.currentQ = { title, items, values, colors, questionText, answer, choices, graphType: 'full', targetIdx: idx };
    this._renderQuestion();
    return this.currentQ;
  }

  _generateFillQuestion(title, items, values, colors) {
    const hideIdx = randInt(0, items.length - 1);
    const questionText = `'${items[hideIdx]}'의 막대를 완성하면?`;
    const answer = `${values[hideIdx]}`;

    const wrongs = new Set();
    wrongs.add(`${values[hideIdx] + 1}`);
    wrongs.add(`${values[hideIdx] - 1}`);
    wrongs.add(`${values[hideIdx] + 2}`);
    wrongs.delete(answer);
    const valid = [...wrongs].filter(w => parseInt(w) > 0).slice(0, 2);
    const choices = [answer, ...valid].sort(() => Math.random() - 0.5);

    this.currentQ = { title, items, values, colors, questionText, answer, choices, graphType: 'hide', hideIdx };
    this._renderQuestion();
    return this.currentQ;
  }

  _generateCalcQuestion(title, items, values, colors) {
    const type = Math.random() < 0.5 ? 'sum' : 'diff';
    let questionText, answer;

    if (type === 'sum') {
      const i1 = randInt(0, items.length - 1);
      let i2 = randInt(0, items.length - 1);
      while (i2 === i1) i2 = randInt(0, items.length - 1);
      const sum = values[i1] + values[i2];
      questionText = `'${items[i1]}'과 '${items[i2]}'의 합은?`;
      answer = `${sum}명`;
    } else {
      const maxVal = Math.max(...values);
      const minVal = Math.min(...values);
      const diff = maxVal - minVal;
      questionText = `가장 많은 것과 적은 것의 차이는?`;
      answer = `${diff}명`;
    }

    const wrongs = new Set();
    const num = parseInt(answer);
    wrongs.add(`${num + 1}명`);
    wrongs.add(`${num - 1}명`);
    wrongs.add(`${num + 2}명`);
    wrongs.delete(answer);
    const valid = [...wrongs].filter(w => parseInt(w) > 0).slice(0, 2);
    const choices = [answer, ...valid].sort(() => Math.random() - 0.5);

    this.currentQ = { title, items, values, colors, questionText, answer, choices, graphType: 'full' };
    this._renderQuestion();
    return this.currentQ;
  }

  _renderQuestion() {
    const q = this.currentQ;
    const area = this.container.querySelector('#game-area');
    const maxVal = Math.max(...q.values);
    const barMaxH = 120;
    const barW = Math.min(40, Math.floor(260 / q.items.length));
    const gap = Math.min(16, Math.floor(80 / q.items.length));
    const graphW = q.items.length * (barW + gap) + 40;

    // Build bars SVG
    let bars = '';
    // Y axis
    bars += `<line x1="30" y1="10" x2="30" y2="${barMaxH + 15}" stroke="#666" stroke-width="1.5"/>`;
    // Grid lines + labels
    const step = maxVal <= 5 ? 1 : 2;
    for (let v = 0; v <= maxVal; v += step) {
      const y = barMaxH + 10 - (v / maxVal) * barMaxH;
      bars += `<line x1="28" y1="${y}" x2="${graphW}" y2="${y}" stroke="#eee" stroke-width="0.8"/>`;
      bars += `<text x="22" y="${y + 4}" text-anchor="end" font-size="10" fill="#666">${v}</text>`;
    }
    // X axis
    bars += `<line x1="30" y1="${barMaxH + 10}" x2="${graphW}" y2="${barMaxH + 10}" stroke="#666" stroke-width="1.5"/>`;

    q.items.forEach((item, i) => {
      const x = 40 + i * (barW + gap);
      const h = (q.values[i] / maxVal) * barMaxH;
      const y = barMaxH + 10 - h;
      const isHidden = q.graphType === 'hide' && i === q.hideIdx;

      if (isHidden) {
        bars += `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="3" fill="none" stroke="${q.colors[i]}" stroke-width="2" stroke-dasharray="4,3"/>`;
        bars += `<text x="${x + barW / 2}" y="${y - 4}" text-anchor="middle" font-size="11" fill="#999">?</text>`;
      } else {
        bars += `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="3" fill="${q.colors[i]}" opacity="0.85"/>`;
        bars += `<text x="${x + barW / 2}" y="${y - 4}" text-anchor="middle" font-size="10" font-weight="700" fill="#333">${q.values[i]}</text>`;
      }
      bars += `<text x="${x + barW / 2}" y="${barMaxH + 24}" text-anchor="middle" font-size="9" fill="#333">${item}</text>`;
    });

    const svgH = barMaxH + 35;

    area.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-md); width: 100%; max-width: 400px; margin: 0 auto;">
        <div style="font-size: 1rem; font-weight: 700; color: var(--text-secondary);">${q.title}</div>

        <div style="background: var(--bg-card); border-radius: var(--radius-lg); padding: var(--space-md); box-shadow: var(--shadow-sm); overflow-x: auto; width: 100%;">
          <svg width="${graphW + 10}" height="${svgH}" viewBox="0 0 ${graphW + 10} ${svgH}" style="display: block; margin: 0 auto;">
            ${bars}
          </svg>
          <div style="text-align: center; font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">(명)</div>
        </div>

        <div style="font-size: 1.1rem; font-weight: 700; text-align: center;">${q.questionText}</div>
        <div id="feedback-msg" class="encouragement" style="min-height: 1.5em;"></div>
        <div class="choices" id="choices-area">
          ${q.choices.map(c => `<button class="choice-btn" data-answer="${c}" style="min-width: 80px; font-size: 1.2rem;">${c}</button>`).join('')}
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
    const vals = question.items.map((item, i) => `${item}: ${question.values[i]}명`).join(', ');
    hint.innerHTML = `<div class="hint-area">그래프를 읽어 보면:<br>${vals}<br>정답: ${question.answer}</div>`;
  }

  updateProgress(current, total) {
    const fill = this.container.querySelector('#progress-fill');
    const text = this.container.querySelector('#progress-text');
    if (fill) fill.style.width = `${(current / total) * 100}%`;
    if (text) text.textContent = `${current} / ${total}`;
  }

  _coinFly(n) { for(let i=0;i<Math.min(n,3);i++){setTimeout(()=>{const el=document.createElement('div');el.className='coin-fly';el.textContent='💰';el.style.left=`${50+(Math.random()*20-10)}%`;el.style.top='50%';document.body.appendChild(el);setTimeout(()=>el.remove(),800);},i*100);} }

  _showResult(summary) {
    this.container.innerHTML = `<div class="game-result"><div class="game-result__icon">${summary.accuracy>=80?'📊':'📈'}</div><div class="game-result__title">${summary.accuracy>=80?'그래프 박사!':'그래프 읽기 잘했어!'}</div><div class="game-result__stats"><div class="result-stat"><div class="result-stat__value">${summary.correctCount}/${summary.totalQuestions}</div><div class="result-stat__label">정답</div></div><div class="result-stat"><div class="result-stat__value">${summary.accuracy}%</div><div class="result-stat__label">정답률</div></div><div class="result-stat"><div class="result-stat__value">${summary.totalTimeFormatted}</div><div class="result-stat__label">시간</div></div></div><div class="game-result__coins">💰 현재 잔액: ${summary.balance}원</div><div class="game-result__actions"><button class="btn btn-primary btn-lg" id="result-retry">한 번 더!</button><button class="btn btn-outline" id="result-home">홈으로</button></div></div>`;
    this.container.querySelector('#result-retry').addEventListener('click', () => { window.location.hash=`/game/bar-graph/${this.level}?concept=${this.conceptId}`; window.dispatchEvent(new HashChangeEvent('hashchange')); });
    this.container.querySelector('#result-home').addEventListener('click', () => { window.location.hash='/'; });
  }

  destroy() { this.container = null; }
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
