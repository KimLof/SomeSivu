# SomeSivu

SomeSivu on yksinkertainen sosiaalisen median alusta, joka mahdollistaa käyttäjien rekisteröitymisen, sisäänkirjautumisen, postausten luomisen, kommentoinnin, tykkäämisen ja yksityisviestien lähettämisen. Sovellus on toteutettu käyttäen "vanilla" HTML:ää, JavaScriptiä (ilman ulkopuolisia kirjastoja), CSS:ää ja Node.js:tä backend-palvelimena. Tietokantana toimii MongoDB.

## Ominaisuudet

- **Rekisteröityminen ja kirjautuminen**: Käyttäjät voivat luoda uuden käyttäjätilin ja kirjautua sisään.
- **Postausten luominen**: Kirjautuneet käyttäjät voivat luoda uusia postauksia.
- **Kommentointi**: Käyttäjät voivat kommentoida olemassa olevia postauksia.
- **Tykkäykset**: Postauksiin ja kommentteihin voi reagoida "tykkäämällä".
- **Yksityisviestit**: Mahdollisuus lähettää yksityisviestejä toisille käyttäjille.
- **Profiilien tarkastelu**: Käyttäjät voivat tarkastella toistensa profiileja.

## Teknologiat

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Tietokanta**: MongoDB

## Asennus ja käyttöönotto

1. Kloonaa repo: `git clone https://github.com/KimLof/SomeSivu.git`
2. Asenna riippuvuudet: `cd somesovellus` `npm install`
3. Konfiguroi tietokantayhteys `config.json`-tiedostossa.
4. Käynnistä sovellus: `node api.js`
5. Avaa selaimessa osoitteessa `http://localhost:3000`.

## Kehitys

Sovellus on vielä kehitysvaiheessa, ja uusia ominaisuuksia lisätään jatkuvasti. Frontend-puoli on vielä erityisen keskeneräinen, ja käyttöliittymä kaipaa paljon työtä. Backend-puolella keskitytään ensisijaisesti sovelluksen perusominaisuuksien toteuttamiseen ja tietoturvan varmistamiseen.
