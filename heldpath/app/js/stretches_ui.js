import {
  GROUPS,
  STRETCHES,
  DISCLAIMER,
  CREDITS_BODY,
  groupById,
  stretchesInGroup,
  pickRandomWorkout,
  swipeDirection,
  stepIndex,
} from "./stretches_data.js";

const $ = (id) => document.getElementById(id);

let hooks = { showScreen: () => {}, goSettings: () => {} };

const view = {
  mode: "hub", // hub | group | workout | credits
  list: [],
  index: 0,
  groupId: null,
  seed: 0,
  title: "Stretches",
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function initStretchesUi(opts) {
  hooks = opts;
  const open = $("btn-stretches-open");
  if (open) open.addEventListener("click", () => showStretchesHub());
  const backHub = $("stretches-back");
  if (backHub) backHub.addEventListener("click", () => hooks.goSettings());
  const backCard = $("stretch-card-back");
  if (backCard) backCard.addEventListener("click", () => showStretchesHub());
  const backCredits = $("stretch-credits-back");
  if (backCredits) backCredits.addEventListener("click", () => showStretchesHub());
  const randomBtn = $("btn-stretch-random");
  if (randomBtn) randomBtn.addEventListener("click", () => showStretchWorkout());
  const creditsBtn = $("btn-stretch-credits");
  if (creditsBtn) creditsBtn.addEventListener("click", () => showStretchCredits());
  const prev = $("btn-stretch-prev");
  const next = $("btn-stretch-next");
  if (prev) prev.addEventListener("click", () => goCard("prev"));
  if (next) next.addEventListener("click", () => goCard("next"));
  bindSwipe($("stretch-figure"));
  document.addEventListener("keydown", (ev) => {
    if (!$("screen-stretch-card")?.classList.contains("active")) return;
    if (ev.key === "ArrowLeft") { ev.preventDefault(); goCard("prev"); }
    if (ev.key === "ArrowRight") { ev.preventDefault(); goCard("next"); }
  });
}

export function showStretchesHub() {
  view.mode = "hub";
  renderHub();
  hooks.showScreen("stretches");
}

export function showStretchGroup(groupId) {
  const g = groupById(groupId) || GROUPS[0];
  view.mode = "group";
  view.groupId = g.id;
  view.list = stretchesInGroup(g.id);
  view.index = 0;
  view.title = g.name;
  renderCard();
  hooks.showScreen("stretch-card");
}

export function showStretchWorkout(seed) {
  const s = seed == null ? (Date.now() >>> 0) : (seed >>> 0);
  view.mode = "workout";
  view.seed = s;
  view.groupId = null;
  view.list = pickRandomWorkout(s, 2);
  view.index = 0;
  view.title = "Random workout";
  renderCard();
  hooks.showScreen("stretch-card");
}

export function showStretchCredits() {
  view.mode = "credits";
  const body = $("stretch-credits-body");
  if (body) body.textContent = CREDITS_BODY;
  const note = $("stretch-credits-disclaimer");
  if (note) note.textContent = DISCLAIMER;
  hooks.showScreen("stretch-credits");
}

function renderHub() {
  const note = $("stretches-disclaimer");
  if (note) note.textContent = DISCLAIMER;
  const list = $("stretches-groups");
  if (!list) return;
  list.innerHTML = GROUPS.map((g) => {
    const n = stretchesInGroup(g.id).length;
    return `<button type="button" class="stretch-group-btn" data-group="${escapeHtml(g.id)}" data-testid="stretch-group-${escapeHtml(g.id)}">
      <span class="stretch-group-name">${escapeHtml(g.name)}</span>
      <span class="stretch-group-count">${n} stretches</span>
    </button>`;
  }).join("");
  list.querySelectorAll("[data-group]").forEach((btn) => {
    btn.addEventListener("click", () => showStretchGroup(btn.getAttribute("data-group")));
  });
}

function renderCard() {
  const list = view.list;
  const i = view.index;
  const s = list[i];
  const title = $("stretch-card-title");
  if (title) title.textContent = view.title;
  const counter = $("stretch-card-counter");
  if (counter) counter.textContent = list.length ? `${i + 1} of ${list.length}` : "0 of 0";
  if (!s) return;
  const img = $("stretch-card-image");
  if (img) {
    img.src = s.image;
    img.alt = `${s.name}. ${s.figure}`;
  }
  const name = $("stretch-card-name");
  if (name) name.textContent = s.name;
  const g = groupById(s.group);
  const meta = $("stretch-card-meta");
  if (meta) meta.textContent = [g ? g.name : "", s.drill].filter(Boolean).join(" · ");
  const hold = $("stretch-chip-hold");
  if (hold) hold.textContent = s.hold;
  const reps = $("stretch-chip-reps");
  if (reps) reps.textContent = s.reps;
  const desc = $("stretch-card-desc");
  if (desc) desc.textContent = s.description;
  const fig = $("stretch-card-figure");
  if (fig) fig.textContent = s.figure;
  const prev = $("btn-stretch-prev");
  const next = $("btn-stretch-next");
  if (prev) prev.disabled = i <= 0;
  if (next) next.disabled = i >= list.length - 1;
  const dots = $("stretch-dots");
  if (dots) {
    dots.innerHTML = list.map((_, k) =>
      `<span class="stretch-dot${k === i ? " is-on" : ""}" data-i="${k}"></span>`
    ).join("");
    dots.querySelectorAll("[data-i]").forEach((el) => {
      el.addEventListener("click", () => {
        view.index = Number(el.getAttribute("data-i"));
        renderCard();
      });
    });
  }
}

function goCard(dir) {
  const next = stepIndex(view.index, dir, view.list.length);
  if (next === view.index) return;
  view.index = next;
  renderCard();
}

function bindSwipe(el) {
  if (!el) return;
  let x0 = 0, y0 = 0, active = false, pid = null;
  el.addEventListener("pointerdown", (ev) => {
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    active = true;
    pid = ev.pointerId;
    x0 = ev.clientX;
    y0 = ev.clientY;
    try { el.setPointerCapture(ev.pointerId); } catch { /* ignore */ }
  });
  const end = (ev) => {
    if (!active || (pid != null && ev.pointerId !== pid)) return;
    active = false;
    pid = null;
    const dir = swipeDirection(ev.clientX - x0, ev.clientY - y0);
    if (dir) goCard(dir);
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", () => { active = false; pid = null; });
}

export function getStretchView() {
  return { ...view, list: view.list.slice(), current: view.list[view.index] || null };
}

export { STRETCHES, GROUPS, DISCLAIMER };
