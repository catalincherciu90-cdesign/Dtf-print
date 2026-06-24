/* ===========================================================
   MrDTF — Contul clientului (înregistrare / login / comenzi)
   =========================================================== */
(function () {
  "use strict";
  var TOKEN = "mrdtf_customer";
  var token = localStorage.getItem(TOKEN) || "";
  var $ = function (id) { return document.getElementById(id); };

  function api(method, path, body, auth) {
    var h = { "Content-Type": "application/json" };
    if (auth) h.Authorization = "Bearer " + token;
    return fetch(path, { method: method, headers: h, body: body ? JSON.stringify(body) : undefined });
  }
  function setMsg(id, t, e) { var m = $(id); if (m) { m.textContent = t; m.className = "form-msg" + (e ? " is-error" : " is-ok"); } }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  /* tab-uri login / register */
  document.querySelectorAll("[data-auth-tab]").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll("[data-auth-tab]").forEach(function (x) { x.classList.remove("is-active"); });
      b.classList.add("is-active");
      var w = b.dataset.authTab;
      $("loginForm").hidden = w !== "login";
      $("registerForm").hidden = w !== "register";
    });
  });

  function showAccount() { $("authView").hidden = true; $("accountView").hidden = false; loadMe(); loadOrders(); }
  function showAuth() { $("accountView").hidden = true; $("authView").hidden = false; }
  function logout() { localStorage.removeItem(TOKEN); token = ""; showAuth(); }

  function loadMe() {
    api("GET", "/api/auth/me", null, true).then(function (r) {
      if (!r.ok) { logout(); return null; }
      return r.json();
    }).then(function (u) {
      if (u) { $("accName").textContent = u.name; $("accEmail").textContent = u.email; }
    });
  }

  function loadOrders() {
    setMsg("ordersMsg", "Se încarcă…", false);
    api("GET", "/api/auth/orders", null, true).then(function (r) { return r.json(); }).then(function (d) {
      var orders = (d && d.orders) || [];
      renderOrders(orders);
      setMsg("ordersMsg", orders.length ? "" : "Nu ai comenzi încă.", false);
    }).catch(function () { setMsg("ordersMsg", "Eroare la încărcare.", true); });
  }

  function renderOrders(orders) {
    $("myOrders").innerHTML = orders.map(function (o) {
      var items = (o.items || []).map(function (it) { return esc(it.name) + " ×" + esc(it.qty); }).join(", ");
      var total = o.total != null ? o.total : o.price;
      var deliv = o.deliveryMethod === "ridicare"
        ? "🏬 Ridicare personală"
        : (o.deliveryMethod === "livrare" || o.address)
          ? "🚚 Livrare" + (o.address ? ": " + esc(o.address) : "")
          : "";
      return "<div class=\"order-card\" data-status=\"" + esc(o.status) + "\">" +
        "<div class=\"order-card__top\"><strong>" + new Date(o.createdAt).toLocaleString("ro-RO") + "</strong>" +
        "<span class=\"pill-status\">" + esc(o.status) + "</span></div>" +
        "<div class=\"muted\">" + (items || "—") + "</div>" +
        (deliv ? "<div class=\"muted order-deliv\">" + deliv + "</div>" : "") +
        "<div class=\"order-total\">" + esc(total) + " RON</div></div>";
    }).join("");
  }

  $("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    setMsg("loginMsg", "Se verifică…", false);
    api("POST", "/api/auth/login", { email: $("loginEmail").value, password: $("loginPass").value })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) return setMsg("loginMsg", res.d.error || "Eroare.", true);
        token = res.d.token; localStorage.setItem(TOKEN, token); showAccount();
      }).catch(function () { setMsg("loginMsg", "Eroare de rețea.", true); });
  });

  $("registerForm").addEventListener("submit", function (e) {
    e.preventDefault();
    setMsg("regMsg", "Se creează contul…", false);
    api("POST", "/api/auth/register", {
      name: $("regName").value, email: $("regEmail").value,
      phone: $("regPhone").value, password: $("regPass").value,
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) return setMsg("regMsg", res.d.error || "Eroare.", true);
        token = res.d.token; localStorage.setItem(TOKEN, token); showAccount();
      }).catch(function () { setMsg("regMsg", "Eroare de rețea.", true); });
  });

  $("logoutBtn").addEventListener("click", logout);

  if (token) showAccount(); else showAuth();
})();
