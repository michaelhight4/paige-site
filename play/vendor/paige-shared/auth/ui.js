// VENDORED from paige-shared — do not edit; run `npm run sync` in /workspace/paige-shared.
import { adsRow } from "../ads/ui.js";
/** Settings > Account (shared by every Paige game). */
export function mountAccountSettings(container, auth, hooks, o) {
    const c = o.classes;
    const btnRow = (icon, title, sub, el, fn) => { const b = adsRow(c, icon, title, sub, "button", { "data-el": el }); b.addEventListener("click", fn); return b; };
    const render = () => {
        const s = auth.state();
        container.replaceChildren();
        container.setAttribute("data-el", "account");
        const h = document.createElement("div");
        h.className = c.section;
        h.textContent = o.heading ?? "Account";
        container.append(h);
        const status = !s.configured ? (o.offlineNote ?? "Playing as a guest on this device. Accounts arrive with online features; you can keep playing without one.")
            : s.guest ? "Playing as a guest. Your progress is saved to this device. Create an account to keep it on every device and to buy items."
                : `Signed in${s.email ? " as " + s.email : ""}. Progress, purchases and Blue Bucks follow your account.`;
        container.append(adsRow(c, s.guest ? "👤" : "✅", s.guest ? "Guest" : "Account linked", status, "div", { "data-el": "account-status" }));
        if (s.guest) {
            container.append(btnRow("🔗", "Create account", "Google or email. Keeps this guest's progress, nothing is lost", "account-create", async () => {
                const v = await hooks.askEmail("create");
                if (!v)
                    return;
                const r = v.email === "google" ? await auth.linkGoogle() : await auth.linkEmail(v.email, v.password);
                hooks.toast?.(r.ok ? "Check your email to confirm. Your progress stays on this account." : "Could not create account: " + r.error);
            }));
            container.append(btnRow("🔑", "Sign in", "Already have a Paige Games account?", "account-signin", async () => {
                const v = await hooks.askEmail("signin");
                if (!v)
                    return;
                if (!v.password) {
                    const r = await auth.sendMagicLink(v.email);
                    hooks.toast?.(r.ok ? "Sign-in link sent." : "Could not send link");
                    return;
                }
                const r = await auth.signInWithPassword(v.email, v.password);
                if (!r.ok) {
                    hooks.toast?.("Sign in failed: " + r.error);
                    return;
                }
                if (r.value.previousGuest) {
                    const ch = await hooks.askMerge();
                    if (ch !== "cancel")
                        await hooks.onMerged?.(ch);
                }
            }));
        }
        else
            container.append(btnRow("🚪", "Sign out", "You can sign back in any time", "account-signout", () => auth.signOut()));
    };
    render();
    return auth.onChange(render);
}
