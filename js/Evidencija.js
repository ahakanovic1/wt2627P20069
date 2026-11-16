export function Evidencija(tabelaRef, opcije = {}){

    //1. Provjer da li je proslijđena prava HTML tabela
    if(!(tabelaRef instanceof HTMLTableElement)){
        throw new Error("Neispravna tabela!")
    }

    //2. Privatni podaci modula
    let mjerenja = [];
    let sljedeciId = 1;

    //3. Podrazumijevani faktori emisije
    const faktoriEmisije = {
        struja: 0.5,
        plin: 2.0,
        voda: 0.001,
        ...opcije.faktoriEmisije
    };

    //4.Podrazumijevane jedinice
    const jedinice = {
        struja: "kWh",
        plin: "m3",
        voda: "m3",
        ...opcije.jedinice
    }

    //5. pomocna funkcija za parsiranje kolicine
    function parsirajKolicinu(tekst){
        const ociscenTekst = tekst.replace(/\u00A0/g, " ").trim();

        const poklapanje = ociscenTekst.match(/^(\d+(?:[.,]\d{1,2})?)(?:\s*[a-zA-Z³²]+)?$/);

        if(!poklapanje) {
            return null;
        } 

        const broj = Number(poklapanje[1].replace(",", "."));

        if(!Number.isFinite(broj) || broj <=0){
            return null
        }

        return broj;
    }


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
            /^(\d{2})[./](\d{2})[./](\d{4})$/
        );

        if (!rezultat) {
            return null;
        }

        [, dan, mjesec, godina] = rezultat;
    }

    // Kreiranje Date objekta
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


    //7. Pomocna funcija za citanje incidenata
    function parsirajIncident(celija){
        const checkbox = celija.querySelector(
            'input[type="checkbox"]'
        );

        if(checkbox) {
            return checkbox.checked;
        }

        const tekst = celija.textContent.trim().toLowerCase();

        return ["da", "yes", "1", "x", "✓"].includes(tekst);
    }

    //dodajemo jos jednu metodu koja ce validirati datum
    function validanDatum(datum){
        return datum instanceof Date &&
                Number.isFinite(datum.getTime());
    }

    //8. Ucitavanje pocetnih mjerenja iz tabele
    function ucitajPocetnaMjerenja() {
        const redovi = tabelaRef.tBodies[0]?.rows;

        if(!redovi){
            return;
        }

        for (const red of redovi){
            const energentCelija = red.querySelector('[data-column="energent"]');
            const kolicinaCelija = red.querySelector('[data-column="kolicina"]');
            const datumCelija = red.querySelector('[data-column="datum"]');
            const incidentCelija = red.querySelector('[data-column="incident"]');

            //Ako neka od obaveznih celija nedostaje preskacemo red
            if(
                !energentCelija ||
                !kolicinaCelija ||
                !datumCelija ||
                !incidentCelija
            ){
                continue;
            }

            const energent = energentCelija.textContent
                            .trim().toLowerCase();
            const kolicina = parsirajKolicinu(kolicinaCelija.textContent);
            const datumTekst = datumCelija.querySelector("time")?.getAttribute("datetime")
                                || datumCelija.textContent;
            const datum = parsirajDatum(datumTekst);
            const incident = parsirajIncident(incidentCelija);

            //Neispravna mjerenja se ne ucitavaju
            if(
                !["struja", "plin", "voda"].includes(energent) ||
                kolicina === null || datum === null
            ){
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

    //9 Ucitavanje se izvrsava prilikom kreiranja modula
    ucitajPocetnaMjerenja();

    //Javen metode tek trebaju biti dodane
    return{
        //1. Vraća mjerenja uz opcionalno filtriranje
        dajMjerenja(filter = {}){

            //Ako j eproslijeden null, koristimo prazan filter
            filter = filter || {};

            //Pretvaramo datume filtera u vremenske vrijednosti
            const odDatuma = filter.odDatuma
                ? new Date(filter.odDatuma).getTime()
                : null;

            const doDatuma = filter.doDatuma
                ? new Date(filter.doDatuma).getTime()
                : null;
            
            //Filtriramo mjerenja
            const filtriranaMjerenja = mjerenja.filter(mjerenje =>{
                
                //Provjera energenata
                if(filter.energent && 
                    mjerenje.energent !== filter.energent.toLowerCase()
                ){
                    return false;
                }
                
                //provjera pocetnog datuma
                if(
                    odDatuma !== null &&
                    mjerenje.datum.getTime() < odDatuma
                ){
                    return false;
                }

                //Provjera zavrsnog datuma
                if(
                    doDatuma !== null &&
                    mjerenje.datum.getTime() > doDatuma
                ){
                    return false;
                }

                // Provjera da li zelimo samo incidente
                if(
                    filter.samoIncidenti === true &&
                    !mjerenje.incident
                ){
                    return false;
                }

                //ako nijedan uslov nije prekrsen, zadrzavamo mjerenje
                return true;

            });

            return filtriranaMjerenja.map(mjerenje => ({
                ...mjerenje,
                datum: new Date(mjerenje.datum.getTime())
            }));
        },

        dodajMjerenje(obj) {

            const greske = [];

            //1. Provjerava da li je proslijeđen objekat
            if(!obj || typeof obj !== "object" || Array.isArray(obj)) {
                return {
                    uspjesno: false,
                    greske: [{
                        polje: "obj",
                        poruka: "Morati proslijediti objekat mjerenja."
                    }]
                };
            }

            //2. Provjera energenta
            const energent = typeof obj.energent === "string"
                ? obj.energent.trim().toLowerCase()
                : "";
            
            if(!["struja", "plin", "voda"].includes(energent)) {
                greske.push({
                    polje: "energent",
                    poruka: "Energent mora biti struja, plin ili voda."
                });
            }

            //3. provjera količine
            const kolicina = Number(obj.kolicina);

            if(
                !Number.isFinite(kolicina) ||
                kolicina <= 0 ||
                Math.abs(kolicina*100 - Math.round(kolicina*100)) > 1e-8
            ){
                greske.push({
                    polje: "kolicina",
                    poruka: "količina mora biti pozitivan broj sa najviše dvije decimale."
                });
            }

            // 4. Provjera datuma
            if(!validanDatum(obj.datum)) {
                greske.push({
                    polje: "datum",
                    poruka: "Datum nije ispravan"
                });
            }

            // 5. Provjera incidenta
            if (typeof obj.incident !== "boolean") {
                greske.push({
                    polje: "incident",
                    poruka: "Incident mora biti true ili false."
                });
            }

            // 6. Ako postoje greške, prekidamo dodavanje
            if (greske.legth > 0) {
                return{
                    uspjesno: false,
                    greske
                };
            }

            // 7. Kreiranje novog mjrenja
            const id = sljedeciId++;

            const novoMjerenje = {
                id,
                energent,
                kolicina,
                datum: new Date(obj.datum.getTime()),
                incident: obj.incident
            };

            //8.Dodavanje u privatni niz
            mjerenja.push(novoMjerenje);

            // 9. Kreiranje novog HTML reda
            const red = document.createElement("tr");
            red.dataset.id = id;

            //Redni broj
            const redniBrojCelija = document.createElement("th");
            redniBrojCelija.scope = "row";
            redniBrojCelija.textContent = id;
            red.appendChild(redniBrojCelija);

            //Datum
            const datumCelija = document.createElement("td");
            datumCelija.dataset.column = "datum";

            const time = document.createElement("time");
            time.dateTime = novoMjerenje.datum.toISOString().slice(0,10);

            const dan = String(novoMjerenje.datum.getDate()).padStart(2,"0");
            const mjesec = String(novoMjerenje.datum.getMonth()+1).padStart(2,"0");
            const godina = novoMjerenje.datum.getFullYear();

            time.textContent = `${dan}.${mjesec}.${godina}.`;
            datumCelija.appendChild(time);
            red.appendChild(datumCelija);

            //Energent
            const energentCelija = document.createElement("td");
            energentCelija.dataset.column = "energent";
            energentCelija.textContent = 
                    energent.charAt(0).toUpperCase() + energent.slice(1);
            red.appendChild(energentCelija);

            //Kolicina
            const kolicinaCelija = document.createElement("td");
            kolicinaCelija.dataset.column = "kolicina";
            kolicinaCelija.textContent = 
                        `${kolicina.toFixed(2).replace(".", ",")} ${jedinice[energent]}`;
            red.appendChild(kolicinaCelija);

            //Emisija CO2
            const emisija= kolicina * faktoriEmisije[energent];

            const emisijaCelija = document.createElement("td");
            emisijaCelija.textContent =
                    `${emisija.toFixed(2).replace(".", ",")} kg`;
            red.appendChild(kolicinaCelija);

            //Incident
            const incidentCelija = document.createElement("td");
            incidentCelija.dataset.column = "incident";

            const oznaka = document.createElement("label");
            oznaka.className = novoMjerenje.incident
            ? "status-badge incident"
            : "status-badge normal";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "sr-only";
            checkbox.disabled = true;
            checkbox.checked = novoMjerenje.incident;

            oznaka.appendChild(checkbox);
            oznaka.appendChild(
                document.createTextNode(
                    novoMjerenje.incident ? "Incident" : "Normalno"
                )
            );

            incidentCelija.appendChild(oznaka);
            red.appendChild(incidentCelija);

            //10. Dodavanej reda u tabelu
            tabelaRef.tBodies[0].appendChild(red);

            //11- Vracanej rezultata
            return{
                uspjesno: true,
                greske: []
            };
        },

        //2.Vraca brpj svih mjerenja
        brojMjerenja(){
            return mjerenja.length;
        }
    };
}