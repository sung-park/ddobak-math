/**
 * Daily Pick — recommends problems based on weak areas
 */
import { masteryTracker } from '../engine/mastery-tracker.js';
import { soundManager } from '../engine/sound-manager.js';

let conceptsData = null;

async function loadConcepts() {
  if (conceptsData) return conceptsData;
  const resp = await fetch('./data/concepts.json');
  conceptsData = await resp.json();
  return conceptsData;
}

export class DailyPickScreen {
  constructor() {
    this.container = null;
  }

  async render(container) {
    this.container = container;

    const data = await loadConcepts();
    const weakConcepts = await masteryTracker.getWeakConcepts();
    const allMastery = await masteryTracker.getAllMastery();

    // Build recommendation list
    let recommendations = [];

    // 1. Weak areas first
    for (const weak of weakConcepts.slice(0, 3)) {
      const concept = data.concepts.find(c => c.id === weak.concept_id);
      if (concept && concept.games.length > 0) {
        recommendations.push({
          concept,
          mastery: weak.mastery_level,
          reason: '취약 영역'
        });
      }
    }

    // 2. Fill with playable concepts that haven't been mastered
    if (recommendations.length < 3) {
      const playable = data.concepts.filter(c => c.games.length > 0);
      for (const concept of playable) {
        if (recommendations.find(r => r.concept.id === concept.id)) continue;
        const m = allMastery.find(a => a.concept_id === concept.id);
        const level = m ? m.mastery_level : 0;
        if (level < 86) {
          recommendations.push({ concept, mastery: level, reason: level === 0 ? '새로운 도전' : '연습하기' });
        }
        if (recommendations.length >= 5) break;
      }
    }

    container.innerHTML = `
      <div class="screen" style="padding-bottom: calc(var(--safe-bottom) + var(--space-lg))">
        <div class="top-bar">
          <button class="btn-ghost" id="daily-back">← 뒤로</button>
          <div class="top-bar__title">오늘의 추천</div>
          <div></div>
        </div>

        <div style="padding: var(--space-lg); text-align: center;">
          <div style="font-size: 2.5rem; margin-bottom: var(--space-sm);">🎯</div>
          <div class="text-lg" style="margin-bottom: var(--space-xs);">오늘 이것만 해 보자!</div>
          <div class="text-sm" style="color: var(--text-secondary);">나에게 맞는 문제를 골라 봤어</div>
        </div>

        <div style="padding: 0 var(--space-lg); display: flex; flex-direction: column; gap: var(--space-md);">
          ${recommendations.length > 0 ? recommendations.map(r => `
            <button class="card-game" style="text-align: left; width: 100%; display: flex; align-items: center; gap: var(--space-md);" data-concept="${r.concept.id}" data-game="${r.concept.games[0].type}" data-level="${r.concept.games[0].levels[0] || 1}">
              <div style="font-size: 2rem;">${r.concept.icon}</div>
              <div style="flex: 1;">
                <div style="font-weight: 700; margin-bottom: 4px;">${r.concept.name}</div>
                <div class="badge ${r.reason === '취약 영역' ? 'badge-warning' : r.reason === '새로운 도전' ? 'badge-success' : 'badge-success'}">${r.reason}</div>
              </div>
              <div style="font-size: 1.5rem;">▶</div>
            </button>
          `).join('') : `
            <div class="empty-state">
              <div class="empty-state__icon">🌟</div>
              <div>아직 학습 기록이 없어요.<br>학습하기에서 시작해 보세요!</div>
            </div>
          `}
        </div>
      </div>
    `;

    container.querySelector('#daily-back').addEventListener('click', () => {
      window.location.hash = '/';
    });

    container.querySelectorAll('[data-concept]').forEach(btn => {
      btn.addEventListener('click', () => {
        soundManager.play('tap');
        const { concept, game, level } = btn.dataset;
        window.location.hash = `/game/${game}/${level}?concept=${concept}`;
      });
    });
  }

  destroy() {
    this.container = null;
  }
}
