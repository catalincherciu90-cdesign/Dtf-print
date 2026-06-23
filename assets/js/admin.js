/* ===========================================================
   MrDTF — Panou admin (CMS) pentru pagina principală
   =========================================================== */
(function () {
  "use strict";

  var TOKEN_KEY = "mrdtf_token";
  var token = localStorage.getItem(TOKEN_KEY) || "";
  var content = null;

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
    products: "Secțiunea Produse", items: "Produse", img: "Cale imagine", name: "Nume",
    trust: "Garanții (jos)",
    footer: "Footer", tagline: "Descriere footer", phone: "Telefon", email: "Email",
    schedule: "Program", copyright: "Text copyright",
  };
  function label(key) {
    return LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1");
  }

  /* ---------- Construire formular ---------- */
  function buildForm(data) {
    var form = $("form");
    form.innerHTML = "";
    Object.keys(data).forEach(function (key) {
      var section = document.createElement("section");
      section.className = "edit-section";
      var h = document.createElement("h2");
      h.textContent = label(key);
      section.appendChild(h);
      buildInto(section, data[key], key);
      form.appendChild(section);
    });
  }

  function buildInto(parent, value, path) {
    if (Array.isArray(value)) {
      if (value.length && typeof value[0] === "object") {
        value.forEach(function (item, i) {
          var card = document.createElement("div");
          card.className = "edit-card";
          var t = document.createElement("h4");
          t.textContent = (item.title || item.name || "Element") + " " + (i + 1);
          card.appendChild(t);
          buildInto(card, item, path + "." + i);
          parent.appendChild(card);
        });
      } else {
        field(parent, label(keyOf(path)), textarea(value.join("\n"), path, "lines"));
      }
    } else if (value && typeof value === "object") {
      Object.keys(value).forEach(function (k) {
        buildInto(parent, value[k], path + "." + k);
      });
    } else {
      var key = keyOf(path);
      var input;
      if (typeof value === "number") {
        input = el("input", { type: "number", step: "any", value: value });
      } else if (String(value).length > 70) {
        input = textarea(value, path);
      } else {
        input = el("input", { type: "text", value: value == null ? "" : value });
      }
      input.dataset.path = path;
      field(parent, label(key), input);
    }
  }

  function keyOf(path) { return path.split(".").pop(); }
  function el(tag, attrs) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function textarea(val, path, kind) {
    var t = document.createElement("textarea");
    t.value = val;
    t.rows = kind === "lines" ? Math.max(2, String(val).split("\n").length) : 2;
    t.dataset.path = path;
    if (kind) t.dataset.kind = kind;
    return t;
  }
  function field(parent, labelText, input) {
    var wrap = document.createElement("label");
    wrap.className = "edit-field";
    var span = document.createElement("span");
    span.textContent = labelText;
    wrap.appendChild(span);
    wrap.appendChild(input);
    parent.appendChild(wrap);
  }

  /* ---------- Citire valori → obiect ---------- */
  function collect(base) {
    var out = JSON.parse(JSON.stringify(base));
    document.querySelectorAll("[data-path]").forEach(function (input) {
      var path = input.dataset.path;
      var val;
      if (input.dataset.kind === "lines") {
        val = input.value.split("\n").map(function (s) { return s.trim(); })
          .filter(function (s) { return s.length; });
      } else if (input.type === "number") {
        val = input.value === "" ? 0 : Number(input.value);
      } else {
        val = input.value;
      }
      setPath(out, path, val);
    });
    return out;
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
    loginView.hidden = true;
    editorView.hidden = false;
    topActions.hidden = false;
    api("GET", "/api/content").then(function (r) { return r.json(); }).then(function (data) {
      content = data;
      buildForm(content);
    });
  }
  function showLogin(msg) {
    editorView.hidden = true;
    topActions.hidden = true;
    loginView.hidden = false;
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
      token = res.d.token;
      localStorage.setItem(TOKEN_KEY, token);
      showEditor();
    }).catch(function () { setMsg("loginMsg", "Eroare de rețea.", true); });
  });

  $("logoutBtn").addEventListener("click", function () {
    localStorage.removeItem(TOKEN_KEY); token = "";
    showLogin();
  });

  /* ---------- Salvare ---------- */
  function save() {
    var data = collect(content);
    setMsg("editorMsg", "Se salvează…", false);
    api("PUT", "/api/content", data, true).then(function (r) {
      return r.json().then(function (d) { return { ok: r.ok, status: r.status, d: d }; });
    }).then(function (res) {
      if (res.status === 401) { showLogin("Sesiune expirată. Autentifică-te din nou."); return; }
      if (!res.ok) return setMsg("editorMsg", res.d.error || "Eroare la salvare.", true);
      content = data;
      setMsg("editorMsg", "✓ Salvat! Schimbările sunt live pe site.", false);
    }).catch(function () { setMsg("editorMsg", "Eroare de rețea.", true); });
  }
  $("saveBtn").addEventListener("click", save);
  $("saveBtn2").addEventListener("click", save);

  /* ---------- Reset ---------- */
  $("resetBtn").addEventListener("click", function () {
    if (!confirm("Sigur resetezi toate textele la valorile implicite?")) return;
    api("DELETE", "/api/content", null, true).then(function (r) {
      return r.json().then(function (d) { return { ok: r.ok, status: r.status, d: d }; });
    }).then(function (res) {
      if (res.status === 401) { showLogin("Sesiune expirată. Autentifică-te din nou."); return; }
      if (!res.ok) return setMsg("editorMsg", res.d.error || "Eroare.", true);
      content = res.d.content;
      buildForm(content);
      setMsg("editorMsg", "✓ Resetat la valorile implicite.", false);
    });
  });

  /* ---------- Start ---------- */
  if (token) showEditor(); else showLogin();
})();
