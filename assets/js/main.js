/* ===========================================================
   DTF Print la ML — Interactivitate
   =========================================================== */
(function () {
  "use strict";

  /* ---- Preț pe metru liniar (RON) ---- */
  // 58 cm × 5 m = 125.00 RON  →  25 RON / metru liniar la lățime plină (≤60 cm).
  var PRICE_PER_METER = 25;

  var width = document.getElementById("width");
  var length = document.getElementById("length");
  var widthOut = document.getElementById("widthOut");
  var lengthOut = document.getElementById("lengthOut");
  var priceEl = document.getElementById("price");

  function recalc() {
    var w = parseInt(width.value, 10);
    var l = parseInt(length.value, 10);
    widthOut.textContent = w + " cm";
    lengthOut.textContent = l + " m";

    // Prețul este afișat la metru liniar (lățime până la 60 cm inclusă în tarif).
    // 5 m × 25 RON = 125.00 RON — identic cu schița.
    var total = l * PRICE_PER_METER;
    priceEl.textContent = total.toFixed(2) + " RON";
  }

  if (width && length) {
    width.addEventListener("input", recalc);
    length.addEventListener("input", recalc);
    recalc();
  }

  /* ---- Upload design ---- */
  var uploadBtn = document.getElementById("uploadBtn");
  var fileInput = document.getElementById("fileInput");
  var fileNote = document.getElementById("fileNote");

  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener("click", function () {
      fileInput.click();
    });
    fileInput.addEventListener("change", function () {
      if (fileInput.files && fileInput.files.length) {
        var f = fileInput.files[0];
        var mb = (f.size / (1024 * 1024)).toFixed(2);
        fileNote.textContent = "✓ " + f.name + " (" + mb + " MB) — gata de trimis";
        fileNote.style.color = "#6fe0ff";
      }
    });
  }

  /* ---- Meniu mobil ---- */
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
})();
