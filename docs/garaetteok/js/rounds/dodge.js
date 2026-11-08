// 9라운드: 날아오는 가래떡 피하기 — 몸통 중심을 좌우로 살짝 옮겨 3개 차선 이동. 점프·앉기 없음.
// 두 팀은 같은 순서의 장애물(같은 시드)을 받아 공정하게 겨룬다.
import { LaneTracker } from '../core/gestures.js';
import { clamp100 } from '../core/scoring.js';
import { makeRng } from '../core/simpose.js';
import { TEAMS, fields, band, drawTteok, label, Popups, outerX } from './common.js';
import { drawCharacter } from '../core/character.js';

export function createDodge(env) {
  const b = band(env.grade);
  const slow = env.slow ? 0.75 : 1;
  const interval = [0, 1.5, 1.15, 0.9][b] / slow;
  const speed = [0, 0.45, 0.55, 0.66][b] * slow; // 화면 높이/초
  const rng = makeRng(env.seed || 9);
  const S = {};
  for (const t of TEAMS) S[t] = { lane: new LaneTracker({ th: env.seated ? 0.35 : 0.55 }), cur: 0, x: 0, objs: [], dodged: 0, hit: 0, gold: 0, goldSeen: 0, wasActive: false, hitT: 0 };
  let spawnT = 0.8, waveId = 0;
  const pop = new Popups();
  let F = null;

  const spawn = () => {
    waveId++;
    const lanes = [-1, 0, 1];
    const two = b >= 2 && rng() < 0.4;
    const shuffled = lanes.sort(() => rng() - 0.5);
    const obs = two ? shuffled.slice(0, 2) : shuffled.slice(0, 1);
    const free = lanes.filter((l) => !obs.includes(l));
    const gold = rng() < 0.35 ? free[Math.floor(rng() * free.length)] : null;
    for (const t of TEAMS) {
      for (const l of obs) S[t].objs.push({ lane: l, y: -0.1, kind: 'rock', id: waveId, r: rng() * 6 });
      if (gold != null) S[t].objs.push({ lane: gold, y: -0.1, kind: 'gold', id: waveId, r: 0 });
    }
  };

  return {
    altButtons: [{ a: 'left', label: '◀ 왼쪽', hold: true }, { a: 'right', label: '오른쪽 ▶', hold: true }],
    instruction: () => (env.seated ? '앉은 자리에서 몸을 왼쪽·오른쪽으로 살짝 기울여 탄 떡을 피하고 황금 가래떡을 모아요!' : '옆으로 한 걸음씩 움직여 까만 탄 떡을 피하고 황금 가래떡을 모아요! 뛰거나 점프하지 않아요.'),
    counts: () => ({ blue: S.blue.dodged + S.blue.gold, white: S.white.dodged + S.white.gold }),
    update(dt, t, inputs) {
      spawnT -= dt;
      if (spawnT <= 0) { spawn(); spawnT = interval * (0.85 + rng() * 0.3); }
      for (const team of TEAMS) {
        const s = S[team], inp = inputs[team];
        const act = inp.active && inp.sig;
        if (act) {
          if (inp.sig.laneOverride != null) s.cur = inp.sig.laneOverride;
          else {
            const x = env.seated ? inp.sig.geo.shC.x : inp.sig.center.x;
            if (!s.wasActive) s.lane.setBase(x);
            s.cur = s.lane.update(x, inp.sig.shW, env.sens);
          }
        }
        s.wasActive = !!act;
        s.x += (s.cur - s.x) * Math.min(1, dt * 12);
        s.hitT = Math.max(0, s.hitT - dt);
        for (const o of s.objs) {
          o.y += speed * dt; o.r += dt * 3;
          if (!o.done && o.y >= 0.84) {
            o.done = true;
            if (!act) { o.void = true; continue; }
            const same = Math.round(s.x) === o.lane;
            if (o.kind === 'rock') {
              if (same) { s.hit++; s.hitT = 0.5; o.hitMe = true; env.audio.sfx('hit'); if (F) pop.add('앗!', F[team].cx, F[team].y + F[team].h * 0.6, '#ffccbc'); }
              else s.dodged++;
            } else {
              s.goldSeen++;
              if (same) { s.gold++; o.got = true; env.audio.sfx('gold'); if (F) pop.add('황금 떡!', F[team].cx, F[team].y + F[team].h * 0.6, '#fff176'); }
            }
          }
        }
        s.objs = s.objs.filter((o) => o.y < 1.15 && !o.got);
      }
    },
    draw(ctx, rect, t, dt) {
      F = fields(rect);
      for (const team of TEAMS) {
        const s = S[team], f = F[team];
        const laneW = f.w / 3;
        const lx = (l) => f.cx + l * laneW;
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ctx.setLineDash([12, 12]);
        for (const k of [-0.5, 0.5]) { ctx.beginPath(); ctx.moveTo(f.cx + k * laneW, f.y + 10); ctx.lineTo(f.cx + k * laneW, f.y + f.h - 10); ctx.stroke(); }
        ctx.setLineDash([]);
        for (const o of s.objs) {
          const y = f.y + o.y * f.h;
          ctx.save(); ctx.translate(lx(o.lane), y); ctx.rotate(o.kind === 'gold' ? Math.sin(o.r) * 0.2 : o.r);
          if (o.kind === 'gold') { drawTteok(ctx, -55, 0, 110, 40, { golden: true }); }
          else drawTteok(ctx, -50, 0, 100, 42, { burnt: true, alpha: o.void ? 0.35 : 1 });
          ctx.restore();
        }
        const px = f.cx + s.x * laneW, py = f.y + f.h * 0.97;
        drawCharacter(ctx, px, py, 150, { team, pose: s.hitT ? 'stumble' : 'run', t });
        label(ctx, `✨ ${s.gold}  🛡 ${s.dodged}`, outerX(team, f, 120), f.y + 46, { size: 30 });
      }
      pop.draw(ctx, dt);
    },
    debug: () => ({ S }),
    result() {
      const out = {};
      for (const t of TEAMS) {
        const s = S[t];
        const seen = s.dodged + s.hit;
        const dr = seen ? s.dodged / seen : 0;
        const gr = s.goldSeen ? s.gold / s.goldSeen : dr;
        out[t] = seen ? clamp100(100 * (0.65 * dr + 0.35 * gr)) : 0;
      }
      return out;
    },
    detail: () => ({ blue: `피함 ${S.blue.dodged} · 부딪힘 ${S.blue.hit} · 황금 ${S.blue.gold}`, white: `피함 ${S.white.dodged} · 부딪힘 ${S.white.hit} · 황금 ${S.white.gold}` }),
  };
}
