// Kilumen: DRAFT audio checks (wave 2, Oct 22, 2026). Static: files present, small, right length, loop-clean
// sources, sprite map in sync, one-line revert works, tool-only licences are not shipped.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { DRAFT_AUDIO, DRAFT_MUSIC, DRAFT_SFX_SPRITE, draftLoopFor, trackFor, SFX, AUDIO_LEVEL_NOTE } from '../src/audio/audio.js';
const R = new URL('..', import.meta.url).pathname;
const has = (bin) => { try { execFileSync(bin, ['-version'], { stdio: 'ignore' }); return true; } catch { return false; } };
const dur = (f) => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString();

// Oct 27, 2026: per-town loops (saltmere / aurelith / revival_heights) are longer by design: 60-120 s, < 1 MB.
const LONG = new Set(['saltmere', 'aurelith', 'revival_heights']);
test('draft loops: ogg + m4a for every mapped loop, 20-40 s (< 450 KB), long town loops 60-120 s (< 1 MB)', { skip: !has('ffprobe') && 'no ffprobe' }, () => {
  for (const loop of new Set(Object.values(DRAFT_MUSIC))) for (const ext of ['ogg', 'm4a']) {
    const f = `${R}audio/music/kil_draft_${loop}.${ext}`;
    assert.ok(existsSync(f), f);
    const long = LONG.has(loop);
    assert.ok(statSync(f).size < (long ? 1e6 : 450e3), `${f} ${statSync(f).size}`);
    const d = dur(f); assert.ok(long ? d >= 60 && d <= 120 : d >= 20 && d <= 40, `${f} ${d}s`);
  }
});

test('draft loops: sources kept (BeepBox JSON + editor URL) for each loop', () => {
  for (const loop of new Set(Object.values(DRAFT_MUSIC))) {
    const j = JSON.parse(readFileSync(`${R}audio/src/${loop}.beepbox.json`, 'utf8'));
    assert.equal(j.format, 'BeepBox'); assert.equal(j.introBars, 0, 'whole song is the loop');
    assert.match(readFileSync(`${R}audio/src/${loop}.url.txt`, 'utf8'), /^https:\/\/www\.beepbox\.co\/#/);
  }
});

test('draft sfx sprite: every SFX id mapped, map matches the generator output, ogg + m4a small', () => {
  assert.deepEqual(Object.keys(DRAFT_SFX_SPRITE).sort(), Object.keys(SFX).sort());
  assert.deepEqual(JSON.parse(readFileSync(`${R}audio/sfx/kil_sfx_draft.json`, 'utf8')).sprite, DRAFT_SFX_SPRITE);
  for (const ext of ['ogg', 'm4a']) assert.ok(statSync(`${R}audio/sfx/kil_sfx_draft.${ext}`).size < 60e3, ext);
  for (const [id, [o, d]] of Object.entries(DRAFT_SFX_SPRITE)) assert.ok(o >= 100 && d >= 40 && d <= 900, id);
});

test('draft music mapping: towns -> town, routes -> route, indoor keeps placeholders, revert is one switch', () => {
  assert.equal(draftLoopFor(trackFor({ map: 'brookhollow', zone: 'brookhollow', phase: 'day' })), 'town');
  assert.equal(draftLoopFor(trackFor({ map: 'route1', zone: 'sunmeadow_fields', phase: 'night' })), 'route');
  assert.equal(draftLoopFor(trackFor({ map: 'shop_int', zone: 'brookhollow', phase: 'day' })), null);
  assert.equal(draftLoopFor('battle'), 'battle');
  assert.equal(draftLoopFor('battle', { music: false, sfx: false }), null, 'revert switch');
  assert.deepEqual(DRAFT_AUDIO, { music: true, sfx: true }, 'drafts on (flip to false to veto)');
});

test('audio tools are tool-only: nothing under src/ imports BeepBox or jsfxr', () => {
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]));
  for (const f of walk(`${R}src`).filter((f) => /\.(m?js|html)$/.test(f))) assert.doesNotMatch(readFileSync(f, 'utf8'), /(import|from|src=)[^\n;]*(beepbox|jsfxr|sfxr)/i, f);
  assert.ok(!existsSync(`${R}src/vendor/beepbox`) && !existsSync(`${R}src/vendor/jsfxr`));
});

// Oct 22, 2026 loudness pass (Gary: "seems a little loud"): ffmpeg ebur128 on the shipped files.
const ebur = (f, af) => { let out; try { out = execFileSync('sh', ['-c', `ffmpeg -nostats -hide_banner -i "${f}" -af "${af ? af + ',' : ''}ebur128=peak=true" -f null - 2>&1`]).toString(); } catch (e) { out = String(e.stdout); }
  const sum = out.slice(out.lastIndexOf('Summary:')); return { I: +sum.match(/I:\s+(-?[\d.]+)/)[1], tp: +sum.match(/True peak:\s+Peak:\s+(-?[\d.]+|-inf)/)[1] }; };
test('loudness: music loops at -16 LUFS (+-1), true peak <= -1 dBTP; SFX sprite <= -1 dBTP, tiers kept', { skip: !has('ffmpeg') && 'no ffmpeg' }, () => {
  for (const loop of new Set(Object.values(DRAFT_MUSIC))) for (const ext of ['ogg', 'm4a']) {
    const { I, tp } = ebur(`${R}audio/music/kil_draft_${loop}.${ext}`);
    assert.ok(Math.abs(I - AUDIO_LEVEL_NOTE.musicLufs) <= 1, `${loop}.${ext} ${I} LUFS`);
    assert.ok(tp <= AUDIO_LEVEL_NOTE.maxTruePeakDb, `${loop}.${ext} true peak ${tp} dBTP`);
  }
  for (const ext of ['ogg', 'm4a']) assert.ok(ebur(`${R}audio/sfx/kil_sfx_draft.${ext}`).tp <= -1, `sfx ${ext}`);
  const tp = (id) => { const [o, d] = DRAFT_SFX_SPRITE[id]; return ebur(`${R}audio/sfx/kil_sfx_draft.ogg`, `atrim=${o / 1000}:${(o + d) / 1000}`).tp; };
  assert.ok(tp('blip') < tp('cursor') && tp('cursor') < tp('select') && tp('cursor') < tp('save'), 'frequent ticks stay quieter than one-off events');
});
