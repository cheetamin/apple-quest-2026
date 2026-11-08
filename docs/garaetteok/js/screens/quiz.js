// 두뇌 게임(국어·사회·과학·영어): 팀별 독립 터치 객관식 — 선택 → 확정 → 정답 공개
import { h, $, $$, esc, richText, fmtTime, countdown, mountChars } from '../ui.js';
import { setCharacter } from '../core/character.js';
import { audio } from '../core/audio.js';
import { motion } from '../core/motion.js';
import { store } from '../core/store.js';
import { ROUNDS } from '../rounds/defs.js';
import { allQuestions, filterQuestions, pickQuestions, teamOrders } from '../data/quizbank.js';
import { quizScore } from '../core/scoring.js';
import { motionChoice, HoldDetector } from '../core/gestures.js';
import { band } from '../rounds/common.js';
import { subjectLabel } from './intro.js';

const NUM = ['①', '②', '③', '④'];

export function show(app, root, { r, m }) {
  const def = ROUNDS[r];
  const g = app.game, s = g.settings;
  let subject = def.subject;
  if (subject === 'eng' && s.grade <= 2 && !s.engTrial) subject = 'kor';
  const useMotion = s.quizInput === 'motion' && (motion.mode !== 'none');
  const b = band(s.grade);
  const qTime = [0, 22, 18, 15][b] * (s.slow ? 1.3 : 1);
  const recent = store.get('recent', []);
  const pool = filterQuestions(allQuestions(store), { grade: s.grade, sem: s.sem, subject });
  const qs = pickQuestions(pool, 40, recent);
  const parts = app.participants(r, m);

  const el = h(`<div class="screen quiz-screen">
    <header class="topbar">
      <div class="tb-title"><span class="round-badge">ROUND ${def.no} / 12</span><span class="subj">${def.icon} ${esc(subjectLabel(subject, s.grade, s))}</span></div>
      <div class="tb-name">${esc(def.name)}</div>
      <div class="tb-right">${s.showScore ? `<span class="tot blue">${esc(g.teamNames.blue)} <b>${app.totals().blue}</b></span><span class="tot white">${esc(g.teamNames.white)} <b>${app.totals().white}</b></span>` : ''}<span class="timer" id="timer">${fmtTime(s.roundSec)}</span></div>
    </header>
    <section class="q-area">
      <canvas class="q-char" data-char="green" data-pose="think" data-prop="glasses" width="220" height="270"></canvas>
      <div class="q-card card">
        <div class="q-meta"><span id="qn"></span><button class="btn small ghost" id="replay">🔊 다시 듣기</button></div>
        <div class="q-emoji" id="qemoji"></div>
        <div class="q-text" id="qtext"></div>
        <div class="q-bar"><i id="qbar"></i></div>
        <div class="q-explain hidden" id="qexp"></div>
      </div>
      ${useMotion ? '<canvas class="q-cam" width="480" height="270" id="qcam"></canvas>' : ''}
    </section>
    <section class="answer-area">
      ${['blue', 'white'].map((t) => `<div class="ans-panel ${t}" data-team="${t}">
        <div class="ans-head"><b>${esc(g.teamNames[t])}</b><span>${esc(app.names(t, parts[t]))}</span><span class="ans-st" data-st="${t}">${useMotion ? '1=왼손 · 2=오른손 · 3=양손' : '정답을 고르고 [확정]!'}</span></div>
        <div class="choices" data-ch="${t}"></div>
        <button class="btn confirm hidden" data-confirm="${t}">✔ 확정</button>
        <div class="teacher-fix hidden" data-fix="${t}"><button class="btn small ghost">교사: 정답 인정</button></div>
      </div>`).join('')}
    </section>
    <div class="pause-veil hidden" id="veil"><div class="card"><h2>⏸ 일시정지</h2><p>교사 메뉴에서 [계속하기]를 누르세요.</p></div></div>
  </div>`);
  root.appendChild(el);
  mountChars(el);
  const qChar = $('.q-char', el);
  const T = {};
  for (const t of ['blue', 'white']) T[t] = { asked: 0, correct: 0, speedSum: 0, sel: null, locked: false, tAns: 0, order: [], hold: new HoldDetector(1200), wasRight: false };

  let qi = -1, phase = 'idle', qt = 0, left = s.roundSec, raf = 0, lastT = null, running = false, ended = false;
  const timerEl = $('#timer', el), bar = $('#qbar', el);

  const speakQ = (q) => {
    const text = q.q.replace(/🔊/g, '').replace(/'[^']*[A-Za-z][^']*'/g, '').replace(/\(그림:[^)]*\)/, '');
    if (subject === 'eng') {
      const en = q.listen || (q.q.match(/'([^']*[A-Za-z][^']*)'/) || [])[1];
      const parts2 = [[text, 'ko-KR']]; if (en) parts2.push([en, 'en-US']);
      audio.speakSeq(parts2);
    } else audio.speak(q.q.replace(/○+/g, '빈칸').replace(/\|/g, '분의'));
  };

  const renderChoices = (t) => {
    const box = $(`[data-ch="${t}"]`, el);
    const st = T[t];
    box.innerHTML = st.order.map((c, k) => `<button class="choice" data-k="${k}"><span class="num">${NUM[k]}</span><span class="ctext">${richText(c)}</span></button>`).join('');
    box.classList.toggle('emoji-ch', st.order.every((c) => /^\p{Extended_Pictographic}/u.test(c)));
    $$('.choice', box).forEach((btn) => btn.addEventListener('pointerdown', (e) => {
      e.preventDefault(); audio.unlock();
      if (phase !== 'q' || st.locked || useMotion) return;
      st.sel = +btn.dataset.k; audio.sfx('select');
      $$('.choice', box).forEach((x) => x.classList.toggle('sel', x === btn));
      $(`[data-confirm="${t}"]`, el).classList.remove('hidden');
      $(`[data-st="${t}"]`, el).textContent = `${NUM[st.sel]} 선택 — [확정]을 눌러요 (바꾸려면 다른 번호)`;
    }));
  };
  ['blue', 'white'].forEach((t) => {
    $(`[data-confirm="${t}"]`, el).addEventListener('pointerdown', (e) => { e.preventDefault(); lock(t); });
    $(`[data-fix="${t}"] button`, el).addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const st = T[t];
      if (st.wasRight) return;
      st.wasRight = true; st.correct++; st.speedSum += 0.5;
      $(`[data-fix="${t}"]`, el).classList.add('hidden');
      $(`[data-st="${t}"]`, el).textContent = '✔ 교사가 정답으로 인정했어요';
      audio.sfx('correct');
    });
  });
  $('#replay', el).addEventListener('pointerdown', (e) => { e.preventDefault(); if (qs[qi]) speakQ(qs[qi]); });

  const lock = (t) => {
    const st = T[t];
    if (phase !== 'q' || st.locked || st.sel == null) return;
    st.locked = true; st.tAns = qt; audio.sfx('tap');
    $(`[data-confirm="${t}"]`, el).classList.add('hidden');
    $(`[data-ch="${t}"]`, el).classList.add('locked');
    $(`[data-st="${t}"]`, el).textContent = '✔ 확정 완료! 상대 팀을 기다려요';
    if (T.blue.locked && T.white.locked) reveal();
  };

  const nextQ = () => {
    qi++;
    if (qi >= qs.length || left < 4) { end(); return; }
    const q = qs[qi];
    window.__gt.curQ = q;
    phase = 'q'; qt = 0;
    let choices = q.choices.slice();
    if (useMotion && choices.length > 3) choices = [choices[0], ...choices.slice(1).sort(() => Math.random() - 0.5).slice(0, 2)];
    const ord = teamOrders(choices);
    for (const t of ['blue', 'white']) {
      Object.assign(T[t], { sel: null, locked: false, tAns: 0, order: ord[t], wasRight: false });
      T[t].hold.reset();
      renderChoices(t);
      $(`[data-ch="${t}"]`, el).classList.remove('locked');
      $(`[data-fix="${t}"]`, el).classList.add('hidden');
      $(`[data-st="${t}"]`, el).textContent = useMotion ? '1=왼손 · 2=오른손 · 3=양손 (1.2초 유지)' : '정답을 고르고 [확정]!';
    }
    $('#qn', el).textContent = `${qi + 1}번 문제`;
    $('#qemoji', el).textContent = q.emoji || '';
    $('#qtext', el).innerHTML = richText(q.q);
    $('#qexp', el).classList.add('hidden');
    $('#replay', el).classList.toggle('hidden', !s.tts);
    setCharacter(qChar, { pose: 'think' });
    speakQ(q);
  };

  const reveal = () => {
    if (phase !== 'q') return;
    phase = 'reveal'; qt = 0;
    const q = qs[qi];
    let anyRight = false;
    for (const t of ['blue', 'white']) {
      const st = T[t];
      st.asked++;
      const box = $(`[data-ch="${t}"]`, el);
      const right = st.locked && st.order[st.sel] === q.answer;
      st.wasRight = right;
      if (right) { st.correct++; st.speedSum += Math.max(0, 1 - st.tAns / qTime); anyRight = true; }
      $$('.choice', box).forEach((btn, k) => {
        if (st.order[k] === q.answer) btn.classList.add('right');
        else if (k === st.sel && st.locked) btn.classList.add('wrong');
      });
      $(`[data-st="${t}"]`, el).textContent = right ? '🎉 정답!' : st.locked ? '아쉬워요! 다음엔 맞힐 수 있어요' : '⏰ 시간이 끝났어요';
      if (!right) $(`[data-fix="${t}"]`, el).classList.remove('hidden');
    }
    const exp = $('#qexp', el);
    exp.innerHTML = `<b>정답: ${richText(q.answer)}</b> — ${esc(q.explain)}`;
    exp.classList.remove('hidden');
    audio.sfx(anyRight ? 'correct' : 'wrong');
    setCharacter(qChar, { pose: anyRight ? 'success' : 'fail' });
  };

  const end = () => {
    if (ended) return;
    ended = true; running = false;
    store.set('recent', [...qs.slice(0, Math.max(0, qi + 1)).map((q) => q.id), ...recent].slice(0, 300));
    const scores = { blue: quizScore(T.blue), white: quizScore(T.white) };
    const detail = { blue: `${T.blue.asked}문제 중 ${T.blue.correct}개 정답`, white: `${T.white.asked}문제 중 ${T.white.correct}개 정답` };
    audio.stopSong();
    app.recordMatch(r, m, scores, detail);
    setTimeout(() => app.go('result', { r, m }), 700);
  };

  const qcam = useMotion ? $('#qcam', el).getContext('2d') : null;
  const frame = (t) => {
    raf = requestAnimationFrame(frame);
    const dt = lastT == null ? 0 : Math.min(0.05, (t - lastT) / 1000); lastT = t;
    $('#veil', el).classList.toggle('hidden', !app.paused);
    if (useMotion) {
      const st = motion.tick(t);
      motion.draw(qcam, 0, 0, 480, 270, { labels: true });
      if (phase === 'q' && running && !app.paused) {
        for (const tm of ['blue', 'white']) {
          const S2 = T[tm];
          if (S2.locked || !st[tm].active) continue;
          const c = motionChoice(st[tm].sig);
          const k = c - 1;
          if (c && k < S2.order.length) {
            if (S2.sel !== k) { S2.sel = k; S2.hold.reset(); $$('.choice', $(`[data-ch="${tm}"]`, el)).forEach((x, i) => x.classList.toggle('sel', i === k)); }
            if (S2.hold.update(true, t)) lock(tm);
            else $(`[data-st="${tm}"]`, el).textContent = `${NUM[k]} 유지 중… ${Math.round(S2.hold.progress(t) * 100)}%`;
          } else S2.hold.update(false, t);
        }
      }
    }
    if (!running || app.paused) return;
    left -= dt; qt += dt;
    timerEl.textContent = fmtTime(left);
    timerEl.classList.toggle('hurry', left < 10);
    if (phase === 'q') {
      bar.style.width = `${Math.max(0, 100 * (1 - qt / qTime))}%`;
      if (qt >= qTime || left <= 0) reveal();
    } else if (phase === 'reveal') {
      bar.style.width = '0%';
      if (qt >= 4.2) { if (left <= 3) end(); else nextQ(); }
    }
  };
  raf = requestAnimationFrame(frame);
  (async () => {
    if (!qs.length) {
      $('#qtext', el).textContent = '이 학년·학기·교과에 해당하는 문제가 없어요. 설정의 [문제 관리]에서 문제를 추가하거나 학기를 "전체 복습"으로 바꿔 주세요.';
      return;
    }
    await countdown(el, 3);
    running = true; audio.playSong('quiz'); nextQ();
  })();
  return () => { cancelAnimationFrame(raf); audio.stopSong(); if ('speechSynthesis' in window) speechSynthesis.cancel(); };
}
