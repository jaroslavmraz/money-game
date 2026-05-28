(function () {
  const MG = (window.MG = window.MG || {});

  // ============ Denominations (in cents) ============

  const BANKNOTES = [500, 1000, 2000, 5000, 10000]; // 5, 10, 20, 50, 100 €
  const COINS     = [1, 2, 5, 10, 20, 50, 100, 200]; // 1c, 2c, 5c, 10c, 20c, 50c, 1€, 2€
  const ALL_DENOMS = [...COINS, ...BANKNOTES];       // ascending

  function denomKind(cents) {
    return BANKNOTES.includes(cents) ? 'banknote' : 'coin';
  }

  // ============ Levels ============

  // Level 1: whole euros only, up to 10 €. Banknotes 5/10€ + coins 1€/2€.
  // Level 2: + 10/20/50 c + 20€ banknote, up to 25 €, raster 10 c.
  // Level 3: + 5 c + 50€ banknote, up to 50 €, raster 5 c.
  // Level 4: + 1c/2c + 100€ banknote, up to 100 €, raster 1 c.
  const LEVELS = {
    1: { denoms: [100, 200, 500, 1000],                              maxC: 1000,  rasterC: 100, minC: 100 },
    2: { denoms: [10, 20, 50, 100, 200, 500, 1000, 2000],            maxC: 2500,  rasterC: 10,  minC: 50  },
    3: { denoms: [5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000],   maxC: 5000,  rasterC: 5,   minC: 50  },
    4: { denoms: [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000], maxC: 10000, rasterC: 1, minC: 50 },
  };

  function clampLevel(level) {
    const n = parseInt(level, 10);
    return [1, 2, 3, 4].includes(n) ? n : 1;
  }

  // ============ Random amount generation ============

  function randomAmount(level, prevC) {
    const L = LEVELS[clampLevel(level)];
    const slots = Math.floor((L.maxC - L.minC) / L.rasterC) + 1;
    for (let i = 0; i < 20; i++) {
      const slot = Math.floor(Math.random() * slots);
      const c = L.minC + slot * L.rasterC;
      if (c !== prevC) return c;
    }
    return L.minC + Math.floor(Math.random() * slots) * L.rasterC;
  }

  // ============ Multiset helpers ============

  // counts: { [denomCents]: integer count }
  function sumCounts(counts) {
    let s = 0;
    for (const d in counts) s += Number(d) * counts[d];
    return s;
  }

  function totalPieces(counts) {
    let n = 0;
    for (const d in counts) n += counts[d];
    return n;
  }

  function distinctDenoms(counts) {
    return Object.values(counts).filter(n => n > 0).length;
  }

  function cloneCounts(counts) {
    const out = {};
    for (const d in counts) if (counts[d] > 0) out[d] = counts[d];
    return out;
  }

  function addCounts(a, b) {
    const out = cloneCounts(a);
    for (const d in b) out[d] = (out[d] || 0) + b[d];
    return out;
  }

  // Expand counts to a flat array of denomination values, sorted descending
  function expandCounts(counts) {
    const out = [];
    for (const d in counts) {
      const n = counts[d] | 0;
      for (let i = 0; i < n; i++) out.push(Number(d));
    }
    out.sort((a, b) => b - a);
    return out;
  }

  function countsFromArray(arr) {
    const out = {};
    for (const v of arr) out[v] = (out[v] || 0) + 1;
    return out;
  }

  // ============ Greedy change-making ============

  function makeChange(amountC, denoms) {
    const sorted = [...denoms].sort((a, b) => b - a);
    const counts = {};
    let remaining = amountC;
    for (const d of sorted) {
      if (remaining <= 0) break;
      const n = Math.floor(remaining / d);
      if (n > 0) {
        counts[d] = n;
        remaining -= d * n;
      }
    }
    return counts;
  }

  // ============ Wallet generation for "pay exactly" mode ============
  //
  // Goal: produce a multiset of denominations such that:
  //   - SOME subset of it sums exactly to targetC.
  //   - The "intended" solution uses >= 2 distinct denominations
  //     (or >= 3 pieces if only 1 denom is feasible).
  //   - Extra decoy pieces are added so the child cannot just dump everything.

  function buildNonTrivialSolution(targetC, denoms) {
    // Choose intended solution. Strategy:
    //   1. Choose a "primary" denom < target as starter; add 1-2 of it.
    //   2. Fill the rest with greedy.
    //   3. If solution still has only 1 distinct denom, swap one piece for smaller change.

    const usable = denoms.filter(d => d <= targetC).sort((a, b) => b - a);
    if (!usable.length) return null;

    // For tiny targets where only one denom fits — accept it but ensure >= 3 pieces if possible
    if (targetC < (usable[usable.length - 1] || 1) * 2) {
      return makeChange(targetC, denoms);
    }

    // Pick starter: random denom strictly less than target, prefer mid-range
    const candidates = usable.filter(d => d < targetC);
    if (!candidates.length) return makeChange(targetC, denoms);
    const starter = candidates[Math.floor(Math.random() * candidates.length)];

    const starterMax = Math.floor(targetC / starter);
    const starterCount = Math.max(1, Math.min(starterMax - 1, 1 + Math.floor(Math.random() * 2)));

    const counts = { [starter]: starterCount };
    let remaining = targetC - starter * starterCount;

    // Fill with greedy on remaining denoms (excluding equal-to-remaining if possible to force variety)
    const sortedDesc = [...denoms].sort((a, b) => b - a);
    for (const d of sortedDesc) {
      if (remaining <= 0) break;
      while (remaining >= d) {
        counts[d] = (counts[d] || 0) + 1;
        remaining -= d;
      }
    }

    if (remaining !== 0) return null;

    // If still only one distinct denom and possible to split, split one piece into smaller change
    if (distinctDenoms(counts) === 1) {
      const onlyD = Number(Object.keys(counts)[0]);
      const smaller = denoms.filter(d => d < onlyD).sort((a, b) => b - a);
      if (smaller.length) {
        // Remove one piece, replace with greedy change of that piece using smaller denoms
        counts[onlyD]--;
        if (counts[onlyD] === 0) delete counts[onlyD];
        const replacement = makeChange(onlyD, smaller);
        return addCounts(counts, replacement);
      }
    }

    return counts;
  }

  function pickDecoys(denoms, solution, targetC, maxExtraValueC) {
    // Add 2-4 decoy pieces that don't trivially complete an alternative solution.
    // We just pick small denominations + a few that would overshoot.
    const decoys = {};
    const extraPieces = 2 + Math.floor(Math.random() * 3); // 2..4
    let extraValue = 0;
    const sm = [...denoms].sort((a, b) => a - b);
    for (let i = 0; i < extraPieces; i++) {
      // 60% small, 40% any
      const pool = Math.random() < 0.6 ? sm.slice(0, Math.max(3, Math.ceil(sm.length / 2))) : sm;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (extraValue + pick > maxExtraValueC) continue;
      decoys[pick] = (decoys[pick] || 0) + 1;
      extraValue += pick;
    }
    return decoys;
  }

  function generateWalletForTarget(targetC, level) {
    const L = LEVELS[clampLevel(level)];
    const denoms = L.denoms;

    let solution = null;
    for (let i = 0; i < 30; i++) {
      const s = buildNonTrivialSolution(targetC, denoms);
      if (!s) continue;
      const ok =
        sumCounts(s) === targetC &&
        (distinctDenoms(s) >= 2 || totalPieces(s) >= 3);
      if (ok) { solution = s; break; }
    }
    if (!solution) solution = makeChange(targetC, denoms);

    const decoys = pickDecoys(denoms, solution, targetC, Math.max(200, Math.floor(targetC * 0.6)));
    return {
      wallet: addCounts(solution, decoys),
      solution,
    };
  }

  // ============ Cashier mode: price + amount paid ============

  // Customer paid amount = smallest "round" amount strictly greater than price.
  // Round = single banknote/coin denomination at this level, OR price rounded up to next 10/whole-euro.
  function generatePaidAmount(priceC, level) {
    const L = LEVELS[clampLevel(level)];
    const denoms = L.denoms;

    // Try: cheapest single denom >= price
    const singleDenom = denoms.find(d => d >= priceC);
    if (singleDenom && singleDenom <= priceC + (L.maxC * 0.7)) {
      // sometimes randomly add a small "tip" amount (only at lvl 3-4 to keep it varied)
      if (level >= 3 && Math.random() < 0.35) {
        const extras = denoms.filter(d => d <= 200 && d >= 10);
        if (extras.length) {
          const extra = extras[Math.floor(Math.random() * extras.length)];
          return singleDenom + extra;
        }
      }
      return singleDenom;
    }

    // Fallback: round up to next 5 / 10 / 100 euros
    const roundTo = priceC < 1000 ? 100 : (priceC < 5000 ? 500 : 1000);
    return Math.ceil((priceC + 1) / roundTo) * roundTo;
  }

  function generateCashierRound(level, prevPriceC) {
    const L = LEVELS[clampLevel(level)];

    // Use 70% of max so change isn't always huge
    const maxPrice = Math.max(L.minC, Math.floor(L.maxC * 0.7));
    let priceC;
    for (let i = 0; i < 20; i++) {
      const slots = Math.floor((maxPrice - L.minC) / L.rasterC) + 1;
      const p = L.minC + Math.floor(Math.random() * slots) * L.rasterC;
      if (p !== prevPriceC) { priceC = p; break; }
    }
    if (priceC == null) priceC = L.minC;
    const paidC = generatePaidAmount(priceC, level);
    return { priceC, paidC, changeC: paidC - priceC };
  }

  // ============ Validation helpers ============

  function isSubset(small, big) {
    for (const d in small) {
      if ((big[d] || 0) < small[d]) return false;
    }
    return true;
  }

  MG.money = {
    BANKNOTES, COINS, ALL_DENOMS, LEVELS,
    denomKind, clampLevel, randomAmount,
    sumCounts, totalPieces, distinctDenoms, cloneCounts, addCounts,
    expandCounts, countsFromArray,
    makeChange, generateWalletForTarget,
    generateCashierRound, generatePaidAmount,
    isSubset,
  };
})();
