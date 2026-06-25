/* ===========================================================
   MrDTF — Popup de consimțământ cookie-uri (GDPR)
   Afișează un modal centrat la prima vizită și reține opțiunea
   utilizatorului în localStorage. Site-ul folosește doar stocare
   esențială; popup-ul informează și permite acordul pentru
   eventuale cookie-uri non-esențiale (analiză/marketing).
   Popup-ul poate fi închis (X / clic pe fundal) — în acest caz
   se păstrează doar cookie-urile esențiale.
   =========================================================== */
(function () {
  "use strict";

  var KEY = "mrdtf_cookie_consent"; // "all" | "essential"

  // Dacă utilizatorul a ales deja, nu mai afișăm popup-ul.
  try {
    if (localStorage.getItem(KEY)) return;
  } catch (e) {
    return; // localStorage indisponibil — nu blocăm site-ul
  }

  function save(choice) {
    try {
      localStorage.setItem(KEY, choice);
      localStorage.setItem(KEY + "_at", new Date().toISOString());
    } catch (e) {}
    // Eveniment pentru o eventuală încărcare condiționată a
    // scripturilor de analiză/marketing după acordul utilizatorului.
    try {
      document.dispatchEvent(new CustomEvent("cookie-consent", { detail: choice }));
    } catch (e) {}
  }

  function build() {
    var wrap = document.createElement("div");
    wrap.className = "cookie-pop";
    wrap.innerHTML =
      '<div class="cookie-pop__overlay" data-close="1"></div>' +
      '<div class="cookie-pop__modal" role="dialog" aria-modal="false" aria-labelledby="cookiePopTitle">' +
        '<button type="button" class="cookie-pop__x" data-close="1" aria-label="Închide">✕</button>' +
        '<div class="cookie-pop__icon" aria-hidden="true">🍪</div>' +
        '<h3 class="cookie-pop__title" id="cookiePopTitle">Folosim cookie-uri</h3>' +
        '<p class="cookie-pop__text">Folosim stocare esențială pentru funcționarea site-ului ' +
          "(coș de cumpărături, autentificare). Cu acordul tău putem folosi și cookie-uri pentru " +
          "analiză și îmbunătățirea experienței. Detalii în " +
          '<a href="/confidentialitate">Politica de confidențialitate</a>.</p>' +
        '<div class="cookie-pop__actions">' +
          '<button type="button" class="btn btn--ghost cookie-pop__btn" data-consent="essential">Doar esențiale</button>' +
          '<button type="button" class="btn btn--cta cookie-pop__btn" data-consent="all">Accept toate</button>' +
        "</div>" +
      "</div>";
    return wrap;
  }

  function init() {
    if (document.querySelector(".cookie-pop")) return;
    var pop = build();
    document.body.appendChild(pop);
    requestAnimationFrame(function () { pop.classList.add("is-visible"); });

    function dismiss(choice) {
      save(choice);
      pop.classList.remove("is-visible");
      setTimeout(function () { pop.remove(); document.removeEventListener("keydown", onKey); }, 300);
    }

    function onKey(e) { if (e.key === "Escape") dismiss("essential"); }
    document.addEventListener("keydown", onKey);

    pop.addEventListener("click", function (e) {
      var consentBtn = e.target.closest("[data-consent]");
      if (consentBtn) return dismiss(consentBtn.getAttribute("data-consent"));
      // Închidere prin X sau clic pe fundal => doar cookie-uri esențiale.
      if (e.target.closest("[data-close]")) return dismiss("essential");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
