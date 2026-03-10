/**
 * Curriculum Screen — browse by grade/semester/unit
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

export class CurriculumScreen {
  constructor() {
    this.container = null;
    this.selectedGrade = 1;
  }

  async render(container) {
    this.container = container;
    const data = await loadConcepts();
    const allMastery = await masteryTracker.getAllMastery();
    const masteryMap = {};
    allMastery.forEach(m => { masteryMap[m.concept_id] = m.mastery_level; });

    this._renderPage(data, masteryMap);
  }

  _renderPage(data, masteryMap) {
    const grades = [1, 2, 3];
    const concepts = data.concepts.filter(c => c.grade === this.selectedGrade);

    const sem1 = concepts.filter(c => c.semester === 1);
    const sem2 = concepts.filter(c => c.semester === 2);

    this.container.innerHTML = `
      <div class="curriculum screen">
        <div class="top-bar">
          <button class="btn-ghost" id="cur-back">← 뒤로</button>
          <div class="top-bar__title">학습하기</div>
          <div></div>
        </div>

        <div class="curriculum__grade-tabs">
          ${grades.map(g => `
            <button class="grade-tab ${g === this.selectedGrade ? 'active' : ''}" data-grade="${g}">
              ${g}학년
            </button>
          `).join('')}
        </div>

        <div class="semester-section">
          <div class="semester-section__title">1학기</div>
          ${sem1.map(c => this._renderUnitCard(c, masteryMap[c.id] || 0)).join('')}
        </div>

        <div class="semester-section">
          <div class="semester-section__title">2학기</div>
          ${sem2.map(c => this._renderUnitCard(c, masteryMap[c.id] || 0)).join('')}
        </div>
      </div>
    `;

    // Events
    this.container.querySelector('#cur-back').addEventListener('click', () => {
      window.location.hash = '/';
    });

    this.container.querySelectorAll('.grade-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.selectedGrade = parseInt(tab.dataset.grade);
        this._renderPage(conceptsData, masteryMap);
      });
    });

    this.container.querySelectorAll('.unit-card').forEach(card => {
      card.addEventListener('click', () => {
        soundManager.play('tap');
        const conceptId = card.dataset.conceptId;
        const concept = conceptsData.concepts.find(c => c.id === conceptId);
        if (concept && concept.games.length > 1) {
          this._showGamePicker(concept);
        } else if (concept && concept.games.length === 1) {
          const game = concept.games[0];
          const level = game.levels[0] || 1;
          window.location.hash = `/game/${game.type}/${level}?concept=${conceptId}`;
        } else {
          this._showToast('아직 준비 중이에요!');
        }
      });
    });
  }

  _renderUnitCard(concept, mastery) {
    const hasGame = concept.games.length > 0;
    return `
      <button class="unit-card ${!hasGame ? 'unit-card--disabled' : ''}" data-concept-id="${concept.id}">
        <div class="unit-card__icon">${concept.icon}</div>
        <div class="unit-card__info">
          <div class="unit-card__name">${concept.unit}. ${concept.name}</div>
          <div class="unit-card__mastery">
            <div class="unit-card__mastery-bar">
              <div class="unit-card__mastery-fill" style="width: ${mastery}%; background: ${mastery >= 60 ? 'var(--color-primary)' : mastery > 0 ? 'var(--color-warning)' : '#ddd'}"></div>
            </div>
            <div class="unit-card__mastery-text">${mastery}%</div>
          </div>
        </div>
      </button>
    `;
  }

  _showGamePicker(concept) {
    const GAME_NAMES = {
      'block-calc': '🧮 블록 계산기', 'matrix': '✖️ 구구단', 'number-line': '📍 수 직선',
      'clock': '🕐 시계', 'coins': '💰 동전 모으기', 'counting-farm': '🌾 묶어 세기',
      'scale': '⚖️ 크기 비교', 'pizza': '🍕 피자 분수', 'shape-sort': '📐 도형 분류',
      'division-tree': '🌳 나눗셈', 'ruler': '📏 길이 재기', 'bar-graph': '📊 그래프', 'pattern': '🔍 규칙 찾기'
    };

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width: 340px;">
        <div class="modal__title">${concept.icon} ${concept.name}</div>
        <div style="display: flex; flex-direction: column; gap: 8px; margin: 16px 0;">
          ${concept.games.map((g, i) => `
            <button class="btn btn-outline game-pick-btn" data-idx="${i}" style="text-align: left; padding: 12px 16px; font-size: 1rem;">
              ${GAME_NAMES[g.type] || g.type}
              <span style="color: var(--text-secondary); font-size: 0.85rem; margin-left: 8px;">Lv.${g.levels.join(', ')}</span>
            </button>
          `).join('')}
        </div>
        <button class="btn btn-ghost" id="picker-close" style="width: 100%;">닫기</button>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#picker-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelectorAll('.game-pick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const g = concept.games[parseInt(btn.dataset.idx)];
        const level = g.levels[0] || 1;
        overlay.remove();
        window.location.hash = `/game/${g.type}/${level}?concept=${concept.id}`;
      });
    });
  }

  _showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  destroy() {
    this.container = null;
  }
}
