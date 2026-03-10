/**
 * Settings Screen + PIN gate to parent dashboard
 */
import { storage } from '../engine/storage.js';
import { soundManager } from '../engine/sound-manager.js';

export class SettingsScreen {
  constructor() {
    this.container = null;
  }

  async render(container) {
    this.container = container;
    const soundEnabled = await storage.getSetting('sound_enabled', true);
    const pin = await storage.getSetting('pin', null);

    container.innerHTML = `
      <div class="screen" style="padding-bottom: calc(var(--safe-bottom) + var(--space-lg))">
        <div class="top-bar">
          <button class="btn-ghost" id="settings-back">← 뒤로</button>
          <div class="top-bar__title">설정</div>
          <div></div>
        </div>

        <div style="padding: var(--space-lg);">
          <div class="setting-row">
            <div class="setting-row__label">효과음</div>
            <button class="btn btn-outline" id="toggle-sound" style="min-height: 40px; padding: 8px 16px;">
              ${soundEnabled ? '🔊 켜짐' : '🔇 꺼짐'}
            </button>
          </div>

          <div class="setting-row">
            <div class="setting-row__label">부모 대시보드</div>
            <button class="btn btn-primary" id="open-parent" style="min-height: 40px; padding: 8px 16px;">
              열기
            </button>
          </div>

          <div class="setting-row">
            <div class="setting-row__label">부모 PIN ${pin ? '변경' : '설정'}</div>
            <button class="btn btn-outline" id="set-pin" style="min-height: 40px; padding: 8px 16px;">
              ${pin ? '변경' : '설정하기'}
            </button>
          </div>

          <div style="margin-top: var(--space-xl); text-align: center; color: var(--text-light);">
            <div class="text-sm">또박또박 수학 v1.0</div>
            <div class="text-xs" style="margin-top: 4px;">느린 학습자를 위한 무료 수학 게임</div>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#settings-back').addEventListener('click', () => {
      window.location.hash = '/';
    });

    container.querySelector('#toggle-sound').addEventListener('click', async (e) => {
      const current = await storage.getSetting('sound_enabled', true);
      const newVal = !current;
      await storage.setSetting('sound_enabled', newVal);
      soundManager.setEnabled(newVal);
      e.currentTarget.textContent = newVal ? '🔊 켜짐' : '🔇 꺼짐';
      if (newVal) soundManager.play('tap');
    });

    container.querySelector('#open-parent').addEventListener('click', async () => {
      const pin = await storage.getSetting('pin', null);
      if (pin) {
        window.location.hash = '/parent/pin';
      } else {
        window.location.hash = '/parent';
      }
    });

    container.querySelector('#set-pin').addEventListener('click', () => {
      this._showPinSetup();
    });
  }

  _showPinSetup() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    let digits = [];

    const render = () => {
      overlay.innerHTML = `
        <div class="modal" style="max-width: 320px;">
          <div class="modal__title">PIN 설정</div>
          <div class="modal__body">4자리 숫자를 입력하세요</div>
          <div class="pin-dots" style="justify-content: center; margin-bottom: 24px;">
            ${[0,1,2,3].map(i => `<div class="pin-dot ${i < digits.length ? 'filled' : ''}"></div>`).join('')}
          </div>
          <div class="pin-keypad" style="max-width: 240px; margin: 0 auto;">
            ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k => {
              if (k === '') return '<div class="pin-key pin-key--empty"></div>';
              if (k === '⌫') return `<button class="pin-key pin-key--delete" data-key="delete">⌫</button>`;
              return `<button class="pin-key" data-key="${k}">${k}</button>`;
            }).join('')}
          </div>
          <div style="margin-top: 16px;">
            <button class="btn btn-ghost" id="pin-cancel">취소</button>
          </div>
        </div>
      `;

      overlay.querySelector('#pin-cancel').addEventListener('click', () => overlay.remove());

      overlay.querySelectorAll('.pin-key:not(.pin-key--empty)').forEach(key => {
        key.addEventListener('click', async () => {
          const val = key.dataset.key;
          if (val === 'delete') {
            digits.pop();
          } else if (digits.length < 4) {
            digits.push(val);
          }
          if (digits.length === 4) {
            const pin = digits.join('');
            // Simple hash (not crypto-secure, but adequate for child lock)
            const hash = await this._hashPin(pin);
            await storage.setSetting('pin', hash);
            overlay.remove();
            this._showToast('PIN이 설정되었어요!');
            // Re-render settings
            this.render(this.container);
          } else {
            render();
          }
        });
      });
    };

    document.body.appendChild(overlay);
    render();
  }

  async _hashPin(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + 'ddobak-salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
