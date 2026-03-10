/**
 * Reward Engine — coin earning rules, abuse prevention, combos
 */
import { storage } from './storage.js';

const ENCOURAGEMENT_CORRECT = [
  '잘했어!', '대단해!', '맞았어! 👏', '멋져!', '정답이야!',
  '와, 똑똑한데?', '완벽해!', '최고야!'
];

const ENCOURAGEMENT_WRONG = [
  '괜찮아, 다시 해 보자!', '아깝다! 한 번 더!', '천천히 생각해 봐!',
  '거의 다 왔어!', '실수는 괜찮아!'
];

const ENCOURAGEMENT_GIVEUP = [
  '어려웠지? 정답을 보여줄게!', '다음에 또 나오면 맞출 수 있어!',
  '이건 좀 어려운 거야. 괜찮아!'
];

const COMBO_5 = '5연속 정답! 대단해! 🎉';
const COMBO_10 = '10연속! 수학 천재구나! 🌟';

export class RewardEngine {
  constructor() {
    this.userId = 'default';
    this.streak = 0; // current correct streak
    this.sessionEarned = 0;
    this.conceptStreaks = {}; // conceptId → consecutive correct count (for abuse detection)
  }

  /** Reset daily earnings if new day */
  async checkDailyReset() {
    const coins = await storage.get('coins', this.userId);
    if (!coins) return;

    const today = new Date().toDateString();
    if (coins.daily_date !== today) {
      coins.daily_earned = 0;
      coins.daily_date = today;
      await storage.put('coins', coins);
    }
  }

  /**
   * Calculate reward for answering a question
   * @returns {{ coins, message, isCombo, comboCount }}
   */
  async calculateReward(conceptId, isCorrect, attemptCount, hintUsed) {
    await this.checkDailyReset();

    const result = {
      coins: 0,
      message: '',
      isCombo: false,
      comboCount: 0,
      isNewHighStreak: false
    };

    if (!isCorrect) {
      this.streak = 0;
      result.message = this._randomMessage(ENCOURAGEMENT_WRONG);
      return result;
    }

    if (hintUsed || attemptCount > 2) {
      // Solved after hint/3+ attempts — no coins, but encouragement
      this.streak = 0;
      result.message = attemptCount > 2 ? this._randomMessage(ENCOURAGEMENT_GIVEUP) : this._randomMessage(ENCOURAGEMENT_CORRECT);
      return result;
    }

    // Correct on 1st or 2nd attempt — earn coins
    this.streak++;
    let earned = 1;

    // Abuse check: same concept streak
    if (!this.conceptStreaks[conceptId]) this.conceptStreaks[conceptId] = 0;
    this.conceptStreaks[conceptId]++;

    if (this.conceptStreaks[conceptId] > 20) {
      earned = 0;
      result.message = '이건 이제 완벽해! 새로운 도전을 해 볼까?';
    } else if (this.conceptStreaks[conceptId] > 10) {
      earned = 0; // Reduced to 0 after 10+ (simplified from 0.5)
      result.message = this._randomMessage(ENCOURAGEMENT_CORRECT);
    } else {
      result.message = this._randomMessage(ENCOURAGEMENT_CORRECT);
    }

    // Combo bonuses
    if (this.streak === 5) {
      earned += 2;
      result.isCombo = true;
      result.comboCount = 5;
      result.message = COMBO_5;
    } else if (this.streak === 10) {
      earned += 5;
      result.isCombo = true;
      result.comboCount = 10;
      result.message = COMBO_10;
    } else if (this.streak > 10 && this.streak % 10 === 0) {
      earned += 5;
      result.isCombo = true;
      result.comboCount = this.streak;
      result.message = `${this.streak}연속! 대단해! 🌟`;
    }

    // Daily limit check
    const coins = await storage.get('coins', this.userId);
    const dailyLimit = await storage.getSetting('daily_coin_limit', 50);

    if (coins && coins.daily_earned >= dailyLimit) {
      earned = 0;
      result.message = '오늘은 충분히 열심히 했어! 내일 또 하자!';
    }

    // Apply earnings
    if (earned > 0 && coins) {
      coins.balance += earned;
      coins.total_earned += earned;
      coins.daily_earned += earned;
      await storage.put('coins', coins);

      // Record transaction
      await storage.add('transactions', {
        user_id: this.userId,
        type: 'earn',
        amount: earned,
        source: conceptId,
        description: result.isCombo ? `${result.comboCount}연속 보너스 포함` : '정답 적립',
        created_at: Date.now()
      });
    }

    result.coins = earned;
    return result;
  }

  /** Award new-unit bonus (+3 coins) */
  async awardNewUnitBonus(conceptId) {
    const coins = await storage.get('coins', this.userId);
    if (!coins) return 0;

    const dailyLimit = await storage.getSetting('daily_coin_limit', 50);
    if (coins.daily_earned >= dailyLimit) return 0;

    const bonus = 3;
    coins.balance += bonus;
    coins.total_earned += bonus;
    coins.daily_earned += bonus;
    await storage.put('coins', coins);

    await storage.add('transactions', {
      user_id: this.userId,
      type: 'bonus',
      amount: bonus,
      source: conceptId,
      description: '새로운 단원 도전 보너스',
      created_at: Date.now()
    });

    return bonus;
  }

  /** Get current balance */
  async getBalance() {
    const coins = await storage.get('coins', this.userId);
    return coins ? coins.balance : 0;
  }

  /** Spend coins */
  async spendCoins(amount, itemName) {
    const coins = await storage.get('coins', this.userId);
    if (!coins || coins.balance < amount) return false;

    coins.balance -= amount;
    coins.total_spent += amount;
    await storage.put('coins', coins);

    await storage.add('transactions', {
      user_id: this.userId,
      type: 'spend',
      amount: -amount,
      source: itemName,
      description: `${itemName} 구매`,
      created_at: Date.now()
    });

    return true;
  }

  /** Reset concept streak when switching concepts */
  resetConceptStreak(conceptId) {
    if (conceptId) {
      delete this.conceptStreaks[conceptId];
    } else {
      this.conceptStreaks = {};
    }
  }

  _randomMessage(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}

export const rewardEngine = new RewardEngine();
