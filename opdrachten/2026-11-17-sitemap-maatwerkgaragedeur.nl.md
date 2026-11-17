# Opdracht: sitemap.xml toevoegen voor maatwerkgaragedeur.nl

**Gemaakt:** 17 november 2026. Op 16 november is maatwerkgaragedeur.nl als domein-property aan Google Search Console toegevoegd en geverifieerd (TXT-record in Cloudflare). Bij het indienen van `https://maatwerkgaragedeur.nl/sitemap.xml` gaf Search Console: **Kan niet ophalen**.

Te doen:
1. Voeg een route `GET /sitemap.xml` toe met `Content-Type: application/xml` en status 200 (of controleer de bestaande).
2. Neem alle publieke, indexeerbare pagina's op met absolute URL's op de canonieke host (`https://maatwerkgaragedeur.nl/...`). Geen admin-, login-, dashboard- of API-pagina's. Voeg `<lastmod>` toe waar een datum bekend is.
3. Zorg dat `/robots.txt` een regel `Sitemap: https://maatwerkgaragedeur.nl/sitemap.xml` bevat. Cloudflare zet daar nu een eigen managed robots.txt (content signals) voor. Controleer dat de Sitemap-regel in de uiteindelijke robots.txt staat.
4. Een onbekende URL hoort status 404 te geven met een echte 404-pagina en `noindex`, niet de homepage-HTML.

**Klaar als:** `curl -I https://maatwerkgaragedeur.nl/sitemap.xml` geeft 200 en `application/xml`, en de XML is geldig. Meld het daarna in de Claude-app, dan wordt de sitemap in Search Console opnieuw ingediend.
