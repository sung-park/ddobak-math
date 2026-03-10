/**
 * Shop Screen — snack exchange store
 */
import { rewardEngine } from '../engine/reward-engine.js';
import { storage } from '../engine/storage.js';
import { soundManager } from '../engine/sound-manager.js';

export class ShopScreen {
  constructor() {
    this.container = null;
  }

  async render(container) {
    this.container = container;
    await this._renderShop();
  }

  async _renderShop() {
    const balance = await rewardEngine.getBalance();
    const items = await storage.getAll('shop_items');
    const activeItems = items.filter(i => i.is_active);

    this.container.innerHTML = `
      <div class="shop screen">
        <div class="top-bar">
          <button class="btn-ghost" id="shop-back">← 뒤로</button>
          <div class="top-bar__title">과자 가게</div>
          <div></div>
        </div>

        <div class="shop__balance">
          <div class="shop__balance-label">현재 잔액</div>
          <div class="shop__balance-amount">💰 ${balance}원</div>
        </div>

        <div class="shop__items">
          ${activeItems.map(item => `
            <div class="shop-item" data-item-id="${item.item_id}">
              <div class="shop-item__emoji">${item.emoji}</div>
              <div class="shop-item__name">${item.name}</div>
              <div class="shop-item__price">${item.price}원</div>
              <button class="shop-item__btn" ${balance < item.price ? 'disabled' : ''}>
                ${balance < item.price ? '돈이 부족해요' : '사기'}
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.container.querySelector('#shop-back').addEventListener('click', () => {
      window.location.hash = '/';
    });

    this.container.querySelectorAll('.shop-item__btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        soundManager.play('tap');
        const itemEl = btn.closest('.shop-item');
        const itemId = parseInt(itemEl.dataset.itemId);
        const item = activeItems.find(i => i.item_id === itemId);
        if (item) {
          this._showPurchaseConfirm(item, balance);
        }
      });
    });
  }

  _showPurchaseConfirm(item, balance) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal__title">${item.emoji} ${item.name}을(를) 살까요?</div>
        <div class="modal__body">
          <div style="font-size: 1.5rem; font-weight: 700; margin-bottom: 8px;">${item.price}원</div>
          <div>남은 돈: ${balance}원 → ${balance - item.price}원</div>
        </div>
        <div class="modal__actions">
          <button class="btn btn-outline" id="purchase-cancel">아니요</button>
          <button class="btn btn-primary" id="purchase-confirm">네!</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#purchase-cancel').addEventListener('click', () => {
      overlay.remove();
    });

    overlay.querySelector('#purchase-confirm').addEventListener('click', async () => {
      soundManager.play('coin');
      const success = await rewardEngine.spendCoins(item.price, item.name);
      overlay.remove();

      if (success) {
        // Create exchange request
        await storage.add('exchange_requests', {
          user_id: 'default',
          item_name: item.name,
          item_emoji: item.emoji,
          item_price: item.price,
          status: 'pending',
          requested_at: Date.now(),
          resolved_at: null
        });

        this._showPurchaseSuccess(item);
      }
    });
  }

  _showPurchaseSuccess(item) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div style="font-size: 3rem; margin-bottom: var(--space-md);">🎉</div>
        <div class="modal__title">구매 요청 완료!</div>
        <div class="modal__body">
          엄마/아빠에게 알려드렸어요.<br>
          곧 ${item.emoji} ${item.name}을(를) 받을 수 있어요!
        </div>
        <div class="modal__actions">
          <button class="btn btn-primary" id="success-ok">확인</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#success-ok').addEventListener('click', () => {
      overlay.remove();
      this._renderShop(); // Refresh balance
    });
  }

  destroy() {
    this.container = null;
  }
}
