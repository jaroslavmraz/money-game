(function () {
  const MG = (window.MG = window.MG || {});
  const { LEVELS, clampLevel, sumCounts } = MG.money;
  const { priceForLevel, localizedName, pickProductsForLevel } = MG.catalog;
  const { getUI, formatPrice } = MG.i18n;
  const { WalletPanel, SelectionZone, playTone } = MG.wallet;

  // ============ Story generator ============

  function pickStartAmount(level) {
    // round numbers that match level
    switch (level) {
      case 1: return 1000;  // 10 €
      case 2: return 2500;  // 25 €
      case 3: return 5000;  // 50 €
      case 4: return 10000; // 100 €
      default: return 1000;
    }
  }

  function numStepsForLevel(level) {
    switch (level) {
      case 1: return 3;
      case 2: return 4;
      case 3: return 5;
      case 4: return 6;
      default: return 3;
    }
  }

  function generateStorySteps(level) {
    const L = LEVELS[level];
    const startC = pickStartAmount(level);
    const n = numStepsForLevel(level);

    const candidates = pickProductsForLevel(level, n + 4);
    // Order of purchases: at higher levels start with an expensive item so the
    // story feels meaningful (don't open a 100 € shopping trip with a 1 € apple).
    // The buy loop falls back to any affordable item once budget shrinks.
    if (level === 1) {
      candidates.sort((a, b) => priceForLevel(a, level) - priceForLevel(b, level));
    } else {
      candidates.sort((a, b) => priceForLevel(b, level) - priceForLevel(a, level));
    }

    const steps = [];
    let balanceC = startC;
    let totalSpentC = 0;
    let idx = 0;

    for (let i = 0; i < n; i++) {
      // Pick next item that fits in budget; if none, end early
      let pick = null;
      for (let k = 0; k < candidates.length; k++) {
        const item = candidates[(idx + k) % candidates.length];
        const price = priceForLevel(item, level);
        if (price <= balanceC && price >= L.minC) {
          pick = { item, priceC: price, candidateIdx: (idx + k) % candidates.length };
          break;
        }
      }
      if (!pick) break;
      idx = (pick.candidateIdx + 1) % candidates.length;

      const before = balanceC;
      balanceC -= pick.priceC;
      totalSpentC += pick.priceC;
      steps.push({
        type: 'buy',
        item: pick.item,
        priceC: pick.priceC,
        balanceBeforeC: before,
        balanceAfterC: balanceC,
      });
    }

    // Optional "can you buy?" question at lvl >= 2
    if (level >= 2 && steps.length >= 2) {
      // Pick a more expensive item to test reasoning
      const moreExpensive = candidates[Math.min(candidates.length - 1, Math.floor(candidates.length * 0.75))];
      const cPrice = priceForLevel(moreExpensive, level);
      // Only ask if not trivially yes-or-no
      const margin = Math.abs(balanceC - cPrice);
      if (margin >= L.rasterC) {
        steps.push({
          type: 'canBuy',
          item: moreExpensive,
          priceC: cPrice,
          balanceC,
          expectedYes: balanceC >= cPrice,
        });
      }
    }

    // Final: total spent
    if (steps.length > 0) {
      steps.push({
        type: 'totalSpent',
        totalSpentC,
        startC,
        endBalanceC: balanceC,
      });
    }

    return { startC, steps, finalBalanceC: balanceC };
  }

  // ============ StoryScreen ============

  class StoryScreen {
    constructor(container, app) {
      this.container = container;
      this.app = app;
      this.session = null;
      this.walletPanel = null;
      this.answerZone = null;
    }

    mount() {
      const level = clampLevel(this.app.state.level);
      const generated = generateStorySteps(level);
      this.session = {
        level,
        startC: generated.startC,
        steps: generated.steps,
        finalBalanceC: generated.finalBalanceC,
        stepIdx: 0,
        score: 0,
        maxScore: generated.steps.length,
        answerCounts: {},
        phase: 'answering',  // 'answering' | 'checked'
      };

      this._buildSkeleton();
      this._renderStep();
    }

    _buildSkeleton() {
      const ui = getUI(this.app.state.locale);
      this.container.innerHTML = `
        <div class="play-screen">
          <div class="play-header">
            <div class="round-counter">${ui.round} <strong id="s-round">1</strong> / ${this.session.maxScore}</div>
            <div class="star-tally"><span class="star">★</span><strong id="s-score">0</strong></div>
          </div>
          <div class="story-step">
            <div class="story-progress" id="s-progress"></div>
            <div class="story-prompt" id="s-prompt"></div>
            <div id="s-wallet-display" hidden></div>
            <div id="s-wallet"></div>
            <div id="s-answer"></div>
            <div id="s-yesno" class="yesno-row" hidden></div>
            <div class="feedback" id="s-feedback" aria-live="polite"></div>
          </div>
          <div class="action-row">
            <button class="btn btn-success btn-lg" id="s-action" hidden>${ui.check}</button>
          </div>
        </div>
      `;
      this.container.querySelector('#s-action').addEventListener('click', () => this._onAction());
    }

    _renderStep() {
      const ui = getUI(this.app.state.locale);
      const step = this.session.steps[this.session.stepIdx];
      const locale = this.app.state.locale;
      this.session.answerCounts = {};
      this.session.phase = 'answering';

      this.container.querySelector('#s-round').textContent = String(this.session.stepIdx + 1);
      this.container.querySelector('#s-feedback').textContent = '';
      this.container.querySelector('#s-feedback').className = 'feedback';

      // Progress dots
      const progress = this.container.querySelector('#s-progress');
      progress.innerHTML = this.session.steps.map((_, i) => {
        const cls = i < this.session.stepIdx ? 'done' : (i === this.session.stepIdx ? 'current' : '');
        return `<span class="story-dot ${cls}"></span>`;
      }).join('');

      const promptEl = this.container.querySelector('#s-prompt');
      const yesnoEl = this.container.querySelector('#s-yesno');
      const walletMount = this.container.querySelector('#s-wallet');
      const answerMount = this.container.querySelector('#s-answer');
      const actionBtn = this.container.querySelector('#s-action');

      yesnoEl.hidden = true;
      walletMount.hidden = false;
      answerMount.hidden = false;
      actionBtn.hidden = false;
      actionBtn.textContent = ui.check;
      actionBtn.disabled = false;

      if (step.type === 'buy') {
        promptEl.innerHTML = `
          ${ui.youHave} <span class="amount-strong">${formatPrice(step.balanceBeforeC, locale)}</span>.<br>
          ${ui.buyItem} <span class="item-emoji">${step.item.emoji}</span> ${localizedName(step.item, locale)}
          ${ui.forPrice} <span class="item-price">${formatPrice(step.priceC, locale)}</span>.<br>
          <strong>${ui.youHaveLeft}</strong>
        `;
        this._renderAnswerBuilder(step.balanceAfterC);
      } else if (step.type === 'canBuy') {
        promptEl.innerHTML = `
          ${ui.youHave} <span class="amount-strong">${formatPrice(step.balanceC, locale)}</span>.<br>
          <strong>${ui.canYouBuy} <span class="item-emoji">${step.item.emoji}</span> ${localizedName(step.item, locale)}
          ${ui.forPrice} <span class="item-price">${formatPrice(step.priceC, locale)}</span>?</strong>
        `;
        walletMount.hidden = true;
        answerMount.hidden = true;
        actionBtn.hidden = true;
        yesnoEl.hidden = false;
        yesnoEl.innerHTML = `
          <button class="btn btn-success btn-lg" data-yn="yes">✅ ${ui.yes}</button>
          <button class="btn btn-danger btn-lg" data-yn="no">❌ ${ui.no}</button>
        `;
        yesnoEl.querySelectorAll('[data-yn]').forEach(btn => {
          btn.addEventListener('click', () => this._answerYesNo(btn.dataset.yn === 'yes'));
        });
      } else if (step.type === 'totalSpent') {
        promptEl.innerHTML = `
          ${ui.startedWith} <span class="amount-strong">${formatPrice(step.startC, locale)}</span>
          ${ui.nowYouHave} <span class="amount-strong">${formatPrice(step.endBalanceC, locale)}</span>.<br>
          <strong>${ui.spentTotal}</strong>
        `;
        this._renderAnswerBuilder(step.totalSpentC);
      }
    }

    _renderAnswerBuilder(expectedC) {
      const ui = getUI(this.app.state.locale);
      const walletMount = this.container.querySelector('#s-wallet');
      const answerMount = this.container.querySelector('#s-answer');

      this.session._expectedC = expectedC;

      if (this.walletPanel) this.walletPanel.destroy();
      this.walletPanel = new WalletPanel(walletMount, {
        mode: 'unlimited',
        denoms: LEVELS[this.session.level].denoms,
        locale: this.app.state.locale,
        small: true,
        title: `${ui.answerWith}:`,
        onPick: (d) => this._addAnswer(d),
      });

      if (this.answerZone) this.answerZone.destroy();
      this.answerZone = new SelectionZone(answerMount, {
        counts: this.session.answerCounts,
        locale: this.app.state.locale,
        small: true,
        title: ui.yourAnswer,
        totalLabel: ui.total,
        onRemove: (d) => this._removeAnswer(d),
      });
      answerMount.classList.add('zone-answer');
    }

    _addAnswer(d) {
      if (this.session.phase !== 'answering') return;
      this.session.answerCounts[d] = (this.session.answerCounts[d] || 0) + 1;
      this.answerZone.setCounts(this.session.answerCounts);
      playTone('click', this.app.state.soundOn);
    }

    _removeAnswer(d) {
      if (this.session.phase !== 'answering') return;
      if (!this.session.answerCounts[d]) return;
      this.session.answerCounts[d]--;
      if (this.session.answerCounts[d] <= 0) delete this.session.answerCounts[d];
      this.answerZone.setCounts(this.session.answerCounts);
    }

    _onAction() {
      if (this.session.phase === 'answering') this._checkBuilderAnswer();
      else this._nextOrFinish();
    }

    _checkBuilderAnswer() {
      const ui = getUI(this.app.state.locale);
      const locale = this.app.state.locale;
      const given = sumCounts(this.session.answerCounts);
      const expected = this.session._expectedC;
      const fb = this.container.querySelector('#s-feedback');
      const actionBtn = this.container.querySelector('#s-action');

      if (given === expected) {
        this.session.score++;
        this.container.querySelector('#s-score').textContent = String(this.session.score);
        fb.textContent = ui.correct;
        fb.className = 'feedback correct';
        playTone('correct', this.app.state.soundOn);
      } else if (given < expected) {
        fb.textContent = `${ui.youPayLess} ${formatPrice(expected - given, locale)} · ${ui.correctChange} ${formatPrice(expected, locale)}`;
        fb.className = 'feedback wrong';
        playTone('wrong', this.app.state.soundOn);
      } else {
        fb.textContent = `${ui.youPayMore} ${formatPrice(given - expected, locale)} ${ui.tooMuch} · ${ui.correctChange} ${formatPrice(expected, locale)}`;
        fb.className = 'feedback wrong';
        playTone('wrong', this.app.state.soundOn);
      }

      this.session.phase = 'checked';
      const isLast = this.session.stepIdx >= this.session.maxScore - 1;
      actionBtn.textContent = isLast ? ui.seeResults : ui.next;
    }

    _answerYesNo(picked) {
      const ui = getUI(this.app.state.locale);
      const step = this.session.steps[this.session.stepIdx];
      const fb = this.container.querySelector('#s-feedback');
      const correct = picked === step.expectedYes;
      const actionBtn = this.container.querySelector('#s-action');
      const yesnoEl = this.container.querySelector('#s-yesno');

      // Disable yes/no buttons
      yesnoEl.querySelectorAll('button').forEach(b => b.disabled = true);

      if (correct) {
        this.session.score++;
        this.container.querySelector('#s-score').textContent = String(this.session.score);
        fb.textContent = ui.correct;
        fb.className = 'feedback correct';
        playTone('correct', this.app.state.soundOn);
      } else {
        const reason = step.expectedYes
          ? `${ui.yes}, ${formatPrice(step.balanceC, this.app.state.locale)} ≥ ${formatPrice(step.priceC, this.app.state.locale)}`
          : `${ui.no}, ${formatPrice(step.balanceC, this.app.state.locale)} < ${formatPrice(step.priceC, this.app.state.locale)}`;
        fb.textContent = `${ui.wrong} ${reason}`;
        fb.className = 'feedback wrong';
        playTone('wrong', this.app.state.soundOn);
      }

      this.session.phase = 'checked';
      const isLast = this.session.stepIdx >= this.session.maxScore - 1;
      actionBtn.hidden = false;
      actionBtn.textContent = isLast ? ui.seeResults : ui.next;
    }

    _nextOrFinish() {
      if (this.session.stepIdx >= this.session.maxScore - 1) {
        this.app.finishGame({
          mode: 'story',
          level: this.session.level,
          score: this.session.score,
          maxScore: this.session.maxScore,
        });
        return;
      }
      this.session.stepIdx++;
      this._renderStep();
    }

    unmount() {
      if (this.walletPanel) this.walletPanel.destroy();
      if (this.answerZone) this.answerZone.destroy();
      this.walletPanel = this.answerZone = null;
      this.session = null;
      this.container.innerHTML = '';
    }
  }

  MG.StoryScreen = StoryScreen;
})();
