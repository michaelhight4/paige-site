// Lift Within shop: live proxy of the Printful store catalog (store 18998717). Public GET, ~5 min in-memory cache.
import { mockupImageUrls, orderByMockupView } from "../_shared/mockup-order.js";

const PF = "https://api.printful.com";
const STORE = "18998717";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "GET, OPTIONS" };
let cache: { at: number; body: string } | null = null;
const TTL = 5 * 60 * 1000;

async function pf(path: string) {
  const r = await fetch(PF + path, { headers: { Authorization: `Bearer ${Deno.env.get("PRINTFUL_API_TOKEN")}`, "X-PF-Store-Id": STORE } });
  if (!r.ok) throw new Error(`printful ${path} ${r.status}`);
  return (await r.json()).result;
}

async function build() {
  const list: any[] = [];
  for (let off = 0; ; off += 100) {
    const page = await pf(`/store/products?limit=100&offset=${off}`);
    list.push(...page);
    if (page.length < 100) break;
  }
  const out = await Promise.all(list.filter((p) => !p.is_ignored).map(async (p) => {
    const d = await pf(`/store/products/${p.id}`);
    const variants = (d.sync_variants || []).filter((v: any) => !v.is_ignored && v.availability_status !== "discontinued").map((v: any) => ({
      id: v.id, size: v.size || "", color: v.color || "", price: v.retail_price, currency: v.currency,
      image: mockupImageUrls(v.files || [])[0] || null,
      available: v.availability_status === "active",
    }));
    for (const v of variants) if (!v.image) v.image = (variants.find((x: any) => x.image && x.color === v.color) || variants.find((x: any) => x.image))?.image || null; // never blank catalog photos
    const prices = variants.map((v: any) => parseFloat(v.price)).filter((n: number) => !isNaN(n));
    const thumbnail = orderByMockupView([p.thumbnail_url, ...variants.map((v: any) => v.image)].filter(Boolean))[0] || p.thumbnail_url || null;
    return { id: p.id, name: p.name, thumbnail, min_price: prices.length ? Math.min(...prices) : null, variants };
  }));
  return { updated: new Date().toISOString(), products: out.filter((p) => p.variants.length) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!cache || Date.now() - cache.at > TTL) cache = { at: Date.now(), body: JSON.stringify(await build()) };
    return new Response(cache.body, { headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" } });
  } catch (e) {
    if (cache) return new Response(cache.body, { headers: { ...cors, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ error: String(e) }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
