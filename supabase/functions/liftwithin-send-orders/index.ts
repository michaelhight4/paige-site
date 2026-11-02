// Lift Within: sends held orders to Printful. Called hourly by pg_cron (job liftwithin-send-orders) with header
// x-cron-secret. Picks status=pending AND send_after<=now, skips refunded/disputed payments (Stripe), then creates the
// Printful order with confirm=true and external_id derived from the Stripe session id (idempotent).
// Rows with test=true skip Stripe and create a confirm=false DRAFT only (for testing).
const PF = "https://api.printful.com";
const STORE = "18998717";
const SB = Deno.env.get("SUPABASE_URL")!;
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_ATTEMPTS = 5;
const sbh = { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" };
const pfh = () => ({ Authorization: `Bearer ${Deno.env.get("PRINTFUL_API_TOKEN")}`, "X-PF-Store-Id": STORE, "Content-Type": "application/json" });
const extId = (sid: string) => String(sid).replace(/[^A-Za-z0-9]/g, "").slice(-32);

async function db(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SB}/rest/v1/${path}`, { ...init, headers: { ...sbh, Prefer: "return=representation", ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`db ${r.status} ${await r.text()}`);
  return r.json();
}
const patch = (id: number, cond: string, v: Record<string, unknown>) =>
  db(`liftwithin_orders?id=eq.${id}${cond}`, { method: "PATCH", body: JSON.stringify({ ...v, updated_at: new Date().toISOString() }) });

// returns null if OK to ship, else a reason string
async function paymentProblem(pi: string | null): Promise<string | null> {
  if (!pi) return "no payment_intent";
  const r = await fetch(`https://api.stripe.com/v1/payment_intents/${pi}?expand[]=latest_charge`, { headers: { Authorization: `Bearer ${Deno.env.get("LIFTWITHIN_STRIPE_SECRET_KEY")}` } });
  const j = await r.json();
  if (!r.ok) throw new Error(`stripe ${r.status}: ${j?.error?.message || "error"}`);
  if (j.status !== "succeeded") return `payment ${j.status}`;
  const c = j.latest_charge || {};
  if (c.refunded || (c.amount_refunded ?? 0) > 0) return "refunded";
  if (c.disputed) return "disputed";
  return null;
}

async function sendOne(o: any) {
  const claimed = await patch(o.id, "&status=eq.pending", { status: "sending", attempts: o.attempts + 1 });
  if (!claimed.length) return { id: o.id, skipped: "not pending" }; // another run took it
  try {
    if (!o.test) {
      const why = await paymentProblem(o.payment_intent);
      if (why) { await patch(o.id, "", { status: "canceled", error: why }); return { id: o.id, canceled: why }; }
    }
    const ext = extId(o.stripe_session_id);
    const order = { external_id: ext, shipping: "STANDARD", recipient: o.recipient, items: o.items, retail_costs: o.retail_costs || undefined };
    const r = await fetch(`${PF}/orders?confirm=${o.test ? "false" : "true"}`, { method: "POST", headers: pfh(), body: JSON.stringify(order) });
    const j = await r.json();
    let pid = j?.result?.id;
    if (!r.ok) {
      // already exists in Printful (earlier run sent it): look it up instead of sending again
      const g = await fetch(`${PF}/orders/@${ext}`, { headers: pfh() });
      if (g.ok) pid = (await g.json()).result.id;
      else throw new Error(`printful ${r.status}: ${j?.error?.message || JSON.stringify(j).slice(0, 300)}`);
    }
    await patch(o.id, "", { status: "sent", printful_order_id: pid, error: null });
    return { id: o.id, sent: pid, draft: !!o.test };
  } catch (e) {
    const failed = o.attempts + 1 >= MAX_ATTEMPTS;
    await patch(o.id, "", { status: failed ? "failed" : "pending", error: String(e).slice(0, 500) });
    return { id: o.id, error: String(e), final: failed };
  }
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("LIFTWITHIN_CRON_SECRET") || "";
  const got = req.headers.get("x-cron-secret") || "";
  if (!secret || got.length !== secret.length || [...got].reduce((a, c, i) => a | (c.charCodeAt(0) ^ secret.charCodeAt(i)), 0) !== 0)
    return new Response("forbidden", { status: 403 });
  try {
    const due = await db(`liftwithin_orders?status=eq.pending&send_after=lte.${encodeURIComponent(new Date().toISOString())}&order=send_after.asc&limit=25`, { method: "GET" });
    const results = [];
    for (const o of due) results.push(await sendOne(o));
    return new Response(JSON.stringify({ at: new Date().toISOString(), due: due.length, results }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
