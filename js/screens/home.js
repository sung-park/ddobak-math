/**
 * Home Screen
 */
import { rewardEngine } from '../engine/reward-engine.js';
import { masteryTracker } from '../engine/mastery-tracker.js';
import { soundManager } from '../engine/sound-manager.js';

export class HomeScreen {
  constructor() {
    this.container = null;
  }

  async render(container) {
    this.container = container;

    const balance = await rewardEngine.getBalance();
    const stats = await masteryTracker.getTodayStats();

    container.innerHTML = `
      <div class="home screen">
        <div class="home__header">
          <div class="home__greeting">안녕! 오늘도 같이 공부하자</div>
          <div class="home__name">또박또박 수학</div>
          <div class="home__coins-bar">
            💰 <span id="home-balance">${balance}원</span>
          </div>
        </div>

        <div class="home__stats">
          <div class="stat-chip">
            <div class="stat-chip__value">${stats.totalQuestions}</div>
            <div class="stat-chip__label">오늘 문제</div>
          </div>
          <div class="stat-chip">
            <div class="stat-chip__value">${stats.accuracy}%</div>
            <div class="stat-chip__label">정답률</div>
          </div>
          <div class="stat-chip">
            <div class="stat-chip__value">${stats.totalTimeMin}분</div>
            <div class="stat-chip__label">학습 시간</div>
          </div>
        </div>

        <div class="home__menu">
          <button class="menu-card menu-card--daily" data-navigate="/daily">
            <span class="menu-card__icon">🎯</span>
            <div>
              <div class="menu-card__label">오늘의 추천</div>
              <div class="menu-card__sub">나에게 맞는 문제 풀기</div>
            </div>
          </button>

          <button class="menu-card" data-navigate="/learn">
            <span class="menu-card__icon">📚</span>
            <span class="menu-card__label">학습하기</span>
          </button>

          <button class="menu-card" data-navigate="/shop">
            <span class="menu-card__icon">🏪</span>
            <span class="menu-card__label">과자 가게</span>
          </button>

          <button class="menu-card" data-navigate="/record">
            <span class="menu-card__icon">🏆</span>
            <span class="menu-card__label">나의 기록</span>
          </button>

          <button class="menu-card" data-navigate="/settings">
            <span class="menu-card__icon">⚙️</span>
            <span class="menu-card__label">설정</span>
          </button>
        </div>
      </div>
    `;

    // Navigation handlers
    container.querySelectorAll('[data-navigate]').forEach(btn => {
      btn.addEventListener('click', () => {
        soundManager.play('tap');
        window.location.hash = btn.dataset.navigate;
      });
    });

    // Init sound on first touch
    container.addEventListener('click', () => {
      soundManager.init();
    }, { once: true });
  }

  destroy() {
    this.container = null;
  }
}
