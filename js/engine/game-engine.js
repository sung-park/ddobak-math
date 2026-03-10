/**
 * Game Engine — orchestrates the question loop, feedback, and scoring
 */
import { rewardEngine } from './reward-engine.js';
import { masteryTracker } from './mastery-tracker.js';
import { soundManager } from './sound-manager.js';
import { storage } from './storage.js';

export class GameEngine {
  /**
   * @param {object} game - Game module instance (must implement GameBase interface)
   * @param {object} options - { conceptId, level, totalQuestions }
   */
  constructor(game, options = {}) {
    this.game = game;
    this.conceptId = options.conceptId || 'unknown';
    this.level = options.level || 1;
    this.totalQuestions = options.totalQuestions || 8;
    this.currentQuestion = 0;
    this.correctCount = 0;
    this.attemptCount = 0;
    this.hintUsed = false;
    this.startTime = 0;
    this.questionStartTime = 0;
    this.results = [];
    this.isFinished = false;
    this._onComplete = null;
  }

  /** Set completion callback */
  onComplete(callback) {
    this._onComplete = callback;
  }

  /** Start the game */
  async start() {
    this.startTime = Date.now();
    await soundManager.init();
    await soundManager.resume();
    this.nextQuestion();
  }

  /** Advance to next question */
  nextQuestion() {
    if (this.currentQuestion >= this.totalQuestions) {
      this.finish();
      return;
    }

    this.attemptCount = 0;
    this.hintUsed = false;
    this.questionStartTime = Date.now();

    const question = this.game.generateQuestion();
    this.currentQuestionData = question;
    this.currentQuestion++;

    // Update progress UI
    if (this.game.updateProgress) {
      this.game.updateProgress(this.currentQuestion, this.totalQuestions);
    }
  }

  /**
   * Handle user's answer
   * @param {*} userAnswer
   */
  async submitAnswer(userAnswer) {
    if (this.isFinished) return;

    this.attemptCount++;
    const result = this.game.checkAnswer(userAnswer);
    const isCorrect = result.isCorrect;
    const timeSpent = Date.now() - this.questionStartTime;

    if (isCorrect) {
      this.correctCount++;
      soundManager.play('correct');

      // Calculate reward
      const reward = await rewardEngine.calculateReward(
        this.conceptId, true, this.attemptCount, this.hintUsed
      );

      // Track mastery
      await masteryTracker.recordAttempt(this.conceptId, true);

      // Log play
      await this._logPlay(true, timeSpent);

      // Show feedback
      await this.game.showFeedback(true, reward);

      // Record result
      this.results.push({ correct: true, attempts: this.attemptCount, timeMs: timeSpent });

      // Next question after delay
      setTimeout(() => this.nextQuestion(), 1200);

    } else {
      soundManager.play('wrong');

      if (this.attemptCount >= 3) {
        // 3 strikes — show hint and move on
        this.hintUsed = true;
        await masteryTracker.recordAttempt(this.conceptId, false);
        await this._logPlay(false, timeSpent);

        const reward = await rewardEngine.calculateReward(
          this.conceptId, false, this.attemptCount, true
        );

        this.results.push({ correct: false, attempts: this.attemptCount, timeMs: timeSpent });

        await this.game.showHint(this.currentQuestionData, this.currentQuestionData.answer);

        setTimeout(() => this.nextQuestion(), 3000);
      } else {
        // Show wrong feedback, let them retry
        await this.game.showFeedback(false, { message: this._getWrongHint(this.attemptCount), coins: 0 });
      }
    }
  }

  /** Get progressive wrong hints */
  _getWrongHint(attempt) {
    if (attempt === 1) return '다시 생각해 볼까?';
    return '한 번 더! 천천히 생각해 봐!';
  }

  /** Log play to IndexedDB */
  async _logPlay(isCorrect, timeSpent) {
    await storage.add('play_logs', {
      user_id: 'default',
      game_type: this.game.constructor.name,
      concept_id: this.conceptId,
      level: this.level,
      question_data: JSON.stringify(this.currentQuestionData),
      answer: this.currentQuestionData?.answer,
      is_correct: isCorrect,
      attempt_count: this.attemptCount,
      hint_used: this.hintUsed,
      time_spent_ms: timeSpent,
      earned_coins: 0,
      played_at: Date.now()
    });
  }

  /** Finish the game */
  async finish() {
    this.isFinished = true;
    soundManager.play('complete');

    const totalTime = Date.now() - this.startTime;
    const accuracy = this.totalQuestions > 0
      ? Math.round((this.correctCount / this.totalQuestions) * 100) : 0;

    const balance = await rewardEngine.getBalance();

    const summary = {
      totalQuestions: this.totalQuestions,
      correctCount: this.correctCount,
      accuracy,
      totalTimeMs: totalTime,
      totalTimeFormatted: this._formatTime(totalTime),
      balance,
      results: this.results
    };

    if (this._onComplete) {
      this._onComplete(summary);
    }
  }

  _formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes > 0 ? `${minutes}분 ${secs}초` : `${secs}초`;
  }

  /**
   * Render a standard result screen with "다음 게임" support
   * @param {HTMLElement} container
   * @param {object} summary
   * @param {object} opts - { icon, title, retryHash }
   */
  static async renderResult(container, summary, opts) {
    const nextGame = await GameEngine.findNextGame(opts.conceptId, opts.gameType, opts.level);

    container.innerHTML = `
      <div class="game-result">
        <div class="game-result__icon">${opts.icon || (summary.accuracy >= 80 ? '🎉' : '💪')}</div>
        <div class="game-result__title">${opts.title || (summary.accuracy >= 80 ? '잘했어!' : '연습 잘했어!')}</div>
        <div class="game-result__stats">
          <div class="result-stat"><div class="result-stat__value">${summary.correctCount}/${summary.totalQuestions}</div><div class="result-stat__label">정답</div></div>
          <div class="result-stat"><div class="result-stat__value">${summary.accuracy}%</div><div class="result-stat__label">정답률</div></div>
          <div class="result-stat"><div class="result-stat__value">${summary.totalTimeFormatted}</div><div class="result-stat__label">시간</div></div>
        </div>
        <div class="game-result__coins">💰 현재 잔액: ${summary.balance}원</div>
        <div class="game-result__actions">
          <button class="btn btn-primary btn-lg" id="result-retry">한 번 더!</button>
          ${nextGame ? `<button class="btn btn-primary btn-lg" id="result-next" style="background: var(--color-success);">다음 게임 →</button>` : ''}
          <button class="btn btn-outline" id="result-back">학습 목록</button>
        </div>
        ${nextGame ? `<div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 8px;">다음: ${nextGame.label}</div>` : ''}
      </div>
    `;

    container.querySelector('#result-retry').addEventListener('click', () => {
      window.location.hash = opts.retryHash;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    container.querySelector('#result-back').addEventListener('click', () => {
      window.location.hash = '/learn';
    });
    if (nextGame) {
      container.querySelector('#result-next').addEventListener('click', () => {
        window.location.hash = nextGame.hash;
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
    }
  }

  /**
   * Find the next game to play after the current one
   */
  static async findNextGame(conceptId, currentGameType, currentLevel) {
    try {
      const resp = await fetch('./data/concepts.json');
      const data = await resp.json();
      const concepts = data.concepts;
      const idx = concepts.findIndex(c => c.id === conceptId);
      if (idx === -1) return null;

      const concept = concepts[idx];
      const GAME_NAMES = {
        'block-calc': '블록 계산기', 'matrix': '구구단', 'number-line': '수 직선',
        'clock': '시계', 'coins': '동전 모으기', 'counting-farm': '묶어 세기',
        'scale': '크기 비교', 'pizza': '피자 분수', 'shape-sort': '도형 분류',
        'division-tree': '나눗셈', 'ruler': '길이 재기', 'bar-graph': '그래프', 'pattern': '규칙 찾기'
      };

      // 1) Same concept, next level of same game
      const gameEntry = concept.games.find(g => g.type === currentGameType);
      if (gameEntry) {
        const lvIdx = gameEntry.levels.indexOf(currentLevel);
        if (lvIdx !== -1 && lvIdx < gameEntry.levels.length - 1) {
          const nextLv = gameEntry.levels[lvIdx + 1];
          return {
            hash: `/game/${currentGameType}/${nextLv}?concept=${conceptId}`,
            label: `${GAME_NAMES[currentGameType] || currentGameType} Lv.${nextLv}`
          };
        }
      }

      // 2) Same concept, next different game
      const gameIdx = concept.games.findIndex(g => g.type === currentGameType);
      if (gameIdx !== -1 && gameIdx < concept.games.length - 1) {
        const nextG = concept.games[gameIdx + 1];
        return {
          hash: `/game/${nextG.type}/${nextG.levels[0]}?concept=${conceptId}`,
          label: `${GAME_NAMES[nextG.type] || nextG.type} Lv.${nextG.levels[0]}`
        };
      }

      // 3) Next concept's first game
      if (idx < concepts.length - 1) {
        const nextConcept = concepts[idx + 1];
        if (nextConcept.games.length > 0) {
          const g = nextConcept.games[0];
          return {
            hash: `/game/${g.type}/${g.levels[0]}?concept=${nextConcept.id}`,
            label: `${nextConcept.name} — ${GAME_NAMES[g.type] || g.type}`
          };
        }
      }

      return null;
    } catch (e) {
      return null;
    }
  }
}
