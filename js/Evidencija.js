
export function Evidencija(tabelaRef, opcije = {}) {

    // 1. Provjera ispravnosti proslijeđene tabele
    if (!(tabelaRef instanceof HTMLTableElement)) {
        throw new Error("Neispravna tabela!");
    }

    // 2. Privatni podaci modula
    let mjerenja = [];
    let sljedeciId = 1;

    // 3. Podrazumijevani faktori emisije
    const faktoriEmisije = {
        struja: 0.5,
        plin: 2.0,
        voda: 0.001,
        ...opcije.faktoriEmisije
    };

    // 4. Podrazumijevane jedinice
    const jedinice = {
        struja: "kWh",
        plin: "m3",
        voda: "m3",
        ...opcije.jedinice
    };

    // 5. Parsiranje količine
    function parsirajKolicinu(tekst) {
        const ociscenTekst = tekst.replace(/\u00A0/g, " ").trim();

        const poklapanje = ociscenTekst.match(
            /^(\d+(?:[.,]\d{1,2})?)(?:\s*[a-zA-Z³²]+)?$/
        );

        if (!poklapanje) {
            return null;
        }

        const broj = Number(poklapanje[1].replace(",", "."));

        if (!Number.isFinite(broj) || broj <= 0) {
            return null;
        }

        return broj;
    }

    // 6. Parsiranje datuma
    function parsirajDatum(tekst) {
        const vrijednost = tekst.trim();

        let godina, mjesec, dan;

        // Format YYYY-MM-DD
        let rezultat = vrijednost.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );

        if (rezultat) {
            [, godina, mjesec, dan] = rezultat;
        } else {
            // Formati DD.MM.YYYY i DD/MM/YYYY
            rezultat = vrijednost.match(
                /^(\d{2})[./](\d{2})[./](\d{4})\.?$/
            );

            if (!rezultat) {
                return null;
            }

            [, dan, mjesec, godina] = rezultat;
        }

        const datum = new Date(
            Number(godina),
            Number(mjesec) - 1,
            Number(dan)
        );

        // Provjera validnosti datuma
        if (
            datum.getFullYear() !== Number(godina) ||
            datum.getMonth() !== Number(mjesec) - 1 ||
            datum.getDate() !== Number(dan)
        ) {
            return null;
        }

        return datum;
    }

    // 7. Parsiranje incidenta
    function parsirajIncident(celija) {
        const checkbox = celija.querySelector(
            'input[type="checkbox"]'
        );

        if (checkbox) {
            return checkbox.checked;
        }

        const tekst = celija.textContent.trim().toLowerCase();

        return ["da", "yes", "1", "x", "✓"].includes(tekst);
    }

    // 8. Provjera validnosti Date objekta
    function validanDatum(datum) {
        return datum instanceof Date &&
            Number.isFinite(datum.getTime());
    }

    // 9. Zajednička validacija mjerenja
    function validirajMjerenje(obj) {
        const greske = [];

        if (
            !obj ||
            typeof obj !== "object" ||
            Array.isArray(obj)
        ) {
            return {
                uspjesno: false,
                greske: [{
                    polje: "obj",
                    poruka: "Morate proslijediti objekat mjerenja."
                }]
            };
        }

        // Provjera energenta
        const energent = typeof obj.energent === "string"
            ? obj.energent.trim().toLowerCase()
            : "";

        if (!["struja", "plin", "voda"].includes(energent)) {
            greske.push({
                polje: "energent",
                poruka: "Energent mora biti struja, plin ili voda."
            });
        }

        // Provjera količine
        const kolicina = Number(obj.kolicina);

        if (
            !Number.isFinite(kolicina) ||
            kolicina <= 0 ||
            Math.abs(kolicina * 100 - Math.round(kolicina * 100)) > 1e-8
        ) {
            greske.push({
                polje: "kolicina",
                poruka: "Količina mora biti pozitivan broj sa najviše dvije decimale."
            });
        }

        // Provjera datuma
        if (!validanDatum(obj.datum)) {
            greske.push({
                polje: "datum",
                poruka: "Datum nije ispravan."
            });
        } else if (
            obj.datum.getFullYear() !== new Date().getFullYear()
        ) {
            greske.push({
                polje: "datum",
                poruka: "Datum mora biti unutar tekuće kalendarske godine."
            });
        }

        // Provjera incidenta
        if (typeof obj.incident !== "boolean") {
            greske.push({
                polje: "incident",
                poruka: "Incident mora biti true ili false."
            });
        }

        if (greske.length > 0) {
            return {
                uspjesno: false,
                greske
            };
        }

        // Vraćamo normalizovano mjerenje
        return {
            uspjesno: true,
            greske: [],
            mjerenje: {
                energent,
                kolicina,
                datum: new Date(obj.datum.getTime()),
                incident: obj.incident
            }
        };
    }

    // 10. Formatiranje datuma
    function formatirajDatum(datum) {
        const dan = String(datum.getDate()).padStart(2, "0");
        const mjesec = String(datum.getMonth() + 1).padStart(2, "0");
        const godina = datum.getFullYear();

        return {
            tekst: `${dan}.${mjesec}.${godina}.`,
            iso: `${godina}-${mjesec}-${dan}`
        };
    }

    // 11. Popunjavanje postojećeg HTML reda
    function popuniRed(red, mjerenje) {
        const datumCelija = red.querySelector('[data-column="datum"]');
        const energentCelija = red.querySelector('[data-column="energent"]');
        const kolicinaCelija = red.querySelector('[data-column="kolicina"]');
        const incidentCelija = red.querySelector('[data-column="incident"]');

        // U trenutnoj HTML tabeli emisija nema data-column atribut.
        // Zato koristimo petu ćeliju kao rezervnu mogućnost.
        const emisijaCelija =
            red.querySelector('[data-column="emisija"]') || red.cells[4];

        if (
            !datumCelija ||
            !energentCelija ||
            !kolicinaCelija ||
            !emisijaCelija ||
            !incidentCelija
        ) {
            throw new Error("Red tabele nema očekivane ćelije.");
        }

        red.dataset.id = mjerenje.id;

        // Datum
        const datum = formatirajDatum(mjerenje.datum);

        let time = datumCelija.querySelector("time");

        if (!time) {
            time = document.createElement("time");
            datumCelija.appendChild(time);
        }

        time.dateTime = datum.iso;
        time.textContent = datum.tekst;

        // Energent
        energentCelija.textContent =
            mjerenje.energent.charAt(0).toUpperCase() +
            mjerenje.energent.slice(1);

        // Količina
        kolicinaCelija.textContent =
            `${mjerenje.kolicina.toFixed(2).replace(".", ",")} ${jedinice[mjerenje.energent]}`;

        // Emisija CO2
        const emisija =
            mjerenje.kolicina * faktoriEmisije[mjerenje.energent];

        emisijaCelija.dataset.column = "emisija";

        emisijaCelija.textContent =
            `${emisija.toFixed(2).replace(".", ",")} kg`;

        // Incident
        let oznaka = incidentCelija.querySelector("label");

        if (!oznaka) {
            oznaka = document.createElement("label");
            incidentCelija.appendChild(oznaka);
        }

        oznaka.className = mjerenje.incident
            ? "status-badge incident"
            : "status-badge normal";

        let checkbox = oznaka.querySelector(
            'input[type="checkbox"]'
        );

        if (!checkbox) {
            checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "sr-only";
            checkbox.disabled = true;

            oznaka.prepend(checkbox);
        }

        checkbox.checked = mjerenje.incident;

        // Uklanjamo stari tekst, ali zadržavamo checkbox
        [...oznaka.childNodes].forEach(cvor => {
            if (cvor !== checkbox) {
                cvor.remove();
            }
        });

        oznaka.appendChild(
            document.createTextNode(
                mjerenje.incident ? "Incident" : "Normalno"
            )
        );
    }

    // 12. Kreiranje novog HTML reda
    function kreirajRed(mjerenje) {
        const red = document.createElement("tr");

        // Redni broj
        const redniBrojCelija = document.createElement("th");
        redniBrojCelija.scope = "row";
        redniBrojCelija.textContent = mjerenje.id;

        red.appendChild(redniBrojCelija);

        // Kreiranje ostalih ćelija
        for (const kolona of [
            "datum",
            "energent",
            "kolicina",
            "emisija",
            "incident"
        ]) {
            const celija = document.createElement("td");
            celija.dataset.column = kolona;

            red.appendChild(celija);
        }

        popuniRed(red, mjerenje);

        return red;
    }

    // 13. Učitavanje početnih mjerenja iz tabele
    function ucitajPocetnaMjerenja() {
        const redovi = tabelaRef.tBodies[0]?.rows;

        if (!redovi) {
            return;
        }

        for (const red of redovi) {
            const energentCelija =
                red.querySelector('[data-column="energent"]');

            const kolicinaCelija =
                red.querySelector('[data-column="kolicina"]');

            const datumCelija =
                red.querySelector('[data-column="datum"]');

            const incidentCelija =
                red.querySelector('[data-column="incident"]');

            // Ako nedostaje neka obavezna ćelija, preskačemo red
            if (
                !energentCelija ||
                !kolicinaCelija ||
                !datumCelija ||
                !incidentCelija
            ) {
                continue;
            }

            const energent = energentCelija.textContent
                .trim()
                .toLowerCase();

            const kolicina = parsirajKolicinu(
                kolicinaCelija.textContent
            );

            const datumTekst =
                datumCelija.querySelector("time")?.getAttribute("datetime") ||
                datumCelija.textContent;

            const datum = parsirajDatum(datumTekst);

            const incident = parsirajIncident(incidentCelija);

            // Neispravna mjerenja se ne učitavaju
            if (
                !["struja", "plin", "voda"].includes(energent) ||
                kolicina === null ||
                datum === null
            ) {
                continue;
            }

            const id = sljedeciId++;

            red.dataset.id = id;

            mjerenja.push({
                id,
                energent,
                kolicina,
                datum,
                incident
            });
        }
    }

    // Učitavanje početnih mjerenja prilikom kreiranja modula
    ucitajPocetnaMjerenja();

    // 14. Javne metode
    return {

        // Vraća mjerenja uz opcionalno filtriranje
        dajMjerenja(filter = {}) {
            filter = filter || {};

            const odDatuma = filter.odDatuma
                ? new Date(filter.odDatuma).getTime()
                : null;

            const doDatuma = filter.doDatuma
                ? new Date(filter.doDatuma).getTime()
                : null;

            // Neispravni datumi filtera
            if (
                (odDatuma !== null && !Number.isFinite(odDatuma)) ||
                (doDatuma !== null && !Number.isFinite(doDatuma))
            ) {
                return [];
            }

            return mjerenja
                .filter(mjerenje => {

                    if (
                        filter.energent &&
                        mjerenje.energent !==
                        String(filter.energent).trim().toLowerCase()
                    ) {
                        return false;
                    }

                    if (
                        odDatuma !== null &&
                        mjerenje.datum.getTime() < odDatuma
                    ) {
                        return false;
                    }

                    if (
                        doDatuma !== null &&
                        mjerenje.datum.getTime() > doDatuma
                    ) {
                        return false;
                    }

                    if (
                        filter.samoIncidenti === true &&
                        !mjerenje.incident
                    ) {
                        return false;
                    }

                    return true;
                })
                .map(mjerenje => ({
                    ...mjerenje,
                    datum: new Date(mjerenje.datum.getTime())
                }));
        },

        // Dodavanje novog mjerenja
        dodajMjerenje(obj) {
            const rezultat = validirajMjerenje(obj);

            if (!rezultat.uspjesno) {
                return {
                    uspjesno: false,
                    greske: rezultat.greske
                };
            }

            const tbody = tabelaRef.tBodies[0];

            if (!tbody) {
                return {
                    uspjesno: false,
                    greske: [{
                        polje: "tabela",
                        poruka: "Tabela nema tbody element."
                    }]
                };
            }

            const novoMjerenje = {
                id: sljedeciId,
                ...rezultat.mjerenje
            };

            try {
                const red = kreirajRed(novoMjerenje);
                tbody.appendChild(red);
            } catch (greska) {
                return {
                    uspjesno: false,
                    greske: [{
                        polje: "tabela",
                        poruka: "Novi red nije moguće dodati u tabelu."
                    }]
                };
            }

            mjerenja.push(novoMjerenje);
            sljedeciId++;

            return {
                uspjesno: true,
                greske: []
            };
        },

        // Uklanjanje mjerenja
        ukloniMjerenje(id) {
            const numerickiId = Number(id);

            const indeks = mjerenja.findIndex(
                mjerenje => mjerenje.id === numerickiId
            );

            if (indeks === -1) {
                return false;
            }

            const red = tabelaRef.querySelector(
                `tbody tr[data-id="${numerickiId}"]`
            );

            if (red) {
                red.remove();
            }

            mjerenja.splice(indeks, 1);

            return true;
        },

        // Ažuriranje postojećeg mjerenja
        azurirajMjerenje(id, izmjene) {
            const numerickiId = Number(id);

            const indeks = mjerenja.findIndex(
                mjerenje => mjerenje.id === numerickiId
            );

            if (indeks === -1) {
                return {
                    uspjesno: false,
                    greske: [{
                        polje: "id",
                        poruka: "Mjerenje ne postoji."
                    }]
                };
            }

            if (
                !izmjene ||
                typeof izmjene !== "object" ||
                Array.isArray(izmjene)
            ) {
                return {
                    uspjesno: false,
                    greske: [{
                        polje: "izmjene",
                        poruka: "Izmjene moraju biti objekat."
                    }]
                };
            }

            const staroMjerenje = mjerenja[indeks];

            // Pravimo kandidata za novo stanje
            const kandidat = {
                ...staroMjerenje,
                ...izmjene,
                id: staroMjerenje.id
            };

            const rezultat = validirajMjerenje(kandidat);

            if (!rezultat.uspjesno) {
                return {
                    uspjesno: false,
                    greske: rezultat.greske
                };
            }

            const red = tabelaRef.querySelector(
                `tbody tr[data-id="${numerickiId}"]`
            );

            if (!red) {
                return {
                    uspjesno: false,
                    greske: [{
                        polje: "tabela",
                        poruka: "HTML red mjerenja nije pronađen."
                    }]
                };
            }

            const novoMjerenje = {
                id: staroMjerenje.id,
                ...rezultat.mjerenje
            };

            try {
                popuniRed(red, novoMjerenje);
            } catch (greska) {
                return {
                    uspjesno: false,
                    greske: [{
                        polje: "tabela",
                        poruka: "HTML red mjerenja nije moguće ažurirati."
                    }]
                };
            }

            // Interno stanje mijenjamo nakon uspješnog ažuriranja reda
            mjerenja[indeks] = novoMjerenje;

            return {
                uspjesno: true,
                greske: []
            };
        },

        // Vraća ukupan broj mjerenja
        brojMjerenja() {
            return mjerenja.length;
        },

    
        dajUkupnuEmisiju(filter = {}) {
            
            // 1. Dohvatamo mjerenja koja zadovoljavaju filter
            const filtriranaMjerenja = this.dajMjerenja(filter);

            // 2. Početna ukupna emisija
            let ukupnaEmisija = 0;

            // 3. Prolazimo kroz sva filtrirana mjerenja
            for (const mjerenje of filtriranaMjerenja) {

                // 4. Računamo emisiju za trenutno mjerenje
                const emisija =
                    mjerenje.kolicina * faktoriEmisije[mjerenje.energent];

                // 5. Dodajemo emisiju ukupnom zbiru
                ukupnaEmisija += emisija;
            }

            // 6. Zaokružujemo rezultat na dvije decimale
            return Number(ukupnaEmisija.toFixed(2));
        },

        dajStatistikuPoEnergentu() {
            const statistika = {};

            const mjerenja = this.dajMjerenja();

            for (const mjerenje of mjerenja) {
                const energent = mjerenje.energent;
                const kolicina = mjerenje.kolicina;

             // Ako energent još ne postoji u objektu, inicijalizujemo ga
             if (!statistika[energent]) {
                    statistika[energent] = {
                        brojMjerenja: 0,
                        ukupno: 0,
                        prosjek: 0,
                        minimum: Infinity,
                        maksimum: -Infinity
                    };
                }

                const podaci = statistika[energent];

                podaci.brojMjerenja++;
                podaci.ukupno += kolicina;

                if (kolicina < podaci.minimum) {
                    podaci.minimum = kolicina;
                }

                if (kolicina > podaci.maksimum) {
                    podaci.maksimum = kolicina;
                }
            }

        // Nakon prolaska kroz sva mjerenja računamo prosjek
        for (const energent in statistika) {
            const podaci = statistika[energent];

            podaci.prosjek = podaci.ukupno / podaci.brojMjerenja;

            podaci.ukupno = Number(podaci.ukupno.toFixed(2));
            podaci.prosjek = Number(podaci.prosjek.toFixed(2));
        }

    return statistika;
    },
    prosjecnaPotrosnja(energent, period) {
        const danas = new Date();
        danas.setHours(23, 59, 59, 999);

        let brojDana;

                switch (period) {
                    case "sedmica":
                        brojDana = 7;
                        break;

                    case "mjesec":
                        brojDana = 30;
                        break;

                    case "godina":
                        brojDana = 365;
                        break;

                    default:
                        return 0;
                }

        const pocetniDatum = new Date(danas);
        pocetniDatum.setDate(pocetniDatum.getDate() - brojDana);
        pocetniDatum.setHours(0, 0, 0, 0);

                const filtriranaMjerenja = this.dajMjerenja({
                        energent: energent
                }).filter(mjerenje => {
                    return mjerenje.datum >= pocetniDatum &&
                            mjerenje.datum <= danas;
                        });

                if (filtriranaMjerenja.length === 0) {
                        return 0;
                }

                const ukupnaPotrosnja = filtriranaMjerenja.reduce(
                        (zbir, mjerenje) => zbir + mjerenje.kolicina,0);

                const prosjek = ukupnaPotrosnja / filtriranaMjerenja.length;

        return Number(prosjek.toFixed(2));
    },
    detektujAnomalije() {
        
        const anomalije = [];
        const mjerenja = this.dajMjerenja();

        // Računamo prosječnu potrošnju za svaki energent
        const statistika = this.dajStatistikuPoEnergentu();

        for (const mjerenje of mjerenja) {
            let razlog = null;

            // Prioritet 1: incident
            if (mjerenje.incident === true) {
                razlog = "incident";
            }

            // Prioritet 2: visoka potrošnja
            else if (
                statistika[mjerenje.energent] &&
                mjerenje.kolicina > 3 * statistika[mjerenje.energent].prosjek
            ) {
            razlog = "visoka_potrosnja";
            }

            // Prioritet 3: negativna potrošnja
            else if (mjerenje.kolicina < 0) {
                razlog = "negativna_potrosnja";
            }

            // Ako je pronađena anomalija, dodajemo je u niz
            if (razlog !== null) {
                anomalije.push({
                    id: mjerenje.id,
                    razlog: razlog
            });
            }
        }

        return anomalije;
    },

    generisiIzvjestaj(format) {
        const mjerenja = this.dajMjerenja();

        // JSON format
        if (format === "json") {
            return JSON.stringify(mjerenja, null, 2);
        }

        // CSV format
        if (format === "csv") {
            const zaglavlje = [
                "id",
                "energent",
                "kolicina",
                "datum",
                "incident"
            ];

            const redovi = mjerenja.map(mjerenje => {
                return [
                    mjerenje.id,
                    mjerenje.energent,
                    mjerenje.kolicina,
                    mjerenje.datum.toISOString().split("T")[0],
                    mjerenje.incident
                ];
            });

            // Spajanje vrijednosti u CSV format uz pravilno escapovanje
            const escapuj = vrijednost => {
                const tekst = String(vrijednost);

                if (/[",\n\r]/.test(tekst)) {
                    return `"${tekst.replace(/"/g, '""')}"`;
                }

                return tekst;
            };

            return [
                zaglavlje,
                ...redovi
            ]
                .map(red => red.map(escapuj).join(","))
                .join("\n");
        }

        // Nepoznat format
        return "";
    },

    sortirajMjerenja(kljuc, smjer) {
        const dozvoljeniKljuc = [
            "energent",
            "kolicina",
            "datum",
            "incident"
        ];

        // Provjera parametara
        if (!dozvoljeniKljuc.includes(kljuc)) {
            return [];
        }

        if (smjer !== "asc" && smjer !== "desc") {
            return [];
        }

        // Pravljenje kopije niza
        const sortiranaMjerenja = this.dajMjerenja();

        // Stabilno sortiranje
        sortiranaMjerenja.sort((a, b) => {
            let rezultat = 0;

            if (kljuc === "energent") {
                rezultat = a.energent.localeCompare(b.energent);
            }
            else if (kljuc === "kolicina") {
                rezultat = a.kolicina - b.kolicina;
            }
            else if (kljuc === "datum") {
                rezultat = a.datum - b.datum;
            }
            else if (kljuc === "incident") {
                rezultat = Number(a.incident) - Number(b.incident);
            }

            return smjer === "asc" ? rezultat : -rezultat;
        });

        return sortiranaMjerenja;
    },

    grupisiPoDanu() {
            
        const mjerenja = this.dajMjerenja();
        const grupe = {};

            for (const mjerenje of mjerenja) {
                const datum = mjerenje.datum;

                // Formiranje datuma u formatu YYYY-MM-DD
                const kljuc =
                    datum.getFullYear() + "-" +
                        String(datum.getMonth() + 1).padStart(2, "0") + "-" +
                        String(datum.getDate()).padStart(2, "0");

                    // Ako datum još ne postoji, kreiramo novi niz
                if (!grupe[kljuc]) {
                    grupe[kljuc] = [];
                }

                // Dodajemo mjerenje u odgovarajuću grupu
                grupe[kljuc].push(mjerenje);
            }

            // Sortiranje datuma rastućim redoslijedom
            const sortiraniDatumi = Object.keys(grupe).sort();

            const rezultat = {};

            for (const datum of sortiraniDatumi) {
                rezultat[datum] = grupe[datum];
            }

            return rezultat;
        },


        detektujSezonalnost(energent) {
            // Uzimamo samo mjerenja traženog energenta
            const filtriranaMjerenja = this.dajMjerenja({
                energent: energent
            });

            // Ako nema mjerenja, vraćamo null
            if (filtriranaMjerenja.length === 0) {
                return null;
            }

            // Niz od 12 objekata za praćenje mjesečne potrošnje
            const mjeseci = Array.from({ length: 12 }, () => ({
                ukupno: 0,
                broj: 0
            }));

            // Grupisanje mjerenja prema kalendarskom mjesecu
            for (const mjerenje of filtriranaMjerenja) {
                const indeksMjeseca = mjerenje.datum.getMonth();

                mjeseci[indeksMjeseca].ukupno += mjerenje.kolicina;
                mjeseci[indeksMjeseca].broj++;
            }

            let najboljiMjesec = null;
            let najveciProsjek = -Infinity;

            // Pronalazak mjeseca sa najvećim prosjekom
            for (let i = 0; i < mjeseci.length; i++) {
                const podaci = mjeseci[i];

                // Preskačemo mjesece bez mjerenja
                if (podaci.broj === 0) {
                    continue;
                }

                const prosjek = podaci.ukupno / podaci.broj;

                if (prosjek > najveciProsjek) {
                    najveciProsjek = prosjek;
                    najboljiMjesec = i + 1;
                }
            }

            return {
                mjesec: najboljiMjesec,
                prosjek: Number(najveciProsjek.toFixed(2))
            };
        },
    };
}
