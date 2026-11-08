// 1라운드: 가래떡 썰기 대회 — 팔을 위로 올렸다 내리면 1번 썰기. 일정한 길이로 썰수록 높은 점수.
import { ChopDetector } from '../core/gestures.js';
import { fairTarget, clamp100 } from '../core/scoring.js';
import { TEAMS, fields, band, drawTteok, label, Popups, outerX } from './common.js';
import { drawCharacter } from '../core/character.js';

export function createChop(env) {
  const b = band(env.grade);
  const slow = env.slow ? 0.75 : 1;
  const v = [0, 150, 175, 200][b] * slow;          // 떡이 밀려오는 속도(px/s)
  const Ti = [0, 1.6, 1.3, 1.05][b] / slow;          // 이상적인 썰기 간격(초)
  const L = v * Ti;                                  // 목표 길이
  const S = {};
  for (const t of TEAMS) S[t] = { det: new ChopDetector({ minGap: Math.max(280, Ti * 1000 * 0.35) }), off: 0, pieces: [], q: 0, ok: 0, cuts: 0, flash: 0, knife: 0 };
  const pop = new Popups();

  return {
    altButtons: [{ a: 'act', label: '🔪 썰기!', tap: true }],
    instruction: () => '팔을 머리 위로 번쩍 올렸다가 아래로 내리면 가래떡이 썰려요! 초록 고리가 꽉 찼을 때 썰면 최고!',
    counts: () => ({ blue: S.blue.ok, white: S.white.ok }),
    update(dt, t, inputs) {
      for (const team of TEAMS) {
        const s = S[team], inp = inputs[team];
        s.flash = Math.max(0, s.flash - dt); s.knife = Math.max(0, s.knife - dt * 4);
        for (const p of s.pieces) { p.vy += 900 * dt; p.y += p.vy * dt; p.x += p.vx * dt; p.r += p.vr * dt; }
        s.pieces = s.pieces.filter((p) => p.y < 2000);
        if (!inp.active) { s.det.reset(); continue; }
        s.off = Math.min(L * 3, s.off + v * dt);
        const h = inp.sig ? inp.sig.handHeight : null;
        if (s.det.update(h, t, env.sens)) {
          const len = s.off;
          s.off = 0; s.cuts++; s.knife = 1;
          const dev = Math.abs(len - L) / L;
          let q = Math.max(0, 1 - dev / 0.5);
          let txt, col;
          if (len < L * 0.4) { q = 0; txt = '너무 빨라요!'; col = '#ffb4a2'; }
          else if (q >= 0.8) { txt = '딱 좋아요!'; col = '#9dff9d'; }
          else if (q >= 0.5) { txt = '좋아요!'; col = '#fff59d'; }
          else { txt = len > L ? '조금 길어요' : '조금 짧아요'; col = '#ffe0b2'; }
          s.q += q; if (q >= 0.5) { s.ok++; s.flash = 0.3; }
          s.pieces.push({ len, x: 0, y: 0, vx: -60 - Math.random() * 60, vy: -260, r: 0, vr: (Math.random() - 0.5) * 6, fresh: true });
          s.lastTxt = { txt, col };
          env.audio.sfx('chop'); if (q >= 0.8) env.audio.sfx('point');
          s.popPending = { txt, col };
        }
      }
    },
    draw(ctx, rect, t, dt) {
      const F = fields(rect);
      for (const team of TEAMS) {
        const s = S[team], f = F[team];
        const boardY = f.y + f.h * 0.8, th = 46;
        const knifeX = f.cx + f.w * 0.12;
        // 도마
        ctx.fillStyle = '#c98b4e'; ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.roundRect(f.x + 20, boardY - 10, f.w - 40, 60, 16); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(f.x + 40, boardY, f.w - 80, 6);
        // 밀려오는 긴 가래떡 (칼 오른쪽에서 왼쪽으로)
        const logStart = Math.max(f.x + 30, knifeX - s.off);
        drawTteok(ctx, logStart, boardY - th / 2 + 4, f.x + f.w - 30 - logStart, th);
        // 목표 길이 가이드
        ctx.setLineDash([10, 8]); ctx.strokeStyle = 'rgba(80,200,90,0.9)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(knifeX - L, boardY - th - 18); ctx.lineTo(knifeX - L, boardY + 14); ctx.stroke(); ctx.setLineDash([]);
        // 칼 (나무 손잡이, 칼날은 단순한 모양)
        const ky = boardY - th - 70 + s.knife * 40;
        ctx.fillStyle = '#dfe6ea'; ctx.strokeStyle = '#8796a0'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(knifeX - 6, ky); ctx.lineTo(knifeX + 6, ky); ctx.lineTo(knifeX + 6, ky + 70); ctx.lineTo(knifeX - 6, ky + 60); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#8a5a2b'; ctx.beginPath(); ctx.roundRect(knifeX - 9, ky - 46, 18, 48, 6); ctx.fill();
        // 리듬 고리
        const k = s.off / L;
        const ringCol = k < 0.5 ? '#ffb74d' : k <= 1.25 ? '#4caf50' : '#e53935';
        ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.arc(knifeX, ky - 90, 34, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = ringCol;
        ctx.beginPath(); ctx.arc(knifeX, ky - 90, 34, -Math.PI / 2, -Math.PI / 2 + Math.min(1, k) * Math.PI * 2); ctx.stroke();
        if (k >= 0.75 && k <= 1.25) label(ctx, '지금!', knifeX, ky - 90, { size: 22, bg: null, color: '#1b5e20' });
        // 썰린 조각
        for (const p of s.pieces) {
          if (p.fresh) { p.fresh = false; p.x = knifeX - p.len; p.y = boardY - th / 2 + 4; }
          ctx.save(); ctx.translate(p.x + p.len / 2, p.y); ctx.rotate(p.r);
          drawTteok(ctx, -p.len / 2, 0, p.len, th); ctx.restore();
        }
        if (s.popPending) { pop.add(s.popPending.txt, knifeX - L / 2, boardY - th - 40, s.popPending.col); s.popPending = null; }
        if (s.flash) { ctx.fillStyle = `rgba(255,255,200,${s.flash})`; ctx.fillRect(f.x, f.y, f.w, f.h); }
        // 썬 개수
        label(ctx, `🍡 ${s.ok}`, outerX(team, f, 80), f.y + 46, { size: 34 });
      }
      pop.draw(ctx, dt);
      // 캐릭터 시범(가운데 상단, 작게)
      drawCharacter(ctx, rect.x + rect.w / 2, rect.y + 150, 120, { team: 'green', pose: 'chop', t });
    },
    result(active) {
      const out = {};
      for (const team of TEAMS) {
        const tgt = fairTarget(0.8 * env.duration / Ti, active[team]);
        out[team] = clamp100(100 * S[team].q / tgt);
      }
      return out;
    },
    detail: () => ({ blue: `잘 썬 조각 ${S.blue.ok}개 / 전체 ${S.blue.cuts}번`, white: `잘 썬 조각 ${S.white.ok}개 / 전체 ${S.white.cuts}번` }),
  };
}
