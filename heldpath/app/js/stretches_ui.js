import {
  GROUPS,
  STRETCHES,
  FLASHCARDS,
  STYLES,
  STYLE_KEY,
  DISCLAIMER,
  CREDITS_BODY,
  normalizeStyle,
  groupById,
  stretchesInGroup,
  pickRandomWorkout,
  swipeDirection,
  stepIndex,
} from "./stretches_data.js";
import {
  FOLLOW_ALONG_BLURB,
  FOLLOW_ALONG_SECTIONS,
  videosInSection,
  videoById,
  videoForStretch,
  youtubeEmbedUrl,
  youtubeWatchUrl,
  youtubeThumbUrl,
  creatorLine,
} from "./stretch_videos.js";

const $ = (id) => document.getElementById(id);

let hooks = { showScreen: () => {}, goSettings: () => {} };

const view = {
  mode: "hub", // hub | group | workout | credits | follow
  list: [],
  index: 0,
  groupId: null,
  seed: 0,
  title: "Stretches",
  style: "realistic",
};

export function getStretchStyle() {
  try {
    return normalizeStyle(localStorage.getItem(STYLE_KEY));
  } catch {
    return "realistic";
  }
}

export function setStretchStyle(style) {
  const next = normalizeStyle(style);
  view.style = next;
  try { localStorage.setItem(STYLE_KEY, next); } catch { /* ignore */ }
  return next;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function initStretchesUi(opts) {
  hooks = opts;
  view.style = getStretchStyle();
  document.querySelectorAll("[data-style]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setStretchStyle(btn.getAttribute("data-style"));
      renderHub();
    });
  });
  const open = $("btn-stretches-open");
  if (open) open.addEventListener("click", () => showStretchesHub());
  const backHub = $("stretches-back");
  if (backHub) backHub.addEventListener("click", () => hooks.goSettings());
  const backCard = $("stretch-card-back");
  if (backCard) backCard.addEventListener("click", () => showStretchesHub());
  const backCredits = $("stretch-credits-back");
  if (backCredits) backCredits.addEventListener("click", () => showStretchesHub());
  const backFollow = $("stretch-follow-back");
  if (backFollow) backFollow.addEventListener("click", () => showStretchesHub());
  const randomBtn = $("btn-stretch-random");
  if (randomBtn) randomBtn.addEventListener("click", () => showStretchWorkout());
  const creditsBtn = $("btn-stretch-credits");
  if (creditsBtn) creditsBtn.addEventListener("click", () => showStretchCredits());
  const followBtn = $("btn-stretch-follow");
  if (followBtn) followBtn.addEventListener("click", () => showStretchFollow());
  const preBtn = $("btn-stretch-follow-pre");
  if (preBtn) preBtn.addEventListener("click", () => showStretchFollow("pre_run"));
  const postBtn = $("btn-stretch-follow-post");
  if (postBtn) postBtn.addEventListener("click", () => showStretchFollow("post_run"));
  const watchBtn = $("btn-stretch-watch");
  if (watchBtn) {
    watchBtn.addEventListener("click", () => {
      const s = view.list[view.index];
      const video = s ? videoForStretch(s.id) : null;
      if (video) openStretchVideo(video.id);
    });
  }
  const closeVideo = $("btn-stretch-video-close");
  if (closeVideo) closeVideo.addEventListener("click", () => closeStretchVideo());
  const videoBack = $("sheet-stretch-video");
  if (videoBack) {
    videoBack.addEventListener("click", (ev) => {
      if (ev.target === videoBack) closeStretchVideo();
    });
  }
  const prev = $("btn-stretch-prev");
  const next = $("btn-stretch-next");
  if (prev) prev.addEventListener("click", () => goCard("prev"));
  if (next) next.addEventListener("click", () => goCard("next"));
  bindSwipe($("stretch-figure"));
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") closeStretchVideo();
    if (!$("screen-stretch-card")?.classList.contains("active")) return;
    if (ev.key === "ArrowLeft") { ev.preventDefault(); goCard("prev"); }
    if (ev.key === "ArrowRight") { ev.preventDefault(); goCard("next"); }
  });
}

export function showStretchesHub() {
  closeStretchVideo();
  view.mode = "hub";
  renderHub();
  hooks.showScreen("stretches");
}

export function showStretchFollow(sectionId) {
  closeStretchVideo();
  view.mode = "follow";
  renderFollow(sectionId);
  hooks.showScreen("stretch-follow");
  if (sectionId) {
    const el = document.querySelector(`[data-follow-section="${CSS.escape(sectionId)}"]`);
    if (el) el.scrollIntoView({ block: "start" });
  }
}

export function showStretchGroup(groupId) {
  closeStretchVideo();
  const g = groupById(groupId) || GROUPS[0];
  view.mode = "group";
  view.groupId = g.id;
  view.list = stretchesInGroup(g.id, view.style);
  view.index = 0;
  view.title = g.name;
  renderCard();
  hooks.showScreen("stretch-card");
}

export function showStretchWorkout(seed) {
  closeStretchVideo();
  const s = seed == null ? (Date.now() >>> 0) : (seed >>> 0);
  view.mode = "workout";
  view.seed = s;
  view.groupId = null;
  view.list = pickRandomWorkout(s, 2, view.style);
  view.index = 0;
  view.title = "Random workout";
  renderCard();
  hooks.showScreen("stretch-card");
}

export function showStretchCredits() {
  closeStretchVideo();
  view.mode = "credits";
  const body = $("stretch-credits-body");
  if (body) body.textContent = CREDITS_BODY;
  const note = $("stretch-credits-disclaimer");
  if (note) note.textContent = DISCLAIMER;
  hooks.showScreen("stretch-credits");
}

function renderHub() {
  view.style = getStretchStyle();
  const note = $("stretches-disclaimer");
  if (note) note.textContent = DISCLAIMER;
  const hint = $("stretch-style-hint");
  const styleMeta = STYLES.find((s) => s.id === view.style) || STYLES[1];
  if (hint) hint.textContent = styleMeta.hint + " Browse and Random workout use this style.";
  document.querySelectorAll("[data-style]").forEach((btn) => {
    const on = btn.getAttribute("data-style") === view.style;
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-checked", on ? "true" : "false");
  });
  const blurb = $("stretch-follow-blurb");
  if (blurb) blurb.textContent = FOLLOW_ALONG_BLURB;
  const list = $("stretches-groups");
  if (!list) return;
  list.innerHTML = GROUPS.map((g) => {
    const n = stretchesInGroup(g.id, view.style).length;
    return `<button type="button" class="stretch-group-btn" data-group="${escapeHtml(g.id)}" data-testid="stretch-group-${escapeHtml(g.id)}">
      <span class="stretch-group-name">${escapeHtml(g.name)}</span>
      <span class="stretch-group-count">${n} stretches</span>
    </button>`;
  }).join("");
  list.querySelectorAll("[data-group]").forEach((btn) => {
    btn.addEventListener("click", () => showStretchGroup(btn.getAttribute("data-group")));
  });
}

function renderFollow(focusSection) {
  const blurb = $("stretch-follow-page-blurb");
  if (blurb) blurb.textContent = FOLLOW_ALONG_BLURB;
  const list = $("stretch-follow-list");
  if (!list) return;
  list.innerHTML = FOLLOW_ALONG_SECTIONS.map((section) => {
    const videos = videosInSection(section.id);
    if (!videos.length) return "";
    const rows = videos.map((v) => {
      const thumb = youtubeThumbUrl(v.youtubeId) || "";
      const meta = [creatorLine(v), v.length].filter(Boolean).join(" · ");
      return `<button type="button" class="stretch-video-row" data-video="${escapeHtml(v.id)}" data-testid="stretch-video-${escapeHtml(v.id)}">
        <img class="stretch-video-thumb" src="${escapeHtml(thumb)}" alt="" width="160" height="90" loading="lazy" />
        <span class="stretch-video-copy">
          <span class="stretch-video-title">${escapeHtml(v.title)}</span>
          <span class="stretch-video-meta">${escapeHtml(meta)}</span>
        </span>
      </button>`;
    }).join("");
    return `<section class="stretch-follow-section" data-follow-section="${escapeHtml(section.id)}" data-testid="stretch-follow-${escapeHtml(section.id)}">
      <h2 class="section-label">${escapeHtml(section.name)}</h2>
      <div class="stretch-video-list">${rows}</div>
    </section>`;
  }).join("");
  list.querySelectorAll("[data-video]").forEach((btn) => {
    btn.addEventListener("click", () => openStretchVideo(btn.getAttribute("data-video")));
  });
  void focusSection;
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
  const video = videoForStretch(s.id);
  const watchWrap = $("stretch-card-watch");
  if (watchWrap) watchWrap.hidden = !video;
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

export function openStretchVideo(videoId) {
  const video = videoById(videoId);
  const sheet = $("sheet-stretch-video");
  if (!video || !sheet) return false;
  const title = $("stretch-video-heading");
  if (title) title.textContent = video.title;
  const creator = $("stretch-video-creator");
  if (creator) creator.textContent = creatorLine(video);
  const frame = $("stretch-video-frame");
  const embed = youtubeEmbedUrl(video.youtubeId);
  if (frame && embed) {
    frame.title = video.title;
    frame.src = embed;
  }
  const open = $("stretch-video-open");
  if (open) {
    open.href = youtubeWatchUrl(video.youtubeId) || "https://www.youtube.com/";
    open.hidden = false;
  }
  sheet.classList.add("open");
  sheet.setAttribute("aria-hidden", "false");
  return true;
}

export function closeStretchVideo() {
  const sheet = $("sheet-stretch-video");
  if (sheet) {
    sheet.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
  }
  const frame = $("stretch-video-frame");
  if (frame) {
    frame.src = "about:blank";
    frame.removeAttribute("title");
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

export { STRETCHES, FLASHCARDS, GROUPS, DISCLAIMER, STYLES };
