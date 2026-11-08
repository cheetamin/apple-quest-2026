// 교사 관리 메뉴 (ESC 또는 ⚙ 버튼)
import { h, $, $$, onTap, esc, modal, confirmBox, toast } from '../ui.js';
import { audio } from '../core/audio.js';
import { motion } from '../core/motion.js';
import { ROUNDS } from '../rounds/defs.js';
import { swapPlayers } from './intro.js';
import { orderEditor } from './settings.js';

let open = null;

export function openTeacherMenu(app) {
  if (open) { open.close(); return; }
  const inGame = !!app.game && ['intro', 'physical', 'quiz', 'math', 'result', 'relayIntro', 'relay'].includes(app.current?.name);
  const playing = ['physical', 'quiz', 'math', 'relay'].includes(app.current?.name);
  const wasPaused = app.paused;
  if (playing) app.paused = true;
  const md = modal(`<h2>🧑‍🏫 교사 관리 메뉴</h2>
    <div class="menu-grid">
      ${playing ? `<button class="btn" data-a="resume">▶ 계속하기</button>` : ''}
      ${inGame ? `<button class="btn" data-a="restart">🔁 라운드 다시 시작</button>
      <button class="btn" data-a="skip">⏭ 라운드 건너뛰기</button>
      <button class="btn" data-a="swap">👥 학생 교대</button>
      <button class="btn" data-a="scores">✏️ 점수 수동 수정</button>
      <button class="btn" data-a="standings">📊 현재 결과 확인</button>` : ''}
      <button class="btn" data-a="order">🔢 출전 순서 변경</button>
      <button class="btn" data-a="diag">🩺 모션 인식 상태·보정</button>
      <button class="btn" data-a="camera">📷 카메라 테스트</button>
      <button class="btn" data-a="volume">🔊 음량</button>
      <button class="btn" data-a="full">⛶ 전체 화면</button>
      <button class="btn ghost" data-a="reset">🧹 게임 초기화</button>
    </div>
    <p class="hint">키보드 대체 입력 — 청팀: Q 왼팔 · W 오른팔 · E 양팔 위(O) · R 교차(X) · T 벌리기 · A/D 좌우 · S 동작(썰기·내려놓기) · F 달리기 / 백팀: U · I · O · P · Y · J/L · K · H</p>`, {
    onClose: () => { open = null; if (playing && !wasPaused) app.paused = false; },
  });
  open = md;
  const done = () => md.close();
  const g = app.game;
  const act = {
    resume: () => { app.paused = false; done(); },
    restart: async () => {
      if (!(await confirmBox('현재 라운드를 처음부터 다시 할까요? 이번 경기 점수는 다시 기록돼요.'))) return;
      done();
      if (g.cur.r >= app.G) app.go('relayIntro'); else app.go('intro', g.cur);
    },
    skip: async () => {
      if (!(await confirmBox(g.cur.r >= app.G ? `결승 이어달리기를 건너뛰고 1~${app.G}라운드 점수로 우승팀을 정할까요?` : '이 라운드를 건너뛸까요? 두 팀 모두 0점으로 기록돼요.'))) return;
      done();
      if (g.cur.r >= app.G) { const t = app.totals(); app.finishGame({ winner: t.blue > t.white ? 'blue' : t.white > t.blue ? 'white' : 'tie', trackLength: 0, start: { blue: 0, white: 0 }, dist: { blue: 0, white: 0 }, finishedAt: { blue: null, white: null }, byFinishLine: false, skipped: true, legs: 0 }); }
      else app.skipCurrent();
    },
    swap: () => {
      if (g.cur.r >= app.G) { toast('이어달리기 중에는 교대 화면의 [주자 바꾸기]를 사용해요.'); return; }
      swapPlayers(app, g.cur.r, g.cur.m, () => { if (app.current.name === 'intro') app.go('intro', g.cur); else toast('출전 학생을 바꿨어요.'); });
    },
    scores: () => scoreEditor(app),
    standings: () => standings(app),
    order: () => {
      if (g) gameOrderEditor(app); else orderEditor(app);
    },
    diag: () => diagPanel(app),
    camera: () => { done(); app.go('camera'); },
    volume: () => volumePanel(app),
    full: () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => toast('전체 화면을 사용할 수 없어요.')); },
    reset: async () => { if (await confirmBox('게임을 초기화하고 처음 화면으로 갈까요? 진행 중인 점수는 사라져요.', { ok: '초기화' })) { done(); app.game = null; localStorage.removeItem('gt_game'); app.go('main'); } },
  };
  $$('[data-a]', md.el).forEach((b) => onTap(b, () => act[b.dataset.a]()));
}

function scoreEditor(app) {
  const g = app.game;
  const rows = g.results.map((_, r) => app.roundDef(r)).map((d, r) => g.results[r].matches.map((mm, m) => `<tr><td>${d.no}. ${esc(d.name)}${g.results[r].matches.length > 1 ? ` (${m + 1})` : ''}</td>
    ${['blue', 'white'].map((t) => `<td><input type="number" min="0" max="100" class="txt num" data-r="${r}" data-m="${m}" data-t="${t}" value="${mm ? mm[t] : ''}" placeholder="-"></td>`).join('')}</tr>`).join('')).join('');
  const md = modal(`<h2>✏️ 점수 수동 수정 <small>(팀별 0~100점)</small></h2><div class="scroll"><table class="tbl small"><thead><tr><th>라운드</th><th>${esc(g.teamNames.blue)}</th><th>${esc(g.teamNames.white)}</th></tr></thead><tbody>${rows}</tbody></table></div><div class="row center"><button class="btn" data-ok>저장</button></div>`, { cls: 'wide' });
  onTap($('[data-ok]', md.el), () => {
    $$('input[data-r]', md.el).forEach((i) => {
      if (i.value === '') return;
      const r = +i.dataset.r, m = +i.dataset.m;
      const cur = g.results[r].matches[m] || { blue: 0, white: 0 };
      cur[i.dataset.t] = Math.max(0, Math.min(100, Math.round(+i.value)));
      cur.manual = true;
      g.results[r].matches[m] = cur;
    });
    app.saveGame(); md.close(); toast('점수를 저장했어요.');
  });
}

function standings(app) {
  const g = app.game, t = app.totals();
  const rows = g.results.map((_, r) => app.roundDef(r)).map((d, r) => { const s = app.roundScore(r); const played = g.results[r].matches.some(Boolean); return `<tr><td>${d.icon} ${esc(d.name)}</td><td>${played ? s.blue : '-'}</td><td>${played ? s.white : '-'}</td></tr>`; }).join('');
  modal(`<h2>📊 현재 결과</h2><div class="scroll"><table class="tbl small"><thead><tr><th>라운드</th><th>${esc(g.teamNames.blue)}</th><th>${esc(g.teamNames.white)}</th></tr></thead><tbody>${rows}<tr><td><b>합계</b></td><td><b>${t.blue}</b></td><td><b>${t.white}</b></td></tr></tbody></table></div>`, { cls: 'wide' });
}

export function gameOrderEditor(app, onClose) {
  const g = app.game;
  const col = (t) => `<div class="order-col ${t}"><h3>${esc(g.teamNames[t])}</h3><p class="hint">릴레이 주자 순서</p><ol>${g.legs.map((l, k) => `<li><span>${esc(g.names[t][l[t]])}</span><button data-mv="${t}:${k}:-1">▲</button><button data-mv="${t}:${k}:1">▼</button></li>`).join('')}</ol></div>`;
  const md = modal(`<h2>🔢 출전 순서 변경</h2><p class="hint">일반 라운드 출전 학생은 각 라운드 안내 화면의 [출전 학생 바꾸기]로 바꿀 수 있어요.</p><div class="order-wrap"></div>`, { cls: 'wide', onClose });
  const wrap = $('.order-wrap', md.el);
  const draw = () => {
    wrap.innerHTML = col('blue') + col('white');
    $$('[data-mv]', wrap).forEach((b) => onTap(b, () => {
      const [t, k, d] = b.dataset.mv.split(':'); const i = +k, j = i + +d;
      if (j < 0 || j >= g.legs.length) return;
      [g.legs[i][t], g.legs[j][t]] = [g.legs[j][t], g.legs[i][t]]; app.saveGame(); draw();
    }));
  };
  draw();
}

function diagPanel(app) {
  const s = app.settings;
  const md = modal(`<h2>🩺 모션 인식 상태·보정</h2>
    <div class="diag-grid" id="dg"></div>
    <div class="row gap">
      <button class="btn small" data-a="recal">🔄 2인 다시 보정(왼쪽=청, 오른쪽=백)</button>
      <label class="tog"><input type="checkbox" data-k="mirror" ${s.mirror ? 'checked' : ''}><span></span>거울 모드</label>
      <label class="tog"><input type="checkbox" data-k="swapLR" ${s.swapLR ? 'checked' : ''}><span></span>좌우 판정 반전(카메라가 반전 영상일 때)</label>
    </div>
    <div class="row"><span class="lbl">민감도</span><input type="range" min="0.7" max="1.4" step="0.05" value="${s.sens}" data-k="sens"><b id="sv">${s.sens}</b></div>
    <div class="row"><span class="lbl">대체 입력</span>${['none', 'blue', 'white', 'both'].map((v) => `<button class="btn tiny ${s.altInput === v ? '' : 'ghost'}" data-alt="${v}">${{ none: '끔', blue: '청팀', white: '백팀', both: '양 팀' }[v]}</button>`).join('')}</div>
    <p class="hint">카메라 인식이 계속 불안정하면 해당 팀만 대체 입력으로 바꿔 진행할 수 있어요. 인식이 안 된 시간은 채점에서 빼고 계산해요.</p>`);
  const dg = $('#dg', md.el);
  const iv = setInterval(() => {
    if (!md.el.isConnected) { clearInterval(iv); return; }
    const st = motion.state;
    dg.innerHTML = `<div>입력: <b>${{ camera: '카메라', sim: '시뮬레이션', none: '카메라 없음' }[motion.mode]}</b>${motion.trackLabel ? ` (${esc(motion.trackLabel)})` : ''}</div>
      <div>속도: <b>${motion.fps}fps</b> · 추론 ${motion.inferMs.toFixed(0)}ms · ${motion.delegate || '-'}</div>
      <div>탐지 인원: <b>${st.count}</b>명 · 보정: ${st.calibrated ? '완료' : '대기'} · 겹침: ${st.overlap ? '⚠ 있음' : '없음'}</div>
      ${['blue', 'white'].map((t) => `<div class="${t}-t">${t === 'blue' ? '청팀' : '백팀'}: ${st[t].status} · 신뢰도 ${Math.round(st[t].quality * 100)}%${st[t].sig && !st[t].sig.alt ? ` · 왼팔 ${st[t].sig.leftUp ? '↑' : '↓'} 오른팔 ${st[t].sig.rightUp ? '↑' : '↓'}` : ''}</div>`).join('')}
      ${motion.warnings.map((w) => `<div class="err">${esc(w)}</div>`).join('')}`;
  }, 250);
  onTap($('[data-a="recal"]', md.el), () => { motion.recalibrate(); toast('다시 보정해요. 두 학생이 좌우로 떨어져 서 주세요.'); });
  $$('input[data-k]', md.el).forEach((i) => i.addEventListener('input', () => {
    const k = i.dataset.k;
    s[k] = i.type === 'checkbox' ? i.checked : +i.value;
    if (k === 'sens') $('#sv', md.el).textContent = s.sens.toFixed(2);
    app.saveSettings(); if (k === 'mirror') motion.recalibrate();
  }));
  $$('[data-alt]', md.el).forEach((b) => onTap(b, () => {
    s.altInput = b.dataset.alt; app.saveSettings();
    $$('[data-alt]', md.el).forEach((x) => x.classList.toggle('ghost', x !== b));
    toast('대체 입력 설정을 바꿨어요. 다음 라운드부터 버튼이 표시돼요.');
  }));
}

export function volumePanel(app) {
  const s = app.settings;
  const md = modal(`<h2>🔊 음량 설정</h2>
    ${[['master', '전체'], ['bgm', '배경음악'], ['sfx', '효과음']].map(([k, l]) => `<div class="row"><span class="lbl">${l}</span><input type="range" min="0" max="1" step="0.05" value="${s.vol[k]}" data-v="${k}"></div>`).join('')}
    <div class="row gap"><label class="tog"><input type="checkbox" data-t="bgm" ${s.bgm ? 'checked' : ''}><span></span>배경음악</label><label class="tog"><input type="checkbox" data-t="sfx" ${s.sfx ? 'checked' : ''}><span></span>효과음</label><label class="tog"><input type="checkbox" data-t="tts" ${s.tts ? 'checked' : ''}><span></span>읽어주기</label></div>
    <div class="row center gap"><button class="btn" data-a="mute">${audio.muted ? '🔈 소리 켜기' : '🔇 전체 음소거'}</button><button class="btn ghost" data-a="test">테스트 소리</button></div>`);
  $$('[data-v]', md.el).forEach((r) => r.addEventListener('input', () => { s.vol[r.dataset.v] = +r.value; app.saveSettings(); }));
  $$('[data-t]', md.el).forEach((c) => c.addEventListener('change', () => { s[c.dataset.t] = c.checked; app.saveSettings(); }));
  onTap($('[data-a="mute"]', md.el), (e) => { audio.unlock(); audio.configure({ muted: !audio.muted }); e.target.textContent = audio.muted ? '🔈 소리 켜기' : '🔇 전체 음소거'; document.body.classList.toggle('muted', audio.muted); });
  onTap($('[data-a="test"]', md.el), () => { audio.unlock(); audio.sfx('correct'); });
}
