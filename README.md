# DTF Print la ML

Website pentru servicii de **print DTF la metru liniar** și **produse blank** pentru personalizare.

Construit pe baza schiței de design furnizate: temă dark, glassmorphism, gradient violet → albastru.

## Conținut

- **Hero** — „Print DTF la metru liniar”, features (culori vibrante, rezistență, livrare rapidă) + CTA.
- **Comandă DTF** — descriere serviciu + **calculator de preț** funcțional (lățime / lungime → preț în RON) și upload design.
- **Pași** — Încarcă design → Noi printăm → Verificare → Livrare.
- **Produse Blank** — tricouri, hanorace, genți, șepci.
- **Trust badges** — calitate, livrare, plăți securizate, suport.
- **Footer** — link-uri, informații, contact, social.

## Structură

```
index.html              # pagina principală
assets/
  css/styles.css        # temă & layout (responsive)
  js/main.js            # calculator preț, upload, meniu mobil
```

## Rulare locală

Site static, fără build. Deschide direct `index.html` sau servește folderul:

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

## Deploy (Cloudflare Pages)

Proiect static, fără pas de build:

- **Build command:** *(gol)*
- **Output directory:** `/` (rădăcina repo-ului)

## Preț

Tariful e calculat la **metru liniar** (lățime până la 60 cm inclusă):
`preț = lungime (m) × 25 RON`. Modifică `PRICE_PER_METER` în `assets/js/main.js`.

## De personalizat

- Date de contact (telefon, email, program) în `index.html`, secțiunea footer.
- Tariful (`PRICE_PER_METER`) în `assets/js/main.js`.
- Imaginile produselor — momentan emoji placeholder; se pot înlocui cu fotografii în `assets/img/`.
