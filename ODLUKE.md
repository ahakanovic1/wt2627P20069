# ODLUKE.md

## 1. Flexbox ili Grid

U projektu EcoTrack koristim oba CSS alata, ali za različite namjene.

- **CSS Grid** koristim u `.statistics-section` jer raspoređujem tri statističke kartice u kolone. Grid omogućava da kartice imaju uredan raspored, jednake širine i da se broj kolona promijeni pomoću media query pravila.
- **CSS Grid** koristim i u `.dashboard-layout` jer raspoređujem dvije glavne cjeline: `.measurement-section` i `.history-section`. Na širokom ekranu prikazuju se jedna pored druge, a ispod 900 px prelaze u jednu kolonu.
- **Flexbox** koristim u `.site-header`, `.logo`, `.main-nav ul`, `.eco-sidebar` i `.history-section`. Flexbox je pogodan za raspoređivanje elemenata u jednom pravcu, poravnanje sadržaja i kontrolu razmaka.
- U `.history-section` koristim `flex-direction: column` kako bi naslov i opis ostali iznad tabele, dok `.table-container` sa `flex: 1` zauzima preostali prostor i omogućava skrolanje.

Grid je izabran za dvodimenzionalni raspored kartica, a Flexbox za poravnanje elemenata unutar pojedinačnih sekcija.

## 2. CSS specifičnost i izuzetak `!important`

U CSS-u postoji jedan namjerni izuzetak sa `!important`:

```css
.eco-information {
    background-color: #F0F5EC !important;
    border-left: 5px solid #83B95A;
}
```

Opšte pravilo `.eco-sidebar section` postavlja pozadinu svim sekcijama bočne trake. Pravilo `.eco-information` treba da ima posebnu boju pozadine, različitu od `.eco-tip` sekcije.

Deklaracija `!important` osigurava da se posebna boja `.eco-information` primijeni i kada se pravila za pozadinu sukobe. U ovom projektu je to izdvojen i dokumentovan izuzetak; `!important` se ne koristi kao uobičajen način stilizovanja.

## 3. Simulacija box modela

Na početku CSS-a definisano je:

```css
* {
    box-sizing: border-box;
}
```

To znači da se zadana širina i visina elementa računaju zajedno sa paddingom i borderom.

Kada bi se uklonio `box-sizing: border-box`, podrazumijevana vrijednost bila bi `content-box`. Tada bi se padding i border dodavali na zadanu širinu elementa.

Na primjer, element širine `100%` sa lijevim i desnim paddingom od 30 px bio bi širi od raspoloživog prostora za ukupno 60 px, uz dodatak bordera. To bi moglo izazvati prelijevanje sadržaja, horizontalno skrolanje i poremetiti raspored kartica u Grid kontejneru.

Zadržavanjem `border-box` modela širina kartica uključuje njihov padding i border, pa je raspored predvidljiviji i lakše se prilagođava različitim veličinama ekrana.

## 4. Stacking context

U zaglavlju se koristi `isolation: isolate`, čime `.site-header` formira zaseban stacking context. Elementi zaglavlja imaju lokalne `z-index` vrijednosti:

- `.header-decoration` je dekorativni element u pozadini;
- `.logo` i `.main-nav` su iznad dekoracije;
- `.profile-menu` je iznad ostalih elemenata zaglavlja.

Profilni dropdown koristi `position: absolute` i prikazuje se kada korisnik pređe mišem preko profila ili fokusira njegov sadržaj tastaturom (`:hover` i `:focus-within`). Zaglavlje ima veći stacking prioritet u odnosu na glavni sadržaj kako bi se dropdown prikazao iznad kartica.

Na taj način se redoslijed slaganja elemenata kontroliše lokalnim i malim `z-index` vrijednostima, bez proizvoljno velikih brojeva.
