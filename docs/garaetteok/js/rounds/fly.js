// 3라운드: 가래떡 날기 대회 — 두 팔을 날개처럼 위아래로 힘차게 퍼덕이면 가래떡이 하늘로 날아올라요.
// 구름 위 결승점까지 올라가면 1번 도착, 다시 땅에서 출발. 쉬면 천천히 내려와요.
import { FlapDetector } from '../core/gestures.js';
import { fairTarget, clamp100 } from '../core/scoring.js';
import { TEAMS, fields, band, label, Popups, outerX } from './common.js';
import { drawCharacter } from '../core/character.js';

export const FLY = { GOAL: 300, IMPULSE: 30, VMAX: 55, VMIN: -35 };

/** 순수 물리: 한 번 갱신 (테스트용으로도 사용) */
export function flyStep(st, dt, flapped, gravity) {
  if (flapped) st.v = Math.min(FLY.VMAX, Math.max(st.v, 0) + FLY.IMPULSE);
  st.v = Math.max(FLY.VMIN, st.v - gravity * dt);
  st.alt = Math.max(0, st.alt + st.v * dt);
  if (st.alt === 0 && st.v < 0) st.v = 0;
  if (st.alt >= FLY.GOAL) { st.alt = 0; st.v = 0; st.arrivals++; return true; }
  return false;
}

export function createFly(env) {
  const b = band(env.grade);
  const slow = env.slow ? 0.8 : 1;
  const gravity = [0, 24, 28, 32][b] * slow;
  const target = Math.max(2, [0, 5, 6, 7][b] * env.duration / 60 * slow);
  const S = {};
  for (const t of TEAMS) S[t] = { det: new FlapDetector({ minGap: env.slow ? 300 : 230 }), alt: 0, v: 0, arrivals: 0, best: 0, flaps: 0, flapT: -9, celebrate: 0 };
  const pop = new Popups();
  let F = null, clock = 0;

  return {
    altButtons: [{ a: 'act', label: '🪽 날갯짓!', tap: true }],
    instruction: () => '두 팔을 날개처럼 머리 위로 올렸다가 아래로 힘차게! 쉬지 않고 퍼덕이면 구름 위 결승점까지 날아올라요.',
    counts: () => ({ blue: S.blue.arrivals, white: S.white.arrivals }),
    update(dt, t, inputs) {
      clock += dt;
      for (const team of TEAMS) {
        const s = S[team], inp = inputs[team];
        s.celebrate = Math.max(0, s.celebrate - dt);
        if (!inp.active) { s.det.reset(); continue; } // 인식 안 되면 그 자리에 멈춤(공정)
        const flapped = s.det.update(inp.sig ? inp.sig.handHeight : null, t, env.sens);
        if (flapped) { s.flaps++; s.flapT = clock; env.audio.sfx('flag'); }
        const arrived = flyStep(s, dt, flapped, gravity);
        s.best = Math.max(s.best, s.alt);
        if (arrived) { s.celebrate = 1.2; env.audio.sfx('gold'); if (F) pop.add('구름 위 도착! +1', F[team].cx, F[team].y + 120, '#fff176'); }
      }
    },
    draw(ctx, rect, t, dt) {
      F = fields(rect);
      for (const team of TEAMS) {
        const s = S[team], f = F[team];
        ctx.save();
        ctx.beginPath(); ctx.rect(f.x, f.y, f.w, f.h); ctx.clip();
        // 높이에 따라 흐르는 하늘(도트 구름)
        const scroll = (s.alt / FLY.GOAL) * 600 + s.arrivals * 600;
        for (let i = 0; i < 6; i++) {
          const cy = f.y + ((i * 160 + scroll) % (f.h + 160)) - 80;
          const cx = f.x + ((i * 97) % (f.w - 120)) + 20;
          ctx.fillStyle = 'rgba(255,255,255,0.55)';
          ctx.fillRect(Math.round(cx), Math.round(cy), 96, 18); ctx.fillRect(Math.round(cx + 18), Math.round(cy - 14), 48, 16);
        }
        // 결승 구름
        const goalY = f.y + 70;
        ctx.fillStyle = '#ffffff'; ctx.fillRect(f.x + 30, goalY - 10, f.w - 60, 22);
        ctx.fillStyle = '#2a1a0e'; ctx.fillRect(f.x + 30, goalY + 12, f.w - 60, 4);
        for (let x = f.x + 30; x < f.x + f.w - 30; x += 24) { ctx.fillStyle = ((x / 24) | 0) % 2 ? '#2a1a0e' : '#fff'; ctx.fillRect(x, goalY - 26, 12, 12); }
        // 높이 막대
        const mx = team === 'blue' ? f.x + 16 : f.x + f.w - 40;
        ctx.fillStyle = '#2a1a0e'; ctx.fillRect(mx, goalY, 24, f.h - 130);
        const k = s.alt / FLY.GOAL;
        ctx.fillStyle = team === 'blue' ? '#3b78e7' : '#e9a91f';
        const bh = (f.h - 136) * k; ctx.fillRect(mx + 3, f.y + f.h - 63 - bh, 18, bh);
        // 날아오르는 가래떡 + 픽셀 날개
        const groundY = f.y + f.h - 40, topY = goalY + 150;
        const cy = groundY - (groundY - topY) * k;
        const flap = clock - s.flapT < 0.18;
        const wy = cy - 110, wx = f.cx;
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#2a1a0e'; ctx.lineWidth = 4;
        for (const side of [-1, 1]) {
          const up = flap ? -36 : 18;
          ctx.beginPath();
          ctx.moveTo(wx + side * 34, wy);
          ctx.lineTo(wx + side * 120, wy + up - 20);
          ctx.lineTo(wx + side * 104, wy + up + 6);
          ctx.lineTo(wx + side * 120, wy + up + 18);
          ctx.lineTo(wx + side * 92, wy + up + 30);
          ctx.lineTo(wx + side * 40, wy + 34);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        drawCharacter(ctx, f.cx, cy, 170, { team, pose: s.celebrate ? 'win' : flap ? 'm-bothUp' : s.alt > 1 ? 'm-wide' : 'idle', t, shadow: s.alt < 2 });
        ctx.restore();
        label(ctx, `☁ ${s.arrivals}번 도착`, outerX(team, f, 110), f.y + 30, { size: 26 });
      }
      pop.draw(ctx, dt);
    },
    result(active) {
      const out = {};
      for (const t of TEAMS) { const s = S[t]; out[t] = clamp100(100 * (s.arrivals + (s.alt / FLY.GOAL) * 0.8) / fairTarget(target, active[t])); }
      return out;
    },
    debug: () => ({ S }),
    detail: () => ({ blue: `구름 위 ${S.blue.arrivals}번 도착 · 날갯짓 ${S.blue.flaps}번`, white: `구름 위 ${S.white.arrivals}번 도착 · 날갯짓 ${S.white.flaps}번` }),
  };
}
