/* ===========================================================
   MrDTF — Set de iconițe SVG (stil linie, Lucide / MIT)
   - înlocuiește emoji-urile cu iconițe consistente pe orice device
   - folosește gradientul brandului (stroke url(#mrgrad))
   - mapare emoji → nume, ca valorile vechi salvate să devină iconițe
   API global:
     MrIcons.svg(name, {size, grad})   → string <svg> sau "" dacă nu există
     MrIcons.iconOrText(val, {size})    → iconiță dacă val e nume/emoji cunoscut, altfel text
     MrIcons.resolve(val)               → numele iconiței sau null
     MrIcons.names                      → lista de nume disponibile
   La încărcare: injectează gradientul + hidratează toate [data-icon].
   =========================================================== */
(function () {
  "use strict";

  // Path-uri Lucide (viewBox 0 0 24 24, stroke). MIT License.
  var P = {
    tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
    ruler: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/>',
    truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    bolt: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    award: '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
    printer: '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    store: '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/>',
    receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
    box: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.12 2.12 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.12 2.12 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.12 2.12 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.12 2.12 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.12 2.12 0 0 0 1.597-1.16z"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
    palette: '<path d="M12 22a10 10 0 1 1 10-10c0 2.2-1.8 4-4 4h-1.5a1.5 1.5 0 0 0-1.5 1.5 1.5 1.5 0 0 1-1.5 1.5z"/><circle cx="6.5" cy="11.5" r="1"/><circle cx="9.5" cy="7.5" r="1"/><circle cx="14.5" cy="7.5" r="1"/><circle cx="17.5" cy="11.5" r="1"/>',
    scissors: '<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>',
    droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
    shirt: '<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
    headset: '<path d="M3 11h3a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M18 11h3v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z"/><path d="M21 11a9 9 0 1 0-18 0"/><path d="M18 18a3 3 0 0 1-3 3h-3"/>',
  };

  // Mapare emoji → nume (compatibilitate cu valorile vechi salvate în CMS)
  var ALIAS = {
    "🏷️": "tag", "🏷": "tag", "📏": "ruler", "📐": "ruler", "🚚": "truck", "🚛": "truck",
    "🛡️": "shield", "🛡": "shield", "⚡": "bolt", "🏅": "award", "🥇": "award", "🏆": "award",
    "📤": "upload", "⬆️": "upload", "🖨️": "printer", "🖨": "printer", "🔍": "search", "🔎": "search",
    "🔒": "lock", "🔐": "lock", "💬": "message", "💭": "message", "📞": "phone", "☎️": "phone",
    "✉️": "mail", "✉": "mail", "📧": "mail", "📨": "mail", "🕘": "clock", "🕒": "clock", "⏰": "clock",
    "🏬": "store", "🏪": "store", "🧾": "receipt", "⭐": "star", "🌟": "star", "❤️": "heart", "📦": "box",
    "✨": "sparkles", "🎨": "palette", "✂️": "scissors", "💧": "droplet", "👕": "shirt", "🚀": "rocket",
    "🎧": "headset",
  };

  function svg(name, opts) {
    opts = opts || {};
    var size = opts.size || 24;
    var p = P[name];
    if (!p) return "";
    var stroke = opts.grad === false ? "currentColor" : "url(#mrgrad)";
    return '<svg class="mr-icon" viewBox="0 0 24 24" width="' + size + '" height="' + size +
      '" fill="none" stroke="' + stroke + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      p + "</svg>";
  }

  function resolve(val) {
    if (val == null) return null;
    var v = String(val).trim();
    if (P[v]) return v;
    if (ALIAS[v]) return ALIAS[v];
    var w = v.replace(/️/g, ""); // fără variation selector
    if (ALIAS[w]) return ALIAS[w];
    return null;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function iconOrText(val, opts) {
    var name = resolve(val);
    if (name) return svg(name, opts);
    return '<span class="mr-emoji">' + esc(val) + "</span>";
  }

  function injectGrad() {
    if (document.getElementById("mr-icon-defs")) return;
    var d = document.createElement("div");
    d.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
    d.setAttribute("aria-hidden", "true");
    d.innerHTML = '<svg id="mr-icon-defs"><defs>' +
      '<linearGradient id="mrgrad" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#22d3ee"/><stop offset="0.5" stop-color="#5b8cff"/>' +
      '<stop offset="1" stop-color="#d946ef"/></linearGradient></defs></svg>';
    (document.body || document.documentElement).appendChild(d);
  }

  // Hidratează <span data-icon="truck" data-icon-size="20"></span>
  function hydrate(root) {
    (root || document).querySelectorAll("[data-icon]").forEach(function (el) {
      if (el.dataset.iconDone) return;
      var name = resolve(el.getAttribute("data-icon"));
      if (!name) return;
      var size = el.getAttribute("data-icon-size");
      el.innerHTML = svg(name, { size: size ? Number(size) : 22, grad: el.getAttribute("data-icon-plain") == null });
      el.dataset.iconDone = "1";
    });
  }

  // gradientul îl injectăm imediat (există documentElement), ca referințele
  // url(#mrgrad) din conținutul randat dinamic să fie mereu valabile
  injectGrad();
  if (document.readyState !== "loading") hydrate(document);
  else document.addEventListener("DOMContentLoaded", function () { injectGrad(); hydrate(document); });

  window.MrIcons = { svg: svg, resolve: resolve, iconOrText: iconOrText, hydrate: hydrate, names: Object.keys(P), aliases: ALIAS };
})();
