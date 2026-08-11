// AI inmeet-assistent — upload, analyse en resultaatweergave
(function () {
  var input = document.getElementById('fotoInput');
  if (!input) return;

  var dropzone = document.getElementById('dropzone');
  var preview = document.getElementById('preview');
  var knop = document.getElementById('analyseerBtn');
  var uploadBlok = document.getElementById('uploadBlok');
  var statusBlok = document.getElementById('statusBlok');
  var resultaatBlok = document.getElementById('resultaatBlok');
  var foutBlok = document.getElementById('foutBlok');
  var gekozen = null;

  function kies(file) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toonFout('De foto is groter dan 8 MB. Kies een kleinere foto.'); return; }
    gekozen = file;
    var reader = new FileReader();
    reader.onload = function (e) {
      preview.src = e.target.result;
      preview.hidden = false;
      knop.disabled = false;
      foutBlok.hidden = true;
    };
    reader.readAsDataURL(file);
  }

  input.addEventListener('change', function () { kies(input.files[0]); });
  dropzone.addEventListener('click', function () { input.click(); });
  dropzone.addEventListener('dragover', function (e) { e.preventDefault(); dropzone.classList.add('sleep'); });
  dropzone.addEventListener('dragleave', function () { dropzone.classList.remove('sleep'); });
  dropzone.addEventListener('drop', function (e) {
    e.preventDefault(); dropzone.classList.remove('sleep');
    if (e.dataTransfer.files.length) kies(e.dataTransfer.files[0]);
  });

  function toonFout(tekst) {
    document.getElementById('foutTekst').textContent = tekst;
    foutBlok.hidden = false;
    statusBlok.hidden = true;
    uploadBlok.hidden = false;
    uploadBlok.classList.remove('bezig');
    knop.disabled = !gekozen;
  }

  // ---- maatlijnen over de foto van de klant ----
  // De AI geeft de opening als verhoudingen (0-1). We tekenen in de natuurlijke
  // pixelmaat van de foto, zodat lijndikte en tekst netjes meeschalen.
  function tekenMaatlijnen(fotoUrl, opening) {
    var blok = document.getElementById('resFotoBlok');
    var doek = document.getElementById('meetDoek');
    var foto = document.getElementById('meetFoto');
    if (!blok || !opening) { if (blok) blok.hidden = true; return; }

    foto.onload = function () {
      var W = foto.naturalWidth, H = foto.naturalHeight;
      var oud = doek.querySelector('svg');
      if (oud) oud.remove();

      var x1 = opening.x1 * W, y1 = opening.y1 * H;
      var x2 = opening.x2 * W, y2 = opening.y2 * H;
      var eenheid = Math.max(W, H) / 100;      // alles schaalt mee met de foto
      var lijn = eenheid * 0.55;
      var tekst = eenheid * 3.4;

      var NS = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.setAttribute('class', 'meet-svg');

      function el(naam, kenmerken) {
        var e = document.createElementNS(NS, naam);
        for (var k in kenmerken) e.setAttribute(k, kenmerken[k]);
        svg.appendChild(e);
        return e;
      }

      // dubbele pijl met een leesbaar label erop
      function maat(ax, ay, bx, by, label, kant) {
        el('line', { x1: ax, y1: ay, x2: bx, y2: by, stroke: '#f2a33c',
          'stroke-width': lijn, 'marker-start': 'url(#pijl)', 'marker-end': 'url(#pijl)' });
        var mx = (ax + bx) / 2, my = (ay + by) / 2;
        var breedte = label.length * tekst * 0.62 + tekst * 0.9;
        var hoogte = tekst * 1.7;
        if (kant === 'links') mx += breedte / 2 + eenheid;
        if (kant === 'boven') my -= hoogte / 2 + eenheid;
        el('rect', { x: mx - breedte / 2, y: my - hoogte / 2, width: breedte, height: hoogte,
          rx: hoogte / 2, fill: '#1e2225' });
        var t = el('text', { x: mx, y: my, fill: '#ffffff', 'font-size': tekst,
          'font-family': 'system-ui, sans-serif', 'font-weight': '700',
          'text-anchor': 'middle', 'dominant-baseline': 'central' });
        t.textContent = label;
      }

      var defs = el('defs', {});
      var marker = document.createElementNS(NS, 'marker');
      marker.setAttribute('id', 'pijl');
      marker.setAttribute('viewBox', '0 0 10 10');
      marker.setAttribute('refX', '5'); marker.setAttribute('refY', '5');
      marker.setAttribute('markerWidth', '4'); marker.setAttribute('markerHeight', '4');
      marker.setAttribute('orient', 'auto-start-reverse');
      var pad = document.createElementNS(NS, 'path');
      pad.setAttribute('d', 'M 10 5 L 0 0 L 0 10 z');
      pad.setAttribute('fill', '#f2a33c');
      marker.appendChild(pad); defs.appendChild(marker);

      // omtrek van de opening
      el('rect', { x: x1, y: y1, width: x2 - x1, height: y2 - y1, fill: 'none',
        stroke: '#f2a33c', 'stroke-width': lijn * 1.3, 'stroke-dasharray': eenheid * 2 + ' ' + eenheid * 1.4 });

      maat(x1, y2 + eenheid * 3, x2, y2 + eenheid * 3, 'Breedte', 'onder');
      maat(x1 - eenheid * 3, y1, x1 - eenheid * 3, y2, 'Hoogte', 'links');
      if (y1 > H * 0.08) maat(x1 + (x2 - x1) / 2, 0, x1 + (x2 - x1) / 2, y1, 'Latei', 'boven');
      if (x1 > W * 0.06) maat(0, y1 + (y2 - y1) / 2, x1, y1 + (y2 - y1) / 2, 'Zijruimte', 'onder');

      doek.appendChild(svg);
      blok.hidden = false;
    };
    foto.src = fotoUrl;
  }

  function vul(lijstEl, items) {
    lijstEl.innerHTML = '';
    (items || []).forEach(function (t) {
      var li = document.createElement('li');
      li.textContent = t;
      lijstEl.appendChild(li);
    });
  }

  knop.addEventListener('click', async function () {
    if (!gekozen) return;
    // Het uploadblok blijft staan. Weghalen laat de pagina inklappen, en omdat
    // de browser de scrollpositie vasthoudt beland je dan onderaan de pagina.
    foutBlok.hidden = true;
    uploadBlok.classList.add('bezig');
    knop.disabled = true;
    statusBlok.hidden = false;
    statusBlok.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    var fd = new FormData();
    fd.append('foto', gekozen);
    fd.append('toelichting', document.getElementById('toelichting').value || '');

    try {
      var resp = await fetch('/api/inmeet', { method: 'POST', body: fd });
      var data = await resp.json();
      statusBlok.hidden = true;

      if (!resp.ok || data.fout) { toonFout(data.fout || 'Er ging iets mis. Probeer het opnieuw.'); return; }

      if (data.herkend === false) {
        toonFout('We herkennen geen garagedeur of garageopening op deze foto (' + (data.deurtype || 'onbekend beeld') + '). Probeer een foto recht van voren met de hele deur in beeld.');
        return;
      }

      tekenMaatlijnen(preview.src, data.opening);
      document.getElementById('resDeurtype').textContent = data.deurtype || '';
      vul(document.getElementById('resObservaties'), data.observaties);
      vul(document.getElementById('resInstructies'), data.meetinstructies);
      document.getElementById('resAdvies').textContent = data.modeladvies || '';
      vul(document.getElementById('resAandacht'), data.aandachtspunten);

      var model = '';
      if (/D-GATE U/i.test(data.modeladvies || '')) model = 'D-GATE U';
      else if (/D-GATE B/i.test(data.modeladvies || '')) model = 'D-GATE B';
      else if (/D-GATE T/i.test(data.modeladvies || '')) model = 'D-GATE T';
      if (model) document.getElementById('resOfferteLink').href = '/offerte?model=' + encodeURIComponent(model);

      // pas nu het uploadblok weg; we scrollen meteen naar het resultaat,
      // dus het inklappen is niet merkbaar
      uploadBlok.hidden = true;
      uploadBlok.classList.remove('bezig');
      resultaatBlok.hidden = false;
      resultaatBlok.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      toonFout('De verbinding is mislukt. Controleer je internet en probeer het opnieuw.');
    }
  });

  document.getElementById('opnieuwBtn').addEventListener('click', function () {
    resultaatBlok.hidden = true;
    uploadBlok.hidden = false;
    uploadBlok.classList.remove('bezig');
    foutBlok.hidden = true;
    preview.hidden = true;
    knop.disabled = true;
    gekozen = null;
    input.value = '';
    uploadBlok.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
