/**
 * App entry point — SPA initialization and routing
 */
import { Router } from './router.js';
import { initializeDefaultData, storage } from './engine/storage.js';
import { soundManager } from './engine/sound-manager.js';

import { HomeScreen } from './screens/home.js';
import { CurriculumScreen } from './screens/curriculum.js';
import { DailyPickScreen } from './screens/daily-pick.js';
import { ShopScreen } from './screens/shop.js';
import { MyRecordScreen } from './screens/my-record.js';
import { SettingsScreen } from './screens/settings.js';
import { PinScreen, ParentDashboard } from './parent/dashboard.js';

// Game imports
import { BlockCalcGame } from './games/block-calc.js';
import { MatrixGame } from './games/matrix.js';
import { NumberLineGame } from './games/number-line.js';
import { ClockGame } from './games/clock.js';
import { CoinsGame } from './games/coins.js';
import { CountingFarmGame } from './games/counting-farm.js';
import { ScaleGame } from './games/scale.js';
import { PizzaGame } from './games/pizza.js';
import { ShapeSortGame } from './games/shape-sort.js';
import { DivisionTreeGame } from './games/division-tree.js';
import { RulerGame } from './games/ruler.js';
import { BarGraphGame } from './games/bar-graph.js';
import { PatternGame } from './games/pattern.js';

async function main() {
  // Initialize IndexedDB with default data
  await initializeDefaultData();

  // Restore sound setting
  const soundEnabled = await storage.getSetting('sound_enabled', true);
  soundManager.setEnabled(soundEnabled);

  // Setup router
  const app = document.getElementById('app');
  const router = new Router(app);

  router
    .on('/', () => new HomeScreen())
    .on('/learn', () => new CurriculumScreen())
    .on('/daily', () => new DailyPickScreen())
    .on('/shop', () => new ShopScreen())
    .on('/record', () => new MyRecordScreen())
    .on('/settings', () => new SettingsScreen())
    .on('/parent/pin', () => new PinScreen())
    .on('/parent', () => new ParentDashboard())
    .on('/game/:type/:level', (params) => {
      // Parse concept from query string
      const hash = window.location.hash;
      const qIdx = hash.indexOf('?');
      let conceptId = 'unknown';
      if (qIdx !== -1) {
        const qs = new URLSearchParams(hash.slice(qIdx + 1));
        conceptId = qs.get('concept') || 'unknown';
      }

      const level = parseInt(params.level) || 1;
      const gameType = params.type;

      switch (gameType) {
        case 'block-calc':
          return new BlockCalcGame(level, conceptId);
        case 'matrix':
          return new MatrixGame(level, conceptId);
        case 'number-line':
          return new NumberLineGame(level, conceptId);
        case 'clock':
          return new ClockGame(level, conceptId);
        case 'coins':
          return new CoinsGame(level, conceptId);
        case 'counting-farm':
          return new CountingFarmGame(level, conceptId);
        case 'scale':
          return new ScaleGame(level, conceptId);
        case 'pizza':
          return new PizzaGame(level, conceptId);
        case 'shape-sort':
          return new ShapeSortGame(level, conceptId);
        case 'division-tree':
          return new DivisionTreeGame(level, conceptId);
        case 'ruler':
          return new RulerGame(level, conceptId);
        case 'bar-graph':
          return new BarGraphGame(level, conceptId);
        case 'pattern':
          return new PatternGame(level, conceptId);
        default:
          return new HomeScreen();
      }
    });

  router.start();

  // Register service worker with forced update
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      reg.update(); // Force check for new SW
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'activated') {
            window.location.reload(); // Reload to use new SW
          }
        });
      });
    } catch (e) {
      // SW registration failed — app still works
    }
  }
}

main();
