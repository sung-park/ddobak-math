/**
 * Hash-based SPA Router
 */
export class Router {
  constructor(appContainer) {
    this.container = appContainer;
    this.routes = {};
    this.currentScreen = null;
    this.beforeNavigate = null;
    window.addEventListener('hashchange', () => this._onHashChange());
  }

  /** Register a route: path → screenFactory(params) */
  on(path, screenFactory) {
    this.routes[path] = screenFactory;
    return this;
  }

  /** Navigate to a hash path */
  navigate(path) {
    window.location.hash = path;
  }

  /** Start the router (process current hash) */
  start() {
    this._onHashChange();
  }

  /** Parse current hash into { path, params } */
  _parseHash() {
    const hash = window.location.hash.slice(1) || '/';
    const parts = hash.split('/').filter(Boolean);
    return { full: '/' + parts.join('/'), parts };
  }

  /** Find matching route */
  _matchRoute(fullPath) {
    // Exact match first
    if (this.routes[fullPath]) {
      return { factory: this.routes[fullPath], params: {} };
    }

    // Pattern match (e.g., /game/:type/:level)
    for (const [pattern, factory] of Object.entries(this.routes)) {
      const patternParts = pattern.split('/').filter(Boolean);
      const pathParts = fullPath.split('/').filter(Boolean);

      if (patternParts.length !== pathParts.length) continue;

      const params = {};
      let match = true;

      for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i].startsWith(':')) {
          params[patternParts[i].slice(1)] = pathParts[i];
        } else if (patternParts[i] !== pathParts[i]) {
          match = false;
          break;
        }
      }

      if (match) return { factory, params };
    }

    return null;
  }

  async _onHashChange() {
    const { full } = this._parseHash();
    const match = this._matchRoute(full);

    if (!match) {
      this.navigate('/');
      return;
    }

    // Destroy current screen
    if (this.currentScreen && this.currentScreen.destroy) {
      this.currentScreen.destroy();
    }

    this.container.innerHTML = '';

    // Create and render new screen
    this.currentScreen = match.factory(match.params);
    if (this.currentScreen.render) {
      await this.currentScreen.render(this.container);
    }
  }
}
