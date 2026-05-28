(function () {
  const MG = (window.MG = window.MG || {});

  const KEY = 'moneyGame.v1';

  const DEFAULT_MODE_SCORES = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const DEFAULTS = {
    locale: 'sk',
    level: 1,
    soundOn: true,
    bestScores: {
      test:    { ...DEFAULT_MODE_SCORES },
      cashier: { ...DEFAULT_MODE_SCORES },
      story:   { ...DEFAULT_MODE_SCORES },
    },
  };

  function migrateBestScores(raw) {
    const out = {
      test:    { ...DEFAULT_MODE_SCORES },
      cashier: { ...DEFAULT_MODE_SCORES },
      story:   { ...DEFAULT_MODE_SCORES },
    };
    if (!raw || typeof raw !== 'object') return out;
    for (const mode of ['test', 'cashier', 'story']) {
      if (raw[mode] && typeof raw[mode] === 'object') {
        Object.assign(out[mode], raw[mode]);
      }
    }
    return out;
  }

  function safeLocalStorage() {
    try {
      const t = '__mg_t__';
      window.localStorage.setItem(t, '1');
      window.localStorage.removeItem(t);
      return window.localStorage;
    } catch {
      return null;
    }
  }

  const ls = safeLocalStorage();
  let memoryStore = null;

  function loadState() {
    if (!ls) return memoryStore ?? structuredClone(DEFAULTS);
    try {
      const raw = ls.getItem(KEY);
      if (!raw) return structuredClone(DEFAULTS);
      const parsed = JSON.parse(raw);
      return {
        locale:     parsed.locale     === 'en' ? 'en' : 'sk',
        level:      parsed.level      ?? DEFAULTS.level,
        soundOn:    typeof parsed.soundOn === 'boolean' ? parsed.soundOn : DEFAULTS.soundOn,
        bestScores: migrateBestScores(parsed.bestScores),
      };
    } catch {
      return structuredClone(DEFAULTS);
    }
  }

  function saveState(state) {
    const payload = {
      locale:     state.locale,
      level:      state.level,
      soundOn:    state.soundOn,
      bestScores: state.bestScores,
    };
    if (!ls) { memoryStore = payload; return; }
    try {
      ls.setItem(KEY, JSON.stringify(payload));
    } catch {
      memoryStore = payload;
    }
  }

  function recordBest(state, mode, level, score) {
    if (!state.bestScores[mode]) state.bestScores[mode] = { ...DEFAULT_MODE_SCORES };
    const current = state.bestScores[mode][level] ?? 0;
    if (score > current) {
      state.bestScores[mode][level] = score;
      saveState(state);
      return true;
    }
    return false;
  }

  function getBest(state, mode, level) {
    return state.bestScores?.[mode]?.[level] ?? 0;
  }

  MG.storage = { loadState, saveState, recordBest, getBest };
})();
