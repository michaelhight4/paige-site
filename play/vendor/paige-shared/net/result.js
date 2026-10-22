// VENDORED from paige-shared — do not edit; run `npm run sync` in /workspace/paige-shared.
export const ok = (value) => ({ ok: true, value });
export const err = (error, offline = false) => ({ ok: false, error, offline });
