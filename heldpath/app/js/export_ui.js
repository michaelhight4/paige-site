/**
 * Share card and GPX/course export buttons.
 *
 * Kept out of app.js (apart from one init hook) so the post-run summary and
 * course sheets only gain two small controls. The actual GPX drawing lives in
 * export_activities.js and the image card in share_card.js. Existing plan
 * export (.paceplan) and course/plan links are untouched.
 */
import { exportActivityGpx, exportCourseGpx } from "./export_activities.js";
import { shareActivityCard } from "./share_card.js";

function $(id) {
  return document.getElementById(id);
}

function setNote(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

export function initExportUi({ getSummary, getCourse, units = () => "mi" } = {}) {
  const summaryCard = $("btn-summary-share-card");
  if (summaryCard) {
    summaryCard.addEventListener("click", async () => {
      const summary = typeof getSummary === "function" ? getSummary() : null;
      if (!summary || !summary.act) return;
      setNote("summary-export-status", "Opening the share sheet…");
      try {
        const res = await shareActivityCard({
          activity: summary.act,
          course: summary.course,
          units: units(),
          sectors: (summary.legResult && summary.legResult.legs) || [],
        });
        setNote("summary-export-status", res.ok
          ? (res.shared ? "Card shared from this phone." : `Card saved as ${res.name}.`)
          : (res.cancelled ? "" : (res.reason || "Could not share the card here.")));
      } catch (err) {
        setNote("summary-export-status", `Could not share the card: ${String(err && err.message ? err.message : err)}`);
      }
    });
  }

  const summaryGpx = $("btn-summary-export-gpx");
  if (summaryGpx) {
    summaryGpx.addEventListener("click", async () => {
      const summary = typeof getSummary === "function" ? getSummary() : null;
      if (!summary || !summary.act) return;
      setNote("summary-export-status", "Preparing the GPX file…");
      try {
        const res = await exportActivityGpx(summary.act);
        setNote("summary-export-status", res.ok
          ? `GPX saved as ${res.name}${res.where === "Documents" ? " in Documents" : ""}.`
          : (res.reason || "Could not export the GPX here."));
      } catch (err) {
        setNote("summary-export-status", `Could not export the GPX: ${String(err && err.message ? err.message : err)}`);
      }
    });
  }

  const courseGpx = $("btn-course-export-gpx");
  if (courseGpx) {
    courseGpx.addEventListener("click", async () => {
      const course = typeof getCourse === "function" ? getCourse() : null;
      if (!course) return;
      setNote("course-export-status", "Preparing the course file…");
      try {
        const res = await exportCourseGpx(course);
        setNote("course-export-status", res.ok
          ? `Course saved as ${res.name}${res.where === "Documents" ? " in Documents" : ""}.`
          : (res.reason || "Could not export the course here."));
      } catch (err) {
        setNote("course-export-status", `Could not export the course: ${String(err && err.message ? err.message : err)}`);
      }
    });
  }

  const courseCard = $("btn-course-share-card");
  if (courseCard) {
    courseCard.addEventListener("click", async () => {
      const course = typeof getCourse === "function" ? getCourse() : null;
      if (!course) return;
      setNote("course-export-status", "Opening the share sheet…");
      try {
        const res = await shareActivityCard({ course, units: units() });
        setNote("course-export-status", res.ok
          ? (res.shared ? "Card shared from this phone." : `Card saved as ${res.name}.`)
          : (res.cancelled ? "" : (res.reason || "Could not share the card here.")));
      } catch (err) {
        setNote("course-export-status", `Could not share the card: ${String(err && err.message ? err.message : err)}`);
      }
    });
  }
}
