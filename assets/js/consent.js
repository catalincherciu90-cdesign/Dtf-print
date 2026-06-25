/* ===========================================================
   MrDTF — Banner de consimțământ cookie-uri (GDPR)
   Afișează un banner la prima vizită și reține opțiunea
   utilizatorului în localStorage. Site-ul folosește doar
   stocare esențială; bannerul informează și permite acordul
   pentru eventuale cookie-uri non-esențiale (analiză/marketing).
   =========================================================== */
(function () {
  "use strict";

  var KEY = "mrdtf_cookie_consent"; // "all" | "essential"

  // Dacă utilizatorul a ales deja, nu mai afișăm bannerul.
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
    // Expunem un eveniment pentru o eventuală încărcare condiționată
    // a scripturilor de analiză/marketing după acordul utilizatorului.
    try {
      document.dispatchEvent(new CustomEvent("cookie-consent", { detail: choice }));
    } catch (e) {}
  }

  function build() {
    var wrap = document.createElement("div");
    wrap.className = "cookie-banner";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-live", "polite");
    wrap.setAttribute("aria-label", "Consimțământ cookie-uri");
    wrap.innerHTML =
      '<div class="cookie-banner__inner">' +
        '<div class="cookie-banner__text">' +
          "<strong>Folosim cookie-uri 🍪</strong>" +
          "<p>Folosim stocare esențială pentru funcționarea site-ului (coș, autentificare). " +
          'Cu acordul tău putem folosi și cookie-uri pentru analiză și îmbunătățirea experienței. ' +
          'Detalii în <a href="/confidentialitate">Politica de confidențialitate</a>.</p>' +
        "</div>" +
        '<div class="cookie-banner__actions">' +
          '<button type="button" class="btn btn--ghost cookie-banner__btn" data-consent="essential">Doar esențiale</button>' +
          '<button type="button" class="btn btn--cta cookie-banner__btn" data-consent="all">Accept toate</button>' +
        "</div>" +
      "</div>";
    return wrap;
  }

  function init() {
    if (document.querySelector(".cookie-banner")) return;
    var banner = build();
    document.body.appendChild(banner);
    // animație de intrare
    requestAnimationFrame(function () { banner.classList.add("is-visible"); });

    banner.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-consent]");
      if (!btn) return;
      save(btn.getAttribute("data-consent"));
      banner.classList.remove("is-visible");
      setTimeout(function () { banner.remove(); }, 300);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
