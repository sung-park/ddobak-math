/**
 * My Record Screen — learning stats and achievements
 */
import { masteryTracker, MasteryTracker } from '../engine/mastery-tracker.js';
import { rewardEngine } from '../engine/reward-engine.js';
import { storage } from '../engine/storage.js';

let conceptsData = null;

async function loadConcepts() {
  if (conceptsData) return conceptsData;
  const resp = await fetch('./data/concepts.json');
  conceptsData = await resp.json();
  return conceptsData;
}

export class MyRecordScreen {
  constructor() {
    this.container = null;
  }

  async render(container) {
    this.container = container;

    const data = await loadConcepts();
    const stats = await masteryTracker.getTodayStats();
    const balance = await rewardEngine.getBalance();
    const allMastery = await masteryTracker.getAllMastery();
    const coins = await storage.get('coins', 'default');

    // Build mastery display
    const masteryItems = allMastery
      .filter(m => m.total_attempts > 0)
      .sort((a, b) => b.mastery_level - a.mastery_level)
      .map(m => {
        const concept = data.concepts.find(c => c.id === m.concept_id);
        const grade = MasteryTracker.getGradeLabel(m.mastery_level);
        return { ...m, conceptName: concept ? concept.name : m.concept_id, grade };
      });

    container.innerHTML = `
      <div class="screen" style="padding-bottom: calc(var(--safe-bottom) + var(--space-lg))">
        <div class="top-bar">
          <button class="btn-ghost" id="record-back">← 뒤로</button>
          <div class="top-bar__title">나의 기록</div>
          <div></div>
        </div>

        <div style="padding: var(--space-lg);">
          <!-- Today's Summary -->
          <div class="card" style="margin-bottom: var(--space-lg); text-align: center;">
            <div class="text-lg" style="margin-bottom: var(--space-md);">오늘의 학습</div>
            <div style="display: flex; justify-content: space-around;">
              <div>
                <div class="text-xl" style="color: var(--color-primary-dark);">${stats.totalQuestions}</div>
                <div class="text-sm" style="color: var(--text-secondary);">문제</div>
              </div>
              <div>
                <div class="text-xl" style="color: var(--color-primary-dark);">${stats.accuracy}%</div>
                <div class="text-sm" style="color: var(--text-secondary);">정답률</div>
              </div>
              <div>
                <div class="text-xl" style="color: var(--color-primary-dark);">${stats.totalTimeMin}분</div>
                <div class="text-sm" style="color: var(--text-secondary);">학습 시간</div>
              </div>
            </div>
          </div>

          <!-- Coin Summary -->
          <div class="card" style="margin-bottom: var(--space-lg); display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div class="text-sm" style="color: var(--text-secondary);">총 모은 돈</div>
              <div class="text-lg">💰 ${coins ? coins.total_earned : 0}원</div>
            </div>
            <div>
              <div class="text-sm" style="color: var(--text-secondary);">현재 잔액</div>
              <div class="text-lg">💰 ${balance}원</div>
            </div>
          </div>

          <!-- Mastery List -->
          <div class="text-lg" style="margin-bottom: var(--space-md);">개념별 숙달도</div>

          ${masteryItems.length > 0 ? `
            <div class="mastery-list">
              ${masteryItems.map(item => `
                <div class="mastery-item">
                  <div style="font-size: 1.2rem;">${item.grade.icon}</div>
                  <div class="mastery-item__label">${item.conceptName}</div>
                  <div class="mastery-item__bar">
                    <div class="mastery-item__fill" style="width: ${item.mastery_level}%; background: ${item.mastery_level >= 86 ? 'var(--color-primary)' : item.mastery_level >= 61 ? 'var(--color-success)' : item.mastery_level >= 31 ? 'var(--color-warning)' : 'var(--color-error)'}"></div>
                  </div>
                  <div class="mastery-item__percent">${item.mastery_level}%</div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="empty-state">
              <div class="empty-state__icon">📊</div>
              <div>아직 학습 기록이 없어요.<br>문제를 풀면 여기에 기록돼요!</div>
            </div>
          `}
        </div>
      </div>
    `;

    container.querySelector('#record-back').addEventListener('click', () => {
      window.location.hash = '/';
    });
  }

  destroy() {
    this.container = null;
  }
}
