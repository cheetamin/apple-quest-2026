// 5라운드: 청가래떡 백가래떡 대회 (청기백기 변형)
// 청가래떡 = 학생 자신의 왼팔, 백가래떡 = 오른팔. 관절 라벨(실제 몸 기준)로 판정하므로 거울 모드와 무관.
import { clamp100 } from '../core/scoring.js';
import { makeRng } from '../core/simpose.js';
import { TEAMS, fields, band, label, Popups, outerX } from './common.js';
import { drawCharacter } from '../core/character.js';

export function makeCommands(grade, n, seed = 5) {
  const rng = makeRng(seed);
  const b = band(grade);
  let L = false, R = false;
  const out = [];
  const nm = { L: '청가래떡', R: '백가래떡' };
  for (let i = 0; i < n; i++) {
    const r = rng();
    let text, nL = L, nR = R, neg = false;
    if (b >= 3 && r < 0.22) {
      // 부정 명령: 상태 유지
      const side = rng() < 0.5 ? 'L' : 'R';
      const cur = side === 'L' ? L : R;
      text = `${nm[side]} ${cur ? '내리지 마!' : '올리지 마!'}`;
      neg = true;
    } else if (b >= 2 && r < 0.55) {
      const opts = [];
      if (!L || !R) opts.push(['둘 다 올려!', true, true]);
      if (L || R) opts.push(['둘 다 내려!', false, false]);
      if (L !== true || R !== false) opts.push(['청 올리고 백 내려!', true, false]);
      if (L !== false || R !== true) opts.push(['청 내리고 백 올려!', false, true]);
      const o = opts[Math.floor(rng() * opts.length)];
      [text, nL, nR] = o;
    } else {
      const side = rng() < 0.5 ? 'L' : 'R';
      const cur = side === 'L' ? L : R;
      text = `${nm[side]} ${cur ? '내려!' : '올려!'}`;
      if (side === 'L') nL = !L; else nR = !R;
    }
    L = nL; R = nR;
    out.push({ text, L, R, neg });
  }
  return out;
}

export function createFlags(env) {
  const b = band(env.grade);
  const win = [0, 3.2, 2.5, 1.9][b] * (env.slow ? 1.3 : 1);
  const gap = 0.7;
  const cmds = makeCommands(env.grade, 200, env.seed || 5);
  let i = -1, phase = 'gap', pt = 0.6;
  const S = {};
  for (const t of TEAMS) S[t] = { correct: 0, counted: 0, match: 0, done: false, ok: false, invalid: false, lastRes: null };
  const pop = new Popups();
  let F = null;

  const startCmd = () => {
    i++; phase = 'cmd'; pt = 0;
    for (const t of TEAMS) Object.assign(S[t], { match: 0, done: false, ok: false, invalid: false });
    env.audio.sfx('whistle');
    if (b === 1) env.audio.speak(cmds[i].text, 'ko-KR', 1.15);
  };
  const finishCmd = () => {
    const c = cmds[i];
    for (const t of TEAMS) {
      const s = S[t];
      if (s.invalid) { s.lastRes = null; continue; }
      if (!s.done) { s.ok = c.neg ? s.match >= 0.3 : false; s.done = true; }
      s.counted++; if (s.ok) s.correct++;
      s.lastRes = s.ok;
      if (F) pop.add(s.ok ? '정답!' : '아쉬워요', F[t].cx, F[t].y + 220, s.ok ? '#9dff9d' : '#ffccbc');
      if (s.ok) env.audio.sfx('flag');
    }
    phase = 'gap'; pt = 0;
  };

  return {
    altButtons: [{ a: 'L', label: '청가래떡(왼팔)', hold: true }, { a: 'R', label: '백가래떡(오른팔)', hold: true }],
    instruction: () => (i >= 0 && phase === 'cmd' ? `📣 ${cmds[i].text}` : '청가래떡 = 내 왼팔, 백가래떡 = 내 오른팔! 명령을 잘 듣고 움직여요.'),
    counts: () => ({ blue: S.blue.correct, white: S.white.correct }),
    update(dt, t, inputs) {
      pt += dt;
      if (phase === 'gap') { if (pt >= gap) startCmd(); return; }
      const c = cmds[i];
      for (const team of TEAMS) {
        const s = S[team], inp = inputs[team];
        if (!inp.active) { s.invalid = true; continue; }
        if (s.done) continue;
        const sig = inp.sig;
        const m = sig && sig.leftUp === c.L && sig.rightUp === c.R;
        s.match = m ? s.match + dt : 0;
        if (!c.neg && s.match >= 0.25) { s.done = true; s.ok = true; }
      }
      if (pt >= win) finishCmd();
    },
    draw(ctx, rect, t, dt) {
      F = fields(rect);
      const c = i >= 0 ? cmds[i] : null;
      if (c && phase === 'cmd') {
        label(ctx, c.text, rect.x + rect.w / 2, rect.y + 60, { size: 58, bg: 'rgba(40,25,10,0.8)', color: '#fff7c2', pad: 26 });
        const k = 1 - pt / win;
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(rect.x + rect.w / 2 - 200, rect.y + 108, 400, 12);
        ctx.fillStyle = '#ffd54a'; ctx.fillRect(rect.x + rect.w / 2 - 200, rect.y + 108, 400 * k, 12);
      }
      for (const team of TEAMS) {
        const f = F[team], s = S[team], inp = env.lastInputs ? env.lastInputs[team] : null;
        const sig = inp && inp.sig;
        // 학생의 현재 깃발 상태를 캐릭터로 보여 줌 (거울 화면에서 학생 왼팔 = 화면 왼쪽)
        const L = sig && sig.leftUp, R = sig && sig.rightUp;
        const pose = L && R ? 'm-bothUp' : L ? 'm-leftUp' : R ? 'm-rightUp' : 'm-down';
        drawCharacter(ctx, f.x + (team === 'blue' ? 110 : f.w - 110), f.y + f.h - 20, 190, { team, pose, prop: 'flags', t, flipX: !env.mirror });
        if (s.done && phase === 'cmd') label(ctx, s.ok ? '⭕' : '', f.cx, f.y + 200, { size: 60, bg: null });
        label(ctx, `🚩 ${s.correct}/${s.counted}`, outerX(team, f, 100), f.y + 170, { size: 32 });
      }
      pop.draw(ctx, dt);
    },
    debug: () => (i >= 0 ? { ...cmds[i], phase } : null),
    result() {
      const out = {};
      for (const t of TEAMS) out[t] = S[t].counted ? clamp100(100 * S[t].correct / S[t].counted) : 0;
      return out;
    },
    detail: () => ({ blue: `명령 ${S.blue.counted}개 중 ${S.blue.correct}개 성공`, white: `명령 ${S.white.counted}개 중 ${S.white.correct}개 성공` }),
  };
}
