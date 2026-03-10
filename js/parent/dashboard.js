/**
 * Parent Dashboard — stats, exchange approval, settings
 */
import { masteryTracker, MasteryTracker } from '../engine/mastery-tracker.js';
import { storage } from '../engine/storage.js';

let conceptsData = null;
async function loadConcepts() {
  if (conceptsData) return conceptsData;
  const resp = await fetch('./data/concepts.json');
  conceptsData = await resp.json();
  return conceptsData;
}

export class PinScreen {
  constructor() {
    this.container = null;
    this.digits = [];
    this.attempts = 0;
    this.locked = false;
  }

  async render(container) {
    this.container = container;
    this._renderPad();
  }

  _renderPad() {
    this.container.innerHTML = `
      <div class="pin-screen screen">
        <div class="pin-screen__title">부모 대시보드</div>
        <div class="pin-screen__subtitle">${this.locked ? '30초 후 다시 시도하세요' : 'PIN 4자리를 입력하세요'}</div>
        <div class="pin-dots">
          ${[0,1,2,3].map(i => `<div class="pin-dot ${i < this.digits.length ? 'filled' : ''}"></div>`).join('')}
        </div>
        <div class="pin-keypad">
          ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k => {
            if (k === '') return '<div class="pin-key pin-key--empty"></div>';
            if (k === '⌫') return `<button class="pin-key pin-key--delete" data-key="delete" ${this.locked ? 'disabled' : ''}>⌫</button>`;
            return `<button class="pin-key" data-key="${k}" ${this.locked ? 'disabled' : ''}>${k}</button>`;
          }).join('')}
        </div>
        <button class="btn btn-ghost" style="margin-top: var(--space-lg);" id="pin-back">뒤로</button>
      </div>
    `;

    this.container.querySelector('#pin-back').addEventListener('click', () => {
      window.location.hash = '/settings';
    });

    if (this.locked) return;

    this.container.querySelectorAll('.pin-key:not(.pin-key--empty)').forEach(key => {
      key.addEventListener('click', async () => {
        const val = key.dataset.key;
        if (val === 'delete') {
          this.digits.pop();
        } else if (this.digits.length < 4) {
          this.digits.push(val);
        }
        if (this.digits.length === 4) {
          const entered = this.digits.join('');
          const stored = await storage.getSetting('pin', null);
          const hash = await this._hashPin(entered);

          if (hash === stored) {
            window.location.hash = '/parent';
          } else {
            this.attempts++;
            this.digits = [];
            if (this.attempts >= 3) {
              this.locked = true;
              setTimeout(() => {
                this.locked = false;
                this.attempts = 0;
                this._renderPad();
              }, 30000);
            }
            // Show error
            this._renderPad();
            const dots = this.container.querySelectorAll('.pin-dot');
            dots.forEach(d => d.classList.add('error'));
            setTimeout(() => dots.forEach(d => d.classList.remove('error')), 400);
          }
        } else {
          this._renderPad();
        }
      });
    });
  }

  async _hashPin(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + 'ddobak-salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  destroy() { this.container = null; }
}

export class ParentDashboard {
  constructor() {
    this.container = null;
    this.activeTab = 'today';
  }

  async render(container) {
    this.container = container;
    await this._renderDashboard();
  }

  async _renderDashboard() {
    const data = await loadConcepts();
    const stats = await masteryTracker.getTodayStats();
    const allMastery = await masteryTracker.getAllMastery();
    const weakConcepts = await masteryTracker.getWeakConcepts();
    const coins = await storage.get('coins', 'default');
    const exchanges = await storage.getAll('exchange_requests');
    const pendingExchanges = exchanges.filter(e => e.status === 'pending');
    const dailyLimit = await storage.getSetting('daily_coin_limit', 50);
    const playTimeLimit = await storage.getSetting('play_time_limit', 30);

    // Mastery by grade-semester
    const gradeSemesterMastery = {};
    for (const m of allMastery) {
      const concept = data.concepts.find(c => c.id === m.concept_id);
      if (!concept) continue;
      const key = `${concept.grade}-${concept.semester}`;
      if (!gradeSemesterMastery[key]) gradeSemesterMastery[key] = [];
      gradeSemesterMastery[key].push(m.mastery_level);
    }

    this.container.innerHTML = `
      <div class="parent-dashboard screen">
        <div class="top-bar">
          <button class="btn-ghost" id="parent-back">← 뒤로</button>
          <div class="top-bar__title">부모 대시보드</div>
          <div></div>
        </div>

        <div class="parent-tabs">
          <button class="parent-tab ${this.activeTab === 'today' ? 'active' : ''}" data-tab="today">오늘</button>
          <button class="parent-tab ${this.activeTab === 'analysis' ? 'active' : ''}" data-tab="analysis">분석</button>
          <button class="parent-tab ${this.activeTab === 'exchange' ? 'active' : ''}" data-tab="exchange">교환${pendingExchanges.length > 0 ? ` (${pendingExchanges.length})` : ''}</button>
          <button class="parent-tab ${this.activeTab === 'config' ? 'active' : ''}" data-tab="config">설정</button>
        </div>

        <div id="parent-content"></div>
      </div>
    `;

    // Tab switching
    this.container.querySelectorAll('.parent-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeTab = tab.dataset.tab;
        this._renderDashboard();
      });
    });

    this.container.querySelector('#parent-back').addEventListener('click', () => {
      window.location.hash = '/settings';
    });

    const content = this.container.querySelector('#parent-content');

    if (this.activeTab === 'today') {
      content.innerHTML = `
        <div class="parent-stats">
          <div class="parent-stat-card">
            <div class="parent-stat-card__value">${stats.totalQuestions}</div>
            <div class="parent-stat-card__label">풀이 문제 수</div>
          </div>
          <div class="parent-stat-card">
            <div class="parent-stat-card__value">${stats.accuracy}%</div>
            <div class="parent-stat-card__label">정답률</div>
          </div>
          <div class="parent-stat-card">
            <div class="parent-stat-card__value">${stats.totalTimeMin}분</div>
            <div class="parent-stat-card__label">학습 시간</div>
          </div>
          <div class="parent-stat-card">
            <div class="parent-stat-card__value">${coins ? coins.daily_earned : 0}원</div>
            <div class="parent-stat-card__label">오늘 적립</div>
          </div>
        </div>

        ${weakConcepts.length > 0 ? `
          <div class="text-md" style="margin-bottom: var(--space-sm); font-weight: 700;">취약 영역</div>
          ${weakConcepts.slice(0, 3).map(w => {
            const concept = data.concepts.find(c => c.id === w.concept_id);
            return `
              <div class="weak-alert">
                <div class="weak-alert__icon">⚠️</div>
                <div class="weak-alert__text">
                  <span class="weak-alert__concept">${concept ? concept.name : w.concept_id}</span>
                  정답률 ${w.total_attempts > 0 ? Math.round(w.correct_count / w.total_attempts * 100) : 0}%
                </div>
              </div>
            `;
          }).join('')}
        ` : '<div style="text-align: center; color: var(--text-light); padding: var(--space-lg);">취약 영역이 없어요 👍</div>'}
      `;
    } else if (this.activeTab === 'analysis') {
      const masteryDisplay = allMastery
        .filter(m => m.total_attempts > 0)
        .sort((a, b) => a.mastery_level - b.mastery_level);

      content.innerHTML = `
        <div class="text-md" style="margin-bottom: var(--space-md); font-weight: 700;">학습 진도</div>
        ${['1-1','1-2','2-1','2-2','3-1','3-2'].map(key => {
          const avg = gradeSemesterMastery[key]
            ? Math.round(gradeSemesterMastery[key].reduce((a,b) => a+b, 0) / gradeSemesterMastery[key].length)
            : 0;
          const [g,s] = key.split('-');
          return `
            <div class="mastery-item">
              <div class="mastery-item__label">${g}-${s}</div>
              <div class="mastery-item__bar">
                <div class="mastery-item__fill" style="width: ${avg}%; background: var(--color-primary);"></div>
              </div>
              <div class="mastery-item__percent">${avg}%</div>
            </div>
          `;
        }).join('')}

        <div class="text-md" style="margin-top: var(--space-lg); margin-bottom: var(--space-md); font-weight: 700;">개념별 상세</div>
        <div class="mastery-list">
          ${masteryDisplay.map(m => {
            const concept = data.concepts.find(c => c.id === m.concept_id);
            const grade = MasteryTracker.getGradeLabel(m.mastery_level);
            return `
              <div class="mastery-item">
                <div style="font-size: 1rem;">${grade.icon}</div>
                <div class="mastery-item__label" style="flex: 1;">${concept ? concept.name : m.concept_id}</div>
                <div class="mastery-item__bar">
                  <div class="mastery-item__fill" style="width: ${m.mastery_level}%; background: ${m.mastery_level >= 60 ? 'var(--color-primary)' : 'var(--color-warning)'};"></div>
                </div>
                <div class="mastery-item__percent">${m.mastery_level}%</div>
              </div>
            `;
          }).join('') || '<div style="text-align: center; color: var(--text-light); padding: var(--space-lg);">학습 기록이 없어요</div>'}
        </div>
      `;
    } else if (this.activeTab === 'exchange') {
      content.innerHTML = `
        <div class="text-md" style="margin-bottom: var(--space-md); font-weight: 700;">교환 요청</div>
        ${pendingExchanges.length > 0 ? pendingExchanges.map(ex => `
          <div class="exchange-card" data-request-id="${ex.request_id}">
            <div class="exchange-card__emoji">${ex.item_emoji || '🎁'}</div>
            <div class="exchange-card__info">
              <div class="exchange-card__name">${ex.item_name}</div>
              <div class="exchange-card__price">${ex.item_price}원</div>
              <div class="exchange-card__time">${new Date(ex.requested_at).toLocaleString('ko')}</div>
            </div>
            <div class="exchange-card__actions">
              <button class="exchange-btn exchange-btn--approve" data-action="approve" data-id="${ex.request_id}">승인</button>
              <button class="exchange-btn exchange-btn--reject" data-action="reject" data-id="${ex.request_id}">거절</button>
            </div>
          </div>
        `).join('') : '<div style="text-align: center; color: var(--text-light); padding: var(--space-lg);">대기 중인 요청이 없어요</div>'}

        ${exchanges.filter(e => e.status !== 'pending').length > 0 ? `
          <div class="text-md" style="margin-top: var(--space-lg); margin-bottom: var(--space-md); font-weight: 700;">처리 완료</div>
          ${exchanges.filter(e => e.status !== 'pending').slice(-5).reverse().map(ex => `
            <div class="exchange-card" style="opacity: 0.6;">
              <div class="exchange-card__emoji">${ex.item_emoji || '🎁'}</div>
              <div class="exchange-card__info">
                <div class="exchange-card__name">${ex.item_name}</div>
                <div class="exchange-card__time">${ex.status === 'approved' ? '✅ 승인됨' : '❌ 거절됨'}</div>
              </div>
            </div>
          `).join('')}
        ` : ''}
      `;

      // Handle approve/reject
      content.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = parseInt(btn.dataset.id);
          const action = btn.dataset.action;
          const allExchanges = await storage.getAll('exchange_requests');
          const ex = allExchanges.find(e => e.request_id === id);
          if (ex) {
            ex.status = action === 'approve' ? 'approved' : 'rejected';
            ex.resolved_at = Date.now();

            // If rejected, refund coins
            if (action === 'reject') {
              const userCoins = await storage.get('coins', 'default');
              if (userCoins) {
                userCoins.balance += ex.item_price;
                userCoins.total_spent -= ex.item_price;
                await storage.put('coins', userCoins);
              }
            }

            await storage.put('exchange_requests', ex);
            this._renderDashboard();
          }
        });
      });
    } else if (this.activeTab === 'config') {
      content.innerHTML = `
        <div class="setting-row">
          <div class="setting-row__label">일일 적립 상한</div>
          <div class="setting-row__value">
            <select class="setting-select" id="daily-limit">
              ${[30,40,50,60,70,80,90,100].map(v => `<option value="${v}" ${v === dailyLimit ? 'selected' : ''}>${v}원</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-row__label">일일 플레이 시간</div>
          <div class="setting-row__value">
            <select class="setting-select" id="play-limit">
              ${[15,20,30,45,60].map(v => `<option value="${v}" ${v === playTimeLimit ? 'selected' : ''}>${v}분</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-row__label">과자 목록 편집</div>
          <button class="btn btn-outline" id="edit-shop" style="min-height: 40px; padding: 8px 16px;">편집</button>
        </div>
      `;

      content.querySelector('#daily-limit').addEventListener('change', async (e) => {
        await storage.setSetting('daily_coin_limit', parseInt(e.target.value));
      });

      content.querySelector('#play-limit').addEventListener('change', async (e) => {
        await storage.setSetting('play_time_limit', parseInt(e.target.value));
      });

      content.querySelector('#edit-shop').addEventListener('click', () => {
        this._showShopEditor();
      });
    }
  }

  async _showShopEditor() {
    const items = await storage.getAll('shop_items');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.alignItems = 'flex-start';
    overlay.style.paddingTop = '60px';

    overlay.innerHTML = `
      <div class="modal" style="max-width: 400px; text-align: left; max-height: 80vh; overflow-y: auto;">
        <div class="modal__title">과자 목록 편집</div>
        <div id="shop-editor-list" style="margin-bottom: var(--space-md);">
          ${items.map(item => `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 8px; background: #f9f9f9; border-radius: 8px;">
              <span style="font-size: 1.5rem;">${item.emoji}</span>
              <span style="flex: 1; font-weight: 600;">${item.name}</span>
              <span style="color: var(--text-secondary);">${item.price}원</span>
              <button class="btn-ghost" style="color: var(--color-error); font-size: 1.2rem;" data-delete="${item.item_id}">✕</button>
            </div>
          `).join('')}
        </div>
        <div style="display: flex; gap: 8px; margin-bottom: var(--space-md);">
          <input type="text" id="new-emoji" placeholder="🍩" style="width: 48px; padding: 8px; border: 2px solid #ddd; border-radius: 8px; text-align: center; font-size: 1.2rem;">
          <input type="text" id="new-name" placeholder="이름" style="flex: 1; padding: 8px; border: 2px solid #ddd; border-radius: 8px;">
          <input type="number" id="new-price" placeholder="가격" style="width: 70px; padding: 8px; border: 2px solid #ddd; border-radius: 8px;">
          <button class="btn btn-primary" id="add-item" style="padding: 8px 12px; min-height: 36px;">추가</button>
        </div>
        <button class="btn btn-outline" id="close-editor" style="width: 100%;">닫기</button>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#close-editor').addEventListener('click', () => {
      overlay.remove();
      this._renderDashboard();
    });

    overlay.querySelector('#add-item').addEventListener('click', async () => {
      const emoji = overlay.querySelector('#new-emoji').value || '🎁';
      const name = overlay.querySelector('#new-name').value;
      const price = parseInt(overlay.querySelector('#new-price').value);
      if (name && price > 0) {
        await storage.add('shop_items', { user_id: 'default', name, price, emoji, is_active: true });
        overlay.remove();
        this._showShopEditor();
      }
    });

    overlay.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.delete);
        await storage.delete('shop_items', id);
        overlay.remove();
        this._showShopEditor();
      });
    });
  }

  destroy() { this.container = null; }
}
