// 오리지널 가래떡 캐릭터 — 레트로 도트(픽셀) 스프라이트
// 디자인: 길쭉한 흰 가래떡 몸통 + 노릇하게 구워진 윗부분, 갈색 띠 밀짚모자, 펠트 조끼(단추·벼 자수),
//         까만 눈·분홍 볼·활짝 웃는 입, 짧은 팔다리, 벼 이삭 다발.
// 48×64 픽셀 격자에 그린 뒤 확대(보간 없음) → 해상도와 무관한 선명한 도트, 투명 배경.

export const TEAM_COLORS = {
  blue: { main: '#3b78e7', light: '#9cc3ff', dark: '#1f4fa8' },
  white: { main: '#e9a91f', light: '#ffe08a', dark: '#a8700f' },
  green: { main: '#47a85b', light: '#9be0a6', dark: '#2a7a3b' },
};

const GW = 48, GH = 64;
const C = {
  out: '#3b2414', body: '#fdf6e8', body2: '#eadcc2', hi: '#ffffff',
  toast1: '#c8782c', toast2: '#e0a052', toast3: '#f1cd8c',
  eye: '#1d1410', blush: '#f49a9a', mouth: '#7a2020', tongue: '#ff8a8a',
  straw: '#dcab5e', straw2: '#b9853c', straw3: '#f2d08a', band: '#6b4423',
  stem: '#5c9e2e', grain: '#f3c33a', grain2: '#c9921c', wood: '#8a5a2b', metal: '#c9d1d8', red: '#e5533d', gold: '#f7c531',
};

/** 애니메이션별 자세 값 (aL/aR: 화면 기준 왼쪽/오른쪽 팔, 0=아래 π=위, 양수=바깥) */
function poseParams(pose, t) {
  const s = Math.sin(t * 6);
  const P = { aL: 0.35, aR: 0.35, bob: 0, legA: 0, legB: 0, jump: 0, lean: 0, expr: null };
  switch (pose) {
    case 'wave': P.aR = 2.6 + Math.sin(t * 10) * 0.4; P.aL = 0.3; P.expr = 'happy'; break;
    case 'cheer': P.aL = 2.5 + s * 0.3; P.aR = 2.5 - s * 0.3; P.jump = Math.max(0, Math.sin(t * 8)) * 0.05; P.expr = 'excited'; break;
    case 'jump': P.aL = P.aR = 2.7; P.jump = Math.abs(Math.sin(t * 5)) * 0.12; P.expr = 'excited'; break;
    case 'think': P.aL = 0.25; P.aR = 2.3; P.expr = 'think'; break;
    case 'clap': { const k = (Math.sin(t * 12) + 1) / 2; P.aL = P.aR = 1.2 + k * 0.6; P.expr = 'happy'; break; }
    case 'run': P.aL = 0.9 + s * 0.8; P.aR = 0.9 - s * 0.8; P.legA = s; P.legB = -s; P.jump = Math.abs(Math.cos(t * 6)) * 0.04; P.lean = 0.1; P.expr = 'focus'; break;
    case 'walk': P.aL = 0.4 + s * 0.3; P.aR = 0.4 - s * 0.3; P.legA = s * 0.6; P.legB = -s * 0.6; break;
    case 'stumble': P.aL = 2.3; P.aR = 1.8; P.lean = 0.3; P.expr = 'surprise'; break;
    case 'getup': P.aL = P.aR = 0.6; P.expr = 'smile'; break;
    case 'dance': P.aL = 1.6 + Math.sin(t * 7.3); P.aR = 1.6 + Math.sin(t * 7.3 + Math.PI); P.lean = Math.sin(t * 3.7) * 0.1; P.expr = 'excited'; break;
    case 'win': P.aL = 2.8; P.aR = 2.8; P.jump = Math.abs(Math.sin(t * 4)) * 0.08; P.expr = 'excited'; break;
    case 'sad': P.aL = P.aR = 0.15; P.expr = 'sad'; break;
    case 'success': P.aL = 2.7; P.aR = 0.5; P.jump = Math.abs(Math.sin(t * 6)) * 0.05; P.expr = 'excited'; break;
    case 'fail': P.aL = P.aR = 1.0; P.expr = 'oops'; break;
    case 'chop': { const k = (Math.sin(t * 7) + 1) / 2; P.aL = P.aR = 0.5 + k * 2.4; P.expr = 'focus'; break; }
    case 'm-leftUp': P.aL = 2.95; P.aR = 0.25; P.expr = 'excited'; break;
    case 'm-rightUp': P.aR = 2.95; P.aL = 0.25; P.expr = 'excited'; break;
    case 'm-wide': P.aL = P.aR = 1.57; P.expr = 'happy'; break;
    case 'm-sway': P.aL = P.aR = 0.5; P.lean = Math.sin(t * 5) * 0.18; P.expr = 'happy'; break;
    case 'm-bothUp': P.aL = P.aR = 2.9; P.expr = 'excited'; break;
    case 'm-cross': P.cross = true; P.expr = 'focus'; break;
    case 'm-down': P.aL = P.aR = 0.2; break;
    default: P.aL = 0.35 + Math.sin(t * 2) * 0.1; P.aR = 0.35 - Math.sin(t * 2) * 0.1; P.bob = Math.sin(t * 3) > 0.3 ? 1 : 0;
  }
  return P;
}

// ── 픽셀 버퍼 ──
class Grid {
  constructor() { this.px = new Array(GW * GH).fill(null); }
  set(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < GW && y < GH) this.px[y * GW + x] = c; }
  get(x, y) { return x >= 0 && y >= 0 && x < GW && y < GH ? this.px[y * GW + x] : null; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  disc(cx, cy, r, c) { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r * 0.6) this.set(cx + i, cy + j, c); }
  line(x0, y0, x1, y1, r, c) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let k = 0; k <= n; k++) this.disc(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), r, c);
  }
  /** 투명 칸 중 채워진 칸에 닿은 곳을 외곽선 색으로 */
  outline(c) {
    const add = [];
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      if (this.get(x, y)) continue;
      if (this.get(x + 1, y) || this.get(x - 1, y) || this.get(x, y + 1) || this.get(x, y - 1)) add.push([x, y]);
    }
    for (const [x, y] of add) this.set(x, y, c);
  }
}

function buildSprite(team, pose, t, expr0, prop) {
  const g = new Grid();
  const col = TEAM_COLORS[team] || TEAM_COLORS.green;
  const P = poseParams(pose, t);
  const expr = expr0 || P.expr || 'smile';
  const by = P.bob; // 숨쉬기 1px
  const L = 14, R = 33, T = 13 + by, B = 52; // 몸통
  // 다리
  const leg = (x, ph) => {
    const lift = Math.round(Math.max(0, ph) * 3), dx = Math.round(ph * 2);
    g.rect(x + dx, B - 1, 5, 8 - lift, C.body);
    g.rect(x + dx - 1, B + 6 - lift, 7, 3, col.dark);
  };
  leg(17, P.legA); leg(26, P.legB);
  // 몸통 (위아래 둥근 캡슐)
  const rad = 9;
  for (let y = T; y <= B; y++) {
    let inset = 0;
    if (y < T + rad) { const d = T + rad - y; inset = Math.round(rad - Math.sqrt(Math.max(0, rad * rad - d * d))); }
    if (y > B - 5) { const d = y - (B - 5); inset = Math.round(5 - Math.sqrt(Math.max(0, 25 - d * d))); }
    for (let x = L + inset; x <= R - inset; x++) {
      let c = C.body;
      if (x >= R - inset - 2) c = C.body2;
      if (x <= L + inset + 2 && x >= L + inset + 1 && y > T + 4 && y < B - 8) c = C.hi;
      // 노릇하게 구운 윗부분 (디더링 그라데이션)
      const ty = y - T;
      if (ty < 3) c = C.toast1;
      else if (ty < 6) c = (x + y) % 2 ? C.toast1 : C.toast2;
      else if (ty < 8) c = C.toast2;
      else if (ty < 10) c = (x + y) % 2 ? C.toast2 : C.toast3;
      else if (ty < 11) c = (x + y) % 2 ? C.toast3 : c;
      if (y >= B - 1) c = (x + y) % 2 ? C.toast3 : c; // 아래도 살짝
      g.set(x, y, c);
    }
  }
  // 조끼
  const vy = 37 + by, vh = 11;
  for (let y = vy; y < vy + vh; y++) for (let x = L; x <= R; x++) {
    const cur = g.get(x, y); if (!cur) continue;
    const vOpen = y < vy + 6 && Math.abs(x - 24) <= Math.max(0, 3 - (y - vy) / 2);
    if (vOpen) continue;
    let c = col.main;
    if (x >= R - 2) c = col.dark;
    if (y === vy + vh - 1) c = col.dark;
    g.set(x, y, c);
  }
  // 스티치(점선)
  for (let x = L + 2; x <= R - 2; x += 2) g.set(x, vy + vh - 2, col.light);
  for (let k = 0; k < 6; k += 2) { g.set(24 - 3 + Math.floor(k / 2) - 1, vy + k, col.light); g.set(24 + 3 - Math.floor(k / 2) + 1, vy + k, col.light); }
  g.set(24, vy + 6, C.wood); g.set(24, vy + 7, C.wood); // 단추
  // 벼 자수
  g.set(29, vy + 7, C.stem); g.set(29, vy + 6, C.stem); g.set(30, vy + 5, C.hi); g.set(28, vy + 5, C.hi); g.set(29, vy + 4, C.hi);

  // 얼굴
  const ey = 26 + by;
  const eye = (x, kind) => {
    if (kind === 'arc') { g.set(x - 1, ey + 1, C.eye); g.set(x, ey, C.eye); g.set(x + 1, ey + 1, C.eye); return; }
    if (kind === 'x') { g.set(x - 1, ey - 1, C.eye); g.set(x + 1, ey + 1, C.eye); g.set(x, ey, C.eye); g.set(x + 1, ey - 1, C.eye); g.set(x - 1, ey + 1, C.eye); return; }
    if (kind === 'line') { g.rect(x - 1, ey, 3, 1, C.eye); return; }
    g.rect(x - 1, ey - 1, 2, 3, C.eye); g.set(x - 1, ey - 1, C.hi);
    if (kind === 'big') g.rect(x - 1, ey - 2, 2, 1, C.eye);
  };
  const eyes = { excited: ['arc', 'arc'], wink: ['dot', 'arc'], surprise: ['big', 'big'], oops: ['x', 'dot'], focus: ['dot', 'dot'] }[expr] || ['dot', 'dot'];
  eye(20, eyes[0]); eye(29, eyes[1]);
  if (expr === 'focus' || expr === 'sad') { const d = expr === 'sad' ? 1 : -1; g.set(18, ey - 3 + (d < 0 ? 0 : 1), C.eye); g.set(19, ey - 3, C.eye); g.set(30, ey - 3, C.eye); g.set(31, ey - 3 + (d < 0 ? 0 : 1), C.eye); }
  g.rect(16, ey + 3, 3, 2, C.blush); g.rect(30, ey + 3, 3, 2, C.blush);
  const my = ey + 4;
  if (expr === 'excited' || expr === 'happy' || expr === 'smile') {
    const w = expr === 'excited' ? 3 : 2;
    g.rect(24 - w, my, w * 2 + 1, 1, C.mouth); g.rect(24 - w + 1, my + 1, w * 2 - 1, 1, C.mouth);
    if (expr !== 'smile') { g.rect(24 - 1, my + 2, 3, 1, C.mouth); g.rect(23, my + 1, 3, 1, C.tongue); }
  } else if (expr === 'sad') { g.rect(23, my + 1, 3, 1, C.mouth); g.set(22, my + 2, C.mouth); g.set(26, my + 2, C.mouth); }
  else if (expr === 'think' || expr === 'surprise') g.rect(23, my, 2, 2, C.mouth);
  else if (expr === 'oops') { g.set(22, my + 1, C.mouth); g.set(23, my, C.mouth); g.set(24, my + 1, C.mouth); g.set(25, my, C.mouth); g.set(26, my + 1, C.mouth); }
  else g.rect(22, my, 5, 1, C.mouth);
  if (prop === 'glasses') { for (const x of [20, 29]) { g.rect(x - 3, ey - 3, 6, 1, C.eye); g.rect(x - 3, ey + 2, 6, 1, C.eye); g.rect(x - 3, ey - 3, 1, 6, C.eye); g.rect(x + 2, ey - 3, 1, 6, C.eye); } g.rect(23, ey - 1, 3, 1, C.eye); }

  // 밀짚모자 (살짝 기울어짐)
  const hy = T - 1;
  for (let x = 8; x <= 35; x++) { const tilt = x < 16 ? 1 : 0; g.set(x, hy + tilt, C.straw); g.set(x, hy + 1 + tilt, x % 3 ? C.straw : C.straw2); }
  for (let x = 9; x <= 34; x++) g.set(x, hy + 2 + (x < 16 ? 1 : 0), C.straw2);
  for (let y = hy - 7; y < hy; y++) {
    const w = y < hy - 5 ? 6 : 8;
    for (let x = 22 - w; x <= 22 + w; x++) g.set(x, y, (x + y) % 4 === 0 ? C.straw2 : y === hy - 7 ? C.straw3 : C.straw);
  }
  g.rect(14, hy - 3, 17, 2, C.band);

  // 팔 + 손
  const shoulder = (side) => ({ x: side < 0 ? L + 1 : R - 1, y: 38 + by });
  const hands = {};
  for (const side of [-1, 1]) {
    const s0 = shoulder(side);
    let hx, hy2;
    if (P.cross) { hx = 24 - side * 3; hy2 = 40 + by; }
    else { const a = side < 0 ? P.aL : P.aR; hx = s0.x + side * Math.sin(a) * 10; hy2 = s0.y + Math.cos(a) * 10; }
    g.line(s0.x, s0.y, hx, hy2, 1, C.body);
    g.disc(Math.round(hx), Math.round(hy2), 2, C.body);
    hands[side] = { x: Math.round(hx), y: Math.round(hy2) };
  }
  // 소품
  const drawProp = (name, h, side) => {
    const { x, y } = h;
    switch (name) {
      case 'rice': {
        for (let k = 0; k < 15; k++) { g.set(x, y - k, C.stem); if (k > 3) g.set(x + (k % 4 === 0 ? 1 : 0), y - k, C.stem); }
        g.set(x - 1, y - 5, C.stem); g.set(x - 2, y - 7, C.stem); g.set(x + 2, y - 6, C.stem);
        // 고개 숙인 이삭 3갈래
        const ear = (sx, sy, dir) => { for (let k = 0; k < 8; k++) { const ex = sx + dir * Math.round(k * 0.7), ey = sy + Math.round(k * k * 0.08) - 1; g.set(ex, ey, k % 2 ? C.grain2 : C.grain); g.set(ex + dir, ey + 1, C.grain); g.set(ex, ey - 1, C.grain); } };
        ear(x, y - 15, 1); ear(x - 1, y - 13, -1); ear(x + 1, y - 12, 1);
        g.rect(x - 1, y - 3, 3, 2, C.wood); break;
      }
      case 'whistle': g.rect(x + side * 2, y - 1, 3, 2, C.metal); g.set(x + side * 4, y - 2, C.metal); break;
      case 'flagB': case 'flagW': { const c = name === 'flagB' ? '#3b78e7' : '#e9a91f'; for (let k = 0; k < 12; k++) g.set(x, y - k, C.wood); g.rect(side < 0 ? x - 7 : x + 1, y - 12, 7, 5, c); g.rect(side < 0 ? x - 5 : x + 3, y - 10, 3, 1, C.hi); break; }
      case 'baton': g.rect(x - 1, y - 4, 2, 7, C.red); break;
      case 'book': g.rect(x - 4, y - 3, 8, 5, '#3f7fd8'); g.rect(x - 3, y - 2, 3, 3, C.hi); g.rect(x + 1, y - 2, 2, 3, C.hi); break;
      case 'trophy': g.rect(x - 3, y - 9, 7, 4, C.gold); g.rect(x - 2, y - 5, 5, 2, C.gold); g.rect(x - 1, y - 3, 3, 2, C.gold); g.rect(x - 3, y - 1, 7, 2, C.gold); g.set(x - 4, y - 8, C.gold); g.set(x + 4, y - 8, C.gold); break;
      default: break;
    }
  };
  if (prop === 'flags') { drawProp('flagB', hands[-1], -1); drawProp('flagW', hands[1], 1); }
  else if (prop && prop !== 'glasses') drawProp(prop, hands[1], 1);
  g.outline(C.out);
  return g;
}

const cache = new Map();
function spriteCanvas(team, pose, t, expr, prop) {
  const f = Math.floor(t * 8); // 레트로 느낌: 초당 8프레임 단위로 끊어서 움직임
  const key = `${team}|${pose}|${expr}|${prop}|${f % 96}`;
  let c = cache.get(key);
  if (!c) {
    const g = buildSprite(team, pose, f / 8, expr, prop);
    c = document.createElement('canvas'); c.width = GW; c.height = GH;
    const x = c.getContext('2d');
    for (let i = 0; i < g.px.length; i++) if (g.px[i]) { x.fillStyle = g.px[i]; x.fillRect(i % GW, Math.floor(i / GW), 1, 1); }
    if (cache.size > 2500) cache.clear();
    cache.set(key, c);
  }
  return { c, P: poseParams(pose, f / 8) };
}

/** x, y: 발바닥 위치, s: 캐릭터 높이(px). opts: { team, pose, t, expr, prop, shadow, flipX } */
export function drawCharacter(ctx, x, y, s, opts = {}) {
  const { team = 'green', pose = 'idle', t = 0, prop = null, shadow = true, expr = null } = opts;
  const { c, P } = spriteCanvas(team, pose, t, expr, prop);
  const px = s / GH;
  const w = GW * px, h = GH * px;
  const jump = Math.round(P.jump * GH) * px;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (shadow) { ctx.fillStyle = 'rgba(40,25,10,0.25)'; const sw = Math.round(14 * (1 - P.jump * 2)) * px; ctx.fillRect(Math.round(x - sw), Math.round(y - px * 1.5), Math.round(sw * 2), Math.round(px * 2)); }
  ctx.translate(Math.round(x), Math.round(y - jump));
  if (P.lean) ctx.rotate(Math.round(P.lean * 20) / 20);
  if (opts.flipX) ctx.scale(-1, 1);
  ctx.drawImage(c, -w / 2, -h, w, h);
  ctx.restore();
}

// ── 화면 곳곳의 캐릭터 캔버스를 하나의 루프로 움직이는 관리자 ──
const sprites = new Set();
let rafOn = false;
export function mountCharacter(canvas, opts) {
  const sp = { canvas, opts: { ...opts }, t0: performance.now() / 1000 + Math.random() * 3 };
  canvas._sprite = sp;
  canvas.style.imageRendering = 'pixelated';
  sprites.add(sp);
  if (!rafOn) { rafOn = true; requestAnimationFrame(loop); }
  return sp;
}
export function setCharacter(canvas, patch) { if (canvas && canvas._sprite) Object.assign(canvas._sprite.opts, patch); }
function loop() {
  const now = performance.now() / 1000;
  for (const sp of sprites) {
    if (!sp.canvas.isConnected) { sprites.delete(sp); continue; }
    const c = sp.canvas, ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    const s = Math.min(c.height * 0.95, (c.width * GH) / GW * 0.95);
    drawCharacter(ctx, c.width / 2, c.height * 0.98, s, { ...sp.opts, t: now - sp.t0 });
  }
  if (sprites.size) requestAnimationFrame(loop); else rafOn = false;
}

/** 캐릭터 PNG(투명 배경) 내보내기 */
export function characterPNG(team, pose, prop, size = 512, t = 0.4) {
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  drawCharacter(c.getContext('2d'), size / 2, size * 0.98, size * 0.95, { team, pose, prop, t, shadow: false });
  return c.toDataURL('image/png');
}
