// 공용 UI 도우미
import { audio } from './core/audio.js';
import { mountCharacter } from './core/character.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** "2|3" 같은 분수 표기를 세로 분수 HTML 로 */
export function richText(s) {
  return esc(s).replace(/(?:(\d+) )?(\d+)\|(\d+)/g, (m, w, n, d) =>
    `${w ? `<span class="fw">${w}</span>` : ''}<span class="frac"><span>${n}</span><span>${d}</span></span>`);
}

/** 화면 안의 <canvas data-char="blue" data-pose="cheer"> 를 캐릭터로 */
export function mountChars(root) {
  $$('canvas[data-char]', root).forEach((c) => {
    mountCharacter(c, { team: c.dataset.char, pose: c.dataset.pose || 'idle', prop: c.dataset.prop || null });
  });
}

/** 큰 버튼에 터치 반응 + 소리 (pointerdown 사용: 전자칠판 다중 터치 대응) */
export function onTap(el, fn, { sound = 'tap' } = {}) {
  el.addEventListener('pointerdown', (e) => {
    if (e.button && e.button !== 0) return;
    e.preventDefault();
    audio.unlock();
    if (sound) audio.sfx(sound);
    el.classList.add('pressed'); setTimeout(() => el.classList.remove('pressed'), 140);
    fn(e);
  });
}

export function toast(msg, ms = 2200) {
  const t = h(`<div class="toast">${esc(msg)}</div>`);
  document.getElementById('stage').appendChild(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}

export function confirmBox(msg, { ok = '확인', cancel = '취소' } = {}) {
  return new Promise((res) => {
    const m = h(`<div class="modal-back"><div class="modal card">
      <p class="modal-msg">${esc(msg)}</p>
      <div class="row center gap"><button class="btn ghost" data-a="0">${esc(cancel)}</button><button class="btn" data-a="1">${esc(ok)}</button></div>
    </div></div>`);
    document.getElementById('stage').appendChild(m);
    $$('button', m).forEach((b) => onTap(b, () => { m.remove(); res(b.dataset.a === '1'); }));
  });
}

export function modal(html, { onClose, cls = '' } = {}) {
  const m = h(`<div class="modal-back"><div class="modal card ${cls}"><button class="x-btn" aria-label="닫기">✕</button>${html}</div></div>`);
  document.getElementById('stage').appendChild(m);
  const close = () => { m.remove(); if (onClose) onClose(); };
  onTap($('.x-btn', m), close);
  return { el: m, close };
}

export function fmtTime(sec) {
  sec = Math.max(0, Math.ceil(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

/** 3초 카운트다운 오버레이 */
export function countdown(parent, n = 3) {
  return new Promise((res) => {
    const o = h(`<div class="countdown"><span></span></div>`);
    parent.appendChild(o);
    const span = $('span', o);
    let k = n;
    const step = () => {
      if (k === 0) { span.textContent = '시작!'; audio.sfx('go'); setTimeout(() => { o.remove(); res(); }, 600); return; }
      span.textContent = k; span.classList.remove('pop'); void span.offsetWidth; span.classList.add('pop');
      audio.sfx('count'); k--; setTimeout(step, 900);
    };
    step();
  });
}

export function confetti(parent, ms = 5000) {
  const c = document.createElement('canvas'); c.width = 1920; c.height = 1080; c.className = 'confetti';
  parent.appendChild(c);
  const ctx = c.getContext('2d');
  const cols = ['#2f80ed', '#f5b301', '#ff6b6b', '#3fae5a', '#ffffff', '#ffd95a'];
  const P = Array.from({ length: 220 }, () => ({ x: Math.random() * 1920, y: -Math.random() * 1080, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3, c: cols[Math.floor(Math.random() * cols.length)], s: 8 + Math.random() * 10, tteok: Math.random() < 0.15 }));
  const t0 = performance.now();
  const loop = () => {
    const el = performance.now() - t0;
    ctx.clearRect(0, 0, 1920, 1080);
    for (const p of P) {
      p.x += p.vx; p.y += p.vy; p.r += p.vr;
      if (p.y > 1100 && el < ms) { p.y = -20; p.x = Math.random() * 1920; }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      if (p.tteok) { ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#d8ccb6'; ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.45, 0, 0, 6.28); ctx.fill(); ctx.stroke(); }
      else { ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); }
      ctx.restore();
    }
    if (el < ms + 3000 && c.isConnected) requestAnimationFrame(loop); else c.remove();
  };
  loop();
}

// ── 레트로 픽셀 제목: 글자를 저해상도로 그린 뒤 계단식 외곽선·그림자를 넣어 확대 ──
const PIX_FONT = '"Galmuri11","DungGeunMo","Black Han Sans","Do Hyeon",sans-serif';
export function pixelText(text, { height = 120, k = 6, colors = ['#fff7c2', '#ffd23f', '#f5a623'], outline = '#3b2414', shadow = '#3b2414', weight = '700' } = {}) {
  const fs = Math.max(8, Math.round(height / k / 1.25));
  const m = document.createElement('canvas').getContext('2d');
  m.font = `${weight} ${fs}px ${PIX_FONT}`;
  const tw = Math.ceil(m.measureText(text).width);
  const w = tw + 6, hh = Math.ceil(fs * 1.3) + 6;
  const src = document.createElement('canvas'); src.width = w; src.height = hh;
  const s = src.getContext('2d');
  s.font = m.font; s.textBaseline = 'middle'; s.fillStyle = '#000';
  s.fillText(text, 3, hh / 2 - 1);
  const a = s.getImageData(0, 0, w, hh).data;
  const mask = new Uint8Array(w * hh);
  for (let i = 0; i < mask.length; i++) mask[i] = a[i * 4 + 3] > 100 ? 1 : 0;
  const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < hh ? mask[y * w + x] : 0);
  const out = s.createImageData(w, hh);
  const put = (i, hex) => { const n = parseInt(hex.slice(1), 16); out.data[i * 4] = n >> 16; out.data[i * 4 + 1] = (n >> 8) & 255; out.data[i * 4 + 2] = n & 255; out.data[i * 4 + 3] = 255; };
  let y0 = hh, y1 = 0;
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (mask[i]) { const band = Math.min(colors.length - 1, Math.floor(((y - y0) / Math.max(1, y1 - y0 + 1)) * colors.length)); put(i, colors[band]); }
    else if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1) || at(x - 1, y - 1) || at(x + 1, y - 1)) put(i, outline);
    else if (at(x - 2, y - 2) || at(x - 1, y - 2) || at(x - 2, y - 1)) put(i, shadow);
  }
  s.clearRect(0, 0, w, hh); s.putImageData(out, 0, 0);
  const c = document.createElement('canvas');
  c.width = w * k; c.height = hh * k;
  const cx = c.getContext('2d'); cx.imageSmoothingEnabled = false;
  cx.drawImage(src, 0, 0, c.width, c.height);
  c.className = 'pixel-text';
  c.setAttribute('role', 'img'); c.setAttribute('aria-label', text);
  return c;
}

/** data-pixel="높이" 요소의 글자를 픽셀 제목으로 바꾼다. data-pc="색1,색2,색3" 로 색 지정 */
export function pixelize(root) {
  $$('[data-pixel]', root).forEach((el) => {
    if (!el.dataset.text) el.dataset.text = el.textContent.trim();
    const opts = { height: +el.dataset.pixel || 80, k: +(el.dataset.k || 0) || Math.max(3, Math.round((+el.dataset.pixel || 80) / 22)) };
    if (el.dataset.pc) opts.colors = el.dataset.pc.split(',');
    el.textContent = '';
    el.appendChild(pixelText(el.dataset.text, opts));
  });
}
