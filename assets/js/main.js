/* ===========================================================
   MrDTF — Home page logic
   - încarcă conținutul editabil din /api/content (CMS)
   - calculator preț, upload design, meniu mobil
   =========================================================== */
(function () {
  "use strict";

  /* Valori implicite pentru calculator (suprascrise de conținutul din CMS). */
  var PRICE_PER_METER = 25;
  var MAX_WIDTH = 60;

  /* ---------- Helpers ---------- */
  function get(obj, path) {
    return path.split(".").reduce(function (o, k) {
      return o == null ? undefined : o[k];
    }, obj);
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---------- Randare conținut ---------- */
  function render(c) {
    if (!c) return;

    // câmpuri text simple cu data-edit="cale.din.obiect"
    document.querySelectorAll("[data-edit]").forEach(function (el) {
      var v = get(c, el.getAttribute("data-edit"));
      if (v != null) el.textContent = v;
    });

    // Hero — titlu & subtitlu (cu accent colorat)
    if (c.hero) {
      var t = document.getElementById("heroTitle");
      if (t) t.innerHTML = esc(c.hero.line1) + " <span class=\"grad-text\">" +
        esc(c.hero.hi) + "</span><br />" + esc(c.hero.line2);
      var s = document.getElementById("heroSub");
      if (s) s.innerHTML = esc(c.hero.subPre) + " <span class=\"grad-text\">" +
        esc(c.hero.subHi) + "</span>";
      listLi("heroStats", c.hero.stats);
      listLi("heroChecks", c.hero.checks);
    }

    // Pills hero
    fill("heroPills", c.pills, function (p) {
      return "<li class=\"pill\"><span class=\"pill__ico\">" + esc(p.ico) +
        "</span><span><strong>" + esc(p.title) + "</strong><em>" + esc(p.sub) +
        "</em></span></li>";
    });

    // Listă bife comandă
    listLi("orderChecklist", c.order && c.order.checklist);

    // Calculator
    if (c.order) {
      if (c.order.pricePerMeter != null) PRICE_PER_METER = Number(c.order.pricePerMeter);
      if (c.order.maxWidth != null) {
        MAX_WIDTH = Number(c.order.maxWidth);
        var w = document.getElementById("width");
        if (w) {
          w.max = MAX_WIDTH;
          if (Number(w.value) > MAX_WIDTH) w.value = MAX_WIDTH;
        }
      }
      recalc();
    }

    // Pași
    fill("stepsWrap", c.steps, function (s) {
      return "<div class=\"step\"><span class=\"step__ico\">" + esc(s.ico) +
        "</span><h4>" + esc(s.title) + "</h4><p>" + esc(s.sub) + "</p></div>";
    });

    // Produse
    fill("productGrid", c.products && c.products.items, function (p) {
      return "<article class=\"product\"><div class=\"product__img\"><img src=\"" +
        esc(p.img) + "\" alt=\"" + esc(p.name) + "\" loading=\"lazy\" /></div><h4>" +
        esc(p.name) + "</h4><p>" + esc(p.desc) + "</p>" +
        "<a href=\"#contact\" class=\"product__arrow\" aria-label=\"" + esc(p.name) +
        "\">→</a></article>";
    });

    // Trust badges
    fill("trustWrap", c.trust, function (t) {
      return "<div class=\"trust__item\"><span class=\"trust__ico\">" + esc(t.ico) +
        "</span><div><strong>" + esc(t.title) + "</strong><em>" + esc(t.sub) +
        "</em></div></div>";
    });

    // Contact (text + href)
    if (c.footer) {
      setContact("footerPhone", c.footer.phone, "tel:");
      setContact("footerEmail", c.footer.email, "mailto:");
      var sch = document.getElementById("footerSchedule");
      if (sch && c.footer.schedule) sch.textContent = "🕘 " + c.footer.schedule;
    }
  }

  function listLi(id, arr) {
    var el = document.getElementById(id);
    if (el && Array.isArray(arr)) el.innerHTML = arr.map(function (x) {
      return "<li>" + esc(x) + "</li>";
    }).join("");
  }
  function fill(id, arr, tpl) {
    var el = document.getElementById(id);
    if (el && Array.isArray(arr)) el.innerHTML = arr.map(tpl).join("");
  }
  function setContact(id, val, scheme) {
    var el = document.getElementById(id);
    if (!el || !val) return;
    var icon = scheme === "tel:" ? "📞 " : "✉️ ";
    el.textContent = icon + val;
    el.href = scheme + (scheme === "tel:" ? val.replace(/\s/g, "") : val);
  }

  /* ---------- Calculator ---------- */
  var width = document.getElementById("width");
  var length = document.getElementById("length");
  var widthOut = document.getElementById("widthOut");
  var lengthOut = document.getElementById("lengthOut");
  var priceEl = document.getElementById("price");

  function recalc() {
    if (!width || !length) return;
    var w = parseInt(width.value, 10);
    var l = parseInt(length.value, 10);
    widthOut.textContent = w + " cm";
    lengthOut.textContent = l + " m";
    priceEl.textContent = (l * PRICE_PER_METER).toFixed(2) + " RON";
  }

  if (width && length) {
    width.addEventListener("input", recalc);
    length.addEventListener("input", recalc);
    recalc();
  }

  /* ---------- Upload design ---------- */
  var uploadBtn = document.getElementById("uploadBtn");
  var fileInput = document.getElementById("fileInput");
  var fileNote = document.getElementById("fileNote");
  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () {
      if (fileInput.files && fileInput.files.length) {
        var f = fileInput.files[0];
        var mb = (f.size / (1024 * 1024)).toFixed(2);
        fileNote.textContent = "✓ " + f.name + " (" + mb + " MB) — gata de trimis";
        fileNote.style.color = "#6fe0ff";
      }
    });
  }

  /* ---------- Trimitere comandă ---------- */
  var orderForm = document.getElementById("calc");
  var orderMsg = document.getElementById("orderMsg");
  var orderSubmit = document.getElementById("orderSubmit");

  function setOrderMsg(t, isErr) {
    if (!orderMsg) return;
    orderMsg.textContent = t;
    orderMsg.className = "order-msg" + (isErr ? " is-error" : " is-ok");
  }

  if (orderForm) {
    orderForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = (document.getElementById("ordName").value || "").trim();
      var phone = (document.getElementById("ordPhone").value || "").trim();
      var email = (document.getElementById("ordEmail").value || "").trim();
      if (!name) return setOrderMsg("Te rugăm completează numele.", true);
      if (!phone && !email) return setOrderMsg("Adaugă un telefon sau un email.", true);

      var fd = new FormData();
      fd.append("name", name);
      fd.append("phone", phone);
      fd.append("email", email);
      fd.append("message", document.getElementById("ordMessage").value || "");
      fd.append("width", width ? width.value : "");
      fd.append("length", length ? length.value : "");
      if (fileInput && fileInput.files && fileInput.files.length) {
        var fobj = fileInput.files[0];
        if (fobj.size > 20 * 1024 * 1024) {
          return setOrderMsg("Fișierul e prea mare (max 20 MB). Trimite-l separat pe email.", true);
        }
        fd.append("file", fobj);
      }

      orderSubmit.disabled = true;
      setOrderMsg("Se trimite comanda…", false);
      fetch("/api/orders", { method: "POST", body: fd })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          orderSubmit.disabled = false;
          if (!res.ok) return setOrderMsg(res.d.error || "Eroare la trimitere.", true);
          setOrderMsg("✓ Comanda a fost trimisă! Te contactăm în curând.", false);
          orderForm.reset();
          recalc();
          if (fileNote) fileNote.style.color = "";
        })
        .catch(function () {
          orderSubmit.disabled = false;
          setOrderMsg("Eroare de rețea. Încearcă din nou.", true);
        });
    });
  }

  /* ---------- Meniu mobil ---------- */
  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Încarcă conținutul din CMS ---------- */
  fetch("/api/content", { headers: { Accept: "application/json" } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) { if (data) render(data); })
    .catch(function () { /* offline / fără API — rămân valorile din HTML */ });
})();
