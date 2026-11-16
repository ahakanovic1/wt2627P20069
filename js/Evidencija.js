export function Evidencija(tabelaRef, opcije = {}){

    //1. Provjer da li je proslijđena prava HTML tabela
    if(!(tabelaRef instanceof HTMLTableElement)){
        throw new Error("Neispravna tabela")
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

    //8. Ucitavanje pocetnih mjerenja iz tabele
    function ucitajPocetnaMjerenja() {
        const redovi = tabelaRef.tBodies[0]?.rows;

        if(!redovi){
            return;
        }

        for (const red in redovi){
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
        brojMjerenja(){
            return mjerenja.length;
        }
    };
}