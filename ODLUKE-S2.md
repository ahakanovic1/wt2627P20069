# ODLUKE-S2.md

## EcoTrack -- obrazloženje arhitekture Spirale 2

> **Prije predaje:** Dokument je pripremljen prema postavci i kodu koji
> smo razvijali. Provjeri konkretne nazive varijabli i redove u konačnom
> `Evidencija.js` i `app.js`. Ako si ih mijenjao, prilagodi primjere
> tako da dokument opisuje tačno ono što tvoj kod radi.

## 1. Organizacija aplikacije i podjela odgovornosti

U Spirali 2 aplikaciju sam podijelio na dva JavaScript modula:

-   `Evidencija.js` upravlja mjerenjima, validacijom, CRUD operacijama i
    analitikom.
-   `app.js` povezuje modul sa HTML stranicom, obrađuje korisničke
    događaje i ažurira prikaz.

`Evidencija.js` koristi factory funkciju
`Evidencija(tabelaRef, opcije)`. Ona kreira i vraća objekat sa javnim
metodama. Interni niz mjerenja, faktori emisije i pomoćne funkcije
ostaju unutar factory funkcije. To znači da se interno stanje ne može
direktno mijenjati iz `app.js`, nego samo pozivanjem javnih metoda, kao
što su `dodajMjerenje()`, `ukloniMjerenje()` i `azurirajMjerenje()`.

Ovakva podjela je namjerna. Modul za evidenciju ne treba zavisiti od
izgleda kartica ili forme, a `app.js` ne treba samostalno mijenjati
podatke niti ponavljati poslovnu logiku. Tako se logika podataka može
koristiti i testirati nezavisno od konkretnog korisničkog interfejsa.

## 2. Dodavanje reda u tabelu i zaštita od XSS napada

### Gdje se dodaje novi red?

Novi red se kreira u metodi `dodajMjerenje()` u `Evidencija.js`. Red se
pravi DOM metodama, na primjer:

``` js
const red = document.createElement("tr");
const celija = document.createElement("td");
celija.textContent = vrijednost;
red.appendChild(celija);
tbody.appendChild(red);
```

U konačnom kodu treba provjeriti tačan naziv varijable koja predstavlja
`<tbody>`. Ključna linija je poziv `appendChild()` nad `<tbody>`
elementom. Novi red dodaje modul, a ne `app.js`. UI modul nakon
uspješnog dodavanja može tom redu dodati dugme za brisanje i animacijsku
klasu.

### Zašto `textContent`, a ne `innerHTML`?

Korisnički unos treba prikazivati kao običan tekst. `textContent`
postavlja tekstualni sadržaj elementa i ne pokušava ga parsirati kao
HTML.

Kada bi se unos ubacio preko `innerHTML`, preglednik bi pokušao
protumačiti sadržaj kao HTML. Na primjer:

``` html
<script>alert(1)</script>
```

mogao bi postati dio DOM-a kao HTML sadržaj. U zavisnosti od konteksta i
načina umetanja, takav pristup može otvoriti mogućnost za XSS
(Cross-Site Scripting), odnosno izvršavanje napadačkog JavaScript koda u
kontekstu aplikacije.

Zato se redovi i ćelije kreiraju pomoću `createElement()`, tekst se
postavlja preko `textContent`, a elementi se povezuju pomoću
`appendChild()`. Isti princip se koristi u `app.js` pri ažuriranju
kartica i poruka. Na taj način podaci se prikazuju kao tekst, a ne kao
HTML instrukcije.

## 3. Immutability -- kopiranje mjerenja koja sadrže Date

Metoda `dajMjerenja()` treba vratiti novi niz kopija mjerenja. Time se
pozivaocu omogućava da obrađuje vraćene podatke, bez mogućnosti da
slučajno promijeni interno stanje modula.

Samo površinsko kopiranje:

``` js
const kopija = { ...mjerenje };
```

nije dovoljno za objekat koji sadrži `Date`. Operator širenja pravi novi
vanjski objekat, ali vrijednost svojstva `datum` i dalje pokazuje na
isti `Date` objekat kao i original. Zbog toga bi izmjena `kopija.datum`
mogla promijeniti i datum internog mjerenja.

Zato se datum kopira posebno:

``` js
const kopija = {
    ...mjerenje,
    datum: new Date(mjerenje.datum.getTime())
};
```

`getTime()` vraća broj milisekundi koji predstavlja datum, a
`new Date(...)` na osnovu te vrijednosti pravi novi i nezavisan objekat.
Ostala polja (`id`, `energent`, `kolicina`, `incident`) primitivne su
vrijednosti, pa ih je dovoljno kopirati operatorom širenja.

## 4. `aria-live="polite"` i pristupačnost

Element `#poruke` koristi `role="status"` i `aria-live="polite"`. To
omogućava čitačima ekrana da najave promjenu sadržaja, na primjer
potvrdu uspješnog unosa ili poruke o greškama.

Odabrao sam `polite` jer ove poruke uglavnom nisu hitne. Čitač ekrana
može ih pročitati kada završi trenutni govor, bez prekidanja korisnika.
Vrijednost `assertive` bi prekinula trenutni govor i odmah najavila novu
poruku. To bi bilo previše nametljivo za uobičajene potvrde i
validacijske poruke u aplikaciji.

Poruke se postavljaju kroz `textContent`, pa se sadržaj čita kao tekst i
ne interpretira kao HTML.

## 5. Debounce od 300 ms

Na `submit` događaj forme pozivam `event.preventDefault()` kako bi se
spriječilo standardno slanje forme i ponovno učitavanje stranice. Obrada
se zatim odgađa pomoću `setTimeout()` za 300 ms. Ako u međuvremenu
stigne novi `submit`, prethodni timer se poništava pomoću
`clearTimeout()`.

Debounce znači da se obrada izvršava tek nakon što prođe 300 ms od
posljednjeg događaja. Time se sprečava da nekoliko brzih klikova izazove
više poziva `dodajMjerenje()` i kreira duplirane zapise.

Bez debounce mehanizma svaki submit događaj bi odmah pokrenuo dodavanje.
Ako korisnik brzo klikne nekoliko puta, aplikacija bi mogla pokušati
dodati isto mjerenje više puta.

Ako bi se forma slala direktno bez JavaScripta, klijentski debounce ne
bi bio potreban jer ne bi postojao JavaScript `submit` handler koji
obrađuje događaj. U stvarnoj aplikaciji server bi ipak morao imati
vlastitu validaciju i zaštitu od ponovljenih zahtjeva; debounce na
klijentu nije zamjena za serversku zaštitu.

## 6. Stabilno sortiranje

Metoda `sortirajMjerenja(kljuc, smjer)` prvo dobavlja kopiju mjerenja, a
zatim sortira tu kopiju. Tako se ne mijenja interno stanje modula niti
redoslijed redova u HTML tabeli.

Stabilno sortiranje znači da elementi koji imaju jednaku vrijednost za
kriterij sortiranja zadržavaju međusobni redoslijed iz početnog niza.
Primjer je sortiranje po `energent`: ako se dva mjerenja struje nalaze u
određenom redoslijedu u originalnom nizu, taj redoslijed treba ostati
isti i nakon sortiranja, čak i ako se između njih nalaze mjerenja plina
ili vode.

Savremeni JavaScript garantuje stabilnost metode
`Array.prototype.sort()`. Komparator zato treba vratiti `0` kada su
vrijednosti jednake. Ako konačna implementacija koristi i originalni
indeks kao dodatni kriterij, ovaj dio objašnjenja treba prilagoditi toj
implementaciji.

## 7. Dodatna metoda -- detekcija sezonalnosti

Kao dodatnu funkcionalnost implementirao sam
`detektujSezonalnost(energent)`. Metoda prvo izdvaja mjerenja traženog
energenta, zatim ih grupiše prema kalendarskom mjesecu i računa
prosječnu potrošnju za svaki mjesec. Nakon toga pronalazi mjesec sa
najvećim prosjekom i vraća objekat `{ mjesec, prosjek }`. Ako ne postoji
nijedno mjerenje za traženi energent, vraća `null`.

Ova funkcionalnost pomaže da se prepozna dio godine u kojem je prosječna
potrošnja određenog energenta najveća. JavaScriptova metoda `getMonth()`
vraća vrijednosti od 0 do 11, pa se pri formiranju rezultata dodaje 1
kako bi mjeseci bili prikazani u uobičajenom rasponu od 1 do 12.

## 8. Zaključak

Glavna arhitektonska odluka je razdvajanje podataka i prikaza.
`Evidencija.js` je odgovoran za validnost, čuvanje i obradu mjerenja,
dok `app.js` reaguje na korisničke akcije i prikazuje rezultate.
Privatno stanje, nezavisne kopije objekata `Date`, sigurno kreiranje DOM
elemenata, pristupačne poruke i stabilno sortiranje čine rješenje
predvidljivijim, sigurnijim i lakšim za održavanje.

## Kontrolna lista prije predaje

-   [ ] Provjeriti tačan red u kojem se novi red dodaje u `<tbody>` i po
    potrebi navesti broj reda iz editora.
-   [ ] Provjeriti da `dajMjerenja()` zaista kopira `Date` pomoću
    `new Date(...)`.
-   [ ] Provjeriti `role="status"` i `aria-live="polite"` na `#poruke`.
-   [ ] Provjeriti da debounce koristi `clearTimeout()` i
    `setTimeout(..., 300)`.
-   [ ] Provjeriti da `sortirajMjerenja()` sortira kopiju.
-   [ ] Provjeriti da opis dodatne metode odgovara konačnom kodu.
-   [ ] Pročitati dokument i prilagoditi ga vlastitim riječima prije
    predaje.
