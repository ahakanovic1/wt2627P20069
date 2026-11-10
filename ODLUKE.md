# ODLUKE.md – EcoTrack, Spirala 1

Ovaj dokument objašnjava zašto je kod napisan baš ovako. Odgovori se odnose na `html/index.html` i `css/stil.css`.

\---

## 1\. Flexbox ili Grid

### Flexbox: zaglavlje (`.site-header`) i navigacija (`.main-nav ul`)

Zaglavlje je **jedan red** elemenata različitih širina: logo, meni i profil. Flexbox je napravljen za jednu os:

* `flex-wrap: wrap` pomjera meni i profil u novi red kad ne stanu, bez ijednog `@media` upita.
* `margin-left: auto` na `.profile-menu` gura profil skroz udesno.
* Svaki element zauzima onoliko mjesta koliko mu treba (`Početna` je kraća od `Unos mjerenja`).

**Zašto bi Grid ovdje bio slabiji:** Grid bi tražio unaprijed definisane kolone. Ili bi sve kolone bile iste širine (kratke i duge stavke menija bi izgledale neujednačeno), ili bih morao pisati `@media` upite za svaku širinu na kojoj se raspored lomi. Wrap ponašanje koje flexbox daje besplatno u gridu se ne dobija tako jednostavno.

### Grid: statističke kartice (`.statistics-section`) i glavni raspored (`.main-content`)

Kartice koriste:

```css
grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--card-min-width)), 1fr));
```

Grid je **dvodimenzionalan**: sam određuje koliko kolona stane, a sve kartice dobijaju istu širinu i redove poravnate po visini. Prelazak iz 3 kolone u 1 radi bez `@media` upita, što zadatak traži.

`.main-content` je takođe grid. Bočna traka na širokim ekranima zauzima treću kolonu i **proteže se kroz dva reda** (`grid-row: 2 / span 2`), uporedo sa karticama i formom/historijom.

**Zašto bi Flexbox ovdje bio slabiji:**

* U flexboxu s `flex-wrap` zadnji red kartica ima drugačiju širinu od prvog (ili se razvuku, ili treba računati `flex-basis` ručno).
* Flexbox nema pojam reda koji se proteže preko više elemenata, pa se bočna traka ne bi mogla poravnati s dva reda sadržaja bez dodatnog omotača (`<div>`), a to je upravo ono što zadatak zabranjuje.

\---

## 2\. CSS specifičnost

**U konačnom kodu nema nijednog `!important`.**

Jedan sukob specifičnosti se pojavio u bočnoj traci: pravilo `.eco-sidebar p` (specifičnost 0,1,1) postavlja `margin: 0` svim paragrafima, a opis cilja je trebao imati donju marginu. Umjesto `!important`, napisan je precizniji selektor `.eco-goal .goal-description` (0,2,0), koji pobjeđuje bez forsiranja.

Kako su selektori organizovani da se sukobi ne dešavaju:

* **Samo klase**, bez `id` selektora u CSS-u (id-jevi u HTML-u služe za sidrene linkove i `aria-labelledby`). Time su sve specifičnosti niske i uporedive.
* **Kratki, plitki selektori** (najviše dvije klase), bez dugih lanaca kao što je `main section div p`.
* **Redoslijed od općeg ka posebnom:** prvo varijable i osnovne postavke, zatim komponente (zaglavlje, kartice, forma, tabela, bočna traka). Kad dva pravila imaju istu specifičnost, kasnije pobjeđuje, pa je redoslijed namjeran.
* **Bez inline stilova.**
* **Varijable umjesto ponavljanja vrijednosti:** tamna tema mijenja samo vrijednosti varijabli u `:root`, a ne pravila, pa nema potrebe za nadjačavanjem.

\---

## 3\. Simulacija box modela

Pravilo `\\\*, \\\*::before, \\\*::after { box-sizing: border-box; }` znači da `width` i `height` uključuju padding i border. Bez njega bi vrijedio zadani `content-box`, gdje se padding i border **dodaju** na zadatu širinu.

Mjerenje na stranici s uklonjenim pravilom (širina ekrana 400px):

|Element|S `border-box`|Bez njega|
|-|-|-|
|Širina kartice|376px|376px (nepromijenjena)|
|Visina kartice|218px|238px|
|Horizontalni scroll stranice|0|40px|
|Desna ivica zaglavlja|388px|440px (viri izvan ekrana od 400px)|

**Šta se konkretno desi s karticama:**

* **Širina kartica se ne mijenja.** Kartica nema zadanu `width`, nego je grid razvuče na širinu kolone, a padding ostaje unutar nje.
* **Visina se povećava.** `min-height: 11.875rem` bi se odnosio samo na sadržaj, pa bi se dodavalo još `2 × 1.5rem` paddinga. Kartice bi bile više, a time i redovi grida.

**Šta bi se još pokvarilo (zbog `width: 100%` ili zadane širine uz padding):**

* **Zaglavlje** ima zadanu širinu i `padding` od `2rem` sa strane. Ono bi izašlo izvan širine ekrana i napravilo horizontalni scroll cijele stranice.
* **Polja forme i dugme** imaju `width: 100%` plus padding i border. Pošla bi preko desne ivice sekcije, a na uskim ekranima dugme probija i okvir sekcije.

Zato je `border-box` osnova robusnog rasporeda: zadana širina je ukupna širina elementa, bez obzira na padding i border.

\---

## Ostale odluke u arhitekturi

**Semantika.** Koriste se `header`, `nav`, `main`, `aside`, `section`, `article`, `footer`. `<div>` je ostao samo na jednom mjestu: `.table-container`, gdje je potreban kao scroll kontejner tabele i nema semantički ekvivalent. Naslovi idu bez preskakanja nivoa: `h1` (EcoTrack) → `h2` (sekcije) → `h3` (kartice i savjet).

**Forma.** Svako polje ima `<label for>`, pa klik na tekst aktivira unos. Obavezna polja označena su vizuelno zvjezdicom i semantički atributom `required` i skrivenim tekstom „(obavezno)" za čitače ekrana. Količina koristi `min="0.01"` i `step="0.01"` (samo pozitivni brojevi s dvije decimale), a datum `min`/`max` za 2026. godinu. Greška se prikazuje preko `:user-invalid`, tek nakon što korisnik interaguje s poljem. Greška se ne prenosi samo bojom: tekst postaje podebljan i dobija ikonu.

**Tabela.** Potpuna semantika (`caption`, `thead`, `tbody`, `th scope`). Kontejner ima `overflow: auto` i `max-height`, pa tabela ima vlastiti scroll, a `thead th` s `position: sticky; top: 0` ostaje na vrhu. `min-width` tabele (33rem) približno odgovara njenoj prirodnoj širini, pa scroll radi samo kad prostora zaista nema.

**CSS varijable i tamna tema.** Sve boje, razmaci, tipografija, ivice i sjene definisani su u `:root`. U pravilima nema hardkodiranih HEX/RGB vrijednosti. `@media (prefers-color-scheme: dark)` mijenja samo vrijednosti varijabli.

**Dropdown bez JavaScripta.** Meni se otvara na `:hover`, klikom (skriveni checkbox i `:checked`) i tastaturom (`:has(:focus-visible)`). Prazan pseudo-element (`::before`) premošćuje razmak između dugmeta i menija da se meni ne zatvori dok miš prelazi preko njega.

**Stacking context.** Hover na kartici koristi `transform`, što stvara novi stacking context. Zaglavlje ima `position: relative; z-index: 1`, a kartice nemaju `z-index`, pa je zaglavlje (a time i dropdown) uvijek iznad njih. Nije potrebna proizvoljna vrijednost poput `z-index: 99999`.

**Stres-test teksta.** Naziv postrojenja `ElektroenergetskoPostrojenjeZenica2026Test` (42 znaka bez razmaka) ostaje u kartici zahvaljujući `overflow-wrap: anywhere` i `min-width: 0` na kartici. Kolone se prilagođavaju bez probijanja kroz `minmax(min(100%, ...), 1fr)`.

