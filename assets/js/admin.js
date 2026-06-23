/* ===========================================================
   MrDTF — Panou admin (CMS) pentru pagina principală
   Model „viu”: inputurile modifică direct obiectul `content`,
   iar listele de obiecte se pot adăuga / șterge.
   =========================================================== */
(function () {
  "use strict";

  var TOKEN_KEY = "mrdtf_token";
  var token = localStorage.getItem(TOKEN_KEY) || "";
  var content = null;     // modelul curent (sursa de adevăr)
  var templates = {};     // șabloane pentru elemente noi, după calea listei

  var $ = function (id) { return document.getElementById(id); };
  var loginView = $("loginView"), editorView = $("editorView"), topActions = $("topActions");

  /* Etichete prietenoase pentru chei */
  var LABELS = {
    brandTagline: "Slogan brand (sub logo)",
    hero: "Hero (secțiunea de sus)",
    line1: "Titlu — rândul 1", hi: "Titlu — cuvânt accentuat", line2: "Titlu — rândul 2",
    subPre: "Subtitlu — text", subHi: "Subtitlu — accent",
    stats: "Statistici (o linie fiecare)", checks: "Bife (o linie fiecare)",
    cta: "Text buton", hint: "Text sub buton",
    pills: "Carduri avantaje", ico: "Emoji / iconiță", title: "Titlu", sub: "Subtitlu",
    order: "Secțiunea Comandă", eyebrow: "Etichetă mică", desc: "Descriere",
    checklist: "Listă avantaje (o linie fiecare)",
    calcTitle: "Titlu calculator", pricePerMeter: "Preț pe metru liniar (RON)",
    maxWidth: "Lățime maximă (cm)", uploadText: "Text buton upload", calcNote: "Notă sub buton",
    steps: "Pași (cum funcționează)",
    products: "Secțiunea Produse", items: "Produse", img: "Cale imagine (ex. assets/img/x.jpg)", name: "Nume",
    trust: "Garanții (jos)",
    footer: "Footer", tagline: "Descriere footer", phone: "Telefon", email: "Email",
    schedule: "Program", copyright: "Text copyright",
    banners: "Bannere", heroLeft: "Banner stânga (printuri)", heroRight: "Banner dreapta (imprimantă)",
  };
  var SINGULAR = { pills: "Avantaj", items: "Produs", steps: "Pas", trust: "Garanție" };
  function label(key) {
    return LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1");
  }

  /* ---------- Utilitare model ---------- */
  function getPath(obj, path) {
    return path.split(".").reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }
  function blankTemplate(obj) {
    if (Array.isArray(obj)) return [];
    if (obj && typeof obj === "object") {
      var o = {};
      Object.keys(obj).forEach(function (k) { o[k] = blankTemplate(obj[k]); });
      return o;
    }
    return typeof obj === "number" ? 0 : "";
  }
  function captureTemplates(data, path) {
    Object.keys(data).forEach(function (k) {
      var v = data[k], p = path ? path + "." + k : k;
      if (Array.isArray(v)) {
        if (v.length && typeof v[0] === "object") {
          templates[p] = blankTemplate(v[0]);
          v.forEach(function (it, i) { captureTemplates(it, p + "." + i); });
        }
      } else if (v && typeof v === "object") {
        captureTemplates(v, p);
      }
    });
  }

  /* ---------- Construire formular ---------- */
  function buildForm() {
    var form = $("form");
    form.innerHTML = "";
    Object.keys(content).forEach(function (key) {
      if (key === "products" || key === "banners") return; // au tab-uri proprii
      var section = document.createElement("section");
      section.className = "edit-section";
      var h = document.createElement("h2");
      h.textContent = label(key);
      section.appendChild(h);
      buildInto(section, content[key], key);
      form.appendChild(section);
    });
  }

  function buildProducts() {
    var form = $("productsForm");
    if (!form || !content.products) return;
    form.innerHTML = "";
    var section = document.createElement("section");
    section.className = "edit-section";
    var h = document.createElement("h2");
    h.textContent = "Secțiunea Produse";
    section.appendChild(h);
    buildInto(section, content.products, "products");
    form.appendChild(section);
  }

  function buildBanners() {
    var form = $("bannersForm");
    if (!form || !content.banners) return;
    form.innerHTML = "";
    var section = document.createElement("section");
    section.className = "edit-section";
    var h = document.createElement("h2");
    h.textContent = "Imagini hero";
    section.appendChild(h);
    buildInto(section, content.banners, "banners");
    form.appendChild(section);
  }

  // reconstruiește tab-ul activ
  function rerender() {
    if ($("tab-banners") && !$("tab-banners").hidden) buildBanners();
    else if ($("tab-products") && !$("tab-products").hidden) buildProducts();
    else buildForm();
  }

  function buildInto(parent, value, path) {
    if (Array.isArray(value)) {
      if (value.length && typeof value[0] === "object") {
        var list = document.createElement("div");
        list.className = "edit-list";
        value.forEach(function (item, i) {
          list.appendChild(objectCard(item, path + "." + i, path, i));
        });
        parent.appendChild(list);
        // buton adăugare
        var add = document.createElement("button");
        add.type = "button";
        add.className = "btn btn--ghost btn--add";
        add.textContent = "＋ Adaugă " + (SINGULAR[keyOf(path)] || "element");
        add.addEventListener("click", function () {
          var tpl = templates[path] || blankTemplate(value[0] || {});
          value.push(JSON.parse(JSON.stringify(tpl)));
          rerender();
        });
        parent.appendChild(add);
      } else {
        // listă de text → o linie per element
        field(parent, label(keyOf(path)), linesTextarea(value, path));
      }
    } else if (value && typeof value === "object") {
      Object.keys(value).forEach(function (k) { buildInto(parent, value[k], path + "." + k); });
    } else if (keyOf(path) === "img" || path.indexOf("banners.") === 0) {
      parent.appendChild(mediaField(value, path, label(keyOf(path))));
    } else {
      field(parent, label(keyOf(path)), scalarInput(value, path));
    }
  }

  /* câmp imagine: previzualizare + buton de încărcare + cale text */
  function mediaField(value, path, labelText) {
    var wrap = document.createElement("div");
    wrap.className = "edit-field media-field";
    var span = document.createElement("span");
    span.textContent = labelText || "Imagine";
    wrap.appendChild(span);

    var prev = document.createElement("img");
    prev.className = "media-prev";
    if (value) prev.src = value; else prev.style.display = "none";

    var input = el("input", { type: "text" });
    input.value = value == null ? "" : value;
    input.placeholder = "URL sau cale imagine";
    input.dataset.path = path;
    input.addEventListener("input", function () {
      setPath(content, path, input.value);
      if (input.value) { prev.src = input.value; prev.style.display = ""; } else prev.style.display = "none";
    });

    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "btn btn--ghost btn--sm";
    btn.textContent = "⬆ Încarcă imagine";
    var file = el("input", { type: "file", accept: "image/*" });
    file.style.display = "none";
    btn.addEventListener("click", function () { file.click(); });
    file.addEventListener("change", function () {
      if (!file.files || !file.files.length) return;
      var f = file.files[0];
      if (f.size > 5 * 1024 * 1024) { alert("Imagine prea mare (max 5 MB)."); return; }
      btn.disabled = true; btn.textContent = "Se încarcă…";
      var fd = new FormData(); fd.append("file", f);
      fetch("/api/media", { method: "POST", headers: { Authorization: "Bearer " + token }, body: fd })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          btn.disabled = false; btn.textContent = "⬆ Încarcă imagine";
          if (!res.ok) { alert(res.d.error || "Eroare la încărcare."); return; }
          input.value = res.d.url; setPath(content, path, res.d.url);
          prev.src = res.d.url; prev.style.display = "";
        })
        .catch(function () { btn.disabled = false; btn.textContent = "⬆ Încarcă imagine"; alert("Eroare de rețea."); });
    });

    var row = document.createElement("div");
    row.className = "media-row";
    row.appendChild(btn); row.appendChild(input);
    wrap.appendChild(prev); wrap.appendChild(row); wrap.appendChild(file);
    return wrap;
  }

  function objectCard(item, path, arrPath, index) {
    var card = document.createElement("div");
    card.className = "edit-card";
    var head = document.createElement("div");
    head.className = "edit-card__head";
    var t = document.createElement("h4");
    t.textContent = (item.title || item.name || SINGULAR[keyOf(arrPath)] || "Element") + " " + (index + 1);
    var del = document.createElement("button");
    del.type = "button";
    del.className = "card-del";
    del.title = "Șterge";
    del.textContent = "✕";
    del.addEventListener("click", function () {
      var arr = getPath(content, arrPath);
      arr.splice(index, 1);
      rerender();
    });
    head.appendChild(t); head.appendChild(del);
    card.appendChild(head);
    buildInto(card, item, path);
    return card;
  }

  /* ---------- Inputuri legate de model ---------- */
  function scalarInput(value, path) {
    var input;
    if (typeof value === "number") {
      input = el("input", { type: "number", step: "any" });
      input.value = value;
      input.addEventListener("input", function () {
        setPath(content, path, input.value === "" ? 0 : Number(input.value));
      });
    } else if (String(value).length > 70) {
      input = document.createElement("textarea");
      input.rows = 3; input.value = value;
      input.addEventListener("input", function () { setPath(content, path, input.value); });
    } else {
      input = el("input", { type: "text" });
      input.value = value == null ? "" : value;
      input.addEventListener("input", function () { setPath(content, path, input.value); });
    }
    return input;
  }
  function linesTextarea(arr, path) {
    var t = document.createElement("textarea");
    t.value = arr.join("\n");
    t.rows = Math.max(2, arr.length);
    t.addEventListener("input", function () {
      setPath(content, path, t.value.split("\n").map(function (s) { return s.trim(); })
        .filter(function (s) { return s.length; }));
    });
    return t;
  }

  function keyOf(path) { return path.split(".").pop(); }
  function el(tag, attrs) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function field(parent, labelText, input) {
    var wrap = document.createElement("label");
    wrap.className = "edit-field";
    var span = document.createElement("span");
    span.textContent = labelText;
    wrap.appendChild(span); wrap.appendChild(input);
    parent.appendChild(wrap);
  }
  function setPath(obj, path, val) {
    var parts = path.split("."), o = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      var k = parts[i];
      if (o[k] == null) o[k] = /^\d+$/.test(parts[i + 1]) ? [] : {};
      o = o[k];
    }
    o[parts[parts.length - 1]] = val;
  }

  /* ---------- API ---------- */
  function api(method, path, body, auth) {
    var headers = { "Content-Type": "application/json" };
    if (auth) headers.Authorization = "Bearer " + token;
    return fetch(path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined });
  }

  function showEditor() {
    loginView.hidden = true; editorView.hidden = false; topActions.hidden = false;
    api("GET", "/api/content").then(function (r) { return r.json(); }).then(function (data) {
      content = data; templates = {}; captureTemplates(content, "");
      buildForm();
    });
  }
  function showLogin(msg) {
    editorView.hidden = true; topActions.hidden = true; loginView.hidden = false;
    if (msg) setMsg("loginMsg", msg, true);
  }
  function setMsg(id, text, isError) {
    var m = $(id);
    m.textContent = text;
    m.className = "form-msg" + (isError ? " is-error" : " is-ok");
  }

  /* ---------- Login ---------- */
  $("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    setMsg("loginMsg", "Se verifică…", false);
    api("POST", "/api/login", { password: $("password").value }).then(function (r) {
      return r.json().then(function (d) { return { ok: r.ok, d: d }; });
    }).then(function (res) {
      if (!res.ok) return setMsg("loginMsg", res.d.error || "Eroare la autentificare.", true);
      token = res.d.token; localStorage.setItem(TOKEN_KEY, token);
      showEditor();
    }).catch(function () { setMsg("loginMsg", "Eroare de rețea.", true); });
  });
  $("logoutBtn").addEventListener("click", function () {
    localStorage.removeItem(TOKEN_KEY); token = ""; showLogin();
  });

  /* ---------- Salvare ---------- */
  function save(msgId) {
    msgId = msgId || "editorMsg";
    setMsg(msgId, "Se salvează…", false);
    api("PUT", "/api/content", content, true).then(function (r) {
      return r.json().then(function (d) { return { ok: r.ok, status: r.status, d: d }; });
    }).then(function (res) {
      if (res.status === 401) { showLogin("Sesiune expirată. Autentifică-te din nou."); return; }
      if (!res.ok) return setMsg(msgId, res.d.error || "Eroare la salvare.", true);
      setMsg(msgId, "✓ Salvat! Schimbările sunt live pe site.", false);
    }).catch(function () { setMsg(msgId, "Eroare de rețea.", true); });
  }
  $("saveBtn").addEventListener("click", function () { save("editorMsg"); });
  $("saveBtn2").addEventListener("click", function () { save("editorMsg"); });
  $("saveProductsBtn").addEventListener("click", function () { save("productsMsg"); });
  $("saveProductsBtn2").addEventListener("click", function () { save("productsMsg"); });
  $("saveBannersBtn").addEventListener("click", function () { save("bannersMsg"); });
  $("saveBannersBtn2").addEventListener("click", function () { save("bannersMsg"); });

  /* ---------- Reset ---------- */
  $("resetBtn").addEventListener("click", function () {
    if (!confirm("Sigur resetezi toate textele la valorile implicite?")) return;
    api("DELETE", "/api/content", null, true).then(function (r) {
      return r.json().then(function (d) { return { ok: r.ok, status: r.status, d: d }; });
    }).then(function (res) {
      if (res.status === 401) { showLogin("Sesiune expirată. Autentifică-te din nou."); return; }
      if (!res.ok) return setMsg("editorMsg", res.d.error || "Eroare.", true);
      content = res.d.content; templates = {}; captureTemplates(content, "");
      rerender();
      setMsg("editorMsg", "✓ Resetat la valorile implicite.", false);
    });
  });

  /* ---------- Tab-uri ---------- */
  var statuses = ["Nouă", "În lucru", "Trimisă", "Finalizată", "Anulată"];
  document.querySelectorAll(".tab").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      var which = btn.dataset.tab;
      $("tab-content").hidden = which !== "content";
      $("tab-banners").hidden = which !== "banners";
      $("tab-products").hidden = which !== "products";
      $("tab-orders").hidden = which !== "orders";
      if (which === "orders") loadOrders();
      else if (which === "products") buildProducts();
      else if (which === "banners") buildBanners();
      else buildForm();
    });
  });
  $("ordersRefresh").addEventListener("click", loadOrders);

  /* ---------- Comenzi ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function fmtDate(iso) {
    try { return new Date(iso).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" }); }
    catch (e) { return iso || ""; }
  }

  function loadOrders() {
    setMsg("ordersMsg", "Se încarcă…", false);
    api("GET", "/api/orders", null, true).then(function (r) {
      if (r.status === 401) { showLogin("Sesiune expirată. Autentifică-te din nou."); return null; }
      return r.json();
    }).then(function (d) {
      if (!d) return;
      if (d.statuses) statuses = d.statuses;
      renderOrders(d.orders || []);
      var badge = $("ordersBadge");
      var n = (d.orders || []).length;
      badge.textContent = n; badge.hidden = n === 0;
      setMsg("ordersMsg", n ? "" : "Nicio comandă încă.", false);
    }).catch(function () { setMsg("ordersMsg", "Eroare la încărcare.", true); });
  }

  function renderOrders(orders) {
    var list = $("ordersList");
    list.innerHTML = orders.map(function (o) {
      var opts = statuses.map(function (s) {
        return "<option" + (s === o.status ? " selected" : "") + ">" + esc(s) + "</option>";
      }).join("");
      var fileRow = "";
      if (o.file) {
        if (o.file.key) {
          fileRow = "<button class=\"btn btn--ghost btn--sm order-dl\" data-id=\"" + esc(o.id) +
            "\" data-name=\"" + esc(o.file.name) + "\">⬇ " + esc(o.file.name) + "</button>";
        } else {
          fileRow = "<span class=\"order-file-pending\">📎 " + esc(o.file.name) +
            " (fișier indisponibil)</span>";
        }
      } else {
        fileRow = "<span class=\"order-meta\">Fără fișier atașat</span>";
      }
      var contact = [];
      if (o.phone) contact.push("📞 " + esc(o.phone));
      if (o.email) contact.push("✉️ " + esc(o.email));
      return "<div class=\"order-card\" data-status=\"" + esc(o.status) + "\">" +
        "<div class=\"order-card__top\">" +
          "<div><strong>" + esc(o.name) + "</strong><div class=\"order-meta\">" + fmtDate(o.createdAt) + "</div></div>" +
          "<select class=\"order-status\" data-id=\"" + esc(o.id) + "\">" + opts + "</select>" +
        "</div>" +
        "<div class=\"order-grid\">" +
          "<span>" + (contact.join(" · ") || "<span class='order-meta'>fără contact</span>") + "</span>" +
          "<span>📐 " + esc(o.width) + "×" + esc(o.length) + " (l×L)</span>" +
          "<span>💰 <strong>" + esc(o.price) + " RON</strong></span>" +
        "</div>" +
        (o.message ? "<p class=\"order-message\">„" + esc(o.message) + "”</p>" : "") +
        "<div class=\"order-card__foot\">" + fileRow +
          "<button class=\"order-del\" data-id=\"" + esc(o.id) + "\" title=\"Șterge comanda\">🗑</button>" +
        "</div>" +
      "</div>";
    }).join("");

    list.querySelectorAll(".order-status").forEach(function (sel) {
      sel.addEventListener("change", function () { changeStatus(sel.dataset.id, sel.value, sel); });
    });
    list.querySelectorAll(".order-dl").forEach(function (b) {
      b.addEventListener("click", function () { downloadFile(b.dataset.id, b.dataset.name); });
    });
    list.querySelectorAll(".order-del").forEach(function (b) {
      b.addEventListener("click", function () { deleteOrder(b.dataset.id); });
    });
  }

  function changeStatus(id, status, sel) {
    var card = sel.closest(".order-card");
    api("PATCH", "/api/orders/" + id, { status: status }, true).then(function (r) {
      if (r.status === 401) { showLogin("Sesiune expirată."); return; }
      if (r.ok && card) card.dataset.status = status;
      setMsg("ordersMsg", r.ok ? "✓ Status actualizat." : "Eroare la actualizare.", !r.ok);
    }).catch(function () { setMsg("ordersMsg", "Eroare de rețea.", true); });
  }

  function downloadFile(id, name) {
    api("GET", "/api/orders/" + id + "/file", null, true).then(function (r) {
      if (!r.ok) throw 0;
      return r.blob();
    }).then(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = name || "design";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }).catch(function () { setMsg("ordersMsg", "Nu am putut descărca fișierul.", true); });
  }

  function deleteOrder(id) {
    if (!confirm("Ștergi definitiv această comandă?")) return;
    api("DELETE", "/api/orders/" + id, null, true).then(function (r) {
      if (r.status === 401) { showLogin("Sesiune expirată."); return; }
      if (r.ok) loadOrders();
    });
  }

  /* ---------- Start ---------- */
  if (token) showEditor(); else showLogin();
})();
