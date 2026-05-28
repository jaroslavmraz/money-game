(function () {
  const MG = (window.MG = window.MG || {});
  const { BANKNOTES, COINS, denomKind } = MG.money;
  const { formatDenomination } = MG.i18n;

  // ============ Banknote / Coin rendering ============

  function banknoteColorClass(cents) {
    switch (cents) {
      case 500:   return 'note-5';
      case 1000:  return 'note-10';
      case 2000:  return 'note-20';
      case 5000:  return 'note-50';
      case 10000: return 'note-100';
      default:    return 'note-default';
    }
  }

  function coinColorClass(cents) {
    if (cents === 100 || cents === 200) return 'coin-euro'; // 1€, 2€ bi-metal
    if (cents >= 10) return 'coin-gold';                    // 10c, 20c, 50c
    return 'coin-copper';                                    // 1c, 2c, 5c
  }

  // Build a banknote element
  function banknoteEl(cents, locale, opts = {}) {
    const el = document.createElement('div');
    el.className = `banknote ${banknoteColorClass(cents)}`;
    el.dataset.denom = String(cents);
    el.dataset.kind = 'banknote';
    if (opts.small) el.classList.add('banknote-sm');
    el.innerHTML = `
      <span class="note-corner note-corner-tl">${formatDenomination(cents, locale)}</span>
      <span class="note-center">
        <span class="note-num">${cents / 100}</span>
        <span class="note-unit">€</span>
      </span>
      <span class="note-corner note-corner-br">${formatDenomination(cents, locale)}</span>
    `;
    return el;
  }

  // Build a coin element
  function coinEl(cents, locale, opts = {}) {
    const el = document.createElement('div');
    el.className = `coin ${coinColorClass(cents)}`;
    el.dataset.denom = String(cents);
    el.dataset.kind = 'coin';
    if (opts.small) el.classList.add('coin-sm');
    let centerNum, centerUnit;
    if (cents >= 100) {
      centerNum = String(cents / 100);
      centerUnit = '€';
    } else {
      centerNum = String(cents);
      centerUnit = 'c';
    }
    el.innerHTML = `
      <span class="coin-num">${centerNum}</span>
      <span class="coin-unit">${centerUnit}</span>
    `;
    return el;
  }

  // Build a piece (banknote OR coin) based on kind
  function pieceEl(cents, locale, opts = {}) {
    return denomKind(cents) === 'banknote' ? banknoteEl(cents, locale, opts) : coinEl(cents, locale, opts);
  }

  // ============ WalletPanel ============
  //
  // Displays available denominations. In 'unlimited' mode each denom shows
  // once and clicking it picks one (infinite supply). In 'limited' mode it
  // shows a count for each denom and clicking decrements.

  class WalletPanel {
    constructor(container, opts) {
      this.container = container;
      this.opts = Object.assign({
        mode: 'unlimited',         // 'unlimited' | 'limited'
        denoms: [],                // unlimited: array of denoms; limited: ignored
        counts: {},                // limited: { [denomCents]: n }
        locale: 'sk',
        small: false,              // smaller pieces
        onPick: () => {},          // (denomCents) => void
        title: null,               // optional title
      }, opts);
      this._render();
    }

    setCounts(counts) {
      this.opts.counts = counts || {};
      this._render();
    }

    setLocale(locale) {
      this.opts.locale = locale;
      this._render();
    }

    _render() {
      const { mode, denoms, counts, locale, small, title } = this.opts;
      this.container.innerHTML = '';
      this.container.classList.add('wallet-panel');

      if (title) {
        const t = document.createElement('div');
        t.className = 'wallet-title';
        t.textContent = title;
        this.container.appendChild(t);
      }

      const grid = document.createElement('div');
      grid.className = 'wallet-grid';
      this.container.appendChild(grid);

      let list;
      if (mode === 'unlimited') {
        list = [...denoms].sort((a, b) => a - b).map(d => ({ denom: d, n: Infinity }));
      } else {
        list = Object.entries(counts)
          .map(([d, n]) => ({ denom: Number(d), n }))
          .filter(x => x.n > 0)
          .sort((a, b) => a.denom - b.denom);
      }

      for (const { denom, n } of list) {
        const slot = document.createElement('button');
        slot.className = 'wallet-slot';
        slot.type = 'button';
        slot.dataset.denom = String(denom);
        slot.appendChild(pieceEl(denom, locale, { small }));
        if (mode === 'limited' && Number.isFinite(n)) {
          const badge = document.createElement('span');
          badge.className = 'wallet-count';
          badge.textContent = `× ${n}`;
          slot.appendChild(badge);
        }
        if (n <= 0) {
          slot.disabled = true;
        }
        slot.addEventListener('click', () => {
          if (slot.disabled) return;
          this.opts.onPick(denom);
        });
        grid.appendChild(slot);
      }

      if (list.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'wallet-empty';
        empty.textContent = '—';
        grid.appendChild(empty);
      }
    }

    destroy() {
      this.container.innerHTML = '';
      this.container.classList.remove('wallet-panel');
    }
  }

  // ============ SelectionZone ============
  //
  // Shows the multiset that the user is building. Clicking a piece removes
  // one (returns it to the wallet).

  class SelectionZone {
    constructor(container, opts) {
      this.container = container;
      this.opts = Object.assign({
        counts: {},                  // { [denomCents]: n }
        locale: 'sk',
        small: false,
        emptyText: '—',
        onRemove: () => {},          // (denomCents) => void
        title: null,
        showTotal: true,
        totalLabel: '',
      }, opts);
      this._render();
    }

    setCounts(counts) {
      this.opts.counts = counts || {};
      this._render();
    }

    setTotalLabel(label) {
      this.opts.totalLabel = label;
      this._render();
    }

    setLocale(locale) {
      this.opts.locale = locale;
      this._render();
    }

    _render() {
      const { counts, locale, small, emptyText, title, showTotal, totalLabel } = this.opts;
      this.container.innerHTML = '';
      this.container.classList.add('selection-zone');

      if (title) {
        const t = document.createElement('div');
        t.className = 'wallet-title';
        t.textContent = title;
        this.container.appendChild(t);
      }

      const grid = document.createElement('div');
      grid.className = 'selection-grid';
      this.container.appendChild(grid);

      const list = Object.entries(counts)
        .map(([d, n]) => ({ denom: Number(d), n }))
        .filter(x => x.n > 0)
        .sort((a, b) => b.denom - a.denom);

      if (list.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'selection-empty';
        empty.textContent = emptyText;
        grid.appendChild(empty);
      } else {
        for (const { denom, n } of list) {
          for (let i = 0; i < n; i++) {
            const btn = document.createElement('button');
            btn.className = 'selection-piece';
            btn.type = 'button';
            btn.dataset.denom = String(denom);
            btn.appendChild(pieceEl(denom, locale, { small }));
            btn.addEventListener('click', () => this.opts.onRemove(denom));
            grid.appendChild(btn);
          }
        }
      }

      if (showTotal) {
        const total = MG.money.sumCounts(counts);
        const totalEl = document.createElement('div');
        totalEl.className = 'selection-total';
        totalEl.innerHTML = `<span class="muted">${totalLabel || ''}</span><span class="total-num">${MG.i18n.formatPrice(total, locale)}</span>`;
        this.container.appendChild(totalEl);
      }
    }

    destroy() {
      this.container.innerHTML = '';
      this.container.classList.remove('selection-zone');
    }
  }

  // ============ Sound helpers (reused across modes) ============

  function playTone(kind, soundOn) {
    if (!soundOn) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t0 = ctx.currentTime;
      if (kind === 'correct') {
        osc.frequency.setValueAtTime(660, t0);
        osc.frequency.setValueAtTime(880, t0 + 0.08);
        osc.frequency.setValueAtTime(1320, t0 + 0.18);
        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
        osc.start(t0); osc.stop(t0 + 0.4);
      } else if (kind === 'click') {
        osc.frequency.setValueAtTime(880, t0);
        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.exponentialRampToValueAtTime(0.08, t0 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);
        osc.start(t0); osc.stop(t0 + 0.1);
      } else {
        osc.frequency.setValueAtTime(220, t0);
        osc.frequency.exponentialRampToValueAtTime(120, t0 + 0.3);
        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.exponentialRampToValueAtTime(0.15, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.32);
        osc.start(t0); osc.stop(t0 + 0.35);
      }
      setTimeout(() => ctx.close(), 500);
    } catch {}
  }

  MG.wallet = {
    WalletPanel, SelectionZone,
    banknoteEl, coinEl, pieceEl,
    playTone,
  };
})();
