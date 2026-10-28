// Small pieces of minigame logic PORTED (rewritten in plain JS, no Phaser) from two MIT-licensed repos. Kilumen sports, Oct 28 2026.
//
// (A) sausi-7/games  games/racing/straight-rush/mechanics.js  (github.com/sausi-7/games, commit on main as of 2026-10-28)
//     MIT License, Copyright (c) 2026 Saurabh Singh. Permission is hereby granted, free of charge, to any person obtaining a copy
//     of this software ... The above copyright notice and this permission notice shall be included in all copies or substantial
//     portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND. (full text: THIRD_PARTY_LICENSES)
//     Ported: the ping-pong aim meter (angle += rotateSpeed * dir, flip dir at the limits) -> pingPong(); used for the push and
//     sprint timing bars.
//
// (B) channingbreeze/games  marathon/js/main.js  (github.com/channingbreeze/games, master)
//     MIT License (repo licence per GitHub; the repo's license.txt is the MIT text with "Copyright (c) 2018 Richard Davey,
//     Photon Storm Ltd."). Same MIT permission notice applies (full text: THIRD_PARTY_LICENSES).
//     Ported: walk animation rate tied to running speed (animations.play('move', gameSpeed)) -> walkFrame(); the two-layer
//     parallax with the ground scrolling at 2x the background (bg.autoScroll(-s*15) / ground.autoScroll(-s*30)) -> parallax();
//     and the speed clamp checkSpeed() -> clampSpeed().

/** Marker position 0..1 bouncing between the ends; t seconds, rate = full sweeps per second (A). */
export function pingPong(t, rate = 1.1) {
  const p = (t * rate) % 2;
  return p < 1 ? p : 2 - p;
}
/** Walk-sheet frame (0..3) from distance run: faster runner = faster legs (B). stride: metres per frame. */
export const walkFrame = (x, stride = 0.55) => Math.floor(x / stride) % 4;
/** Offsets for the far (stands) and near (ground) layers for camera position camX px (B: near = 2x far). */
export const parallax = (camX) => ({ far: -camX * 0.5, near: -camX });
/** (B) speed clamp. */
export const clampSpeed = (v, min, max) => (v < min ? min : v > max ? max : v);
