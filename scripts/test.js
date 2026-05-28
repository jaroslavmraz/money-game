(function () {
  const MG = (window.MG = window.MG || {});
  const { LEVELS, clampLevel, sumCounts, generateWalletForTarget, randomAmount, addCounts } = MG.money;
  const { getUI, formatPrice } = MG.i18n;
  const { WalletPanel, SelectionZone, playTone } = MG.wallet;
  const { recordBest } = MG.storage;

  const TOTAL_ROUNDS = 10;

  class TestScreen {
    constructor(container, app) {
      this.container = container;
      this.app = app;
      this.session = null;
      this.walletPanel = null;
      this.paySelection = null;
    }

    mount() {
      const ui = getUI(this.app.state.locale);
      const level = clampLevel(this.app.state.level);

      this.session = {
        level,
        round: 1,
        score: 0,
        prevTargetC: null,
        targetC: 0,
        walletCounts: {},
        payCounts: {},
        phase: 'answering',  // 'answering' | 'checked'
      };

      this._buildSkeleton(ui);
      this._startRound();
    }

    _buildSkeleton(ui) {
      this.container.innerHTML = `
        <div class="play-screen">
          <div class="play-header">
            <div class="round-counter">${ui.round} <strong id="t-round">1</strong> / ${TOTAL_ROUNDS}</div>
            <div class="star-tally"><span class="star">★</span><strong id="t-score">0</strong></div>
          </div>
          <div class="test-scene">
            <div class="test-task">
              <span class="pay-label">${ui.payAmount}</span>
              <span class="pay-amount" id="t-target">${formatPrice(0, this.app.state.locale)}</span>
            </div>
            <div id="t-wallet"></div>
            <div id="t-pay-selection"></div>
            <div class="feedback" id="t-feedback" aria-live="polite"></div>
          </div>
          <div class="action-row">
            <button class="btn btn-success btn-lg" id="t-action">${ui.check}</button>
          </div>
        </div>
      `;
      this.container.querySelector('#t-action').addEventListener('click', () => this._onAction());
    }

    _startRound() {
      const ui = getUI(this.app.state.locale);
      const level = this.session.level;
      const targetC = randomAmount(level, this.session.prevTargetC);
      this.session.prevTargetC = targetC;
      this.session.targetC = targetC;
      this.session.phase = 'answering';
      this.session.payCounts = {};

      // Generate non-trivial wallet
      const { wallet } = generateWalletForTarget(targetC, level);
      this.session.walletCounts = wallet;

      this.container.querySelector('#t-round').textContent = String(this.session.round);
      this.container.querySelector('#t-target').textContent = formatPrice(targetC, this.app.state.locale);
      this.container.querySelector('#t-feedback').textContent = '';
      this.container.querySelector('#t-feedback').className = 'feedback';
      const actionBtn = this.container.querySelector('#t-action');
      actionBtn.textContent = ui.check;
      actionBtn.disabled = false;

      this._renderWalletAndPay();
    }

    _renderWalletAndPay() {
      const ui = getUI(this.app.state.locale);
      const walletMount = this.container.querySelector('#t-wallet');
      const paySelMount = this.container.querySelector('#t-pay-selection');

      if (this.walletPanel) this.walletPanel.destroy();
      this.walletPanel = new WalletPanel(walletMount, {
        mode: 'limited',
        counts: this.session.walletCounts,
        locale: this.app.state.locale,
        title: ui.wallet,
        onPick: (d) => this._pickFromWallet(d),
      });

      if (this.paySelection) this.paySelection.destroy();
      this.paySelection = new SelectionZone(paySelMount, {
        counts: this.session.payCounts,
        locale: this.app.state.locale,
        title: ui.payZone,
        totalLabel: ui.paid,
        onRemove: (d) => this._returnToWallet(d),
      });
      paySelMount.classList.add('zone-pay');
    }

    _pickFromWallet(d) {
      if (this.session.phase !== 'answering') return;
      if ((this.session.walletCounts[d] || 0) <= 0) return;
      this.session.walletCounts[d]--;
      if (this.session.walletCounts[d] === 0) delete this.session.walletCounts[d];
      this.session.payCounts[d] = (this.session.payCounts[d] || 0) + 1;
      this.walletPanel.setCounts(this.session.walletCounts);
      this.paySelection.setCounts(this.session.payCounts);
      playTone('click', this.app.state.soundOn);
    }

    _returnToWallet(d) {
      if (this.session.phase !== 'answering') return;
      if ((this.session.payCounts[d] || 0) <= 0) return;
      this.session.payCounts[d]--;
      if (this.session.payCounts[d] === 0) delete this.session.payCounts[d];
      this.session.walletCounts[d] = (this.session.walletCounts[d] || 0) + 1;
      this.walletPanel.setCounts(this.session.walletCounts);
      this.paySelection.setCounts(this.session.payCounts);
    }

    _onAction() {
      if (this.session.phase === 'answering') this._check();
      else this._nextOrFinish();
    }

    _check() {
      const ui = getUI(this.app.state.locale);
      const paid = sumCounts(this.session.payCounts);
      const target = this.session.targetC;
      const fb = this.container.querySelector('#t-feedback');
      const actionBtn = this.container.querySelector('#t-action');

      if (paid === target) {
        this.session.score++;
        this.container.querySelector('#t-score').textContent = String(this.session.score);
        fb.textContent = ui.correct;
        fb.className = 'feedback correct';
        playTone('correct', this.app.state.soundOn);
      } else if (paid < target) {
        fb.textContent = `${ui.youPayLess} ${formatPrice(target - paid, this.app.state.locale)}`;
        fb.className = 'feedback wrong';
        playTone('wrong', this.app.state.soundOn);
      } else {
        fb.textContent = `${ui.youPayMore} ${formatPrice(paid - target, this.app.state.locale)} ${ui.tooMuch}`;
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
          mode: 'test',
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
      if (this.walletPanel) this.walletPanel.destroy();
      if (this.paySelection) this.paySelection.destroy();
      this.walletPanel = this.paySelection = null;
      this.session = null;
      this.container.innerHTML = '';
    }
  }

  class ResultsScreen {
    constructor(container, app) {
      this.container = container;
      this.app = app;
    }

    mount({ mode, level, score, maxScore }) {
      const ui = getUI(this.app.state.locale);
      const playedMode = mode || 'test';
      const totalMax = maxScore || 10;
      const isNewBest = recordBest(this.app.state, playedMode, level, score);
      const finalBest = this.app.state.bestScores[playedMode][level];

      const visibleStars = Math.min(score, totalMax);
      const starString = '★'.repeat(visibleStars) + '☆'.repeat(Math.max(0, totalMax - visibleStars));

      const modeLabel = ui[playedMode] || playedMode;

      this.container.innerHTML = `
        <div class="results">
          <div class="text-muted">${modeLabel}</div>
          <div class="results-stars" aria-label="${score} stars">${starString}</div>
          <div class="results-score">
            ${ui.yourScore}: <span class="text-mono">${score} / ${totalMax}</span>
          </div>
          <div class="results-best">
            ${ui.best}: ${finalBest} / ${totalMax}
          </div>
          ${isNewBest && score > 0 ? `<div class="results-newbest">⭐ ${ui.newBest}</div>` : ''}
          <div class="results-actions">
            <button class="btn btn-primary" id="res-again">${ui.playAgain}</button>
            <button class="btn" id="res-home">${ui.toHome}</button>
          </div>
        </div>
      `;

      this.container.querySelector('#res-again').addEventListener('click', () => this.app.setScreen(playedMode));
      this.container.querySelector('#res-home').addEventListener('click', () => this.app.setScreen('home'));
    }

    unmount() { this.container.innerHTML = ''; }
  }

  MG.TestScreen = TestScreen;
  MG.ResultsScreen = ResultsScreen;
})();
