// 7라운드: 가래떡 댄스 대회 〈떡떡! 가래떡 댄스〉
// 예쁘게 추는지가 아니라, 정해진 동작을 박자 안에 정확히 하고 유지했는지만 객관적으로 평가한다.
import { CONFIG } from '../config.js';
import { clamp100 } from '../core/scoring.js';
import { TEAMS, fields, band, label, Popups, outerX } from './common.js';
import { drawCharacter } from '../core/character.js';

export const MOVES = {
  leftUp: { name: '왼팔 들기', icon: '🙋', test: (s) => s.leftUp && !s.rightUp, pose: 'm-leftUp' },
  rightUp: { name: '오른팔 들기', icon: '🙋‍♂️', test: (s) => s.rightUp && !s.leftUp, pose: 'm-rightUp' },
  wide: { name: '양팔 벌리기', icon: '🤸', test: (s) => s.wide, pose: 'm-wide' },
  sway: { name: '좌우 흔들기', icon: '💃', test: (s) => Math.abs(s.lean || 0) > 0.1, pose: 'm-sway' },
  bothUp: { name: '양팔 위로!', icon: '🙌', test: (s) => s.bothUp || (s.leftUp && s.rightUp), pose: 'm-bothUp' },
};
const ROUTINE = ['leftUp', 'rightUp', 'wide', 'sway', 'bothUp', 'rightUp', 'leftUp', 'bothUp', 'wide', 'sway', 'leftUp', 'bothUp', 'rightUp', 'wide', 'sway', 'bothUp'];
export const LYRICS = ['쭉쭉 늘려 가래떡!', '톡톡 잘라 가래떡!', '왼쪽 오른쪽 흔들흔들', '오늘은 우리가 떡 챔피언!', '손을 번쩍, 어깨 들썩!', '리듬 따라 떡떡떡!'];

export function createDance(env) {
  const b = band(env.grade);
  const BEATS = 4;               // 동작 하나 = 4박(1마디)
  const bpm = CONFIG.danceBpm;
  let t0 = null, lastIdx = -1;
  const S = {};
  for (const t of TEAMS) S[t] = { scores: [], frames: 0, hit: 0, first: null, activeFrames: 0, total: 0, streak: 0 };
  const pop = new Popups();
  let F = null, curBeat = 0;
  const graceBeats = b === 1 ? 1.25 : 1;

  const closeMove = (idx) => {
    for (const team of TEAMS) {
      const s = S[team];
      if (s.total > 0 && s.activeFrames / s.total >= 0.5) {
        const frac = s.frames ? s.hit / s.frames : 0;
        const timing = s.first == null ? 0 : s.first <= graceBeats ? 1 : s.first <= 2 ? 0.6 : 0.3;
        const sc = 0.6 * frac + 0.4 * timing;
        s.scores.push(sc);
        if (F) pop.add(sc >= 0.75 ? '완벽해요!' : sc >= 0.45 ? '좋아요!' : '다음엔 꼭!', F[team].cx, F[team].y + 260, sc >= 0.75 ? '#9dff9d' : sc >= 0.45 ? '#fff59d' : '#ffe0b2');
        if (sc >= 0.75) env.audio.sfx('point');
      }
      Object.assign(s, { frames: 0, hit: 0, first: null, activeFrames: 0, total: 0 });
    }
  };

  return {
    music: 'dance',
    altButtons: [{ a: 'L', label: '왼팔', hold: true }, { a: 'R', label: '오른팔', hold: true }, { a: 'W', label: '벌리기', hold: true }, { a: 'O', label: '양팔 위', hold: true }, { a: 'left', label: '흔들기', hold: true }],
    instruction: () => {
      const idx = Math.max(0, lastIdx);
      const m = MOVES[ROUTINE[idx % ROUTINE.length]], n = MOVES[ROUTINE[(idx + 1) % ROUTINE.length]];
      return `지금: ${m.icon} ${m.name}  →  다음: ${n.icon} ${n.name}   ♪ ${LYRICS[Math.floor(curBeat / 8) % LYRICS.length]}`;
    },
    counts: () => ({ blue: S.blue.scores.filter((x) => x >= 0.45).length, white: S.white.scores.filter((x) => x >= 0.45).length }),
    update(dt, t, inputs) {
      const ab = env.audio.beat();
      if (t0 == null) t0 = t;
      curBeat = ab != null ? ab : ((t - t0) / 1000) * bpm / 60;
      if (curBeat < 0) return;
      const idx = Math.floor(curBeat / BEATS);
      if (idx !== lastIdx) { if (lastIdx >= 0) closeMove(lastIdx); lastIdx = idx; env.audio.sfx('tteok'); }
      const inMove = curBeat - idx * BEATS;
      const mv = MOVES[ROUTINE[idx % ROUTINE.length]];
      for (const team of TEAMS) {
        const s = S[team], inp = inputs[team];
        s.total++;
        if (!inp.active || !inp.sig) continue;
        s.activeFrames++;
        const ok = mv.test(inp.sig);
        if (ok && s.first == null) s.first = inMove;
        if (inMove >= 0.75) { s.frames++; if (ok) s.hit++; }
      }
    },
    draw(ctx, rect, t, dt) {
      F = fields(rect);
      const idx = Math.max(0, lastIdx);
      const key = ROUTINE[idx % ROUTINE.length], next = ROUTINE[(idx + 1) % ROUTINE.length];
      const cx = rect.x + rect.w / 2;
      // 무대 조명
      const g = ctx.createRadialGradient(cx, rect.y + 120, 10, cx, rect.y + 120, 360);
      g.addColorStop(0, 'rgba(255,230,120,0.45)'); g.addColorStop(1, 'rgba(255,230,120,0)');
      ctx.fillStyle = g; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      // 시범 캐릭터 (학생이 거울처럼 따라 하도록)
      drawCharacter(ctx, cx, rect.y + 330, 260, { team: 'green', pose: MOVES[key].pose, t, flipX: !env.mirror });
      label(ctx, `${MOVES[key].icon} ${MOVES[key].name}`, cx, rect.y + 40, { size: 44, bg: 'rgba(80,30,120,0.75)', color: '#fff' });
      label(ctx, `다음 ▶ ${MOVES[next].name}`, cx, rect.y + 370, { size: 24 });
      // 박자 표시
      const inMove = curBeat - idx * BEATS;
      for (let k = 0; k < BEATS; k++) {
        ctx.fillStyle = k <= inMove ? '#ffd54a' : 'rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.arc(cx - 60 + k * 40, rect.y + 410, k === Math.floor(inMove) ? 15 : 10, 0, Math.PI * 2); ctx.fill();
      }
      // 가사
      label(ctx, `♪ ${LYRICS[Math.floor(curBeat / 8) % LYRICS.length]}`, cx, rect.y + rect.h - 40, { size: 36, bg: 'rgba(255,255,255,0.85)', color: '#6a1b9a' });
      for (const team of TEAMS) {
        const s = S[team];
        const avg = s.scores.length ? Math.round(100 * s.scores.reduce((a, c) => a + c, 0) / s.scores.length) : 0;
        label(ctx, `💃 ${avg}%`, outerX(team, F[team], 90), F[team].y + 46, { size: 32 });
      }
      pop.draw(ctx, dt);
    },
    debug: () => ({ move: ROUTINE[Math.max(0, lastIdx) % ROUTINE.length], beat: curBeat }),
    finish() { if (lastIdx >= 0) closeMove(lastIdx); },
    result() {
      const out = {};
      for (const t of TEAMS) { const a = S[t].scores; out[t] = a.length ? clamp100(100 * a.reduce((x, y) => x + y, 0) / a.length) : 0; }
      return out;
    },
    detail: () => ({ blue: `동작 ${S.blue.scores.length}개 평가`, white: `동작 ${S.white.scores.length}개 평가` }),
  };
}
