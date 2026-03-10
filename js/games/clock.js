/**
 * Game 4: Clock — read and set clock times
 *
 * Levels:
 *   1: 정시 (몇 시)
 *   2: 30분 단위 (몇 시 30분)
 *   3: 5분 단위
 *   4: 1분 단위 + "몇 시간 뒤는?"
 */
import { GameEngine } from '../engine/game-engine.js';
import { rewardEngine } from '../engine/reward-engine.js';
import { soundManager } from '../engine/sound-manager.js';

export class ClockGame {
  constructor(level, conceptId) {
    this.level = level;
    this.conceptId = conceptId;
    this.container = null;
    this.engine = null;
    this.currentQ = null;
    this.recentQuestions = [];
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
          <div class="game-topbar__question" id="question-text">시계 맞추기</div>
          <div class="game-topbar__coins">💰 <span id="coin-count">0</span></div>
        </div>
        <div class="game-progress">
          <div class="game-progress__bar">
            <div class="game-progress__fill" id="progress-fill" style="width: 0%"></div>
          </div>
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
    let hour, minute;
    for (let i = 0; i < 50; i++) {
      hour = randInt(1, 12);
      if (this.level === 1) minute = 0;
      else if (this.level === 2) minute = Math.random() < 0.5 ? 0 : 30;
      else if (this.level === 3) minute = randInt(0, 11) * 5;
      else minute = randInt(0, 59);

      const key = `${hour}:${minute}`;
      if (!this.recentQuestions.includes(key)) {
        this.recentQuestions.push(key);
        if (this.recentQuestions.length > 5) this.recentQuestions.shift();
        break;
      }
    }

    // For level 4, sometimes ask "X시간 뒤" questions
    let questionType = 'read'; // 'read' = show clock, pick time | 'set' reserved for future
    let displayHour = hour;
    let displayMinute = minute;
    let questionText;

    if (this.level === 4 && Math.random() < 0.4) {
      // "몇 시간 뒤" question
      const addHours = randInt(1, 3);
      displayHour = hour;
      displayMinute = minute;
      const answerHour = ((hour + addHours - 1) % 12) + 1;
      questionText = `지금 ${hour}시 ${minute > 0 ? minute + '분' : ''}이에요. ${addHours}시간 뒤는 몇 시?`;
      hour = answerHour;
      minute = displayMinute;
      questionType = 'after';
    } else {
      questionText = '이 시계는 몇 시 몇 분일까요?';
    }

    const timeStr = minute === 0 ? `${hour}시` : `${hour}시 ${minute}분`;
    const choices = this._generateTimeChoices(hour, minute);

    this.currentQ = {
      hour, minute, displayHour: questionType === 'after' ? displayHour : hour,
      displayMinute: questionType === 'after' ? displayMinute : minute,
      answer: timeStr, answerIdx: hour * 100 + minute,
      choices, questionText, questionType
    };
    this._renderQuestion();
    return this.currentQ;
  }

  _generateTimeChoices(hour, minute) {
    const correct = minute === 0 ? `${hour}시` : `${hour}시 ${minute}분`;
    const wrongs = new Set();

    // Wrong hour
    const h2 = (hour % 12) + 1;
    wrongs.add(minute === 0 ? `${h2}시` : `${h2}시 ${minute}분`);
    // Swap hour/minute confusion
    if (minute > 0 && minute <= 12) {
      wrongs.add(`${minute}시 ${hour * 5}분`);
    }
    // Off by 5 min
    if (minute >= 5) wrongs.add(`${hour}시 ${minute - 5}분`);
    wrongs.add(`${hour}시 ${minute + 5}분`);
    // Off by 1 hour
    const h3 = hour === 12 ? 1 : hour + 1;
    wrongs.add(minute === 0 ? `${h3}시` : `${h3}시 ${minute}분`);

    wrongs.delete(correct);
    const validWrongs = [...wrongs].slice(0, 2);

    while (validWrongs.length < 2) {
      const rh = randInt(1, 12);
      const rm = this.level <= 2 ? (Math.random() < 0.5 ? 0 : 30) : randInt(0, 11) * 5;
      const str = rm === 0 ? `${rh}시` : `${rh}시 ${rm}분`;
      if (str !== correct && !validWrongs.includes(str)) validWrongs.push(str);
    }

    const all = [correct, ...validWrongs.slice(0, 2)];
    return all.sort(() => Math.random() - 0.5);
  }

  _renderQuestion() {
    const q = this.currentQ;
    const area = this.container.querySelector('#game-area');
    this.container.querySelector('#question-text').textContent = '시계 맞추기';

    // Calculate hand angles
    const h = q.displayHour % 12;
    const m = q.displayMinute;
    const minuteAngle = m * 6; // 360/60
    const hourAngle = h * 30 + m * 0.5; // 360/12 + minute offset

    area.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-lg);">
        <div style="font-size: 1.1rem; font-weight: 600; text-align: center; padding: 0 var(--space-md);">
          ${q.questionText}
        </div>

        <!-- Clock face -->
        <div class="clock-container">
          <div class="clock-face">
            ${[1,2,3,4,5,6,7,8,9,10,11,12].map(n => {
              const angle = (n * 30 - 90) * Math.PI / 180;
              const r = 100;
              const x = 130 + r * Math.cos(angle);
              const y = 130 + r * Math.sin(angle);
              return `<div class="clock-number" style="left:${x}px;top:${y}px;">${n}</div>`;
            }).join('')}
            <div class="clock-hand clock-hand--hour" style="transform: rotate(${hourAngle}deg);"></div>
            <div class="clock-hand clock-hand--minute" style="transform: rotate(${minuteAngle}deg);"></div>
            <div class="clock-center"></div>
          </div>
        </div>

        <div id="feedback-msg" class="encouragement" style="min-height: 2em;"></div>

        <div class="choices" id="choices-area">
          ${q.choices.map(c => `
            <button class="choice-btn" data-answer="${c}" style="min-width: 100px; font-size: 1.1rem;">${c}</button>
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
    const choices = this.container.querySelectorAll('.choice-btn');
    choices.forEach(btn => {
      btn.disabled = true;
      if (btn.dataset.answer === question.answer) btn.classList.add('correct');
    });
    const hint = this.container.querySelector('#hint-container');
    hint.innerHTML = `<div class="hint-area">정답은 <strong>${question.answer}</strong>이야!<br>짧은 바늘이 ${question.displayHour}, 긴 바늘이 ${question.displayMinute === 0 ? '12' : question.displayMinute / 5}를 가리켜요.</div>`;
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
        el.className = 'coin-fly';
        el.textContent = '💰';
        el.style.left = `${50 + (Math.random() * 20 - 10)}%`;
        el.style.top = '50%';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 800);
      }, i * 100);
    }
  }

  _showResult(summary) {
    GameEngine.renderResult(this.container, summary, {
      icon: summary.accuracy >= 80 ? '🕐' : '⏰',
      title: summary.accuracy >= 80 ? '시계 박사!' : '시계 읽기 연습 잘했어!',
      retryHash: `/game/clock/${this.level}?concept=${this.conceptId}`,
      conceptId: this.conceptId,
      gameType: 'clock',
      level: this.level
    });
  }

  destroy() { this.container = null; }
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
