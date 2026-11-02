// Lift Within shop: Stripe webhook. On checkout.session.completed (paid) or checkout.session.async_payment_succeeded
// (metadata.shop=liftwithin) verifies the Stripe signature and STORES the order in public.liftwithin_orders with
// send_after = paid_at + 72h. liftwithin-send-orders (hourly pg_cron) sends due orders to Printful.
const HOLD_HOURS = 72;
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
  if (ev.type !== "checkout.session.completed" && ev.type !== "checkout.session.async_payment_succeeded") return new Response("ignored", { status: 200 });
  const s = ev.data.object;
  if (s.metadata?.shop !== "liftwithin") return new Response("not ours", { status: 200 });
  if (s.payment_status !== "paid") return new Response("not paid yet", { status: 200 }); // async methods arrive later via async_payment_succeeded
  const sd = s.collected_information?.shipping_details || s.shipping_details || s.shipping || {};
  const a = sd.address || {};
  const items = JSON.parse(s.metadata.items || "[]").map(([id, q]: [number, number]) => ({ sync_variant_id: id, quantity: q }));
  const paidAt = new Date((ev.created || Date.now() / 1000) * 1000);
  const row = {
    stripe_session_id: s.id,
    payment_intent: typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id || null,
    items,
    recipient: {
      name: sd.name || s.customer_details?.name || "Customer",
      address1: a.line1, address2: a.line2 || undefined, city: a.city, state_code: a.state, country_code: a.country || "US", zip: a.postal_code,
      email: s.customer_details?.email, phone: s.customer_details?.phone || undefined,
    },
    retail_costs: { shipping: ((s.shipping_cost?.amount_total ?? s.total_details?.amount_shipping ?? 0) / 100).toFixed(2) },
    amount_total: s.amount_total ?? null, currency: s.currency ?? null,
    paid_at: paidAt.toISOString(),
    send_after: new Date(paidAt.getTime() + HOLD_HOURS * 3600e3).toISOString(),
  };
  // insert once; duplicate events (same session) are ignored
  const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/liftwithin_orders?on_conflict=stripe_session_id`, {
    method: "POST",
    headers: { apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(row),
  });
  if (!r.ok) { console.error("store order failed", r.status, await r.text()); return new Response("store error", { status: 500 }); }
  return new Response(JSON.stringify({ stored: s.id, send_after: row.send_after }), { headers: { "Content-Type": "application/json" } });
});
