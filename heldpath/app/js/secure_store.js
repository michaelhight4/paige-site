/**
 * Android Keystore-backed store for activity data. Web and Node fall
 * back to in-memory / localStorage (local only; nothing is uploaded).
 * Never logs the payload.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";

const Native = registerPlugin("HeldpathSecureStore");

export function isSecureStoreAvailable() {
  try {
    return !!(Capacitor.isNativePlatform() && Native && typeof Native.get === "function");
  } catch {
    return false;
  }
}

export async function secureGet(key) {
  if (!isSecureStoreAvailable()) return null;
  try {
    const res = await Native.get({ key });
    return res && res.value != null ? String(res.value) : null;
  } catch {
    return null;
  }
}

export async function secureSet(key, value) {
  if (!isSecureStoreAvailable()) return false;
  try {
    await Native.set({ key, value: value == null ? null : String(value) });
    return true;
  } catch {
    return false;
  }
}

export async function secureRemove(key) {
  if (!isSecureStoreAvailable()) return false;
  try {
    await Native.remove({ key });
    return true;
  } catch {
    return false;
  }
}

/** On-device signing check. Never phones home. */
export async function verifyAppSignature() {
  if (!isSecureStoreAvailable() || typeof Native.verifySignature !== "function") {
    return { ok: true, skipped: true, debug: true };
  }
  try {
    const res = await Native.verifySignature();
    return {
      ok: res && res.ok !== false,
      skipped: !!(res && res.skipped),
      debug: !!(res && res.debug),
    };
  } catch {
    return { ok: false, skipped: false, debug: false };
  }
}
