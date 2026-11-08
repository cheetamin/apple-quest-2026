// 교사용 설정 화면
import { h, $, $$, onTap, esc, toast, modal } from '../ui.js';
import { buildPlan, relayLegs, estimateMinutes, parseNames, countAppearances, shuffled } from '../core/roster.js';
import { ROUNDS } from '../rounds/defs.js';
import { bankEditor } from './bankeditor.js';
import { lyricSync } from './lyricsync.js';

export function show(app, root, params) {
  const s = app.settings;
  const seg = (key, opts, val) => `<div class="seg" data-key="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(v) === String(val) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const tog = (key, label) => `<label class="tog"><input type="checkbox" data-tog="${key}" ${s[key] ? 'checked' : ''}><span></span>${label}</label>`;
  const el = h(`<div class="screen settings-screen">
    <div class="screen-title"><button class="btn small ghost" data-a="back">← 처음으로</button><h2 data-pixel="64">교사용 설정</h2><span></span></div>
    <div class="settings-grid">
      <section class="card">
        <h3>🎓 학년 · 학기</h3>
        ${seg('grade', [1, 2, 3, 4, 5, 6].map((g) => [g, g + '학년']), s.grade)}
        ${seg('sem', [[1, '1학기'], [2, '2학기'], [0, '전체 복습']], s.sem)}
        <p class="hint">학년에 따라 퀴즈 난이도와 신체 게임 속도가 자동 조절돼요. 3~6학년 교과서는 출판사별로 단원 순서가 달라 학기 구분은 참고용이에요.</p>
        <div class="row gap"><button class="btn small" data-a="bank">📚 문제 관리</button><button class="btn small" data-a="lyrics">🎤 댄스 가사 타이밍 맞추기</button></div>
        <h3>⏱ 시간</h3>
        <div class="row"><span class="lbl">일반 라운드</span>${seg('roundSec', [[45, '45초'], [60, '60초'], [90, '90초']], s.roundSec)}</div>
        <div class="row"><span class="lbl">릴레이(1인)</span>${seg('relaySec', [[10, '10초'], [15, '15초'], [20, '20초']], s.relaySec)}</div>
      </section>
      <section class="card">
        <h3>👥 학생 명단 · 팀 나누기</h3>
        ${seg('teamMode', [['class', '우리 반을 청·백으로 나누기'], ['two', '두 학급 대항전']], s.teamMode)}
        <div id="team-area"></div>
        <h3>🏃 참여 방식</h3>
        ${seg('mode', [['all', '전원 참여(추천)'], ['basic', '대표 선수만']], s.mode)}
        <div class="row" id="squad-row"><span class="lbl">두뇌 라운드 한 경기 인원</span>${seg('squad', [[1, '1명씩'], [2, '2명씩'], [3, '3명씩']], s.squad)}</div>
        <p class="hint" id="plan-info"></p>
        <div class="row gap">${tog('autoOrder', '출전 순서 무작위')}<button class="btn small" data-a="order">출전 순서 정하기</button><button class="btn small" data-a="sheet">📋 출전표 보기</button></div>
      </section>
      <section class="card">
        <h3>🔧 추가 설정</h3>
        <div class="tog-grid">
          ${tog('bgm', '배경음악')}${tog('sfx', '효과음')}${tog('tts', '문제 읽어주기')}${tog('showScore', '점수 표시')}
          ${tog('mirror', '카메라 거울 모드')}${tog('seated', '앉아서 참여 모드')}${tog('slow', '느린 속도 모드')}${tog('bigText', '글자 크게')}
          ${tog('highContrast', '고대비 화면')}${tog('engTrial', '1~2학년 영어 맛보기')}${tog('sing', '댄스 가사 기계 음성(음원 없을 때만)')}
        </div>
        <div class="row"><span class="lbl">모션 민감도</span><input type="range" min="0.7" max="1.4" step="0.05" data-range="sens" value="${s.sens}"><b id="sens-v">${s.sens}</b></div>
        <div class="row"><span class="lbl">신체 활동 대체 입력</span>${seg('altInput', [['none', '사용 안 함'], ['blue', '청팀'], ['white', '백팀'], ['both', '양 팀']], s.altInput)}</div>
        <div class="row"><span class="lbl">퀴즈 정답 입력</span>${seg('quizInput', [['touch', '터치(기본)'], ['motion', '모션 선택']], s.quizInput)}</div>
        <div class="row"><span class="lbl">연산 정답 입력</span>${seg('mathInput', [['pad', '숫자 입력판'], ['motion', '모션 선택']], s.mathInput)}</div>
        <div class="row"><span class="lbl">자세 인식 모델</span>${seg('model', [['lite', '빠름(lite)'], ['full', '정확(full)']], s.model)}</div>
        <p class="hint">대체 입력: 신체 활동이 어려운 학생의 팀은 교사가 화면 버튼(또는 키보드)으로 동작을 대신 입력해요. 동작 점수는 같은 기준으로 계산돼요.</p>
      </section>
    </div>
    <div class="settings-foot"><button class="btn big" data-a="go">📷 카메라 연결하고 시작 ▶</button></div>
  </div>`);
  root.appendChild(el);

  const planNow = () => buildPlan({ blueCount: s.count.blue, whiteCount: s.count.white, mode: s.mode, squad: s.squad, orderBlue: !s.autoOrder ? validOrder('blue') : null, orderWhite: !s.autoOrder ? validOrder('white') : null });
  const validOrder = (t) => (s.order[t] && s.order[t].length === s.count[t] ? s.order[t] : null);
  const refreshPlan = () => {
    const plan = planNow();
    const legs = Math.max(s.count.blue, s.count.white);
    const matches = plan.rounds.reduce((a, r) => a + r.length, 0);
    const min = estimateMinutes({ plan, roundSeconds: s.roundSec, legs, legSeconds: s.relaySec });
    const ab = countAppearances(plan, 'blue', s.count.blue), aw = countAppearances(plan, 'white', s.count.white);
    const minA = Math.min(...ab, ...aw), maxA = Math.max(...ab, ...aw);
    const who = s.mode === 'all' ? `모든 학생이 1~11라운드에 <b>${minA === maxA ? minA + '번' : `${minA}~${maxA}번`}</b> 출전해요.` : `라운드마다 팀별 대표 1명이 나가요(출전하지 않는 학생이 생길 수 있어요).`;
    const extra = s.count.blue !== s.count.white ? ` 인원이 적은 팀은 ${Math.abs(s.count.blue - s.count.white)}명이 한 번 더 달려 두 팀 모두 ${legs}구간을 달려요.` : '';
    $('#plan-info', el).innerHTML = `청 <b>${s.count.blue}명</b> · 백 <b>${s.count.white}명</b> → 1~11라운드 <b>${matches}경기</b> + 결승 릴레이 <b>${legs}구간</b>(전원) · 예상 약 <b>${min}분</b><br>${who}${extra}${min > 60 ? '<br>⚠ 시간이 길면 라운드 시간을 45초로 줄이거나 두뇌 라운드 인원을 늘려 보세요.' : ''}`;
    $('#squad-row', el).style.display = s.mode === 'all' ? '' : 'none';
  };

  // ── 학생 명단 ──
  const classNames = () => {
    const given = (s.classRosterText || '').split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
    return given.length ? given : Array.from({ length: s.classCount }, (_, i) => `${i + 1}번`);
  };
  const sync = () => {
    for (const t of ['blue', 'white']) { s.rosterText[t] = s.teamLists[t].join('\n'); s.count[t] = Math.max(1, s.teamLists[t].length); s.order[t] = null; }
    app.saveSettings(); refreshPlan();
  };
  const split = (how) => {
    let names = classNames();
    if (how === 'rand') names = shuffled(names);
    s.teamLists = { blue: names.filter((_, i) => i % 2 === 0), white: names.filter((_, i) => i % 2 === 1) };
    sync(); drawTeams();
  };
  const teamArea = $('#team-area', el);
  const drawTeams = () => {
    if (s.teamMode === 'class') {
      const total = s.teamLists.blue.length + s.teamLists.white.length;
      const hasNames = (s.classRosterText || '').trim().length > 0;
      teamArea.innerHTML = `
        <textarea class="roster-big" data-classroster placeholder="우리 반 학생 이름을 한 줄에 한 명씩(또는 쉼표로) 입력하세요.&#10;예) 김가온, 이나래, 박다온 …">${esc(s.classRosterText || '')}</textarea>
        <div class="row ${hasNames ? 'dim' : ''}"><span class="lbl">이름 없이 인원만</span><div class="stepper"><button data-cc="-1">−</button><input type="number" min="2" max="80" data-classcount value="${s.classCount}"><button data-cc="1">＋</button><span>명</span></div><small>${hasNames ? `이름 ${classNames().length}명 입력됨` : '번호로 표시돼요'}</small></div>
        <div class="row gap"><button class="btn small" data-split="alt">↔ 순서대로 번갈아 나누기</button><button class="btn small" data-split="rand">🔀 무작위로 나누기</button></div>
        <div class="team-cols">${['blue', 'white'].map((t) => `<div class="team-col ${t}">
          <div class="row tight"><input class="txt" data-name="${t}" value="${esc(s.teamNames[t])}" maxlength="14"><b class="cnt">${s.teamLists[t].length}명</b></div>
          <div class="name-chips">${s.teamLists[t].map((n, i) => `<button class="chip-btn" data-move="${t}:${i}" title="다른 팀으로 옮기기">${esc(n)}</button>`).join('') || '<small>학생이 없어요</small>'}</div>
        </div>`).join('')}</div>
        <p class="hint">반 전체 ${total}명을 두 팀으로 나눴어요. 이름을 누르면 다른 팀으로 옮겨요.</p>`;
      const ta = $('[data-classroster]', teamArea);
      let tmr;
      ta.addEventListener('input', () => { s.classRosterText = ta.value; clearTimeout(tmr); tmr = setTimeout(() => { split('alt'); const t2 = $('[data-classroster]', teamArea); t2.focus(); t2.setSelectionRange(t2.value.length, t2.value.length); }, 700); });
      const cc = $('[data-classcount]', teamArea);
      cc.addEventListener('change', () => { s.classCount = Math.max(2, Math.min(80, +cc.value || 2)); split('alt'); });
      $$('[data-cc]', teamArea).forEach((b) => onTap(b, () => { s.classCount = Math.max(2, Math.min(80, s.classCount + +b.dataset.cc)); split('alt'); }));
      $$('[data-split]', teamArea).forEach((b) => onTap(b, () => { split(b.dataset.split); toast(b.dataset.split === 'rand' ? '무작위로 나눴어요.' : '순서대로 번갈아 나눴어요.'); }));
      $$('[data-move]', teamArea).forEach((b) => onTap(b, () => {
        const [t, i] = b.dataset.move.split(':'); const o = t === 'blue' ? 'white' : 'blue';
        if (s.teamLists[t].length <= 1) { toast('팀에는 최소 1명이 있어야 해요.'); return; }
        s.teamLists[o].push(s.teamLists[t].splice(+i, 1)[0]); sync(); drawTeams();
      }, { sound: 'select' }));
    } else {
      teamArea.innerHTML = `<div class="team-cols">${['blue', 'white'].map((t) => `<div class="team-col ${t}">
        <input class="txt" data-name="${t}" value="${esc(s.teamNames[t])}" maxlength="14">
        <div class="stepper"><button data-step="${t}" data-d="-1">−</button><input type="number" min="1" max="60" data-count="${t}" value="${s.count[t]}"><button data-step="${t}" data-d="1">＋</button><span>명</span></div>
        <textarea data-roster="${t}" placeholder="이 학급 학생 이름 — 한 줄에 한 명 또는 쉼표로 구분 (비우면 번호로 표시)">${esc(s.rosterText[t])}</textarea>
      </div>`).join('')}</div>`;
      $$('[data-count]', teamArea).forEach((i) => i.addEventListener('change', () => { s.count[i.dataset.count] = Math.max(1, Math.min(60, +i.value || 1)); i.value = s.count[i.dataset.count]; s.order[i.dataset.count] = null; app.saveSettings(); refreshPlan(); }));
      $$('[data-step]', teamArea).forEach((b) => onTap(b, () => { const t = b.dataset.step; s.count[t] = Math.max(1, Math.min(60, s.count[t] + +b.dataset.d)); $(`[data-count="${t}"]`, teamArea).value = s.count[t]; s.order[t] = null; app.saveSettings(); refreshPlan(); }));
      $$('[data-roster]', teamArea).forEach((ta) => ta.addEventListener('input', () => {
        s.rosterText[ta.dataset.roster] = ta.value;
        const n = ta.value.split(/[\n,]/).map((x) => x.trim()).filter(Boolean).length;
        if (n > 0 && n !== s.count[ta.dataset.roster]) { s.count[ta.dataset.roster] = n; $(`[data-count="${ta.dataset.roster}"]`, teamArea).value = n; s.order[ta.dataset.roster] = null; refreshPlan(); }
        app.saveSettings();
      }));
    }
    $$('[data-name]', teamArea).forEach((i) => i.addEventListener('input', () => { s.teamNames[i.dataset.name] = i.value.trim() || (i.dataset.name === 'blue' ? '청팀' : '백팀'); app.saveSettings(); }));
  };
  if (s.teamMode === 'class') {
    const cur = [...s.teamLists.blue, ...s.teamLists.white];
    if (cur.length < 2) split('alt'); else sync();
  }
  drawTeams();
  refreshPlan();

  $$('.seg', el).forEach((sg) => $$('button', sg).forEach((b) => onTap(b, () => {
    const key = sg.dataset.key; let v = b.dataset.v;
    if (['grade', 'sem', 'roundSec', 'relaySec', 'squad'].includes(key)) v = +v;
    s[key] = v;
    if (key === 'teamMode') {
      if (v === 'two' && s.teamNames.blue === '청가래떡팀') { s.teamNames = { blue: '1반 청가래떡', white: '2반 백가래떡' }; }
      if (v === 'class' && s.teamNames.blue === '1반 청가래떡') { s.teamNames = { blue: '청가래떡팀', white: '백가래떡팀' }; }
      if (v === 'class') { if (s.teamLists.blue.length + s.teamLists.white.length < 2) split('alt'); else sync(); }
      drawTeams();
    }
    $$('button', sg).forEach((x) => x.classList.toggle('on', x === b));
    app.saveSettings(); refreshPlan();
  }, { sound: 'select' })));
  $$('[data-tog]', el).forEach((c) => c.addEventListener('change', () => { s[c.dataset.tog] = c.checked; app.saveSettings(); refreshPlan(); }));
  const r = $('[data-range="sens"]', el);
  r.addEventListener('input', () => { s.sens = +r.value; $('#sens-v', el).textContent = s.sens.toFixed(2); app.saveSettings(); });

  const act = {
    back: () => app.go('main'),
    bank: () => bankEditor(app),
    lyrics: () => lyricSync(),
    order: () => orderEditor(app, () => { $('[data-tog="autoOrder"]', el).checked = false; refreshPlan(); }),
    sheet: () => lineupSheet(app, planNow()),
    go: () => {
      app.newGame();
      app.go('camera');
    },
  };
  $$('[data-a]', el).forEach((b) => onTap(b, () => act[b.dataset.a]()));
}

/** 출전 순서 직접 정하기 (설정 화면) */
export function orderEditor(app, onDone) {
  const s = app.settings;
  const names = {
    blue: parseNames(s.rosterText.blue, s.count.blue, s.teamNames.blue.replace(/팀$/, '')),
    white: parseNames(s.rosterText.white, s.count.white, s.teamNames.white.replace(/팀$/, '')),
  };
  const order = {};
  for (const t of ['blue', 'white']) order[t] = s.order[t] && s.order[t].length === s.count[t] ? s.order[t].slice() : [...Array(s.count[t]).keys()];
  const render = () => ['blue', 'white'].map((t) => `<div class="order-col ${t}"><h3>${esc(s.teamNames[t])}</h3><ol>${order[t].map((i, k) => `<li><span>${esc(names[t][i])}</span><button data-mv="${t}:${k}:-1">▲</button><button data-mv="${t}:${k}:1">▼</button></li>`).join('')}</ol></div>`).join('');
  const m = modal(`<h2>출전 순서 정하기</h2><p class="hint">위에서부터 차례로 라운드 대표와 릴레이 주자로 나가요.</p><div class="order-wrap"></div><div class="row center"><button class="btn" data-ok>저장</button></div>`, { cls: 'wide' });
  const wrap = $('.order-wrap', m.el);
  const draw = () => {
    wrap.innerHTML = render();
    $$('[data-mv]', wrap).forEach((b) => onTap(b, () => {
      const [t, k, d] = b.dataset.mv.split(':'); const i = +k, j = i + +d;
      if (j < 0 || j >= order[t].length) return;
      [order[t][i], order[t][j]] = [order[t][j], order[t][i]]; draw();
    }));
  };
  draw();
  onTap($('[data-ok]', m.el), () => { s.order = order; s.autoOrder = false; app.saveSettings(); m.close(); toast('출전 순서를 저장했어요.'); if (onDone) onDone(); });
}

/** 출전표: 학생별로 어느 라운드에 나가는지 */
export function lineupSheet(app, plan) {
  const s = app.settings;
  const names = {
    blue: parseNames(s.rosterText.blue, s.count.blue, s.teamNames.blue.replace(/팀$/, '')),
    white: parseNames(s.rosterText.white, s.count.white, s.teamNames.white.replace(/팀$/, '')),
  };
  const col = (t) => {
    const per = names[t].map(() => []);
    plan.rounds.forEach((r, ri) => r.forEach((m) => m[t].forEach((i) => per[i].push(ROUNDS[ri].no))));
    return `<div class="order-col ${t}"><h3>${esc(s.teamNames[t])} (${names[t].length}명)</h3><table class="tbl small"><tbody>${names[t].map((n, i) => `<tr><td>${esc(n)}</td><td>${per[i].length ? per[i].map((no) => `${no}R`).join(' · ') : '<span class="err">출전 없음</span>'} · 릴레이</td></tr>`).join('')}</tbody></table></div>`;
  };
  modal(`<h2>📋 출전표</h2><p class="hint">R = 라운드 번호. 모든 학생은 마지막 이어달리기에 나가요.${s.autoOrder ? ' "출전 순서 무작위"가 켜져 있으면 게임을 시작할 때 순서가 다시 섞여요.' : ''}</p><div class="order-wrap">${col('blue')}${col('white')}</div>`, { cls: 'wide' });
}
