#!/usr/bin/env node
// DRAFT SFX sprite (Oct 22, 2026; original sounds, Gary can veto). Tool-side only: jsfxr 1.4.1 (Unlicense / public
// domain, chr15m) runs from vendor_staging/audio/jsfxr and is NOT shipped; only the rendered sprite ships.
// Usage: [OUT=dir] node tools/audio/make_sfx.mjs  -> /tmp/kil_audio_build/kil_sfx_draft.wav + audio/sfx/kil_sfx_draft.json
//   (sprite map, ms) then tools/audio/encode.sh writes audio/sfx/kil_sfx_draft.ogg + .m4a.
// sfxr times: env length in samples = p^2 * 100000 (0.1 -> 23 ms, 0.3 -> 204 ms).
// Each sound is a hand-set sfxr parameter block (not a random preset), so it is reproducible; Math.random is seeded
// for the noise channel. Paste any block into https://sfxr.me (JSON import) to audition / tweak by ear.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let seed = 0x6b696c; Math.random = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const { jsfxr } = await import(join(ROOT, 'vendor_staging/audio/jsfxr/package/sfxr.mjs'));
const OUT = process.env.OUT || '/tmp/kil_audio_build'; mkdirSync(OUT, { recursive: true });
const RATE = 44100, GAP = 0.1; // 100 ms silence before each sound and at the end (AAC priming / decoder slop margin)

const SQUARE = 0, SAW = 1, SINE = 2, NOISE = 3;
const base = { p_env_attack: 0, p_env_sustain: 0.05, p_env_punch: 0, p_env_decay: 0.1, p_base_freq: 0.4, p_freq_limit: 0, p_freq_ramp: 0, p_freq_dramp: 0,
  p_vib_strength: 0, p_vib_speed: 0, p_arp_mod: 0, p_arp_speed: 0, p_duty: 0.5, p_duty_ramp: 0, p_repeat_speed: 0, p_pha_offset: 0, p_pha_ramp: 0,
  p_lpf_freq: 1, p_lpf_ramp: 0, p_lpf_resonance: 0, p_hpf_freq: 0, p_hpf_ramp: 0, sound_vol: 0.5, sample_rate: RATE, sample_size: 16 };
// level = target peak (dBFS) after normalising: frequent UI ticks sit lower than one-shot events.
export const SFX = {
  cursor: { level: -10, p: { wave_type: SQUARE, p_base_freq: 0.56, p_env_sustain: 0.08, p_env_decay: 0.18, p_duty: 0.5, p_hpf_freq: 0.12 } },
  select: { level: -6, p: { wave_type: SQUARE, p_base_freq: 0.44, p_env_sustain: 0.15, p_env_punch: 0.3, p_env_decay: 0.3, p_duty: 0.25, p_arp_mod: 0.36, p_arp_speed: 0.62 } },
  back:   { level: -7, p: { wave_type: SQUARE, p_base_freq: 0.46, p_env_sustain: 0.1, p_env_decay: 0.25, p_duty: 0.5, p_freq_ramp: -0.24, p_hpf_freq: 0.05 } },
  door:   { level: -5, p: { wave_type: NOISE, p_base_freq: 0.11, p_env_sustain: 0.2, p_env_punch: 0.45, p_env_decay: 0.4, p_freq_ramp: -0.08, p_lpf_freq: 0.32, p_lpf_ramp: -0.05 } },
  grass:  { level: -9, p: { wave_type: NOISE, p_base_freq: 0.55, p_env_attack: 0.08, p_env_sustain: 0.1, p_env_decay: 0.25, p_hpf_freq: 0.28, p_lpf_freq: 0.72, p_freq_ramp: -0.05 } },
  blip:   { level: -13, p: { wave_type: SQUARE, p_base_freq: 0.5, p_env_sustain: 0.06, p_env_decay: 0.14, p_duty: 0.5, p_hpf_freq: 0.15 } },
  save:   { level: -5, p: { wave_type: SINE, p_base_freq: 0.34, p_env_sustain: 0.3, p_env_punch: 0.25, p_env_decay: 0.5, p_arp_mod: 0.32, p_arp_speed: 0.55, p_repeat_speed: 0.62, p_vib_strength: 0.05, p_vib_speed: 0.4 } },
  // catch (Oct 22, 2026): original rising three-note chime (E5, G5, then a held C6 with a soft shimmer), ~0.75 s, for the
  // battle 'Caught!' celebration. Layered: each layer is a full sfxr block started `at` seconds in (mixed, then normalised).
  catch:  { level: -5, layers: [
    { at: 0, p: { wave_type: SQUARE, p_base_freq: 0.431, p_env_sustain: 0.12, p_env_punch: 0.35, p_env_decay: 0.22, p_duty: 0.35, p_hpf_freq: 0.06 } },
    { at: 0.1, p: { wave_type: SQUARE, p_base_freq: 0.4703, p_env_sustain: 0.12, p_env_punch: 0.35, p_env_decay: 0.22, p_duty: 0.35, p_hpf_freq: 0.06 } },
    { at: 0.2, p: { wave_type: SINE, p_base_freq: 0.5439, p_env_sustain: 0.28, p_env_punch: 0.4, p_env_decay: 0.42, p_vib_strength: 0.06, p_vib_speed: 0.5 } },
    { at: 0.2, p: { wave_type: SQUARE, p_base_freq: 0.5439, p_env_sustain: 0.1, p_env_decay: 0.3, p_duty: 0.2, p_arp_mod: 0.3, p_arp_speed: 0.7, p_repeat_speed: 0.7, sound_vol: 0.22, p_hpf_freq: 0.1 } },
  ] },
};

function render(def) {
  const P = new jsfxr.Params(); P.fromJSON(def); P.sample_rate = RATE; P.sample_size = 16;
  return Float32Array.from(new jsfxr.SoundEffect(P).getRawBuffer().normalized);
}

const parts = [], map = {}; let t = GAP * RATE;
const zero = (n) => new Float32Array(Math.round(n));
parts.push(zero(t));
const mix = (layers) => { // layered sound: each layer is a full block (merged over base) placed `at` seconds in
  const rs = layers.map((l) => [Math.round(l.at * RATE), render({ ...base, ...l.p })]);
  const out = new Float32Array(Math.max(...rs.map(([o, f]) => o + f.length)));
  for (const [o, f] of rs) for (let i = 0; i < f.length; i++) out[o + i] += f[i];
  return out;
};
for (const [id, { level, p, layers }] of Object.entries(SFX)) {
  const f = layers ? mix(layers) : render({ ...base, ...p });
  if (!f.length) throw new Error('empty ' + id);
  let pk = 0; for (const v of f) pk = Math.max(pk, Math.abs(v));
  const g = 10 ** (level / 20) / (pk || 1); for (let i = 0; i < f.length; i++) f[i] *= g;
  const fade = Math.min(f.length, Math.round(RATE * 0.004)); for (let i = 0; i < fade; i++) f[f.length - 1 - i] *= i / fade; // no end click
  map[id] = [Math.round((t / RATE) * 1000), Math.ceil((f.length / RATE) * 1000)];
  parts.push(f, zero(GAP * RATE)); t += f.length + Math.round(GAP * RATE);
}
const n = parts.reduce((a, p) => a + p.length, 0), all = new Float32Array(n); let o = 0; for (const p of parts) { all.set(p, o); o += p.length; }
const b = Buffer.alloc(44 + n * 2);
b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
b.writeUInt32LE(RATE, 24); b.writeUInt32LE(RATE * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, all[i])) * 32767), 44 + i * 2);
writeFileSync(join(OUT, 'kil_sfx_draft.wav'), b);
mkdirSync(join(ROOT, 'audio/sfx'), { recursive: true });
writeFileSync(join(ROOT, 'audio/sfx/kil_sfx_draft.json'), JSON.stringify({ note: 'DRAFT sprite map [offset ms, duration ms]; generated by tools/audio/make_sfx.mjs', sprite: map, params: Object.fromEntries(Object.entries(SFX).map(([k, v]) => [k, v.layers ? v.layers.map((l) => ({ at: l.at, ...base, ...l.p })) : { ...base, ...v.p }])) }, null, 1));
console.log(JSON.stringify({ seconds: +(n / RATE).toFixed(3), sprite: map }));
