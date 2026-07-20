// MaatwerkGaragedeur.nl — client-side interactie
(function () {
  // Hamburger
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Kleur wijzigen op SVG-deur
  function zetKleur(hex, naam) {
    document.querySelectorAll('.paneel-vlak').forEach(function (p) {
      p.setAttribute('fill', hex);
    });
    var hint = document.getElementById('kleurNaam');
    if (hint && naam) hint.textContent = naam;
  }

  // Swatches in de deur-visual (hero / kleurenpagina preview)
  document.querySelectorAll('.swatch').forEach(function (s) {
    s.addEventListener('click', function () {
      document.querySelectorAll('.swatch').forEach(function (x) { x.classList.remove('actief'); });
      s.classList.add('actief');
      document.querySelectorAll('.kleur-tegel').forEach(function (x) { x.classList.remove('actief'); });
      zetKleur(s.dataset.hex, s.getAttribute('title'));
    });
  });

  // Kleurtegels op de kleurenpagina
  document.querySelectorAll('.kleur-tegel').forEach(function (t) {
    t.addEventListener('click', function () {
      document.querySelectorAll('.kleur-tegel').forEach(function (x) { x.classList.remove('actief'); });
      document.querySelectorAll('.swatch').forEach(function (x) { x.classList.remove('actief'); });
      t.classList.add('actief');
      zetKleur(t.dataset.hex, t.dataset.naam);
      var preview = document.querySelector('.kleuren-preview');
      if (preview && window.innerWidth < 920) {
        preview.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });

  // Paneelstructuur (glad / laag / hoog)
  document.querySelectorAll('.paneel-knop').forEach(function (k) {
    k.addEventListener('click', function () {
      document.querySelectorAll('.paneel-knop').forEach(function (x) { x.classList.remove('actief'); });
      k.classList.add('actief');
      var keuze = k.dataset.profiel;
      document.querySelectorAll('.profiel-hoog').forEach(function (g) {
        g.style.display = keuze === 'hoog' ? '' : 'none';
      });
      document.querySelectorAll('.profiel-laag').forEach(function (g) {
        g.style.display = keuze === 'laag' ? '' : 'none';
      });
    });
  });

  // Model prefill via ?model= op offertepagina
  var params = new URLSearchParams(window.location.search);
  var model = params.get('model');
  var select = document.getElementById('modelSelect');
  if (model && select) {
    Array.prototype.forEach.call(select.options, function (o) {
      if (o.text.indexOf(model) === 0) select.value = o.value || o.text;
    });
  }
})();
