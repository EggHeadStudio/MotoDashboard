# Moto Dashboard

Moto Dashboard on suomenkielinen, staattinen web-sovellus moottoripyörän ajodatan seurantaan. Sovellus toimii ilman backendiä GitHub Pages -ympäristössä.

## Ominaisuudet

- GPS-nopeus (suuri nopeusnäyttö)
- Kello, lämpötila, sääkuvaus ja tuuli (Open-Meteo)
- GPS-tila ja tarkkuus
- Verkkotila
- Leaflet + OpenStreetMap -kartta
- Karttateemat: Normaali, Mustavalko, Cruising, Vesistö, Metsä, Yö
- Teeman vaihto painikkeella ja pyyhkäisyllä
- Sessiot: uusi, jatka, lopeta, historia, poista yksittäinen, poista kaikki
- Ajetun reitin tallennus ja näyttö
- Heading-up / north-up -tilan vaihto

## Julkinen URL

https://eggheadstudio.github.io/MotoDashboard/

## Projektin rakenne

Nykyinen toteutus on tarkoituksella yksinkertainen ja staattinen:

- index.html
- manifest.webmanifest
- README.md
- UPDATE.md

`index.html` sisältää käyttöliittymän, tyylit ja JavaScript-logiikan.

## GitHub Pages -käyttöönotto

1. Avaa repositorion Settings.
2. Avaa Pages.
3. Valitse Build and deployment: Deploy from a branch.
4. Valitse branch: main.
5. Valitse folder: /(root).
6. Tallenna.

Sovellus julkaistaan osoitteeseen yllä.

## Käyttö

1. Avaa sovellus puhelimen selaimessa.
2. Valitse Uusi sessio tai Jatka edellistä.
3. Salli tarkka sijainti.
4. Ajon aikana seuranta, tallennus ja laskenta toimivat automaattisesti.
5. Lopeta sessio painikkeesta Lopeta sessio.
6. Tallennetut ajot löytyvät aloitusnäkymän Tallennetut ajot -painikkeesta.

## Tallennus ja tietosuoja

- Sessiot tallennetaan vain tämän laitteen selaimeen (IndexedDB + localStorage varmistuksena).
- Tietoja ei lähetetä omalle palvelimelle eikä pilveen.
- Jos selaimen sivustodata poistetaan, ajohistoria voi kadota.
- Sääpalvelukutsu lähettää koordinaatit Open-Meteo-palveluun säähaun vuoksi.

## Heading-up ja fallback

- Suunta: menosuunta -tila käyttää ensisijaisesti `GeolocationCoordinates.heading`-arvoa.
- Jos heading ei ole luotettava, suunta voidaan arvioida peräkkäisistä pisteistä.
- Kääntö tasoitetaan lyhimmän kulman interpoloinnilla (myös 359°/0°-ylitys).
- Jos kartan rotaatiota ei tueta selaimessa, tila palautuu turvallisesti pohjoinen ylös -tilaan.

## Karttateemojen rajoitus

Kartta on rasteritiilipohjainen (OpenStreetMap). Teemat toteutetaan CSS-filttereillä tile-pane-tasolla:

- Mustavalko toimii tarkasti harmaasävytyksenä.
- Cruising, Vesistö ja Metsä ovat visuaalisia approksimaatioita.
- Teemat eivät erottele teitä, vettä ja metsiä semanttisesti kuten vektorikartat.

## Sovellus ei ole navigaattori

Sovellus ei sisällä kohdehakua, reittisuunnittelua, käännösopastusta tai waypoint-muokkausta.

## Tunnetut rajoitukset

- GPS- ja heading-tarkkuus riippuu laitteesta, signaalista ja selaimen oikeuksista.
- Wake Lock ja Fullscreen eivät ole kaikissa selaimissa käytettävissä.
- Sää vaatii verkkoyhteyden.
- Karttatiilien lataus voi epäonnistua heikolla yhteydellä.

## Turvallisuus

Älä käytä kosketusnäyttöä ajon aikana.
Käytä ajoneuvon omaa mittaristoa ensisijaisena nopeusmittarina.