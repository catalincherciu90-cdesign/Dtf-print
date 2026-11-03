/* ===========================================================
   MrDTF — Banner de consimțământ cookie-uri (GDPR)
   Stil „glass" potrivit temei noi (light). Se afișează o singură
   dată, jos pe ecran, și reține opțiunea în localStorage.
   Site-ul folosește doar stocare esențială; banner-ul informează
   și permite acordul pentru eventuale cookie-uri de analiză.
   Scriptul este autonom: își injectează propriul CSS, deci nu
   depinde de stilurile paginii și nu afectează designul.
   =========================================================== */

/* Sincronizare logo din admin (content.site.logo) pe toate paginile.
   Pe homepage folosește window.__MRDTF__ (injectat de worker, fără fetch);
   pe celelalte pagini face un singur fetch la /api/content. Fișierul din
   HTML rămâne fallback, deci nu există „logo gol" dacă nu răspunde. */
(function () {
  "use strict";
  function applyLogo(logo) {
    if (!logo) return;
    document.querySelectorAll("img.logo, img.flogo, img[alt=\"Mr.DTF\"]").forEach(function (i) { i.src = logo; });
  }
  try {
    if (window.__MRDTF__ && window.__MRDTF__.site) { applyLogo(window.__MRDTF__.site.logo); return; }
  } catch (e) { /* continuă cu fetch */ }
  try {
    fetch("/api/content").then(function (r) { return r.json(); })
      .then(function (d) { applyLogo(d && d.site && d.site.logo); })
      .catch(function () {});
  } catch (e) {}
})();

(function () {
  "use strict";

  var KEY = "mrdtf_cookie_consent"; // "all" | "essential"

  // Dacă utilizatorul a ales deja, nu mai afișăm banner-ul.
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

  function injectCss() {
    if (document.getElementById("mrdtf-cc-style")) return;
    var css =
      ".mrdtf-cc{position:fixed;left:16px;right:16px;bottom:16px;z-index:2000;" +
      "max-width:760px;margin:0 auto;padding:18px 20px;border-radius:22px;" +
      "background:rgba(255,255,255,.72);backdrop-filter:blur(18px) saturate(1.1);" +
      "-webkit-backdrop-filter:blur(18px) saturate(1.1);" +
      "border:1px solid rgba(255,255,255,.85);box-shadow:0 12px 40px rgba(0,0,0,.14);" +
      "color:#0f0f10;font-family:-apple-system,'SF Pro Display','Segoe UI',Roboto,Helvetica,Arial,sans-serif;" +
      "transform:translateY(140%);opacity:0;transition:transform .4s cubic-bezier(.22,1,.36,1),opacity .4s;" +
      "padding-bottom:calc(18px + env(safe-area-inset-bottom,0px))}" +
      ".mrdtf-cc.is-visible{transform:none;opacity:1}" +
      ".mrdtf-cc__row{display:flex;align-items:center;gap:16px;flex-wrap:wrap}" +
      ".mrdtf-cc__txt{flex:1 1 320px;min-width:0;font-size:14px;line-height:1.5;color:#3a3a40;margin:0}" +
      ".mrdtf-cc__txt b{color:#0f0f10}" +
      ".mrdtf-cc__txt a{color:#0f0f10;text-decoration:underline;text-underline-offset:2px}" +
      ".mrdtf-cc__actions{display:flex;gap:10px;flex:0 0 auto;flex-wrap:wrap}" +
      ".mrdtf-cc__btn{font:inherit;font-weight:600;font-size:14px;cursor:pointer;" +
      "padding:11px 18px;border-radius:999px;border:1px solid transparent;transition:transform .15s,filter .15s}" +
      ".mrdtf-cc__btn:focus-visible{outline:2px solid #0f0f10;outline-offset:2px}" +
      ".mrdtf-cc__btn:hover{transform:translateY(-1px)}" +
      ".mrdtf-cc__btn--ghost{background:rgba(255,255,255,.6);border-color:rgba(15,15,16,.18);color:#0f0f10}" +
      ".mrdtf-cc__btn--cta{background:#111;color:#fff}" +
      ".mrdtf-cc__btn--cta:hover{filter:brightness(1.12)}" +
      "@media(max-width:560px){.mrdtf-cc__actions{width:100%}.mrdtf-cc__btn{flex:1 1 auto;text-align:center}}";
    var st = document.createElement("style");
    st.id = "mrdtf-cc-style";
    st.textContent = css;
    document.head.appendChild(st);
  }

  function build() {
    var wrap = document.createElement("div");
    wrap.className = "mrdtf-cc";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-live", "polite");
    wrap.setAttribute("aria-label", "Consimțământ cookie-uri");
    wrap.innerHTML =
      '<div class="mrdtf-cc__row">' +
        '<p class="mrdtf-cc__txt"><b>Folosim cookie-uri.</b> Folosim stocare esențială pentru ' +
          "funcționarea site-ului. Cu acordul tău putem folosi și cookie-uri pentru analiză și " +
          "îmbunătățirea experienței. Detalii în " +
          '<a href="/politica-de-confidentialitate">Politica de confidențialitate</a>.</p>' +
        '<div class="mrdtf-cc__actions">' +
          '<button type="button" class="mrdtf-cc__btn mrdtf-cc__btn--ghost" data-consent="essential">Doar esențiale</button>' +
          '<button type="button" class="mrdtf-cc__btn mrdtf-cc__btn--cta" data-consent="all">Accept toate</button>' +
        "</div>" +
      "</div>";
    return wrap;
  }

  function init() {
    if (document.querySelector(".mrdtf-cc")) return;
    injectCss();
    var pop = build();
    document.body.appendChild(pop);
    requestAnimationFrame(function () { pop.classList.add("is-visible"); });

    function dismiss(choice) {
      save(choice);
      pop.classList.remove("is-visible");
      setTimeout(function () { pop.remove(); }, 400);
    }

    pop.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-consent]");
      if (btn) dismiss(btn.getAttribute("data-consent"));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
