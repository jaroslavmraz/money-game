(function () {
  const MG = (window.MG = window.MG || {});
  const { LEVELS, clampLevel, sumCounts, makeChange, addCounts } = MG.money;
  const { CATALOG, priceForLevel, localizedName, pickProductsForLevel } = MG.catalog;
  const { getUI, formatPrice, formatPriceShort } = MG.i18n;
  const { WalletPanel, SelectionZone, playTone } = MG.wallet;

  class LearnScreen {
    constructor(container, app) {
      this.container = container;
      this.app = app;
      this.level = clampLevel(this.app.state.level);
      this.shelf = pickProductsForLevel(this.level, 8);
      this.cart = {};       // { productId: qty }
      this.payCounts = {};  // { denomCents: count } user is selecting
      this.changeRevealed = false;
      this.walletPanel = null;
      this.paySelection = null;
      this.changeSelection = null;
    }

    mount() {
      const ui = getUI(this.app.state.locale);

      this.container.innerHTML = `
        <div class="play-screen">
          <div class="shop-layout">
            <div class="shop-section">
              <div class="section-title">🛒 ${ui.shop}</div>
              <div class="shop-shelf" id="learn-shelf"></div>
            </div>
            <div class="cart-section">
              <div class="section-title">🧺 ${ui.cart}</div>
              <div class="cart-list" id="learn-cart"></div>
              <div class="cart-total"><span class="label">${ui.total}</span><span class="amount" id="learn-cart-total">${formatPrice(0, this.app.state.locale)}</span></div>
              <button class="btn btn-sm" id="learn-clear-cart">${ui.clearCart}</button>
            </div>
          </div>

          <div class="pay-banner" id="learn-pay-banner" hidden>
            <span>${ui.payAmount}</span>
            <span class="pay-amount-large" id="learn-pay-amount">${formatPrice(0, this.app.state.locale)}</span>
          </div>

          <div class="pay-section" id="learn-pay-section" hidden>
            <div class="section-title">💼 ${ui.wallet}</div>
            <div id="learn-wallet"></div>
            <div id="learn-pay-selection"></div>
            <div class="diff-msg" id="learn-diff" hidden></div>
          </div>

          <div class="change-section" id="learn-change-section" hidden>
            <div class="section-title">💰 ${ui.change}</div>
            <div class="change-line"><span class="label">${ui.youGet}</span><span class="amount" id="learn-change-amount">${formatPrice(0, this.app.state.locale)}</span></div>
            <button class="btn btn-success" id="learn-show-change">${ui.showChange}</button>
            <div id="learn-change-selection" hidden></div>
          </div>

          <div class="action-row">
            <button class="btn" id="learn-reset">${ui.reset}</button>
          </div>
        </div>
      `;

      this._renderShelf();
      this._renderCart();

      const walletMount = this.container.querySelector('#learn-wallet');
      this.walletPanel = new WalletPanel(walletMount, {
        mode: 'unlimited',
        denoms: LEVELS[this.level].denoms,
        locale: this.app.state.locale,
        onPick: (d) => this._addToPay(d),
      });

      const paySelMount = this.container.querySelector('#learn-pay-selection');
      this.paySelection = new SelectionZone(paySelMount, {
        counts: {},
        locale: this.app.state.locale,
        title: ui.payZone,
        totalLabel: ui.paid,
        onRemove: (d) => this._removeFromPay(d),
      });
      paySelMount.classList.add('zone-pay');

      this.container.querySelector('#learn-clear-cart').addEventListener('click', () => this._clearCart());
      this.container.querySelector('#learn-reset').addEventListener('click', () => this._resetAll());
      this.container.querySelector('#learn-show-change').addEventListener('click', () => this._revealChange());

      this._refresh();
    }

    _renderShelf() {
      const shelf = this.container.querySelector('#learn-shelf');
      shelf.innerHTML = this.shelf.map(p => {
        const price = priceForLevel(p, this.level);
        return `
          <button class="product-card" data-id="${p.id}">
            <span class="product-emoji">${p.emoji}</span>
            <span class="product-name">${localizedName(p, this.app.state.locale)}</span>
            <span class="product-price">${formatPrice(price, this.app.state.locale)}</span>
          </button>
        `;
      }).join('');
      shelf.querySelectorAll('[data-id]').forEach(btn => {
        btn.addEventListener('click', () => this._addToCart(btn.dataset.id));
      });
    }

    _renderCart() {
      const ui = getUI(this.app.state.locale);
      const cartEl = this.container.querySelector('#learn-cart');
      const entries = Object.entries(this.cart).filter(([, n]) => n > 0);
      if (entries.length === 0) {
        cartEl.innerHTML = `<div class="cart-empty">${ui.emptyCart}</div>`;
      } else {
        cartEl.innerHTML = entries.map(([id, qty]) => {
          const product = this.shelf.find(p => p.id === id) || MG.catalog.getById(id);
          if (!product) return '';
          const price = priceForLevel(product, this.level);
          const line = price * qty;
          return `
            <div class="cart-row">
              <span class="cart-emoji">${product.emoji}</span>
              <span class="cart-name">${localizedName(product, this.app.state.locale)}</span>
              <span class="cart-qty">× ${qty}</span>
              <span class="cart-line-total">${formatPrice(line, this.app.state.locale)}</span>
              <button class="cart-remove" data-remove="${id}" aria-label="${ui.remove}">−</button>
            </div>
          `;
        }).join('');
        cartEl.querySelectorAll('[data-remove]').forEach(btn => {
          btn.addEventListener('click', () => this._removeFromCart(btn.dataset.remove));
        });
      }
      const total = this._cartTotal();
      this.container.querySelector('#learn-cart-total').textContent = formatPrice(total, this.app.state.locale);
    }

    _cartTotal() {
      let s = 0;
      for (const [id, qty] of Object.entries(this.cart)) {
        const product = this.shelf.find(p => p.id === id) || MG.catalog.getById(id);
        if (product) s += priceForLevel(product, this.level) * qty;
      }
      return s;
    }

    _addToCart(id) {
      this.cart[id] = (this.cart[id] || 0) + 1;
      this._renderCart();
      this._refresh();
    }

    _removeFromCart(id) {
      if (this.cart[id]) {
        this.cart[id]--;
        if (this.cart[id] <= 0) delete this.cart[id];
      }
      this._renderCart();
      this._refresh();
    }

    _clearCart() {
      this.cart = {};
      this.payCounts = {};
      this.changeRevealed = false;
      this._renderCart();
      this.paySelection.setCounts({});
      this._refresh();
    }

    _addToPay(denomC) {
      this.payCounts[denomC] = (this.payCounts[denomC] || 0) + 1;
      this.paySelection.setCounts(this.payCounts);
      this.changeRevealed = false;
      this._refresh();
    }

    _removeFromPay(denomC) {
      if (this.payCounts[denomC]) {
        this.payCounts[denomC]--;
        if (this.payCounts[denomC] <= 0) delete this.payCounts[denomC];
      }
      this.paySelection.setCounts(this.payCounts);
      this.changeRevealed = false;
      this._refresh();
    }

    _resetAll() {
      this._clearCart();
    }

    _refresh() {
      const ui = getUI(this.app.state.locale);
      const cartTotal = this._cartTotal();
      const paid = sumCounts(this.payCounts);

      const payBanner = this.container.querySelector('#learn-pay-banner');
      const paySection = this.container.querySelector('#learn-pay-section');
      const changeSection = this.container.querySelector('#learn-change-section');
      const diff = this.container.querySelector('#learn-diff');

      const cartActive = cartTotal > 0;
      payBanner.hidden = !cartActive;
      paySection.hidden = !cartActive;

      if (!cartActive) {
        this.payCounts = {};
        this.paySelection?.setCounts({});
        changeSection.hidden = true;
        return;
      }

      this.container.querySelector('#learn-pay-amount').textContent = formatPrice(cartTotal, this.app.state.locale);

      if (paid === 0) {
        diff.hidden = true;
        changeSection.hidden = true;
      } else if (paid < cartTotal) {
        diff.hidden = false;
        diff.className = 'diff-msg short';
        diff.textContent = `${ui.youPayLess} ${formatPrice(cartTotal - paid, this.app.state.locale)}`;
        changeSection.hidden = true;
      } else if (paid === cartTotal) {
        diff.hidden = false;
        diff.className = 'diff-msg exact';
        diff.textContent = ui.exactPay;
        changeSection.hidden = false;
        this.container.querySelector('#learn-change-amount').textContent = formatPrice(0, this.app.state.locale);
        this._hideChangeReveal();
      } else {
        diff.hidden = false;
        diff.className = 'diff-msg over';
        diff.textContent = `${ui.youGet} ${formatPrice(paid - cartTotal, this.app.state.locale)}`;
        changeSection.hidden = false;
        this.container.querySelector('#learn-change-amount').textContent = formatPrice(paid - cartTotal, this.app.state.locale);
        this._hideChangeReveal();
      }
    }

    _revealChange() {
      const cartTotal = this._cartTotal();
      const paid = sumCounts(this.payCounts);
      const changeC = Math.max(0, paid - cartTotal);
      const ui = getUI(this.app.state.locale);

      const mount = this.container.querySelector('#learn-change-selection');
      mount.hidden = false;

      const change = makeChange(changeC, LEVELS[this.level].denoms);
      if (!this.changeSelection) {
        this.changeSelection = new SelectionZone(mount, {
          counts: change,
          locale: this.app.state.locale,
          title: ui.change,
          totalLabel: ui.change,
          onRemove: () => {},
        });
        mount.classList.add('zone-change');
      } else {
        this.changeSelection.setCounts(change);
      }

      this.changeRevealed = true;
      playTone('correct', this.app.state.soundOn);
    }

    _hideChangeReveal() {
      const mount = this.container.querySelector('#learn-change-selection');
      if (mount) {
        mount.hidden = true;
        mount.classList.remove('zone-change');
      }
      if (this.changeSelection) {
        this.changeSelection.destroy();
        this.changeSelection = null;
      }
      this.changeRevealed = false;
    }

    unmount() {
      if (this.walletPanel) this.walletPanel.destroy();
      if (this.paySelection) this.paySelection.destroy();
      if (this.changeSelection) this.changeSelection.destroy();
      this.walletPanel = this.paySelection = this.changeSelection = null;
      this.container.innerHTML = '';
    }
  }

  MG.LearnScreen = LearnScreen;
})();
