# Eurová Hra — Money Game

Webová vzdelávacia hra, ktorá učí deti narábať s eurami — bankovkami a mincami, počítaním nákupu a výdavku. Funguje na tablete aj v PC prehliadači. Bez build kroku — len HTML, CSS a vanilla JS.

A browser-based educational game that teaches kids to handle EUR cash — banknotes and coins, totals, and change. Runs on tablets and PCs. No build step — plain HTML, CSS and vanilla JS.

## Funkcie / Features

- **Nákup / Shopping** — dieťa skladá košík produktov, ráta sumu a zaplatí bankovkami a mincami. Vidí výdavok.
- **Zaplať presne / Pay exactly** — náhodná peňaženka, dieťa vyberie ktoré bankovky a mince spolu presne zaplatia sumu. 10 kôl, hviezdičky, ukladá najlepšie skóre.
- **Pokladník / Cashier** — dieťa je pokladník, dostane peniaze a vydáva výdavok z mincí a bankoviek.
- **Príbehový nákup / Story shopping** — postupný nákup viacerých vecí: koľko ti ostane? Vieš ešte kúpiť čokoládu?
- **4 úrovne obtiažnosti**:
  1. Celé eurá do 10 € (bankovky 5/10€ + mince 1€/2€)
  2. + 10/20/50 c, do 25 €
  3. + 5 c, do 50 €
  4. Všetky mince (1 c – 100 €)
- **2 jazyky**: Slovenčina, English.
- **Touch + myš** — funguje na tablete aj PC.
- **Ukladá sa**: vybraná úroveň, jazyk, zvuk, najlepšie skóre pre každú úroveň (v `localStorage`).

## Spustenie / How to run

### Najjednoduchšie — dvojklik na `index.html`
Aplikácia používa klasické `<script>` súbory (nie ES moduly), takže funguje aj cez `file://`.

```sh
open index.html       # macOS
xdg-open index.html   # Linux
start index.html      # Windows
```

### Cez lokálny server (odporúčané na tablete)
```sh
python3 -m http.server 8000
# potom v prehliadači: http://localhost:8000
```

### Nasadenie na GitHub Pages
```sh
git push
# v repo nastaveniach: Settings → Pages → Source: main / root
```

## Štruktúra projektu

```
money-game/
├── index.html              # SPA shell, mountuje aplikáciu
├── styles/
│   ├── base.css            # Reset, typografia, farebné tokeny
│   ├── ui.css              # Tlačidlá, karty, modal, layouty
│   └── money.css           # Bankovky, mince, peňaženka, shelf
└── scripts/
    ├── main.js             # Boot, routing medzi obrazovkami, settings
    ├── money.js            # Doménová matematika (denominácie, sumy, výdavok)
    ├── catalog.js          # Statický produktový katalóg
    ├── wallet.js           # UI komponent peňaženky a bankoviek/mincí
    ├── i18n.js             # Slovenčina + angličtina
    ├── storage.js          # localStorage wrapper
    ├── learn.js            # Nákup (košík)
    ├── test.js             # Zaplať presne + Výsledky
    ├── cashier.js          # Pokladník (výdavok)
    └── story.js            # Príbehový nákup
```

## Poznámka k bankovkám

Vizuálne bankovky a mince sú **štylizované** — nie sú reprodukciami skutočných EUR bankoviek. Sú to farebné karty s denomináciou v rohoch, aby spĺňali ECB pravidlá o reprodukcii eura.

## Kompatibilita / Compatibility

- Chrome / Edge 88+
- Safari 14+ (iPad)
- Firefox 89+
- Chrome on Android 88+
