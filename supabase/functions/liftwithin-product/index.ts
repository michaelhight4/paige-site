// Lift Within shop: product detail (store 18998717). GET ?id=<sync_product_id>
// Returns variants (live prices, per-variant mockup gallery), catalog description and size tables.
// Store data cached 5 min, catalog data (description/sizes) cached 24 h.
const PF = "https://api.printful.com";
const STORE = "18998717";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "GET, OPTIONS" };
const prodCache = new Map<string, { at: number; body: string }>();
const catCache = new Map<number, { at: number; data: any }>();
const TTL = 5 * 60 * 1000, CAT_TTL = 24 * 3600 * 1000;

async function pf(path: string, allow404 = false) {
  const r = await fetch(PF + path, { headers: { Authorization: `Bearer ${Deno.env.get("PRINTFUL_API_TOKEN")}`, "X-PF-Store-Id": STORE } });
  if (allow404 && r.status === 404) return null;
  if (!r.ok) throw new Error(`printful ${path} ${r.status}`);
  return (await r.json()).result;
}

async function catalog(cid: number) {
  const c = catCache.get(cid);
  if (c && Date.now() - c.at < CAT_TTL) return c.data;
  const [p, s] = await Promise.all([pf(`/products/${cid}`, true), pf(`/products/${cid}/sizes`, true).catch(() => null)]);
  const data = {
    catalog_id: cid,
    title: p?.product?.title || p?.product?.model || "",
    brand: p?.product?.brand || "",
    description: p?.product?.description || "",
    size_tables: (s?.size_tables || []).map((t: any) => ({ type: t.type, unit: t.unit, description: t.description || "", measurements: t.measurements || [] })),
    available_sizes: s?.available_sizes || [],
  };
  catCache.set(cid, { at: Date.now(), data });
  return data;
}

async function build(id: string) {
  const d = await pf(`/store/products/${id}`, true);
  if (!d || d.sync_product?.is_ignored) return null;
  const sv = (d.sync_variants || []).filter((v: any) => !v.is_ignored && v.availability_status !== "discontinued");
  const variants = sv.map((v: any) => {
    const mock = (v.files || []).filter((f: any) => f.type === "preview" && f.preview_url).map((f: any) => f.preview_url);
    const images = [...new Set(mock)];
    return { id: v.id, size: v.size || "", color: v.color || "", price: v.retail_price, currency: v.currency, image: images[0] || null, images, available: v.availability_status === "active" };
  });
  // variants without their own design mockup borrow one (same color first, then any) - never the blank catalog photo
  for (const v of variants) if (!v.images.length) {
    const d = variants.find((x: any) => x.images.length && x.color === v.color) || variants.find((x: any) => x.images.length);
    if (d) { v.images = [...d.images]; v.image = d.image; }
  }
  const cids = [...new Set(sv.map((v: any) => v.product?.product_id).filter(Boolean))] as number[];
  const cats = await Promise.all(cids.map(catalog));
  const prices = variants.map((v: any) => parseFloat(v.price)).filter((n: number) => !isNaN(n));
  return {
    id: d.sync_product.id, name: d.sync_product.name, thumbnail: d.sync_product.thumbnail_url,
    min_price: prices.length ? Math.min(...prices) : null,
    description: cats[0]?.description || "", size_tables: cats[0]?.size_tables || [], catalog: cats,
    variants, updated: new Date().toISOString(),
  };
}

const json = (b: string, status = 200, extra: Record<string, string> = {}) => new Response(b, { status, headers: { ...cors, "Content-Type": "application/json", ...extra } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^\d{1,15}$/.test(id)) return json(JSON.stringify({ error: "bad id" }), 400);
  const c = prodCache.get(id);
  try {
    if (!c || Date.now() - c.at > TTL) {
      const p = await build(id);
      if (!p) return json(JSON.stringify({ error: "not found" }), 404);
      prodCache.set(id, { at: Date.now(), body: JSON.stringify(p) });
    }
    return json(prodCache.get(id)!.body, 200, { "Cache-Control": "public, max-age=300" });
  } catch (e) {
    if (c) return json(c.body);
    return json(JSON.stringify({ error: String(e) }), 502);
  }
});
