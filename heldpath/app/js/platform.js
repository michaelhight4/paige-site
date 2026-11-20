import { Capacitor } from "@capacitor/core";

export function isNative() {
  return Capacitor.isNativePlatform();
}

export function isWeb() {
  return !isNative();
}

export function applyPlatformVisibility() {
  const native = isNative();
  document.documentElement.classList.toggle("is-native", native);
  document.documentElement.classList.toggle("is-web", !native);
  document.querySelectorAll(".native-only").forEach((el) => {
    el.hidden = !native;
  });
  document.querySelectorAll(".web-only").forEach((el) => {
    el.hidden = native;
  });
}

export function registerServiceWorker() {
  if (isNative()) return;
  if (!("serviceWorker" in navigator)) return;
  if (navigator.webdriver) return;
  if (new URLSearchParams(location.search).has("nosw")) return;
  const url = "sw.js";
  navigator.serviceWorker.register(url).then((reg) => {
    // Ask for a fresh worker so a version bump is not stuck behind Safari's cache.
    try { reg.update(); } catch { /* ignore */ }
  }).catch((err) => {
    console.warn("service worker", err && err.message);
  });
}

let wakeLock = null;
let wantWakeLock = false;

async function acquire() {
  if (!wantWakeLock || isNative()) return;
  if (!("wakeLock" in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => {
      wakeLock = null;
    });
  } catch (err) {
    // Browser may deny if the document is hidden or the permission is blocked.
    console.warn("wake lock", err && err.message);
  }
}

function onVisibility() {
  if (document.visibilityState === "visible" && wantWakeLock && !wakeLock) acquire();
}

export async function requestWakeLock() {
  wantWakeLock = true;
  document.addEventListener("visibilitychange", onVisibility);
  await acquire();
}

export async function releaseWakeLock() {
  wantWakeLock = false;
  document.removeEventListener("visibilitychange", onVisibility);
  try {
    if (wakeLock) await wakeLock.release();
  } catch { /* ignore */ }
  wakeLock = null;
}

let deferredInstall = null;
export function listenForInstallPrompt() {
  if (isNative()) return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstall = e;
    window.dispatchEvent(new CustomEvent("heldpath-install-available"));
  });
  window.addEventListener("appinstalled", () => {
    deferredInstall = null;
  });
}

export function canPromptInstall() {
  return !!deferredInstall;
}

export async function promptInstall() {
  if (!deferredInstall) {
    return { ok: false, reason: "unavailable" };
  }
  deferredInstall.prompt();
  const choice = await deferredInstall.userChoice;
  deferredInstall = null;
  return { ok: choice.outcome === "accepted", reason: choice.outcome };
}

export const WEB_APP_NOTE =
  "For screen-off tracking and health sync, get the app from Google Play";
export const WEB_PAY_NOTE =
  "Purchases aren't available in the web app yet. The optional $5 donation and $2 plans will stay in the store app for now.";
