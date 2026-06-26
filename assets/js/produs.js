/* ===========================================================
   MrDTF — Pagină produs (/produs/<slug>)
   - încarcă produsul din CMS după slug
   - tool de plasare design: încarci grafica, o muți / redimensionezi /
     rotești peste poza produsului (previzualizare)
   - „Adaugă în coș" prin window.MrCart (definit în main.js)
   =========================================================== */
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function absUrl(u) {
    u = String(u == null ? "" : u);
    return /^(https?:|\/|data:)/.test(u) ? u : "/" + u;
  }
  function slugify(s) {
    return String(s == null ? "" : s).toLowerCase()
      .replace(/ă/g, "a").replace(/â/g, "a").replace(/î/g, "i").replace(/ș/g, "s").replace(/ş/g, "s").replace(/ț/g, "t").replace(/ţ/g, "t")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  // slug-ul din path: /produs/<slug>
  var parts = location.pathname.replace(/\/+$/, "").split("/");
  var slug = decodeURIComponent(parts[parts.length - 1] || "");

  // identificatorul de URL al unui produs: codul intern (stabil), altfel numele
  function prodKey(x) { return slugify(x.cod || x.name); }

  function findProduct(items, s) {
    items = items.filter(function (x) { return x && (String(x.name || "").trim() || String(x.cod || "").trim()); });
    // 1. după cod intern (prioritar — stabil la redenumire)
    var p = items.find(function (x) { return x.cod && slugify(x.cod) === s; });
    if (p) return p;
    // 2. după nume slugificat (compatibilitate cu linkuri vechi)
    p = items.find(function (x) { return slugify(x.name) === s; });
    if (p) return p;
    // 3. normalizat fără cratime
    var sn = s.replace(/-/g, "");
    p = items.find(function (x) { return prodKey(x).replace(/-/g, "") === sn || slugify(x.name).replace(/-/g, "") === sn; });
    if (p) return p;
    // 4. prefix
    p = items.find(function (x) { var ps = prodKey(x); return ps && (ps.indexOf(s) === 0 || s.indexOf(ps) === 0); });
    if (p) return p;
    // 5. cel mai lung prefix comun (≥4) — toleră linkuri vechi
    var best = null, bestLen = 0;
    items.forEach(function (x) {
      var ps = prodKey(x), n = 0;
      while (n < ps.length && n < s.length && ps.charAt(n) === s.charAt(n)) n++;
      if (n > bestLen) { bestLen = n; best = x; }
    });
    return bestLen >= 4 ? best : null;
  }

  function showMissing(items) {
    var el = $("pdpMissing");
    el.hidden = false;
    var list = (items || []).filter(function (p) { return p && String(p.name || "").trim(); });
    el.innerHTML = "Produsul „" + esc(slug || "(gol)") + "” nu a fost găsit." +
      (list.length
        ? " Alege unul disponibil:<span class=\"pdp__missing-list\">" +
          list.map(function (p) { return '<a class="inline" href="/produs/' + prodKey(p) + '">' + esc(p.name) + "</a>"; }).join("") +
          "</span>"
        : " <a class=\"inline\" href=\"/produse\">Vezi toate produsele →</a>");
  }

  fetch("/api/content", { headers: { Accept: "application/json" } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      var items = (data && data.products && data.products.items) || [];
      var prod = findProduct(items, slug);
      if (!prod) { showMissing(items); return; }
      renderProduct(prod);
    })
    .catch(function () { $("pdpMissing").hidden = false; });

  function renderProduct(p) {
    var price = Number(p.price) || 0;
    var red = Math.max(0, Math.min(100, Number(p.reducere) || 0));
    var fin = red > 0 ? Number((price * (1 - red / 100)).toFixed(2)) : price;
    var imgUrl = absUrl(p.img);

    document.title = (p.name || "Produs") + " — MrDTF";
    $("pdpGrid").hidden = false;
    $("pdpName").textContent = p.name || "Produs";
    $("pdpDesc").textContent = p.descriereLunga || p.desc || "";
    $("pdpDims").textContent = p.dimensiuni || "—";
    populateSizes(p.marimi);

    var img = $("pdpImg");
    var hint = $("pdpStageHint");
    if (imgUrl) {
      img.alt = p.name || "";
      img.setAttribute("fetchpriority", "high");
      img.onerror = function () { img.style.display = "none"; if (hint) { hint.style.display = ""; hint.textContent = "Imaginea produsului nu a putut fi încărcată"; } };
      img.src = imgUrl;
    } else {
      img.style.display = "none";
      if (hint) hint.textContent = "Acest produs nu are încă o imagine. Adaug-o din Admin → Produse.";
    }

    if (price) {
      $("pdpPrice").innerHTML = red > 0
        ? '<span class="pdp__price-old">' + price.toFixed(2) + " RON</span> " + fin.toFixed(2) + " RON <span class=\"pdp__price-badge\">-" + red + "%</span>"
        : fin.toFixed(2) + " RON";
    } else {
      $("pdpPrice").textContent = "Preț la cerere";
    }

    var addBtn = $("pdpAddCart");
    if (!price) { addBtn.disabled = true; addBtn.textContent = "Indisponibil online"; }
    addBtn.addEventListener("click", function () {
      if (!price) return;
      if (!(window.MrCart && window.MrCart.add)) { setMsg("Coșul nu e disponibil momentan.", true); return; }
      var marime = $("pdpSizeWrap").hidden ? "" : $("pdpSizeSel").value;
      var qty = Math.max(1, Math.min(999, Math.round(Number($("pdpQty").value) || 1)));

      function addLine(designObj) {
        window.MrCart.add({
          type: "product", cod: p.cod || slugify(p.name), name: p.name,
          marime: marime, price: fin, img: imgUrl, qty: qty, design: designObj || null,
        });
        if (window.MrCart.open) window.MrCart.open();
        addBtn.disabled = false; addBtn.textContent = "Adaugă în coș";
        setMsg("✓ Adăugat în coș.", false);
      }

      if (designFile) {
        addBtn.disabled = true; addBtn.textContent = "Se urcă designul…";
        uploadDesign(designFile).then(function (res) {
          if (!res) { addBtn.disabled = false; addBtn.textContent = "Adaugă în coș"; setMsg("Designul nu a putut fi urcat. Încearcă din nou.", true); return; }
          addLine({ url: res.url, name: designFile.name || "design",
            x: Math.round(state.x), y: Math.round(state.y), size: Math.round(state.size), rot: Math.round(state.rot) });
        });
      } else {
        addLine(null);
      }
    });
  }

  function populateSizes(marimi) {
    var sel = $("pdpSizeSel"), wrap = $("pdpSizeWrap");
    var sizes = String(marimi || "").split(/[,;\/]/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!sizes.length) { wrap.hidden = true; sel.innerHTML = ""; return; }
    wrap.hidden = false;
    sel.innerHTML = sizes.map(function (s) { return '<option value="' + esc(s) + '">' + esc(s) + "</option>"; }).join("");
  }

  // Optimizează designul (max 2000px, WebP 0.92) păstrând calitatea; fallback original.
  function optimizeImage(file) {
    return new Promise(function (resolve) {
      if (!/^image\//.test(file.type || "") || /gif|svg/.test(file.type || "")) return resolve(file);
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          var MAXD = 2000;
          var scale = Math.min(1, MAXD / Math.max(img.naturalWidth, img.naturalHeight));
          var cw = Math.max(1, Math.round(img.naturalWidth * scale));
          var ch = Math.max(1, Math.round(img.naturalHeight * scale));
          var c = document.createElement("canvas"); c.width = cw; c.height = ch;
          c.getContext("2d").drawImage(img, 0, 0, cw, ch);
          URL.revokeObjectURL(url);
          c.toBlob(function (b) { resolve(b && b.size > 0 && b.size < file.size ? b : file); }, "image/webp", 0.92);
        } catch (e) { URL.revokeObjectURL(url); resolve(file); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  function uploadDesign(file) {
    return optimizeImage(file).then(function (blob) {
      if (blob.size > 5 * 1024 * 1024) return null;
      var fd = new FormData();
      fd.append("file", blob, String(file.name || "design").replace(/\.[^.]+$/, "") + (blob.type === "image/webp" ? ".webp" : ""));
      return fetch("/api/design", { method: "POST", body: fd })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) { return d && d.url ? d : null; })
        .catch(function () { return null; });
    });
  }

  function setMsg(t, err) {
    var m = $("pdpMsg");
    if (m) { m.textContent = t; m.className = "order-msg" + (err ? " is-error" : " is-ok"); }
  }

  /* ---------- Tool plasare design ---------- */
  var stage = $("pdpStage");
  var input = $("pdpDesignInput");
  var design = null;
  var designFile = null;
  var state = { x: 50, y: 50, size: 40, rot: 0 }; // x/y = procent centru; size = % din lățimea stage-ului

  $("pdpUpload").addEventListener("click", function () { input.click(); });
  input.addEventListener("change", function () {
    if (!input.files || !input.files.length) return;
    var f = input.files[0];
    if (!/^image\//.test(f.type)) { setMsg("Te rugăm încarcă o imagine.", true); return; }
    designFile = f;
    addDesign(URL.createObjectURL(f));
  });

  function addDesign(url) {
    if (design) design.remove();
    design = document.createElement("img");
    design.className = "pdp__design";
    design.alt = "Designul tău";
    design.draggable = false;
    design.src = url;
    stage.appendChild(design);
    state = { x: 50, y: 50, size: 40, rot: 0 };
    $("pdpSize").value = 40;
    $("pdpRot").value = 0;
    $("pdpControls").hidden = false;
    var hint = $("pdpStageHint"); if (hint) hint.style.display = "none";
    updateDesign();
    enableDrag();
  }

  function updateDesign() {
    if (!design) return;
    design.style.left = state.x + "%";
    design.style.top = state.y + "%";
    design.style.width = state.size + "%";
    design.style.transform = "translate(-50%, -50%) rotate(" + state.rot + "deg)";
  }

  $("pdpSize").addEventListener("input", function () { state.size = Number(this.value); updateDesign(); });
  $("pdpRot").addEventListener("input", function () { state.rot = Number(this.value); updateDesign(); });
  $("pdpRemove").addEventListener("click", function () {
    if (design) { design.remove(); design = null; }
    designFile = null;
    $("pdpControls").hidden = true;
    var hint = $("pdpStageHint"); if (hint) hint.style.display = "";
  });

  function enableDrag() {
    var dragging = false;
    design.addEventListener("pointerdown", function (e) {
      dragging = true;
      design.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    design.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var r = stage.getBoundingClientRect();
      var nx = ((e.clientX - r.left) / r.width) * 100;
      var ny = ((e.clientY - r.top) / r.height) * 100;
      state.x = Math.max(0, Math.min(100, nx));
      state.y = Math.max(0, Math.min(100, ny));
      updateDesign();
    });
    function end(e) { dragging = false; try { design.releasePointerCapture(e.pointerId); } catch (x) {} }
    design.addEventListener("pointerup", end);
    design.addEventListener("pointercancel", end);
  }

  /* ---------- Meniu mobil (header) ---------- */
  var burger = $("burger"), nav = $("nav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", String(open));
    });
  }
})();
