/* MrDTF — Banner „Instalează aplicația" (PWA)
   - Android/Chrome/Edge: buton care declanșează instalarea nativă (beforeinstallprompt).
   - iOS Safari: instrucțiune (Share → Adaugă pe ecranul principal), că nu există API de instalare.
   - Nu apare dacă aplicația e deja instalată, pe /admin, sau dacă a fost închis recent.
*/
(function () {
  "use strict";
  try {
    if (location.pathname.indexOf("/admin") === 0) return;
    var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
    if (standalone) return;

    var KEY = "mrdtf_pwa_dismissed";
    try { var ts = Number(localStorage.getItem(KEY) || 0); if (ts && (Date.now() - ts) < 7 * 86400000) return; } catch (e) { /* ignore */ }

    var ua = navigator.userAgent || "";
    var isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    var deferred = null, ready = false, shown = false, bar = null;

    window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; maybeShow(); });
    setTimeout(function () { ready = true; maybeShow(); }, 3000);

    function maybeShow() {
      if (shown || !ready) return;
      if (deferred) show(false);
      else if (isIOS) show(true);
    }

    function injectCSS() {
      if (document.getElementById("pwaBarCSS")) return;
      var css = ".pwa-bar{position:fixed;left:50%;bottom:16px;transform:translate(-50%,150%);z-index:9999;display:flex;align-items:center;gap:12px;width:calc(100% - 28px);max-width:460px;padding:12px 14px;border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.93),rgba(255,255,255,.83));-webkit-backdrop-filter:blur(22px) saturate(180%);backdrop-filter:blur(22px) saturate(180%);border:1px solid rgba(255,255,255,.9);box-shadow:0 18px 50px rgba(0,0,0,.22);opacity:0;transition:transform .45s cubic-bezier(.2,.9,.3,1.1),opacity .4s;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif}" +
        ".pwa-bar.in{transform:translate(-50%,0);opacity:1}" +
        ".pwa-bar__ic{width:46px;height:46px;border-radius:12px;flex:none;box-shadow:0 4px 12px rgba(0,0,0,.18)}" +
        ".pwa-bar__tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;color:#0f0f10;font-size:13.5px;line-height:1.3}" +
        ".pwa-bar__tx b{font-size:14.5px;font-weight:700}" +
        ".pwa-bar__tx span{color:#5c5c63}" +
        ".pwa-shr{width:15px;height:15px;vertical-align:-3px;fill:none;stroke:#0f0f10;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}" +
        ".pwa-bar__btn{flex:none;background:#0b0b0c;color:#fff;border:0;border-radius:12px;padding:10px 16px;font-weight:700;font-size:13.5px;cursor:pointer;font-family:inherit}" +
        ".pwa-bar__btn:hover{filter:brightness(1.15)}" +
        ".pwa-bar__x{flex:none;width:28px;height:28px;border-radius:50%;border:0;background:rgba(0,0,0,.06);color:#333;font-size:18px;line-height:1;cursor:pointer}" +
        ".pwa-bar__x:hover{background:rgba(0,0,0,.12)}" +
        "@media(max-width:420px){.pwa-bar{bottom:10px;gap:10px;padding:11px 12px}.pwa-bar__ic{width:40px;height:40px}}" +
        "@media(prefers-color-scheme:dark){.pwa-bar{background:linear-gradient(180deg,rgba(28,28,32,.93),rgba(20,20,24,.87));border-color:rgba(255,255,255,.14)}.pwa-bar__tx{color:#f2f2f5}.pwa-bar__tx span{color:#b9b9c2}.pwa-shr{stroke:#f2f2f5}.pwa-bar__btn{background:#ffc800;color:#111}.pwa-bar__x{background:rgba(255,255,255,.12);color:#eee}}";
      var st = document.createElement("style"); st.id = "pwaBarCSS"; st.textContent = css;
      document.head.appendChild(st);
    }

    function dismiss() {
      try { localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* ignore */ }
      if (bar) { bar.classList.remove("in"); setTimeout(function () { if (bar) bar.remove(); }, 350); }
    }

    function show(ios) {
      if (shown || !document.body) return;
      shown = true;
      injectCSS();
      bar = document.createElement("div");
      bar.className = "pwa-bar";
      bar.setAttribute("role", "dialog");
      bar.setAttribute("aria-label", "Instalează aplicația");
      var icon = '<img src="/assets/img/apple-touch-icon.png" alt="" class="pwa-bar__ic">';
      var inner;
      if (ios) {
        inner = '<div class="pwa-bar__tx"><b>Instalează aplicația MrDTF</b>' +
          '<span>Apasă <svg viewBox="0 0 24 24" class="pwa-shr"><path d="M12 3v12m0-12 4 4m-4-4-4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg> apoi „Adaugă pe ecranul principal".</span></div>';
      } else {
        inner = '<div class="pwa-bar__tx"><b>Instalează aplicația MrDTF</b>' +
          '<span>Acces rapid de pe ecranul telefonului.</span></div>' +
          '<button type="button" class="pwa-bar__btn" id="pwaInstall">Instalează</button>';
      }
      bar.innerHTML = icon + inner + '<button type="button" class="pwa-bar__x" aria-label="Închide">×</button>';
      document.body.appendChild(bar);
      requestAnimationFrame(function () { bar.classList.add("in"); });
      bar.querySelector(".pwa-bar__x").addEventListener("click", dismiss);
      var ib = bar.querySelector("#pwaInstall");
      if (ib) ib.addEventListener("click", function () {
        if (!deferred) { dismiss(); return; }
        deferred.prompt();
        deferred.userChoice.then(function () { deferred = null; dismiss(); }).catch(function () { dismiss(); });
      });
    }
  } catch (e) { /* fail-safe: niciun banner nu trebuie să strice pagina */ }
})();
