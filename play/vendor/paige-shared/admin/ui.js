// VENDORED from paige-shared — do not edit; run `npm run sync` in /workspace/paige-shared.
import { DEFAULT_TAG } from "./admin.js";
/** Staff tag next to a name. Gold with a subtle shimmer (see admin.css), distinct from currency colours. */
export function creatorTag(text = DEFAULT_TAG) {
    const s = document.createElement("span");
    s.className = "pg-creator-tag";
    s.textContent = text;
    s.setAttribute("data-el", "creator-tag");
    s.title = "Paige Games staff";
    return s;
}
const el = (t, cls = "", text, attrs = {}) => { const e = document.createElement(t); if (cls)
    e.className = cls; if (text != null)
    e.textContent = text; for (const [k, v] of Object.entries(attrs))
    e.setAttribute(k, v); return e; };
/** Admin menu v1. Render only after AdminClient.me() returned a role. Every button is a server RPC (re-checked + audited). */
export function mountAdminMenu(root, admin, o) {
    root.replaceChildren();
    root.classList.add("pg-admin");
    root.setAttribute("data-el", "admin-menu");
    const say = (r, okMsg) => o.toast?.(r.ok ? okMsg : "Refused: " + (r.error ?? "error"));
    const sec = (t) => { const d = el("section", "pg-admin-sec"); d.append(el("h3", "", t)); root.append(d); return d; };
    const inp = (ph, el2 = "") => el("input", "pg-admin-in", undefined, { placeholder: ph, "aria-label": ph, "data-el": el2 });
    const btn = (t, fn, d = "") => { const b = el("button", "pg-admin-btn", t, { type: "button", "data-el": d }); b.addEventListener("click", fn); return b; };
    root.append(el("p", "pg-admin-note", `Role: ${admin.role ?? "none"} · every action is checked by the server and written to the audit log.`));
    const ps = sec("Players");
    const q = inp("Search name, email or id", "admin-q");
    const list = el("div", "pg-admin-list", undefined, { "data-el": "admin-players" });
    let target = null;
    const tgt = el("div", "pg-admin-note", "No player selected", { "data-el": "admin-target" });
    ps.append(q, btn("Search", async () => {
        const r = await admin.players(q.value);
        list.replaceChildren();
        if (!r.ok) {
            list.append(el("div", "pg-admin-note", "Refused: " + r.error));
            return;
        }
        for (const p of r.value) {
            const b = btn(`${p.display_name ?? "Player"} · ${p.email ?? (p.is_anonymous ? "guest" : "")} · ${p.blue_bucks.toLocaleString("en-US")} BB`, () => { target = p.id; tgt.textContent = "Selected: " + (p.display_name ?? p.email ?? p.id); });
            list.append(b);
        }
    }, "admin-search"), list, tgt);
    const is = sec("Items");
    const sel = el("select", "pg-admin-in", undefined, { "aria-label": "Item", "data-el": "admin-sku" });
    for (const s of o.skus)
        sel.append(el("option", "", s.title, { value: `${s.game ?? ""}|${s.sku}` }));
    const item = () => { const [g, s] = sel.value.split("|"); return { g: g || null, s }; };
    is.append(sel, btn("Grant item", async () => { if (!target)
        return o.toast?.("Pick a player first"); const x = item(); say(await admin.setItem(target, x.g, x.s, true), "Granted"); }, "admin-grant-item"), btn("Remove item", async () => { if (!target)
        return o.toast?.("Pick a player first"); const x = item(); say(await admin.setItem(target, x.g, x.s, false), "Removed"); }, "admin-remove-item"));
    const cs = sec("Currency");
    const cur = el("select", "pg-admin-in", undefined, { "aria-label": "Currency", "data-el": "admin-cur" });
    for (const c of o.currencies)
        cur.append(el("option", "", c.label, { value: c.id }));
    const amt = inp("Amount (negative removes)", "admin-amount");
    amt.setAttribute("inputmode", "numeric");
    cs.append(cur, amt, btn("Grant", async () => { if (!target)
        return o.toast?.("Pick a player first"); const n = Math.trunc(Number(amt.value)); if (!n)
        return o.toast?.("Enter an amount"); say(await admin.grantCurrency(target, cur.value, n, "admin menu"), "Granted " + n); }, "admin-grant-cur"));
    const fs = sec("Flags");
    for (const f of o.flags) {
        fs.append(btn(`${f.label}: on`, async () => say(await admin.setFlag(f.game, f.key, true), f.label + " on"), "admin-flag-on-" + f.key), btn(`${f.label}: off`, async () => say(await admin.setFlag(f.game, f.key, false), f.label + " off"), "admin-flag-off-" + f.key));
    }
    const an = sec("Announcement");
    const body = el("textarea", "pg-admin-in", undefined, { placeholder: "Message to players (280 max)", maxlength: "280", "aria-label": "Announcement", "data-el": "admin-ann" });
    an.append(body, btn("Send to this game", async () => say(await admin.announce(o.game, body.value, 24), "Sent"), "admin-announce"), btn("Send to every game", async () => say(await admin.announce(null, body.value, 24), "Sent"), "admin-announce-all"));
    const au = sec("Audit log");
    const log = el("div", "pg-admin-list", undefined, { "data-el": "admin-audit" });
    au.append(btn("Load latest 50", async () => {
        const r = await admin.audit(50);
        log.replaceChildren();
        if (!r.ok) {
            log.append(el("div", "pg-admin-note", "Refused: " + r.error));
            return;
        }
        for (const a of r.value)
            log.append(el("div", "pg-admin-note", `${new Date(a.at).toLocaleString()} · ${a.action} · ${JSON.stringify(a.detail)}`));
    }, "admin-audit-load"), log);
}
