// 라운드 안내
import { h, $, $$, onTap, esc, mountChars, modal } from '../ui.js';
import { audio } from '../core/audio.js';
import { ROUNDS } from '../rounds/defs.js';
import { SUBJECTS } from '../data/bank.js';

export function subjectLabel(subject, grade, settings) {
  const S = SUBJECTS[subject];
  if (!S) return '';
  if (grade <= 2 && S.lowName) return subject === 'eng' && !settings.engTrial ? '국어(영어 맛보기 끔)' : S.lowName;
  return S.name;
}

export function show(app, root, { r, m }) {
  const def = ROUNDS[r];
  const g = app.game, s = g.settings;
  const parts = app.participants(r, m);
  const nMatches = g.plan.rounds[r].length;
  const kindName = { physical: '신체 게임', brain: '두뇌 게임', mixed: '신체+두뇌 혼합' }[def.kind];
  const subj = def.subject && def.subject !== 'ox' ? ` · ${subjectLabel(def.subject, s.grade, s)}` : '';
  const pose = { physical: 'cheer', brain: 'think', mixed: 'clap' }[def.kind];
  const prop = def.kind === 'brain' ? 'book' : 'whistle';
  const el = h(`<div class="screen intro-screen">
    <div class="intro-card card">
      <div class="intro-head">
        <span class="round-badge">ROUND ${def.no} / 12</span>
        <span class="kind ${def.kind}">${kindName}${esc(subj)}</span>
        ${nMatches > 1 ? `<span class="chip">경기 ${m + 1} / ${nMatches}</span>` : ''}
      </div>
      <h1 class="ph"><span class="ico">${def.icon}</span><span data-pixel="84">${esc(def.name)}</span></h1>
      <div class="intro-body">
        <canvas data-char="green" data-pose="${pose}" data-prop="${prop}" width="260" height="320"></canvas>
        <dl>
          <dt>게임 방법</dt><dd>${esc(def.how)}</dd>
          <dt>점수 얻는 법</dt><dd>${esc(def.score)} <small>(팀별 100점 만점)</small></dd>
          <dt>제한 시간</dt><dd>${s.roundSec}초</dd>
          <dt>안전 수칙</dt><dd>⚠️ ${esc(def.safety)}</dd>
        </dl>
      </div>
      <div class="players">
        <div class="pl blue"><small>${esc(g.teamNames.blue)} 출전</small><b>${esc(app.names('blue', parts.blue))}</b></div>
        <div class="vs">VS</div>
        <div class="pl white"><small>${esc(g.teamNames.white)} 출전</small><b>${esc(app.names('white', parts.white))}</b></div>
      </div>
      <div class="row center gap">
        <button class="btn ghost" data-a="swap">👥 출전 학생 바꾸기</button>
        <button class="btn big" data-a="go">준비 완료! 시작 ▶</button>
      </div>
    </div>
  </div>`);
  root.appendChild(el);
  mountChars(el);
  audio.playSong('main');
  audio.speak(`${def.no}라운드, ${def.name}! ${def.how}`);
  const act = {
    go: () => { audio.stopSong(); if ('speechSynthesis' in window) speechSynthesis.cancel(); app.playRound(r, m); },
    swap: () => swapPlayers(app, r, m, () => app.go('intro', { r, m })),
  };
  $$('[data-a]', el).forEach((b) => onTap(b, () => act[b.dataset.a]()));
}

/** 학생 교대: 현재 경기의 출전 학생을 다른 학생으로 바꾼다 (참여 횟수 표시, 미출전 학생 우선 표시) */
export function swapPlayers(app, r, m, done) {
  const g = app.game;
  const parts = r < 11 ? g.plan.rounds[r][m] : { blue: [g.legs[m].blue], white: [g.legs[m].white] };
  const apps = { blue: Array(g.names.blue.length).fill(0), white: Array(g.names.white.length).fill(0) };
  g.plan.rounds.forEach((rr, ri) => rr.forEach((mm, mi) => {
    if (ri < r || (ri === r && mi < m) || g.results[ri].matches[mi]) for (const t of ['blue', 'white']) mm[t].forEach((i) => apps[t][i]++);
  }));
  const col = (t) => {
    const order = [...g.names[t].keys()].sort((a, b) => apps[t][a] - apps[t][b]);
    return `<div class="swap-col ${t}"><h3>${esc(g.teamNames[t])}</h3>${parts[t].map((cur, slot) => `<div class="slot">출전 ${slot + 1}: <select data-t="${t}" data-slot="${slot}">${order.map((i) => `<option value="${i}" ${i === cur ? 'selected' : ''}>${esc(g.names[t][i])} ${apps[t][i] ? `(출전 ${apps[t][i]}회)` : '(미출전)'}</option>`).join('')}</select></div>`).join('')}</div>`;
  };
  const md = modal(`<h2>👥 출전 학생 바꾸기</h2><div class="swap-wrap">${col('blue')}${col('white')}</div><div class="row center"><button class="btn" data-ok>적용</button></div>`);
  onTap($('[data-ok]', md.el), () => {
    $$('select', md.el).forEach((sel) => {
      const t = sel.dataset.t, slot = +sel.dataset.slot, v = +sel.value;
      if (r < 11) g.plan.rounds[r][m][t][slot] = v; else g.legs[m][t] = v;
    });
    app.saveGame(); md.close(); if (done) done();
  });
}
