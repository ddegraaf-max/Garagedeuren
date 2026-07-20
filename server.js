// MaatwerkGaragedeur.nl — Drutex D-GATE garagedeuren
// Node/Express/EJS — Railway ready
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_VERSION = '1.2.0'; // cache-busting ?v=

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Resend (optioneel — werkt ook zonder API key, dan alleen console.log)
let resend = null;
if (process.env.RESEND_API_KEY) {
  const { Resend } = require('resend');
  resend = new Resend(process.env.RESEND_API_KEY);
}
const OFFERTE_TO = process.env.OFFERTE_TO || 'info@maatwerkgaragedeur.nl';
const OFFERTE_FROM = process.env.OFFERTE_FROM || 'MaatwerkGaragedeur.nl <offerte@maatwerkgaragedeur.nl>';

// Gedeelde locals
app.use((req, res, next) => {
  res.locals.v = SITE_VERSION;
  res.locals.year = new Date().getFullYear();
  res.locals.path = req.path;
  next();
});

// ---------- Data ----------
const modellen = [
  {
    slug: 'd-gate-u',
    naam: 'D-GATE U',
    sub: 'Torsieveer vóór',
    kort: 'De allrounder. Torsieveer aan de voorzijde, geschikt voor panelen tot 250 kg. Robuust, betrouwbaar en als enige leverbaar met het extra dikke 60 mm paneel.',
    punten: [
      'Torsieveer aan de voorzijde gemonteerd',
      'Draagt panelen tot 250 kg',
      'Enige model met 60 mm paneel',
      'Grootste maten: tot 6000 × 3500 mm'
    ],
    specs: { gewicht: '250 kg', breedte: '6000 mm', hoogte: '3500 mm*', latei: '200/200 mm', veer: 'Torsieveer aan de voorzijde' },
    voetnoot: '* Verzinkte geleiderails en niet-voorgespannen veren bij deuren van 3,0–3,5 m breed.'
  },
  {
    slug: 'd-gate-b',
    naam: 'D-GATE B',
    sub: 'Torsieveer achter',
    kort: 'De stille kracht. Torsieveer aan de achterzijde voor extra soepel en stil openen — ideaal als er weinig ruimte boven de opening (latei) is.',
    punten: [
      'Torsieveer aan de achterzijde',
      'Soepel en stil in gebruik',
      'Lage latei: al vanaf 90/120 mm',
      'Past bij modern én klassiek bouwen'
    ],
    specs: { gewicht: '250 kg', breedte: '6000 mm', hoogte: '3000 mm', latei: '90/120 mm', veer: 'Torsieveer aan de achterzijde' }
  },
  {
    slug: 'd-gate-t',
    naam: 'D-GATE T',
    sub: 'Trekveren',
    kort: 'De slimme instapper. Trekveren verticaal in het kozijn verdelen de krachten gelijkmatig — eenvoudig, betrouwbaar en scherp geprijsd.',
    punten: [
      'Trekveren verticaal in het kozijn',
      'Gelijkmatige krachtverdeling',
      'Lage latei: al vanaf 90/120 mm',
      'Meest voordelige uitvoering'
    ],
    specs: { gewicht: '130 kg', breedte: '4500 mm', hoogte: '2500 mm', latei: '90/120 mm', veer: 'Trekveren' }
  }
];

const kleuren = [
  { naam: 'Wit FX', hex: '#f4f4f2', cat: 'klassiek' },
  { naam: 'White Sand U-Matt', hex: '#e8e4da', cat: 'klassiek' },
  { naam: 'Crèmewit', hex: '#e9e2cf', cat: 'klassiek' },
  { naam: 'Lichtgrijs', hex: '#c5c7c4', cat: 'grijs' },
  { naam: 'Grijs', hex: '#9d9f9e', cat: 'grijs' },
  { naam: 'Betongrijs', hex: '#7f8274', cat: 'grijs' },
  { naam: 'Kwartsgrijs', hex: '#6b695f', cat: 'grijs' },
  { naam: 'Basaltgrijs', hex: '#585c5e', cat: 'grijs' },
  { naam: 'Leigrijs (DB703)', hex: '#4a4d4e', cat: 'grijs' },
  { naam: 'Antraciet (RAL 7016)', hex: '#383e42', cat: 'grijs' },
  { naam: 'Antraciet Ulti-Matt', hex: '#33383c', cat: 'grijs' },
  { naam: 'Jet Black', hex: '#17181a', cat: 'grijs' },
  { naam: 'Zwart Ulti-Matt', hex: '#1d1e20', cat: 'grijs' },
  { naam: 'Golden Oak', hex: '#8a5a2b', cat: 'hout' },
  { naam: 'Turner Oak', hex: '#9c7a52', cat: 'hout' },
  { naam: 'Turner Oak Toffee', hex: '#7d5c3c', cat: 'hout' },
  { naam: 'Turner Oak Walnut', hex: '#5c4530', cat: 'hout' },
  { naam: 'Winchester', hex: '#a97e4f', cat: 'hout' },
  { naam: 'Natuureiken', hex: '#b28d5e', cat: 'hout' },
  { naam: 'Donker eiken', hex: '#4e3a28', cat: 'hout' },
  { naam: 'Noten', hex: '#6a4a33', cat: 'hout' },
  { naam: 'Mahonie', hex: '#5e3327', cat: 'hout' },
  { naam: 'Chocoladebruin', hex: '#45332a', cat: 'hout' },
  { naam: 'Mosgroen', hex: '#4c5b3f', cat: 'kleur' },
  { naam: 'Donkergroen', hex: '#2e4636', cat: 'kleur' },
  { naam: 'Donkerrood', hex: '#6e2a26', cat: 'kleur' },
  { naam: 'Briljantblauw', hex: '#2b4a7a', cat: 'kleur' },
  { naam: 'Staalblauw', hex: '#3d5566', cat: 'kleur' }
];

// ---------- Routes ----------
app.get('/', (req, res) => res.render('index', { modellen, kleuren, page: 'home' }));
app.get('/modellen', (req, res) => res.render('modellen', { modellen, page: 'modellen' }));
app.get('/kleuren', (req, res) => res.render('kleuren', { kleuren, page: 'kleuren' }));
app.get('/offerte', (req, res) => res.render('offerte', { page: 'offerte', verzonden: false }));
app.get('/privacy', (req, res) => res.render('privacy', { page: 'privacy' }));

app.post('/offerte', async (req, res) => {
  const d = req.body;
  const nette = (x) => String(x || '').slice(0, 500);
  const aanvraag = {
    naam: nette(d.naam),
    email: nette(d.email),
    telefoon: nette(d.telefoon),
    postcode: nette(d.postcode),
    breedte: nette(d.breedte),
    hoogte: nette(d.hoogte),
    model: nette(d.model),
    paneel: nette(d.paneel),
    kleur: nette(d.kleur),
    motor: nette(d.motor),
    opmerking: nette(d.opmerking)
  };

  const html = `
    <h2>Nieuwe offerteaanvraag — MaatwerkGaragedeur.nl</h2>
    <table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
      ${Object.entries(aanvraag).map(([k, v]) =>
        `<tr><td style="border:1px solid #ddd;font-weight:bold;text-transform:capitalize">${k}</td><td style="border:1px solid #ddd">${v || '—'}</td></tr>`
      ).join('')}
    </table>`;

  try {
    if (resend) {
      await resend.emails.send({
        from: OFFERTE_FROM,
        to: OFFERTE_TO,
        reply_to: aanvraag.email || undefined,
        subject: `Offerteaanvraag garagedeur — ${aanvraag.naam || 'onbekend'} (${aanvraag.postcode || '?'})`,
        html
      });
      // Bevestiging naar klant
      if (aanvraag.email) {
        await resend.emails.send({
          from: OFFERTE_FROM,
          to: aanvraag.email,
          subject: 'We hebben je aanvraag ontvangen — MaatwerkGaragedeur.nl',
          html: `<p>Beste ${aanvraag.naam || 'klant'},</p>
                 <p>Bedankt voor je offerteaanvraag. We nemen binnen 1 werkdag contact met je op met een vrijblijvende prijsopgave voor je nieuwe Drutex D-GATE garagedeur.</p>
                 <p>Met vriendelijke groet,<br>MaatwerkGaragedeur.nl</p>`
        });
      }
    } else {
      console.log('OFFERTE (geen RESEND_API_KEY ingesteld):', aanvraag);
    }
    res.render('offerte', { page: 'offerte', verzonden: true });
  } catch (err) {
    console.error('Offerte verzendfout:', err);
    res.status(500).render('offerte', { page: 'offerte', verzonden: false, fout: true });
  }
});

app.use((req, res) => res.status(404).render('404', { page: '404' }));

app.listen(PORT, () => console.log(`MaatwerkGaragedeur.nl draait op poort ${PORT}`));
