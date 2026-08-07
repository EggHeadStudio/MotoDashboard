# Moto Dashboard

Moto Dashboard on mobiilioptimoitu, staattinen web-sovellus moottoripyörän ajodatan seuraamiseen. Sovellus toimii ilman taustapalvelinta ja on suunniteltu erityisesti puhelimen selaimessa käytettäväksi GitHub Pagesissa.

## Mitä sovellus tekee

- Näyttää reaaliaikaisen GPS-nopeuden suurella mittarilla
- Seuraa aktiivista sessiota: matka, aika, keskinopeus ja huippunopeus
- Tallentaa ajoreitin kartalle ja näyttää sen myöhemmin
- Näyttää säätilanteen, lämpötilan ja tuulen Open-Meteo-palvelusta
- Tarjoaa karttateemoja sekä heading-up / north-up -tilan
- Mahdollistaa sessioiden aloittamisen, jatkamisen, päättämisen ja historian tarkastelun
- Säilyttää tiedot selaimessa IndexedDB:n ja localStorage:n avulla

## Ominaisuudet

- Reaaliaikainen HUD-näkymä
- GPS-tila, tarkkuus ja verkkotila
- Leaflet + OpenStreetMap -kartta
- Karttateemat: Normaali, Mustavalko, Metsä, Asutus ja Yö
- Teeman vaihto ja suuntatilan muuttaminen napista
- Tallennetut ajot, yksittäisen ajon poisto ja historian tyhjennys
- PWA-tyylinen asennusmahdollisuus ja mobiilikuvaus

## Käyttö

1. Avaa sovellus puhelimen selaimessa.
2. Salli tarkka sijainti.
3. Aloita uusi sessio tai jatka aiempaa.
4. Ajon aikana kartta, nopeus ja tilastot päivittyvät automaattisesti.
5. Lopeta sessio ja anna nimi, jos haluat tallentaa ajon.
6. Tarkastele aiempia ajoja aloitusnäytöstä.

## Tietojen tallennus ja tietosuoja

- Sessiot ja historia tallentuvat vain tämän laitteen selaimeen.
- Sovellus ei käytä omaa palvelinta tai backendia.
- Jos selaimen sivustodata poistetaan, tallennettu historia voi kadota.
- Säähaun vuoksi koordinaatit lähetetään Open-Meteo-palveluun.

## Projektin rakenne

- index.html – käyttöliittymän runko
- css/dashboard.css – tyylit
- js/app.js – sovelluksen käynnistys ja päälogiikka
- js/config.js – vakioarvot ja rajat
- js/dom.js – DOM-viittaukset ja validointi
- js/map.js ja js/map-rotation.js – kartta ja rotaatio
- js/route-recorder.js – reittipisteiden tallennus
- js/session-manager.js ja js/session-store.js – sessioiden hallinta
- js/speed.js – nopeuden käsittely
- js/weather.js – säädata
- js/utils.js – apufunktiot
- manifest.webmanifest – PWA-määrittely

## Julkaisu GitHub Pagesissa

Sovellus on tarkoitettu julkaistavaksi GitHub Pagesissa.

- Repo: https://github.com/EggHeadStudio/MotoDashboard
- Julkinen sivu: https://eggheadstudio.github.io/MotoDashboard/

## Huomioitavaa

- GPS- ja heading-tarkkuus riippuvat laitteesta, signaalista ja selaimen oikeuksista.
- Wake Lock ja Fullscreen ovat käytettävissä vain, jos selain tukee niitä.
- Sää- ja karttatiedot vaativat verkkoyhteyden.
- Sovellus on mittaristo-tyyppinen työkalu, ei navigaattori.