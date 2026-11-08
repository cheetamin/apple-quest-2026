// 레트로 도트 배경: 단계별 하늘, 픽셀 해·구름, 겹겹이 산, 황금 논과 나무 울타리
// 480×270 저해상도로 그린 뒤 4배 확대(보간 없음)
import { makeRng } from './simpose.js';

export function drawScenery(canvas, { simple = false } = {}) {
  const W = 480, H = 270;
  const off = document.createElement('canvas'); off.width = W; off.height = H;
  const x = off.getContext('2d');
  const rng = makeRng(20261111);
  const R = (cx, cy, w, h, c) => { x.fillStyle = c; x.fillRect(cx | 0, cy | 0, w | 0, h | 0); };
  // 하늘 (색 띠)
  const sky = ['#4aa3f0', '#5fb1f4', '#77bff7', '#8fccf9', '#a8d9fb', '#c3e6fc'];
  sky.forEach((c, i) => R(0, i * 26, W, 26, c));
  R(0, 156, W, 20, '#dcf1fd');
  if (simple) { R(0, 170, W, 100, '#f0b93a'); finish(); return; }
  // 해
  const sun = (cx, cy) => { for (let j = -12; j <= 12; j++) for (let i = -12; i <= 12; i++) { const d = i * i + j * j; if (d <= 144) R(cx + i, cy + j, 1, 1, d < 64 ? '#fff6c8' : '#ffe47a'); } };
  sun(420, 34);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; R(420 + Math.cos(a) * 20, 34 + Math.sin(a) * 20, 3, 3, '#ffe47a'); }
  // 구름
  const cloud = (cx, cy, s) => {
    R(cx, cy, 28 * s, 6 * s, '#ffffff'); R(cx + 4 * s, cy - 5 * s, 12 * s, 6 * s, '#ffffff'); R(cx + 13 * s, cy - 8 * s, 10 * s, 9 * s, '#ffffff');
    R(cx, cy + 5 * s, 28 * s, 2 * s, '#d5ecfb');
  };
  cloud(30, 40, 1.4); cloud(170, 26, 1); cloud(300, 62, 1.2);
  // 산 (단계)
  const ridge = (base, amp, freq, ph, c, c2) => {
    for (let i = 0; i < W; i++) {
      const y = Math.round(base - Math.abs(Math.sin(i / W * Math.PI * freq + ph)) * amp - Math.sin(i / 7 + ph) * 2);
      R(i, y, 1, H - y, c);
      if (c2 && (i + y) % 5 === 0) R(i, y + 2, 1, 1, c2);
    }
  };
  ridge(150, 34, 2.3, 0.4, '#8bbf6a', '#79ad58');
  ridge(162, 22, 3.4, 2.0, '#e19a42', '#c98432'); // 단풍 언덕
  ridge(170, 12, 5.0, 1.0, '#5f9e48', '#4f8a3b');
  // 논
  const fieldY = 172;
  const rows = ['#f6cf55', '#f0bf3e', '#eab232', '#e2a52a', '#d8981f'];
  rows.forEach((c, i) => { const y = fieldY + Math.round(i * i * 4.5 + i * 6); R(0, y, W, H - y, c); });
  // 벼 포기
  for (let k = 0; k < 520; k++) {
    const t = rng() ** 0.75;
    const y = fieldY + 4 + t * (H - fieldY);
    const cx = rng() * W, s = 1 + Math.floor(t * 3);
    R(cx, y - 3 * s, 1, 3 * s, '#9a8a2a');
    R(cx + 1, y - 3 * s, s, s, '#ffd95a'); R(cx + 1 + s, y - 2 * s, s, s, '#e0a523');
  }
  // 나무 울타리
  const fy = 196;
  R(0, fy, W, 3, '#8a5a2b'); R(0, fy + 7, W, 3, '#8a5a2b'); R(0, fy + 10, W, 1, '#5e3b1a');
  for (let i = 6; i < W; i += 34) { R(i, fy - 6, 5, 22, '#9c6a37'); R(i + 4, fy - 6, 1, 22, '#5e3b1a'); R(i, fy - 7, 5, 1, '#b98552'); }
  // 오솔길
  for (let y = 222; y < H; y++) { const w = 40 + (y - 222) * 2.4; R(W / 2 - w / 2, y, w, 1, (y % 6 < 3) ? '#d9b07a' : '#cfa46c'); }
  finish();
  function finish() {
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
  }
}
