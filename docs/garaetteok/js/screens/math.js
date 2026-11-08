// 2라운드: 가래떡 연산 대회 — 팀마다 독립된 숫자 입력판으로 제한 시간 동안 연속 문제 풀이
import { h, $, $$, esc, richText, fmtTime, countdown } from '../ui.js';
import { audio } from '../core/audio.js';
import { motion } from '../core/motion.js';
import { ROUNDS } from '../rounds/defs.js';
import { genMath, checkNumAnswer } from '../data/math.js';
import { mathSprintScore } from '../core/scoring.js';
import { motionChoice, HoldDetector } from '../core/gestures.js';
import { band } from '../rounds/common.js';
import { makeRng } from '../core/simpose.js';
import { drawCharacter } from '../core/character.js';

const NUM = ['①', '②', '③'];

function numDistractors(ans, rng) {
  const set = new Set([String(ans)]);
  const out = [];
  const isInt = Number.isInteger(ans);
  const cands = isInt ? [ans + 1, ans - 1, ans + 10, ans - 10, ans + 2, Math.round(ans * 1.1) || ans + 3] : [+(ans + 0.1).toFixed(3), +(ans - 0.1).toFixed(3), +(ans * 10).toFixed(3), +(ans / 10).toFixed(3)];
  for (const c of cands.sort(() => rng() - 0.5)) { if (c >= 0 && !set.has(String(c))) { set.add(String(c)); out.push(String(c)); } if (out.length === 2) break; }
  return out;
}

export function show(app, root, { r, m }) {
  const def = ROUNDS[r];
  const g = app.game, s = g.settings;
  const useMotion = s.mathInput === 'motion' && motion.mode !== 'none';
  const b = band(s.grade);
  const target = Math.round([0, 10, 8, 7][b] * s.roundSec / 60 * (s.slow ? 0.75 : 1));
  const parts = app.participants(r, m);
  const allowDot = s.grade >= 4;
  const el = h(`<div class="screen math-screen">
    <header class="topbar">
      <div class="tb-title"><span class="round-badge">ROUND ${def.no} / 12</span><span class="subj">🧮 수학</span></div>
      <div class="tb-name">${esc(def.name)}</div>
      <div class="tb-right">${s.showScore ? `<span class="tot blue">${esc(g.teamNames.blue)} <b>${app.totals().blue}</b></span><span class="tot white">${esc(g.teamNames.white)} <b>${app.totals().white}</b></span>` : ''}<span class="timer" id="timer">${fmtTime(s.roundSec)}</span></div>
    </header>
    <div class="math-wrap">
      ${['blue', 'white'].map((t) => `<div class="math-panel ${t}" data-team="${t}">
        <div class="ans-head"><b>${esc(g.teamNames[t])}</b><span>${esc(app.names(t, parts[t]))}</span><span class="m-stat" data-stat="${t}">0 / 0</span></div>
        <div class="m-q" data-q="${t}"></div>
        <div class="m-input" data-in="${t}"></div>
        <div class="m-fb" data-fb="${t}"></div>
        <div class="m-pad" data-pad="${t}"></div>
      </div>`).join('')}
      <div class="math-mid"><canvas width="240" height="300" id="mchar"></canvas>${useMotion ? '<canvas width="400" height="225" id="mcam"></canvas><p class="hint">1=왼손 2=오른손 3=양손</p>' : '<p class="hint">팀마다 따로 풀어요!<br>정확하게 푸는 것이 가장 중요해요.</p>'}</div>
    </div>
    <div class="pause-veil hidden" id="veil"><div class="card"><h2>⏸ 일시정지</h2></div></div>
  </div>`);
  root.appendChild(el);
  const rng = makeRng(g.seed + 77);
  const T = {};
  window.__gt.mathT = T;
  for (const t of ['blue', 'white']) T[t] = { item: null, input: '', sel: null, attempts: 0, correct: 0, streak: 0, best: 0, wait: 0, hold: new HoldDetector(1200), opts: null, cheer: 0 };

  const newItem = (t) => {
    const st = T[t];
    st.item = genMath(s.grade, s.sem, rng, st.item && st.item.q);
    st.input = ''; st.sel = null; st.hold.reset();
    const it = st.item;
    if (it.type === 'mc' || useMotion) {
      const opts = it.type === 'mc' ? [it.answer, ...it.wrongs] : [String(it.answer), ...numDistractors(it.answer, rng)];
      st.opts = opts.sort(() => rng() - 0.5);
    } else st.opts = null;
    render(t);
  };
  const render = (t) => {
    const st = T[t], it = st.item;
    $(`[data-q="${t}"]`, el).innerHTML = richText(it.q);
    $(`[data-stat="${t}"]`, el).textContent = `정답 ${st.correct} / 시도 ${st.attempts}${st.streak >= 3 ? ` · 🔥${st.streak}연속` : ''}`;
    const pad = $(`[data-pad="${t}"]`, el), inp = $(`[data-in="${t}"]`, el);
    if (st.opts) {
      inp.innerHTML = '';
      pad.className = 'm-pad mc';
      pad.innerHTML = st.opts.map((o, k) => `<button class="choice" data-k="${k}"><span class="num">${NUM[k]}</span><span class="ctext">${richText(o)}</span></button>`).join('') + (useMotion ? '' : '<button class="btn confirm" data-ok>✔ 확정</button>');
      $$('.choice', pad).forEach((btn) => btn.addEventListener('pointerdown', (e) => { e.preventDefault(); if (st.wait > 0 || useMotion) return; st.sel = +btn.dataset.k; audio.sfx('select'); $$('.choice', pad).forEach((x) => x.classList.toggle('sel', x === btn)); }));
      const ok = $('[data-ok]', pad); if (ok) ok.addEventListener('pointerdown', (e) => { e.preventDefault(); if (st.sel != null) submit(t); });
    } else {
      inp.textContent = st.input || ' ';
      pad.className = 'm-pad num';
      const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', allowDot ? '.' : '', '0', '⌫'];
      pad.innerHTML = keys.map((k) => (k ? `<button class="key" data-key="${k}">${k}</button>` : '<span></span>')).join('') + '<button class="btn confirm wide" data-ok>✔ 확정</button>';
      $$('.key', pad).forEach((btn) => btn.addEventListener('pointerdown', (e) => {
        e.preventDefault(); if (st.wait > 0) return; audio.sfx('tap');
        const k = btn.dataset.key;
        if (k === '⌫') st.input = st.input.slice(0, -1);
        else if (st.input.length < 7 && !(k === '.' && st.input.includes('.'))) st.input += k;
        inp.textContent = st.input || ' ';
      }));
      $('[data-ok]', pad).addEventListener('pointerdown', (e) => { e.preventDefault(); if (st.input && st.wait <= 0) submit(t); });
    }
  };
  const submit = (t) => {
    const st = T[t], it = st.item;
    const ok = st.opts ? st.opts[st.sel] === String(it.answer) : checkNumAnswer(st.input, it.answer);
    st.attempts++;
    const fb = $(`[data-fb="${t}"]`, el);
    if (ok) {
      st.correct++; st.streak++; st.best = Math.max(st.best, st.streak); st.cheer = 0.8;
      fb.innerHTML = `<span class="good">⭕ 정답!${st.streak >= 3 ? ` 🔥 ${st.streak}연속!` : ''}</span>`;
      audio.sfx('correct'); st.wait = 0.7;
    } else {
      st.streak = 0;
      fb.innerHTML = `<span class="bad">❌ 정답은 ${richText(String(it.answer))}</span><small>${esc(it.explain)}</small>`;
      audio.sfx('wrong'); st.wait = 2.6;
    }
    $(`[data-pad="${t}"]`, el).classList.add('locked');
  };

  let left = s.roundSec, running = false, raf = 0, lastT = null, ended = false;
  const mc = $('#mchar', el).getContext('2d');
  const camCtx = useMotion ? $('#mcam', el).getContext('2d') : null;
  const frame = (t) => {
    raf = requestAnimationFrame(frame);
    const dt = lastT == null ? 0 : Math.min(0.05, (t - lastT) / 1000); lastT = t;
    $('#veil', el).classList.toggle('hidden', !app.paused);
    mc.clearRect(0, 0, 240, 300);
    const cheering = T.blue.cheer > 0 || T.white.cheer > 0;
    drawCharacter(mc, 120, 290, 270, { team: 'green', pose: cheering ? 'jump' : 'think', t: t / 1000, prop: 'glasses' });
    if (useMotion) {
      const st = motion.tick(t);
      motion.draw(camCtx, 0, 0, 400, 225);
      if (running && !app.paused) for (const tm of ['blue', 'white']) {
        const S2 = T[tm];
        if (S2.wait > 0 || !st[tm].active || !S2.opts) continue;
        const c = motionChoice(st[tm].sig);
        if (c && c <= S2.opts.length) {
          if (S2.sel !== c - 1) { S2.sel = c - 1; S2.hold.reset(); $$('.choice', $(`[data-pad="${tm}"]`, el)).forEach((x, i) => x.classList.toggle('sel', i === c - 1)); }
          if (S2.hold.update(true, t)) submit(tm);
        } else S2.hold.update(false, t);
      }
    }
    if (!running || app.paused) return;
    left -= dt;
    $('#timer', el).textContent = fmtTime(left);
    $('#timer', el).classList.toggle('hurry', left < 10);
    for (const tm of ['blue', 'white']) {
      const st = T[tm];
      st.cheer = Math.max(0, st.cheer - dt);
      if (st.wait > 0) { st.wait -= dt; if (st.wait <= 0) { $(`[data-fb="${tm}"]`, el).innerHTML = ''; $(`[data-pad="${tm}"]`, el).classList.remove('locked'); newItem(tm); } }
    }
    if (left <= 0 && !ended) {
      ended = true; running = false;
      const scores = {}, detail = {};
      for (const tm of ['blue', 'white']) {
        const st = T[tm];
        scores[tm] = mathSprintScore({ attempts: st.attempts, correct: st.correct, target, bestStreak: st.best });
        detail[tm] = `${st.attempts}문제 중 ${st.correct}개 정답 · 최고 ${st.best}연속`;
      }
      audio.sfx('whistle'); audio.stopSong();
      app.recordMatch(r, m, scores, detail);
      setTimeout(() => app.go('result', { r, m }), 800);
    }
  };
  for (const t of ['blue', 'white']) newItem(t);
  $$('.m-pad', el).forEach((p) => p.classList.add('locked'));
  raf = requestAnimationFrame(frame);
  (async () => {
    await countdown(el, 3);
    $$('.m-pad', el).forEach((p) => p.classList.remove('locked'));
    running = true; audio.playSong('quiz');
    if (s.tts) audio.speak('준비, 시작! 정확하게 풀어 보세요.');
  })();
  return () => { cancelAnimationFrame(raf); audio.stopSong(); };
}
