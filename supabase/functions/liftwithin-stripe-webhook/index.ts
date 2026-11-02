// Lift Within shop: Stripe webhook. On checkout.session.completed (metadata.shop=liftwithin) verifies the
// Stripe signature and creates a Printful order. CONFIRM=false creates a DRAFT (testing). Go-live: set true.
const PF = "https://api.printful.com";
const STORE = "18998717";
const CONFIRM = true;
const enc = new TextEncoder();

async function verify(payload: string, header: string, secret: string) {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=", 2)).filter((p) => p.length === 2).map(([k, v]) => [k, v]));
  const t = header.split(",").find((p) => p.startsWith("t="))?.slice(2);
  const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || !sigs.length || !parts) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${payload}`)));
  const hex = [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
  return sigs.some((s) => s.length === hex.length && [...s].reduce((a, c, i) => a | (c.charCodeAt(0) ^ hex.charCodeAt(i)), 0) === 0);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const payload = await req.text();
  const ok = await verify(payload, req.headers.get("stripe-signature") || "", Deno.env.get("LIFTWITHIN_STRIPE_WEBHOOK_SECRET") || "");
  if (!ok) return new Response("bad signature", { status: 400 });
  const ev = JSON.parse(payload);
  if (ev.type !== "checkout.session.completed") return new Response("ignored", { status: 200 });
  const s = ev.data.object;
  if (s.metadata?.shop !== "liftwithin") return new Response("not ours", { status: 200 });
  const sd = s.collected_information?.shipping_details || s.shipping_details || s.shipping || {};
  const a = sd.address || {};
  const items = JSON.parse(s.metadata.items || "[]").map(([id, q]: [number, number]) => ({ sync_variant_id: id, quantity: q }));
  const order = {
    external_id: String(s.id).replace(/[^A-Za-z0-9]/g, "").slice(-32),
    shipping: "STANDARD",
    recipient: {
      name: sd.name || s.customer_details?.name || "Customer",
      address1: a.line1, address2: a.line2 || undefined, city: a.city, state_code: a.state, country_code: a.country || "US", zip: a.postal_code,
      email: s.customer_details?.email, phone: s.customer_details?.phone || undefined,
    },
    items,
    retail_costs: { shipping: ((s.shipping_cost?.amount_total ?? s.total_details?.amount_shipping ?? 0) / 100).toFixed(2) },
  };
  const r = await fetch(`${PF}/orders?confirm=${CONFIRM}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("PRINTFUL_API_TOKEN")}`, "X-PF-Store-Id": STORE, "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  const j = await r.json();
  if (!r.ok) {
    // 409 = external_id already used: Stripe retried an event we already handled
    if (r.status === 409 || /external/i.test(j?.error?.message || "")) return new Response("duplicate", { status: 200 });
    console.error("printful order failed", r.status, JSON.stringify(j));
    return new Response("printful error", { status: 500 });
  }
  return new Response(JSON.stringify({ printful_order_id: j.result.id, status: j.result.status }), { headers: { "Content-Type": "application/json" } });
});
