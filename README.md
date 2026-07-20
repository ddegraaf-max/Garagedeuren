# MaatwerkGaragedeur.nl

Drutex D-GATE garagedeuren op maat — Node/Express/EJS, Railway-ready.

## Lokaal draaien
```
npm install
npm start
```
Draait op http://localhost:3000

## Railway environment variables
| Variabele | Verplicht | Uitleg |
|---|---|---|
| `RESEND_API_KEY` | nee | Zonder key worden offertes alleen naar de console gelogd |
| `OFFERTE_TO` | nee | Ontvangstadres offertes (default: info@maatwerkgaragedeur.nl) |
| `OFFERTE_FROM` | nee | Afzender (Resend geverifieerd domein vereist) |

## Structuur
- `server.js` — routes, modellen-/kleurendata, offerte-endpoint (Resend + klantbevestiging)
- `views/` — EJS templates (index, modellen, kleuren, offerte, privacy, 404)
- `views/partials/deur-svg.ejs` — interactieve SVG-deurpreview (kleur + paneelstructuur)
- `public/css/style.css` — huisstijl (Archivo + Instrument Sans, antraciet/amber)

## Cache-busting
Verhoog `SITE_VERSION` in server.js bij CSS/JS-wijzigingen (`?v=`).
