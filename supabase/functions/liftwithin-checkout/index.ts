// Lift Within shop: creates a Stripe Checkout Session (TEST key) from [{sync_variant_id, qty}].
// Prices are re-read from Printful server-side; client prices are never used.
// Shipping: $4.00 when total qty is 1, free when 2+. US shipping address only.
const PF = "https://api.printful.com";
const STORE = "18998717";
const SHOP = "https://paigegames.net/liftwithin/";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const body = await req.json();
    const cart = (Array.isArray(body?.items) ? body.items : body) as { sync_variant_id: number; qty: number }[];
    if (!Array.isArray(cart) || !cart.length || cart.length > 20) return json({ error: "bad cart" }, 400);
    const merged = new Map<number, number>();
    for (const it of cart) {
      const id = Number(it.sync_variant_id), q = Math.floor(Number(it.qty));
      if (!Number.isInteger(id) || id <= 0 || !(q >= 1 && q <= 10)) return json({ error: "bad item" }, 400);
      merged.set(id, (merged.get(id) || 0) + q);
    }
    // base for redirects: allow localhost/dev origins, default to the live shop page
    let base = SHOP;
    try { const u = new URL(String(body?.return_url || "")); if (["paigegames.net", "www.paigegames.net", "localhost", "127.0.0.1"].includes(u.hostname)) base = u.origin + u.pathname; } catch { /* default */ }

    const params = new URLSearchParams();
    let i = 0, totalQty = 0;
    for (const [id, q] of merged) {
      const r = await fetch(`${PF}/store/variants/${id}`, { headers: { Authorization: `Bearer ${Deno.env.get("PRINTFUL_API_TOKEN")}`, "X-PF-Store-Id": STORE } });
      if (!r.ok) return json({ error: `variant ${id} not found` }, 400);
      const res = (await r.json()).result; const v = res.sync_variant || res;
      const cents = Math.round(parseFloat(v.retail_price) * 100);
      if (!(cents > 0) || v.is_ignored) return json({ error: `variant ${id} unavailable` }, 400);
      const img = (v.files || []).find((f: any) => f.type === "preview")?.preview_url;
      params.set(`line_items[${i}][quantity]`, String(q));
      params.set(`line_items[${i}][price_data][currency]`, "usd");
      params.set(`line_items[${i}][price_data][unit_amount]`, String(cents));
      params.set(`line_items[${i}][price_data][product_data][name]`, v.name);
      params.set(`line_items[${i}][price_data][product_data][metadata][sync_variant_id]`, String(id));
      if (img) params.set(`line_items[${i}][price_data][product_data][images][0]`, img);
      i++; totalQty += q;
    }
    const ship = totalQty === 1 ? 400 : 0;
    params.set("mode", "payment");
    params.set("success_url", `${base}?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
    params.set("cancel_url", `${base}?checkout=cancel`);
    params.set("shipping_address_collection[allowed_countries][0]", "US");
    params.set("shipping_options[0][shipping_rate_data][type]", "fixed_amount");
    params.set("shipping_options[0][shipping_rate_data][display_name]", ship ? "Standard shipping" : "Free shipping (2+ items)");
    params.set("shipping_options[0][shipping_rate_data][fixed_amount][amount]", String(ship));
    params.set("shipping_options[0][shipping_rate_data][fixed_amount][currency]", "usd");
    params.set("metadata[shop]", "liftwithin");
    params.set("metadata[items]", JSON.stringify([...merged].map(([id, q]) => [id, q])));
    params.set("payment_intent_data[metadata][shop]", "liftwithin");

    const s = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("LIFTWITHIN_STRIPE_SECRET_KEY")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const sj = await s.json();
    if (!s.ok) return json({ error: sj.error?.message || "stripe error" }, 502);
    return json({ url: sj.url, id: sj.id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
