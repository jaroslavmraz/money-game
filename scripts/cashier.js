(function () {
  const MG = (window.MG = window.MG || {});
  const { LEVELS, clampLevel, sumCounts, generateCashierRound, makeChange } = MG.money;
  const { getUI, formatPrice } = MG.i18n;
  const { WalletPanel, SelectionZone, playTone } = MG.wallet;

  const TOTAL_ROUNDS = 10;

  class CashierScreen {
    constructor(container, app) {
      this.container = container;
      this.app = app;
      this.session = null;
      this.drawerPanel = null;
      this.changeSelection = null;
    }

    mount() {
      const ui = getUI(this.app.state.locale);
      const level = clampLevel(this.app.state.level);

      this.session = {
        level,
        round: 1,
        score: 0,
        priceC: 0,
        paidC: 0,
        changeC: 0,
        returnCounts: {},
        prevPriceC: null,
        phase: 'answering',
      };

      this._buildSkeleton(ui);
      this._startRound();
    }

    _buildSkeleton(ui) {
      this.container.innerHTML = `
        <div class="play-screen">
          <div class="play-header">
            <div class="round-counter">${ui.round} <strong id="c-round">1</strong> / ${TOTAL_ROUNDS}</div>
            <div class="star-tally"><span class="star">★</span><strong id="c-score">0</strong></div>
          </div>
          <div class="cashier-scene">
            <div class="cashier-info">
              <div class="cashier-row">
                <span class="label">${ui.pricePaid}:</span>
                <span class="amount" id="c-price">${formatPrice(0, this.app.state.locale)}</span>
              </div>
              <div class="cashier-row">
                <span class="label">${ui.customerPaid}:</span>
                <span class="amount paid" id="c-paid">${formatPrice(0, this.app.state.locale)}</span>
              </div>
              <div class="cashier-task">${ui.giveChange}</div>
            </div>
            <div id="c-drawer"></div>
            <div id="c-return-selection"></div>
            <div class="feedback" id="c-feedback" aria-live="polite"></div>
          </div>
          <div class="action-row">
            <button class="btn btn-success btn-lg" id="c-action">${ui.check}</button>
          </div>
        </div>
      `;
      this.container.querySelector('#c-action').addEventListener('click', () => this._onAction());
    }

    _startRound() {
      const ui = getUI(this.app.state.locale);
      const { priceC, paidC, changeC } = generateCashierRound(this.session.level, this.session.prevPriceC);
      this.session.prevPriceC = priceC;
      this.session.priceC = priceC;
      this.session.paidC = paidC;
      this.session.changeC = changeC;
      this.session.returnCounts = {};
      this.session.phase = 'answering';

      this.container.querySelector('#c-round').textContent = String(this.session.round);
      this.container.querySelector('#c-price').textContent = formatPrice(priceC, this.app.state.locale);
      this.container.querySelector('#c-paid').textContent  = formatPrice(paidC, this.app.state.locale);
      this.container.querySelector('#c-feedback').textContent = '';
      this.container.querySelector('#c-feedback').className = 'feedback';
      const actionBtn = this.container.querySelector('#c-action');
      actionBtn.textContent = ui.check;
      actionBtn.disabled = false;

      this._renderDrawerAndReturn();
    }

    _renderDrawerAndReturn() {
      const ui = getUI(this.app.state.locale);
      const drawerMount = this.container.querySelector('#c-drawer');
      const returnMount = this.container.querySelector('#c-return-selection');

      // Drawer = unlimited inventory, all denoms <= changeC are most useful
      const denoms = LEVELS[this.session.level].denoms;

      if (this.drawerPanel) this.drawerPanel.destroy();
      this.drawerPanel = new WalletPanel(drawerMount, {
        mode: 'unlimited',
        denoms,
        locale: this.app.state.locale,
        title: ui.wallet,
        onPick: (d) => this._addReturn(d),
      });

      if (this.changeSelection) this.changeSelection.destroy();
      this.changeSelection = new SelectionZone(returnMount, {
        counts: this.session.returnCounts,
        locale: this.app.state.locale,
        title: ui.returnZone,
        totalLabel: ui.change,
        onRemove: (d) => this._removeReturn(d),
      });
      returnMount.classList.add('zone-change');
    }

    _addReturn(d) {
      if (this.session.phase !== 'answering') return;
      this.session.returnCounts[d] = (this.session.returnCounts[d] || 0) + 1;
      this.changeSelection.setCounts(this.session.returnCounts);
      playTone('click', this.app.state.soundOn);
    }

    _removeReturn(d) {
      if (this.session.phase !== 'answering') return;
      if (!this.session.returnCounts[d]) return;
      this.session.returnCounts[d]--;
      if (this.session.returnCounts[d] <= 0) delete this.session.returnCounts[d];
      this.changeSelection.setCounts(this.session.returnCounts);
    }

    _onAction() {
      if (this.session.phase === 'answering') this._check();
      else this._nextOrFinish();
    }

    _check() {
      const ui = getUI(this.app.state.locale);
      const given = sumCounts(this.session.returnCounts);
      const target = this.session.changeC;
      const fb = this.container.querySelector('#c-feedback');
      const actionBtn = this.container.querySelector('#c-action');

      if (given === target) {
        this.session.score++;
        this.container.querySelector('#c-score').textContent = String(this.session.score);
        fb.textContent = ui.correct;
        fb.className = 'feedback correct';
        playTone('correct', this.app.state.soundOn);
      } else if (given < target) {
        fb.textContent = `${ui.youPayLess} ${formatPrice(target - given, this.app.state.locale)} · ${ui.correctChange} ${formatPrice(target, this.app.state.locale)}`;
        fb.className = 'feedback wrong';
        playTone('wrong', this.app.state.soundOn);
      } else {
        fb.textContent = `${ui.youPayMore} ${formatPrice(given - target, this.app.state.locale)} ${ui.tooMuch} · ${ui.correctChange} ${formatPrice(target, this.app.state.locale)}`;
        fb.className = 'feedback wrong';
        playTone('wrong', this.app.state.soundOn);
      }

      this.session.phase = 'checked';
      const isLast = this.session.round >= TOTAL_ROUNDS;
      actionBtn.textContent = isLast ? ui.seeResults : ui.next;
    }

    _nextOrFinish() {
      if (this.session.round >= TOTAL_ROUNDS) {
        this.app.finishGame({
          mode: 'cashier',
          level: this.session.level,
          score: this.session.score,
          maxScore: TOTAL_ROUNDS,
        });
        return;
      }
      this.session.round++;
      this._startRound();
    }

    unmount() {
      if (this.drawerPanel) this.drawerPanel.destroy();
      if (this.changeSelection) this.changeSelection.destroy();
      this.drawerPanel = this.changeSelection = null;
      this.session = null;
      this.container.innerHTML = '';
    }
  }

  MG.CashierScreen = CashierScreen;
})();
