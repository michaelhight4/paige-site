#!/usr/bin/env node
// Headless BeepBox render (Oct 22, 2026). Tool-side only: BeepBox (MIT, John Nesky) runs from
// vendor_staging/audio/beepbox (npm beepbox 4.2.0) and is NOT shipped; only our own rendered audio ships.
// Usage: node tools/audio/render_beepbox.mjs [town route battle | path/to/song.json | "https://www.beepbox.co/#9n31..."]
//   -> audio/src/<id>.beepbox.json (editable JSON), audio/src/<id>.url.txt (open in beepbox.co to edit by ear),
//      /tmp/kil_audio_build/<id>.wav (44.1 kHz 16-bit stereo, exactly one loop, loop-clean), then run encode.sh.
// Loop-clean: the synth plays the loop 3 times; we keep the 2nd pass, so reverb / echo / release tails from the end
// of the loop are already inside its start (no dry restart). Noise drums are random and chip oscillator phase runs on,
// so pass 3 is not bit-identical to pass 2: the first 20 ms of the kept pass are crossfaded from the start of pass 3
// (the synth's own continuation of the last sample) into pass 2, so last-sample -> first-sample is continuous.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { Song, Synth } = await import(join(ROOT, 'vendor_staging/audio/beepbox/package/esm/synth/index.js'));
const { compose } = await import('./compose.mjs');
const { SONGS } = await import('./songs.mjs');
const OUT = process.env.OUT || '/tmp/kil_audio_build'; mkdirSync(OUT, { recursive: true }); mkdirSync(join(ROOT, 'audio/src'), { recursive: true });
const RATE = 44100, PEAK = 0.89; // -1 dBFS

function wav16(L, R) {
  const n = L.length, b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(RATE, 24); b.writeUInt32LE(RATE * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4); b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4); }
  return b;
}

export function render(song) {
  const synth = new Synth(song); synth.samplesPerSecond = RATE; synth.loopRepeatCount = -1; synth.warmUpSynthesizer(song);
  const loop = Math.round(synth.getSamplesPerBar() * song.loopLength), total = loop * 3;
  const L = new Float32Array(total), R = new Float32Array(total);
  const CH = 4096; for (let o = 0; o < total; o += CH) { const n = Math.min(CH, total - o); const l = new Float32Array(n), r = new Float32Array(n); synth.synthesize(l, r, n, true); L.set(l, o); R.set(r, o); }
  const l2 = L.slice(loop, 2 * loop), r2 = R.slice(loop, 2 * loop);
  const XF = Math.round(RATE * 0.02);
  for (let i = 0; i < XF; i++) { const w = i / XF; l2[i] = l2[i] * w + L[2 * loop + i] * (1 - w); r2[i] = r2[i] * w + R[2 * loop + i] * (1 - w); }
  let peak = 0; for (let i = 0; i < loop; i++) peak = Math.max(peak, Math.abs(l2[i]), Math.abs(r2[i]));
  const g = PEAK / (peak || 1); for (let i = 0; i < loop; i++) { l2[i] *= g; r2[i] *= g; }
  const seam = Math.max(Math.abs(l2[loop - 1] - l2[0]), Math.abs(r2[loop - 1] - r2[0]));
  const natural = Math.max(Math.abs(L[2 * loop] - L[2 * loop - 1]), Math.abs(R[2 * loop] - R[2 * loop - 1])) * g; // same boundary inside the synth's own 3-pass render
  let step = 0; for (let i = 1; i < loop; i++) step += Math.abs(l2[i] - l2[i - 1]); step /= loop - 1;
  return { L: l2, R: r2, seconds: loop / RATE, samples: loop, gain: g, seamJump: seam, naturalJump: natural, meanStep: step };
}

const args = process.argv.slice(2); const ids = args.length ? args : Object.keys(SONGS);
for (const a of ids) {
  let id, song = new Song();
  if (SONGS[a]) { id = a; song.fromJsonObject(compose(a)); }
  else if (/^https?:/.test(a)) { id = 'url_' + Date.now(); song.fromBase64String(a.split('#')[1]); }
  else if (existsSync(a)) { id = basename(a).replace(/\.(beepbox\.)?json$/, ''); song.fromJsonObject(JSON.parse(readFileSync(a, 'utf8'))); }
  else throw new Error('unknown song ' + a);
  writeFileSync(join(ROOT, 'audio/src', `${id}.beepbox.json`), JSON.stringify(song.toJsonObject(), null, 1));
  writeFileSync(join(ROOT, 'audio/src', `${id}.url.txt`), `https://www.beepbox.co/#${song.toBase64String()}\n`);
  const r = render(song);
  writeFileSync(join(OUT, `${id}.wav`), wav16(r.L, r.R));
  const ok = r.seamJump <= r.naturalJump + 1e-4 || r.seamJump < Math.max(0.02, 4 * r.meanStep); // the wrap is no bigger than the synth's own pass2->pass3 step
  console.log(JSON.stringify({ id, title: SONGS[id]?.title, seconds: +r.seconds.toFixed(2), samples: r.samples, gain: +r.gain.toFixed(2), seamJump: +r.seamJump.toFixed(4), naturalJump: +r.naturalJump.toFixed(4), meanStep: +r.meanStep.toFixed(4), loopClean: ok }));
  if (!ok) process.exitCode = 1;
}
