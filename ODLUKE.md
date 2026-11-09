# ODLUKE.md

## 1. Flexbox ili Grid

U projektu EcoTrack koristim CSS Grid i Flexbox za različite vrste rasporeda.

- **CSS Grid** koristim u `.statistics-section` za raspored tri statističke kartice. `repeat(auto-fit, minmax(...))` omogućava da se broj kolona automatski prilagodi raspoloživoj širini, bez media queryja za ovaj raspored.
- **CSS Grid** koristim u `.dashboard-layout` za raspored forme i historije mjerenja. Na širim ekranima sekcije su jedna pored druge, a na užim prelaze u jednu kolonu.
- **CSS Grid** koristim u `.main-content` i `.eco-sidebar` za raspored glavnog sadržaja i bočne trake.
- **Flexbox** koristim u `.site-header`, `.logo`, `.main-nav ul`, `.profile-trigger` i `.history-section`. Pogodan je za poravnanje elemenata u jednom pravcu. U `.history-section` naslov ostaje iznad tabele, a tabela se nalazi u prostoru ispod njega.

Grid je izabran za rasporede u redovima i kolonama, dok Flexbox koristim za poravnanje elemenata unutar pojedinačnih komponenti.

## 2. CSS specifičnost i `!important`

U završnoj verziji projekta ne koristim `!important`.

Kada je potrebno posebno stilizovati opis ekološkog cilja, koristim selektor `.eco-goal .goal-description`. On je dovoljno specifičan da nadjača opštije pravilo `.eco-sidebar p`, bez potrebe za `!important`.

Specifičnost se rješava odgovarajućim selektorima i logičnim redoslijedom CSS pravila.

## 3. Simulacija box modela

Na početku CSS-a definisano je:

```css
*,
*::before,
*::after {
    box-sizing: border-box;
}
```

To znači da zadana širina i visina elementa uključuju padding i border.

Kada bi se uklonio `box-sizing: border-box`, podrazumijevana vrijednost bila bi `content-box`. Tada bi se padding i border dodavali na zadanu širinu elementa.

Na primjer, element širine `100%` sa lijevim i desnim paddingom od 30 px bio bi širi od raspoloživog prostora za ukupno 60 px, uz dodatak bordera. To bi moglo izazvati prelijevanje sadržaja i horizontalno skrolanje.

Zadržavanjem `border-box` modela dimenzije elemenata su predvidljivije, a raspored se lakše prilagođava različitim veličinama ekrana.

## 4. Stacking context

U zaglavlju se koristi `isolation: isolate`, čime `.site-header` formira zaseban stacking context. Zaglavlje ima `position: relative` i `z-index: 1`, pa se prikazuje iznad glavnog sadržaja.

- `.site-header::before` je dekorativni pseudo-element u pozadini;
- `.logo`, `.main-nav` i `.profile-menu` imaju lokalni `z-index` iznad dekoracije;
- profilni dropdown je apsolutno pozicioniran unutar `.profile-menu`.

Dropdown se može prikazati prelaskom miša, klikom na profilni checkbox ili fokusiranjem sadržaja tastaturom. `:focus-within` omogućava prikaz menija kada je fokus na nekom od njegovih potomaka.

Na taj način redoslijed slaganja elemenata kontroliše se malim i smislenim `z-index` vrijednostima.
