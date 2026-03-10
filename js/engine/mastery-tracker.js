/**
 * Mastery Tracker — tracks per-concept proficiency
 */
import { storage } from './storage.js';

export class MasteryTracker {
  constructor(userId = 'default') {
    this.userId = userId;
  }

  /**
   * Update mastery after answering a question
   */
  async recordAttempt(conceptId, isCorrect) {
    let mastery = await storage.get('mastery', [this.userId, conceptId]);

    if (!mastery) {
      mastery = {
        user_id: this.userId,
        concept_id: conceptId,
        total_attempts: 0,
        correct_count: 0,
        current_streak: 0,
        recent_results: [], // last 20 results (boolean array)
        mastery_level: 0,
        last_played_at: Date.now()
      };
    }

    mastery.total_attempts++;
    if (isCorrect) {
      mastery.correct_count++;
      mastery.current_streak++;
    } else {
      mastery.current_streak = 0;
    }

    // Track recent results (last 20)
    mastery.recent_results.push(isCorrect);
    if (mastery.recent_results.length > 20) {
      mastery.recent_results.shift();
    }

    // Calculate mastery level
    mastery.mastery_level = this._calculateLevel(mastery);
    mastery.last_played_at = Date.now();

    await storage.put('mastery', mastery);
    return mastery;
  }

  /**
   * Calculate mastery level (0-100)
   *
   * Formula:
   *   (recent 20 accuracy × 0.6) + (overall accuracy × 0.2) + (streak bonus × 0.2)
   */
  _calculateLevel(mastery) {
    const recentResults = mastery.recent_results;
    const recentCorrect = recentResults.filter(Boolean).length;
    const recentAccuracy = recentResults.length > 0 ? recentCorrect / recentResults.length : 0;

    const overallAccuracy = mastery.total_attempts > 0
      ? mastery.correct_count / mastery.total_attempts
      : 0;

    // Streak bonus: caps at 10 streak = 100%
    const streakBonus = Math.min(mastery.current_streak / 10, 1);

    const level = Math.round(
      (recentAccuracy * 0.6 + overallAccuracy * 0.2 + streakBonus * 0.2) * 100
    );

    return Math.min(level, 100);
  }

  /** Get mastery for a specific concept */
  async getMastery(conceptId) {
    return storage.get('mastery', [this.userId, conceptId]);
  }

  /** Get all mastery records for this user */
  async getAllMastery() {
    return storage.getAll('mastery', 'user_id', IDBKeyRange.only(this.userId));
  }

  /** Get weak concepts (mastery < 60, attempts >= 10) */
  async getWeakConcepts() {
    const all = await this.getAllMastery();
    return all.filter(m => m.mastery_level < 60 && m.total_attempts >= 10)
      .sort((a, b) => a.mastery_level - b.mastery_level);
  }

  /**
   * Get mastery grade label
   */
  static getGradeLabel(level) {
    if (level >= 86) return { label: '마스터', icon: '⭐' };
    if (level >= 61) return { label: '숙련', icon: '🌳' };
    if (level >= 31) return { label: '성장', icon: '🌿' };
    return { label: '입문', icon: '🌱' };
  }

  /**
   * Get today's learning stats
   */
  async getTodayStats() {
    const allLogs = await storage.getAll('play_logs', 'user_id', IDBKeyRange.only(this.userId));
    const today = new Date().toDateString();
    const todayLogs = allLogs.filter(l => new Date(l.played_at).toDateString() === today);

    const totalQuestions = todayLogs.length;
    const correctCount = todayLogs.filter(l => l.is_correct).length;
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const totalTimeMs = todayLogs.reduce((sum, l) => sum + (l.time_spent_ms || 0), 0);
    const totalTimeMin = Math.round(totalTimeMs / 60000);

    return {
      totalQuestions,
      correctCount,
      accuracy,
      totalTimeMin
    };
  }
}

export const masteryTracker = new MasteryTracker();
