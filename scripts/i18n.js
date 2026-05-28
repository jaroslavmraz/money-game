(function () {
  const MG = (window.MG = window.MG || {});

  const UI_SK = {
    appTitle: 'Eurová Hra', back: 'Späť', settings: 'Nastavenia',
    language: 'Jazyk / Language', sound: 'Zvuk', home: 'Domov',
    pickLevel: 'Vyber úroveň',
    level1: 'Celé eurá', level2: '+ 10/20/50 c', level3: '+ 5 c', level4: 'Všetky mince',
    level1Sub: 'do 10 €', level2Sub: 'do 25 €', level3Sub: 'do 50 €', level4Sub: 'do 100 €',
    best: 'Najlepšie',
    learn: 'Nákup', learnDesc: 'Skús si kúpiť veci a zaplatiť',
    test: 'Zaplať presne', testDesc: 'Vyber správne mince a bankovky',
    cashier: 'Pokladník', cashierDesc: 'Vydávaj výdavok zákazníkovi',
    story: 'Príbehový nákup', storyDesc: 'Postupne kupuj a počítaj zostatok',
    check: 'Skontrolovať', next: 'Ďalej',
    correct: 'Správne! 🎉', wrong: 'Skús to znova!',
    round: 'Kolo', yourScore: 'Tvoje skóre',
    newBest: 'Nový rekord!', playAgain: 'Hrať znova', toHome: 'Domov',
    seeResults: 'Pozrieť výsledky',
    // Shop / cart
    shop: 'Obchod', cart: 'Košík', total: 'Spolu', emptyCart: 'Košík je prázdny',
    addToCart: 'Pridať', remove: 'Odobrať', clearCart: 'Vyprázdniť košík',
    pay: 'Zaplať', payAmount: 'Zaplať:', paid: 'Zaplatené', change: 'Výdavok',
    youGet: 'Pokladníčka ti vráti', showChange: 'Vidieť výdavok',
    payNow: 'Zaplať', exactPay: 'Presne zaplatené!',
    youPayMore: 'Si o', youPayLess: 'Chýba ti', tooMuch: 'príliš veľa', tooLittle: 'príliš málo',
    // Wallet
    wallet: 'Peňaženka', payZone: 'Platím', returnZone: 'Vraciam', yourAnswer: 'Tvoja odpoveď',
    // Cashier
    customerPaid: 'Zákazník zaplatil',
    pricePaid: 'Cena bola',
    giveChange: 'Vydaj výdavok:',
    correctChange: 'Správny výdavok je',
    // Story
    youHave: 'Máš', youNowHave: 'Koľko máš teraz?',
    youHaveLeft: 'Koľko ti ostane?',
    spentTotal: 'Koľko si minul celkovo?',
    canYouBuy: 'Vieš ešte kúpiť', forPrice: 'za',
    yes: 'Áno', no: 'Nie',
    storyStart: 'V peňaženke máš',
    startedWith: 'Začínal si s',
    nowYouHave: 'a teraz máš',
    buyItem: 'Kúp',
    bonus: 'Pokladníčka ti dala',
    bonusFound: 'Mama ti dala',
    storyEnd: 'Hotovo! Zvládol si nákup.',
    answerWith: 'Sklad odpoveď z bankoviek a mincí',
    // Misc
    reset: 'Začať odznova', start: 'Začať', tryAgain: 'Skús znova',
    showHint: 'Pomoc', hideHint: 'Skryť pomoc',
    cents: 'centov', euro: '€',
  };

  const UI_EN = {
    appTitle: 'Euro Game', back: 'Back', settings: 'Settings',
    language: 'Language / Jazyk', sound: 'Sound', home: 'Home',
    pickLevel: 'Pick a level',
    level1: 'Whole euros', level2: '+ 10/20/50 ¢', level3: '+ 5 ¢', level4: 'All coins',
    level1Sub: 'up to € 10', level2Sub: 'up to € 25', level3Sub: 'up to € 50', level4Sub: 'up to € 100',
    best: 'Best',
    learn: 'Shopping', learnDesc: 'Try buying things and paying',
    test: 'Pay exactly', testDesc: 'Pick the right coins and banknotes',
    cashier: 'Cashier', cashierDesc: 'Give change to the customer',
    story: 'Shopping story', storyDesc: 'Buy step-by-step and count what is left',
    check: 'Check', next: 'Next',
    correct: 'Correct! 🎉', wrong: 'Try again!',
    round: 'Round', yourScore: 'Your score',
    newBest: 'New best!', playAgain: 'Play again', toHome: 'Home',
    seeResults: 'See results',
    shop: 'Shop', cart: 'Cart', total: 'Total', emptyCart: 'Cart is empty',
    addToCart: 'Add', remove: 'Remove', clearCart: 'Clear cart',
    pay: 'Pay', payAmount: 'Pay:', paid: 'Paid', change: 'Change',
    youGet: 'You get back', showChange: 'See change',
    payNow: 'Pay now', exactPay: 'Exactly paid!',
    youPayMore: 'You are', youPayLess: 'You need', tooMuch: 'too much', tooLittle: 'too little',
    wallet: 'Wallet', payZone: 'Paying', returnZone: 'Returning', yourAnswer: 'Your answer',
    customerPaid: 'Customer paid',
    pricePaid: 'Price was',
    giveChange: 'Give change:',
    correctChange: 'Correct change is',
    youHave: 'You have', youNowHave: 'How much do you have now?',
    youHaveLeft: 'How much is left?',
    spentTotal: 'How much did you spend in total?',
    canYouBuy: 'Can you still buy', forPrice: 'for',
    yes: 'Yes', no: 'No',
    storyStart: 'In your wallet you have',
    startedWith: 'You started with',
    nowYouHave: 'and now you have',
    buyItem: 'Buy',
    bonus: 'The cashier gave you',
    bonusFound: 'Mom gave you',
    storyEnd: 'Done! You finished the shopping.',
    answerWith: 'Build your answer from banknotes and coins',
    reset: 'Start over', start: 'Start', tryAgain: 'Try again',
    showHint: 'Hint', hideHint: 'Hide hint',
    cents: 'cents', euro: '€',
  };

  function getUI(locale) {
    return locale === 'en' ? UI_EN : UI_SK;
  }

  // ============ Price formatting (cents → "3,45 €") ============

  function formatPrice(cents, locale) {
    const sign = cents < 0 ? '-' : '';
    const abs = Math.abs(cents);
    const euros = Math.floor(abs / 100);
    const c = abs % 100;
    const cStr = String(c).padStart(2, '0');
    if (locale === 'en') {
      return `${sign}€ ${euros}.${cStr}`;
    }
    return `${sign}${euros},${cStr} €`;
  }

  // Short version for when we know we have whole euros: "5 €" / "1,50 €"
  function formatPriceShort(cents, locale) {
    if (cents % 100 === 0) {
      const euros = cents / 100;
      return locale === 'en' ? `€ ${euros}` : `${euros} €`;
    }
    return formatPrice(cents, locale);
  }

  // Just the denomination label for a banknote/coin (no thousand-separator)
  // 500 -> "5 €", 50 -> "50 ¢", 1 -> "1 ¢", 1000 -> "10 €"
  function formatDenomination(cents, locale) {
    if (cents >= 100) {
      const euros = cents / 100;
      const eStr = Number.isInteger(euros) ? String(euros) : String(euros);
      return locale === 'en' ? `€${eStr}` : `${eStr} €`;
    }
    return locale === 'en' ? `${cents}¢` : `${cents} ¢`;
  }

  function applyStaticI18n(locale) {
    const ui = getUI(locale);
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (ui[key]) el.textContent = ui[key];
    });
    document.documentElement.lang = locale === 'en' ? 'en' : 'sk';
  }

  MG.i18n = {
    getUI, applyStaticI18n,
    formatPrice, formatPriceShort, formatDenomination,
  };
})();
