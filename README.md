# MrDTF — Print DTF Premium

Website pentru servicii de **print DTF la metru liniar** și **produse blank** pentru
personalizare, cu **panou de administrare** pentru editarea paginii principale.

Temă dark, glassmorphism, brand cyan → magenta. Rulează pe **Cloudflare Workers**
(site static + un mic API/CMS).

## Structură

```
index.html              # pagina principală
admin/index.html        # panou admin (/admin)
worker.js               # Cloudflare Worker: servește site-ul + API CMS
wrangler.jsonc          # config deploy (Workers + assets + KV)
.assetsignore           # fișiere care NU se publică ca asset-uri
assets/
  css/styles.css        # temă & layout
  css/admin.css         # stiluri panou admin
  js/main.js            # render conținut + calculator + upload + meniu
  js/admin.js           # logică panou admin
  img/                  # imagini hero + produse
```

## Panou de administrare (CMS)

La adresa **`/admin`** poți edita tot textul și prețurile de pe pagina principală
(hero, calculator, produse, contact, footer etc.). Conținutul se salvează în
**Cloudflare KV** și e citit automat de pagină prin `/api/content`.

### Configurare (o singură dată)

Site-ul funcționează imediat cu valorile implicite. Ca să poți **salva** din `/admin`:

1. **Creează un KV namespace**
   Cloudflare Dashboard → *Storage & Databases* → *KV* → *Create namespace*
   (ex. nume `mrdtf-content`). Copiază **Namespace ID**.

2. **Leagă-l în `wrangler.jsonc`** — decomentează blocul și pune id-ul:
   ```jsonc
   ,"kv_namespaces": [
     { "binding": "CONTENT", "id": "ID-UL_COPIAT" }
   ]
   ```

3. **Setează 2 secrete** (Worker → *Settings* → *Variables and Secrets* → *Add*):
   - `ADMIN_PASSWORD` — parola ta de login în `/admin`
   - `JWT_SECRET` — un șir lung, aleatoriu (ex. generat din parolă random)

4. Fă push (sau redeploy). Gata — intri pe `/admin`, te loghezi cu parola și editezi.

> Verificare rapidă: `GET /api/status` întoarce `{ kv: true, auth: true }` când e configurat.

### API
| Metodă | Rută | Auth | Descriere |
|--------|------|------|-----------|
| GET | `/api/content` | — | conținutul curent (sau valorile implicite) |
| PUT | `/api/content` | da | salvează conținutul |
| DELETE | `/api/content` | da | resetează la valorile implicite |
| POST | `/api/login` | — | `{ password }` → `{ token }` |
| GET | `/api/status` | — | starea configurării (`kv`, `r2`, `auth`) |
| POST | `/api/orders` | — | plasează o comandă (multipart: contact + dimensiuni + `file`) |
| GET | `/api/orders` | da | lista comenzilor |
| PATCH | `/api/orders/:id` | da | schimbă statusul comenzii |
| DELETE | `/api/orders/:id` | da | șterge comanda (+ fișierul) |
| GET | `/api/orders/:id/file` | da | descarcă fișierul de design |
| POST | `/api/media` | da | încarcă o imagine (produs) → `{ url }` |
| GET | `/api/media/:id` | — | servește imaginea încărcată |
| POST | `/api/auth/register` | — | cont nou → `{ token }` |
| POST | `/api/auth/login` | — | autentificare client → `{ token }` |
| GET | `/api/auth/me` | client | datele contului |
| GET | `/api/auth/orders` | client | comenzile clientului logat |
| GET | `/api/admin/stats` | admin | statistici CRM (clienți, comenzi, venit, status) |
| GET | `/api/admin/customers` | admin | listă clienți agregată |
| GET | `/api/admin/customers/:email` | admin | fișa clientului (date, comenzi, note) |
| PUT | `/api/admin/customers/:email/crm` | admin | salvează note interne + etichete CRM |

## Magazin (conturi + coș)

- **Conturi de client** la `/cont` (înregistrare/login). Parole hash-uite PBKDF2.
- **Coș** (drawer): produse cu preț + comenzi de print DTF la metru.
- **Checkout necesită cont** (`POST /api/orders` cere token de client). Comanda reține
  articolele, totalul, fișierele de design atașate și e legată de cont — vizibilă în
  „Comenzile mele” și în admin → Comenzi.
- Prețul produselor se setează din **admin → Produse**.
- **Reducere coș** (admin → Conținut → *Reducere coș*): activezi, alegi pragul după
  valoare (RON) sau cantitate, plus procentul. Se aplică automat în coș și se
  recalculează pe server la plasarea comenzii.

## Comenzi

Formularul „Comandă DTF” de pe site trimite comenzile, vizibile în **`/admin` → tab Comenzi**
(status: Nouă / În lucru / Trimisă / Finalizată / Anulată).

Totul se stochează în **KV** (cel pe care îl ai deja, fără infrastructură suplimentară):
- comanda → cheia `order:<id>`
- fișierul de design → cheia `orderfile:<id>` (bytes brute, **max 20 MB**)

Fișierele mai mari de 20 MB sunt respinse cu mesaj (clientul le poate trimite separat pe email).

## TikTok (sincronizare automată)

Modul opțional care afișează videoclipurile de pe profilul vostru, sincronizate prin
**TikTok Display API**. Manual funcționează fără nimic (admin → TikTok → linkuri video).
Pentru varianta automată:

1. **Aplicație** pe [developers.tiktok.com](https://developers.tiktok.com): adaugă produsele
   *Login Kit* + *Display API* (scope `user.info.basic`, `video.list`). Redirect URI:
   `https://<site>/api/tiktok/callback`. Obține **Client Key** + **Client Secret** (după aprobare).
2. **Secrete** în Worker: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`.
3. În **admin → TikTok** apeși **„Conectează TikTok”** (OAuth o singură dată).
4. Un **Cron zilnic** (`0 6 * * *`, în `wrangler.jsonc`) reîmprospătează lista; poți sincroniza și manual.

Endpoint-uri: `GET /api/tiktok/videos` (public), `connect`/`status`/`sync`/`disconnect` (admin), `callback` (OAuth).

## Rulare locală

Pentru tot (inclusiv API/admin) folosește Wrangler:

```bash
npx wrangler dev
# → http://localhost:8787   (și /admin)
```

Doar pentru pagina statică e suficient și `python3 -m http.server 8080`
(dar `/api/*` și salvarea din admin nu vor funcționa fără Worker).

## Deploy (Cloudflare Workers)

Deploy automat din git (production branch `main`), comandă `npx wrangler deploy`.
Vezi build-urile în Dashboard → *Workers & Pages* → `dtfprint`.

## Preț

Tariful e calculat la **metru liniar**: `preț = lungime (m) × preț/m`.
Prețul pe metru și lățimea maximă se editează din **/admin** (secțiunea *Comandă*),
fără să atingi codul.
