// 두뇌 게임(국어·사회·과학·영어): 팀별 10문제 스피드 레이스
// 두 팀이 같은 문제를 서로 다른 순서·다른 선택지 순서로 각자 풀기 → 옆 팀 화면을 봐도 도움이 안 됨.
// 정답 7점씩 + (10문제 완주 & 정확도 70% 이상일 때만) 빨리 끝낼수록 속도 보너스 최대 30점.
import { h, $, $$, esc, richText, fmtTime, countdown, mountChars } from '../ui.js';
import { audio } from '../core/audio.js';
import { motion } from '../core/motion.js';
import { store } from '../core/store.js';
import { ROUNDS } from '../rounds/defs.js';
import { allQuestions, filterQuestions, pickQuestions } from '../data/quizbank.js';
import { quizRaceScore, quizLimit, QUIZ_RACE } from '../core/scoring.js';
import { motionChoice, HoldDetector } from '../core/gestures.js';
import { shuffled } from '../core/roster.js';
import { subjectLabel } from './intro.js';

const NUM = ['①', '②', '③', '④'];

export function show(app, root, { r, m }) {
  const def = app.roundDef(r);
  const g = app.game, s = g.settings;
  let subject = def.subject;
  if (subject === 'eng' && s.grade <= 2 && !s.engTrial) subject = 'kor';
  const useMotion = s.quizInput === 'motion' && motion.mode !== 'none';
  const limit = quizLimit(s.grade, s.slow);
  const recent = store.get('recent', []);
  const pool = filterQuestions(allQuestions(store), { grade: s.grade, sem: s.sem, subject });
  const set = pickQuestions(pool, QUIZ_RACE.COUNT, recent);
  const N = set.length;
  const parts = app.participants(r, m);

  // 팀별 출제 순서: 서로 다르게(첫 문제도 다르게)
  const orderB = shuffled(set.map((_, i) => i));
  let orderW = shuffled(orderB);
  for (let k = 0; k < 20 && N > 1 && orderW[0] === orderB[0]; k++) orderW = shuffled(orderB);
  const choiceOrder = (q) => {
    let ch = q.choices.slice();
    if (useMotion && ch.length > 3) ch = [ch[0], ...shuffled(ch.slice(1)).slice(0, 2)];
    return shuffled(ch);
  };

  const el = h(`<div class="screen quiz-screen race">
    <header class="topbar">
      <div class="tb-title"><span class="round-badge">ROUND ${def.no} / ${def.total}</span><span class="subj">${def.icon} ${esc(subjectLabel(subject, s.grade, s))}</span></div>
      <div class="tb-name">${esc(def.name)} · 10문제 스피드 레이스</div>
      <div class="tb-right"><span class="timer" id="timer">${fmtTime(limit)}</span></div>
    </header>
    <section class="race-area">
      ${['blue', 'white'].map((t) => `<div class="race-panel ${t}" data-team="${t}">
        <div class="race-head"><b>${esc(g.teamNames[t])}</b><span class="who">${esc(app.names(t, parts[t]))}</span><span class="prog" data-prog="${t}">0 / ${N}</span></div>
        <div class="dots" data-dots="${t}">${Array.from({ length: N }, () => '<i></i>').join('')}</div>
        <div class="race-q card">
          <div class="q-emoji" data-emoji="${t}"></div>
          <div class="q-text" data-q="${t}"></div>
          <button class="btn small ghost listen hidden" data-listen="${t}">🔊 듣기</button>
        </div>
        <div class="choices" data-ch="${t}"></div>
        <div class="race-foot"><span class="ans-st" data-st="${t}">${useMotion ? '1=왼손 · 2=오른손 · 3=양손 (1.2초 유지)' : '번호를 고르고 [확정]!'}</span><button class="btn confirm hidden" data-confirm="${t}">✔ 확정</button></div>
        <div class="race-fb hidden" data-fb="${t}"></div>
        <div class="race-done hidden" data-done="${t}"></div>
      </div>`).join('<div class="race-divider"><span>VS</span></div>')}
    </section>
    ${useMotion ? '<canvas class="q-cam race-cam" width="480" height="270" id="qcam"></canvas>' : ''}
    <div class="pause-veil hidden" id="veil"><div class="card"><h2>⏸ 일시정지</h2><p>교사 메뉴에서 [계속하기]를 누르세요.</p></div></div>
  </div>`);
  root.appendChild(el);
  mountChars(el);

  const T = {};
  for (const t of ['blue', 'white']) T[t] = { order: t === 'blue' ? orderB : orderW, idx: 0, ch: [], sel: null, correct: 0, results: [], doneAt: null, wait: 0, hold: new HoldDetector(1200) };
  let elapsed = 0, running = false, ended = false, raf = 0, lastT = null;

  const cur = (t) => set[T[t].order[T[t].idx]];
  const showQ = (t) => {
    const st = T[t];
    if (st.idx >= N) return finishTeam(t);
    const q = cur(t);
    st.ch = choiceOrder(q); st.sel = null; st.hold.reset();
    $(`[data-emoji="${t}"]`, el).textContent = q.emoji || '';
    $(`[data-q="${t}"]`, el).innerHTML = richText(q.q);
    $(`[data-listen="${t}"]`, el).classList.toggle('hidden', !q.listen);
    const box = $(`[data-ch="${t}"]`, el);
    box.classList.toggle('emoji-ch', st.ch.every((c) => /^\p{Extended_Pictographic}/u.test(c)));
    box.innerHTML = st.ch.map((c, k) => `<button class="choice" data-k="${k}"><span class="num">${NUM[k]}</span><span class="ctext">${richText(c)}</span></button>`).join('');
    $$('.choice', box).forEach((b) => b.addEventListener('pointerdown', (e) => {
      e.preventDefault(); audio.unlock();
      if (!running || app.paused || st.wait > 0 || st.doneAt != null || useMotion) return;
      st.sel = +b.dataset.k; audio.sfx('select');
      $$('.choice', box).forEach((x) => x.classList.toggle('sel', x === b));
      $(`[data-confirm="${t}"]`, el).classList.remove('hidden');
      $(`[data-st="${t}"]`, el).textContent = `${NUM[st.sel]} 선택 — [확정]! (바꾸려면 다른 번호)`;
    }));
    $(`[data-confirm="${t}"]`, el).classList.add('hidden');
    $(`[data-st="${t}"]`, el).textContent = useMotion ? '1=왼손 · 2=오른손 · 3=양손 (1.2초 유지)' : '번호를 고르고 [확정]!';
    $(`[data-prog="${t}"]`, el).textContent = `${st.idx + 1} / ${N}`;
    $$(`[data-dots="${t}"] i`, el).forEach((d, i) => d.classList.toggle('now', i === st.idx));
  };
  const answer = (t) => {
    const st = T[t];
    if (st.sel == null || st.wait > 0 || st.doneAt != null) return;
    const q = cur(t);
    const ok = st.ch[st.sel] === q.answer;
    st.results.push(ok); if (ok) st.correct++;
    const dot = $$(`[data-dots="${t}"] i`, el)[st.idx];
    dot.className = ok ? 'o' : 'x';
    const fb = $(`[data-fb="${t}"]`, el);
    fb.className = `race-fb ${ok ? 'good' : 'bad'}`;
    fb.innerHTML = ok ? '⭕ 정답!' : `❌ 실패!<small>정답: ${richText(q.answer)}<br>${esc(q.explain)}</small>`;
    audio.sfx(ok ? 'correct' : 'wrong');
    $(`[data-confirm="${t}"]`, el).classList.add('hidden');
    st.wait = ok ? 0.6 : 1.8; // 틀리면 해설을 읽는 동안 시간이 흘러 서두르면 손해
  };
  const finishTeam = (t) => {
    const st = T[t];
    if (st.doneAt != null) return;
    st.doneAt = elapsed;
    const acc = st.results.length ? st.correct / N : 0;
    const d = $(`[data-done="${t}"]`, el);
    d.classList.remove('hidden');
    d.innerHTML = `<b>🏁 완주!</b><span>${N}문제 중 ${st.correct}개 정답 · 기록 ${fmtTime(st.doneAt)}</span><span class="${acc >= QUIZ_RACE.BONUS_MIN_ACC ? 'good' : 'bad'}">${acc >= QUIZ_RACE.BONUS_MIN_ACC ? '⚡ 속도 보너스 성공!' : '속도 보너스 실패 (정확도 70% 미만)'}</span><small>상대 팀을 기다려요</small>`;
    audio.sfx('finish');
    if (T.blue.doneAt != null && T.white.doneAt != null) setTimeout(end, 1200);
  };
  ['blue', 'white'].forEach((t) => {
    $(`[data-confirm="${t}"]`, el).addEventListener('pointerdown', (e) => { e.preventDefault(); answer(t); });
    $(`[data-listen="${t}"]`, el).addEventListener('pointerdown', (e) => { e.preventDefault(); const q = cur(t); if (q && q.listen) audio.speak(q.listen, 'en-US', 0.85); });
  });

  const end = () => {
    if (ended) return;
    ended = true; running = false;
    store.set('recent', [...set.map((q) => q.id), ...recent].slice(0, 300));
    const scores = {}, detail = {};
    for (const t of ['blue', 'white']) {
      const st = T[t];
      const finished = st.doneAt != null && st.idx >= N;
      scores[t] = quizRaceScore({ total: N, correct: st.correct, finished, timeUsed: finished ? st.doneAt : limit, limit });
      detail[t] = `${N}문제 중 ${st.correct}개 정답 · ${finished ? `완주 ${fmtTime(st.doneAt)}` : `${st.results.length}문제까지 풂(시간 종료)`}${finished && st.correct / N >= QUIZ_RACE.BONUS_MIN_ACC ? ' · 속도 보너스' : ''}`;
    }
    audio.stopSong(); audio.sfx('whistle');
    app.recordMatch(r, m, scores, detail);
    setTimeout(() => app.go('result', { r, m }), 900);
  };

  const qcam = useMotion ? $('#qcam', el).getContext('2d') : null;
  const frame = (t) => {
    raf = requestAnimationFrame(frame);
    const dt = lastT == null ? 0 : Math.min(0.05, (t - lastT) / 1000); lastT = t;
    $('#veil', el).classList.toggle('hidden', !app.paused);
    if (useMotion) {
      const ms = motion.tick(t);
      motion.draw(qcam, 0, 0, 480, 270, { labels: true });
      if (running && !app.paused) for (const tm of ['blue', 'white']) {
        const st = T[tm];
        if (st.wait > 0 || st.doneAt != null || !ms[tm].active) continue;
        const c = motionChoice(ms[tm].sig), k = c - 1;
        if (c && k < st.ch.length) {
          if (st.sel !== k) { st.sel = k; st.hold.reset(); $$(`[data-ch="${tm}"] .choice`, el).forEach((x, i) => x.classList.toggle('sel', i === k)); }
          if (st.hold.update(true, t)) answer(tm);
        } else st.hold.update(false, t);
      }
    }
    if (!running || app.paused) return;
    elapsed += dt;
    const left = limit - elapsed;
    $('#timer', el).textContent = fmtTime(left);
    $('#timer', el).classList.toggle('hurry', left < 10);
    for (const tm of ['blue', 'white']) {
      const st = T[tm];
      if (st.wait > 0) {
        st.wait -= dt;
        if (st.wait <= 0) { $(`[data-fb="${tm}"]`, el).className = 'race-fb hidden'; st.idx++; showQ(tm); }
      }
    }
    if (left <= 0) end();
  };
  raf = requestAnimationFrame(frame);
  (async () => {
    if (!N) { $$('.q-text', el).forEach((x) => { x.textContent = '이 학년·학기·교과에 해당하는 문제가 없어요. 설정의 [문제 관리]에서 추가하거나 학기를 "전체 복습"으로 바꿔 주세요.'; }); return; }
    showQ('blue'); showQ('white');
    $$('.choices', el).forEach((c) => c.classList.add('locked'));
    await countdown(el, 3);
    $$('.choices', el).forEach((c) => c.classList.remove('locked'));
    running = true; audio.playSong('quiz');
  })();
  window.__gt.quizT = T; window.__gt.quizSet = set;
  return () => { cancelAnimationFrame(raf); audio.stopSong(); if ('speechSynthesis' in window) speechSynthesis.cancel(); };
}
