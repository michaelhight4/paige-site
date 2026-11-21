/**
 * Optional password protection for a user-initiated export.
 * Uses PBKDF2 + AES-GCM in Web Crypto. The raw zip is unencrypted
 * unless the user types a password.
 */
const MAGIC = "HPENC1";

export const EXPORT_UNENCRYPTED_WARNING =
  "This export is not encrypted. Anyone with the file can read your activities, courses, and routes. You can set a password to protect it. Heldpath never uploads the file.";

export const EXPORT_PASSWORD_PROMPT =
  "Optional: type a password to encrypt this export on this phone. Leave it blank to save an unencrypted zip. You will need this password to open a protected export. We cannot recover it.";

function toU8(s) {
  return new TextEncoder().encode(s);
}

async function deriveKey(password, salt) {
  const base = await crypto.subtle.importKey("raw", toU8(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Wrap a zip (or any bytes) with a password. Returns a .hpenc body.
 */
export async function encryptExport(bytes, password) {
  if (!password) return { bytes, encrypted: false, ext: ".zip" };
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, input));
  const magic = toU8(MAGIC);
  const out = new Uint8Array(magic.length + 16 + 12 + cipher.length);
  out.set(magic, 0);
  out.set(salt, magic.length);
  out.set(iv, magic.length + 16);
  out.set(cipher, magic.length + 16 + 12);
  return { bytes: out, encrypted: true, ext: ".hpenc" };
}

export async function decryptExport(bytes, password) {
  const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const magic = toU8(MAGIC);
  for (let i = 0; i < magic.length; i++) {
    if (input[i] !== magic[i]) throw new Error("not a protected Heldpath export");
  }
  const salt = input.slice(magic.length, magic.length + 16);
  const iv = input.slice(magic.length + 16, magic.length + 16 + 12);
  const cipher = input.slice(magic.length + 16 + 12);
  const key = await deriveKey(password, salt);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return new Uint8Array(plain);
}
