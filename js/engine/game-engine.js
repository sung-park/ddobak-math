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
}
