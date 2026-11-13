// Kilumen DRAFT music sources (Oct 22, 2026; bot-written, original; Gary can veto). Tool-side only, never shipped.
// Each song is a tiny text score that compose() turns into BeepBox JSON (song.toJsonObject format, version 9).
// Score tokens: NOTE:steps (NOTE = C4, F#5, Bb3; 4 steps = 1 beat), "-:steps" = rest, "A3+C4+E4:16" = chord.
// Optional ">v" after the steps sets a fade to volume v (0-100) by the end of the note: "C5:4>30" = plucky decay.
// Drum tokens use BeepBox noise pitches 0-11 instead of note names: "k" kick, "s" snare, "h" hat (see DRUM below).
// Nothing here copies any existing game's melody, data or text; progressions are common-practice (I-vi-IV-V etc.).

export const DRUM = { k: 1, s: 6, h: 11, o: 9 };

const chord = { F: ['F3', 'A3', 'C4'], Am: ['A3', 'C4', 'E4'], Bb: ['Bb3', 'D4', 'F4'], C: ['C4', 'E4', 'G4'], Gm: ['G3', 'Bb3', 'D4'], Dm: ['D4', 'F4', 'A4'],
  D: ['D4', 'F#4', 'A4'], A: ['A3', 'C#4', 'E4'], Bm: ['B3', 'D4', 'F#4'], G: ['G3', 'B3', 'D4'], Em: ['E4', 'G4', 'B4'], E: ['E4', 'G#4', 'B4'],
  'C#m': ['C#4', 'E4', 'G#4'], 'G#m': ['G#3', 'B3', 'D#4'], 'F#m': ['F#3', 'A3', 'C#4'], B: ['B3', 'D#4', 'F#4'] };
const root = { F: 'F2', Am: 'A2', Bb: 'Bb2', C: 'C3', Gm: 'G2', Dm: 'D3', D: 'D2', A: 'A2', Bm: 'B2', G: 'G2', Em: 'E2', E: 'E2', 'C#m': 'C#3', 'G#m': 'G#2', 'F#m': 'F#2', B: 'B2' };
const up = (n, semis) => { const m = midi(n) + semis; return m; };
export function midi(n) {
  if (typeof n === 'number') return n;
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n); if (!m) throw new Error('bad note ' + n);
  return 12 * (+m[3] + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const N = (x) => (typeof x === 'number' ? `M${x}` : x);

// --- generated accompaniment helpers (all per bar, 16 steps) ---
const bassWalk = (c) => { const r = midi(root[c]); return [`M${r}:4>60`, `M${r + 7}:4>60`, `M${r + 12}:4>60`, `M${r + 7}:4>60`].join(' '); };
const bassDrive = (c) => { const r = midi(root[c]); return [r, r, r + 12, r, r + 7, r, r + 12, r + 7].map((p) => `M${p}:2>40`).join(' '); };
const bassPump = (c) => { const r = midi(root[c]); return [r, r + 12, r, r + 12, r, r + 12, r, r + 12].map((p) => `M${p}:2>45`).join(' '); };
const broken = (c) => { const [a, b, d] = chord[c].map(midi); return [a, b, d, b, a + 12, d, b, d].map((p) => `M${p}:2>35`).join(' '); };
const stabs = (c) => { const ps = chord[c].map(midi).map((p) => `M${p}`).join('+'); return `-:2 ${ps}:2>20 -:2 ${ps}:2>20 -:2 ${ps}:2>20 -:2 ${ps}:2>20`; };
// Oct 27, 2026 town loops (Saltmere / Aurelith / Revival Heights): extra helpers.
const bassShanty = (c) => { const r = midi(root[c]); return `M${r}:6>50 M${r + 7}:2>40 M${r + 12}:4>50 M${r + 7}:4>50`; };
const oomPah = (c) => { const ps = chord[c].map(midi).map((p) => `M${p}`).join('+'); return `-:4 ${ps}:4>25 -:4 ${ps}:4>25`; };
const bassHold = (c) => { const r = midi(root[c]); return `M${r}:12>50 M${r + 7}:4>40`; };
const icicles = (c) => { const [a, b, d] = chord[c].map(midi).map((p) => p + 12); return [a, d, b + 12, d].map((p) => `M${p}:4>10`).join(' '); };
const padHold = (c) => `${chord[c].map(midi).map((p) => `M${p}`).join('+')}:16>40`;
const pad = (c) => `${chord[c].map(midi).map((p) => `M${p}`).join('+')}:16>70`;

export const SONGS = {
  town: {
    title: 'Brookhollow (DRAFT town loop)', bpm: 100, key: 'F', bars: 12,
    prog: 'F Am Bb C F Am Gm C Dm Bb Gm C',
    channels: [
      { name: 'lead', inst: { type: 'chip', wave: 'rounded', volume: 80, effects: ['vibrato', 'reverb'], vibrato: 'light', reverb: 35 },
        score: ['A4:4>70 C5:2 A4:2 G4:2 F4:2 G4:4>50', 'E4:4 A4:4 C5:6>40 -:2', 'D5:4 C5:2 Bb4:2 A4:4 F4:4>50', 'G4:8>40 E4:4 C4:4>40',
          'A4:4>70 C5:2 A4:2 G4:2 F4:2 A4:4>50', 'C5:4 E5:4 D5:2 C5:2 A4:4>50', 'Bb4:4 D5:4 C5:2 Bb4:2 G4:4>50', 'C5:6 Bb4:2 G4:4 E4:4>40',
          'F5:4 E5:2 D5:2 A4:8>40', 'Bb4:4 D5:4 F5:4 D5:4>50', 'D5:4 C5:2 Bb4:2 G4:4 Bb4:4>50', 'C5:4 Bb4:4 G4:4 E4:4>30'] },
      { name: 'harp', inst: { type: 'chip', wave: 'square', volume: 40, effects: ['reverb', 'panning'], reverb: 45, pan: -25 }, gen: broken },
      { name: 'bass', inst: { type: 'chip', wave: 'triangle', volume: 60, effects: [] }, gen: bassWalk },
      { name: 'shaker', drum: true, inst: { type: 'noise', wave: 'white', volume: 40, effects: ['panning'], pan: 25 },
        gen: () => '-:2 h:1>0 -:1 -:2 h:1>0 -:1 -:2 h:1>0 -:1 -:2 h:1>0 -:1' },
    ],
  },
  route: {
    title: 'Sunmeadow Fields (DRAFT route loop)', bpm: 132, key: 'D', bars: 16,
    prog: 'D A Bm G D A G A Bm G D A Bm G Em A',
    channels: [
      { name: 'lead', inst: { type: 'chip', wave: 'square', volume: 60, effects: ['vibrato', 'reverb', 'echo'], vibrato: 'delayed', reverb: 20, echoSustain: 25, echoDelayBeats: 0.75 },
        score: ['D5:2 F#5:2 A5:4 F#5:2 E5:2 D5:4', 'C#5:2 E5:2 A5:6 G5:2 F#5:2 E5:2', 'F#5:4 D5:2 B4:2 D5:4 F#5:4', 'G5:6 F#5:2 E5:4 D5:4',
          'D5:2 F#5:2 A5:4 B5:2 A5:2 F#5:4', 'E5:4 C#5:2 E5:2 A5:8>50', 'B5:4 A5:2 G5:2 F#5:4 D5:4', 'E5:12>40 -:4',
          'B4:2 D5:2 F#5:4 B5:4 A5:4', 'G5:4 F#5:2 G5:2 B5:8>50', 'A5:4 F#5:4 D5:4 F#5:4', 'E5:6 C#5:2 A4:8>40',
          'D5:2 C#5:2 B4:4 F#5:8>50', 'G5:2 A5:2 B5:4 D6:4 B5:4', 'G5:4 E5:4 B4:4 E5:4', 'C#5:4 E5:4 A5:4 G5:4'] },
      { name: 'stabs', inst: { type: 'chip', wave: '1/4 pulse', volume: 40, effects: ['chord type', 'reverb'], chord: 'simultaneous', reverb: 30 }, gen: stabs },
      { name: 'bass', inst: { type: 'chip', wave: 'triangle', volume: 60, effects: [] }, gen: bassDrive },
      { name: 'hat', drum: true, inst: { type: 'noise', wave: 'white', volume: 20, effects: [] }, gen: () => Array(8).fill('h:1>0 -:1').join(' ') },
      { name: 'kit', drum: true, inst: { type: 'noise', wave: 'retro', volume: 80, effects: [] },
        gen: (c, i) => (i % 4 === 3 ? 'k:2>0 -:2 s:2>0 -:2 k:2>0 k:2>0 s:1>0 s:1>0 s:2>0' : 'k:2>0 -:2 s:2>0 -:2 k:2>0 k:2>0 s:2>0 -:2') },
    ],
  },
  battle: {
    title: 'Wild clash (DRAFT battle loop)', bpm: 152, key: 'A', bars: 16,
    prog: 'Am F G Am Am F G E Dm F G Am Dm F E E',
    channels: [
      { name: 'lead', inst: { type: 'chip', wave: 'square', volume: 60, effects: ['vibrato', 'reverb'], vibrato: 'light', reverb: 15 },
        score: ['A4:2 C5:2 E5:4 D5:2 C5:2 B4:2 C5:2', 'A4:4 F4:4 A4:2 C5:2 F5:4', 'G5:4 F5:2 E5:2 D5:4 B4:4', 'C5:2 B4:2 A4:12>40',
          'E5:2 E5:2 A5:4 G5:2 E5:2 C5:4', 'F5:4 E5:2 D5:2 C5:4 A4:4', 'B4:2 C5:2 D5:4 G5:4 F5:4', 'E5:4 G#5:4 B5:4 G#5:4',
          'A5:4 F5:2 D5:2 A4:4 D5:4', 'C5:4 F5:4 A5:6 G5:2', 'F5:2 E5:2 D5:4 G5:4 B4:4', 'C5:4 E5:4 A5:8>50',
          'D5:2 F5:2 A5:4 G5:2 F5:2 E5:4', 'F5:2 G5:2 A5:4 C6:4 A5:4', 'B5:4 G#5:4 E5:4 D5:4', 'E5:2 F5:2 G#5:4 B5:6 -:2'] },
      { name: 'arp', inst: { type: 'chip', wave: '1/8 pulse', volume: 40, effects: ['chord type', 'panning'], chord: 'arpeggio', pan: 30 }, gen: pad },
      { name: 'bass', inst: { type: 'chip', wave: 'sawtooth', volume: 40, effects: [] }, gen: bassPump },
      { name: 'hat', drum: true, inst: { type: 'noise', wave: 'white', volume: 20, effects: [] }, gen: () => Array(8).fill('h:1>0 h:1>0').join(' ') },
      { name: 'kit', drum: true, inst: { type: 'noise', wave: 'retro', volume: 80, effects: [] },
        gen: (c, i) => (i === 15 ? 's:1>0 s:1>0 s:1>0 s:1>0 s:1>0 s:1>0 s:1>0 s:1>0 k:2>0 s:2>0 k:2>0 s:1>0 s:1>0' : 'k:2>0 -:2 s:2>0 k:2>0 -:2 k:2>0 s:2>0 -:2') },
    ],
  },
  saltmere: {
    title: 'Saltmere Harbour (DRAFT town loop, coastal port)', bpm: 112, key: 'Dm', bars: 32,
    prog: 'Dm C Bb A Dm C Gm A Dm C Bb A F C A Dm F C Dm A Bb F Gm A Dm C Bb A Gm Bb A A',
    channels: [
      { name: 'lead', inst: { type: 'chip', wave: 'double pulse', volume: 60, effects: ['vibrato', 'reverb'], vibrato: 'delayed', reverb: 30 },
        score: ['D5:6 E5:2 F5:4 D5:4', 'E5:6 D5:2 C5:4 A4:4', 'Bb4:4 D5:4 F5:6 E5:2', 'E5:8 C#5:4 A4:4>40',
          'D5:6 E5:2 F5:4 A5:4', 'G5:6 F5:2 E5:4 C5:4', 'D5:4 Bb4:4 G4:4 Bb4:4', 'A4:12>40 -:4',
          'D5:6 E5:2 F5:4 D5:4', 'E5:6 D5:2 C5:4 E5:4', 'F5:4 D5:4 Bb4:6 D5:2', 'C#5:6 E5:2 A5:8>50',
          'A5:6 G5:2 F5:4 C5:4', 'E5:4 G5:4 C6:6 Bb5:2', 'A5:4 G5:2 F5:2 E5:4 C#5:4', 'D5:12>40 -:4',
          'A5:4 C6:4 A5:4 F5:4', 'G5:6 E5:2 C5:8>50', 'F5:4 A5:4 D6:6 C6:2', 'C#6:4 A5:4 E5:8>50',
          'D6:6 C6:2 Bb5:4 F5:4', 'A5:6 G5:2 F5:4 C5:4', 'D5:4 G5:4 Bb5:4 A5:2 G5:2', 'E5:4 C#5:4 A4:8>40',
          'D5:6 E5:2 F5:4 D5:4', 'E5:6 D5:2 C5:4 A4:4', 'Bb4:4 D5:4 F5:6 E5:2', 'E5:8 C#5:4 A4:4>40',
          'G5:6 F5:2 D5:4 Bb4:4', 'F5:6 D5:2 Bb4:8>50', 'C#5:4 E5:4 A5:4 G5:4', 'F5:4 E5:4 C#5:4 A4:4>40'] },
      { name: 'squeeze', inst: { type: 'chip', wave: 'square', volume: 35, effects: ['chord type', 'reverb', 'panning'], chord: 'simultaneous', reverb: 35, pan: -20 }, gen: oomPah },
      { name: 'bass', inst: { type: 'chip', wave: 'triangle', volume: 60, effects: [] }, gen: bassShanty },
      { name: 'kit', drum: true, inst: { type: 'noise', wave: 'retro', volume: 45, effects: [] }, gen: () => 'k:2>0 -:6 k:2>0 -:6' },
      { name: 'shaker', drum: true, inst: { type: 'noise', wave: 'white', volume: 30, effects: ['panning'], pan: 25 }, gen: () => '-:4 h:1>0 -:3 -:2 h:1>0 -:1 h:1>0 -:1 h:1>0 -:1' },
    ],
  },
  aurelith: {
    title: 'Aurelith, City of Gold (DRAFT town loop, crystal city)', bpm: 124, key: 'E', bars: 32,
    prog: 'E C#m A B E G#m A B E C#m A B F#m B E E A B G#m C#m F#m B E C#m A B G#m C#m A B E B',
    channels: [
      { name: 'lead', inst: { type: 'chip', wave: '1/4 pulse', volume: 50, effects: ['vibrato', 'reverb', 'echo'], vibrato: 'light', reverb: 30, echoSustain: 20, echoDelayBeats: 0.75 },
        score: ['B5:4 G#5:2 E5:2 B5:4 E6:4', 'C#6:6 B5:2 G#5:4 E5:4', 'A5:4 C#6:4 E6:4 C#6:4', 'D#6:6 C#6:2 B5:8>50',
          'B5:4 G#5:2 E5:2 B5:4 E6:4', 'D#6:6 B5:2 G#5:4 D#5:4', 'E5:4 A5:4 C#6:4 B5:2 A5:2', 'F#5:12>40 -:4',
          'B5:4 G#5:2 E5:2 B5:4 E6:4', 'C#6:6 B5:2 G#5:4 C#6:4', 'E6:4 C#6:4 A5:6 B5:2', 'D#6:4 F#6:4 D#6:4 B5:4',
          'C#6:6 A5:2 F#5:4 A5:4', 'B5:4 D#6:4 F#6:4 D#6:4', 'E6:6 D#6:2 B5:4 G#5:4', 'E5:12>40 -:4',
          'C#6:4 E6:4 A5:8>50', 'D#6:4 F#6:4 B5:8>50', 'B5:4 D#6:4 G#6:6 F#6:2', 'E6:6 D#6:2 C#6:8>50',
          'A5:4 C#6:4 F#6:6 E6:2', 'D#6:4 B5:4 F#5:4 A5:4', 'G#5:4 B5:4 E6:6 D#6:2', 'C#6:8 G#5:4 E5:4',
          'A5:4 C#6:2 E6:2 A6:8>60', 'F#6:4 D#6:2 B5:2 F#6:8>60', 'G#6:4 F#6:2 E6:2 D#6:4 B5:4', 'C#6:4 E6:4 G#6:4 E6:4',
          'A6:6 G#6:2 F#6:4 E6:4', 'D#6:6 E6:2 F#6:8>50', 'E6:4 B5:4 G#5:4 B5:4', 'D#6:4 B5:4 F#5:4 D#5:4'] },
      { name: 'crystal', inst: { type: 'chip', wave: 'rounded', volume: 35, effects: ['chord type', 'reverb', 'panning'], chord: 'arpeggio', reverb: 40, pan: 25 }, gen: pad },
      { name: 'harp', inst: { type: 'chip', wave: 'triangle', volume: 35, effects: ['reverb', 'panning'], reverb: 40, pan: -25 }, gen: broken },
      { name: 'bass', inst: { type: 'chip', wave: 'triangle', volume: 60, effects: [] }, gen: bassWalk },
      { name: 'kit', drum: true, inst: { type: 'noise', wave: 'retro', volume: 50, effects: [] }, gen: (c, i) => (i % 8 === 7 ? 'k:2>0 -:2 s:2>0 -:2 k:2>0 s:2>0 s:2>0 s:2>0' : 'k:2>0 -:6 s:2>0 -:6') },
      { name: 'hat', drum: true, inst: { type: 'noise', wave: 'white', volume: 20, effects: [] }, gen: () => Array(4).fill('-:2 h:1>0 -:1').join(' ') },
    ],
  },
  revival_heights: {
    title: 'Revival Heights (DRAFT town loop, cold mountain town)', bpm: 80, key: 'Am', bars: 24,
    prog: 'Am F C G Am F Em Em F G Em Am Dm F E E Am F C G Dm Em F E',
    channels: [
      { name: 'lead', inst: { type: 'chip', wave: 'triangle', volume: 75, effects: ['vibrato', 'reverb'], vibrato: 'light', reverb: 60 },
        score: ['E5:8 A5:4 G5:4', 'F5:8 C5:8>40', 'E5:4 G5:4 C6:8>50', 'B5:8 D5:8>40', 'C5:4 E5:4 A5:6 B5:2', 'C6:8 A5:4 F5:4', 'G5:8 E5:4 B4:4', 'E5:12>30 -:4',
          'A5:4 C6:4 F6:8>50', 'D6:4 B5:4 G5:8>50', 'B5:6 A5:2 G5:4 E5:4', 'A5:12>40 -:4', 'F5:4 A5:4 D6:6 C6:2', 'A5:8 F5:4 C5:4', 'B4:4 E5:4 G#5:8>50', 'B5:8 G#5:4 E5:4>40',
          'A5:8 E6:4 C6:4', 'C6:6 A5:2 F5:8>40', 'G5:4 E5:4 C5:4 E5:4', 'D5:8 B4:4 D5:4', 'F5:6 E5:2 D5:4 A4:4', 'B4:4 E5:4 G5:8>40', 'A5:4 F5:4 C5:4 F5:4', 'G#4:8 B4:4 E5:4>40'] },
      { name: 'pad', inst: { type: 'chip', wave: 'rounded', volume: 30, effects: ['chord type', 'reverb'], chord: 'simultaneous', reverb: 60 }, gen: padHold },
      { name: 'icicles', inst: { type: 'chip', wave: '1/8 pulse', volume: 22, effects: ['reverb', 'echo', 'panning'], reverb: 50, echoSustain: 35, echoDelayBeats: 0.5, pan: 30 }, gen: icicles },
      { name: 'bass', inst: { type: 'chip', wave: 'triangle', volume: 55, effects: [] }, gen: bassHold },
      { name: 'bells', drum: true, inst: { type: 'noise', wave: 'white', volume: 18, effects: ['panning'], pan: -25 }, gen: () => '-:4 h:1>0 -:7 h:1>0 -:1 h:1>0 -:1' },
    ],
  },
};
export { chord, root, up, N };
