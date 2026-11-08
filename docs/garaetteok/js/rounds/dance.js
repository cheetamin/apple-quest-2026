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
import { SONG_LINES, lyricAt, isSyl, lineAtTime } from '../data/dancesong.js';
import { store } from '../core/store.js';

export function danceTiming() {
  const t = store.get('dance_lyrics', null) || CONFIG.danceLyrics;
  return Array.isArray(t) && t.length ? t : null;
}

/** 실제 음원용 노래방 자막: 저장된 타이밍으로 현재 줄(크게)과 다음 줄 표시 */
function drawTimedKaraoke(ctx, cx, y, timing, t) {
  const k = lineAtTime(timing, t);
  const cur = k >= 0 ? timing[k].text : '♪ 노래가 곧 시작돼요';
  const next = timing[k + 1] ? timing[k + 1].text : '';
  const prog = k >= 0 && timing[k + 1] ? Math.min(1, (t - timing[k].t) / Math.max(0.5, timing[k + 1].t - timing[k].t)) : 0;
  ctx.save();
  ctx.font = '900 44px "Noto Sans KR","Malgun Gothic",sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const tw = ctx.measureText(cur).width, w = tw + 60;
  ctx.fillStyle = '#2a1a0e'; ctx.fillRect(cx - w / 2 - 5, y - 37, w + 10, 74);
  ctx.fillStyle = '#fffbea'; ctx.fillRect(cx - w / 2, y - 32, w, 64);
  ctx.fillStyle = '#9a8a78'; ctx.fillText(cur, cx - tw / 2, y + 2);
  ctx.save(); ctx.beginPath(); ctx.rect(cx - tw / 2, y - 32, tw * prog, 64); ctx.clip();
  ctx.fillStyle = '#e0337a'; ctx.fillText(cur, cx - tw / 2, y + 2); ctx.restore();
  if (next) {
    ctx.font = '700 22px "Noto Sans KR","Malgun Gothic",sans-serif'; ctx.textAlign = 'center';
    const nw = ctx.measureText('다음: ' + next).width + 24;
    ctx.fillStyle = 'rgba(42,26,14,0.8)'; ctx.fillRect(cx - nw / 2, y + 42, nw, 32);
    ctx.fillStyle = '#fff'; ctx.fillText('다음: ' + next, cx, y + 59);
  }
  ctx.restore();
}

/** 타이밍이 없을 때: 후렴 가사를 한눈에 보여 주는 상자 */
function drawChorusBox(ctx, cx, y) {
  ctx.save();
  const lines = SONG_LINES.map((l) => l.text);
  ctx.font = '800 26px "Noto Sans KR","Malgun Gothic",sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  const w = 760, h = 118;
  ctx.fillStyle = '#2a1a0e'; ctx.fillRect(cx - w / 2 - 5, y - h / 2 - 5, w + 10, h + 10);
  ctx.fillStyle = '#fffbea'; ctx.fillRect(cx - w / 2, y - h / 2, w, h);
  ctx.fillStyle = '#e0337a';
  for (let i = 0; i < 3; i++) { ctx.fillText(lines[i * 2], cx - w / 4, y - 36 + i * 36); ctx.fillText(lines[i * 2 + 1], cx + w / 4, y - 36 + i * 36); }
  ctx.restore();
}
export const LYRICS = SONG_LINES.map((l) => l.text);

/** 노래방 자막: 부른 글자는 분홍, 지금 글자는 크게 */
function drawKaraoke(ctx, cx, y, beat) {
  const { line, syl } = lyricAt(Math.max(0, beat));
  const text = SONG_LINES[line].text;
  ctx.save();
  ctx.font = '900 44px "Noto Sans KR","Malgun Gothic",sans-serif'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 60;
  ctx.fillStyle = '#2a1a0e'; ctx.fillRect(cx - w / 2 - 5, y - 37, w + 10, 74);
  ctx.fillStyle = '#fffbea'; ctx.fillRect(cx - w / 2, y - 32, w, 64);
  let x = cx - w / 2 + 30, k = 0;
  for (const ch of text) {
    const cw = ctx.measureText(ch).width;
    let col = '#9a8a78';
    if (isSyl(ch)) { col = k < syl ? '#e0337a' : k === syl ? '#ff1f6b' : '#9a8a78'; if (k === syl) { ctx.fillStyle = 'rgba(255,31,107,0.15)'; ctx.fillRect(x - 3, y - 28, cw + 6, 56); } k++; }
    ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.fillText(ch, x, y + 2); x += cw;
  }
  ctx.font = '700 20px "Galmuri11","Do Hyeon",sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  const nx = SONG_LINES[(line + 1) % SONG_LINES.length].text;
  ctx.fillStyle = 'rgba(42,26,14,0.8)'; const nw = ctx.measureText('다음: ' + nx).width + 24; ctx.fillRect(cx - nw / 2, y + 42, nw, 30);
  ctx.fillStyle = '#fff'; ctx.fillText('다음: ' + nx, cx, y + 58);
  ctx.restore();
}

export function createDance(env) {
  const b = band(env.grade);
  const BEATS = 4;               // 동작 하나 = 4박(1마디)
  const bpm = CONFIG.danceBpm;
  let t0 = null, lastIdx = -1, lastSung = -1;
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
      return `지금: ${m.icon} ${m.name}  →  다음: ${n.icon} ${n.name}  · 노래를 따라 부르며 춤춰요!`;
    },
    counts: () => ({ blue: S.blue.scores.filter((x) => x >= 0.45).length, white: S.white.scores.filter((x) => x >= 0.45).length }),
    update(dt, t, inputs) {
      const ab = env.audio.beat();
      if (t0 == null) t0 = t;
      curBeat = ab != null ? ab : ((t - t0) / 1000) * bpm / 60;
      // 가사 읽어주기: 각 줄이 시작되기 조금 전에(음성 지연 보정) 한 줄씩 부름
      const sungLine = Math.floor((curBeat + 0.5) / 8);
      if (env.sing && !env.audio.usingFile('dance') && sungLine !== lastSung && curBeat > -0.6) { lastSung = sungLine; env.audio.speak(SONG_LINES[sungLine % SONG_LINES.length].text, 'ko-KR', 1.3, { duck: false, force: true }); }
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
      if (env.audio.usingFile('dance')) {
        const timing = danceTiming();
        if (timing) drawTimedKaraoke(ctx, cx, rect.y + rect.h - 90, timing, env.audio.fileTime() || 0);
        else drawChorusBox(ctx, cx, rect.y + rect.h - 80);
      } else drawKaraoke(ctx, cx, rect.y + rect.h - 90, curBeat);
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
