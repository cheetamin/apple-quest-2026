// 3라운드: 가래떡 쌓기 대회 — 손을 바구니에 0.5초 대면 집기, 탑 위로 옮겨 0.7초 멈추면 내려놓기.
// 정교한 손가락 집기 대신 손목 위치 + 유지 시간으로 안정적으로 판정한다.
import { fairTarget, clamp100 } from '../core/scoring.js';
import { TEAMS, fields, band, drawTteok, label, Popups, outerX } from './common.js';

export function createStack(env) {
  const b = band(env.grade);
  const target = Math.max(3, Math.round([0, 6, 8, 10][b] * env.duration / 60 * (env.slow ? 0.8 : 1)));
  const CAKE_W = [0, 190, 170, 150][b], CAKE_H = 34;
  const PICK_MS = 500, DROP_MS = 700;
  const S = {};
  for (const t of TEAMS) S[t] = { state: 'pick', hold: 0, hand: null, cur: null, prev: null, tower: [], q: 0, perfect: 0, miss: 0, falling: [], altPhase: Math.random() * 6 };
  const pop = new Popups();
  let F = null;

  const handPos = (team, inp, f) => {
    const sig = inp.sig;
    if (!sig) return null;
    const s = S[team];
    const map = (rel) => rel && ({
      x: Math.max(f.x + 30, Math.min(f.x + f.w - 30, f.cx + rel.x * f.w * 0.42)),
      y: Math.max(f.y + 30, Math.min(f.y + f.h - 20, f.y + ((rel.y + 1.4) / 2.6) * f.h)),
    });
    const L = map(sig.handL), R = map(sig.handR);
    if (s.state === 'carry' && s.hand) return s.hand === 'L' ? L || R : R || L;
    if (!L) return R ? { ...R, side: 'R' } : null;
    if (!R) return { ...L, side: 'L' };
    return { L: { ...L, side: 'L' }, R: { ...R, side: 'R' } };
  };

  return {
    altButtons: [{ a: 'act', label: '⬇ 내려놓기', tap: true }],
    instruction: () => '① 손을 바구니에 대고 잠깐 기다리면 가래떡을 집어요 ② 탑 위로 옮겨서 멈추면 쌓여요. 가운데에 맞출수록 보너스!',
    counts: () => ({ blue: S.blue.tower.length, white: S.white.tower.length }),
    altTap(team) { S[team].altDrop = true; },
    update(dt, t, inputs) {
      if (!F) return;
      for (const team of TEAMS) {
        const s = S[team], f = F[team], inp = inputs[team];
        for (const c of s.falling) { c.vy += 1200 * dt; c.y += c.vy * dt; c.r += c.vr * dt; }
        s.falling = s.falling.filter((c) => c.y < f.y + f.h + 200);
        const baseY = f.y + f.h - 40;
        const topY = baseY - s.tower.length * CAKE_H;
        const basket = { x: team === 'blue' ? f.x + 95 : f.x + f.w - 95, y: f.y + f.h - 95 };
        s.basket = basket; s.topY = topY;
        if (!inp.active) { s.hold = 0; continue; }
        if (inp.sig && inp.sig.alt) {
          // 대체 입력: 자동으로 집고, 탑 위를 좌우로 움직이는 떡을 버튼으로 내려놓기
          s.state = 'carry';
          s.altPhase += dt * (env.slow ? 1.4 : 2);
          s.cur = { x: f.cx + Math.sin(s.altPhase) * f.w * 0.3, y: Math.max(f.y + 80, topY - 90) };
          if (s.altDrop) { s.altDrop = false; this._drop(team, s.cur.x, f); }
          continue;
        }
        const hp = handPos(team, inp, f);
        if (!hp) { s.hold = 0; continue; }
        if (s.state === 'pick') {
          const cand = hp.L ? [hp.L, hp.R] : [hp];
          const inBasket = cand.find((p) => Math.hypot(p.x - basket.x, p.y - basket.y) < 95);
          s.cur = inBasket || cand.reduce((a, c) => (c.y < a.y ? c : a));
          if (inBasket) { s.hold += dt * 1000; if (s.hold >= PICK_MS) { s.state = 'carry'; s.hand = inBasket.side; s.hold = 0; env.audio.sfx('select'); } }
          else s.hold = 0;
        } else {
          const p = hp.L ? (s.hand === 'L' ? hp.L : hp.R) : hp;
          const speed = s.prev ? Math.hypot(p.x - s.prev.x, p.y - s.prev.y) / Math.max(dt, 0.001) : 0;
          s.prev = { ...p }; s.cur = p;
          const inBand = p.y < topY - 10 && p.y > topY - 260;
          if (inBand && speed < 260) { s.hold += dt * 1000; if (s.hold >= DROP_MS) { s.hold = 0; this._drop(team, p.x, f); } }
          else s.hold = Math.max(0, s.hold - dt * 2000);
        }
      }
    },
    _drop(team, x, f) {
      const s = S[team];
      const off = Math.abs(x - f.cx) / CAKE_W;
      let q, txt, col;
      if (off < 0.15) { q = 1.2; txt = '정확해요! +보너스'; col = '#9dff9d'; s.perfect++; }
      else if (off < 0.5) { q = 1 - off * 0.8; txt = '쌓았어요!'; col = '#fff59d'; }
      else { q = 0; txt = '앗, 떨어졌어요'; col = '#ffccbc'; s.miss++; }
      if (q > 0) { s.tower.push({ dx: Math.max(-0.45, Math.min(0.45, (x - f.cx) / CAKE_W)) * CAKE_W * 0.5 }); env.audio.sfx('stack'); }
      else { s.falling.push({ x, y: s.topY - 60, vy: -100, r: 0, vr: 3 }); env.audio.sfx('wrong'); }
      s.q += q; s.state = 'pick'; s.hand = null;
      pop.add(txt, f.cx, s.topY - 80, col);
    },
    draw(ctx, rect, t, dt) {
      F = fields(rect);
      for (const team of TEAMS) {
        const s = S[team], f = F[team];
        const baseY = f.y + f.h - 40;
        // 접시
        ctx.fillStyle = '#e8e2d4'; ctx.strokeStyle = '#a89a80'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(f.cx, baseY + 14, CAKE_W * 0.8, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // 탑 (높아지면 아래쪽은 압축 표시)
        const n = s.tower.length, show = Math.min(n, 12);
        for (let i = n - show; i < n; i++) {
          const k = i - (n - show);
          const y = baseY - k * CAKE_H - CAKE_H / 2 + 4;
          drawTteok(ctx, f.cx - CAKE_W / 2 + s.tower[i].dx, y, CAKE_W, CAKE_H - 4);
        }
        if (n > show) label(ctx, `+${n - show}층`, f.cx, baseY + 40, { size: 22 });
        // 목표 위치 표시
        const topY = baseY - show * CAKE_H;
        ctx.setLineDash([8, 8]); ctx.strokeStyle = 'rgba(76,175,80,0.95)'; ctx.lineWidth = 4;
        ctx.strokeRect(f.cx - CAKE_W * 0.575, topY - CAKE_H - 6, CAKE_W * 1.15, CAKE_H + 2); ctx.setLineDash([]);
        // 바구니
        if (s.basket) {
          const bk = s.basket;
          ctx.fillStyle = '#b07a3c'; ctx.strokeStyle = '#6e4a20'; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(bk.x - 80, bk.y - 20); ctx.lineTo(bk.x + 80, bk.y - 20); ctx.lineTo(bk.x + 60, bk.y + 50); ctx.lineTo(bk.x - 60, bk.y + 50); ctx.closePath(); ctx.fill(); ctx.stroke();
          for (let i = 0; i < 3; i++) drawTteok(ctx, bk.x - 60 + i * 8, bk.y - 30 - i * 14, 110, 24);
          label(ctx, '바구니', bk.x, bk.y + 74, { size: 22 });
        }
        // 손 커서 / 들고 있는 떡
        if (s.cur) {
          if (s.state === 'carry') drawTteok(ctx, s.cur.x - CAKE_W / 2, s.cur.y, CAKE_W, CAKE_H - 4, { alpha: 0.95 });
          ctx.lineWidth = 8; ctx.strokeStyle = team === 'blue' ? '#2f80ed' : '#f5b301';
          ctx.beginPath(); ctx.arc(s.cur.x, s.cur.y, 30, 0, Math.PI * 2); ctx.stroke();
          if (s.hold > 0) {
            ctx.strokeStyle = '#4caf50'; ctx.lineWidth = 10;
            const need = s.state === 'pick' ? PICK_MS : DROP_MS;
            ctx.beginPath(); ctx.arc(s.cur.x, s.cur.y, 42, -Math.PI / 2, -Math.PI / 2 + (s.hold / need) * Math.PI * 2); ctx.stroke();
          }
        }
        for (const c of s.falling) { ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.r); drawTteok(ctx, -CAKE_W / 2, 0, CAKE_W, CAKE_H - 4); ctx.restore(); }
        label(ctx, `🏯 ${n}층`, outerX(team, f, 90), f.y + 46, { size: 34 });
      }
      pop.draw(ctx, dt);
    },
    debug: () => ({ S, F }),
    result(active) {
      const out = {};
      for (const team of TEAMS) out[team] = clamp100(100 * S[team].q / fairTarget(target, active[team]));
      return out;
    },
    detail: () => ({ blue: `${S.blue.tower.length}층 (정확 ${S.blue.perfect})`, white: `${S.white.tower.length}층 (정확 ${S.white.perfect})` }),
  };
}
