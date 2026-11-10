# ODLUKE.md – EcoTrack (Spirala 1)

## 1. Flexbox ili Grid

**Flexbox za zaglavlje (`.site-header`) i meni (`.main-nav ul`)**  
Za zaglavlje sam se odlučio za Flexbox jer nam tu komponente (logo, meni i profil) stoje u jednom redu, a svaka ima drugačiju širinu. Flexbox je ovdje legao savršeno jer radi u jednoj dimenziji — pomoću `flex-wrap` element prirodno pređe u novi red čim nestane prostora, dok sam `margin-left: auto` iskoristio da elegantno gurnem profil na desnu stranu. Da sam išao sa Gridom, morao bih unaprijed fiksirati širine kolona, pa bi linkovi različitih dužina izgledali neprirodno ili bi me to natjeralo da pišem dodatne `@media` upite samo za prelamanje reda.

**Grid za kartice (`.statistics-section`) i opći raspored `<main>`**  
S druge strane, za kartice sam izabrao Grid uz trik `repeat(auto-fit, minmax(min(100%, 15.5rem), 1fr))`. Ovo omogućava Gridu da sam izračuna koliko kolona stane na ekran i svim karticama dâ jednaku širinu, pa se raspored od 3 kolone tečno spusti na 1 bez ijednog `@media` upita. 

Cijeli `<main>` je takođe u Gridu jer mi je trebala bočna traka koja se na širokom ekranu proteže kroz dva reda (`grid-row: 2 / span 2`). Flexbox bi se ovdje mučio: u zadnjem redu bi kartice dobile čudne širine u odnosu na one iznad njih, a i skoro je nemoguće natjerati Flexbox element da obuhvati tačno dva reda po visini.

## 2. CSS specifičnost

Trudio sam se da kod ostane čist, pa u CSS-u nema nijednog `!important`. Potencijalne sukobe stilova sam izbjegao prateći par jednostavnih pravila:

- Selektori su mi uglavnom svedeni na jednu ili dvije klase (bez upotrebe `id` selektora i inline stilova), što drži specifičnost ujednačenom.
- Sam CSS sam pisao po slojevima — od općih pravila i varijabli pri vrhu, pa do konkretnih komponenti pri dnu. Zbog toga pravila sa istom specifičnošću prirodno pregažaju ona iznad ako je potrebno.
- Kada mi je trebalo nadjačavanje općeg pravila, samo bih napravio malo precizniji selektor. Npr. `.eco-sidebar p` ukloni marginu (`margin: 0`), ali onda sa `.eco-goal .goal-description` (dvije klase) vratim donju marginu opisu cilja.
- Sve ključne vrijednosti sam izvukao u CSS varijable. Zahvaljujući tome, tamna tema samo promijeni vrijednosti tih varijabli, pa nisam morao pisati nikakva pravila za poništavanje stilova.

## 3. Box model

Na samom početku sam dodao `* { box-sizing: border-box; }`, što znači da izračunata širina i visina elementa već obuhvataju njegov padding i border. 

Da sam ostavio podrazumijevani `content-box`, desilo bi se sljedeće:

* **Širina kartica** se zapravo ne bi promijenila jer ih Grid već samostalno rasteže prema širini kolona. Međutim, **visina bi se pokvarila**: zadata `min-height: 11.875rem` bi se primijenila samo na sadržaj, pa bi se padding od `1.5rem` sa svih strana dodao preko toga. Kartice bi umjesto planiranih 218px u praksi narasle na 238px (izmjereno na ekranu širine 400px).
* **Mnogo veći problem** nastao bi na elementima koji imaju zadanu širinu i padding:
  - **Zaglavlje** (koje ima `width: min(...)` plus 2rem paddinga sa strana) bi ispalo iz okvira i stvorilo ružan horizontalni scroll od nekih 40px duž cijele stranice.
  - **Polja u formi i dugmad** (`width: 100%` uz dodati padding i border) bi jednostavno probili ivice sekcije u kojoj se nalaze.