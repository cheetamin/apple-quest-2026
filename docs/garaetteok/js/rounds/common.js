// 신체 라운드 공용 도우미
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export const TEAMS = ['blue', 'white'];
export const TEAM_NAME_DEFAULT = { blue: '청팀', white: '백팀' };

export function fields(r) {
  const w = r.w / 2;
  return {
    blue: { x: r.x, y: r.y, w, h: r.h, cx: r.x + w / 2 },
    white: { x: r.x + w, y: r.y, w, h: r.h, cx: r.x + w + w / 2 },
  };
}

/** 팀 영역 바깥쪽 모서리 x (가운데 제목과 겹치지 않게) */
export const outerX = (team, f, off) => (team === 'blue' ? f.x + off : f.x + f.w - off);

/** 학년군 1(1~2), 2(3~4), 3(5~6) */
export const band = (grade) => (grade <= 2 ? 1 : grade <= 4 ? 2 : 3);

/** 가로로 누운 가래떡 */
export function drawTteok(ctx, x, y, len, th, { alpha = 1, golden = false, burnt = false } = {}) {
  ctx.save(); ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(0, y - th / 2, 0, y + th / 2);
  if (golden) { g.addColorStop(0, '#fff3b0'); g.addColorStop(0.5, '#ffd23f'); g.addColorStop(1, '#e0a000'); }
  else if (burnt) { g.addColorStop(0, '#8a7a6a'); g.addColorStop(0.5, '#5a4a3c'); g.addColorStop(1, '#3a2e24'); }
  else { g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#fbf6ec'); g.addColorStop(1, '#e2d6bf'); }
  ctx.fillStyle = g; ctx.strokeStyle = golden ? '#c58a00' : burnt ? '#2a2018' : '#cdbfa4'; ctx.lineWidth = 3;
  roundRect(ctx, x, y - th / 2, Math.max(th * 0.4, len), th, Math.min(th / 2, Math.max(2, len / 2))); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  if (len > th) { roundRect(ctx, x + th * 0.3, y - th * 0.32, Math.max(0, len - th * 0.6), th * 0.16, th * 0.08); ctx.fill(); }
  ctx.restore();
}

export function label(ctx, text, x, y, { size = 34, color = '#fff', bg = 'rgba(40,25,10,0.65)', pad = 16, align = 'center' } = {}) {
  ctx.save();
  ctx.font = `700 ${size}px "Galmuri11","Do Hyeon",sans-serif`;
  const w = ctx.measureText(text).width + pad * 2, hh = size + pad;
  const lx = align === 'center' ? x - w / 2 : x;
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(Math.round(lx), Math.round(y - hh / 2), Math.round(w), Math.round(hh)); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(Math.round(lx), Math.round(y - hh / 2), Math.round(w), 3); }
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, lx + w / 2, y + 2);
  ctx.restore();
}

/** 화면에 잠깐 떠오르는 판정 글자 */
export class Popups {
  constructor() { this.list = []; }
  add(text, x, y, color = '#fff') { this.list.push({ text, x, y, color, t: 0 }); }
  draw(ctx, dt) {
    this.list = this.list.filter((p) => (p.t += dt) < 1.1);
    for (const p of this.list) {
      ctx.save(); ctx.globalAlpha = Math.min(1, 1.6 - p.t * 1.4);
      ctx.font = '900 44px "Galmuri11","Do Hyeon",sans-serif'; ctx.textAlign = 'center';
      ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(40,25,10,0.8)'; ctx.strokeText(p.text, p.x, p.y - p.t * 70);
      ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y - p.t * 70);
      ctx.restore();
    }
  }
}

/** 팀이 인식되지 않을 때 해당 영역을 흐리게 */
export function drawPausedField(ctx, f, msg) {
  ctx.save();
  ctx.fillStyle = 'rgba(30,40,50,0.55)'; ctx.fillRect(f.x, f.y, f.w, f.h);
  label(ctx, msg, f.cx, f.y + f.h / 2, { size: 30, bg: 'rgba(0,0,0,0.6)' });
  ctx.restore();
}

export const STATUS_MSG = {
  lost: '학생이 보이지 않아요 · 채점 멈춤',
  overlap: '서로 너무 가까워요 · 간격 벌리기',
  holding: '',
  calibrating: '자리 확인 중',
};
