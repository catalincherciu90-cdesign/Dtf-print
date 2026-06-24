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
        "</span><div class=\"step__txt\"><h4>" + esc(s.title) + "</h4><p>" + esc(s.sub) +
        "</p></div></div>";
    });

    // Produse
    fill("productGrid", c.products && c.products.items, function (p) {
      var price = Number(p.price) || 0;
      var priceHtml = price ? "<div class=\"product-price\">" + price.toFixed(2) + " RON</div>" : "";
      var btn = price
        ? "<button class=\"btn btn--primary btn--sm add-cart\" data-name=\"" + esc(p.name) +
          "\" data-price=\"" + price + "\" data-img=\"" + esc(p.img) + "\">Adaugă în coș</button>"
        : "";
      return "<article class=\"product\"><div class=\"product__img\"><img src=\"" +
        esc(p.img) + "\" alt=\"" + esc(p.name) + "\" loading=\"lazy\" /></div><h4>" +
        esc(p.name) + "</h4><p>" + esc(p.desc) + "</p>" + priceHtml + btn + "</article>";
    });
    bindAddToCart();

    // Trust badges
    fill("trustWrap", c.trust, function (t) {
      return "<div class=\"trust__item\"><span class=\"trust__ico\">" + esc(t.ico) +
        "</span><div><strong>" + esc(t.title) + "</strong><em>" + esc(t.sub) +
        "</em></div></div>";
    });

    // Bannere hero (fundal complet + poze laterale; cele goale se ascund)
    if (c.banners) {
      setBanner("heroImgBg", c.banners.heroBg);
      setBanner("heroImgLeft", c.banners.heroLeft);
      setBanner("heroImgRight", c.banners.heroRight);
      var veil = document.getElementById("heroVeil");
      if (veil && c.banners.veilOpacity != null) {
        veil.style.opacity = String(Math.max(0, Math.min(100, Number(c.banners.veilOpacity))) / 100);
      }
    }

    // Reducere coș
    discountCfg = c.discount || null;
    renderCart();

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
  function setBanner(id, src) {
    var el = document.getElementById(id);
    if (!el) return;
    if (src) { el.src = src; el.style.display = ""; }
    else { el.removeAttribute("src"); el.style.display = "none"; }
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

  /* ---------- Coș ---------- */
  var CART_KEY = "mrdtf_cart";
  var CUST_KEY = "mrdtf_customer";
  function loadCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; } }
  function saveCart() { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
  var cart = loadCart();

  function cartAdd(line) {
    if (line.type === "product") {
      var ex = cart.find(function (x) { return x.type === "product" && x.name === line.name && x.price === line.price; });
      if (ex) { ex.qty += line.qty; saveCart(); renderCart(); return; }
    }
    cart.push(line); saveCart(); renderCart();
  }
  function cartRemove(i) { cart.splice(i, 1); saveCart(); renderCart(); }
  function cartQty(i, d) { if (cart[i]) { cart[i].qty = Math.max(1, cart[i].qty + d); saveCart(); renderCart(); } }
  function cartTotal() { return cart.reduce(function (s, it) { return s + it.price * it.qty; }, 0); }
  function cartCount() { return cart.reduce(function (s, it) { return s + it.qty; }, 0); }

  var elCart = document.getElementById("cart");
  var elItems = document.getElementById("cartItems");
  var elTotal = document.getElementById("cartTotal");
  var elCount = document.getElementById("cartCount");
  var elFiles = document.getElementById("cartFiles");
  var elCheckout = document.getElementById("cartCheckout");
  var elSummary = document.getElementById("cartSummary");
  var discountCfg = null;

  function computeDiscount(subtotal, qty) {
    if (!discountCfg || !discountCfg.enabled) return { amount: 0, percent: 0 };
    var pct = Number(discountCfg.procent) || 0;
    if (pct <= 0) return { amount: 0, percent: 0 };
    var metric = discountCfg.tipPrag === "cantitate" ? qty : subtotal;
    if (metric >= (Number(discountCfg.prag) || 0)) {
      return { amount: Number((subtotal * pct / 100).toFixed(2)), percent: pct };
    }
    return { amount: 0, percent: 0 };
  }

  function renderCart() {
    var n = cartCount();
    if (elCount) { elCount.textContent = n; elCount.hidden = n === 0; }
    if (!elItems) return;
    if (!cart.length) {
      elItems.innerHTML = "<p class=\"cart__empty\">Coșul tău este gol.</p>";
      if (elCheckout) elCheckout.style.display = "none";
    } else {
      if (elCheckout) elCheckout.style.display = "";
      elItems.innerHTML = cart.map(function (it, i) {
        var sub = it.type === "dtf" ? ("Print " + it.width + "×" + it.length + " m") : "";
        var img = it.img ? "<img src=\"" + esc(it.img) + "\" alt=\"\" />" : "<span class=\"cart-item__ico\">🧾</span>";
        return "<div class=\"cart-item\">" +
          "<div class=\"cart-item__img\">" + img + "</div>" +
          "<div class=\"cart-item__info\"><strong>" + esc(it.name) + "</strong>" +
          (sub ? "<span class=\"cart-item__sub\">" + esc(sub) + "</span>" : "") +
          "<span class=\"cart-item__price\">" + Number(it.price).toFixed(2) + " RON</span></div>" +
          "<div class=\"cart-item__qty\"><button type=\"button\" data-q=\"-1\" data-i=\"" + i + "\">−</button>" +
          "<span>" + it.qty + "</span><button type=\"button\" data-q=\"1\" data-i=\"" + i + "\">+</button></div>" +
          "<button type=\"button\" class=\"cart-item__del\" data-del=\"" + i + "\" aria-label=\"Șterge\">✕</button>" +
          "</div>";
      }).join("");
    }
    var subtotal = cartTotal();
    var disc = computeDiscount(subtotal, cartCount());
    if (elSummary) {
      elSummary.innerHTML = disc.amount > 0
        ? "<div class=\"cart__line\"><span>Subtotal</span><span>" + subtotal.toFixed(2) + " RON</span></div>" +
          "<div class=\"cart__line cart__line--disc\"><span>Reducere (-" + disc.percent + "%)</span><span>-" + disc.amount.toFixed(2) + " RON</span></div>"
        : "";
    }
    if (elTotal) elTotal.textContent = (subtotal - disc.amount).toFixed(2) + " RON";
    if (elFiles) elFiles.hidden = !cart.some(function (it) { return it.type === "dtf"; });
  }

  if (elItems) {
    elItems.addEventListener("click", function (e) {
      var t = e.target;
      if (t.dataset.del != null) cartRemove(Number(t.dataset.del));
      else if (t.dataset.q != null) cartQty(Number(t.dataset.i), Number(t.dataset.q));
    });
  }

  function openCart() { if (elCart) { elCart.hidden = false; document.body.style.overflow = "hidden"; } }
  function closeCart() { if (elCart) { elCart.hidden = true; document.body.style.overflow = ""; } }
  var cartBtn = document.getElementById("cartBtn");
  if (cartBtn) cartBtn.addEventListener("click", openCart);
  var cartCloseBtn = document.getElementById("cartClose");
  if (cartCloseBtn) cartCloseBtn.addEventListener("click", closeCart);
  var cartOverlay = document.getElementById("cartOverlay");
  if (cartOverlay) cartOverlay.addEventListener("click", closeCart);

  function bindAddToCart() {
    var grid = document.getElementById("productGrid");
    if (!grid) return;
    grid.querySelectorAll(".add-cart").forEach(function (b) {
      b.addEventListener("click", function () {
        cartAdd({ type: "product", name: b.dataset.name, price: Number(b.dataset.price), img: b.dataset.img, qty: 1 });
        openCart();
      });
    });
  }

  var dtfAddCart = document.getElementById("dtfAddCart");
  if (dtfAddCart) {
    dtfAddCart.addEventListener("click", function () {
      var w = width ? parseInt(width.value, 10) : 0;
      var l = length ? parseInt(length.value, 10) : 0;
      cartAdd({ type: "dtf", name: "Print DTF la metru", width: w, length: l, price: Number((l * PRICE_PER_METER).toFixed(2)), qty: 1 });
      openCart();
    });
  }

  /* ---------- Checkout ---------- */
  var cartSubmit = document.getElementById("cartSubmit");
  var cartMsg = document.getElementById("cartMsg");
  var cartNote = document.getElementById("cartNote");
  var cartFileInput = document.getElementById("cartFileInput");
  function setCartMsg(t, e) { if (cartMsg) { cartMsg.textContent = t; cartMsg.className = "order-msg" + (e ? " is-error" : " is-ok"); } }

  if (cartSubmit) {
    cartSubmit.addEventListener("click", function () {
      if (!cart.length) return setCartMsg("Coșul este gol.", true);
      var token = localStorage.getItem(CUST_KEY);
      if (!token) {
        setCartMsg("Trebuie să ai cont. Te ducem spre autentificare…", true);
        setTimeout(function () { window.location.href = "/cont"; }, 1300);
        return;
      }
      var fd = new FormData();
      fd.append("items", JSON.stringify(cart));
      fd.append("note", cartNote ? cartNote.value : "");
      if (cartFileInput && cartFileInput.files) {
        for (var i = 0; i < cartFileInput.files.length; i++) {
          if (cartFileInput.files[i].size > 20 * 1024 * 1024) return setCartMsg("Un fișier depășește 20 MB.", true);
          fd.append("file", cartFileInput.files[i]);
        }
      }
      cartSubmit.disabled = true;
      setCartMsg("Se trimite comanda…", false);
      fetch("/api/orders", { method: "POST", headers: { Authorization: "Bearer " + token }, body: fd })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, status: r.status, d: d }; }); })
        .then(function (res) {
          cartSubmit.disabled = false;
          if (res.status === 401) {
            setCartMsg("Sesiune expirată. Te ducem spre autentificare…", true);
            setTimeout(function () { window.location.href = "/cont"; }, 1300);
            return;
          }
          if (!res.ok) return setCartMsg(res.d.error || "Eroare la trimitere.", true);
          cart = []; saveCart(); renderCart();
          setCartMsg("✓ Comanda a fost trimisă! O găsești în contul tău.", false);
        })
        .catch(function () { cartSubmit.disabled = false; setCartMsg("Eroare de rețea.", true); });
    });
  }

  renderCart();

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
