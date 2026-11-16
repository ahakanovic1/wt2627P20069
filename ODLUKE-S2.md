# ODLUKE-S2.md

## 1. Kreiranje reda i XSS zaštita

Novi red dodajem u `dodajMjerenje()` pozivom `tbody.appendChild(red)` u `Evidencija.js` (linija 542). Tekst u ćelije upisujem preko `textContent`, jer tada unos ostaje običan tekst. Da koristim `innerHTML`, unos poput `<script>alert(1)</script>` bi se tumačio kao HTML i mogao bi otvoriti prostor za XSS napad.

## 2. Immutability

`{ ...mjerenje }` ne kopira i objekat `Date`, nego oba objekta zadržavaju istu referencu na datum. Zato u `dajMjerenja()` vraćam `datum: new Date(mjerenje.datum.getTime())`. Tako izmjena datuma u vraćenoj kopiji ne mijenja podatak u evidenciji.

## 3. aria-live

Na `#poruke` koristim `aria-live="polite"` uz `role="status"`. Poruka se najavi kada čitač ekrana završi trenutni govor, što je prikladno za potvrdu unosa i greške. `assertive` bi bespotrebno prekidao korisnika pri svakoj promjeni poruke.

## 4. Debounce

Prije obrade svakog novog submit događaja pozivam `clearTimeout(debounceTimer)`, a obradu pokrećem nakon 300 ms pomoću `setTimeout`. To sprječava da više brzih klikova doda više jednakih mjerenja. Kod klasičnog slanja forme bez JavaScript handlera ovaj debounce ne postoji; tada bi zaštitu od duplikata morao osigurati server.

## 5. Stabilno sortiranje

U `sortirajMjerenja()` uz svako mjerenje čuvam njegov početni indeks. Kada su dvije vrijednosti jednake, komparator vraća razliku tih indeksa. Na primjer, dva mjerenja struje zadržavaju isti međusobni redoslijed i nakon sortiranja po energentu. Sortiram kopiju, pa se interni niz i redovi tabele ne mijenjaju.
