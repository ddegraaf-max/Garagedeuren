// E-mailsjablonen MaatwerkGaragedeur.nl
// Table-based HTML — werkt in Outlook, Gmail, Apple Mail en op mobiel.
// Geen externe afbeeldingen: de garagedeur en het beeldmerk zijn met tabelcellen getekend,
// zodat de ontvanger nooit "afbeeldingen weergeven?" hoeft te klikken.

const SITE_URL = process.env.SITE_URL || 'https://maatwerkgaragedeur.nl';

const KLEUR = {
  antraciet: '#2b3034',
  antracietDiep: '#1e2225',
  papier: '#f4f1ea',
  papierDonker: '#e9e4d8',
  wit: '#fdfcf9',
  accent: '#f2a33c',
  accentDiep: '#d97f1a',
  inkt: '#23262a',
  inktZacht: '#5b6066',
  lijn: '#e2ddd2'
};

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function esc(waarde) {
  return String(waarde == null ? '' : waarde)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const heeft = (x) => String(x == null ? '' : x).trim() !== '';

// ---------- Bouwstenen ----------

// Beeldmerk: drie paneelstrepen, net als het logo op de site
function logoMerk(paneelKleur) {
  const streep = (kleur) =>
    `<tr><td height="5" bgcolor="${kleur}" style="height:5px;line-height:5px;font-size:0;border-radius:2px;">&nbsp;</td></tr>
     <tr><td height="3" style="height:3px;line-height:3px;font-size:0;">&nbsp;</td></tr>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="30" style="width:30px;">
    ${streep(KLEUR.accent)}${streep(paneelKleur)}${streep(paneelKleur)}</table>`;
}

// --- Schematische deur, opgebouwd uit tabelcellen ---
// SVG rendert niet in Gmail/Outlook, dus tekenen we de deur met gekleurde rijen.
// Toont alleen wat de klant écht heeft gekozen: kleur en profilering.
function mengKleur(hex, doel, factor) {
  const lees = (h) => {
    const s = String(h).replace('#', '');
    const vol = s.length === 3 ? s.split('').map(c => c + c).join('') : s;
    return [0, 2, 4].map(i => parseInt(vol.slice(i, i + 2), 16));
  };
  const [r1, g1, b1] = lees(hex);
  const [r2, g2, b2] = lees(doel);
  const m = (a, b) => Math.round(a + (b - a) * factor).toString(16).padStart(2, '0');
  return `#${m(r1, r2)}${m(g1, g2)}${m(b1, b2)}`;
}

function deurVisual(hex, profiel) {
  const donker = mengKleur(hex, '#000000', 0.32);
  const licht = mengKleur(hex, '#ffffff', 0.18);
  const naad = mengKleur(hex, '#000000', 0.5);
  const rij = (h, kleur) => `<tr><td height="${h}" bgcolor="${kleur}" style="height:${h}px;line-height:${h}px;font-size:0;">&nbsp;</td></tr>`;
  const groef = () => rij(3, donker) + rij(2, licht);

  let binnenkant;
  if (profiel === 'laag') binnenkant = rij(21, hex) + groef() + rij(21, hex);
  else if (profiel === 'glad') binnenkant = rij(47, hex);
  else binnenkant = rij(11, hex) + groef() + rij(16, hex) + groef() + rij(11, hex);

  const paneel = (i) => (i ? rij(2, naad) : '') + binnenkant;

  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="264" style="width:264px;">
    <tr>
      <td bgcolor="#2c3136" style="background-color:#2c3136;padding:7px;border-radius:5px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${paneel(0)}${paneel(1)}${paneel(2)}${paneel(3)}
        </table>
      </td>
    </tr>
    <tr><td height="6" bgcolor="#b9b2a4" style="height:6px;line-height:6px;font-size:0;border-radius:0 0 4px 4px;">&nbsp;</td></tr>
  </table>`;
}

// Deurblok met bijschrift — alleen tonen als de klant echt een kleur koos
function deurBlok(a, { compact = false } = {}) {
  if (!a.kleurHex) return '';
  const onder = [a.kleur, a.profilering].filter(heeft).join(' &middot; ');
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${KLEUR.papier}" style="background-color:${KLEUR.papier};border:1px solid ${KLEUR.lijn};border-radius:11px;margin:${compact ? '4px 0 6px' : '0 0 6px'};">
    <tr><td align="center" style="padding:${compact ? '18px' : '22px'} 18px;">
      ${deurVisual(a.kleurHex, a.profiel)}
      <p style="margin:13px 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:${KLEUR.inkt};font-weight:600;">${esc(onder)}</p>
      <p style="margin:3px 0 0;font-family:${FONT};font-size:11px;line-height:17px;color:${KLEUR.inktZacht};">Schematische weergave van je keuze &mdash; geen foto van je eigen garage.</p>
    </td></tr>
  </table>`;
}

// Gekleurd bolletje naast een kleurnaam
function kleurStip(hex) {
  if (!hex) return '';
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-block;vertical-align:middle;margin-right:7px;">
    <tr><td width="13" height="13" bgcolor="${hex}" style="width:13px;height:13px;border-radius:7px;border:1px solid ${KLEUR.lijn};font-size:0;line-height:0;">&nbsp;</td></tr>
  </table>`;
}

function kop() {
  return `
  <tr>
    <td bgcolor="${KLEUR.antraciet}" style="background-color:${KLEUR.antraciet};padding:22px 28px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="middle" width="30" style="width:30px;">${logoMerk('#f7f5f0')}</td>
          <td valign="middle" style="padding-left:12px;font-family:${FONT};font-size:17px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">
            Maatwerk<span style="color:${KLEUR.accent};">Garagedeur</span>.nl
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr><td bgcolor="${KLEUR.accent}" style="background-color:${KLEUR.accent};height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>`;
}

function voet() {
  return `
  <tr>
    <td bgcolor="${KLEUR.antracietDiep}" style="background-color:${KLEUR.antracietDiep};padding:22px 28px;font-family:${FONT};font-size:12px;line-height:19px;color:#a7abaf;">
      <strong style="color:#ffffff;">MaatwerkGaragedeur.nl</strong> is een handelsnaam van Creditline B.V.<br>
      Torenlaan 5A/5B, Bussum &middot; KvK 59683198 &middot; BTW NL853603108B01<br>
      <a href="${SITE_URL}" style="color:${KLEUR.accent};text-decoration:none;">maatwerkgaragedeur.nl</a>
      &nbsp;&middot;&nbsp;
      <a href="${SITE_URL}/privacy" style="color:${KLEUR.accent};text-decoration:none;">Privacyverklaring</a>
      <br><br>
      <span style="color:#7d8286;">Drutex&reg; is een geregistreerd merk van DRUTEX S.A.</span>
    </td>
  </tr>`;
}

function omhulsel({ titel, preheader, inhoud }) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="nl">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>${esc(titel)}</title>
</head>
<body style="margin:0;padding:0;background-color:${KLEUR.papier};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${KLEUR.papier}" style="background-color:${KLEUR.papier};">
    <tr>
      <td align="center" style="padding:28px 14px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background-color:${KLEUR.wit};border:1px solid ${KLEUR.lijn};border-radius:14px;overflow:hidden;">
          ${kop()}
          <tr>
            <td style="padding:28px 28px 26px;font-family:${FONT};font-size:15px;line-height:24px;color:${KLEUR.inkt};">
              ${inhoud}
            </td>
          </tr>
          ${voet()}
        </table>
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;">
          <tr><td align="center" style="padding:16px 10px 0;font-family:${FONT};font-size:11px;line-height:17px;color:#8c9095;">
            Drutex D-GATE sectionaaldeuren op maat &middot; geleverd, gemonteerd en oude deur afgevoerd
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function kicker(tekst) {
  return `<p style="margin:0 0 7px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${KLEUR.accentDiep};">${esc(tekst)}</p>`;
}

function titel(tekst) {
  return `<h1 style="margin:0 0 16px;font-family:${FONT};font-size:25px;line-height:32px;font-weight:800;color:${KLEUR.inkt};letter-spacing:-0.5px;">${esc(tekst)}</h1>`;
}

function sectieKop(tekst) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 12px;">
    <tr>
      <td width="3" bgcolor="${KLEUR.accent}" style="width:3px;background-color:${KLEUR.accent};font-size:0;line-height:0;border-radius:2px;">&nbsp;</td>
      <td style="padding-left:10px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${KLEUR.inkt};">${esc(tekst)}</td>
    </tr>
  </table>`;
}

// Label/waarde-lijst met dunne scheidingslijnen — rustiger dan een dichte tabel.
// Een rij is [label, waarde, opties]; waarde mag {ruw: '<a…>'} zijn voor kant-en-klare HTML,
// en opties.voor plakt er iets voor (bijvoorbeeld een kleurstip).
function lijst(rijen) {
  const tekstVan = (w) => (w && typeof w === 'object' ? w.tekst : w);
  const zichtbaar = rijen.filter(([, waarde]) => heeft(tekstVan(waarde)));
  if (!zichtbaar.length) return '';
  const cellen = zichtbaar.map(([label, waarde, opties = {}], i) => {
    const inhoud = waarde && typeof waarde === 'object'
      ? waarde.ruw
      : esc(waarde).replace(/\n/g, '<br>');
    const rand = i ? `border-top:1px solid ${KLEUR.lijn};` : '';
    return `
    <tr>
      <td width="132" valign="top" style="width:132px;padding:10px 12px 10px 0;${rand}font-family:${FONT};font-size:12px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;color:${KLEUR.inktZacht};">${esc(label)}</td>
      <td valign="top" style="padding:10px 0;${rand}font-family:${FONT};font-size:15px;line-height:23px;color:${KLEUR.inkt};font-weight:500;">${opties.voor || ''}${inhoud}</td>
    </tr>`;
  }).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 4px;">${cellen}</table>`;
}

// Klikbare waarde voor in een lijst-rij
function klikbaar(tekst, href) {
  return { tekst, ruw: `<a href="${href}" style="color:${KLEUR.accentDiep};text-decoration:none;font-weight:600;">${esc(tekst)}</a>` };
}

// Drie kerngetallen naast elkaar, bovenaan de aanvraagmail
function feitenStrip(feiten) {
  const zichtbaar = feiten.filter(([, w]) => heeft(w));
  if (!zichtbaar.length) return '';
  const breedte = Math.floor(100 / zichtbaar.length);
  const cellen = zichtbaar.map(([label, waarde], i) => `
    <td width="${breedte}%" valign="top" style="width:${breedte}%;padding:15px 14px;${i ? `border-left:1px solid ${KLEUR.lijn};` : ''}">
      <div style="font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;color:${KLEUR.inktZacht};padding-bottom:5px;">${esc(label)}</div>
      <div style="font-family:${FONT};font-size:17px;line-height:23px;font-weight:800;color:${KLEUR.inkt};letter-spacing:-0.2px;">${esc(waarde)}</div>
    </td>`).join('');
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${KLEUR.papier}" style="background-color:${KLEUR.papier};border:1px solid ${KLEUR.lijn};border-radius:11px;margin:0 0 6px;">
    <tr>${cellen}</tr>
  </table>`;
}

function citaat(tekst) {
  if (!heeft(tekst)) return '';
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${KLEUR.papier}" style="background-color:${KLEUR.papier};border-left:3px solid ${KLEUR.accent};border-radius:0 9px 9px 0;margin:0 0 4px;">
    <tr><td style="padding:14px 16px;font-family:${FONT};font-size:15px;line-height:24px;color:${KLEUR.inkt};font-style:italic;">${esc(tekst).replace(/\n/g, '<br>')}</td></tr>
  </table>`;
}

function knop(tekst, href, stijl = 'donker') {
  const bg = stijl === 'amber' ? KLEUR.accent : KLEUR.antraciet;
  const kleurTekst = stijl === 'amber' ? KLEUR.antraciet : '#ffffff';
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 4px;">
    <tr>
      <td bgcolor="${bg}" style="background-color:${bg};border-radius:999px;">
        <a href="${href}" style="display:inline-block;padding:13px 28px;font-family:${FONT};font-size:15px;font-weight:600;color:${kleurTekst};text-decoration:none;">${esc(tekst)}</a>
      </td>
    </tr>
  </table>`;
}

// ---------- Mail 1: de aanvraag, naar ons ----------
function offerteIntern(a) {
  const afmeting = heeft(a.breedte) && heeft(a.hoogte) ? `${a.breedte} × ${a.hoogte} cm` : '';
  const kortModel = (a.model || '').split(' (')[0];

  const inhoud = `
    ${kicker('Nieuwe offerteaanvraag')}
    ${titel(a.naam || 'Onbekende aanvrager')}
    <p style="margin:0 0 20px;font-family:${FONT};font-size:15px;line-height:24px;color:${KLEUR.inktZacht};">
      Binnengekomen via het offerteformulier. Antwoorden op deze mail gaat rechtstreeks naar de klant.
    </p>

    ${feitenStrip([
      ['Afmeting', afmeting],
      ['Model', kortModel || 'Advies'],
      ['Bediening', a.motor || 'Onbekend']
    ])}

    ${sectieKop('Contact')}
    ${lijst([
      ['Naam', a.naam],
      ['E-mail', heeft(a.email) ? klikbaar(a.email, `mailto:${encodeURI(a.email)}`) : ''],
      ['Telefoon', heeft(a.telefoon) ? klikbaar(a.telefoon, `tel:${String(a.telefoon).replace(/[^\d+]/g, '')}`) : ''],
      ['Postcode', a.postcode]
    ])}

    ${sectieKop('Gewenste deur')}
    ${deurBlok(a, { compact: true })}
    ${lijst([
      ['Afmeting', afmeting],
      ['Model', a.model || 'Advies gewenst'],
      ['Paneel', a.paneel],
      ['Profilering', a.profilering],
      ['Kleur', a.kleur, { voor: kleurStip(a.kleurHex) }]
    ])}

    ${heeft(a.opmerking) ? sectieKop('Opmerking van de klant') + citaat(a.opmerking) : ''}

    ${heeft(a.email) ? knop(`Antwoord ${String(a.naam || '').split(' ')[0] || 'de klant'}`, `mailto:${encodeURI(a.email)}?subject=${encodeURIComponent('Je offerte voor een nieuwe garagedeur')}`) : ''}

    <p style="margin:20px 0 0;padding-top:16px;border-top:1px solid ${KLEUR.lijn};font-family:${FONT};font-size:12px;line-height:19px;color:${KLEUR.inktZacht};">
      Ontvangen op ${esc(a.tijdstip)}${heeft(a.ip) ? ` &middot; IP ${esc(a.ip)}` : ''}
    </p>`;

  return {
    subject: `Offerteaanvraag ${afmeting || 'garagedeur'} — ${a.naam || 'onbekend'} (${a.postcode || '?'})`,
    html: omhulsel({
      titel: 'Nieuwe offerteaanvraag',
      preheader: `${a.naam || 'Onbekend'} uit ${a.postcode || '?'}${afmeting ? ` — ${afmeting}` : ''}`,
      inhoud
    })
  };
}

// ---------- Mail 2: de bevestiging, naar de klant ----------
function offerteBevestiging(a) {
  const afmeting = heeft(a.breedte) && heeft(a.hoogte) ? `${a.breedte} × ${a.hoogte} cm` : '';
  const voornaam = String(a.naam || '').trim().split(/\s+/)[0];

  const stap = (nr, kopje, tekst) => `
    <tr>
      <td width="38" valign="top" style="width:38px;padding:0 0 18px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td width="28" height="28" align="center" valign="middle" bgcolor="${KLEUR.accent}" style="width:28px;height:28px;background-color:${KLEUR.accent};border-radius:14px;font-family:${FONT};font-size:13px;font-weight:800;color:${KLEUR.antraciet};line-height:28px;">${nr}</td></tr>
        </table>
      </td>
      <td valign="top" style="padding:0 0 18px;font-family:${FONT};font-size:15px;line-height:23px;color:${KLEUR.inkt};">
        <strong style="font-weight:700;">${esc(kopje)}</strong><br>
        <span style="color:${KLEUR.inktZacht};font-size:14px;">${esc(tekst)}</span>
      </td>
    </tr>`;

  const inhoud = `
    ${kicker('Aanvraag ontvangen')}
    ${titel(voornaam ? `Bedankt, ${voornaam}!` : 'Bedankt voor je aanvraag!')}
    <p style="margin:0 0 6px;font-family:${FONT};font-size:16px;line-height:26px;color:${KLEUR.inkt};">
      We hebben je aanvraag voor een nieuwe Drutex D-GATE garagedeur in goede orde ontvangen.
      Je hoort <strong>binnen 1 werkdag</strong> van ons met een vrijblijvende prijsopgave.
    </p>

    ${sectieKop('Hoe het verder gaat')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${stap(1, 'Wij nemen contact op', 'Telefonisch of per e-mail, om je wensen kort door te nemen.')}
      ${stap(2, 'Gratis inmeting bij jou thuis', 'Een monteur meet je garageopening exact in. Daar zit je nergens aan vast.')}
      ${stap(3, 'Montage in één dag', 'Wij leveren, monteren en voeren je oude deur netjes af.')}
    </table>

    ${a.kleurHex ? sectieKop('Zo ziet je keuze eruit') + deurBlok(a) : ''}

    ${sectieKop('Dit gaf je door')}
    ${lijst([
      ['Postcode', a.postcode],
      ['Afmeting', afmeting],
      ['Model', a.model || 'Advies gewenst'],
      ['Paneel', a.paneel],
      ['Profilering', a.profilering],
      ['Kleur', a.kleur, { voor: kleurStip(a.kleurHex) }],
      ['Bediening', a.motor],
      ['Opmerkingen', a.opmerking]
    ])}

    <p style="margin:22px 0 0;font-family:${FONT};font-size:15px;line-height:24px;color:${KLEUR.inktZacht};">
      Klopt er iets niet, of wil je nog iets toevoegen? Beantwoord deze e-mail gewoon &mdash; dan passen we het aan.
    </p>
    ${knop('Bekijk alle modellen', `${SITE_URL}/modellen`, 'amber')}`;

  return {
    subject: 'We hebben je aanvraag ontvangen — MaatwerkGaragedeur.nl',
    html: omhulsel({
      titel: 'Aanvraag ontvangen',
      preheader: 'Je hoort binnen 1 werkdag van ons met een vrijblijvende prijsopgave.',
      inhoud
    })
  };
}

module.exports = { offerteIntern, offerteBevestiging };
