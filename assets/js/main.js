/* ===========================================================
   MrDTF — Home page logic
   - încarcă conținutul editabil din /api/content (CMS)
   - calculator preț, upload design, meniu mobil
   =========================================================== */
(function () {
  "use strict";

  /* Valori implicite pentru calculator (suprascrise de conținutul din CMS). */
  var PRICE_PER_METER = 25;
  var PRICE_TIERS = []; // praguri cantitate: [{ dela, pretMl }] sortate crescător
  var PRINT_WIDTH = 90; // lățime print fixă (cm)

  /* Prețul pe metru aplicabil pentru o lungime dată, în funcție de praguri.
     Sub primul prag se folosește PRICE_PER_METER (preț de bază). */
  function pricePerM(len) {
    var p = PRICE_PER_METER;
    for (var i = 0; i < PRICE_TIERS.length; i++) {
      var t = PRICE_TIERS[i];
      if (len >= t.dela && t.pretMl > 0) p = t.pretMl;
    }
    return p;
  }

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
  /* Normalizează o cale relativă „assets/..." la absolută, ca să meargă
     și pe paginile din subdirectoare (ex. /produse). URL-urile absolute
     (http..., /...) rămân neschimbate. */
  function absUrl(u) {
    u = String(u == null ? "" : u);
    return /^(https?:|\/|data:)/.test(u) ? u : "/" + u;
  }
  /* Slug pentru URL-uri de produs (ex. „Genți" -> „genti"). */
  function slugify(s) {
    return String(s == null ? "" : s).toLowerCase()
      .replace(/ă/g, "a").replace(/â/g, "a").replace(/î/g, "i").replace(/ș/g, "s").replace(/ş/g, "s").replace(/ț/g, "t").replace(/ţ/g, "t")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  /* Iconiță SVG dintr-un nume sau emoji; revine la text dacă nu există setul. */
  function ico(val, size) {
    if (window.MrIcons) return window.MrIcons.iconOrText(val, { size: size || 22 });
    return "<span class=\"mr-emoji\">" + esc(val) + "</span>";
  }
  /* Desparte un text de forma „<emoji/nume> restul" în iconiță + restul. */
  function iconLead(str, size) {
    str = String(str == null ? "" : str);
    var sp = str.indexOf(" ");
    var head = sp >= 0 ? str.slice(0, sp) : str;
    var rest = sp >= 0 ? str.slice(sp + 1) : "";
    if (window.MrIcons && window.MrIcons.resolve(head)) {
      return "<span class=\"mr-ico\">" + window.MrIcons.svg(window.MrIcons.resolve(head), { size: size || 18 }) +
        "</span> " + esc(rest);
    }
    return esc(str);
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
      fillLi("heroStats", c.hero.stats, function (x) { return iconLead(x, 18); });
      listLi("heroChecks", c.hero.checks);
    }

    // Pills hero
    fill("heroPills", c.pills, function (p) {
      return "<li class=\"pill\"><span class=\"pill__ico\">" + ico(p.ico, 20) +
        "</span><span><strong>" + esc(p.title) + "</strong><em>" + esc(p.sub) +
        "</em></span></li>";
    });

    // Listă bife comandă
    listLi("orderChecklist", c.order && c.order.checklist);

    // Calculator
    if (c.order) {
      if (c.order.pricePerMeter != null) PRICE_PER_METER = Number(c.order.pricePerMeter);
      if (Array.isArray(c.order.priceTiers)) {
        PRICE_TIERS = c.order.priceTiers
          .map(function (t) { return { dela: Number(t.dela) || 0, pretMl: Number(t.pretMl) || 0 }; })
          .filter(function (t) { return t.dela > 0 && t.pretMl > 0; })
          .sort(function (a, b) { return a.dela - b.dela; });
      }
      if (c.order.printWidth != null) PRINT_WIDTH = Number(c.order.printWidth);
      var wf = document.getElementById("widthFixed");
      if (wf) wf.textContent = PRINT_WIDTH + " cm";
      recalc();
    }

    // Pași
    fill("stepsWrap", c.steps, function (s) {
      return "<div class=\"step\"><span class=\"step__ico\">" + ico(s.ico, 24) +
        "</span><div class=\"step__txt\"><h4>" + esc(s.title) + "</h4><p>" + esc(s.sub) +
        "</p></div></div>";
    });

    // Produse — sar peste produsele fără nume (evită carduri/linkuri goale -> /produs/)
    var prodItems = ((c.products && c.products.items) || []).filter(function (p) { return p && String(p.name || "").trim(); });
    fill("productGrid", prodItems, function (p) {
      var price = Number(p.price) || 0;
      var red = Math.max(0, Math.min(100, Number(p.reducere) || 0));
      var fin = red > 0 ? Number((price * (1 - red / 100)).toFixed(2)) : price;
      var priceHtml = price
        ? (red > 0
            ? "<div class=\"product-price\"><span class=\"product-price__old\">" + price.toFixed(2) + " RON</span>" + fin.toFixed(2) + " RON</div>"
            : "<div class=\"product-price\">" + price.toFixed(2) + " RON</div>")
        : "";
      var badge = red > 0 ? "<span class=\"product-badge\">-" + red + "%</span>" : "";
      var imgUrl = absUrl(p.img);
      var btn = price
        ? "<button class=\"btn btn--primary btn--sm add-cart\" data-name=\"" + esc(p.name) +
          "\" data-price=\"" + fin + "\" data-img=\"" + esc(imgUrl) + "\">Adaugă în coș</button>"
        : "";
      var slug = slugify(p.cod || p.name);
      return "<article class=\"product\">" + badge +
        "<a class=\"product__link\" href=\"/produs/" + slug + "\">" +
        "<div class=\"product__img\"><img src=\"" + esc(imgUrl) + "\" alt=\"" + esc(p.name) + "\" loading=\"lazy\" /></div>" +
        "<h4>" + esc(p.name) + "</h4><p>" + esc(p.desc) + "</p></a>" +
        priceHtml + btn +
        "<a class=\"product__detail\" href=\"/produs/" + slug + "\">Vezi produsul →</a>" +
        "</article>";
    });
    bindAddToCart();

    // Trust badges
    fill("trustWrap", c.trust, function (t) {
      return "<div class=\"trust__item\"><span class=\"trust__ico\">" + ico(t.ico, 24) +
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
      // Banner pagina Produse Blank (elementele există doar pe /produse)
      setBanner("produseBanner", absUrl(c.banners.produseBg || "assets/img/hero-prints.jpg"));
      var pVeil = document.getElementById("produseVeil");
      if (pVeil && c.banners.produseVeilOpacity != null) {
        pVeil.style.opacity = String(Math.max(0, Math.min(100, Number(c.banners.produseVeilOpacity))) / 100);
      }
    }

    // Reducere coș
    discountCfg = c.discount || null;
    renderCart();

    // TikTok
    renderTikTok(c.tiktok);

    // Contact (text + href)
    if (c.footer) {
      setContact("footerPhone", c.footer.phone, "tel:");
      setContact("footerEmail", c.footer.email, "mailto:");
      var sch = document.getElementById("footerSchedule");
      if (sch && c.footer.schedule) {
        var schTxt = sch.querySelector(".footer__contact-txt");
        if (schTxt) schTxt.textContent = c.footer.schedule; else sch.textContent = c.footer.schedule;
      }
      // Secțiunea Contact (lista de info — doar textul, iconița e separată)
      var cp = document.getElementById("contactPhone");
      if (cp && c.footer.phone) cp.textContent = c.footer.phone;
      var ce = document.getElementById("contactEmail");
      if (ce && c.footer.email) ce.textContent = c.footer.email;
      var cs = document.getElementById("contactSchedule");
      if (cs && c.footer.schedule) cs.textContent = c.footer.schedule;
    }

    // Social media (footer)
    if (c.social) {
      setSocial("socialFacebook", c.social.facebook);
      setSocial("socialInstagram", c.social.instagram);
      setSocial("socialTiktok", c.social.tiktok);
      setSocial("socialYoutube", c.social.youtube);
    }
  }

  function setSocial(id, url) {
    var el = document.getElementById(id);
    if (!el) return;
    url = (url || "").trim();
    if (url) {
      el.href = url; el.hidden = false;
      var lbl = el.getAttribute("data-label");
      if (lbl) el.setAttribute("aria-label", lbl);
    } else {
      // fără href => rol generic; aria-label nu e permis, deci îl scoatem
      el.removeAttribute("href"); el.hidden = true;
      el.removeAttribute("aria-label");
    }
  }

  function listLi(id, arr) {
    var el = document.getElementById(id);
    if (el && Array.isArray(arr)) el.innerHTML = arr.map(function (x) {
      return "<li>" + esc(x) + "</li>";
    }).join("");
  }
  function fillLi(id, arr, tpl) {
    var el = document.getElementById(id);
    if (el && Array.isArray(arr)) el.innerHTML = arr.map(function (x) {
      return "<li>" + tpl(x) + "</li>";
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

  /* ---------- TikTok ---------- */
  function renderTikTok(tk) {
    var sec = document.getElementById("tiktok");
    if (!sec) return;
    if (!tk || !tk.enabled) { sec.hidden = true; return; }
    var manual = (Array.isArray(tk.videos) ? tk.videos : []).map(String).filter(function (u) { return u.trim(); });
    fetch("/api/tiktok/videos").then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var apiVids = (d && d.videos) ? d.videos.map(function (v) { return v.url; }).filter(Boolean) : [];
        showTikTok(tk, apiVids.length ? apiVids : manual);
      })
      .catch(function () { showTikTok(tk, manual); });
  }
  function showTikTok(tk, vids) {
    var sec = document.getElementById("tiktok");
    if (!vids.length) { sec.hidden = true; return; }
    sec.hidden = false;
    var t = document.getElementById("tiktokTitle");
    if (t) t.textContent = tk.title || "TikTok";
    var link = document.getElementById("tiktokProfile");
    if (link) {
      if (tk.profileUrl) { link.href = tk.profileUrl; link.hidden = false; } else link.hidden = true;
    }
    document.getElementById("tiktokGrid").innerHTML = vids.map(function (url) {
      url = String(url).trim();
      var id = (url.match(/\/video\/(\d+)/) || [])[1] || (url.match(/(\d{6,})/) || [])[1] || "";
      return "<blockquote class=\"tiktok-embed\" cite=\"" + esc(url) + "\"" +
        (id ? " data-video-id=\"" + esc(id) + "\"" : "") +
        " style=\"max-width:325px;min-width:280px;margin:0;\"><section></section></blockquote>";
    }).join("");
    loadTikTokScript();
  }
  function loadTikTokScript() {
    var old = document.getElementById("tiktok-embed-js");
    if (old) old.remove();
    var s = document.createElement("script");
    s.id = "tiktok-embed-js";
    s.async = true;
    s.src = "https://www.tiktok.com/embed.js";
    document.body.appendChild(s);
  }
  function setContact(id, val, scheme) {
    var el = document.getElementById(id);
    if (!el || !val) return;
    var txt = el.querySelector(".footer__contact-txt");
    if (txt) txt.textContent = val; else el.textContent = val;
    el.href = scheme + (scheme === "tel:" ? val.replace(/\s/g, "") : val);
  }

  /* ---------- Calculator (lățime fixă, doar lungimea se alege) ---------- */
  var length = document.getElementById("length");
  var lengthOut = document.getElementById("lengthOut");
  var priceEl = document.getElementById("price");
  var unitEl = document.getElementById("calcUnit");

  function recalc() {
    if (!length) return;
    var l = parseInt(length.value, 10);
    var pm = pricePerM(l);
    lengthOut.textContent = l + " m";
    priceEl.textContent = (l * pm).toFixed(2) + " RON";
    if (unitEl) {
      unitEl.textContent = pm < PRICE_PER_METER
        ? l + " m × " + pm.toFixed(2) + " RON/ml (preț redus la cantitate)"
        : l + " m × " + pm.toFixed(2) + " RON/ml";
    }
  }

  if (length) {
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
    // unim doar produsele identice FĂRĂ design (cu design fiecare e unic)
    if (line.type === "product" && !line.design) {
      var ex = cart.find(function (x) {
        return x.type === "product" && !x.design
          && (x.cod || x.name) === (line.cod || line.name)
          && (x.marime || "") === (line.marime || "") && x.price === line.price;
      });
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
  var elCheckoutBtn = document.getElementById("cartCheckoutBtn");
  var elBack = document.getElementById("cartBack");
  var elSummary = document.getElementById("cartSummary");
  var discountCfg = null;
  var checkoutStep = 1; // 1 = vezi coșul, 2 = livrare + finalizare

  // Pas 1: doar produsele + buton „Finalizează". Pas 2: livrare/adresă/trimite.
  function setCheckoutStep(s) {
    checkoutStep = s;
    var hasItems = cart.length > 0;
    if (elCheckoutBtn) elCheckoutBtn.style.display = (s === 1 && hasItems) ? "" : "none";
    if (elCheckout) elCheckout.hidden = !(s === 2 && hasItems);
  }

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
      setCheckoutStep(1);
    } else {
      setCheckoutStep(checkoutStep);
      elItems.innerHTML = cart.map(function (it, i) {
        var sub = "";
        if (it.type === "dtf") {
          sub = "Print lățime " + it.width + " cm × " + it.length + " m";
        } else {
          var sp = [];
          if (it.marime) sp.push("Mărime: " + it.marime);
          if (it.design) sp.push("design atașat");
          sub = sp.join(" · ");
        }
        var img = it.img ? "<img src=\"" + esc(absUrl(it.img)) + "\" alt=\"\" />" : "<span class=\"cart-item__ico\">" + ico("receipt", 22) + "</span>";
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

  function openCart() { if (elCart) { elCart.hidden = false; document.body.style.overflow = "hidden"; setCheckoutStep(1); } }
  function closeCart() { if (elCart) { elCart.hidden = true; document.body.style.overflow = ""; } }
  if (elCheckoutBtn) elCheckoutBtn.addEventListener("click", function () { if (cart.length) { setCheckoutStep(2); if (elCheckout) elCheckout.scrollIntoView({ behavior: "smooth", block: "nearest" }); } });
  if (elBack) elBack.addEventListener("click", function () { setCheckoutStep(1); });
  // API minimal pentru alte pagini (ex. pagina de produs) — adaugă în coș + deschide
  window.MrCart = { add: function (line) { cartAdd(line); }, open: openCart };
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
      var l = length ? parseInt(length.value, 10) : 0;
      cartAdd({ type: "dtf", name: "Print DTF la metru", width: PRINT_WIDTH, length: l, price: Number((l * pricePerM(l)).toFixed(2)), qty: 1 });
      openCart();
    });
  }

  /* ---------- Checkout ---------- */
  var cartSubmit = document.getElementById("cartSubmit");
  var cartMsg = document.getElementById("cartMsg");
  var cartNote = document.getElementById("cartNote");
  var cartFileInput = document.getElementById("cartFileInput");
  var cartAddr = document.getElementById("cartAddr");
  var cartAddress = document.getElementById("cartAddress");
  function setCartMsg(t, e) { if (cartMsg) { cartMsg.textContent = t; cartMsg.className = "order-msg" + (e ? " is-error" : " is-ok"); } }

  function delivMethod() {
    var r = document.querySelector('input[name="deliv"]:checked');
    return r ? r.value : "livrare";
  }
  function syncDeliv() {
    if (cartAddr) cartAddr.hidden = delivMethod() !== "livrare";
  }
  document.querySelectorAll('input[name="deliv"]').forEach(function (r) {
    r.addEventListener("change", syncDeliv);
  });
  syncDeliv();

  if (cartSubmit) {
    cartSubmit.addEventListener("click", function () {
      if (!cart.length) return setCartMsg("Coșul este gol.", true);
      var cartConsent = document.getElementById("cartConsent");
      if (cartConsent && !cartConsent.checked) {
        return setCartMsg("Bifează acordul privind prelucrarea datelor pentru a continua.", true);
      }
      var token = localStorage.getItem(CUST_KEY);
      if (!token) {
        setCartMsg("Trebuie să ai cont. Te ducem spre autentificare…", true);
        setTimeout(function () { window.location.href = "/cont"; }, 1300);
        return;
      }
      var deliv = delivMethod();
      var address = cartAddress ? cartAddress.value.trim() : "";
      if (deliv === "livrare" && !address) {
        return setCartMsg("Completează adresa de livrare sau alege „Ridic personal”.", true);
      }
      var fd = new FormData();
      fd.append("items", JSON.stringify(cart));
      fd.append("deliveryMethod", deliv);
      fd.append("address", deliv === "livrare" ? address : "");
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
          var delivTxt = deliv === "ridicare"
            ? "Ridici personal comanda."
            : "Livrare la: " + address;
          cart = []; saveCart(); renderCart();
          setCartMsg("✓ Comanda a fost trimisă! " + delivTxt + " O găsești în contul tău.", false);
        })
        .catch(function () { cartSubmit.disabled = false; setCartMsg("Eroare de rețea.", true); });
    });
  }

  renderCart();

  /* ---------- Formular contact ---------- */
  var contactForm = document.getElementById("contactForm");
  var contactMsg = document.getElementById("contactMsg");
  function setContactMsg(t, e) {
    if (contactMsg) { contactMsg.textContent = t; contactMsg.className = "order-msg" + (e ? " is-error" : " is-ok"); }
  }
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = (document.getElementById("contactName").value || "").trim();
      var email = (document.getElementById("contactFormEmail").value || "").trim();
      var message = (document.getElementById("contactMessage").value || "").trim();
      if (!name || !email || !message) {
        return setContactMsg("Completează numele, emailul și mesajul.", true);
      }
      var consent = document.getElementById("contactConsent");
      if (consent && !consent.checked) {
        return setContactMsg("Bifează acordul privind prelucrarea datelor pentru a continua.", true);
      }
      var btn = document.getElementById("contactSubmit");
      var body = {
        name: name, email: email, message: message,
        phone: (document.getElementById("contactFormPhone").value || "").trim(),
        subject: (document.getElementById("contactSubject").value || "").trim(),
      };
      if (btn) btn.disabled = true;
      setContactMsg("Se trimite mesajul…", false);
      fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (btn) btn.disabled = false;
          if (!res.ok) return setContactMsg(res.d.error || "Eroare la trimitere.", true);
          contactForm.reset();
          setContactMsg("✓ Mesajul a fost trimis! Îți răspundem în curând.", false);
        })
        .catch(function () { if (btn) btn.disabled = false; setContactMsg("Eroare de rețea.", true); });
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
