// 신체·혼합 라운드 진행 화면 (카메라 화면이 가장 큰 영역)
import { h, $, $$, onTap, esc, mountChars, countdown, fmtTime } from '../ui.js';
import { setCharacter } from '../core/character.js';
import { audio } from '../core/audio.js';
import { motion } from '../core/motion.js';
import { ROUNDS } from '../rounds/defs.js';
import { STATUS_MSG, drawPausedField, fields } from '../rounds/common.js';
import { allQuestions, filterQuestions, pickQuestions } from '../data/quizbank.js';
import { store } from '../core/store.js';

const KEYMAP = {
  q: ['blue', 'L'], w: ['blue', 'R'], e: ['blue', 'O'], r: ['blue', 'X'], t: ['blue', 'W'], a: ['blue', 'left'], d: ['blue', 'right'], s: ['blue', 'act'], f: ['blue', 'run'], g: ['blue', 'sway'],
  u: ['white', 'L'], i: ['white', 'R'], o: ['white', 'O'], p: ['white', 'X'], y: ['white', 'W'], j: ['white', 'left'], l: ['white', 'right'], k: ['white', 'act'], h: ['white', 'run'], ';': ['white', 'sway'],
};
/** 키보드로 대체 입력/시뮬레이션 조작 (교사용) */
export function bindKeys() {
  const down = (e) => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const m = KEYMAP[e.key.toLowerCase()];
    if (!m || e.repeat) return;
    motion.input(m[0], m[1], true);
  };
  const up = (e) => { const m = KEYMAP[e.key.toLowerCase()]; if (m) motion.input(m[0], m[1], false); };
  window.addEventListener('keydown', down); window.addEventListener('keyup', up);
  return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
}

export function show(app, root, { r, m }) {
  const def = ROUNDS[r];
  const g = app.game, s = g.settings;
  const env = {
    grade: s.grade, sem: s.sem, duration: s.roundSec, slow: s.slow, sens: s.sens, seated: s.seated,
    mirror: app.settings.mirror, audio, seed: g.seed + r * 31 + m * 7,
  };
  if (def.id === 'ox') {
    const recent = store.get('recent', []);
    const pool = filterQuestions(allQuestions(store), { grade: s.grade, sem: s.sem, subject: 'ox' });
    env.questions = pickQuestions(pool, 40, recent);
    store.set('recent', [...env.questions.slice(0, 8).map((q) => q.id), ...recent].slice(0, 300));
  }
  const round = def.create(env);
  window.__gt.round = round; // 점검·자동 테스트용
  const parts = app.participants(r, m);
  const el = h(`<div class="screen play-screen">
    <header class="topbar">
      <div class="tb-title"><span class="mini-logo">가래떡 모션 게임</span><span class="round-badge">ROUND ${def.no} / 12</span></div>
      <div class="tb-name">${def.icon} ${esc(def.name)}</div>
      <div class="tb-right"><span class="chip">🎓 ${s.grade}학년</span><span class="timer" id="timer">${fmtTime(s.roundSec)}</span></div>
    </header>
    ${['blue', 'white'].map((t) => `<aside class="side ${t}">
      <canvas data-char="${t}" data-pose="idle" width="260" height="300"></canvas>
      <div class="team-name">${esc(g.teamNames[t])}</div>
      <div class="player">${esc(app.names(t, parts[t]))}</div>
      ${s.showScore ? `<div class="score-box"><small>누적 점수</small><b>${app.totals()[t]}</b></div>` : ''}
      <div class="count-box"><small>이번 라운드 성공</small><b data-count="${t}">0</b></div>
      <div class="st-chip" data-st="${t}">-</div>
      ${motion.alt[t] ? `<div class="alt-pad">${round.altButtons.map((b) => `<button data-alt="${t}:${b.a}:${b.tap ? 'tap' : 'hold'}">${esc(b.label)}</button>`).join('')}<small>대체 입력(교사)</small></div>` : ''}
    </aside>`).join('')}
    <main class="arena"><canvas width="1280" height="720" id="arena"></canvas></main>
    <footer class="bottombar"><div class="instr" id="instr"></div><div class="motion-st" id="mst"></div></footer>
    <div class="pause-veil hidden" id="veil"><div class="card"><h2 id="veil-t">일시정지</h2><p id="veil-m"></p></div></div>
  </div>`);
  root.appendChild(el);
  mountChars(el);
  const cv = $('#arena', el), ctx = cv.getContext('2d');
  const timerEl = $('#timer', el), instrEl = $('#instr', el), mstEl = $('#mst', el), veil = $('#veil', el);

  // 대체 입력 버튼 (pointerdown/up: 길게 누르기 = 자세 유지)
  $$('[data-alt]', el).forEach((b) => {
    const [t, a, mode] = b.dataset.alt.split(':');
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault(); b.classList.add('pressed'); audio.unlock();
      if (mode === 'tap') { motion.tapAlt(t, a, 200); if (round.altTap) round.altTap(t, a); }
      else motion.input(t, a, true);
    });
    const up = () => { b.classList.remove('pressed'); if (mode !== 'tap') motion.input(t, a, false); };
    b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
  });
  const unbind = bindKeys();

  let left = s.roundSec, running = false, ended = false, raf = 0, lastT = null, lostFor = 0;
  const active = { blue: 0, white: 0 }; let played = 0;
  let lastCounts = { blue: 0, white: 0 };
  const charB = $('.side.blue canvas', el), charW = $('.side.white canvas', el);

  const statusText = (st) => ({ ok: '✅ 인식 중', alt: '🖐 대체 입력', lost: '⚠ 안 보여요', overlap: '↔ 간격 벌리기', holding: '… 확인 중', calibrating: '… 보정 중' }[st] || st);

  const frame = (t) => {
    raf = requestAnimationFrame(frame);
    const dt = lastT == null ? 0 : Math.min(0.05, (t - lastT) / 1000);
    lastT = t;
    const st = motion.tick(t);
    const inputs = {
      blue: { active: running && st.blue.active, sig: st.blue.sig, status: st.blue.status },
      white: { active: running && st.white.active, sig: st.white.sig, status: st.white.status },
    };
    env.lastInputs = inputs;
    const bothGone = !st.blue.active && !st.white.active;
    lostFor = bothGone ? lostFor + dt : 0;
    const autoPause = running && lostFor > 1.0;
    const paused = app.paused || autoPause;
    if (paused) {
      veil.classList.remove('hidden');
      $('#veil-t', el).textContent = app.paused ? '⏸ 일시정지' : '⚠ 두 학생이 모두 보이지 않아요';
      $('#veil-m', el).textContent = app.paused ? '교사 메뉴에서 [계속하기]를 누르세요.' : '카메라 앞 자기 자리에 서 주세요. 다시 인식되면 자동으로 이어서 진행해요. (시간이 멈춰 있어요)';
    } else veil.classList.add('hidden');

    if (running && !paused) {
      left -= dt; played += dt;
      for (const tm of ['blue', 'white']) if (st[tm].active) active[tm] += dt;
      round.update(dt, t, inputs);
      if (left <= 0 && !ended) end();
    }
    // 그리기
    const rect = motion.draw(ctx, 0, 0, 1280, 720, { centerLine: true, labels: true });
    round.draw(ctx, rect, t / 1000, paused ? 0 : dt);
    if (running) {
      const F = fields(rect);
      for (const tm of ['blue', 'white']) {
        const ss = st[tm];
        if (!ss.active && !bothGone && STATUS_MSG[ss.status]) drawPausedField(ctx, F[tm], STATUS_MSG[ss.status]);
      }
    }
    timerEl.textContent = fmtTime(left);
    timerEl.classList.toggle('hurry', left < 10);
    instrEl.textContent = round.instruction();
    const c = round.counts();
    for (const tm of ['blue', 'white']) {
      $(`[data-count="${tm}"]`, el).textContent = c[tm];
      const chip = $(`[data-st="${tm}"]`, el);
      chip.textContent = `${statusText(st[tm].status)}${st[tm].status === 'ok' ? ` · ${Math.round(st[tm].quality * 100)}%` : ''}`;
      chip.className = `st-chip ${st[tm].active ? 'ok' : 'bad'}`;
      if (c[tm] > lastCounts[tm]) { setCharacter(tm === 'blue' ? charB : charW, { pose: 'success' }); clearTimeout(frame['to' + tm]); frame['to' + tm] = setTimeout(() => setCharacter(tm === 'blue' ? charB : charW, { pose: running ? def.char || 'cheer' : 'idle' }), 700); }
    }
    lastCounts = c;
    mstEl.textContent = `카메라 1대 · ${motion.mode === 'camera' ? `${motion.fps}fps` : motion.mode === 'sim' ? '시뮬레이션' : '카메라 없음'} · 인식 ${st.count}명${st.overlap ? ' · 겹침 감지(채점 정지)' : ''}`;
  };

  const end = () => {
    ended = true; running = false;
    if (round.finish) round.finish();
    const frac = { blue: played ? active.blue / played : 0, white: played ? active.white / played : 0 };
    const scores = round.result(frac);
    const detail = round.detail ? round.detail() : null;
    audio.sfx('whistle'); audio.stopSong();
    app.recordMatch(r, m, scores, detail, { activeFrac: frac });
    setTimeout(() => app.go('result', { r, m }), 900);
  };

  raf = requestAnimationFrame(frame);
  (async () => {
    await countdown(el, 3);
    running = true;
    audio.playSong(round.music || 'physical');
    setCharacter(charB, { pose: def.char || 'cheer' }); setCharacter(charW, { pose: def.char || 'cheer' });
  })();

  return () => { cancelAnimationFrame(raf); unbind(); audio.stopSong(); };
}
