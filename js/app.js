
const { Evidencija } = window;

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
const CILJ_USTEDE_PROCENAT = 25;
const analizaEnergent = document.querySelector('[data-testid="analiza-energent"]');
const analizaRezultat = document.querySelector('[data-testid="analiza-rezultat"]');

// JavaScript prikazuje sve greške; bez njega ostaje ugrađena HTML validacija.
forma.noValidate = true;

const poljeDatuma = forma.elements["datum"];
if (poljeDatuma) {
    const godina = new Date().getFullYear();
    poljeDatuma.min = `${godina}-01-01`;
    poljeDatuma.max = `${godina}-12-31`;
    const uputa = document.getElementById("datum-hint");
    if (uputa) uputa.textContent = `Dozvoljen je samo datum u ${godina}. godini.`;
}


// --------------------------------------------------
// 3. POMOĆNA FUNKCIJA ZA FORMATIRANJE BROJEVA
// --------------------------------------------------

function formatirajBroj(broj) {
    return broj.toFixed(2).replace(".", ",");
}

let timerPoruke = null;

function ocistiPoruke() {
    clearTimeout(timerPoruke);
    timerPoruke = null;
    poruke.classList.remove("poruka-greska", "poruka-uspjeh");
    poruke.replaceChildren();
}

function ocistiValidaciju() {
    forma.querySelectorAll('[aria-invalid="true"]').forEach(polje => {
        polje.removeAttribute("aria-invalid");
    });
    ocistiPoruke();
}

function prikaziUspjeh(tekst) {
    ocistiPoruke();
    poruke.textContent = tekst;
    poruke.classList.add("poruka-uspjeh");
    timerPoruke = setTimeout(ocistiPoruke, 4000);
}

function prikaziGreske(greske) {
    ocistiPoruke();
    const naslov = document.createElement("strong");
    naslov.textContent = "Mjerenje nije sačuvano.";
    const uputa = document.createElement("p");
    uputa.textContent = "Ispravi sljedeće podatke i pokušaj ponovo:";
    const lista = document.createElement("ul");
    const nazivi = { energent: "Energent", kolicina: "Količina", datum: "Datum", incident: "Incident" };

    for (const greska of greske) {
        const stavka = document.createElement("li");
        const naziv = nazivi[greska.polje];
        stavka.textContent = naziv ? `${naziv}: ${greska.poruka}` : greska.poruka;
        lista.appendChild(stavka);

        const polje = forma.elements[greska.polje];
        if (polje) polje.setAttribute("aria-invalid", "true");
    }

    poruke.classList.add("poruka-greska");
    poruke.replaceChildren(naslov, uputa, lista);
}

function azurirajPrikazDatuma() {
    const polje = forma.elements["datum"];
    const prikaz = document.getElementById("datum-prikaz");
    if (!polje || !prikaz) return;

    const dijelovi = /^(\d{4})-(\d{2})-(\d{2})$/.exec(polje.value);
    if (!dijelovi) {
        prikaz.textContent = "";
        return;
    }

    const [, godina, mjesec, dan] = dijelovi.map(Number);
    const datum = new Date(godina, mjesec - 1, dan);
    if (datum.getFullYear() !== godina || datum.getMonth() !== mjesec - 1 || datum.getDate() !== dan) {
        prikaz.textContent = "";
        return;
    }

    const dd = String(datum.getDate()).padStart(2, "0");
    const mm = String(datum.getMonth() + 1).padStart(2, "0");
    prikaz.textContent = `Odabrani datum: ${dd}/${mm}/${datum.getFullYear()}`;
}

function obradiInterakcijuPolja(event) {
    const polje = event.target;
    if (!polje.matches('input:not([type="submit"]), select, textarea')) return;
    if (poruke.classList.contains("poruka-greska")) ocistiPoruke();
    polje.removeAttribute("aria-invalid");
    if (polje.name === "datum" && event.type !== "click") azurirajPrikazDatuma();
}

forma.addEventListener("click", obradiInterakcijuPolja);
forma.addEventListener("input", obradiInterakcijuPolja);
forma.addEventListener("change", obradiInterakcijuPolja);
azurirajPrikazDatuma();


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

    azurirajEkoloskiCilj(ukupnaEmisija, usteda);

    // Status postrojenja
    const postojiIncident = evidencija.dajMjerenja().some(
        mjerenje => mjerenje.incident === true
    );

    karticaStatus.textContent = postojiIncident
        ? "Kritično"
        : "Normalno";
}

function azurirajEkoloskiCilj(ukupnaEmisija, usteda) {
    const progress = document.querySelector('[data-testid="cilj-napredak"]');
    const napredakTekst = document.querySelector('[data-testid="cilj-napredak-tekst"]');
    const ustedaTekst = document.querySelector('[data-testid="cilj-usteda"]');
    const preostaloTekst = document.querySelector('[data-testid="cilj-preostalo"]');

    if (!progress || !napredakTekst || !ustedaTekst || !preostaloTekst) return;

    if (!Number.isFinite(ukupnaEmisija) || !Number.isFinite(usteda) || ukupnaEmisija <= 0) {
        progress.value = 0;
        progress.textContent = "0%";
        napredakTekst.textContent = "—";
        ustedaTekst.textContent = "";
        preostaloTekst.textContent = "Nema dovoljno podataka za procjenu ekološkog cilja";
        return;
    }

    const procenatUstede = (usteda / ukupnaEmisija) * 100;
    const napredak = Math.max(0, Math.min(100, (procenatUstede / CILJ_USTEDE_PROCENAT) * 100));
    const preostalo = Math.max(0, CILJ_USTEDE_PROCENAT - procenatUstede);
    const prikaziProcenat = broj => Number(broj.toFixed(2)).toLocaleString("bs-BA", { maximumFractionDigits: 2 });

    progress.value = napredak;
    progress.textContent = `${prikaziProcenat(napredak)}%`;
    napredakTekst.textContent = `${prikaziProcenat(napredak)}%`;
    ustedaTekst.textContent = `Trenutna procijenjena ušteda: ${prikaziProcenat(procenatUstede)}%`;
    preostaloTekst.textContent = preostalo === 0
        ? "Ekološki cilj je ostvaren!"
        : `Preostalo do cilja: ${prikaziProcenat(preostalo)} procentnih poena`;
}

function azurirajAnalizu() {
    if (!analizaEnergent || !analizaRezultat) return;

    const energent = analizaEnergent.value;
    if (!energent) {
        analizaRezultat.textContent = "Odaberite energent za prikaz analize potrošnje.";
        return;
    }

    const rezultat = evidencija.detektujSezonalnost(energent);
    if (!rezultat) {
        analizaRezultat.textContent = "Energent nije korišten u vašem svakodnevnom poslovanju.";
        return;
    }

    const mjeseci = ["januaru", "februaru", "martu", "aprilu", "maju", "junu", "julu", "augustu", "septembru", "oktobru", "novembru", "decembru"];
    const nazivi = { struja: "električne energije", plin: "plina", voda: "vode" };
    const jedinice = { struja: "kWh", plin: "m³", voda: "m³" };
    analizaRezultat.textContent = `Najveća prosječna potrošnja ${nazivi[energent]} zabilježena je u ${mjeseci[rezultat.mjesec - 1]} i iznosi ${formatirajBroj(rezultat.prosjek)} ${jedinice[energent]} po mjerenju.`;
}

function azurirajBrziPregled() {
    const broj = document.querySelector('[data-testid="pregled-broj-mjerenja"]');
    const zadnje = document.querySelector('[data-testid="pregled-zadnje-mjerenje"]');
    if (!broj || !zadnje) return;
    const mjerenja = evidencija.dajMjerenja();
    let najnovijiDatum = null;

    for (const mjerenje of mjerenja) {
        if (najnovijiDatum === null || mjerenje.datum > najnovijiDatum) {
            najnovijiDatum = mjerenje.datum;
        }
    }

    broj.textContent = evidencija.brojMjerenja();

    if (najnovijiDatum === null) {
        zadnje.textContent = "—";
        return;
    }

    const dan = String(najnovijiDatum.getDate()).padStart(2, "0");
    const mjesec = String(najnovijiDatum.getMonth() + 1).padStart(2, "0");
    const godina = najnovijiDatum.getFullYear();
    const vrijeme = document.createElement("time");
    vrijeme.dateTime = `${godina}-${mjesec}-${dan}`;
    vrijeme.textContent = `${dan}.${mjesec}.`;
    zadnje.replaceChildren(vrijeme);
}

function osvjeziPrikaz() {
    azurirajKartice();
    azurirajBrziPregled();
    azurirajAnalizu();
}

if (analizaEnergent && analizaRezultat) {
    analizaEnergent.addEventListener("change", azurirajAnalizu);
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

    // Prvi submit obrađujemo odmah; ponovljene pokušaje u kratkom nizu preskačemo.
    const prviPokusaj = debounceTimer === null;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        debounceTimer = null;
    }, 300);

    if (!prviPokusaj) return;

        const energent = forma.elements["energent"].value;

        const kolicina = forma.elements["kolicina"].valueAsNumber;

        const datumTekst = forma.elements["datum"].value;

        const incident = forma.elements["incident"].checked;

        // Kreiranje Date objekta u lokalnoj vremenskoj zoni
        const datumDijelovi = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datumTekst);
        let datum = new Date(NaN);

        if (datumDijelovi) {
            const [, godina, mjesec, dan] = datumDijelovi.map(Number);
            datum = new Date(godina, mjesec - 1, dan);
            if (datum.getFullYear() !== godina || datum.getMonth() !== mjesec - 1 || datum.getDate() !== dan) {
                datum = new Date(NaN);
            }
        }

        // Objekat koji šaljemo modulu
        const novoMjerenje = {
            energent,
            kolicina,
            datum,
            incident
        };

        // Poziv metode iz Evidencija.js
        ocistiValidaciju();
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
            osvjeziPrikaz();

            // Čistimo formu
            forma.reset();
            azurirajPrikazDatuma();

            // Potvrdna poruka
            prikaziUspjeh("Mjerenje je uspješno dodano.");

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
        osvjeziPrikaz();

        // Šaljemo CustomEvent za brisanje
        posaljiDogadjajBrisanja(id);

        // Poruka korisniku
        prikaziUspjeh("Mjerenje je uspješno obrisano.");
    }
});


// --------------------------------------------------
// 11. POČETNO AŽURIRANJE KARTICA
// --------------------------------------------------

osvjeziPrikaz();


// --------------------------------------------------
// 12. PRIMJER SLUŠANJA CUSTOM EVENTA
// --------------------------------------------------

tabela.addEventListener("mjerenje:dodano", function(event) {
    console.log("Dodano mjerenje:", event.detail.mjerenje);
});

tabela.addEventListener("mjerenje:uklonjeno", function(event) {
    console.log("Obrisano mjerenje ID:", event.detail.id);
});
