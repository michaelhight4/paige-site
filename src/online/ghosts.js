// Remote players drawn as "ghosts": the player sheet at reduced opacity, animated from the
// interpolated distance they travel (same frame rules as movement.js frame()).
import { ANIM, SHEET_ROW, TILE } from '../overworld/constants.js';

const fade = new WeakMap();
/** A translucent copy of a sheet (the renderer has no per-actor alpha). Cached per source image. */
export function ghostSheet(img, alpha = 0.72) {
  if (!img || typeof document === 'undefined') return img;
  let c = fade.get(img);
  if (!c) {
    c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.globalAlpha = alpha; g.drawImage(img, 0, 0);
    fade.set(img, c);
  }
  return c;
}

/** Sheet column for a ghost: anim 'walk'|'run'|'bike', moving flag, distance travelled in native px. */
export function ghostCol(anim, moving, dist) {
  if (anim === 'bike') return moving ? 1 + (Math.floor(dist / ANIM.bike.pxPerFrame) % ANIM.bike.frames) : 0;
  if (anim === 'run' && moving) return Math.floor(dist / ANIM.run.pxPerFrame) % ANIM.run.frames;
  return moving ? 1 + (Math.floor(dist / ANIM.walk.pxPerFrame) % ANIM.walk.frames) : 0;
}

/** Build a renderer actor for a sampled ghost, borrowing the scene's own player sheets. */
export function ghostActor(scene, s, dist, grade) {
  const imgs = scene.playerImgs || {}, imgs1 = scene.playerImgs1 || {};
  let anim = s.a === 'run' || s.a === 'bike' ? s.a : 'walk';
  if (!imgs[anim] && !imgs1[anim]) anim = 'walk';
  if (!s.moving && anim === 'run') anim = 'walk'; // idle uses the walk stand frame
  const sheet = scene._sheet(imgs[anim], imgs1[anim], grade);
  let col = ghostCol(anim, s.moving, dist);
  if (anim === 'walk') col = Math.min(col, 4);
  return { img: ghostSheet(sheet.img), sheetScale: sheet.sheetScale, col, row: SHEET_ROW[s.f] ?? 0, px: s.px, py: s.py, lift: s.l || 0, feet: s.py + TILE, order: 0, ghost: true };
}
