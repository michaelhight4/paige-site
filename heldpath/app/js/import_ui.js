/**
 * Settings → Import activities, plus the short review sheet.
 *
 * The parsing and dedupe rules live in import_activities.js. This file only
 * wires the file picker, the review list and the sport picker, then applies
 * the accepted rows to the existing on-device activity list. No account and
 * no upload: files are read with the browser/WebView file API.
 */
import { reviewImport, applyImportRows, IMPORT_HELP } from "./import_activities.js";

function $(id) {
  return document.getElementById(id);
}

function statusText(review) {
  const bits = [];
  if (review.imported) bits.push(`${review.imported} ready`);
  if (review.duplicates) bits.push(`${review.duplicates} already here`);
  if (review.unreadable) bits.push(`${review.unreadable} unreadable`);
  if (review.needsType) bits.push(`${review.needsType} need a sport`);
  return bits.join(" · ") || "No activity files found.";
}

function rowTitle(row) {
  const act = row.activity || {};
  const when = act.startedAt ? new Date(act.startedAt) : null;
  const day = when && Number.isFinite(when.getTime())
    ? when.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";
  return [row.name ? String(row.name).split("/").pop().slice(0, 46) : "", day].filter(Boolean).join(" · ");
}

function rowSub(row) {
  const act = row.activity;
  if (!act) return row.detail || "This file could not be read.";
  const km = Number(act.distanceMeters) > 0
    ? (act.distanceMeters >= 1000 ? `${(act.distanceMeters / 1000).toFixed(2)} km` : `${Math.round(act.distanceMeters)} m`)
    : "distance unknown";
  const sec = Number(act.elapsedSec) > 0 ? `${Math.round(act.elapsedSec / 60)} min` : "time unknown";
  return `${km} · ${sec} · ${String(row.format || "").toUpperCase()}`;
}

function badge(row) {
  if (row.status === "new") return "Ready";
  if (row.status === "replace") return "Replaces a thinner copy";
  if (row.status === "duplicate") return "Already on this phone";
  return "Unreadable";
}

export function initImportUi({ getState, persist, units = () => "mi", onChanged = () => {} } = {}) {
  const input = $("import-activity-files");
  const button = $("btn-import-activities");
  const status = $("import-activity-status");
  const sheet = $("sheet-import-review");
  if (!input || !button || !sheet) return;

  const help = $("import-help");
  if (help) help.textContent = IMPORT_HELP.join("\n");
  const helpButton = $("btn-import-help");
  const helpWrap = $("import-help-wrap");
  if (helpButton && helpWrap) {
    helpButton.addEventListener("click", () => {
      helpWrap.hidden = !helpWrap.hidden;
      helpButton.textContent = helpWrap.hidden ? "Where to get your files" : "Hide export help";
    });
  }
  button.addEventListener("click", () => input.click());

  let rows = [];
  let busy = false;

  function closeSheet() {
    sheet.classList.remove("open");
  }

  function renderRows() {
    const list = $("import-review-list");
    if (!list) return;
    list.innerHTML = "";
    for (const row of rows) {
      if (row.status === "unreadable") {
        const el = document.createElement("div");
        el.className = "import-row";
        el.innerHTML = `<strong></strong><p class="tiny"></p>`;
        el.querySelector("strong").textContent = rowTitle(row);
        el.querySelector("p").textContent = `${badge(row)}. ${rowSub(row)}`;
        el.style.cssText = "padding:12px 0;border-bottom:1px solid var(--line)";
        list.appendChild(el);
        continue;
      }
      const el = document.createElement("div");
      el.className = "import-row";
      el.style.cssText = "padding:12px 0;border-bottom:1px solid var(--line)";
      el.innerHTML = `<div class="row" style="display:flex;gap:12px;align-items:flex-start"><div class="grow" style="flex:1;min-width:0"><strong></strong><p class="tiny" style="margin-top:4px"></p></div><span class="tiny" style="color:var(--blue);white-space:nowrap"></span></div>`;
      el.querySelector("strong").textContent = rowTitle(row) || "Activity";
      el.querySelector("p").textContent = rowSub(row);
      el.querySelector("span").textContent = badge(row);
      if (row.status !== "duplicate" && row.needsType) {
        const field = document.createElement("div");
        field.className = "field";
        field.style.cssText = "margin:10px 0 0";
        const label = document.createElement("label");
        label.textContent = "Sport (this file does not say)";
        const select = document.createElement("select");
        for (const [value, text] of [["walk", "Walk"], ["run", "Run"], ["ride", "Ride"]]) {
          const opt = document.createElement("option");
          opt.value = value;
          opt.textContent = text;
          if (value === (row.activity && row.activity.type)) opt.selected = true;
          select.appendChild(opt);
        }
        const id = `import-sport-${rows.indexOf(row)}`;
        select.id = id;
        label.setAttribute("for", id);
        select.addEventListener("change", () => {
          row.activity.type = select.value;
          row.needsType = false;
          renderRows();
        });
        field.appendChild(label);
        field.appendChild(select);
        el.appendChild(field);
      }
      list.appendChild(el);
    }
    const sub = $("import-review-sub");
    if (sub) sub.textContent = statusText({
      imported: rows.filter((r) => r.status === "new" || r.status === "replace").length,
      duplicates: rows.filter((r) => r.status === "duplicate").length,
      unreadable: rows.filter((r) => r.status === "unreadable").length,
      needsType: rows.filter((r) => r.status !== "unreadable" && r.needsType).length,
    });
    const apply = $("btn-import-apply");
    if (apply) {
      const n = rows.filter((r) => r.status === "new" || r.status === "replace").length;
      apply.textContent = n ? `Add ${n} ${n === 1 ? "activity" : "activities"}` : "Nothing to add";
      apply.disabled = !n;
    }
  }

  async function readFiles(files) {
    if (busy || !files || !files.length) return;
    busy = true;
    if (status) status.textContent = `Reading ${files.length} ${files.length === 1 ? "file" : "files"} on this phone…`;
    const items = [];
    for (const file of Array.from(files)) {
      try {
        items.push({ name: file.name || "activity", bytes: new Uint8Array(await file.arrayBuffer()) });
      } catch {
        items.push({ name: file.name || "activity", bytes: new Uint8Array() });
      }
    }
    let review;
    try {
      review = await reviewImport(items, { existing: (getState().activities || []).slice(), defaultType: null });
    } catch (err) {
      if (status) status.textContent = `Could not read those files: ${String(err && err.message ? err.message : err)}`;
      busy = false;
      return;
    }
    rows = review.rows || [];
    busy = false;
    renderRows();
    if (!rows.length) {
      if (status) status.textContent = "No GPX, TCX, FIT or zip activity files were found in that selection.";
      return;
    }
    sheet.classList.add("open");
  }

  input.addEventListener("change", () => {
    const files = input.files ? Array.from(input.files) : [];
    input.value = "";
    readFiles(files).catch(() => {});
  });

  const apply = $("btn-import-apply");
  if (apply) {
    apply.addEventListener("click", () => {
      const state = getState();
      const result = applyImportRows(rows, state.activities || []);
      state.activities = result.activities;
      persist();
      closeSheet();
      if (status) {
        const bits = [`Added ${result.added.length} ${result.added.length === 1 ? "activity" : "activities"}.`];
        if (result.replaced.length) bits.push(`${result.replaced.length} thinner copy replaced.`);
        const dup = rows.filter((r) => r.status === "duplicate").length;
        if (dup) bits.push(`${dup} duplicate ${dup === 1 ? "was" : "were"} skipped.`);
        status.textContent = bits.join(" ");
      }
      if (typeof onChanged === "function") onChanged(result);
    });
  }
  const cancel = $("btn-import-cancel");
  if (cancel) cancel.addEventListener("click", closeSheet);
  const back = sheet.querySelector(".sheet-back-close");
  if (back) back.addEventListener("click", closeSheet);
}
