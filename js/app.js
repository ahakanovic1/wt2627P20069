
import { Evidencija } from "./Evidencija.js";

// --------------------------------------------------
// 1. PRONALAŽENJE HTML ELEMENATA
// --------------------------------------------------

const forma = document.querySelector('[data-testid="forma"]');
const tabela = document.querySelector('[data-testid="tabela"]');
const poruke = document.querySelector('[data-testid="poruke"]');

const karticaEmisija = document.querySelector(
    '[data-testid="kartica-emisija"]'
);

const karticaUsteda = document.querySelector(
    '[data-testid="kartica-usteda"]'
);

const karticaStatus = document.querySelector(
    '[data-testid="kartica-status"]'
);

// Provjera da li svi potrebni elementi postoje
if (
    !forma ||
    !tabela ||
    !poruke ||
    !karticaEmisija ||
    !karticaUsteda ||
    !karticaStatus
) {
    throw new Error("Nedostaju potrebni HTML elementi!");
}


// --------------------------------------------------
// 2. KREIRANJE INSTANCE MODULA EVIDENCIJA
// --------------------------------------------------

const evidencija = Evidencija(tabela);


// --------------------------------------------------
// 3. POMOĆNA FUNKCIJA ZA FORMATIRANJE BROJEVA
// --------------------------------------------------

function formatirajBroj(broj) {
    return broj.toFixed(2).replace(".", ",");
}

function prikaziGreske(greske) {
    poruke.replaceChildren();

    for (const greska of greske) {
        const redPoruke = document.createElement("p");
        redPoruke.textContent = greska.poruka;
        poruke.appendChild(redPoruke);
    }
}


// --------------------------------------------------
// 4. AŽURIRANJE TRI STATISTIČKE KARTICE
// --------------------------------------------------

function azurirajKartice() {

    // Ukupna emisija CO2
    const ukupnaEmisija = evidencija.dajUkupnuEmisiju();

    karticaEmisija.textContent =
        `${formatirajBroj(ukupnaEmisija)} kg CO₂`;

    // Ušteda energije = 20% ukupne emisije
    const usteda = ukupnaEmisija * 0.20;

    karticaUsteda.textContent =
        `${formatirajBroj(usteda)} kg CO₂`;

    // Status postrojenja
    const postojiIncident = evidencija.dajMjerenja().some(
        mjerenje => mjerenje.incident === true
    );

    karticaStatus.textContent = postojiIncident
        ? "Kriticno"
        : "Normalno";
}


// --------------------------------------------------
// 5. KREIRANJE DUGMETA ZA BRISANJE
// --------------------------------------------------

function dodajDugmeZaBrisanje(red) {

    // Provjeravamo da li red već ima dugme
    if (red.querySelector(".delete-button")) {
        return;
    }

    const celija = document.createElement("td");

    const dugme = document.createElement("button");

    dugme.type = "button";
    dugme.className = "delete-button";
    dugme.textContent = "Obriši";
    dugme.setAttribute("aria-label", "Obriši mjerenje");

    celija.appendChild(dugme);

    red.appendChild(celija);
}


// Dodajemo dugmad svim početnim redovima
for (const red of tabela.tBodies[0].rows) {
    dodajDugmeZaBrisanje(red);
}


// --------------------------------------------------
// 6. ANIMACIJA NOVOG REDA
// --------------------------------------------------

function animirajNoviRed(red) {

    red.classList.add("--new");

    setTimeout(() => {
        red.classList.remove("--new");
    }, 2000);
}


// --------------------------------------------------
// 7. CUSTOM EVENT ZA DODAVANJE
// --------------------------------------------------

function posaljiDogadjajDodavanja(mjerenje) {

    const dogadjaj = new CustomEvent("mjerenje:dodano", {
        detail: {
            mjerenje: {
                id: mjerenje.id,
                energent: mjerenje.energent,
                kolicina: mjerenje.kolicina,
                datum: new Date(mjerenje.datum.getTime()),
                incident: mjerenje.incident
            }
        },
        bubbles: true
    });

    tabela.dispatchEvent(dogadjaj);
}


// --------------------------------------------------
// 8. CUSTOM EVENT ZA BRISANJE
// --------------------------------------------------

function posaljiDogadjajBrisanja(id) {

    const dogadjaj = new CustomEvent("mjerenje:uklonjeno", {
        detail: {
            id: id
        },
        bubbles: true
    });

    tabela.dispatchEvent(dogadjaj);
}


// --------------------------------------------------
// 9. OBRADA FORME I DEBOUNCE OD 300 ms
// --------------------------------------------------

let debounceTimer = null;

forma.addEventListener("submit", function(event) {

    // Sprečavamo standardno slanje forme
    event.preventDefault();

    // Svaki novi submit poništava prethodni timer
    clearTimeout(debounceTimer);

    // Obradu izvršavamo 300 ms nakon posljednjeg submit događaja
    debounceTimer = setTimeout(() => {

        const energent = forma.elements["energent"].value;

        const kolicina = Number(
            forma.elements["kolicina"].value
        );

        const datumTekst = forma.elements["datum"].value;

        const incident = forma.elements["incident"].checked;

        // Kreiranje Date objekta u lokalnoj vremenskoj zoni
        const [godina, mjesec, dan] = datumTekst
            .split("-")
            .map(Number);

        const datum = new Date(godina, mjesec - 1, dan);

        // Objekat koji šaljemo modulu
        const novoMjerenje = {
            energent,
            kolicina,
            datum,
            incident
        };

        // Poziv metode iz Evidencija.js
        const rezultat = evidencija.dodajMjerenje(novoMjerenje);

        // ------------------------------------------
        // USPJEŠAN UNOS
        // ------------------------------------------

        if (rezultat.uspjesno === true) {

            // Posljednji red koji je modul dodao
            const red = tabela.tBodies[0].lastElementChild;

            // Dodajemo dugme za brisanje
            dodajDugmeZaBrisanje(red);

            // Animiramo novi red
            animirajNoviRed(red);

            // Uzimamo upravo dodano mjerenje
            const id = Number(red.dataset.id);

            const mjerenje = evidencija.dajMjerenja().find(
                element => element.id === id
            );

            // Ažuriramo kartice
            azurirajKartice();

            // Čistimo formu
            forma.reset();

            // Potvrdna poruka
            poruke.textContent = "Mjerenje je uspješno dodano.";

            // Šaljemo CustomEvent
            posaljiDogadjajDodavanja(mjerenje);
        }

        // ------------------------------------------
        // NEUSPJEŠAN UNOS
        // ------------------------------------------

        else {

            // Izdvajamo poruke svih grešaka
            // Ispisujemo svaku grešku u zasebnom redu preko textContent.
            prikaziGreske(rezultat.greske);

            // Fokusiramo prvo neispravno polje
            const prvoPolje = rezultat.greske[0]?.polje;

            if (prvoPolje && forma.elements[prvoPolje]) {
                forma.elements[prvoPolje].focus();
            }
        }

        debounceTimer = null;

    }, 300);

});


// --------------------------------------------------
// 10. BRISANJE MJERENJA
// --------------------------------------------------

// Koristimo delegiranje događaja na tabeli
tabela.addEventListener("click", function(event) {

    const dugme = event.target.closest(".delete-button");

    // Ako klik nije bio na dugmetu za brisanje, prekidamo
    if (!dugme) {
        return;
    }

    // Pronalazimo red kojem dugme pripada
    const red = dugme.closest("tr");

    if (!red) {
        return;
    }

    const id = Number(red.dataset.id);

    // Pozivamo metodu za brisanje iz Evidencija.js
    const uspjesno = evidencija.ukloniMjerenje(id);

    if (uspjesno) {

        // Ažuriramo kartice
        azurirajKartice();

        // Šaljemo CustomEvent za brisanje
        posaljiDogadjajBrisanja(id);

        // Poruka korisniku
        poruke.textContent = "Mjerenje je uspješno obrisano.";
    }
});


// --------------------------------------------------
// 11. POČETNO AŽURIRANJE KARTICA
// --------------------------------------------------

azurirajKartice();


// --------------------------------------------------
// 12. PRIMJER SLUŠANJA CUSTOM EVENTA
// --------------------------------------------------

tabela.addEventListener("mjerenje:dodano", function(event) {
    console.log("Dodano mjerenje:", event.detail.mjerenje);
});

tabela.addEventListener("mjerenje:uklonjeno", function(event) {
    console.log("Obrisano mjerenje ID:", event.detail.id);
});
