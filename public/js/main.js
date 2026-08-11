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

  // Offertepagina: de keuzes in het formulier sturen de deur-preview aan.
  // De .kleur-tegel- en .paneel-knop-listeners hierboven doen het tekenwerk al;
  // hier zetten we alleen de beginstand en de "weet ik nog niet"-optie.
  var offerteForm = document.querySelector('.offerte-form');
  if (offerteForm && document.getElementById('deurSvg')) {
    var STANDAARDKLEUR = '#383e42'; // Antraciet (RAL 7016)

    var geenVoorkeur = offerteForm.querySelector('.kleur-geen input');
    if (geenVoorkeur) {
      geenVoorkeur.addEventListener('change', function () {
        if (!geenVoorkeur.checked) return;
        document.querySelectorAll('.kleur-tegel').forEach(function (x) { x.classList.remove('actief'); });
        zetKleur(STANDAARDKLEUR, null);
      });
    }

    // Paneelafwerking bepaalt het reliëf op de preview
    // (Smooth = geen groeven, Woodgrain = laag, Deep Mat = hoog)
    function zetProfiel(profiel) {
      document.querySelectorAll('.profiel-hoog').forEach(function (g) {
        g.style.display = profiel === 'hoog' ? '' : 'none';
      });
      document.querySelectorAll('.profiel-laag').forEach(function (g) {
        g.style.display = profiel === 'laag' ? '' : 'none';
      });
    }

    offerteForm.querySelectorAll('.afwerking-tegel').forEach(function (t) {
      t.addEventListener('click', function () { zetProfiel(t.dataset.profiel); });
    });

    // Beginstand herstellen — nodig als het formulier na een fout opnieuw wordt getoond
    var gekozenTegel = offerteForm.querySelector('.kleur-tegel input:checked');
    if (gekozenTegel) {
      var tegel = gekozenTegel.closest('.kleur-tegel');
      tegel.classList.add('actief');
      zetKleur(tegel.dataset.hex, tegel.dataset.naam);
    }
    var gekozenAfwerking = offerteForm.querySelector('.afwerking-tegel input:checked');
    if (gekozenAfwerking) zetProfiel(gekozenAfwerking.closest('.afwerking-tegel').dataset.profiel);
  }

  // Model prefill via ?model= op de offertepagina (link vanaf /modellen).
  // De modelkeuze is een set radio's, geen select meer.
  var params = new URLSearchParams(window.location.search);
  var model = params.get('model');
  if (model) {
    document.querySelectorAll('.model-tegel input[name="model"]').forEach(function (r) {
      if (r.value.indexOf(model) === 0) r.checked = true;
    });
  }
})();
