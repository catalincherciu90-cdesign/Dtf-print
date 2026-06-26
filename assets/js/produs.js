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

  fetch("/api/content", { headers: { Accept: "application/json" } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      var items = (data && data.products && data.products.items) || [];
      var prod = items.filter(Boolean).find(function (p) { return slugify(p.name) === slug; });
      if (!prod) { $("pdpMissing").hidden = false; return; }
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
    $("pdpSizes").textContent = p.marimi || p.desc || "—";
    $("pdpDims").textContent = p.dimensiuni || "—";

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
      if (window.MrCart && window.MrCart.add) {
        window.MrCart.add({ type: "product", name: p.name, price: fin, img: imgUrl, qty: 1 });
        if (window.MrCart.open) window.MrCart.open();
        setMsg("✓ Adăugat în coș.", false);
      } else {
        setMsg("Coșul nu e disponibil momentan.", true);
      }
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
  var state = { x: 50, y: 50, size: 40, rot: 0 }; // x/y = procent centru; size = % din lățimea stage-ului

  $("pdpUpload").addEventListener("click", function () { input.click(); });
  input.addEventListener("change", function () {
    if (!input.files || !input.files.length) return;
    var f = input.files[0];
    if (!/^image\//.test(f.type)) { setMsg("Te rugăm încarcă o imagine.", true); return; }
    var url = URL.createObjectURL(f);
    addDesign(url);
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
