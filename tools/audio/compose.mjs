// Score text (tools/audio/songs.mjs) -> BeepBox JSON (format "BeepBox", version 9). Tool-side only.
import { SONGS, DRUM, midi } from './songs.mjs';

function parseBar(text, drum) {
  const notes = []; let t = 0;
  for (const tok of text.trim().split(/\s+/)) {
    const m = /^([^:]+):(\d+)(?:>(\d+))?$/.exec(tok); if (!m) throw new Error('bad token ' + tok);
    const len = +m[2], endVol = m[3] != null ? +m[3] : 100;
    if (m[1] !== '-') {
      const pitches = m[1].split('+').map((p) => (drum ? DRUM[p] : p.startsWith('M') ? +p.slice(1) - 12 : midi(p) - 12)); // BeepBox pitch 48 = C4 (MIDI 60)
      if (pitches.some((p) => p == null || Number.isNaN(p))) throw new Error('bad pitch ' + tok);
      notes.push({ pitches, points: [{ tick: t, pitchBend: 0, volume: 100 }, { tick: t + len, pitchBend: 0, volume: endVol }] });
    }
    t += len;
  }
  if (t !== 16) throw new Error(`bar is ${t} steps, not 16: "${text}"`);
  return { notes };
}

export function compose(id) {
  const s = SONGS[id]; if (!s) throw new Error('no song ' + id);
  const prog = s.prog.split(/\s+/); if (prog.length !== s.bars) throw new Error(`${id}: prog has ${prog.length} bars`);
  const pitchCh = s.channels.filter((c) => !c.drum), drumCh = s.channels.filter((c) => c.drum);
  const channels = [...pitchCh, ...drumCh].map((c) => {
    const bars = c.score || prog.map((ch, i) => c.gen(ch, i));
    if (bars.length !== s.bars) throw new Error(`${id}/${c.name}: ${bars.length} bars`);
    const inst = { fadeInSeconds: 0, fadeOutTicks: c.drum ? -3 : 12, envelopes: [], eqFilter: [], unison: 'none', ...c.inst };
    return { type: c.drum ? 'drum' : 'pitch', instruments: [inst], patterns: bars.map((b) => parseBar(b, c.drum)), sequence: bars.map((_, i) => i + 1), ...(c.drum ? {} : { octaveScrollBar: 2 }) };
  });
  return { format: 'BeepBox', version: 9, scale: 'expert', key: 'C', introBars: 0, loopBars: s.bars, beatsPerBar: 4, ticksPerBeat: 4, beatsPerMinute: s.bpm,
    layeredInstruments: false, patternInstruments: false, channels };
}
