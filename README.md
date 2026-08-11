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
| `RESEND_API_KEY` | **ja** | Zonder key worden offertes alleen naar de console gelogd en komt er dus géén mail binnen |
| `ANTHROPIC_API_KEY` | voor AI | Vereist voor de AI inmeet-assistent (foto-analyse) |
| `OFFERTE_TO` | nee | Ontvangstadres offertes (default: d.degraaf@creditline.nl) |
| `OFFERTE_FROM` | nee | Afzender (Resend geverifieerd domein vereist) |
| `FORM_SECRET` | aanbevolen | Ondertekent de anti-bot rekensom. Niet gezet? Dan wordt er bij elke herstart een nieuwe gemaakt en zijn openstaande formulieren na een deploy verlopen. |
| `SITE_URL` | nee | Basis-URL in e-maillinks (default: https://maatwerkgaragedeur.nl) |

## Offerteformulier
- **Kleur & profilering**: de klant kiest uit de vaste `kleuren`-lijst en `PROFILERINGEN`
  (beide in server.js). De SVG-deur uit `views/partials/deur-svg.ejs` staat boven de keuzes
  en werkt live mee. Server-side wordt gecontroleerd dat de waarde uit die lijsten komt;
  iets anders wordt genegeerd (leeg gemaakt), niet geweigerd.
- **Anti-bot**: verborgen honeypot-veld + een rekensom (`3 + 5`) die HMAC-ondertekend
  in het formulier zit — geen sessie of database nodig, geldig voor 2 uur.
- **Rate limiting**: max 5 aanvragen per IP per uur; herhaald misbruik levert een dagblokkade op.
- **Twee e-mails per aanvraag**: een aanvraagmail naar `OFFERTE_TO` (met `reply_to` van de klant,
  dus direct antwoorden kan) en een bevestiging naar de klant. Mislukt de klantbevestiging,
  dan wordt dat gelogd maar blijft de aanvraag geldig.
- Bij een fout blijven de ingevulde velden staan; alleen de rekensom is nieuw.

## Structuur
- `server.js` — routes, modellen-/kleurendata, offerte-endpoint (rekensom, Resend, klantbevestiging)
- `emails.js` — HTML-e-mailsjablonen in de huisstijl (table-based, geen externe afbeeldingen).
  De deur wordt met tabelcellen getekend omdat SVG niet rendert in Gmail/Outlook, en alleen
  als de klant echt een kleur koos.
- `views/` — EJS templates (index, modellen, kleuren, offerte, privacy, 404)
- `views/partials/deur-svg.ejs` — interactieve SVG-deurpreview (kleur + paneelstructuur)
- `public/css/style.css` — huisstijl (Archivo + Instrument Sans, antraciet/amber)

## Cache-busting
Verhoog `SITE_VERSION` in server.js bij CSS/JS-wijzigingen (`?v=`).
