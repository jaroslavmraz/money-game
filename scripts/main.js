(function () {
  const MG = (window.MG = window.MG || {});
  const { LearnScreen, TestScreen, CashierScreen, StoryScreen, ResultsScreen } = MG;
  const { loadState, saveState, getBest } = MG.storage;
  const { getUI, applyStaticI18n } = MG.i18n;
  const { clampLevel } = MG.money;

  class HomeScreen {
    constructor(container, app) {
      this.container = container;
      this.app = app;
    }

    mount() {
      const ui = getUI(this.app.state.locale);
      const activeLevel = this.app.state.level;

      const levelCards = [1, 2, 3, 4].map(n => {
        const bestT = getBest(this.app.state, 'test', n);
        const bestC = getBest(this.app.state, 'cashier', n);
        const bestS = getBest(this.app.state, 'story', n);
        const badges = [];
        if (bestT > 0) badges.push(`<span class="badge badge-test">⌚ ${bestT}/10</span>`);
        if (bestC > 0) badges.push(`<span class="badge badge-cashier">🧾 ${bestC}/10</span>`);
        if (bestS > 0) badges.push(`<span class="badge badge-story">📖 ${bestS}</span>`);
        const badgesHtml = badges.length ? `<div class="level-best-row">${badges.join('')}</div>` : '';
        return `
          <button class="level-card" data-level="${n}" aria-pressed="${activeLevel === n ? 'true' : 'false'}">
            <span class="level-num">${n}</span>
            <span class="level-label">${ui['level' + n]}</span>
            <span class="level-max">${ui['level' + n + 'Sub']}</span>
            ${badgesHtml}
          </button>
        `;
      }).join('');

      this.container.innerHTML = `
        <div class="home">
          <h2 class="home-hero">${ui.pickLevel}</h2>
          <div class="level-grid">${levelCards}</div>
          <div class="mode-grid">
            <button class="btn-mode btn-mode-primary" id="home-learn">
              <span class="mode-icon">🛒</span>
              <span class="mode-body">
                <span class="mode-title">${ui.learn}</span>
                <span class="mode-sub">${ui.learnDesc}</span>
              </span>
            </button>
            <button class="btn-mode btn-mode-secondary" id="home-test">
              <span class="mode-icon">💶</span>
              <span class="mode-body">
                <span class="mode-title">${ui.test}</span>
                <span class="mode-sub">${ui.testDesc}</span>
              </span>
            </button>
            <button class="btn-mode btn-mode-accent" id="home-cashier">
              <span class="mode-icon">🧾</span>
              <span class="mode-body">
                <span class="mode-title">${ui.cashier}</span>
                <span class="mode-sub">${ui.cashierDesc}</span>
              </span>
            </button>
            <button class="btn-mode btn-mode-pink" id="home-story">
              <span class="mode-icon">📖</span>
              <span class="mode-body">
                <span class="mode-title">${ui.story}</span>
                <span class="mode-sub">${ui.storyDesc}</span>
              </span>
            </button>
          </div>
        </div>
      `;

      this.container.querySelectorAll('[data-level]').forEach(btn => {
        btn.addEventListener('click', () => {
          const level = parseInt(btn.dataset.level, 10);
          this.app.setLevel(level);
          this.container.querySelectorAll('[data-level]').forEach(b => {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
          });
        });
      });

      this.container.querySelector('#home-learn').addEventListener('click', () => this.app.setScreen('learn'));
      this.container.querySelector('#home-test').addEventListener('click', () => this.app.setScreen('test'));
      this.container.querySelector('#home-cashier').addEventListener('click', () => this.app.setScreen('cashier'));
      this.container.querySelector('#home-story').addEventListener('click', () => this.app.setScreen('story'));
    }

    unmount() { this.container.innerHTML = ''; }
  }

  const SCREEN_FACTORIES = {
    home:    HomeScreen,
    learn:   LearnScreen,
    test:    TestScreen,
    cashier: CashierScreen,
    story:   StoryScreen,
    results: ResultsScreen,
  };

  class App {
    constructor() {
      this.state = loadState();
      this.currentScreen = null;
      this.currentInstance = null;
      this.lastResults = null;

      this._setupHeader();
      this._setupSettingsModal();
      this.applyLanguage();
      this.setScreen('home');
    }

    applyLanguage() { applyStaticI18n(this.state.locale); }

    setScreen(name, data) {
      if (this.currentInstance?.unmount) this.currentInstance.unmount();
      document.body.dataset.screen = name;
      const backBtn = document.getElementById('btn-back');
      backBtn.hidden = (name === 'home');

      const Cls = SCREEN_FACTORIES[name];
      const container = document.getElementById('screen-' + name);
      this.currentScreen = name;
      this.currentInstance = new Cls(container, this);
      if (name === 'results') {
        this.currentInstance.mount(data || this.lastResults || { mode: 'test', level: this.state.level, score: 0, maxScore: 10 });
      } else {
        this.currentInstance.mount();
      }
    }

    finishGame(results) {
      this.lastResults = results;
      this.setScreen('results', results);
    }

    setLocale(locale) {
      if (!['sk', 'en'].includes(locale)) return;
      this.state.locale = locale;
      saveState(this.state);
      this.applyLanguage();
      if (this.currentScreen) this.setScreen(this.currentScreen, this.lastResults);
    }

    setLevel(level) {
      this.state.level = clampLevel(level);
      saveState(this.state);
    }

    setSound(on) {
      this.state.soundOn = !!on;
      saveState(this.state);
    }

    _setupHeader() {
      document.getElementById('btn-back').addEventListener('click', () => this.setScreen('home'));
      document.getElementById('btn-settings').addEventListener('click', () => this._openSettings());
    }

    _setupSettingsModal() {
      const modal = document.getElementById('settings-modal');
      const localeSel = document.getElementById('setting-locale');
      const soundCheck = document.getElementById('setting-sound');

      localeSel.value = this.state.locale;
      soundCheck.checked = this.state.soundOn;

      localeSel.addEventListener('change', (e) => this.setLocale(e.target.value));
      soundCheck.addEventListener('change', (e) => this.setSound(e.target.checked));

      modal.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => { modal.hidden = true; });
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.hidden) modal.hidden = true;
      });
    }

    _openSettings() {
      const modal = document.getElementById('settings-modal');
      document.getElementById('setting-locale').value = this.state.locale;
      document.getElementById('setting-sound').checked = this.state.soundOn;
      modal.hidden = false;
    }
  }

  document.addEventListener('DOMContentLoaded', () => new App());
})();
