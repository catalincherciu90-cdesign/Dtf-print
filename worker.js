// ===========================================================
// MrDTF — Cloudflare Worker
// Servește site-ul static + API CMS pentru /admin.
//
// Bindings (vezi wrangler.jsonc):
//   ASSETS   – static assets (site-ul)
//   CONTENT  – KV namespace (opțional; fără el se folosesc valorile implicite)
// Secrets (Settings → Variables and Secrets, în dashboard):
//   ADMIN_PASSWORD – parola de login în /admin
//   JWT_SECRET     – cheie pentru semnarea token-ului
// ===========================================================

const KV_KEY = "home";

// ---- Conținut implicit (folosit dacă KV e gol) ----
const DEFAULT_CONTENT = {
  brandTagline: "PRINT DTF PREMIUM",
  hero: {
    line1: "PRINT", hi: "DTF", line2: "LA METRU LINIAR",
    subPre: "LĂȚIME DE", subHi: "90 CM",
    stats: ["🏷️ De la 6,50 lei/ml", "📏 Lățime 90 cm", "🚚 Livrare 24-48h"],
    checks: ["Comandă online", "Livrare rapidă", "Culori vibrante"],
    cta: "COMANDĂ ACUM",
    hint: "Încarcă fișierele în 2 minute",
  },
  pills: [
    { ico: "🛡️", title: "Culori vibrante", sub: "Calitate premium" },
    { ico: "📏", title: "Lățime 90 cm", sub: "Print la metru liniar" },
    { ico: "⚡", title: "Livrare rapidă", sub: "Termene scurte" },
    { ico: "🏅", title: "Rezistență maximă", sub: "Spălări multiple" },
  ],
  order: {
    eyebrow: "Comandă rapid și ușor",
    title: "Comandă DTF",
    desc: "Încarci designul, alegi dimensiunea și primești printul DTF la metru liniar, gata de aplicat.",
    checklist: [
      "Preț afișat la metru liniar",
      "Lățime maximă print: 60 cm",
      "Print de înaltă rezoluție",
      "Folie premium, cerneală certificată",
      "Ideal pentru textile din bumbac, poliester și mix",
    ],
    calcTitle: "Calculează prețul",
    pricePerMeter: 25,
    maxWidth: 60,
    uploadText: "Încarcă design",
    calcNote: "Upload PDF, PNG, TIFF (300dpi recomandat)",
  },
  steps: [
    { ico: "📤", title: "1. Încarcă design", sub: "Trimite fișierul tău" },
    { ico: "🖨️", title: "2. Noi printăm", sub: "Calitate premium" },
    { ico: "🔍", title: "3. Verificare", sub: "Control calitate" },
    { ico: "🚚", title: "4. Livrare rapidă", sub: "Ambalare sigură" },
  ],
  products: {
    eyebrow: "Textile și accesorii",
    title: "Produse Blank",
    desc: "Descoperă gama noastră de produse blank premium, perfecte pentru personalizare.",
    cta: "Vezi toate produsele",
    items: [
      { img: "assets/img/prod-tricou.jpg", name: "Tricouri", desc: "De la XS la 5XL" },
      { img: "assets/img/prod-hanorac.jpg", name: "Hanorace", desc: "Model unisex" },
      { img: "assets/img/prod-geanta.jpg", name: "Genți", desc: "Bumbac premium" },
      { img: "assets/img/prod-sapca.jpg", name: "Șepci", desc: "Diverse modele" },
    ],
  },
  trust: [
    { ico: "🏅", title: "Calitate garantată", sub: "Materiale și print premium" },
    { ico: "🚚", title: "Livrare rapidă", sub: "2-3 zile lucrătoare oriunde în țară" },
    { ico: "🔒", title: "Plăți securizate", sub: "Datele tale sunt în siguranță" },
    { ico: "💬", title: "Suport dedicat", sub: "Suntem aici să te ajutăm" },
  ],
  footer: {
    tagline: "Specialiști în print DTF premium la metru liniar și produse blank pentru personalizare.",
    phone: "+40 123 456 789",
    email: "contact@dtfprint.ro",
    schedule: "L–V: 09:00 – 17:00",
    copyright: "© 2024 MrDTF — Print DTF Premium. Toate drepturile rezervate.",
  },
};

// ---- Helpers ----
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,PUT,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    },
  });
const err = (msg, status = 400) => json({ error: msg }, status);

// ---- JWT (HS256) ----
function b64u(buf) {
  const bytes = typeof buf === "string" ? new TextEncoder().encode(buf) : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function b64uToStr(s) {
  return atob(s.replace(/-/g, "+").replace(/_/g, "/"));
}
async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
  );
}
async function signJWT(payload, secret, expSec = 7 * 86400) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64u(JSON.stringify({ ...payload, iat: now, exp: now + expSec }));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64u(sig)}`;
}
async function verifyJWT(token, secret) {
  try {
    const [h, b, s] = token.split(".");
    if (!h || !b || !s) return null;
    const key = await hmacKey(secret);
    const data = new TextEncoder().encode(`${h}.${b}`);
    const sig = Uint8Array.from(b64uToStr(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const ok = await crypto.subtle.verify("HMAC", key, sig, data);
    if (!ok) return null;
    const payload = JSON.parse(b64uToStr(b));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function getContent(env) {
  if (env.CONTENT) {
    try {
      const stored = await env.CONTENT.get(KV_KEY, "json");
      if (stored) return stored;
    } catch { /* fallback la default */ }
  }
  return DEFAULT_CONTENT;
}

async function requireAuth(request, env) {
  if (!env.JWT_SECRET) return false;
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  return !!(await verifyJWT(token, env.JWT_SECRET));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path.startsWith("/api/")) {
        if (request.method === "OPTIONS") return json({}, 204);

        // status — util pentru a verifica configurarea
        if (path === "/api/status" && request.method === "GET") {
          return json({ ok: true, kv: !!env.CONTENT, auth: !!(env.JWT_SECRET && env.ADMIN_PASSWORD) });
        }

        // login
        if (path === "/api/login" && request.method === "POST") {
          if (!env.ADMIN_PASSWORD || !env.JWT_SECRET) {
            return err("Admin neconfigurat: setează ADMIN_PASSWORD și JWT_SECRET.", 503);
          }
          const body = await request.json().catch(() => ({}));
          if (!body.password || !timingSafeEqual(body.password, env.ADMIN_PASSWORD)) {
            return err("Parolă greșită.", 401);
          }
          const token = await signJWT({ role: "admin" }, env.JWT_SECRET);
          return json({ token });
        }

        // get content (public)
        if (path === "/api/content" && request.method === "GET") {
          return json(await getContent(env));
        }

        // save content (auth)
        if (path === "/api/content" && request.method === "PUT") {
          if (!(await requireAuth(request, env))) return err("Neautorizat.", 401);
          if (!env.CONTENT) return err("KV neconfigurat: adaugă binding-ul CONTENT.", 503);
          const data = await request.json().catch(() => null);
          if (!data || typeof data !== "object") return err("JSON invalid.");
          await env.CONTENT.put(KV_KEY, JSON.stringify(data));
          return json({ ok: true });
        }

        // reset la valorile implicite (auth)
        if (path === "/api/content" && request.method === "DELETE") {
          if (!(await requireAuth(request, env))) return err("Neautorizat.", 401);
          if (env.CONTENT) await env.CONTENT.delete(KV_KEY);
          return json({ ok: true, content: DEFAULT_CONTENT });
        }

        return err("Endpoint inexistent.", 404);
      }

      // restul — site static
      return env.ASSETS.fetch(request);
    } catch (e) {
      // în caz de eroare neașteptată, nu blocăm site-ul static
      if (!path.startsWith("/api/")) return env.ASSETS.fetch(request);
      return err("Eroare server: " + (e && e.message), 500);
    }
  },
};
