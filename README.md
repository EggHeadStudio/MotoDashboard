# Moto Dashboard

Suomenkielinen digitaalinen moottoripyörän mittaristo iPhonelle. Toimii selaimessa suoraan ilman asennusta.

## Sovelluksen tarkoitus

Moto Dashboard on täysikuvaruudun GPS-mittaristo, joka näyttää samanaikaisesti:

- **GPS-nopeuden** km/h (suuri, helposti luettava)
- Kellon (24 h, suomalainen muoto)
- Ulkolämpötilan ja säätiedot (Open-Meteo, ilmainen, ei API-avainta)
- Tuulen nopeuden
- GPS-tarkkuuden ja -tilan
- Verkkoyhteyden tilan
- Interaktiivisen kartan (Leaflet + OpenStreetMap)

## Sovelluksen URL

**https://eggheadstudio.github.io/MotoDashboard/**

## GitHub Pages -käyttöönotto

1. Avaa repositorion **Settings**
2. Valitse **Pages** vasemmasta valikosta
3. Kohdassa **Build and deployment** valitse **Deploy from a branch**
4. Valitse haaran nimeksi **main**
5. Valitse hakemistoksi **/(root)**
6. Paina **Save**

Sivusto julkaistaan muutaman minuutin sisällä yllä olevaan URL-osoitteeseen.

## iPhone-käyttöohjeet

1. Avaa **https://eggheadstudio.github.io/MotoDashboard/** Safarin osoiteriviltä.
2. Aseta iPhone vaakasuuntaan moottoripyörän puhelinkiinnittimeen.
3. Paina **Aloita**-painiketta.
4. Salli tarkka sijainti kun selain pyytää lupaa.
5. GPS-signaali löytyy yleensä muutamassa sekunnissa.
6. Käytä sovellusta ennen liikkeelle lähtöä, jotta GPS ehtii kiinnittyä.

## Lisääminen iPhonen aloitusnäyttöön (PWA)

1. Avaa sovellus Safarissa.
2. Paina **Jaa**-kuvaketta (neliö, josta lähtee nuoli ylöspäin).
3. Valitse **Lisää Koti-valikkoon**.
4. Paina **Lisää**.

Tämän jälkeen sovellus käynnistyy koko näytön tilassa suoraan aloitusnäytöltä.

## Tunnetut rajoitukset

- **GPS-nopeus**: Korkean tarkkuuden GPS-nopeus saatavilla kun `GeolocationCoordinates.speed` on käytettävissä (iOS 13+). Vanhemmilla laitteilla tai heikon signaalin aikana nopeus lasketaan peräkkäisten sijaintipisteiden avulla, jolloin se voi olla hieman viiveinen tai epätarkka.
- **Karttatiedot**: OpenStreetMap-karttapäivitykset vaihtelevat alueittain. Kartta ei näy ilman internet-yhteyttä (jo ladatut ruudut voivat säilyä välimuistissa).
- **Safari-rajoitukset**: Safari ei tue Screen Wake Lock -ominaisuutta kaikilla iOS-versioilla. Puhelin voi sammuttaa näytön automaattisesti iOS:n virransäästöasetusten mukaan. Suositus: aseta **Näytön aikakatkaisuaika** mahdollisimman pitkäksi tai käytä erillisiä sovellustason virta-asetuksia.
- **Säätiedot**: Ladataan Open-Meteo-palvelusta enintään 15 minuutin välein. Ei toimi ilman internet-yhteyttä.
- **Kokokuvatila**: Fullscreen API ei ole tuettu Safarissa — tämä on iOS-rajoitus, ei sovelluksen vika.

## Turvallisuusvaroitus

> ⚠️ **Älä käytä kosketusnäyttöä ajon aikana.**
>
> Käytä ajoneuvon omaa mittaristoa ensisijaisena nopeusmittarina.
> Tämä sovellus on tarkoitettu lisätiedon näyttämiseen, ei ensisijaiseksi turvallisuuskriittiseksi mittaristoksi.

## Tietosuoja

**Sijaintihistoriaa ei tallenneta.** GPS-koordinaatteja käytetään ainoastaan:

- Nopeuden laskemiseen ja näyttämiseen paikallisesti laitteessa
- Kartan keskittämiseen nykyiseen sijaintiin
- Säätietojen hakemiseen Open-Meteo-palvelusta (lähetetään vain pyöristetyt koordinaatit, ei tarkkaa sijaintia)

Mitään sijaintitietoja ei tallenneta selaimen muistiin, evästeihin tai palvelimelle.

muutos.