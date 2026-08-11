// MaatwerkGaragedeur.nl — Drutex D-GATE garagedeuren
// Node/Express/EJS — Railway ready
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { offerteIntern, offerteBevestiging } = require('./emails');

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_VERSION = '1.20.0'; // cache-busting ?v=

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
const OFFERTE_TO = process.env.OFFERTE_TO || 'd.degraaf@creditline.nl';
const OFFERTE_FROM = process.env.OFFERTE_FROM || 'MaatwerkGaragedeur.nl <offerte@maatwerkgaragedeur.nl>';

// ---------- Anti-bot rekensom ----------
// Ondertekend token: geen sessie/opslag nodig, werkt ook met meerdere instances.
// Zet FORM_SECRET als env-var, anders wordt er bij elke herstart een nieuwe gemaakt
// (openstaande formulieren zijn dan na een deploy verlopen).
const FORM_SECRET = process.env.FORM_SECRET || crypto.randomBytes(32).toString('hex');
const SOM_GELDIG = 2 * 60 * 60 * 1000; // 2 uur — genoeg tijd om het formulier in te vullen

function ondertekenSom(antwoord, geldigTot) {
  return crypto.createHmac('sha256', FORM_SECRET).update(`${antwoord}.${geldigTot}`).digest('base64url');
}

function maakSom() {
  const a = 1 + Math.floor(Math.random() * 9);
  const b = 1 + Math.floor(Math.random() * 9);
  const geldigTot = Date.now() + SOM_GELDIG;
  const antwoord = a + b;
  return { vraag: `${a} + ${b}`, token: `${antwoord}.${geldigTot}.${ondertekenSom(antwoord, geldigTot)}` };
}

function somKlopt(token, antwoord) {
  const delen = String(token || '').split('.');
  if (delen.length !== 3) return false;
  const [verwacht, geldigTot, handtekening] = delen;
  const juist = Buffer.from(ondertekenSom(verwacht, geldigTot));
  const gegeven = Buffer.from(handtekening);
  if (juist.length !== gegeven.length || !crypto.timingSafeEqual(juist, gegeven)) return false;
  if (!(Number(geldigTot) > Date.now())) return false;
  return String(antwoord || '').trim() === verwacht;
}

// Anthropic (AI inmeet-assistent) — vereist ANTHROPIC_API_KEY
let anthropic = null;
if (process.env.ANTHROPIC_API_KEY) {
  const Anthropic = require('@anthropic-ai/sdk');
  anthropic = new Anthropic();
}

// Foto-upload (alleen in geheugen, wordt niet opgeslagen)
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Alleen JPG, PNG of WebP toegestaan'), ok);
  }
});

// ---------- Rate limiting & misbruikbeveiliging ----------
// Railway zit achter een proxy: nodig om het echte klant-IP te zien
app.set('trust proxy', 1);

const UUR = 60 * 60 * 1000;
const DAG = 24 * UUR;
const LIMIET = {
  inmeetPerUur: 5,        // AI-analyses per IP per uur
  inmeetPerDag: 12,       // AI-analyses per IP per dag
  offertePerUur: 5,       // offerteaanvragen per IP per uur
  overtredingenTotBlok: 3, // zoveel keer tegen de limiet aanlopen => blokkade
  foutenTotBlok: 10,      // zoveel mislukte/ongeldige uploads per uur => blokkade
  blokDuur: DAG           // duur van een blokkade
};

const ipStats = new Map(); // ip -> { inmeet: [ts], offerte: [ts], fouten: [ts], overtredingen: [ts], blokTot: 0 }

function statsVoor(ip) {
  if (!ipStats.has(ip)) ipStats.set(ip, { inmeet: [], offerte: [], fouten: [], overtredingen: [], blokTot: 0 });
  return ipStats.get(ip);
}
function snoei(arr, venster) {
  const grens = Date.now() - venster;
  while (arr.length && arr[0] < grens) arr.shift();
}
function minutenTot(ts) {
  return Math.max(1, Math.ceil((ts - Date.now()) / 60000));
}
function registreerOvertreding(s) {
  s.overtredingen.push(Date.now());
  snoei(s.overtredingen, DAG);
  if (s.overtredingen.length >= LIMIET.overtredingenTotBlok) {
    s.blokTot = Date.now() + LIMIET.blokDuur;
    s.overtredingen = [];
  }
}
function registreerFout(s) {
  s.fouten.push(Date.now());
  snoei(s.fouten, UUR);
  if (s.fouten.length >= LIMIET.foutenTotBlok) {
    s.blokTot = Date.now() + LIMIET.blokDuur;
    s.fouten = [];
  }
}
function geblokkeerd(s) {
  return s.blokTot > Date.now();
}

// Opruimen zodat de Map niet oneindig groeit
setInterval(() => {
  const grens = Date.now() - DAG;
  for (const [ip, s] of ipStats) {
    snoei(s.inmeet, DAG); snoei(s.offerte, UUR); snoei(s.fouten, UUR); snoei(s.overtredingen, DAG);
    if (!s.inmeet.length && !s.offerte.length && !s.fouten.length && !s.overtredingen.length && s.blokTot < Date.now()) {
      ipStats.delete(ip);
    }
  }
}, UUR).unref();

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
    maxCm: { breedte: 600, hoogte: 350 }, // grens uit de Drutex-specificatie
    afb: '/img/d-gate-u.jpg',
    detail: '/img/d-gate-u-detail.jpg', // close-up van het veersysteem, verschijnt bij hover
    naam: 'D-GATE U',
    sub: 'Torsieveer vóór',
    kort: 'De allrounder. Torsieveer aan de voorzijde, geschikt voor panelen tot 250 kg. Robuust, betrouwbaar en als enige leverbaar met het extra dikke 60 mm paneel.',
    // Vertaald uit de Drutex D-GATE-brochure
    beschrijving: 'De D-GATE U heeft een torsieveer die vóór in de latei is gemonteerd. Dat maakt de deur betrouwbaar, duurzaam en veilig in gebruik. De stevige constructie draagt panelen tot 250 kg. Door het brede aanbod aan kleuren en paneelstructuren past de deur bij elke bouwstijl.',
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
    maxCm: { breedte: 600, hoogte: 300 }, // grens uit de Drutex-specificatie
    afb: '/img/d-gate-b.jpg',
    detail: '/img/d-gate-b-detail.jpg', // close-up van het veersysteem, verschijnt bij hover
    naam: 'D-GATE B',
    sub: 'Torsieveer achter',
    kort: 'De stille kracht. Torsieveer aan de achterzijde voor extra soepel en stil openen — ideaal als er weinig ruimte boven de opening (latei) is.',
    beschrijving: 'De D-GATE B is een betrouwbare sectionaaldeur met een torsieveer aan de achterzijde: een moderne oplossing die functionaliteit, veiligheid en uitstraling combineert. De achterliggende torsieveer laat de deur soepel en stil openen en sluiten, wat het dagelijks gebruik een stuk comfortabeler maakt. Past net zo goed bij moderne als bij klassieke bouw.',
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
    maxCm: { breedte: 450, hoogte: 250 }, // grens uit de Drutex-specificatie
    afb: '/img/d-gate-t.jpg',
    detail: '/img/d-gate-t-detail.jpg', // close-up van het veersysteem, verschijnt bij hover
    naam: 'D-GATE T',
    sub: 'Trekveren',
    kort: 'De slimme instapper. Trekveren verticaal in het kozijn verdelen de krachten gelijkmatig — eenvoudig, betrouwbaar en scherp geprijsd.',
    beschrijving: 'De D-GATE T met trekveer combineert een eenvoudige constructie met hoge functionaliteit en betrouwbaarheid. De trekveer zit verticaal in het kozijn en verdeelt de krachten gelijkmatig, waardoor de deur soepel, stil en veilig opent en sluit. Een uitstekende keuze als je een duurzame, veilige en voordelige oplossing voor je garage zoekt.',
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

// Zoekt de hex-code bij een vrij ingetypte kleurnaam ("antraciet ral 7016" -> #383e42),
// zodat de e-mail het gekozen kleurtje echt kan tonen. Geen match? Dan null.
function zoekKleurHex(tekst) {
  const norm = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const t = norm(tekst);
  if (!t) return null;
  const genormaliseerd = kleuren.map(k => ({ ...k, n: norm(k.naam) }));
  const exact = genormaliseerd.find(k => k.n === t);
  if (exact) return exact.hex;
  // klant typte meer dan de kleurnaam -> langste kleurnaam die erin voorkomt
  const bevat = genormaliseerd.filter(k => t.includes(k.n)).sort((a, b) => b.n.length - a.n.length);
  if (bevat.length) return bevat[0].hex;
  // klant typte een deel -> kortste kleurnaam die ermee begint
  const deel = genormaliseerd.filter(k => k.n.includes(t)).sort((a, b) => a.n.length - b.n.length);
  return deel.length ? deel[0].hex : null;
}

// Paneelafwerking volgens de Drutex-brochure: de structuur ís het reliëf.
// Woodgrain = low embossing, Deep Mat = high embossing, Smooth = zonder reliëf.
// Daarom één keuze in plaats van twee; `profiel` stuurt de SVG-preview aan.
// Oppervlak van het paneel — bepaalt hoe het paneel aanvoelt en oogt.
const AFWERKINGEN = [
  { naam: 'Smooth', kort: 'Glad oppervlak', afb: '/img/paneel-glad.jpg' },
  { naam: 'Woodgrain', kort: 'Houtnerfstructuur', afb: '/img/paneel-woodgrain.jpg' },
  { naam: 'Deep Mat', kort: 'Diep matte structuur', afb: '/img/paneel-deepmat.jpg' }
];

// Profilering = de groeven in het paneel. Dit is wat je op de deur zíet,
// dus dit stuurt de preview aan (zie public/js/main.js).
const PROFILERINGEN = [
  { naam: 'Zonder profilering', code: 'F', profiel: 'glad' },
  { naam: 'Lage profilering', code: 'L', profiel: 'laag' },
  { naam: 'Hoge profilering', code: 'V', profiel: 'hoog' }
];

// 60 mm panelen zijn alleen leverbaar op de D-GATE U. `alleenModel` legt dat vast:
// het formulier schakelt de optie uit bij een ander model en de server dwingt het af.
const DIKTES = [
  { naam: '40 mm', alleenModel: null },
  { naam: '60 mm', alleenModel: 'D-GATE U' }
];

// ---------- Routes ----------
app.get('/', (req, res) => res.render('index', { modellen, kleuren, page: 'home' }));
app.get('/modellen', (req, res) => res.render('modellen', { modellen, page: 'modellen' }));
app.get('/kleuren', (req, res) => res.render('kleuren', { kleuren, page: 'kleuren' }));
// Toont het formulier opnieuw met een verse rekensom en de al ingevulde waarden
function toonFormulier(res, { status = 200, fout = null, waarden = {} } = {}) {
  res.status(status).render('offerte', {
    page: 'offerte', verzonden: false, fout, waarden,
    kleuren, modellen, afwerkingen: AFWERKINGEN, profileringen: PROFILERINGEN,
    diktes: DIKTES, som: maakSom()
  });
}

app.get('/offerte', (req, res) => toonFormulier(res));
app.get('/privacy', (req, res) => res.render('privacy', { page: 'privacy' }));
app.get('/inmeet-assistent', (req, res) => res.render('inmeet', { page: 'inmeet' }));

// ---------- AI inmeet-assistent ----------
const INMEET_SYSTEM = `Je bent de AI inmeet-assistent van MaatwerkGaragedeur.nl, een Nederlandse specialist in het vervangen van garagedeuren door Drutex D-GATE sectionaaldeuren.

Je krijgt een foto van een garagedeur of garageopening van een klant. Analyseer de foto en help de klant op weg. De definitieve inmeting doet altijd een monteur — jouw taak is de klant helpen een goede eerste aanvraag te doen.

Ken de drie modellen:
- D-GATE T (trekveren): max 130 kg, max 4500×2500 mm, latei vanaf 90/120 mm. Voordeligst.
- D-GATE U (torsieveer vóór): max 250 kg, max 6000×3500 mm, latei minimaal 200/200 mm. Enige met 60 mm paneel.
- D-GATE B (torsieveer achter): max 250 kg, max 6000×3000 mm, latei vanaf 90/120 mm. Extra stil.

Antwoord UITSLUITEND met geldig JSON (geen markdown, geen backticks) in exact dit formaat:
{
  "herkend": true/false (is er een garagedeur/opening te zien?),
  "deurtype": "korte omschrijving van de huidige deur (bijv. kanteldeur, houten openslaande deuren, oude sectionaaldeur, open gat)",
  "observaties": ["2-4 relevante observaties over staat, materiaal, latei, zijruimte, obstakels zoals leidingen/lampen/stopcontacten"],
  "meetinstructies": ["4-6 concrete stappen om breedte, hoogte, latei (ruimte boven de opening) en zijruimte op te meten, afgestemd op wat er op de foto te zien is"],
  "modeladvies": "welk D-GATE model waarschijnlijk past en waarom (op basis van zichtbare latei/zijruimte); benoem het onder voorbehoud",
  "aandachtspunten": ["0-3 punten die de monteur moet weten (bijv. elektra verplaatsen, scheve opening, beperkte inbouwdiepte)"]
}

Wees concreet en vriendelijk, in het Nederlands, tutoyeer. Doe geen prijsuitspraken. Als de foto geen garage toont, zet herkend op false en leg in deurtype kort uit wat je wel ziet.`;

app.post('/api/inmeet', (req, res) => {
  const s = statsVoor(req.ip);

  if (geblokkeerd(s)) {
    return res.status(429).json({ fout: 'Dit IP-adres is tijdelijk geblokkeerd wegens misbruik. Probeer het morgen opnieuw, of vraag direct een offerte aan.' });
  }

  snoei(s.inmeet, DAG);
  const laatsteUur = s.inmeet.filter(ts => ts > Date.now() - UUR).length;
  if (laatsteUur >= LIMIET.inmeetPerUur || s.inmeet.length >= LIMIET.inmeetPerDag) {
    registreerOvertreding(s);
    if (geblokkeerd(s)) {
      return res.status(429).json({ fout: 'Dit IP-adres is tijdelijk geblokkeerd wegens misbruik. Probeer het morgen opnieuw.' });
    }
    return res.status(429).json({ fout: 'Je hebt het maximum aantal analyses bereikt (' + LIMIET.inmeetPerUur + ' per uur, ' + LIMIET.inmeetPerDag + ' per dag). Probeer het later nog eens, of vraag direct een offerte aan — dan meten wij gratis bij je in.' });
  }

  upload.single('foto')(req, res, async (uploadErr) => {
    if (uploadErr) {
      registreerFout(s);
      return res.status(400).json({ fout: uploadErr.message || 'Upload mislukt (max 8 MB, JPG/PNG/WebP).' });
    }
    // Met INMEET_MOCK=1 geeft de assistent een vast voorbeeldantwoord terug.
    // Zo kun je de weergave en de maatlijnen testen zonder API-key of kosten.
    if (process.env.INMEET_MOCK === '1') {
      return res.json({
        herkend: true,
        deurtype: 'Voorbeeldantwoord (testmodus) — kanteldeur in metselwerk',
        observaties: ['Dit is een vast testantwoord, er is geen AI gebruikt.', 'De opening lijkt recht en vrij van obstakels.'],
        meetinstructies: [
          'Meet de breedte van de opening onderaan, in het midden en bovenaan.',
          'Meet de hoogte links, midden en rechts vanaf de vloer.',
          'Meet de ruimte boven de opening tot het plafond (de latei).',
          'Meet de vrije ruimte links en rechts van de opening.'
        ],
        modeladvies: 'Testmodus: op basis van dit voorbeeld zou D-GATE B passen (onder voorbehoud).',
        aandachtspunten: ['Zet INMEET_MOCK uit om echte analyses te doen.']
      });
    }

    if (!anthropic) {
      return res.status(503).json({ fout: 'De AI-assistent is tijdelijk niet beschikbaar. Vraag gerust direct een offerte aan — dan meten wij gratis bij je in.' });
    }
    if (!req.file) {
      registreerFout(s);
      return res.status(400).json({ fout: 'Geen foto ontvangen.' });
    }
    s.inmeet.push(Date.now());
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        system: INMEET_SYSTEM,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: req.file.mimetype, data: req.file.buffer.toString('base64') } },
            { type: 'text', text: 'Dit is een foto van mijn garage. ' + String(req.body.toelichting || '').slice(0, 300) }
          ]
        }]
      });
      const tekst = msg.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
      const schoon = tekst.replace(/```json|```/g, '').trim();
      const data = JSON.parse(schoon);
      res.json(data);
    } catch (err) {
      console.error('Inmeet-assistent fout:', err.message);
      res.status(500).json({ fout: 'De analyse is niet gelukt. Probeer het nog eens met een andere foto, of vraag direct een offerte aan.' });
    }
  });
});

app.post('/offerte', async (req, res) => {
  const s = statsVoor(req.ip);
  const d = req.body;

  const nette = (x) => String(x || '').trim().slice(0, 500);
  // Model, dikte, afwerking en kleur komen uit vaste lijsten; alles daarbuiten negeren we.
  const uitLijst = (waarde, toegestaan) => (toegestaan.includes(waarde) ? waarde : '');
  const aanvraag = {
    naam: nette(d.naam),
    email: nette(d.email),
    telefoon: nette(d.telefoon),
    postcode: nette(d.postcode),
    breedte: nette(d.breedte),
    hoogte: nette(d.hoogte),
    model: uitLijst(nette(d.model), modellen.map(m => `${m.naam} (${m.sub.toLowerCase()})`)),
    dikte: uitLijst(nette(d.dikte), DIKTES.map(x => x.naam)),
    afwerking: uitLijst(nette(d.afwerking), AFWERKINGEN.map(a => a.naam)),
    profilering: uitLijst(nette(d.profilering), PROFILERINGEN.map(p => p.naam)),
    kleur: uitLijst(nette(d.kleur), kleuren.map(k => k.naam)),
    motor: nette(d.motor),
    opmerking: nette(d.opmerking)
  };

  // 60 mm bestaat alleen op de D-GATE U. Het formulier regelt dit al met JavaScript,
  // maar zonder JS (of bij een geknutselde POST) zetten we het model hier alsnog goed.
  const dikteRegel = DIKTES.find(x => x.naam === aanvraag.dikte);
  if (dikteRegel && dikteRegel.alleenModel && aanvraag.model.indexOf(dikteRegel.alleenModel) !== 0) {
    const juist = modellen.find(m => m.naam === dikteRegel.alleenModel);
    if (juist) aanvraag.model = `${juist.naam} (${juist.sub.toLowerCase()})`;
  }

  // Honeypot: echte bezoekers vullen dit verborgen veld nooit in
  if (d.website) {
    registreerFout(s);
    return res.render('offerte', { page: 'offerte', verzonden: true }); // bot denkt dat het gelukt is
  }

  if (geblokkeerd(s)) {
    return toonFormulier(res, {
      status: 429, waarden: aanvraag,
      fout: 'Dit IP-adres is tijdelijk geblokkeerd wegens misbruik. Bel ons gerust, dan regelen we het telefonisch.'
    });
  }
  snoei(s.offerte, UUR);
  if (s.offerte.length >= LIMIET.offertePerUur) {
    registreerOvertreding(s);
    return toonFormulier(res, {
      status: 429, waarden: aanvraag,
      fout: 'Je hebt kort achter elkaar meerdere aanvragen verstuurd. Probeer het over een uur nog eens.'
    });
  }

  // Anti-bot rekensom
  if (!somKlopt(d.som_token, d.som_antwoord)) {
    registreerFout(s);
    return toonFormulier(res, {
      status: 400, waarden: aanvraag,
      fout: 'De uitkomst van de rekensom klopte niet (of het formulier stond te lang open). Vul de nieuwe som hieronder in.'
    });
  }

  if (!aanvraag.naam || !aanvraag.email || !aanvraag.postcode || !aanvraag.breedte || !aanvraag.hoogte) {
    return toonFormulier(res, {
      status: 400, waarden: aanvraag,
      fout: 'Niet alle verplichte velden waren ingevuld. Vul ze alsnog in en verstuur opnieuw.'
    });
  }

  s.offerte.push(Date.now());

  // Extra's voor de e-mail: de hex van de gekozen kleur en het profiel-kenmerk,
  // zodat de mail de deur schematisch kan tekenen.
  // Past het gekozen model bij de opgegeven maat? We weigeren de aanvraag niet —
  // een lead is te waardevol — maar zetten het er voor onszelf duidelijk bij.
  let maatWaarschuwing = '';
  const gekozenModel = modellen.find(m => aanvraag.model.indexOf(m.naam) === 0);
  if (gekozenModel) {
    const b = parseInt(aanvraag.breedte, 10);
    const h = parseInt(aanvraag.hoogte, 10);
    const teBreed = b > gekozenModel.maxCm.breedte;
    const teHoog = h > gekozenModel.maxCm.hoogte;
    if (teBreed || teHoog) {
      maatWaarschuwing = `De opgegeven maat (${b} × ${h} cm) past niet binnen de ${gekozenModel.naam} ` +
        `(max ${gekozenModel.maxCm.breedte} × ${gekozenModel.maxCm.hoogte} cm). Neem contact op over een passend model.`;
    }
  }

  const gekozenProfiel = PROFILERINGEN.find(p => p.naam === aanvraag.profilering);
  const voorMail = {
    ...aanvraag,
    // "40 mm — Woodgrain": één regel in de mail in plaats van twee losse velden
    paneel: [aanvraag.dikte, aanvraag.afwerking].filter(Boolean).join(' — '),
    kleurHex: zoekKleurHex(aanvraag.kleur),
    profiel: (gekozenProfiel || {}).profiel || 'hoog',
    maatWaarschuwing
  };
  const intern = offerteIntern({
    ...voorMail,
    tijdstip: new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' }),
    ip: req.ip
  });
  const bevestiging = offerteBevestiging(voorMail);

  try {
    if (!resend) {
      console.log('OFFERTE (geen RESEND_API_KEY ingesteld):', aanvraag);
      return res.render('offerte', { page: 'offerte', verzonden: true });
    }

    // De mail naar onszelf is leidend: mislukt die, dan is de aanvraag écht niet aangekomen.
    const { error } = await resend.emails.send({
      from: OFFERTE_FROM,
      to: OFFERTE_TO,
      reply_to: aanvraag.email || undefined,
      subject: intern.subject,
      html: intern.html
    });
    if (error) throw new Error(error.message || 'Resend weigerde de aanvraagmail');

    // Bevestiging naar de klant — mag stilletjes falen, de aanvraag is al binnen.
    try {
      const klant = await resend.emails.send({
        from: OFFERTE_FROM,
        to: aanvraag.email,
        reply_to: OFFERTE_TO,
        subject: bevestiging.subject,
        html: bevestiging.html
      });
      if (klant.error) console.error('Bevestigingsmail mislukt:', klant.error);
    } catch (err) {
      console.error('Bevestigingsmail mislukt:', err.message);
    }

    res.render('offerte', { page: 'offerte', verzonden: true });
  } catch (err) {
    console.error('Offerte verzendfout:', err);
    toonFormulier(res, {
      status: 500, waarden: aanvraag,
      fout: 'Er ging iets mis bij het versturen. Probeer het zo nog eens, of mail ons rechtstreeks op ' + OFFERTE_TO + '.'
    });
  }
});

app.use((req, res) => res.status(404).render('404', { page: '404' }));

app.listen(PORT, () => console.log(`MaatwerkGaragedeur.nl draait op poort ${PORT}`));
