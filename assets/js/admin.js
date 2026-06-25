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
    reducere: "Reducere produs (%)",
    trust: "Garanții (jos)",
    footer: "Footer", tagline: "Descriere footer", phone: "Telefon", email: "Email",
    schedule: "Program", copyright: "Text copyright",
    banners: "Bannere", heroBg: "Fundal Hero (imagine completă)",
    heroLeft: "Banner stânga (printuri)", heroRight: "Banner dreapta (imprimantă)",
    veilOpacity: "Opacitate val (0–100, întunecime peste imagini)",
    discount: "Reducere coș", enabled: "Activă", tipPrag: "Tip prag",
    prag: "Prag (RON sau bucăți)", procent: "Procent reducere (%)",
    tiktok: "TikTok", profileUrl: "Link profil TikTok", videos: "Linkuri video (unul pe linie)",
    social: "Social media", facebook: "Facebook", instagram: "Instagram", youtube: "YouTube",
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
      if (key === "products" || key === "banners" || key === "discount" || key === "tiktok" || key === "social") return; // au tab-uri proprii
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

  function buildPromo() {
    var form = $("promoForm");
    if (!form || !content.discount) return;
    form.innerHTML = "";
    var section = document.createElement("section");
    section.className = "edit-section";
    var h = document.createElement("h2");
    h.textContent = "Reducere coș";
    section.appendChild(h);
    buildInto(section, content.discount, "discount");
    form.appendChild(section);
  }

  function buildTiktok() {
    var form = $("tiktokForm");
    if (!form || !content.tiktok) return;
    form.innerHTML = "";
    var section = document.createElement("section");
    section.className = "edit-section";
    var h = document.createElement("h2");
    h.textContent = "Setări secțiune";
    section.appendChild(h);
    buildInto(section, content.tiktok, "tiktok");
    form.appendChild(section);
    loadTiktokStatus();
  }

  function buildSocial() {
    var form = $("socialForm");
    if (!form || !content.social) return;
    form.innerHTML = "";
    var section = document.createElement("section");
    section.className = "edit-section";
    var h = document.createElement("h2");
    h.textContent = "Linkuri social media";
    section.appendChild(h);
    buildInto(section, content.social, "social");
    form.appendChild(section);
  }

  function loadTiktokStatus() {
    var el = $("ttApi");
    if (!el) return;
    el.innerHTML = "<div class=\"edit-section\"><h2>Sincronizare automată (API)</h2><p class=\"muted\">Se încarcă…</p></div>";
    api("GET", "/api/tiktok/status", null, true).then(function (r) { return r.status === 401 ? null : r.json(); })
      .then(function (s) {
        if (!s) { showLogin("Sesiune expirată."); return; }
        var txt, btns;
        if (!s.configured) {
          txt = "⚠️ Neconfigurat — setează secretele TIKTOK_CLIENT_KEY și TIKTOK_CLIENT_SECRET în Worker.";
          btns = "";
        } else if (!s.connected) {
          txt = "Cont neconectat.";
          btns = "<button class=\"btn btn--primary\" id=\"ttConnect\" type=\"button\">🔗 Conectează TikTok</button>";
        } else {
          txt = "✓ Conectat — " + s.videoCount + " clipuri" + (s.syncedAt ? " · sincronizat " + fmtDate(s.syncedAt) : "");
          btns = "<button class=\"btn btn--ghost btn--sm\" id=\"ttSync\" type=\"button\">↻ Sincronizează acum</button> " +
            "<button class=\"btn btn--ghost btn--sm\" id=\"ttDisconnect\" type=\"button\">Deconectează</button>";
        }
        el.innerHTML = "<div class=\"edit-section\"><h2>Sincronizare automată (API)</h2>" +
          "<p class=\"muted\" style=\"margin-bottom:12px\">" + esc(txt) + "</p>" + btns +
          "<p class=\"form-msg\" id=\"ttApiMsg\"></p></div>";
        if ($("ttConnect")) $("ttConnect").addEventListener("click", ttConnect);
        if ($("ttSync")) $("ttSync").addEventListener("click", ttSync);
        if ($("ttDisconnect")) $("ttDisconnect").addEventListener("click", ttDisconnect);
      }).catch(function () { el.innerHTML = "<div class=\"edit-section\"><p class=\"form-msg is-error\">Eroare la status TikTok.</p></div>"; });
  }
  function ttApiMsg(text, err) { var m = $("ttApiMsg"); if (m) { m.textContent = text; m.className = "form-msg" + (err ? " is-error" : " is-ok"); } }
  function ttConnect() {
    api("GET", "/api/tiktok/connect", null, true).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) return ttApiMsg(res.d.error || "Eroare.", true);
        window.location.href = res.d.url;
      });
  }
  function ttSync() {
    ttApiMsg("Se sincronizează…", false);
    api("POST", "/api/tiktok/sync", null, true).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (res.ok) { loadTiktokStatus(); }
        else ttApiMsg(res.d.error || "Eroare la sincronizare.", true);
      });
  }
  function ttDisconnect() {
    if (!confirm("Deconectezi contul TikTok?")) return;
    api("POST", "/api/tiktok/disconnect", null, true).then(function () { loadTiktokStatus(); });
  }
  function handleTiktokReturn() {
    var p = new URLSearchParams(location.search).get("tiktok");
    if (!p) return;
    history.replaceState(null, "", location.pathname);
    var tab = document.querySelector(".tab[data-tab=\"tiktok\"]");
    if (tab) tab.click();
    var m = $("tiktokMsg");
    if (m) {
      if (p === "ok") { m.textContent = "✓ Cont TikTok conectat!"; m.className = "form-msg is-ok"; }
      else { m.textContent = "Conectarea TikTok a eșuat. Încearcă din nou."; m.className = "form-msg is-error"; }
    }
  }

  // reconstruiește tab-ul activ
  function rerender() {
    if ($("tab-banners") && !$("tab-banners").hidden) buildBanners();
    else if ($("tab-products") && !$("tab-products").hidden) buildProducts();
    else if ($("tab-promo") && !$("tab-promo").hidden) buildPromo();
    else if ($("tab-tiktok") && !$("tab-tiktok").hidden) buildTiktok();
    else if ($("tab-social") && !$("tab-social").hidden) buildSocial();
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
    } else if (typeof value === "boolean") {
      parent.appendChild(boolField(label(keyOf(path)), value, path));
    } else if (keyOf(path) === "tipPrag") {
      parent.appendChild(selectField(label("tipPrag"), value, path,
        [["valoare", "După valoarea coșului (RON)"], ["cantitate", "După cantitatea de produse"]]));
    } else if (keyOf(path) === "img" || /^banners\.hero/.test(path)) {
      parent.appendChild(mediaField(value, path, label(keyOf(path))));
    } else {
      field(parent, label(keyOf(path)), scalarInput(value, path));
    }
  }

  function boolField(labelText, value, path) {
    var wrap = document.createElement("label");
    wrap.className = "edit-field edit-field--bool";
    var input = el("input", { type: "checkbox" });
    input.checked = !!value;
    input.addEventListener("change", function () { setPath(content, path, input.checked); });
    var span = document.createElement("span");
    span.textContent = labelText;
    wrap.appendChild(input); wrap.appendChild(span);
    return wrap;
  }
  function selectField(labelText, value, path, options) {
    var wrap = document.createElement("label");
    wrap.className = "edit-field";
    var span = document.createElement("span");
    span.textContent = labelText;
    var sel = document.createElement("select");
    options.forEach(function (o) {
      var opt = document.createElement("option");
      opt.value = o[0]; opt.textContent = o[1];
      if (o[0] === value) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", function () { setPath(content, path, sel.value); });
    wrap.appendChild(span); wrap.appendChild(sel);
    return wrap;
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

  // asigură că produsele au câmp de preț (pentru conținut salvat înainte)
  function normalizeContent(c) {
    if (!c) return;
    if (c.products && Array.isArray(c.products.items)) {
      c.products.items.forEach(function (it) {
        if (it.price == null) it.price = 0;
        if (it.reducere == null) it.reducere = 0;
      });
    }
    var b = c.banners || {};
    c.banners = {
      heroBg: b.heroBg || "", heroLeft: b.heroLeft || "", heroRight: b.heroRight || "",
      veilOpacity: b.veilOpacity != null ? b.veilOpacity : 100,
    };
    var d = c.discount || {};
    c.discount = {
      enabled: !!d.enabled, tipPrag: d.tipPrag || "valoare",
      prag: d.prag != null ? d.prag : 0, procent: d.procent != null ? d.procent : 0,
    };
    var tk = c.tiktok || {};
    c.tiktok = {
      enabled: !!tk.enabled, title: tk.title || "Urmărește-ne pe TikTok",
      profileUrl: tk.profileUrl || "", videos: Array.isArray(tk.videos) ? tk.videos : [],
    };
    var s = c.social || {};
    c.social = {
      facebook: s.facebook || "", instagram: s.instagram || "",
      tiktok: s.tiktok || "", youtube: s.youtube || "",
    };
  }

  function showEditor() {
    loginView.hidden = true; editorView.hidden = false; topActions.hidden = false;
    api("GET", "/api/content").then(function (r) { return r.json(); }).then(function (data) {
      content = data; normalizeContent(content);
      templates = {}; captureTemplates(content, "");
      buildForm();
      handleTiktokReturn();
    });
    refreshMessagesBadge();
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
  $("savePromoBtn").addEventListener("click", function () { save("promoMsg"); });
  $("savePromoBtn2").addEventListener("click", function () { save("promoMsg"); });
  $("saveTiktokBtn").addEventListener("click", function () { save("tiktokMsg"); });
  $("saveTiktokBtn2").addEventListener("click", function () { save("tiktokMsg"); });
  $("saveSocialBtn").addEventListener("click", function () { save("socialMsg"); });
  $("saveSocialBtn2").addEventListener("click", function () { save("socialMsg"); });

  /* ---------- Reset ---------- */
  $("resetBtn").addEventListener("click", function () {
    if (!confirm("Sigur resetezi toate textele la valorile implicite?")) return;
    api("DELETE", "/api/content", null, true).then(function (r) {
      return r.json().then(function (d) { return { ok: r.ok, status: r.status, d: d }; });
    }).then(function (res) {
      if (res.status === 401) { showLogin("Sesiune expirată. Autentifică-te din nou."); return; }
      if (!res.ok) return setMsg("editorMsg", res.d.error || "Eroare.", true);
      content = res.d.content; normalizeContent(content);
      templates = {}; captureTemplates(content, "");
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
      $("tab-promo").hidden = which !== "promo";
      $("tab-tiktok").hidden = which !== "tiktok";
      $("tab-social").hidden = which !== "social";
      $("tab-orders").hidden = which !== "orders";
      $("tab-messages").hidden = which !== "messages";
      $("tab-crm").hidden = which !== "crm";
      if (which === "orders") loadOrders();
      else if (which === "messages") loadMessages();
      else if (which === "products") buildProducts();
      else if (which === "banners") buildBanners();
      else if (which === "promo") buildPromo();
      else if (which === "tiktok") buildTiktok();
      else if (which === "social") buildSocial();
      else if (which === "crm") loadCRM();
      else buildForm();
    });
  });
  $("ordersRefresh").addEventListener("click", loadOrders);
  $("messagesRefresh").addEventListener("click", loadMessages);

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

      // articole comandate
      var itemsHtml = "";
      if (Array.isArray(o.items) && o.items.length) {
        itemsHtml = "<ul class=\"order-items\">" + o.items.map(function (it) {
          var dim = it.type === "dtf" ? " <span class=\"order-meta\">(" + esc(it.width) + "×" + esc(it.length) + " m)</span>" : "";
          var line = (Number(it.price) * Number(it.qty)).toFixed(2);
          return "<li>" + esc(it.qty) + "× " + esc(it.name) + dim +
            " <span class=\"order-meta\">— " + line + " RON</span></li>";
        }).join("") + "</ul>";
      } else if (o.width != null) {
        itemsHtml = "<ul class=\"order-items\"><li>Print DTF " + esc(o.width) + "×" + esc(o.length) + " m</li></ul>";
      }

      // fișiere (mai multe sau unul vechi)
      var files = Array.isArray(o.files) ? o.files : (o.file ? [o.file] : []);
      var filesHtml = files.length ? files.map(function (f, idx) {
        if (f.key) {
          return "<button class=\"btn btn--ghost btn--sm order-dl\" data-id=\"" + esc(o.id) +
            "\" data-i=\"" + idx + "\" data-name=\"" + esc(f.name) + "\">⬇ " + esc(f.name) + "</button>";
        }
        return "<span class=\"order-file-pending\">📎 " + esc(f.name) + "</span>";
      }).join(" ") : "<span class=\"order-meta\">Fără fișiere</span>";

      var contact = [];
      if (o.email) contact.push("✉️ " + esc(o.email));
      if (o.phone) contact.push("📞 " + esc(o.phone));
      var total = o.total != null ? o.total : o.price;
      var discNote = (o.discount && o.discount > 0)
        ? " <span class=\"order-meta\">(−" + esc(o.discountPercent) + "% · −" + esc(o.discount) + " RON)</span>" : "";
      var note = o.note || o.message;
      var delivHtml = "";
      if (o.deliveryMethod === "ridicare") {
        delivHtml = "<p class=\"order-deliv\">🏬 <strong>Ridicare personală</strong></p>";
      } else if (o.deliveryMethod === "livrare" || o.address) {
        delivHtml = "<p class=\"order-deliv\">🚚 <strong>Livrare la adresă</strong>" +
          (o.address ? "<br><span class=\"order-addr\">" + esc(o.address) + "</span>" : "") + "</p>";
      }

      return "<div class=\"order-card\" data-status=\"" + esc(o.status) + "\">" +
        "<div class=\"order-card__top\">" +
          "<div><strong>" + esc(o.name || "Client") + "</strong><div class=\"order-meta\">" + fmtDate(o.createdAt) + "</div></div>" +
          "<select class=\"order-status\" data-id=\"" + esc(o.id) + "\">" + opts + "</select>" +
        "</div>" +
        "<div class=\"order-grid\">" +
          "<span>" + (contact.join(" · ") || "<span class='order-meta'>—</span>") + "</span>" +
          "<span>💰 <strong>" + esc(total) + " RON</strong>" + discNote + "</span>" +
        "</div>" +
        itemsHtml +
        delivHtml +
        (note ? "<p class=\"order-message\">„" + esc(note) + "”</p>" : "") +
        "<div class=\"order-card__foot\"><div class=\"order-files\">" + filesHtml + "</div>" +
          "<button class=\"order-del\" data-id=\"" + esc(o.id) + "\" title=\"Șterge comanda\">🗑</button>" +
        "</div>" +
      "</div>";
    }).join("");

    list.querySelectorAll(".order-status").forEach(function (sel) {
      sel.addEventListener("change", function () { changeStatus(sel.dataset.id, sel.value, sel); });
    });
    list.querySelectorAll(".order-dl").forEach(function (b) {
      b.addEventListener("click", function () { downloadFile(b.dataset.id, b.dataset.i, b.dataset.name); });
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

  function downloadFile(id, i, name) {
    api("GET", "/api/orders/" + id + "/file?i=" + (i || 0), null, true).then(function (r) {
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

  /* ---------- Mesaje contact ---------- */
  var BASE_TITLE = "Admin — MrDTF";
  function updateMessagesBadge(unread) {
    var badge = $("messagesBadge");
    var n = Number(unread) || 0;
    if (badge) { badge.textContent = n; badge.hidden = n === 0; }
    document.title = n > 0 ? "(" + n + ") " + BASE_TITLE : BASE_TITLE;
  }
  function refreshMessagesBadge() {
    api("GET", "/api/messages/count", null, true).then(function (r) {
      return r.status === 401 ? null : r.json();
    }).then(function (d) { if (d) updateMessagesBadge(d.unread); }).catch(function () {});
  }

  function loadMessages() {
    setMsg("messagesMsg", "Se încarcă…", false);
    api("GET", "/api/messages", null, true).then(function (r) {
      if (r.status === 401) { showLogin("Sesiune expirată. Autentifică-te din nou."); return null; }
      return r.json();
    }).then(function (d) {
      if (!d) return;
      renderMessages(d.messages || []);
      updateMessagesBadge(d.unread);
      setMsg("messagesMsg", (d.messages || []).length ? "" : "Niciun mesaj încă.", false);
    }).catch(function () { setMsg("messagesMsg", "Eroare la încărcare.", true); });
  }

  function renderMessages(messages) {
    var list = $("messagesList");
    list.innerHTML = messages.map(function (m) {
      var contact = [];
      if (m.email) contact.push("<a href=\"mailto:" + esc(m.email) + "\">✉️ " + esc(m.email) + "</a>");
      if (m.phone) contact.push("<a href=\"tel:" + esc(m.phone) + "\">📞 " + esc(m.phone) + "</a>");
      var unread = !m.read;
      return "<div class=\"msg-card" + (unread ? " msg-card--unread" : "") + "\">" +
        "<div class=\"order-card__top\">" +
          "<div><strong>" + esc(m.name || "—") + "</strong>" +
            (unread ? " <span class=\"msg-new\">NOU</span>" : "") +
            "<div class=\"order-meta\">" + fmtDate(m.createdAt) + "</div></div>" +
        "</div>" +
        (m.subject ? "<div class=\"order-grid\"><span>📌 <strong>" + esc(m.subject) + "</strong></span></div>" : "") +
        "<div class=\"order-grid\">" + (contact.join(" · ") || "<span class='order-meta'>—</span>") + "</div>" +
        "<p class=\"order-message\">" + esc(m.message).replace(/\n/g, "<br>") + "</p>" +
        "<div class=\"order-card__foot\">" +
          "<button class=\"btn btn--ghost btn--sm msg-read\" data-id=\"" + esc(m.id) + "\" data-read=\"" + (unread ? "1" : "0") + "\">" +
            (unread ? "✓ Marchează citit" : "↩ Marchează necitit") + "</button>" +
          "<button class=\"order-del msg-del\" data-id=\"" + esc(m.id) + "\" title=\"Șterge mesajul\">🗑</button>" +
        "</div>" +
      "</div>";
    }).join("");

    list.querySelectorAll(".msg-read").forEach(function (b) {
      b.addEventListener("click", function () { markMessageRead(b.dataset.id, b.dataset.read === "1"); });
    });
    list.querySelectorAll(".msg-del").forEach(function (b) {
      b.addEventListener("click", function () { deleteMessage(b.dataset.id); });
    });
  }

  function markMessageRead(id, read) {
    api("PATCH", "/api/messages/" + id, { read: read }, true).then(function (r) {
      if (r.status === 401) { showLogin("Sesiune expirată."); return; }
      if (r.ok) loadMessages();
    }).catch(function () { setMsg("messagesMsg", "Eroare de rețea.", true); });
  }

  function deleteMessage(id) {
    if (!confirm("Ștergi definitiv acest mesaj?")) return;
    api("DELETE", "/api/messages/" + id, null, true).then(function (r) {
      if (r.status === 401) { showLogin("Sesiune expirată."); return; }
      if (r.ok) loadMessages();
    });
  }

  /* ---------- CRM ---------- */
  var crmAll = [], crmFiltered = [], crmTagFilter = "", crmDetailTags = [];
  var COMMON_TAGS = ["Client fidel", "En-gros", "VIP", "Nou", "De urmărit"];
  $("crmRefresh").addEventListener("click", loadCRM);
  $("crmSearch").addEventListener("input", applyCustomerFilter);
  $("crmExport").addEventListener("click", exportCSV);
  function money(n) { return (Number(n) || 0).toFixed(2) + " RON"; }

  function loadCRM() {
    setMsg("crmMsg", "Se încarcă…", false);
    closeCustomer();
    Promise.all([
      api("GET", "/api/admin/stats", null, true).then(function (r) { return r.status === 401 ? null : r.json(); }),
      api("GET", "/api/admin/customers", null, true).then(function (r) { return r.status === 401 ? null : r.json(); }),
    ]).then(function (res) {
      if (!res[0] || !res[1]) { showLogin("Sesiune expirată. Autentifică-te din nou."); return; }
      renderStats(res[0]);
      crmAll = res[1].customers || [];
      renderFilters();
      applyCustomerFilter();
      setMsg("crmMsg", "", false);
    }).catch(function () { setMsg("crmMsg", "Eroare la încărcare.", true); });
  }

  function renderFilters() {
    var counts = {};
    crmAll.forEach(function (c) { (c.tags || []).forEach(function (t) { counts[t] = (counts[t] || 0) + 1; }); });
    var keys = Object.keys(counts).sort();
    var el = $("crmFilters");
    if (!keys.length) { el.innerHTML = ""; return; }
    el.innerHTML = "<button type=\"button\" class=\"crm-filter" + (crmTagFilter === "" ? " is-active" : "") + "\" data-tag=\"\">Toți</button>" +
      keys.map(function (t) {
        return "<button type=\"button\" class=\"crm-filter" + (crmTagFilter === t ? " is-active" : "") + "\" data-tag=\"" + esc(t) + "\">" + esc(t) + " (" + counts[t] + ")</button>";
      }).join("");
    el.querySelectorAll(".crm-filter").forEach(function (b) {
      b.addEventListener("click", function () { crmTagFilter = b.dataset.tag; renderFilters(); applyCustomerFilter(); });
    });
  }

  function applyCustomerFilter() {
    var q = ($("crmSearch").value || "").trim().toLowerCase();
    crmFiltered = crmAll.filter(function (c) {
      if (crmTagFilter && (c.tags || []).indexOf(crmTagFilter) < 0) return false;
      if (!q) return true;
      return (c.name || "").toLowerCase().indexOf(q) >= 0 ||
        (c.email || "").toLowerCase().indexOf(q) >= 0 ||
        (c.phone || "").toLowerCase().indexOf(q) >= 0;
    });
    renderCustomers(crmFiltered);
  }

  function exportCSV() {
    var src = crmFiltered.length || $("crmSearch").value || crmTagFilter ? crmFiltered : crmAll;
    var head = ["Nume", "Email", "Telefon", "Comenzi", "Total (RON)", "Ultima comandă", "Etichete"];
    var rows = [head].concat(src.map(function (c) {
      return [c.name || "", c.email || "", c.phone || "", c.orderCount || 0,
        (Number(c.totalSpent) || 0).toFixed(2),
        c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleString("ro-RO") : "",
        (c.tags || []).join(" | ")];
    }));
    var csv = "\uFEFF" + rows.map(function (r) {
      return r.map(function (f) { return "\"" + String(f).replace(/"/g, "\"\"") + "\""; }).join(";");
    }).join("\r\n");
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "clienti-mrdtf.csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function crmCard(ico, label, val) {
    return "<div class=\"crm-card\"><span class=\"crm-card__ico\">" + ico + "</span>" +
      "<div><strong>" + esc(val) + "</strong><em>" + esc(label) + "</em></div></div>";
  }
  function renderStats(s) {
    var chips = Object.keys(s.byStatus || {}).map(function (k) {
      return "<span class=\"crm-chip\" data-status=\"" + esc(k) + "\">" + esc(k) + ": <strong>" + esc(s.byStatus[k]) + "</strong></span>";
    }).join("");
    var cards = crmCard("👥", "Clienți", s.totalCustomers) + crmCard("📦", "Comenzi", s.totalOrders) +
      crmCard("💰", "Venit", money(s.revenue)) + crmCard("🧾", "Produse vândute", s.units || 0);
    var recent = (s.recent || []).map(function (o) {
      return "<div class=\"crm-recent__row\"><span class=\"order-meta\">" + fmtDate(o.createdAt) + "</span>" +
        "<span>" + esc(o.name || o.email || "—") + "</span>" +
        "<span class=\"crm-chip\" data-status=\"" + esc(o.status) + "\">" + esc(o.status) + "</span>" +
        "<strong>" + money(o.total) + "</strong></div>";
    }).join("");
    $("crmStats").innerHTML = "<div class=\"crm-cards\">" + cards + "</div>" +
      (chips ? "<div class=\"crm-status\">" + chips + "</div>" : "") +
      (recent ? "<div class=\"crm-recent\"><h3>Activitate recentă</h3>" + recent + "</div>" : "");
  }

  function renderCustomers(list) {
    if (!list.length) { $("crmCustomers").innerHTML = "<p class=\"order-meta\">Niciun client încă.</p>"; return; }
    $("crmCustomers").innerHTML = list.map(function (c) {
      var tags = (c.tags || []).length
        ? "<span class=\"crm-tags\">" + c.tags.map(function (t) { return "<span class=\"crm-tag\">" + esc(t) + "</span>"; }).join("") + "</span>"
        : "";
      return "<button type=\"button\" class=\"crm-row\" data-email=\"" + esc(c.email) + "\">" +
        "<span class=\"crm-row__main\"><strong>" + esc(c.name || "—") + "</strong>" +
          "<em>" + esc(c.email) + (c.phone ? " · " + esc(c.phone) : "") + "</em>" + tags + "</span>" +
        "<span class=\"crm-row__meta\">" +
          "<span class=\"crm-kv\">" + esc(c.orderCount) + " com.</span>" +
          "<strong>" + money(c.totalSpent) + "</strong>" +
          "<em class=\"order-meta\">" + (c.lastOrderAt ? fmtDate(c.lastOrderAt) : "—") + "</em></span></button>";
    }).join("");
    $("crmCustomers").querySelectorAll(".crm-row[data-email]").forEach(function (b) {
      b.addEventListener("click", function () { openCustomer(b.dataset.email); });
    });
  }

  function openCustomer(email) {
    setMsg("crmMsg", "Se încarcă fișa…", false);
    api("GET", "/api/admin/customers/" + encodeURIComponent(email), null, true).then(function (r) {
      return r.status === 401 ? null : r.json();
    }).then(function (d) {
      if (!d) { showLogin("Sesiune expirată."); return; }
      setMsg("crmMsg", "", false);
      renderDetail(d);
    }).catch(function () { setMsg("crmMsg", "Eroare.", true); });
  }
  function closeCustomer() { var el = $("crmDetail"); if (el) { el.hidden = true; el.innerHTML = ""; } }

  function renderDetail(d) {
    var c = d.customer || {};
    crmDetailTags = (d.tags || []).slice();
    var orders = (d.orders || []).map(function (o) {
      var items = (o.items || []).map(function (it) { return esc(it.qty) + "× " + esc(it.name); }).join(", ");
      return "<div class=\"crm-order\"><div><strong>" + fmtDate(o.createdAt) + "</strong> " +
        "<span class=\"crm-chip\" data-status=\"" + esc(o.status) + "\">" + esc(o.status) + "</span></div>" +
        "<div class=\"order-meta\">" + (items || "—") + "</div>" +
        "<div class=\"crm-order__total\"><strong>" + money(o.total != null ? o.total : o.price) + "</strong></div></div>";
    }).join("") || "<p class=\"order-meta\">Nicio comandă.</p>";
    var sugg = COMMON_TAGS.map(function (t) { return "<button type=\"button\" class=\"crm-tagsugg\" data-t=\"" + esc(t) + "\">+ " + esc(t) + "</button>"; }).join("");
    var el = $("crmDetail");
    el.hidden = false;
    el.innerHTML =
      "<div class=\"crm-detail__head\"><div><h2>" + esc(c.name || "Client") + "</h2>" +
        "<p class=\"order-meta\">" + esc(c.email) + (c.phone ? " · " + esc(c.phone) : "") + "</p></div>" +
        "<button class=\"btn btn--ghost btn--sm\" id=\"crmBack\" type=\"button\">← Înapoi</button></div>" +
      "<div class=\"crm-tagedit\"><span class=\"crm-lbl\">Etichete</span>" +
        "<div class=\"crm-tagedit__chips\" id=\"crmTagChips\"></div>" +
        "<div class=\"crm-tagedit__add\"><input type=\"text\" id=\"crmTagInput\" placeholder=\"Adaugă etichetă\" />" +
          "<button class=\"btn btn--ghost btn--sm\" id=\"crmTagAdd\" type=\"button\">+ Adaugă</button></div>" +
        "<div class=\"crm-tagsugg-row\">" + sugg + "</div></div>" +
      "<label class=\"crm-notes\"><span>Note interne (CRM)</span>" +
        "<textarea id=\"crmNotes\" rows=\"4\" placeholder=\"Observații despre client, preferințe, follow-up…\">" + esc(d.notes || "") + "</textarea></label>" +
      "<div class=\"crm-notes__actions\"><button class=\"btn btn--primary btn--sm\" id=\"crmSave\" type=\"button\">💾 Salvează</button>" +
        "<span class=\"form-msg\" id=\"crmSaveMsg\"></span></div>" +
      "<h3 class=\"crm-h\">Comenzi (" + (d.orders || []).length + ")</h3><div class=\"crm-orders\">" + orders + "</div>";
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    renderTagChips();
    $("crmBack").addEventListener("click", closeCustomer);
    $("crmTagAdd").addEventListener("click", function () { addTag($("crmTagInput").value); $("crmTagInput").value = ""; });
    $("crmTagInput").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); addTag($("crmTagInput").value); $("crmTagInput").value = ""; }
    });
    el.querySelectorAll(".crm-tagsugg").forEach(function (b) { b.addEventListener("click", function () { addTag(b.dataset.t); }); });
    $("crmSave").addEventListener("click", function () { saveCrm(c.email); });
  }

  function renderTagChips() {
    var el = $("crmTagChips");
    el.innerHTML = crmDetailTags.length
      ? crmDetailTags.map(function (t, i) { return "<span class=\"crm-tag crm-tag--rm\" data-i=\"" + i + "\">" + esc(t) + " ✕</span>"; }).join("")
      : "<span class=\"order-meta\">Nicio etichetă</span>";
    el.querySelectorAll(".crm-tag--rm").forEach(function (s) {
      s.addEventListener("click", function () { crmDetailTags.splice(Number(s.dataset.i), 1); renderTagChips(); });
    });
  }
  function addTag(t) {
    t = (t || "").trim();
    if (t && crmDetailTags.indexOf(t) < 0) { crmDetailTags.push(t); renderTagChips(); }
  }
  function saveCrm(email) {
    api("PUT", "/api/admin/customers/" + encodeURIComponent(email) + "/crm", { notes: $("crmNotes").value, tags: crmDetailTags }, true)
      .then(function (r) {
        if (r.status === 401) { showLogin("Sesiune expirată."); return; }
        var m = $("crmSaveMsg");
        if (!r.ok) { m.textContent = "Eroare la salvare."; m.className = "form-msg is-error"; return; }
        m.textContent = "✓ Salvat."; m.className = "form-msg is-ok";
        var cust = crmAll.filter(function (x) { return x.email === email; })[0];
        if (cust) cust.tags = crmDetailTags.slice();
        renderFilters(); applyCustomerFilter();
      });
  }

  /* ---------- Start ---------- */
  if (token) showEditor(); else showLogin();
})();
