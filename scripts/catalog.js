(function () {
  const MG = (window.MG = window.MG || {});

  // basePriceC is the "true" price in cents (level-4 resolution). For lower
  // levels we round to that level's raster (1 = whole euro, 2 = 10 c, 3 = 5 c,
  // 4 = 1 c). Higher levels with bigger banknotes use the more expensive items.

  const CATALOG = [
    // ============ Tier 0 — under 1 € ============
    { id: 'apple',       emoji: '🍎', sk: 'jablko',             en: 'apple',          basePriceC: 40   },
    { id: 'banana',      emoji: '🍌', sk: 'banán',              en: 'banana',         basePriceC: 30   },
    { id: 'carrot',      emoji: '🥕', sk: 'mrkva',              en: 'carrot',         basePriceC: 90   },
    { id: 'lollipop',    emoji: '🍭', sk: 'lízatko',            en: 'lollipop',       basePriceC: 50   },
    { id: 'gum',         emoji: '🍬', sk: 'žuvačka',            en: 'gum',            basePriceC: 60   },
    { id: 'pencil',      emoji: '✏️', sk: 'ceruzka',            en: 'pencil',         basePriceC: 60   },
    { id: 'pretzel',     emoji: '🥨', sk: 'praclík',            en: 'pretzel',        basePriceC: 80   },

    // ============ Tier 1 — 1–3 € ============
    { id: 'bread',       emoji: '🍞', sk: 'chlieb',             en: 'bread',          basePriceC: 150  },
    { id: 'milk',        emoji: '🥛', sk: 'mlieko',             en: 'milk',           basePriceC: 120  },
    { id: 'balloon',     emoji: '🎈', sk: 'balón',              en: 'balloon',        basePriceC: 110  },
    { id: 'popcorn',     emoji: '🍿', sk: 'popcorn',            en: 'popcorn',        basePriceC: 130  },
    { id: 'tomato',      emoji: '🍅', sk: 'paradajka',          en: 'tomato',         basePriceC: 140  },
    { id: 'notebook',    emoji: '📒', sk: 'zošit',              en: 'notebook',       basePriceC: 170  },
    { id: 'chocolate',   emoji: '🍫', sk: 'čokoláda',           en: 'chocolate',      basePriceC: 180  },
    { id: 'juice',       emoji: '🧃', sk: 'džús',               en: 'juice',          basePriceC: 160  },
    { id: 'toothpaste',  emoji: '🦷', sk: 'zubná pasta',        en: 'toothpaste',     basePriceC: 220  },
    { id: 'cookies',     emoji: '🍪', sk: 'sušienky',           en: 'cookies',        basePriceC: 240  },
    { id: 'eggs',        emoji: '🥚', sk: 'vajcia',             en: 'eggs',           basePriceC: 280  },
    { id: 'grapes',      emoji: '🍇', sk: 'hrozno',             en: 'grapes',         basePriceC: 290  },

    // ============ Tier 2 — 3–10 € ============
    { id: 'cheese',      emoji: '🧀', sk: 'syr',                en: 'cheese',         basePriceC: 350  },
    { id: 'shampoo',     emoji: '🧴', sk: 'šampón',             en: 'shampoo',        basePriceC: 390  },
    { id: 'pizza',       emoji: '🍕', sk: 'pizza',              en: 'pizza',          basePriceC: 580  },
    { id: 'book',        emoji: '📕', sk: 'knižka',             en: 'book',           basePriceC: 690  },
    { id: 'football',    emoji: '⚽', sk: 'futbalová lopta',    en: 'football',       basePriceC: 890  },
    { id: 'umbrella',    emoji: '☂️', sk: 'dáždnik',            en: 'umbrella',       basePriceC: 750  },
    { id: 'cap',         emoji: '🧢', sk: 'šiltovka',           en: 'cap',            basePriceC: 690  },
    { id: 'sunglasses',  emoji: '🕶️', sk: 'slnečné okuliare',  en: 'sunglasses',     basePriceC: 990  },

    // ============ Tier 3 — 10–25 € ============
    { id: 'tshirt',      emoji: '👕', sk: 'tričko',             en: 't-shirt',        basePriceC: 1290 },
    { id: 'plush',       emoji: '🧸', sk: 'plyšový macko',      en: 'teddy bear',     basePriceC: 1490 },
    { id: 'puzzle',      emoji: '🧩', sk: 'puzzle',             en: 'puzzle',         basePriceC: 1690 },
    { id: 'boardgame',   emoji: '🎲', sk: 'spoločenská hra',    en: 'board game',     basePriceC: 1990 },
    { id: 'art',         emoji: '🎨', sk: 'výtvarná súprava',   en: 'art set',        basePriceC: 1890 },
    { id: 'watch',       emoji: '⌚', sk: 'hodinky',            en: 'wristwatch',     basePriceC: 2290 },
    { id: 'magic',       emoji: '🎩', sk: 'kúzelnícka súprava', en: 'magic kit',      basePriceC: 2490 },

    // ============ Tier 4 — 25–50 € ============
    { id: 'backpack',    emoji: '🎒', sk: 'školský batoh',      en: 'backpack',       basePriceC: 2990 },
    { id: 'lego',        emoji: '🧱', sk: 'lego sada',          en: 'lego set',       basePriceC: 3490 },
    { id: 'headphones',  emoji: '🎧', sk: 'slúchadlá',          en: 'headphones',     basePriceC: 3990 },
    { id: 'microscope',  emoji: '🔬', sk: 'mikroskop',          en: 'microscope',     basePriceC: 4490 },
    { id: 'sneakers',    emoji: '👟', sk: 'tenisky',            en: 'sneakers',       basePriceC: 4690 },
    { id: 'football_pro',emoji: '🏆', sk: 'pohár',              en: 'trophy',         basePriceC: 3290 },

    // ============ Tier 5 — 50–100 € ============
    { id: 'rollerblades',emoji: '🛼', sk: 'kolieskové korčule', en: 'roller skates',  basePriceC: 5490 },
    { id: 'guitar',      emoji: '🎸', sk: 'detská gitara',      en: 'kids guitar',    basePriceC: 5990 },
    { id: 'scooter',     emoji: '🛴', sk: 'kolobežka',          en: 'scooter',        basePriceC: 6990 },
    { id: 'tablet',      emoji: '📱', sk: 'tablet pre deti',    en: 'kids tablet',    basePriceC: 7990 },
    { id: 'drone',       emoji: '🛸', sk: 'detský dron',        en: 'kids drone',     basePriceC: 6490 },
    { id: 'skateboard',  emoji: '🛹', sk: 'skateboard',         en: 'skateboard',     basePriceC: 5790 },
    { id: 'bike',        emoji: '🚲', sk: 'bicykel',            en: 'bicycle',        basePriceC: 8990 },
  ];

  function roundToRaster(c, rasterC) {
    return Math.max(rasterC, Math.round(c / rasterC) * rasterC);
  }

  // Get product price at a given level
  function priceForLevel(product, level) {
    const L = MG.money.LEVELS[MG.money.clampLevel(level)];
    let p = roundToRaster(product.basePriceC, L.rasterC);
    if (p > L.maxC) p = L.maxC;
    if (p < L.minC) p = L.minC;
    return p;
  }

  function localizedName(product, locale) {
    return locale === 'en' ? product.en : product.sk;
  }

  // Pick `count` products at the given level, biased toward the level's price range
  // so that lvl 4 doesn't end up showing only 1€ candies when the wallet has 100€ banknotes.
  //
  // Strategy: split eligible products into low / mid / high price tiers (relative to the
  // level's maxC), then sample proportionally. Lvl 1 just shuffles uniformly; lvl 2+ skews
  // toward the upper tiers.
  function pickProductsForLevel(level, count, opts = {}) {
    const lvl = MG.money.clampLevel(level);
    const L = MG.money.LEVELS[lvl];
    const max = opts.maxC ?? L.maxC;
    // Exclude items whose natural price (before clamp) is above the level cap —
    // otherwise lvl 1 (max 10 €) would show every expensive item all at 10 €.
    const eligible = CATALOG.filter(p => {
      const natural = roundToRaster(p.basePriceC, L.rasterC);
      return natural <= max && natural >= L.minC;
    });

    if (eligible.length === 0) return [];

    if (lvl === 1) {
      // Lvl 1 has only cheap items anyway; just shuffle.
      return shuffle(eligible).slice(0, Math.min(count, eligible.length));
    }

    // Bucket by relative price (low <30%, mid 30-70%, high >=70% of max)
    const low = [], mid = [], high = [];
    for (const p of eligible) {
      const r = priceForLevel(p, lvl) / max;
      if (r < 0.3)      low.push(p);
      else if (r < 0.7) mid.push(p);
      else              high.push(p);
    }
    shuffle(low); shuffle(mid); shuffle(high);

    // Target distribution depending on level — higher levels lean expensive.
    const dist = lvl === 2 ? { low: 0.35, mid: 0.4,  high: 0.25 }
              : lvl === 3 ? { low: 0.30, mid: 0.35, high: 0.35 }
              :             { low: 0.25, mid: 0.35, high: 0.4  };

    const want = {
      low:  Math.round(count * dist.low),
      mid:  Math.round(count * dist.mid),
      high: 0,
    };
    want.high = Math.max(0, count - want.low - want.mid);

    const picked = [
      ...low.slice(0,  want.low),
      ...mid.slice(0,  want.mid),
      ...high.slice(0, want.high),
    ];

    // If a bucket was empty, top up from remaining eligible items.
    if (picked.length < count) {
      const remaining = eligible.filter(p => !picked.includes(p));
      shuffle(remaining);
      picked.push(...remaining.slice(0, count - picked.length));
    }

    return shuffle(picked).slice(0, count);
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function getById(id) {
    return CATALOG.find(p => p.id === id);
  }

  MG.catalog = {
    CATALOG,
    priceForLevel,
    localizedName,
    pickProductsForLevel,
    getById,
  };
})();
