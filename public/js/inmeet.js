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
    uploadBlok.hidden = true;
    foutBlok.hidden = true;
    statusBlok.hidden = false;

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

      resultaatBlok.hidden = false;
      resultaatBlok.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      toonFout('De verbinding is mislukt. Controleer je internet en probeer het opnieuw.');
    }
  });

  document.getElementById('opnieuwBtn').addEventListener('click', function () {
    resultaatBlok.hidden = true;
    uploadBlok.hidden = false;
    preview.hidden = true;
    knop.disabled = true;
    gekozen = null;
    input.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
