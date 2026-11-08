// 11라운드: 몸으로 말해요! 가래떡 OX — O: 양팔 머리 위, X: 양팔 교차. 1초 유지하면 답 확정.
import { HoldDetector, oxPose } from '../core/gestures.js';
import { oxScore } from '../core/scoring.js';
import { TEAMS, fields, band, label, outerX } from './common.js';
import { drawCharacter } from '../core/character.js';

export function createOX(env) {
  const b = band(env.grade);
  const qTime = [0, 11, 9.5, 8.5][b] * (env.slow ? 1.3 : 1);
  const revealTime = 3.6;
  const qs = env.questions; // [{q, answer:'O'|'X', explain}]
  let i = -1, phase = 'gap', pt = 0.3;
  const S = {};
  for (const t of TEAMS) S[t] = { asked: 0, correct: 0, confirmed: 0, ans: null, hold: { O: new HoldDetector(1000), X: new HoldDetector(1000) }, seenActive: false, cur: null };

  const next = () => {
    i++; phase = 'q'; pt = 0;
    if (i >= qs.length) i = 0;
    for (const t of TEAMS) { const s = S[t]; s.ans = null; s.seenActive = false; s.hold.O.reset(); s.hold.X.reset(); }
    env.audio.speak(qs[i].q.replace(/^넌센스!|^추리!/, (m) => m.replace('!', '. ')));
  };
  const reveal = () => {
    phase = 'reveal'; pt = 0;
    const q = qs[i];
    for (const t of TEAMS) {
      const s = S[t];
      if (!s.seenActive) continue;
      s.asked++;
      if (s.ans) s.confirmed++;
      if (s.ans === q.answer) s.correct++;
    }
    const anyRight = TEAMS.some((t) => S[t].ans === q.answer);
    env.audio.sfx(anyRight ? 'correct' : 'wrong');
  };

  return {
    altButtons: [{ a: 'O', label: '⭕ O', hold: true }, { a: 'X', label: '❌ X', hold: true }],
    instruction: () => (phase === 'q' ? '맞으면 ⭕ 양팔을 머리 위로, 틀리면 ❌ 양팔을 가슴 앞에서 교차! 1초 동안 유지하세요.' : qs[i] ? `정답: ${qs[i].answer} — ${qs[i].explain}` : ''),
    counts: () => ({ blue: S.blue.correct, white: S.white.correct }),
    update(dt, t, inputs) {
      pt += dt;
      if (phase === 'gap') { if (pt > 0.3) next(); return; }
      if (phase === 'reveal') { if (pt >= revealTime) next(); return; }
      for (const team of TEAMS) {
        const s = S[team], inp = inputs[team];
        if (!inp.active || !inp.sig) { s.cur = null; continue; }
        s.seenActive = true;
        if (s.ans) continue;
        const p = oxPose(inp.sig);
        s.cur = p;
        for (const k of ['O', 'X']) {
          if (s.hold[k].update(p === k, t)) { s.ans = k; env.audio.sfx('select'); }
        }
      }
      if (pt >= qTime || TEAMS.every((tm) => S[tm].ans || !inputs[tm].active)) reveal();
    },
    draw(ctx, rect, t) {
      const F = fields(rect);
      const q = qs[i];
      if (!q) return;
      // 문제 배너 (화면 아래쪽: O 자세의 손이 가려지지 않게)
      const by = rect.y + rect.h - 186;
      ctx.save();
      ctx.fillStyle = 'rgba(255,250,235,0.95)'; ctx.strokeStyle = '#b07a3c'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.roundRect(rect.x + 30, by, rect.w - 60, 150, 28); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4a2f12'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let fs = 50; ctx.font = `800 ${fs}px "Galmuri11","Do Hyeon",sans-serif`;
      while (ctx.measureText(q.q).width > rect.w - 120 && fs > 28) { fs -= 2; ctx.font = `800 ${fs}px "Galmuri11","Do Hyeon",sans-serif`; }
      wrap(ctx, q.q, rect.x + rect.w / 2, by + 75, rect.w - 120, fs * 1.15);
      ctx.restore();
      if (phase === 'q') {
        const k = 1 - pt / qTime;
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(rect.x + 60, by + 156, rect.w - 120, 12);
        ctx.fillStyle = k > 0.3 ? '#4caf50' : '#e53935'; ctx.fillRect(rect.x + 60, by + 156, (rect.w - 120) * k, 12);
      }
      for (const team of TEAMS) {
        const s = S[team], f = F[team];
        const show = s.ans || s.cur;
        if (phase === 'q') {
          if (s.ans) label(ctx, `${s.ans === 'O' ? '⭕' : '❌'} 확정!`, f.cx, f.y + 110, { size: 46, bg: 'rgba(30,120,50,0.85)' });
          else if (show) {
            const pr = s.hold[show].progress(performance.now());
            label(ctx, `${show === 'O' ? '⭕' : '❌'} ${Math.round(pr * 100)}%`, f.cx, f.y + 110, { size: 40 });
          }
        } else {
          const ok = s.ans === q.answer;
          label(ctx, s.ans ? (ok ? `${s.ans} 정답! 🎉` : `${s.ans} 아쉬워요`) : '응답 없음', f.cx, f.y + 110, { size: 42, bg: ok ? 'rgba(30,120,50,0.85)' : 'rgba(120,60,30,0.8)' });
        }
        label(ctx, `⭕ ${s.correct}/${s.asked}`, outerX(team, f, 90), f.y + 46, { size: 30 });
      }
      if (phase === 'reveal') {
        label(ctx, `정답 ${q.answer === 'O' ? '⭕' : '❌'}`, rect.x + rect.w / 2, rect.y + 200, { size: 64, bg: 'rgba(40,25,10,0.8)', color: '#fff7c2', pad: 24 });
        drawCharacter(ctx, rect.x + rect.w / 2, by - 10, 170, { team: 'green', pose: q.answer === 'O' ? 'm-bothUp' : 'm-cross', prop: 'glasses', t });
      }
    },
    debug: () => ({ q: qs[i], phase }),
    result() {
      const out = {};
      for (const t of TEAMS) out[t] = oxScore(S[t]);
      return out;
    },
    detail: () => ({ blue: `${S.blue.asked}문제 중 ${S.blue.correct}개 정답`, white: `${S.white.asked}문제 중 ${S.white.correct}개 정답` }),
  };
}

function wrap(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  const lines = []; let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  lines.push(line);
  const y0 = y - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, k) => ctx.fillText(l, x, y0 + k * lh));
}
