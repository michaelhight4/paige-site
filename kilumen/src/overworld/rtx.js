// Kilumen overworld: "RTX look" whole-map post-processing (Coder, Oct 29 2026, branch dev/rtx-look; NOT live).
// Options row 'RTX look': Off -> Auto (default) -> Full -> Lite. Saved per device (localStorage kilumen_rtx.v1).
// World layer only (v2): Renderer.draw(v, {ui:false}) draws the world, post() grades it, then Renderer.drawUi(v) adds
// on-canvas UI (quest markers, debug, fade) ungraded; DOM HUD / menus are never touched.
// URL: ?rtx=0|off|auto|full|lite (session only). Never touches the 2D renderer's draw order: after Renderer.draw() the
// finished frame is uploaded to a WebGL2 canvas, post-processed and drawn back onto the same 2D canvas (so UI, shots,
// touch input and the pixel grid stay exactly as they were). WebGL2 missing or a context error -> quietly stays off.
//
// Passes (full tier; lite in brackets):
//   1. bright pass + downsample to 1/4 res [1/8]                                  -> bloom source + god-ray source
//   2. separable gaussian blur H + V on the small buffer                          -> bloom
//   3. composite at full res:
//      - auto-generated normal map: a height field from each art pixel's luminance (Sobel at 1 art px = `zoom` device
//        px), so every tile, sprite and prop gets per-pixel normals with no hand-made maps
//      - dynamic point lights (nightfx anchors: lamps, lanterns, braziers, crystals, window spill + a carried light at
//        night), flame flicker, N.L shading, soft shadows by marching the map's solid-tile mask (linear filtered =
//        soft penumbra) [lite: no shadows, 6 lights]
//      - water reflections: mirror about the shoreline above each water pixel, rippled  (Col.WATER / DEEP_WATER)
//      - rain puddles (Pokemon style, when life.wet): value-noise puddles on walkable outdoor ground mirror whatever
//        stands in the cell above, plus rain-ring ripples
//      - god rays: radial blur of the bright buffer towards a low sun, day/dusk outdoors only [lite: off]
//      - colour grade: lift/gain split tone per phase, saturation, contrast, Khronos PBR Neutral tone map, vignette
// Weak GPU: Auto picks Lite on mobile / software renderers and Full elsewhere; a watchdog steps Full -> Lite -> Off
// (session only, Auto only) when frames stay slower than ~38 fps for 3 s while the look is on.
// Credits: tone map = Khronos PBR Neutral (Apache-2.0, THIRD_PARTY_LICENSES "RTX look"); techniques (dual-pass gaussian
// bloom, screen-space radial god rays, height-to-normal Sobel, 2D ray-marched soft shadows) are textbook; code is ours.
import { TILE, Col, WALKABLE } from './constants.js?v=v0.2.XXX-alpha';
import { isIndoor } from './clock.js?v=v0.2.XXX-alpha';
import { lampLevel } from './nightfx.js?v=v0.2.XXX-alpha';

export const RTX_KEY = 'kilumen_rtx.v1';
export const RTX_MODES = Object.freeze(['off', 'auto', 'full', 'lite']);
export const RTX_LABEL = Object.freeze({ off: 'Off', auto: 'Auto', full: 'Full', lite: 'Lite' });
export const MAX_LIGHTS = 16;
export const TIER = Object.freeze({
  full: { lights: 16, shadows: 1, godRays: 1, bloomDiv: 4, shadowSteps: 12 },
  lite: { lights: 6, shadows: 0, godRays: 0, bloomDiv: 8, shadowSteps: 0 },
});
const WEAK_GPU = /swiftshader|llvmpipe|softpipe|software|mali-4|mali-t[67]|adreno \(tm\) [345]\d\d|powervr sgx|sgx 5/i;

/** URL override (?rtx=) -> mode or null. */
export function rtxFromUrl(q) {
  const v = q?.get?.('rtx'); if (v == null) return null;
  return v === '0' ? 'off' : v === '1' ? 'auto' : RTX_MODES.includes(v) ? v : null;
}
/** Auto tier from device facts (pure). */
export function pickTier({ webgl2 = true, renderer = '', mobile = false, memGB = 0, cores = 0 } = {}) {
  if (!webgl2) return 'off';
  const lowEnd = (memGB > 0 && memGB <= 2) || (cores > 0 && cores <= 4);
  if (mobile && lowEnd) return WEAK_GPU.test(renderer || '') || (memGB > 0 && memGB <= 1) ? 'off' : 'lite'; // low-end phones
  if (WEAK_GPU.test(renderer || '') || mobile) return 'lite';
  return 'full';
}
/** Watchdog (pure): next tier after a slow stretch. Only Auto steps down. */
export function stepDown(mode, tier) { return mode !== 'auto' ? tier : tier === 'full' ? 'lite' : 'off'; }

/** Per-tile mask bytes (pure): R solid (casts shadow), G water, B puddle-able ground, A 255. Rows top-first. */
export function buildMask(map, outdoor) {
  const w = map.width, h = map.height, a = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = map.code(x, y), i = (y * w + x) * 4, water = c === Col.WATER || c === Col.DEEP_WATER;
    a[i] = !water && !WALKABLE.has(c) && c !== Col.LEDGE_S && c !== Col.BIKE_ONLY ? 255 : 0;
    a[i + 1] = water ? 255 : 0;
    a[i + 2] = outdoor && (c === Col.WALK) ? 255 : 0;
    a[i + 3] = 255;
  }
  return a;
}

/** Grade + light setup for a phase (pure). */
export function phaseLook(phase, outdoor, wet = false) {
  const P = {
    morning: { amb: [1.0, 0.98, 0.95], lift: [0.0, 0.01, 0.03], gain: [1.04, 1.0, 0.94], sun: 0.8, sat: 1.1, lamps: 0 },
    day:     { amb: [1.0, 1.0, 1.0],   lift: [0.0, 0.01, 0.025], gain: [1.03, 1.01, 0.97], sun: 1.0, sat: 1.12, lamps: 0 },
    evening: { amb: [1.0, 0.92, 0.85], lift: [0.02, 0.0, 0.04], gain: [1.08, 0.97, 0.86], sun: 0.7, sat: 1.12, lamps: 0.6 },
    night:   { amb: [0.96, 0.96, 1.0], lift: [0.0, 0.0, 0.02], gain: [1.0, 1.0, 1.0], sun: 0.0, sat: 0.9, lamps: 1 },
  };
  const k = phase === 'dusk' ? 'evening' : phase === 'dawn' ? 'morning' : P[phase] ? phase : 'day';
  const o = { ...P[k] };
  o.exposure = 1.06; o.bloom = 1;
  if (!outdoor) { o.sun = 0; o.amb = [1, 0.98, 0.95]; }
  else if (wet) { // rain reads overcast: no sun/god rays, dimmer + cooler + flatter, bloom mostly off (lamps still glow at night)
    o.sun = 0; o.exposure = 0.76; o.bloom = 0.25; o.sat = Math.min(o.sat, 0.82);
    o.amb = o.amb.map((c, i) => c * [0.9, 0.93, 0.98][i]); o.gain = [0.94, 0.96, 1.0]; o.lift = [0.01, 0.015, 0.03];
  }
  return o;
}

const VS = `#version 300 es
in vec2 aP; out vec2 vUv; void main(){ vUv = aP*0.5+0.5; gl_Position = vec4(aP,0.,1.); }`;
const FS_BRIGHT = `#version 300 es
precision mediump float; in vec2 vUv; out vec4 o; uniform sampler2D uS; uniform vec2 uTexel;
void main(){ vec3 c = vec3(0.);
  for(int i=0;i<4;i++){ vec2 d = vec2(i&1, i>>1)*2.-1.; c += texture(uS, vUv + d*uTexel).rgb; } c *= 0.25;
  float l = dot(c, vec3(.2126,.7152,.0722)); float k = smoothstep(.62,.92,l);
  o = vec4(c*k, l); }`;
const FS_BLUR = `#version 300 es
precision mediump float; in vec2 vUv; out vec4 o; uniform sampler2D uS; uniform vec2 uDir;
void main(){ // 9-tap gaussian folded into 5 linear fetches
  vec4 c = texture(uS, vUv)*0.2270270270;
  c += (texture(uS, vUv+uDir*1.3846153846)+texture(uS, vUv-uDir*1.3846153846))*0.3162162162;
  c += (texture(uS, vUv+uDir*3.2307692308)+texture(uS, vUv-uDir*3.2307692308))*0.0702702703; o = c; }`;
const FS_COMP = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D uS, uB, uM; uniform vec2 uRes, uCam, uMapSize; uniform float uZoom, uTime, uWet, uSun, uSat, uOutdoor, uShadows, uGod, uNight, uExposure, uBloom;
uniform vec3 uAmb, uLift, uGain; uniform int uN; uniform vec3 uLP[${MAX_LIGHTS}]; uniform vec3 uLC[${MAX_LIGHTS}];
const float T = ${TILE}.0;
// Khronos PBR Neutral tone mapping (Apache-2.0, https://github.com/KhronosGroup/ToneMapping)
vec3 PBRNeutralToneMapping(vec3 color){ const float startCompression = 0.8 - 0.04; const float desaturation = 0.15;
  float x = min(color.r, min(color.g, color.b)); float offset = x < 0.08 ? x - 6.25 * x * x : 0.04; color -= offset;
  float peak = max(color.r, max(color.g, color.b)); if (peak < startCompression) return color;
  const float d = 1. - startCompression; float newPeak = 1. - d * d / (peak + d - startCompression); color *= newPeak / peak;
  float g = 1. - 1. / (desaturation * (peak - newPeak) + 1.); return mix(color, newPeak * vec3(1, 1, 1), g); }
vec2 toWorld(vec2 uv){ return uCam + vec2(uv.x, 1.-uv.y)*uRes/uZoom; }
vec2 toUv(vec2 w){ vec2 s = (w-uCam)*uZoom/uRes; return vec2(s.x, 1.-s.y); }
vec4 mask(vec2 w){ vec2 t = floor(w/T); if (any(lessThan(t, vec2(0.))) || any(greaterThanEqual(t, uMapSize))) return vec4(1.,0.,0.,1.); return texelFetch(uM, ivec2(t), 0); }
float solidSoft(vec2 w){ return texture(uM, w/T/uMapSize).r; }
float lum(vec3 c){ return dot(c, vec3(.2126,.7152,.0722)); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
void main(){
  vec3 base = texture(uS, vUv).rgb; vec2 w = toWorld(vUv); vec4 m = mask(w);
  vec2 px = uZoom/uRes; // one art pixel in uv
  // auto normal map: height = luminance, Sobel over the 3x3 art-pixel neighbourhood
  float h00=lum(texture(uS,vUv+px*vec2(-1,1)).rgb), h10=lum(texture(uS,vUv+px*vec2(0,1)).rgb), h20=lum(texture(uS,vUv+px*vec2(1,1)).rgb);
  float h01=lum(texture(uS,vUv+px*vec2(-1,0)).rgb), h21=lum(texture(uS,vUv+px*vec2(1,0)).rgb);
  float h02=lum(texture(uS,vUv+px*vec2(-1,-1)).rgb), h12=lum(texture(uS,vUv+px*vec2(0,-1)).rgb), h22=lum(texture(uS,vUv+px*vec2(1,-1)).rgb);
  vec3 N = normalize(vec3((h00+2.*h01+h02)-(h20+2.*h21+h22), (h02+2.*h12+h22)-(h00+2.*h10+h20), 0.55)); // y up in uv
  vec3 col = pow(base, vec3(2.2));
  // water reflection: mirror about the shoreline above (up to 4 tiles)
  if (m.g > .5) { float ty = floor(w.y/T); float edge = -1.;
    for (int k=1;k<=4;k++){ if (mask(vec2(w.x, (ty-float(k))*T+1.)).g < .5){ edge = (ty-float(k)+1.)*T; break; } }
    if (edge > 0.) { float d = w.y-edge; vec2 r = vec2(w.x + sin(w.y*.21+uTime*2.4)*1.2, edge-d);
      vec3 rc = pow(texture(uS, toUv(r)).rgb, vec3(2.2)); float f = .42*(1.-smoothstep(0., 3.*T, d));
      col = mix(col, rc*vec3(.78,.9,1.05), f); }
    col += vec3(.02,.04,.06)*(.5+.5*sin(w.x*.08+w.y*.05+uTime*1.7))*uOutdoor; }
  // rain puddles (Pokemon style): mirror the cell above about this cell's top edge
  if (uWet > 0. && m.b > .5) { float n = vnoise(w/(T*1.35)) * .75 + vnoise(w/(T*.45)) * .25; float pm = smoothstep(.58,.66,n)*uWet;
    if (pm > 0.) { float top = floor(w.y/T)*T; vec2 r = vec2(w.x, 2.*top - w.y - 2.);
      vec3 rc = pow(texture(uS, toUv(r)).rgb, vec3(2.2)); vec2 cell = floor(w/18.); float ph = fract(uTime*.9 + hash(cell));
      float ring = smoothstep(.12,.0,abs(length(fract(w/18.)-.5)-ph*.5))*(1.-ph)*step(.55,hash(cell+7.));
      col = mix(col*.82, rc*vec3(.72,.82,1.0)+vec3(.015,.02,.035), pm*.6) + ring*pm*.06; } }
  // sun relief on the auto normals + ambient
  vec3 L0 = normalize(vec3(-.55,.6,.6)); float nl = dot(N, L0);
  vec3 lit = uAmb*(1. + uSun*.22*(nl-.6));
  // dynamic point lights with soft shadows
  vec3 acc = vec3(0.);
  for (int i=0;i<${MAX_LIGHTS};i++){ if (i>=uN) break; vec3 lp = uLP[i]; vec2 dv = lp.xy - w; float d = length(dv); float r = lp.z;
    if (d >= r) continue; float a = 1.-d/r; a = a*a*(3.-2.*a);
    vec3 ld = normalize(vec3(dv.x, -dv.y, 26.)); float sh = 1.;
    if (uShadows > .5 && m.r < .5) { for (int s=1;s<=${TIER.full.shadowSteps};s++){ float t = float(s)/${TIER.full.shadowSteps + 1}.0; vec2 q = mix(w, lp.xy, t);
        float occ = solidSoft(q); sh = min(sh, 1.-occ*smoothstep(0.,.35,1.-t)*.9); } }
    acc += uLC[i]*a*sh*(.45+.55*max(dot(N,ld),0.)); }
  col = col*lit + col*acc*2.4 + acc*.05;
  // bloom + god rays
  vec3 bl = texture(uB, vUv).rgb; col += pow(bl, vec3(2.2))*(.55+.5*uNight)*uBloom;
  if (uGod > .5 && uSun > 0.) { vec2 sp = vec2(-.25, 1.35); vec2 dlt = (sp - vUv)/24.; vec2 uv = vUv; float dec = 1.; vec3 gr = vec3(0.);
    for (int i=0;i<24;i++){ uv += dlt; gr += texture(uB, uv).rgb*dec; dec *= .93; }
    col += pow(gr/10., vec3(2.2))*vec3(1.,.9,.7)*uSun*.55; }
  // colour grade
  col = PBRNeutralToneMapping(col*uExposure);
  col = pow(max(col, 0.), vec3(1./2.2));
  col = col*uGain + uLift*(1.-col);
  float l = lum(col); col = mix(vec3(l), col, uSat); col = (col-.5)*1.05+.5;
  vec2 vc = vUv-.5; col *= 1.-dot(vc,vc)*.32;
  o = vec4(clamp(col,0.,1.),1.); }`;

export const FS_COMP_SRC = FS_COMP;

/** Default mode with no saved choice (Gary, Oct 30 2026): 'off' on phones (platform 'mobile', or no platform and a coarse
 * pointer), 'auto' on PC, including the Steam/Electron build (?platform=pc). */
export function defaultMode(scene) {
  const id = scene?.opts?.platform?.id;
  if (id) return id === 'mobile' ? 'off' : 'auto';
  return globalThis.matchMedia?.('(pointer: coarse)')?.matches ? 'off' : 'auto';
}

export class RtxLook {
  /** @param {object} scene Overworld */
  constructor(scene, opts = {}) {
    this.scene = scene; this.opts = opts; this.gl = null; this.failed = false; this.tier = 'off';
    let saved = null; try { saved = JSON.parse(globalThis.localStorage?.getItem(RTX_KEY) || '{}').mode || null; } catch { /* private mode */ }
    this.mode = RTX_MODES.includes(saved) ? saved : defaultMode(scene); // a saved user choice always wins; else Gary (Oct 30 2026): Auto on PC/Steam, Off on phones
    const url = rtxFromUrl(opts.query); if (url) { this.mode = url; this.urlForced = true; }
    this.stats = { frames: 0, emaMs: 0, lastMs: 0, slow: 0, steps: [] }; this._maskFor = null; this._lastT = 0;
  }
  get on() { return this.mode !== 'off' && !this.failed; }
  label() { return this.failed && this.mode !== 'off' ? 'Not supported' : this.mode === 'auto' && this.tier !== 'off' && this.gl ? `Auto (${RTX_LABEL[this.tier]})` : RTX_LABEL[this.mode]; }
  setMode(m, persist = true) {
    if (!RTX_MODES.includes(m)) return this.mode;
    this.mode = m; this.tier = 'off'; this.stats.slow = 0; this._autoOff = false;
    if (persist) try { globalThis.localStorage?.setItem(RTX_KEY, JSON.stringify({ mode: m })); } catch { /* ignore */ }
    return m;
  }
  cycle() { return this.setMode(RTX_MODES[(RTX_MODES.indexOf(this.mode) + 1) % RTX_MODES.length]); }

  _init() {
    if (this.gl || this.failed) return !!this.gl;
    try {
      const c = document.createElement('canvas'), gl = c.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
      if (!gl) throw new Error('no webgl2');
      this.cv = c; this.gl = gl;
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      this.renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
      const prog = (fs) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'aP'); gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, ''); u[nm] = gl.getUniformLocation(p, nm); } return { p, u }; };
      this.P = { bright: prog(FS_BRIGHT), blur: prog(FS_BLUR), comp: prog(FS_COMP) };
      const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      const tex = (filter) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
      this.tScene = tex(gl.LINEAR); this.tMask = tex(gl.LINEAR); this.tA = tex(gl.LINEAR); this.tB = tex(gl.LINEAR);
      this.fA = gl.createFramebuffer(); this.fB = gl.createFramebuffer();
      c.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.failed = true; this.gl = null; });
      return true;
    } catch (e) { console.warn('rtx look off:', e.message); this.failed = true; this.gl = null; return false; }
  }

  _autoTier() {
    const mobile = this.scene.opts?.platform?.id === 'mobile' || !!globalThis.matchMedia?.('(pointer: coarse)')?.matches;
    const nav = globalThis.navigator || {};
    return pickTier({ webgl2: !!this.gl, renderer: this.renderer, mobile, memGB: +nav.deviceMemory || 0, cores: +nav.hardwareConcurrency || 0 });
  }

  _size(W, H, div) {
    const gl = this.gl, w = Math.max(1, Math.ceil(W / div)), h = Math.max(1, Math.ceil(H / div));
    if (this.cv.width !== W || this.cv.height !== H) { this.cv.width = W; this.cv.height = H; }
    if (this._sw === w && this._sh === h) return;
    this._sw = w; this._sh = h;
    for (const [t, f] of [[this.tA, this.fA], [this.tB, this.fB]]) {
      gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    }
  }

  _mask(map) {
    if (this._maskFor === map) return;
    const gl = this.gl; this._maskFor = map;
    gl.bindTexture(gl.TEXTURE_2D, this.tMask); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, map.width, map.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, buildMask(map, !isIndoor(map.name)));
  }

  /** Lights near the view (world px), strongest/closest first, capped by the tier. */
  lights(v, max, look) {
    const s = this.scene, nf = s.nightfx, out = [], min = s.clock?.min ?? 720, lv = lampLevel(min);
    const cx = v.cam.x + this.cv.width / v.zoom / 2, cy = v.cam.y + this.cv.height / v.zoom / 2, reach = Math.max(this.cv.width, this.cv.height) / v.zoom;
    const t = (v.ms || 0) / 1000;
    for (const l of nf?.lights || []) {
      const level = l.alwaysOn ? 1 : lv * (l.win ? (l.win.sched ? 0.8 : 1) : 1);
      if (level <= 0.01) continue;
      const r = (l.r || 40) * 1.8, d = Math.hypot(l.x - cx, l.y - cy); if (d > reach + r) continue;
      const fl = l.flame ? 0.86 + 0.14 * Math.sin(t * 13 + (l.seed % 97)) * Math.sin(t * 7.3 + (l.seed % 31)) : 1;
      const hex = parseInt(l.colour || 'e29d40', 16), k = (l.strength ?? 1) * level * fl;
      out.push({ x: l.x, y: l.y, r, c: [((hex >> 16) & 255) / 255 * k, ((hex >> 8) & 255) / 255 * k, (hex & 255) / 255 * k], d });
    }
    if (look.lamps > 0 && v.player) { const p = v.player.pixel?.(); if (p) out.push({ x: p.px + TILE / 2, y: p.py + TILE * 0.55, r: TILE * 3.2, c: [0.55 * look.lamps, 0.45 * look.lamps, 0.32 * look.lamps], d: -1 }); }
    out.sort((a, b) => a.d - b.d);
    return out.slice(0, max);
  }

  /** Called after Renderer.draw(v): post-process the finished 2D frame in place. */
  post(v) {
    if (!this.on || !v?.map || typeof document === 'undefined') return;
    const t0 = performance.now();
    if (!this._init()) return;
    if (this.mode === 'auto' && this.tier === 'off' && !this._autoOff) this.tier = this._autoTier();
    else if (this.mode !== 'auto') this.tier = this.mode;
    if (this.tier === 'off') return;
    const T = TIER[this.tier], gl = this.gl, src = this.scene.canvas, W = src.width, H = src.height;
    this._size(W, H, T.bloomDiv); this._mask(v.map);
    const outdoor = !isIndoor(v.map.name), wet = outdoor && !!this.scene.life?.wet, look = phaseLook(v.phase || this.scene.phase, outdoor, wet);
    // upload the finished frame (bottom-left origin)
    gl.bindTexture(gl.TEXTURE_2D, this.tScene); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    // 1. bright + downsample
    let P = this.P.bright; gl.useProgram(P.p); gl.bindFramebuffer(gl.FRAMEBUFFER, this.fA); gl.viewport(0, 0, this._sw, this._sh);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tScene); gl.uniform1i(P.u.uS, 0); gl.uniform2f(P.u.uTexel, T.bloomDiv / 4 / W, T.bloomDiv / 4 / H);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // 2. blur H -> B, V -> A
    P = this.P.blur; gl.useProgram(P.p); gl.uniform1i(P.u.uS, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fB); gl.bindTexture(gl.TEXTURE_2D, this.tA); gl.uniform2f(P.u.uDir, 1 / this._sw, 0); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fA); gl.bindTexture(gl.TEXTURE_2D, this.tB); gl.uniform2f(P.u.uDir, 0, 1 / this._sh); gl.drawArrays(gl.TRIANGLES, 0, 3);
    // 3. composite
    P = this.P.comp; const u = P.u; gl.useProgram(P.p); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tScene); gl.uniform1i(u.uS, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.tA); gl.uniform1i(u.uB, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.tMask); gl.uniform1i(u.uM, 2);
    gl.uniform2f(u.uRes, W, H); gl.uniform2f(u.uCam, v.cam.x, v.cam.y); gl.uniform2f(u.uMapSize, v.map.width, v.map.height);
    gl.uniform1f(u.uZoom, v.zoom); gl.uniform1f(u.uTime, this.scene.life?.reducedMotion ? 0 : (v.ms || 0) / 1000);
    gl.uniform1f(u.uWet, wet ? 1 : 0); gl.uniform1f(u.uExposure, look.exposure); gl.uniform1f(u.uBloom, look.bloom); gl.uniform1f(u.uSun, look.sun); gl.uniform1f(u.uSat, look.sat);
    gl.uniform1f(u.uOutdoor, outdoor ? 1 : 0); gl.uniform1f(u.uShadows, T.shadows); gl.uniform1f(u.uGod, T.godRays && outdoor ? 1 : 0); gl.uniform1f(u.uNight, look.lamps);
    gl.uniform3fv(u.uAmb, look.amb); gl.uniform3fv(u.uLift, look.lift); gl.uniform3fv(u.uGain, look.gain);
    const L = this.lights(v, T.lights, look), lp = new Float32Array(MAX_LIGHTS * 3), lc = new Float32Array(MAX_LIGHTS * 3);
    L.forEach((l, i) => { lp.set([l.x, l.y, l.r], i * 3); lc.set(l.c, i * 3); });
    gl.uniform1i(u.uN, L.length); gl.uniform3fv(u.uLP, lp); gl.uniform3fv(u.uLC, lc);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (this.opts.bench) gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); // sync: true GPU cost (bench only)
    // back onto the 2D canvas
    const ctx = this.scene.renderer.ctx; ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'copy'; ctx.drawImage(this.cv, 0, 0); ctx.restore();
    this._lightsN = L.length;
    this._watch(performance.now() - t0, t0);
  }

  _watch(ms, now) {
    const s = this.stats; s.frames++; s.lastMs = ms; s.emaMs = s.emaMs ? s.emaMs * 0.95 + ms * 0.05 : ms;
    const dt = this._lastT ? now - this._lastT : 16; this._lastT = now;
    if (this.mode !== 'auto' || this.opts.bench || dt > 250) return; // tab switches / warps do not count
    s.slow = dt > 26 ? s.slow + dt : Math.max(0, s.slow - dt * 0.5);
    if (s.slow > 3000) { const next = stepDown(this.mode, this.tier); s.steps.push(`${this.tier}->${next}`); this.tier = next; s.slow = 0; if (next === 'off') this._autoOff = true; console.info('rtx look: slow frames, auto tier', next); }
  }

  state() { return { mode: this.mode, tier: this.tier, failed: this.failed, renderer: this.renderer || null, lights: this._lightsN || 0, emaMs: +this.stats.emaMs.toFixed(3), steps: this.stats.steps }; }
}
