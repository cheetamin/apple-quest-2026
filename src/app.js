/* 애플왕의 진화 모험 — 화면과 상호작용 */
(function () {
  'use strict';
  const { UNITS, STAGES, DECOR, BOSSES, DEFAULT_RULES } = AQ_DATA;
  const L = AQ_LOGIC;
  const IMG = AQ_IMG;
  const KEY = 'aq-apple-quest-v1';
  const $ = s => document.querySelector(s);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const now = () => Date.now();
  const main = $('#main'), layer = $('#layer');

  /* ---------- 저장 ---------- */
  function migrate(o) {
    const base = L.newState(DEFAULT_RULES);
    const s = Object.assign(base, o);
    s.rules = Object.assign(JSON.parse(JSON.stringify(DEFAULT_RULES)), o.rules || {});
    s.settings = Object.assign(L.newState(DEFAULT_RULES).settings, o.settings || {});
    s.mastered = s.mastered || {}; s.streak = s.streak || 0; s.sentOK = s.sentOK || 0;
    s.cardAt = s.cardAt || {}; s.pin = s.pin || '1234';
    return s;
  }
  function load() { try { const t = localStorage.getItem(KEY); if (t) return migrate(JSON.parse(t)); } catch (e) {} return migrate({}); }
  let saveT; function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }, 120); }
  let S = load();
  if (!S.createdAt) { S.createdAt = now(); S.cardAt[0] = now(); }

  /* ---------- 소리 (WebAudio로 직접 합성: 파일 없음) ---------- */
  const AU = {
    ctx: null, bgmT: null, step: 0,
    init() { if (this.ctx) return; try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} },
    tone(f, t = 0, d = .15, type = 'triangle', v = .12) {
      if (!this.ctx || !S.settings.sound) return;
      const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + t;
      o.type = type; o.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + .015); g.gain.exponentialRampToValueAtTime(.0005, t0 + d);
      o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + d + .05);
    },
    tap() { this.tone(880, 0, .07, 'triangle', .06); },
    good() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i * .07, .22, 'triangle', .1)); },
    bad() { this.tone(330, 0, .18, 'sine', .09); this.tone(262, .14, .25, 'sine', .08); },
    sparkle() { for (let i = 0; i < 6; i++) this.tone(1200 + Math.random() * 1400, i * .05, .12, 'sine', .04); },
    fanfare() { [[523, 0], [659, .12], [784, .24], [1047, .4], [784, .55], [1047, .7], [1319, .85]].forEach(([f, t]) => { this.tone(f, t, .4, 'triangle', .1); this.tone(f / 2, t, .4, 'sine', .05); }); },
    charge(ms) {
      if (!this.ctx || !S.settings.sound) return;
      const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime, d = ms / 1000;
      o.type = 'sawtooth'; o.frequency.setValueAtTime(140, t0); o.frequency.exponentialRampToValueAtTime(1400, t0 + d);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.035, t0 + d * .8); g.gain.linearRampToValueAtTime(0, t0 + d);
      o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + d + .05);
    },
    bgm(on) {
      clearInterval(this.bgmT); this.bgmT = null;
      if (!on || !this.ctx || !S.settings.music) return;
      const mel = [659, 784, 880, 784, 659, 587, 523, 587, 659, 784, 1047, 880, 784, 0, 659, 0, 587, 659, 784, 659, 587, 523, 440, 523, 587, 659, 523, 0, 0, 0, 0, 0];
      const bass = [131, 110, 87, 98];
      this.bgmT = setInterval(() => {
        if (!S.settings.music || document.hidden) return;
        const i = this.step++ % mel.length;
        if (mel[i]) this.tone(mel[i], 0, .32, 'sine', .028);
        if (i % 8 === 0) this.tone(bass[(i / 8) % 4], 0, 1.4, 'triangle', .035);
      }, 300);
    },
  };

  /* ---------- 발음 (브라우저 음성 합성) ---------- */
  const TTS = { ok: 'speechSynthesis' in window, voice: null };
  function pickVoice() {
    if (!TTS.ok) return;
    const vs = speechSynthesis.getVoices();
    TTS.voice = vs.find(v => /en[-_]US/i.test(v.lang) && /Google|Samantha|Aria|Jenny|Zira|Ava/i.test(v.name)) || vs.find(v => /en[-_]US/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
  }
  if (TTS.ok) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function speak(text, rate, times = 1) {
    if (!TTS.ok) { toast('이 브라우저는 발음 듣기를 지원하지 않아요.'); return; }
    rate = rate || (S.settings.slowVoice ? .7 : .9);
    speechSynthesis.cancel();
    for (let i = 0; i < times; i++) {
      const u = new SpeechSynthesisUtterance(text.replace(/’/g, "'"));
      u.lang = 'en-US'; u.rate = rate; if (TTS.voice) u.voice = TTS.voice;
      speechSynthesis.speak(u);
    }
  }

  /* ---------- 공통 UI ---------- */
  function toast(msg, ms = 2300) {
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = msg; layer.append(t);
    setTimeout(() => t.remove(), ms);
  }
  function openSheet(html, cls = '') {
    closeSheet();
    const bg = document.createElement('div'); bg.className = 'sheet-bg'; bg.id = 'sheetbg';
    bg.innerHTML = `<div class="sheet ${cls}" role="dialog">${html}</div>`;
    bg.addEventListener('click', e => { if (e.target === bg) closeSheet(); });
    layer.append(bg);
  }
  function closeSheet() { const b = $('#sheetbg'); if (b) b.remove(); }
  function applySettings() { document.documentElement.classList.toggle('reduce', !!S.settings.reduceMotion); }
  if (S.settings.reduceMotion === false && window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches && !S.createdAt2) { S.settings.reduceMotion = true; S.createdAt2 = 1; }
  applySettings();
  { const bg = document.getElementById('bgimg'); if (bg) bg.style.backgroundImage = `url(${AQ_TPL})`; }

  const unitById = id => UNITS.find(u => u.id === id);
  const isOpen = id => S.rules.openUnits.includes(id);
  function currentUnit() {
    const open = UNITS.filter(u => isOpen(u.id));
    return open.find(u => !(S.units[u.id] && S.units[u.id].done)) || open[open.length - 1] || UNITS[0];
  }
  function touchDay() {
    const k = L.dayKey(now()), y = L.dayKey(now() - L.DAY);
    if (S.lastDay === k) return;
    S.streak = S.lastDay === y ? S.streak + 1 : 1; S.lastDay = k;
  }
  function learnedSentences() {
    const ids = L.doneIds(S); const pool = UNITS.filter(u => ids.includes(u.id) || u.id === currentUnit().id);
    return pool.flatMap(u => u.sentences);
  }

  /* ---------- 상단 바 ---------- */
  function updateHUD() {
    $('#pEnergy').textContent = S.energy; $('#pFruit').textContent = S.fruits; $('#pExp').textContent = S.exp;
    const ep = L.expProgress(S);
    const f = $('#expFill'); if (f) f.style.width = ep.pct + '%';
    const t = $('#expTxt'); if (t) t.textContent = ep.to ? `${S.exp} / ${ep.to}` : `${S.exp} MAX`;
    const lv = $('#lvTxt'); if (lv) lv.textContent = 'Lv.' + L.level(S.exp);
    const hp = $('#hpTxt'); if (hp) hp.textContent = S.energy;
    [['sEnergy', S.energy], ['sExp', S.exp], ['sFruit', S.fruits]].forEach(([id, v]) => { const e = document.getElementById(id); if (e) e.textContent = v; });
  }

  /* ---------- 캐릭터 카드 ---------- */
  const THEME = ['t-leaf', 't-gold', 't-jewel'];
  const TIER = ['BASIC', 'ROYAL', 'LEGEND'];
  const LEAF = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 19 C4 10 10 4 20 4 C20 14 14 20 5 19Z" fill="#7be07a" stroke="#0f4a1a" stroke-width="1.6"/><path d="M6 18 L16 8 M10 14 H14 M9 11 V15" stroke="#0f4a1a" stroke-width="1.4" stroke-linecap="round"/></svg>`;
  const CROWN = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 8 L7.5 13 L12 4 L16.5 13 L21 8 L19 19 H5Z" fill="#fff3a0" stroke="#6a3a00" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  const GEM = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 4 H18 L22 9 L12 21 L2 9Z" fill="#e7d1ff" stroke="#3a1a7a" stroke-width="1.6" stroke-linejoin="round"/><path d="M2 9 H22 M9 4 L12 21 L15 4" stroke="#3a1a7a" stroke-width="1.1" fill="none"/></svg>`;
  const BOLT = `<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M13 2 L5 13 H11 L10 22 L19 10 H13Z" fill="#1c1c28"/></svg>`;
  const EMB = [LEAF, CROWN, GEM];
  const SPARKS = [[12, 20, 0], [80, 16, .7], [68, 60, 1.4], [24, 66, 2], [88, 44, .4], [40, 12, 1.8], [56, 30, 1.1], [30, 40, 2.4], [74, 30, .2]];
  function cardHTML(i, o = {}) {
    const st = STAGES[i];
    const live = !!o.live;
    const ep = L.expProgress(S);
    const legend = i === 2 && S.badges.includes('legend') ? 'legend' : '';
    const ready = live && L.canEvolve(S) ? 'ready' : '';
    const sleepy = live && S.energy < 60;
    let btn = '';
    const openBoss = live && BOSSES.find(b => L.bossOpen(S, b) && !S.bosses[b.id]);
    if (live && L.canEvolve(S)) btn = `<button class="art-btn" data-act="evolve">✨ 진화하기!</button>`;
    else if (live && S.stage < S.maxStage) btn = `<button class="art-btn recover" data-act="review">🔁 복습으로 원래 모습 되찾기</button>`;
    else if (openBoss) btn = `<button class="art-btn boss" data-act="bossinfo" data-v="${openBoss.id}">🌳 보스전이 열렸어요!</button>`;
    const gems = '◆'.repeat(st.rarity) + '◇'.repeat(3 - st.rarity);
    const lv = live || o.mine ? L.level(S.exp) : (i * 10 + 1);
    return `<div class="card ${THEME[i]} s${i + 1} ${legend} ${ready}" ${live ? 'id="card"' : ''}>
      <div class="card-in">
        <div class="c-head"><span class="tier">${TIER[i]}</span><span class="c-name">${st.name}</span>
          <span class="c-lv" ${live ? 'id="lvTxt"' : ''}>Lv. ${lv}</span>
          <span class="c-hp"><small>HP</small><b ${live ? 'id="hpTxt"' : ''}>${live ? S.energy : 100}</b></span><span class="emb">${EMB[i]}</span></div>
        <div class="art" ${live ? 'id="art"' : ''} style="background-image:url(${AQ_ART[i]})">
          <div class="glint"></div>
          ${SPARKS.map(([x, y, d]) => `<i class="spark" style="left:${x}%;top:${y}%;animation-delay:${d}s"></i>`).join('')}
          <div class="aura"></div>
          <div class="mascot ${sleepy ? 'mood-sleepy' : ''}" ${live ? 'id="mascot" data-act="pet"' : ''}><img src="${IMG[i]}" alt="${st.name}" draggable="false"></div>
          ${sleepy ? '<span class="zz">z z</span>' : ''}${btn}
        </div>
        <div class="c-trait"><span class="ribbon">특성</span><b>${st.trait}</b><p>${st.traitText}</p></div>
        <div class="c-skill"><span class="bolt">${'<i>' + BOLT + '</i>'}${'<i>' + BOLT + '</i>'}${i > 1 ? '<i>' + BOLT + '</i>' : ''}</span><b>${st.skill}</b><span class="dmg">${S.rules.expBasic * 6}+</span><p>${st.skillText}</p></div>
        <div class="c-stats"><div><span>단어</span><i class="ci c1">${BOOKI}</i><b>×${Object.keys(S.mastered).length}</b></div><div><span>문장</span><i class="ci c2">${LEAF}</i><b>${S.sentOK}</b></div><div><span>연속</span><i class="ci c3">★</i><b>${S.streak}일</b></div></div>
        <div class="c-foot"><div class="c-no">English Quest No.${st.no}<span class="gems">${gems}</span></div>
          <div class="expbar"><span><span class="lbl">진화 경험치 </span><em>EXP</em></span><div class="trk"><i class="fill" ${live ? 'id="expFill"' : ''} style="width:${ep.pct}%"></i></div><b ${live ? 'id="expTxt"' : ''}>${ep.to ? `${S.exp} / ${ep.to}` : `${S.exp} MAX`}</b></div></div>
      </div></div>`;
  }
  const BOOKI = `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 3 C12 3 5 11 5 15 A7 7 0 0 0 19 15 C19 11 12 3 12 3Z" fill="#4ab8ff" stroke="#0a3a6a" stroke-width="1.6"/></svg>`;
  function railHTML() {
    const pts = [0, 1, 2].map(i => `<div class="pt ${S.cards.includes(i) ? 'have' : 'lock'} ${S.stage === i ? 'cur' : ''}"><img src="${IMG[i]}" alt="${STAGES[i].name}"></div>`);
    return `<aside class="rail" aria-label="진화 라인"><h4>진화 라인</h4>${pts.join('<span class="chev">︾</span>')}
      <button class="forest-btn" data-act="go" data-v="forest"><span>🌳</span>사과숲</button></aside>`;
  }
  let moodT;
  function setMood(m, ms = 1300) {
    const el = $('#mascot'); if (!el) return;
    el.className = 'mascot mood-' + m;
    clearTimeout(moodT);
    moodT = setTimeout(() => { el.className = 'mascot' + (S.energy < 60 ? ' mood-sleepy' : ''); }, ms);
  }
  let bubT;
  function say(ko, en) {
    const art = $('#art'); if (!art) return;
    const old = art.querySelector('.bubble'); if (old) old.remove();
    const b = document.createElement('div'); b.className = 'bubble';
    b.innerHTML = (en ? `<span class="en">${esc(en)}</span>` : '') + esc(ko);
    art.append(b); clearTimeout(bubT); bubT = setTimeout(() => b.remove(), 2800);
  }
  const PET = ['안녕! 오늘도 영어 공부 할까?', '간지러워~ 히히!', '나 점점 강해지는 느낌이야!', '같이 퀴즈 풀자!', '덩굴 꼬리 멋지지?'];

  /* ---------- 퀴즈 진행 상태 ---------- */
  let Q = null;
  function startSet(unitId, setIdx) {
    if (!isOpen(unitId)) { toast('선생님이 아직 열지 않은 단원이에요.'); return; }
    Q = { mode: 'set', unit: unitId, setIdx, list: L.buildSet(UNITS, unitId, setIdx, now() & 0xffff), i: 0, results: [], combo: 0, first: true, phase: 'ask' };
    closeSheet(); go('play');
  }
  function startReview() {
    let ids = L.doneIds(S);
    const wrongUnits = [...new Set(Object.values(S.wrong).map(w => w.unit))];
    ids = [...new Set(ids.concat(wrongUnits))].filter(isOpen);
    if (!ids.length) ids = [currentUnit().id];
    Q = { mode: 'review', units: ids, list: L.buildMixed(UNITS, ids, S.rules.reviewLen, now() & 0xffff, 'review', S.wrong), i: 0, results: [], combo: 0, first: true, phase: 'ask' };
    closeSheet(); go('play');
    setTimeout(() => { setMood('cheer'); say('복습하면 더 튼튼해져! 힘내!'); }, 300);
  }
  function startBoss(id) {
    const b = BOSSES.find(x => x.id === id);
    if (!L.bossOpen(S, b)) { toast(`${b.afterUnit}단원을 완료하면 열려요.`); return; }
    Q = { mode: 'boss', boss: id, list: L.buildMixed(UNITS, b.range, S.rules.bossLen, now() & 0xffff, 'boss'), i: 0, results: [], combo: 0, first: true, phase: 'ask' };
    closeSheet(); go('boss');
  }

  const LETTERS = 'ABCD';
  function qtopHTML() {
    let tag, dots = '', label;
    if (Q.mode === 'set') {
      const u = S.units[Q.unit]; const off = Q.setIdx * 5;
      tag = `<span class="lesson">Lesson ${Q.unit}</span>`;
      for (let k = 0; k < 10; k++) {
        let c = '';
        if (k < off) c = u && u.sets[0] ? 'ok' : '';
        else if (k >= off + 5) c = u && u.sets[1] ? 'ok' : '';
        else { const r = Q.results[k - off]; c = r || (k - off === Q.i ? 'cur' : ''); }
        dots += `<i class="${c}"></i>`;
      }
      label = `${Math.min(off + Q.i + 1, 10)} / 10`;
    } else {
      tag = Q.mode === 'boss' ? `<span class="lesson boss">Boss</span>` : `<span class="lesson review">Review</span>`;
      for (let k = 0; k < Q.list.length; k++) dots += `<i class="${Q.results[k] || (k === Q.i ? 'cur' : '')}"></i>`;
      label = `${Math.min(Q.i + 1, Q.list.length)} / ${Q.list.length}`;
    }
    return `<div class="qtop">${tag}<div class="dots">${dots}<b>${label}</b></div></div>`;
  }
  function bodyHTML(q) {
    const opts = (list, ko, wide) => `<div class="opts ${wide ? 'wide' : ''}">${list.map((o, i) => `<button class="opt" data-act="pick" data-v="${i}"><span class="k">${LETTERS[i]}</span><span class="t ${ko ? 'ko' : ''} ${!wide && o.length > 8 ? 'long' : ''}">${esc(o)}</span></button>`).join('')}</div>`;
    const listen = `<div class="listen"><button class="spk" data-act="speakq" aria-label="듣기">🔊</button><button class="spk slow" data-act="speakslow" aria-label="천천히 듣기">🐢</button>눌러서 다시 들어요</div>`;
    switch (q.type) {
      case 'pic': return `<div class="qshow banner"><span class="pic">${q.show}</span></div>${opts(q.options)}`;
      case 'ko2en': return `<div class="qshow banner"><span class="ko">${esc(q.show)}</span></div>${opts(q.options)}`;
      case 'en2ko': return `<div class="qshow banner"><span class="sent">${esc(q.show)}</span>${q.item && q.item.e ? `<span class="side-pic">${q.item.e}</span>` : ''}</div>${opts(q.options, true)}`;
      case 'listen': return `<div class="qshow banner">${listen}</div>${opts(q.options)}`;
      case 'listenSent': return `<div class="qshow banner">${listen}</div>${opts(q.options, false, true)}`;
      case 'blank': return `<div class="qshow banner"><span class="sent">${esc(q.show).replace('____', '<i class="blank"></i>')}<small style="display:block;font-family:var(--f-body);font-size:14px;font-weight:500;color:#4a5277;margin-top:4px">${esc(q.item.ko)}</small></span><span class="side-pic">${unitById(q.unit).icon}</span></div>${opts(q.options)}`;
      case 'order': return `<div class="qshow banner" style="min-height:48px"><span class="ko" style="font-size:20px">${esc(q.show)}</span></div>
        <div class="answer-line" id="aline">${(Q.order || []).map((ti, k) => `<button class="tile" data-act="untile" data-v="${k}">${esc(q.tiles[ti])}</button>`).join('')}</div>
        <div class="tiles">${q.tiles.map((t, k) => `<button class="tile ${(Q.order || []).includes(k) ? 'used' : ''}" data-act="tile" data-v="${k}">${esc(t)}</button>`).join('')}</div>`;
      case 'match': {
        const M = Q.match || (Q.match = { sel: null, done: [], miss: 0 });
        return `<div class="match"><div class="col">${q.left.map(w => `<button class="l ${M.done.includes(w) ? 'done' : ''} ${M.sel === w ? 'sel' : ''}" data-act="ml" data-v="${esc(w)}">${esc(w)}</button>`).join('')}</div>
          <div class="col">${q.right.map(k => `<button class="r ${M.done.includes(q.pairs.find(p => p.ko === k).en) ? 'done' : ''}" data-act="mr" data-v="${esc(k)}">${esc(k)}</button>`).join('')}</div></div>`;
      }
    }
    return '';
  }
  function readyHTML() {
    const u = currentUnit(); const rec = S.units[u.id];
    const nextSet = rec && rec.sets[0] && !rec.sets[1] ? 1 : 0;
    const openBoss = BOSSES.find(b => L.bossOpen(S, b) && !S.bosses[b.id]);
    const decayed = S.stage < S.maxStage;
    return `<div class="qtop"><span class="lesson">Lesson ${u.id}</span><div class="dots">${[0, 1].map(k => `<i class="${rec && rec.sets[k] ? 'ok' : ''}"></i>`).join('')}<b>세트 ${rec ? rec.sets.filter(Boolean).length : 0} / 2</b></div></div>
      <div class="ready-card"><h3 class="en">${esc(u.title)}</h3><p>${u.ko} · 단어 ${u.words.length}개 · 문장 ${u.sentences.length}개</p>
      ${decayed ? `<button class="btn blue" data-act="review" style="width:100%;margin-bottom:8px">🔁 복습 퀴즈 5문제로 원래 모습 되찾기</button>` : ''}
      ${openBoss ? `<button class="btn" data-act="bossinfo" data-v="${openBoss.id}" style="width:100%;margin-bottom:8px;background:linear-gradient(180deg,#d9c8ff,#8a5cff 60%,#5a2ad0);color:#fff">🌳 ${openBoss.title} 보스전 열림!</button>` : ''}
      <div class="row-btns" style="margin-top:0"><button class="btn" data-act="set" data-u="${u.id}" data-s="${nextSet}">⚔️ 퀴즈 시작<small>세트 ${nextSet + 1} · 5문제</small></button>
      <button class="btn ghost" data-act="go" data-v="study" data-u="${u.id}">🎧 먼저 공부하기<small>단어 카드</small></button></div></div>`;
  }
  function resultHTML() {
    const R = Q.summary;
    const stars = R.ok >= R.n ? 3 : R.ok >= Math.ceil(R.n * .8) ? 2 : R.ok >= Math.ceil(R.n * .6) ? 1 : 0;
    let title, sub = '', btns = '';
    const evo = L.canEvolve(S);
    if (Q.mode === 'set') {
      const rec = S.units[Q.unit];
      title = R.passed ? (R.newlyDone ? `${Q.unit}단원 완료!` : `세트 ${Q.setIdx + 1} 통과!`) : '조금만 더 해 볼까?';
      sub = R.passed ? `${R.ok} / ${R.n} 정답 · 경험치 +${R.gain}` : `${S.rules.setPass}문제 이상 맞히면 통과예요. (${R.ok} / ${R.n})`;
      if (R.newlyDone) sub += `<br>🍎 성장 열매 +1${R.decor ? ` · 🎁 ${R.decor} 해금` : ''}`;
      if (R.boss) sub += `<br>🌳 ${R.boss} 보스전이 열렸어요!`;
      const other = rec.sets[0] && !rec.sets[1] ? 1 : !rec.sets[0] ? 0 : null;
      if (!R.passed) btns += `<button class="btn" data-act="set" data-u="${Q.unit}" data-s="${Q.setIdx}">다시 도전</button>`;
      else if (other !== null) btns += `<button class="btn" data-act="set" data-u="${Q.unit}" data-s="${other}">다음 세트 ▶</button>`;
      else { const nu = currentUnit(); if (nu.id !== Q.unit) btns += `<button class="btn" data-act="set" data-u="${nu.id}" data-s="0">Lesson ${nu.id} ▶</button>`; }
    } else if (Q.mode === 'review') {
      title = R.recovered ? '원래 모습으로 돌아왔어요!' : R.ok >= S.rules.setPass ? '복습 완료!' : '복습 한 번 더?';
      sub = `${R.ok} / ${R.n} 정답 · 경험치 +${R.gain}`;
      btns += `<button class="btn" data-act="review">복습 더 하기</button>`;
    } else {
      const b = BOSSES.find(x => x.id === Q.boss);
      title = R.win ? `${b.title} 회복 성공!` : '나무가 조금 살아났어요!';
      sub = R.win ? `${R.ok} / ${R.n} 정답 · 보상: ${b.reward}` : `${S.rules.bossPass}문제 이상 맞히면 나무가 완전히 되살아나요. 언제든 다시 도전할 수 있어요.`;
      if (!R.win) btns += `<button class="btn" data-act="boss" data-v="${Q.boss}">다시 도전</button>`;
    }
    if (evo) btns = `<button class="btn" data-act="evolve" style="background:linear-gradient(180deg,#fff,#ffe25a 40%,#ff9a3a)">✨ 진화하기!</button>` + btns;
    btns += `<button class="btn ghost" data-act="endquiz">홈으로</button>`;
    return `${qtopHTML()}<div class="result"><div class="stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div><h3>${title}</h3><p>${sub}</p></div><div class="row-btns" style="flex-wrap:wrap">${btns}</div>`;
  }
  function renderPanel() {
    if ($('#sq')) return renderStageQ();
    const el = $('#qin'); if (!el) return;
    if (!Q) { el.innerHTML = readyHTML(); return; }
    if (Q.phase === 'result') { el.innerHTML = resultHTML(); return; }
    const q = Q.list[Q.i];
    const wasFb = Q.phase === 'fb';
    el.innerHTML = `${qtopHTML()}<div class="qprompt">${q.type !== 'listen' && q.type !== 'listenSent' ? `<button class="spk" data-act="speakq" aria-label="듣기">🔊</button>` : ''}<span>${q.prompt}</span></div>${bodyHTML(q)}<div id="fb"></div>`;
    if (wasFb) { feedback(Q.lastOk, 0); return; }
    if (q.type === 'listen' || q.type === 'listenSent') setTimeout(() => speak(q.speak), 350);
  }
  function feedback(ok, gain) {
    if ($('#sq')) return stageFeedback(ok, gain);
    const q = Q.list[Q.i]; const fb = $('#fb'); if (!fb) return;
    if (ok) {
      fb.innerHTML = `<div class="feedback ok">${gain ? `<span class="exp">+${gain} EXP</span>` : ''}<b>${Q.combo >= 3 ? `${Q.combo}연속 정답! 대단해요!` : ['정답이에요!', '좋아요!', '완벽해요!'][Q.i % 3]}</b>${esc(q.explain)}</div>
        <div class="row-btns"><button class="btn green" data-act="next">다음 ▶</button></div>`;
    } else {
      const ans = q.type === 'order' ? q.answer : q.type === 'match' ? '' : q.answer;
      fb.innerHTML = `<div class="feedback no"><b>아쉬워요, 괜찮아요!</b>${ans ? `정답은 <strong class="en">${esc(ans)}</strong> 예요.<br>` : ''}${esc(q.explain)}</div>
        <div class="row-btns"><button class="btn" data-act="retry">다시 도전</button><button class="btn ghost" data-act="next">다음 ▶</button></div>`;
    }
    const qp = $('#qp'); if (qp) { const c = qp.querySelector('.combo'); if (c) c.remove(); if (ok && Q.combo >= 2) { const s = document.createElement('div'); s.className = 'combo'; s.textContent = Q.combo + ' COMBO'; qp.append(s); } }
    fb.scrollIntoView({ block: 'nearest', behavior: S.settings.reduceMotion ? 'auto' : 'smooth' });
  }
  function handle(ok) {
    const q = Q.list[Q.i];
    Q.phase = 'fb';
    let gain = 0;
    if (Q.first) {
      L.recordAnswer(S, q, ok);
      Q.results[Q.i] = ok ? 'ok' : 'no';
      if (ok) {
        gain = L.award(S, q.id, Q.mode === 'set' ? 'basic' : Q.mode, now());
        Q.gain = (Q.gain || 0) + gain;
        if (['blank', 'order', 'listenSent'].includes(q.type)) S.sentOK++;
        else if (q.item) S.mastered[q.item.en] = 1;
        Q.combo++;
      }
    }
    if (ok) {
      AU.good();
      setMood(Q.combo >= 3 ? 'dance' : 'happy');
      if (Q.mode === 'boss') bossHit();
      if (q.speak) setTimeout(() => speak(q.speak), 250);
    } else {
      Q.combo = 0; Q.first = false;
      AU.bad(); setMood('think', 1600);
    }
    Q.lastOk = ok;
    feedback(ok, gain);
    save(); updateHUD();
  }
  function nextQ() {
    Q.i++; Q.first = true; Q.phase = 'ask'; Q.order = null; Q.match = null;
    if (Q.i >= Q.list.length) return finish();
    renderPanel();
    if (Q.mode === 'boss') renderBossState();
  }
  function finish() {
    const ok = Q.results.filter(r => r === 'ok').length, n = Q.list.length, t = now();
    const R = { ok, n, gain: Q.gain || 0 };
    if (Q.mode === 'set') {
      const r = L.completeSet(S, Q.unit, Q.setIdx, ok, n, t);
      Object.assign(R, r);
      L.markStudy(S, t, 'basic'); touchDay();
      if (r.newlyDone) {
        const d = DECOR.find(x => x.unit === Q.unit); R.decor = d && d.name;
        const b = BOSSES.find(x => x.afterUnit === Q.unit); R.boss = b && b.title;
        AU.fanfare();
      } else if (r.passed) AU.sparkle();
    } else if (Q.mode === 'review') {
      const was = S.stage < S.maxStage;
      if (ok >= S.rules.setPass) { L.markStudy(S, t, 'review'); R.recovered = was; } else L.markStudy(S, t, 'basic');
      touchDay();
    } else {
      R.win = L.completeBoss(S, Q.boss, ok);
      L.markStudy(S, t, 'basic'); touchDay();
      if (R.win) { AU.fanfare(); if (Q.boss === 3) setTimeout(() => toast('🏆 전설 카드 장식과 특별 도감 배지를 얻었어요!', 3200), 600); }
    }
    Q.summary = R; Q.phase = 'result';
    save();
    if (view === 'boss') { renderBossState(true); renderPanel(); } else render();
    updateHUD();
    if (R.ok >= R.n - 1) setTimeout(() => setMood('dance', 1800), 200);
  }

  /* ---------- 보스전 ---------- */
  function treeSVG(id) {
    const leaves = [[60, 40], [40, 52], [82, 50], [28, 72], [96, 70], [50, 30], [72, 28], [60, 62], [38, 92], [84, 90]];
    return `<svg viewBox="0 0 120 170" id="${id}" aria-hidden="true">
      <path d="M54 170 C56 140 50 120 40 104 M66 170 C64 140 70 122 82 106 M58 170 C58 130 60 110 60 86" stroke="#5a3a24" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M60 100 C50 80 30 76 22 70 M60 96 C72 78 92 74 100 66 M60 90 C58 66 62 46 60 28" stroke="#5a3a24" stroke-width="5" fill="none" stroke-linecap="round"/>
      ${leaves.map(([x, y], i) => `<g class="lf" data-i="${i}"><circle cx="${x}" cy="${y}" r="17" fill="#6b5a4a" opacity=".85"/><circle class="ap" cx="${x + 6}" cy="${y + 6}" r="5" fill="#e2453a" opacity="0"/></g>`).join('')}
    </svg>`;
  }
  function renderBossState(final) {
    const box = $('#bossbox'); if (!box || !Q) return;
    const ok = Q.results.filter(r => r === 'ok').length, n = Q.list.length;
    box.style.setProperty('--life', (ok / n) * .9 + .1);
    box.querySelector('.meter i').style.width = (ok / n * 100) + '%';
    box.querySelector('.meter b').textContent = `${ok} / ${n}`;
    box.querySelectorAll('.lf').forEach((g, i) => {
      const alive = i < ok; const c = g.querySelector('circle');
      c.setAttribute('fill', alive ? (i % 2 ? '#5cc76a' : '#3fae5a') : '#6b5a4a');
      c.style.filter = alive ? 'drop-shadow(0 0 6px #b8ff9a)' : '';
      g.querySelector('.ap').setAttribute('opacity', final && Q.summary && Q.summary.win && i % 2 === 0 ? 1 : 0);
    });
  }
  function bossHit() {
    const beam = $('#bossbox .beam'); if (beam) { beam.classList.remove('go'); void beam.offsetWidth; beam.classList.add('go'); }
    renderBossState();
    AU.sparkle();
  }
  function renderBoss() {
    const b = BOSSES.find(x => x.id === Q.boss);
    main.innerHTML = `<div class="screen-title"><button class="back" data-act="endquiz" aria-label="뒤로">←</button><div><h2>${b.title}</h2><p>${b.goal}</p></div></div>
      <div class="bossbox" id="bossbox"><div class="meter">생명의 빛<div class="trk"><i></i></div><b>0 / 10</b></div>
      ${treeSVG('btree')}<div class="hero"><img src="${IMG[S.stage]}" alt=""></div><div class="beam"></div></div>
      <div class="qpanel" id="qp"><div class="qin" id="qin"></div></div>`;
    renderPanel(); renderBossState(Q.phase === 'result');
  }

  /* ---------- 진화 연출 ---------- */
  function playEvolution(from, to, replay) {
    const rm = S.settings.reduceMotion;
    const ov = document.createElement('div'); ov.className = 'evo';
    const parts = Array.from({ length: 16 }, (_, k) => { const a = k / 16 * Math.PI * 2, r = 150 + (k % 3) * 30; return `<i class="particle" style="--x:${Math.cos(a) * r}px;--y:${Math.sin(a) * r}px;animation-delay:${(k % 5) * .25}s"></i>`; }).join('');
    ov.innerHTML = `<div class="rays2"></div><button class="skip" data-x="skip">건너뛰기</button>
      <div class="stagebox"><div class="glow"></div>${rm ? '' : parts}<img class="ev cur" src="${IMG[from]}" alt=""><img class="ev next" src="${IMG[to]}" alt=""></div>
      <div class="flash"></div><div class="caption">어라…? ${STAGES[from].name}의 몸이 빛나기 시작했어요!</div>`;
    layer.append(ov);
    AU.bgm(false);
    const T = []; const at = (ms, fn) => T.push(setTimeout(fn, ms));
    const cap = t => { const c = ov.querySelector('.caption'); if (c) c.textContent = t; };
    const reveal = () => {
      T.forEach(clearTimeout);
      ov.classList.remove('swap', 'fast', 'shake', 'charge'); ov.classList.add('dark', 'revealed');
      const fl = ov.querySelector('.flash'); if (!rm) fl.classList.add('go');
      AU.fanfare();
      ov.querySelector('.stagebox').remove(); const c = ov.querySelector('.caption'); if (c) c.remove(); const sk = ov.querySelector('.skip'); if (sk) sk.remove();
      const box = document.createElement('div'); box.className = 'reveal';
      box.innerHTML = cardHTML(to, { mine: true }) + `<div class="msg">축하해요! ${STAGES[from].name}이 ${STAGES[to].name}으로 진화했어요!<small>${replay ? '진화 장면 다시 보기' : '진화 도감에 새 카드가 등록되었어요'}</small></div>
        <div class="row-btns"><button class="btn" data-x="close">확인</button></div>`;
      ov.append(box);
    };
    ov.addEventListener('click', e => {
      const x = e.target.closest('[data-x]'); if (!x) return;
      if (x.dataset.x === 'skip') reveal();
      if (x.dataset.x === 'close') { ov.remove(); AU.bgm(true); if (view === 'home' || view === 'play' || view === 'dex') render(); }
    });
    at(60, () => ov.classList.add('dark'));
    at(900, () => { ov.classList.add('charge'); cap('황금빛 에너지가 모여들어요!'); AU.charge(5200); });
    at(2800, () => { if (!rm) ov.classList.add('swap'); cap('빛 속에서 모습이 바뀌고 있어요…!'); });
    at(4400, () => { if (!rm) ov.classList.add('fast', 'shake'); });
    if (rm) at(3600, () => { ov.querySelector('.ev.cur').style.opacity = 0; ov.querySelector('.ev.next').style.opacity = 1; });
    at(6200, reveal);
  }
  function doEvolve() {
    const from = S.stage;
    if (!L.evolve(S)) { toast('아직 진화 조건이 남았어요. 나의 성장에서 확인해 보세요!'); return; }
    S.cardAt[S.stage] = now(); save();
    closeSheet();
    playEvolution(from, S.stage, false);
  }

  /* ---------- 인트로 ---------- */
  const ORB = `<svg viewBox="0 0 120 132" aria-hidden="true"><defs>
      <radialGradient id="og" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fffbe0"/><stop offset=".35" stop-color="#c8f58a"/><stop offset=".75" stop-color="#4fb85a"/><stop offset="1" stop-color="#1f6a3a"/></radialGradient>
      <linearGradient id="ogold" x1="0" x2="1"><stop offset="0" stop-color="#fff3a8"/><stop offset=".5" stop-color="#e0a21a"/><stop offset="1" stop-color="#fff3a8"/></linearGradient></defs>
    <path d="M60 34 C36 14 6 34 10 72 C14 110 42 128 60 118 C78 128 106 110 110 72 C114 34 84 14 60 34Z" fill="url(#og)" stroke="url(#ogold)" stroke-width="4"/>
    <path d="M60 44 C60 70 60 92 60 110 M60 62 C50 56 40 56 32 60 M60 62 C70 56 80 56 88 60 M60 82 C48 76 38 78 30 84 M60 82 C72 76 82 78 90 84" stroke="#f6d36a" stroke-width="3" fill="none" stroke-linecap="round" opacity=".9"/>
    <path d="M60 36 C60 26 62 18 66 10" stroke="#7a4a2a" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M66 14 C76 2 96 6 98 14 C90 22 74 24 66 14Z" fill="#5cc76a" stroke="#2a8a3e" stroke-width="2"/>
    <ellipse cx="40" cy="54" rx="10" ry="16" fill="#fff" opacity=".45" transform="rotate(-25 40 54)"/></svg>`;
  const KID = `<svg viewBox="0 0 60 110" class="kid" aria-hidden="true"><circle cx="30" cy="16" r="12" fill="#1c1426"/><path d="M14 40 Q30 28 46 40 L48 74 L12 74Z" fill="#241a33"/><rect x="40" y="38" width="12" height="24" rx="5" fill="#3a2a4a"/><rect x="16" y="72" width="10" height="34" rx="4" fill="#1c1426"/><rect x="34" y="72" width="10" height="34" rx="4" fill="#1c1426"/></svg>`;
  /* 인트로: 선생님이 만든 영상(intro.mp4)을 전체 화면으로 재생 */
  function playIntro(done) {
    AU.bgm(false);
    const ov = document.createElement('div'); ov.className = 'vintro';
    ov.innerHTML = `<div class="frame916"><video id="introVideo" playsinline webkit-playsinline preload="auto" src="intro.mp4"></video>
      <div class="vload" id="vload"><i></i>영상을 불러오는 중…</div>
      <button class="vplay" id="vplay" hidden aria-label="재생">▶<small>눌러서 영상 보기</small></button>
      <div class="vbar"><i id="vprog"></i></div>
      <button class="vskip" data-x="skip" aria-label="인트로 건너뛰기">SKIP <span>▶▶</span></button></div>`;
    layer.append(ov);
    const v = ov.querySelector('video'), load = ov.querySelector('#vload'), playBtn = ov.querySelector('#vplay'), prog = ov.querySelector('#vprog');
    let ended = false;
    const end = () => { if (ended) return; ended = true; try { v.pause(); } catch (e) {} ov.remove(); S.introSeen = true; save(); AU.bgm(true); done && done(); };
    const tryPlay = () => { const pr = v.play(); if (pr && pr.catch) pr.then(() => { playBtn.hidden = true; }).catch(() => { load.hidden = true; playBtn.hidden = false; }); };
    v.addEventListener('playing', () => { load.hidden = true; playBtn.hidden = true; });
    v.addEventListener('waiting', () => { load.hidden = false; });
    v.addEventListener('timeupdate', () => { if (v.duration) prog.style.width = (v.currentTime / v.duration * 100) + '%'; });
    v.addEventListener('ended', end);
    v.addEventListener('error', () => { load.innerHTML = '영상을 불러오지 못했어요.<br><button class="btn" data-x="skip" style="margin-top:12px">게임으로 가기</button>'; });
    ov.addEventListener('click', e => {
      const x = e.target.closest('[data-x]'); if (x && x.dataset.x === 'skip') { AU.tap(); return end(); }
      if (e.target.closest('#vplay')) tryPlay();
    });
    tryPlay();
  }

  /* ---------- 화면들 ---------- */
  let view = 'home', viewArg = null;
  const NAVMAP = { home: 'home', play: 'quiz', units: 'units', study: 'study', quiz: 'quiz', dex: 'dex', me: 'me', forest: 'home', boss: 'units', teacher: 'me' };
  function go(v, arg) {
    if (Q && Q.mode === 'boss' && v !== 'boss') Q = null;
    if (Q && Q.phase === 'result' && v !== 'play' && v !== 'home') Q = null;
    stopForest();
    view = v; viewArg = arg;
    document.body.classList.toggle('on-stage', v === 'home' || v === 'play');
    clearTimeout(autoNextT);
    document.querySelectorAll('.nav button').forEach(b => b.classList.toggle('on', b.dataset.v === NAVMAP[v]));
    render(); main.scrollTop = 0;
  }
  function render() {
    ({ home: renderHome, play: renderHome, units: renderUnits, study: renderStudy, quiz: renderQuizHub, dex: renderDex, me: renderMe, forest: renderForest, boss: renderBoss, teacher: renderTeacher }[view] || renderHome)();
    updateHUD();
  }
  function autoQ(unitId) {
    const u = unitById(unitId || currentUnit().id); const rec = S.units[u.id];
    const si = rec && rec.sets[0] && !rec.sets[1] ? 1 : 0;
    Q = { mode: 'set', unit: u.id, setIdx: si, list: L.buildSet(UNITS, u.id, si, now() & 0xffff), i: 0, results: [], combo: 0, first: true, phase: 'ask' };
  }
  function shiftLesson(dir) {
    const open = UNITS.filter(u => isOpen(u.id)).map(u => u.id);
    const cur = Q && Q.mode === 'set' ? Q.unit : currentUnit().id;
    let k = open.indexOf(cur); if (k < 0) k = 0;
    const nid = open[(k + dir + open.length) % open.length];
    AU.tap(); autoQ(nid); renderPanel(); toast(`Lesson ${nid} · ${unitById(nid).title}`, 1300);
  }
  /* ================= 홈: 배경 시안(941×1672, 9:16) 위에 그대로 얹는 스테이지 ================= */
  const SW = 941, SH = 1672;
  const P = (x1, y1, x2, y2) => `left:${x1}px;top:${y1}px;width:${x2 - x1}px;height:${y2 - y1}px`;
  const OPT_SLOTS = [[92, 1238, 462, 1305], [480, 1238, 848, 1305], [92, 1320, 462, 1388], [480, 1320, 848, 1388]];
  const NAV_SLOTS = [[25, 168, 'home', '홈'], [175, 318, 'units', '단원 선택'], [322, 465, 'study', '영어 공부방'], [470, 617, 'quiz', '퀴즈 도전'], [625, 768, 'dex', '도감'], [773, 918, 'me', '나의 성장']];
  let autoNextT = null;
  function fitStage() {
    const w = $('#stgwrap'), g = $('#stg'); if (!w || !g) return;
    const sc = Math.min(main.clientWidth / SW, main.clientHeight / SH);
    g.style.transform = `scale(${sc})`; w.style.width = SW * sc + 'px'; w.style.height = SH * sc + 'px';
  }
  window.addEventListener('resize', fitStage);
  function renderHome() {
    if (!Q) autoQ();
    const i = S.stage, st = STAGES[i], ep = L.expProgress(S);
    const sleepy = S.energy < 60;
    const openBoss = BOSSES.find(b => L.bossOpen(S, b) && !S.bosses[b.id]);
    let btn = '';
    if (L.canEvolve(S)) btn = `<button class="art-btn" data-act="evolve">✨ 진화하기!</button>`;
    else if (S.stage < S.maxStage) btn = `<button class="art-btn recover" data-act="review">🔁 복습으로 원래 모습 되찾기</button>`;
    else if (openBoss) btn = `<button class="art-btn boss" data-act="bossinfo" data-v="${openBoss.id}">🌳 보스전이 열렸어요!</button>`;
    const navIcons = [...document.querySelectorAll('#nav button svg')].map(x => x.outerHTML);
    const legend = i === 2 && S.badges.includes('legend');
    main.innerHTML = `<div class="stg-wrap" id="stgwrap"><div class="stg s${i + 1} ${L.canEvolve(S) ? 'ready' : ''}" id="stg" style="background-image:url(${AQ_TPL})">
      ${i > 0 ? `<div class="stg-tint t${i}" style="${P(163, 122, 920, 1000)}"></div>` : ''}
      ${legend ? `<div class="stg-legend" style="${P(159, 118, 924, 1004)}"></div>` : ''}
      <div class="stg-sheen" style="${P(163, 122, 920, 1000)}"></div>
      <div class="s-logo" style="${P(4, 8, 182, 88)}">${document.querySelector('.logo svg').outerHTML}</div>
      <button class="s-stat" style="${P(196, 40, 410, 84)}" data-tip="⚡ 성장 에너지: 꾸준히 공부하면 가득 차요"><span class="ic">⚡</span><b><span id="sEnergy">${S.energy}</span><small>/100</small></b></button>
      <button class="s-stat" style="${P(414, 40, 618, 84)}" data-tip="🍎 사과 포인트: 문제를 맞힐 때마다 쌓이는 누적 경험치"><span class="ic">🍎</span><b id="sExp">${S.exp}</b></button>
      <button class="s-stat" style="${P(622, 40, 828, 84)}" data-tip="💎 성장 보석: 단원을 완료하면 1개씩 받아요"><span class="ic">💎</span><b id="sFruit">${S.fruits}</b></button>
      <button class="s-hit" style="${P(857, 27, 923, 93)}" data-act="go" data-v="me" aria-label="설정"></button>

      <div class="s-railtab" style="${P(30, 222, 156, 266)}">진화 라인</div>
      ${[350, 522, 690].map((cy, k) => `<div class="s-pt ${S.stage === k ? 'cur' : ''} ${S.cards.includes(k) ? '' : 'lock'}" style="${P(88 - 62, cy - 62, 88 + 62, cy + 62)}"><img src="${IMG[k]}" alt="${STAGES[k].name}"></div>`).join('')}
      <button class="s-forest" style="${P(22, 832, 156, 908)}" data-act="go" data-v="forest"><span>🌳</span>사과숲</button>

      <div class="s-tier" style="${P(182, 171, 304, 207)}">${TIER[i]}</div>
      <div class="s-name" style="${P(316, 160, 558, 224)}">${st.name}</div>
      <div class="s-lv" style="${P(566, 175, 666, 215)}" id="lvTxt">Lv. ${L.level(S.exp)}</div>
      <div class="s-hp" style="${P(672, 156, 818, 224)}"><small>HP</small><b id="hpTxt">${S.energy}</b></div>
      ${i > 0 ? `<div class="s-emb e${i}" style="${P(828, 160, 886, 218)}">${EMB[i]}</div>` : ''}
      <div class="s-art" id="art" style="${P(207, 234, 878, 588)};background-image:url(${AQ_ART[i]})">
        <div class="glint"></div>
        ${SPARKS.map(([x, y, d]) => `<i class="spark" style="left:${x}%;top:${y}%;animation-delay:${d}s"></i>`).join('')}
        <div class="aura"></div>
        <div class="mascot ${sleepy ? 'mood-sleepy' : ''}" id="mascot" data-act="pet"><img src="${IMG[i]}" alt="${st.name}" draggable="false"></div>
        ${sleepy ? '<span class="zz">z z</span>' : ''}${btn}
      </div>
      <div class="s-rib" style="${P(204, 634, 352, 670)}">특성</div>
      <div class="s-ttl" style="${P(366, 626, 880, 676)}">${st.trait}</div>
      <div class="s-tdesc" style="${P(210, 678, 880, 728)}">${st.traitText}</div>
      <div class="s-skill" style="${P(206, 738, 882, 856)}"><div class="s-krow"><span class="s-bolts"><i>${BOLT}</i><i>${BOLT}</i>${i > 1 ? '<i>' + BOLT + '</i>' : ''}</span><b>${st.skill}</b><span class="s-dmg">${S.rules.expBasic * 6}+</span></div><p>${st.skillText}</p></div>
      ${[[190, 405, '단어', BOOKI, '×' + Object.keys(S.mastered).length], [410, 655, '문장', LEAF, S.sentOK], [663, 888, '연속', '★', S.streak + '일']].map(([x1, x2, l, ic, v]) => `<div class="s-chip" style="${P(x1 + 16, 863, x2 - 16, 901)}"><span>${l}</span><i>${ic}</i><b>${v}</b></div>`).join('')}
      <div class="s-no" style="${P(200, 904, 388, 930)}">English Quest No.${st.no}</div>
      ${st.rarity > 1 ? `<div class="s-gems" style="${P(196, 930, 296, 966)}">${'◆'.repeat(st.rarity) + '◇'.repeat(3 - st.rarity)}</div>` : ''}
      <div class="s-exp" style="${P(404, 918, 878, 960)}"><span>진화 <em>EXP</em></span><div class="trk"><i class="fill" id="expFill" style="width:${ep.pct}%"></i></div><b id="expTxt">${ep.to ? `${S.exp}/${ep.to}` : `${S.exp} MAX`}</b></div>

      <div class="s-qglow" style="${P(50, 1017, 890, 1443)}"></div>
      <div id="sq"></div>
      <button class="s-arrow" style="${P(0, 1170, 54, 1262)}" data-act="lprev" aria-label="이전 단원"></button>
      <button class="s-arrow" style="${P(888, 1170, 941, 1262)}" data-act="lnext" aria-label="다음 단원"></button>
      ${NAV_SLOTS.map(([x1, x2, v, label], k) => `<button class="s-nav ${k === 3 ? 'on' : ''}" style="${P(x1, 1472, x2, 1610)}" data-act="go" data-v="${v}">${navIcons[k] || ''}<span>${label}</span></button>`).join('')}
    </div></div>`;
    fitStage(); requestAnimationFrame(fitStage);
    renderStageQ();
  }
  function sentSize(t) { const n = t.length; return n > 30 ? 32 : n > 22 ? 38 : 48; }
  function optSize(t, ko) { const n = t.length; if (ko) return n > 8 ? 28 : 36; return n > 24 ? 22 : n > 16 ? 26 : n > 9 ? 31 : 38; }
  function stageTop() {
    let tag, dots = '', label;
    if (Q.mode === 'set') {
      const u = S.units[Q.unit], off = Q.setIdx * 5;
      tag = `Lesson ${Q.unit}`;
      for (let k = 0; k < 10; k++) {
        let c = '';
        if (k < off) c = u && u.sets[0] ? 'ok' : ''; else if (k >= off + 5) c = u && u.sets[1] ? 'ok' : '';
        else { const r = Q.results[k - off]; c = r || (k - off === Q.i && Q.phase !== 'result' ? 'cur' : ''); }
        dots += `<i class="${c}"></i>`;
      }
      label = `${Math.min(off + Q.i + 1, 10)}/10`;
    } else {
      tag = Q.mode === 'boss' ? 'Boss' : 'Review';
      for (let k = 0; k < Q.list.length; k++) dots += `<i class="${Q.results[k] || (k === Q.i ? 'cur' : '')}"></i>`;
      label = `${Math.min(Q.i + 1, Q.list.length)}/${Q.list.length}`;
    }
    return `<div class="s-tab" style="${P(88, 1033, 264, 1071)}">${tag}</div><div class="s-dots" style="${P(548, 1034, 872, 1076)}">${dots}<b>${label}</b></div>`;
  }
  const PROMPT_BOX = P(166, 1084, 872, 1128), BANNER_BOX = P(176, 1134, 812, 1220);
  function renderStageQ() {
    const el = $('#sq'); if (!el || !Q) return;
    clearTimeout(autoNextT);
    if (Q.phase === 'result') return renderStageResult();
    const q = Q.list[Q.i];
    const prompt = q.type === 'order' ? `순서대로 눌러 문장을 만들어요` : q.type === 'match' ? `뜻에 맞는 영어 단어를 차례로 골라요 (${(Q.match ? Q.match.k : 0) + 1}/4)` : q.prompt;
    let banner = '', opts = '';
    const L4 = (list, ko) => list.map((o, k) => { const [x1, y1, x2, y2] = OPT_SLOTS[k]; return `<button class="s-opt" style="${P(x1, y1, x2, y2)}" data-act="pick" data-v="${k}"><i>${LETTERS[k]}</i><span class="${ko ? 'ko' : ''}" style="font-size:${optSize(o, ko)}px">${esc(o)}</span></button>`; }).join('');
    const listen = `<div class="s-listen"><button class="s-spk" data-act="speakq" aria-label="듣기">🔊</button><button class="s-spk slow" data-act="speakslow" aria-label="천천히 듣기">🐢</button><span>잘 듣고 골라요</span></div>`;
    switch (q.type) {
      case 'pic': banner = `<span class="s-pic">${q.show}</span>`; opts = L4(q.options); break;
      case 'ko2en': banner = `<span class="s-ko">${esc(q.show)}</span>`; opts = L4(q.options); break;
      case 'en2ko': banner = `<span class="s-sent" style="font-size:48px">${esc(q.show)}</span>${q.item && q.item.e ? `<span class="s-side">${q.item.e}</span>` : ''}`; opts = L4(q.options, true); break;
      case 'listen': case 'listenSent': banner = listen; opts = L4(q.options); break;
      case 'blank': banner = `<span class="s-sentwrap"><span class="s-sent" style="font-size:${sentSize(q.show)}px">${esc(q.show).replace('____', '<i class="blank"></i>')}</span><small>${esc(q.item.ko)}</small></span><span class="s-side">${unitById(q.unit).icon}</span>`; opts = L4(q.options); break;
      case 'order': {
        const ord = Q.order || [];
        banner = ord.length ? `<span class="s-built">${ord.map((ti, k) => `<button class="s-tile on" data-act="untile" data-v="${k}">${esc(q.tiles[ti])}</button>`).join('')}</span>` : `<span class="s-ko" style="font-size:38px">${esc(q.show)}</span>`;
        opts = `<div class="s-cover" style="${P(88, 1234, 852, 1392)}">${q.tiles.map((t, k) => `<button class="s-tile ${ord.includes(k) ? 'used' : ''}" data-act="tile" data-v="${k}">${esc(t)}</button>`).join('')}</div>`;
        break;
      }
      case 'match': {
        const M = Q.match || (Q.match = { k: 0, done: [], miss: 0 });
        banner = `<span class="s-ko">${esc(q.right[Math.min(M.k, 3)])}</span>`;
        opts = q.left.map((w, k) => { const [x1, y1, x2, y2] = OPT_SLOTS[k]; return `<button class="s-opt ${M.done.includes(w) ? 'right done' : ''}" style="${P(x1, y1, x2, y2)}" data-act="smatch" data-v="${esc(w)}"><i>${LETTERS[k]}</i><span style="font-size:${optSize(w)}px">${esc(w)}</span></button>`; }).join('');
        break;
      }
    }
    el.innerHTML = `${stageTop()}
      <button class="s-hit round" style="${P(86, 1080, 154, 1148)}" data-act="speakq" aria-label="듣기"></button>
      <div class="s-prompt" id="sprompt" style="${PROMPT_BOX}"><span>${esc(prompt)}</span></div>
      <div class="s-banner" id="sbanner" style="${BANNER_BOX}">${banner}</div>${opts}`;
    if (Q.phase === 'fb') return stageFeedback(Q.lastOk, 0);
    if (q.type === 'listen' || q.type === 'listenSent') setTimeout(() => speak(q.speak), 350);
  }
  function stageFeedback(ok, gain) {
    const q = Q.list[Q.i], pr = $('#sprompt'), bn = $('#sbanner'); if (!pr || !bn) return;
    if (ok) {
      pr.innerHTML = `<span class="s-fb ok">${Q.combo >= 3 ? `${Q.combo}연속 정답! 대단해요!` : ['정답이에요!', '좋아요!', '완벽해요!'][Q.i % 3]}${gain ? ` <em>+${gain} EXP</em>` : ''}</span>`;
      bn.innerHTML = `<span class="s-explain">${esc(q.explain)}</span><button class="s-next" data-act="next">다음 ▶</button>`;
      if (gain) floatExp(gain);
      if (Q.combo >= 3) say(`${Q.combo}연속 정답!`);
      autoNextT = setTimeout(() => { if (Q && Q.phase === 'fb' && $('#sq')) nextQ(); }, 1900);
    } else {
      pr.innerHTML = `<span class="s-fb no">아쉬워요, 괜찮아요! ${q.type !== 'match' ? `정답은 <b>${esc(q.answer)}</b>` : ''}</span>`;
      bn.innerHTML = `<span class="s-explain">${esc(q.explain)}</span><span class="s-fbtns"><button class="s-next re" data-act="retry">다시</button><button class="s-next" data-act="next">다음 ▶</button></span>`;
    }
  }
  function floatExp(g) {
    const stg = $('#stg'); if (!stg) return;
    const f = document.createElement('div'); f.className = 's-float'; f.textContent = `+${g} EXP`; f.style.cssText = P(600, 870, 860, 920);
    stg.append(f); setTimeout(() => f.remove(), 1300);
  }
  function renderStageResult() {
    const R = Q.summary, el = $('#sq');
    const stars = R.ok >= R.n ? 3 : R.ok >= Math.ceil(R.n * .8) ? 2 : R.ok >= Math.ceil(R.n * .6) ? 1 : 0;
    let title, sub; const acts = [];
    if (L.canEvolve(S)) acts.push(['✨ 진화하기!', 'evolve', '']);
    if (Q.mode === 'set') {
      const rec = S.units[Q.unit];
      title = R.passed ? (R.newlyDone ? `${Q.unit}단원 완료!` : `세트 ${Q.setIdx + 1} 통과!`) : '조금만 더 해 볼까?';
      sub = R.passed ? `${R.ok} / ${R.n} 정답 · 경험치 +${R.gain}` : `${S.rules.setPass}문제 이상 맞히면 통과예요 (${R.ok} / ${R.n})`;
      if (R.newlyDone) sub += ` · 💎 +1${R.decor ? ` · 🎁 ${R.decor}` : ''}`;
      const other = rec.sets[0] && !rec.sets[1] ? 1 : !rec.sets[0] ? 0 : null;
      if (!R.passed) acts.push(['다시 도전', 'set', `data-u="${Q.unit}" data-s="${Q.setIdx}"`]);
      else if (other !== null) acts.push(['다음 세트 ▶', 'set', `data-u="${Q.unit}" data-s="${other}"`]);
      else { const nu = currentUnit(); if (nu.id !== Q.unit) acts.push([`Lesson ${nu.id} ▶`, 'set', `data-u="${nu.id}" data-s="0"`]); }
      if (R.boss) acts.push(['🌳 보스전', 'bossinfo', `data-v="${BOSSES.find(b => b.afterUnit === Q.unit).id}"`]);
    } else {
      title = R.recovered ? '원래 모습으로 돌아왔어요!' : R.ok >= S.rules.setPass ? '복습 완료!' : '복습 한 번 더?';
      sub = `${R.ok} / ${R.n} 정답 · 경험치 +${R.gain}`;
      acts.push(['복습 더 하기', 'review', '']);
    }
    acts.push(['🎧 공부방', 'go', 'data-v="study"']);
    acts.push(['처음으로', 'endquiz', '']);
    el.innerHTML = `${stageTop()}<div class="s-prompt" style="${PROMPT_BOX}"><span class="s-fb ok">${sub}</span></div>
      <div class="s-banner" style="${BANNER_BOX}"><span class="s-stars">${'★'.repeat(stars)}<em>${'★'.repeat(3 - stars)}</em></span><span class="s-title">${title}</span></div>
      ${acts.slice(0, 4).map(([l, a, d], k) => { const [x1, y1, x2, y2] = OPT_SLOTS[k]; return `<button class="s-opt act ${a === 'evolve' ? 'evo' : ''}" style="${P(x1, y1, x2, y2)}" data-act="${a}" ${d}><span style="font-size:32px">${l}</span></button>`; }).join('')}`;
  }

  function unitRowHTML(u) {
    const st = L.unitStatus(S, u, now());
    const LBL = { open: '학습 가능', studying: '공부 중', done: '완료', review: '복습 필요', locked: '아직 안 열림' };
    const rec = S.units[u.id]; const pct = rec ? rec.sets.filter(Boolean).length * 50 : 0;
    return `<button class="unit ${st === 'locked' ? 'locked' : ''}" data-act="unit" data-v="${u.id}">
      <span class="num">${u.icon}<b>${u.id}</b></span><span style="min-width:0"><h3>${esc(u.title)}</h3><p>${u.ko}</p><div class="bar"><i style="width:${pct}%"></i></div></span>
      <span class="st ${st}">${LBL[st]}</span></button>`;
  }
  function bossRowHTML(b) {
    const open = L.bossOpen(S, b), done = !!S.bosses[b.id];
    return `<button class="bossnode ${open ? '' : 'locked'}" data-act="bossinfo" data-v="${b.id}"><span class="num">${done ? '🌳' : '🥀'}</span>
      <span><h3>${b.id === 3 ? '최종' : b.id + '차'} 보스전 · ${b.title}</h3><p>${b.range.length > 3 ? '전체 단원' : b.range[0] + '~' + b.range[b.range.length - 1] + '단원'} 복습 · ${b.reward}</p></span>
      <span class="st ${done ? 'done' : open ? 'studying' : 'locked'}">${done ? '성공' : open ? '도전 가능' : '잠김'}</span></button>`;
  }
  function renderUnits() {
    let html = `<div class="screen-title"><div><h2>단원 선택</h2><p>4학년 영어 1학기 · 2학기 핵심 단어와 문장</p></div></div>`;
    for (const sem of [1, 2]) {
      html += `<div class="sem">${sem}학기</div><div class="units">`;
      for (const u of UNITS.filter(x => x.sem === sem)) {
        html += unitRowHTML(u);
        const b = BOSSES.find(x => x.afterUnit === u.id); if (b) html += bossRowHTML(b);
      }
      html += `</div>`;
    }
    main.innerHTML = html;
  }
  function unitSheet(id) {
    const u = unitById(id);
    if (!isOpen(id)) { toast('선생님이 아직 열지 않은 단원이에요.'); return; }
    const rec = S.units[id];
    openSheet(`<button class="close" data-act="closeSheet" aria-label="닫기">✕</button><h3 class="en">Lesson ${id}. ${esc(u.title)}</h3><p class="sub">${u.ko} · 단어 ${u.words.length}개 · 핵심 문장 ${u.sentences.length}개</p>
      <div class="grid2"><button class="btn ghost" data-act="go" data-v="study" data-u="${id}">🎧 공부방<small>단어·문장 카드</small></button>
      <button class="btn" data-act="set" data-u="${id}" data-s="0">⚔️ 세트 1 ${rec && rec.sets[0] ? '✅' : ''}<small>그림·뜻·듣기·빈칸</small></button>
      <button class="btn" data-act="set" data-u="${id}" data-s="1">⚔️ 세트 2 ${rec && rec.sets[1] ? '✅' : ''}<small>문장 듣기·순서·짝맞추기</small></button>
      <button class="btn blue" data-act="review">🔁 복습 퀴즈<small>경험치 +${S.rules.expReview}</small></button></div>
      <p class="sub" style="margin-top:12px">${u.words.slice(0, 8).map(w => w.en).join(' · ')}${u.words.length > 8 ? ' …' : ''}</p>`);
  }
  function bossSheet(id) {
    const b = BOSSES.find(x => x.id === id); const open = L.bossOpen(S, b);
    openSheet(`<button class="close" data-act="closeSheet" aria-label="닫기">✕</button><h3>🌳 ${b.title}</h3><p class="sub">${b.goal}</p>
      <p class="sub">복습 범위: ${b.range.length > 3 ? '1~11단원 전체' : b.range.join(', ') + '단원'} · ${S.rules.bossLen}문제 · ${S.rules.bossPass}문제 이상 맞히면 성공<br>보상: <b>${b.reward}</b>${S.bosses[id] ? ' (이미 받음)' : ''}</p>
      ${open ? `<button class="btn" data-act="boss" data-v="${id}" style="width:100%">도전하기!</button>` : `<button class="btn" disabled style="width:100%">${b.afterUnit}단원을 완료하면 열려요</button>`}`);
  }

  function renderQuizHub() {
    const done = L.doneIds(S);
    let html = `<div class="screen-title"><div><h2>퀴즈 도전</h2><p>5문제씩 나눠서 풀어요. 틀려도 경험치는 줄지 않아요.</p></div></div>`;
    html += `<div class="glass" style="margin-bottom:10px;color:#fff"><div style="display:flex;gap:10px;align-items:center"><span style="font-size:34px">🔁</span><div style="flex:1"><b style="font-family:var(--f-display);font-size:17px;font-weight:400">복습 퀴즈</b><div style="font-size:12.5px;color:#c9d6f0">완료한 단원 + 틀린 단어 · 정답마다 +${S.rules.expReview} EXP</div></div><button class="btn blue" data-act="review" style="flex:0 0 auto">시작</button></div></div>`;
    html += `<div class="units">` + BOSSES.map(bossRowHTML).join('') + `</div><div class="sem">단원별 퀴즈</div><div class="units">`;
    for (const u of UNITS) {
      const rec = S.units[u.id], lock = !isOpen(u.id);
      html += `<div class="unit ${lock ? 'locked' : ''}" style="grid-template-columns:50px 1fr"><span class="num">${u.icon}<b>${u.id}</b></span><span style="min-width:0"><h3>${esc(u.title)}</h3>
        <div class="row-btns" style="margin-top:6px"><button class="btn" style="min-height:38px;font-size:14px" data-act="set" data-u="${u.id}" data-s="0" ${lock ? 'disabled' : ''}>세트 1 ${rec && rec.sets[0] ? '✅' : ''}</button><button class="btn" style="min-height:38px;font-size:14px" data-act="set" data-u="${u.id}" data-s="1" ${lock ? 'disabled' : ''}>세트 2 ${rec && rec.sets[1] ? '✅' : ''}</button></div></span></div>`;
    }
    main.innerHTML = html + '</div>';
  }

  /* 공부방 */
  const SD = { unit: null, tab: 'w', i: 0, flip: false };
  function studyItems() {
    if (SD.tab === 'x') return Object.keys(S.wrong).map(en => { for (const u of UNITS) { const w = u.words.find(x => x.en === en); if (w) return { ...w, unit: u.id }; } return null; }).filter(Boolean);
    const u = unitById(SD.unit);
    return SD.tab === 'w' ? u.words.map(w => ({ ...w, unit: u.id })) : u.sentences.map(s => ({ ...s, unit: u.id, sent: true }));
  }
  function renderStudy() {
    if (viewArg) { SD.unit = viewArg; SD.i = 0; SD.flip = false; viewArg = null; }
    if (!SD.unit || !isOpen(SD.unit)) SD.unit = currentUnit().id;
    const items = studyItems(); if (SD.i >= items.length) SD.i = 0;
    const it = items[SD.i];
    const u = unitById(SD.unit), rec = L.unitRec(S, SD.unit);
    const known = it && rec.known[it.en];
    const voiceNote = !TTS.ok ? '이 브라우저는 발음 듣기를 지원하지 않아요. 크롬이나 사파리 최신 버전을 사용해 보세요.' : !TTS.voice ? '영어 음성을 찾는 중이에요. 소리가 나지 않으면 기기 설정에서 영어 음성을 추가해 주세요.' : `발음: ${esc(TTS.voice.name)} (기기·브라우저마다 목소리가 달라요)`;
    main.innerHTML = `<div class="screen-title"><div><h2>영어 공부방</h2><p>카드를 누르면 뒤집혀요</p></div></div>
      <div class="unit-chips">${UNITS.map(x => `<button class="${x.id === SD.unit && SD.tab !== 'x' ? 'on' : ''}" data-act="sunit" data-v="${x.id}" ${isOpen(x.id) ? '' : 'disabled'}>${x.id}</button>`).join('')}</div>
      <div class="tabs"><button class="${SD.tab === 'w' ? 'on' : ''}" data-act="stab" data-v="w">단어</button><button class="${SD.tab === 's' ? 'on' : ''}" data-act="stab" data-v="s">문장</button><button class="${SD.tab === 'x' ? 'on' : ''}" data-act="stab" data-v="x">오답 노트 ${Object.keys(S.wrong).length || ''}</button></div>
      ${!it ? `<div class="glass" style="text-align:center;padding:28px;color:#fff">틀린 단어가 없어요! 🎉<br><span style="font-size:13px;color:#c9d6f0">퀴즈에서 틀리거나 "더 공부할래요"를 누른 단어가 여기에 모여요.</span></div>` : `
      <div class="flash-wrap"><div class="flash ${SD.flip ? 'flip' : ''}" id="flash" data-act="flip" role="button" tabindex="0" aria-label="카드 뒤집기">
        <div class="face"><div>${known ? '<span class="tag k">잘 외웠어요</span>' : ''}${it.p ? '<span class="tag" style="left:14px;right:auto;background:#e2efff;color:#1d4fa0">응용 문장</span>' : it.sent ? '<span class="tag" style="left:14px;right:auto;background:#fff2c2;color:#8a5a00">교과서 문장</span>' : ''}<span class="pic">${it.sent ? unitById(it.unit).icon : (it.e || '🍎')}</span><span class="word ${it.sent ? 's' : ''} en">${esc(it.en)}</span><span class="hint">${SD.tab === 'x' ? 'Lesson ' + it.unit + ' · ' : ''}눌러서 뜻 보기</span></div></div>
        <div class="face back"><div><span class="mean">${esc(it.ko)}</span><span class="word s en" style="font-size:22px;color:#4a5277">${esc(it.en)}</span><span class="hint">다시 누르면 앞면</span></div></div>
      </div></div>
      <div class="flash-nav"><button class="arrow" data-act="sprev" aria-label="이전">◀</button><span class="count">${SD.i + 1} / ${items.length}</span><button class="arrow" data-act="snext" aria-label="다음">▶</button></div>
      <div class="audio-row"><button class="btn" data-act="say1">🔊<small>듣기</small></button><button class="btn blue" data-act="say2">🐢<small>천천히</small></button><button class="btn ghost" data-act="say3">🔁<small>3번 반복</small></button></div>
      <div class="row-btns"><button class="btn green" data-act="known">😊 잘 외웠어요</button><button class="btn ghost" data-act="more">📖 더 공부할래요</button></div>`}
      <p class="voice-note">${voiceNote}</p>
      <div class="row-btns"><button class="btn" data-act="set" data-u="${u.id}" data-s="0">Lesson ${u.id} 퀴즈 도전 ▶</button></div>`;
  }

  /* 도감 */
  function renderDex() {
    const bossBadges = BOSSES.map(b => `<div class="badge ${S.bosses[b.id] ? '' : 'off'}"><span style="font-size:22px">${S.bosses[b.id] ? '🌳' : '🥀'}</span>${b.title}</div>`).join('');
    main.innerHTML = `<div class="screen-title"><div><h2>진화 도감</h2><p>한 번 얻은 카드는 퇴화해도 사라지지 않아요</p></div></div>
      <div class="dex">${[0, 1, 2].map(i => {
        const have = S.cards.includes(i);
        return `<button class="mini ${have ? THEME[i] : 'lock'}" data-act="zoom" data-v="${i}"><div><img src="${IMG[i]}" alt="${STAGES[i].name}"><b>${have ? STAGES[i].name : '???'}</b><small>No.${STAGES[i].no}</small></div></button>`;
      }).join('')}</div>
      <div class="section-h">배지</div><div class="badges">${bossBadges}<div class="badge ${S.badges.includes('legend') ? '' : 'off'}"><span style="font-size:22px">🏆</span>전설의 영어 모험가</div></div>
      <div class="section-h">다시 보기</div>
      <div class="row-btns"><button class="btn ghost" data-act="intro">🎬 숲속 인트로</button><button class="btn ghost" data-act="replayevo" ${S.cards.length > 1 ? '' : 'disabled'}>✨ 진화 장면</button></div>`;
  }
  function zoomCard(i) {
    const have = S.cards.includes(i);
    if (!have && !S.teacherPreview) { toast('아직 얻지 못한 카드예요. 진화하면 얻을 수 있어요!'); return; }
    const bg = document.createElement('div'); bg.className = 'zoom-bg';
    const d = S.cardAt[i] ? new Date(S.cardAt[i]) : null;
    bg.innerHTML = `<div class="zoom">${cardHTML(i, { mine: true })}</div><div class="zoom-meta">${d ? `획득일 ${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}` : '미리보기'} · 완료 단원 ${L.unitsDone(S)}개 · 누적 경험치 ${S.exp}<br>카드를 손가락으로 움직여 보세요 · 아무 곳이나 누르면 닫혀요</div>`;
    layer.append(bg);
    const card = bg.querySelector('.card');
    const tilt = e => { const r = card.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; if (!S.settings.reduceMotion) card.style.transform = `rotateY(${x * 22}deg) rotateX(${-y * 22}deg)`; };
    bg.addEventListener('pointermove', tilt);
    bg.addEventListener('click', () => bg.remove());
    AU.sparkle();
  }

  /* 나의 성장 */
  function renderMe() {
    const req = L.evoRequirements(S);
    const acc = S.stats.answered ? Math.round(S.stats.correct / S.stats.answered * 100) : 0;
    const mins = Math.round(S.stats.ms / 60000);
    const wrong = Object.entries(S.wrong).slice(0, 30);
    const tg = (k, label) => `<button class="tg" data-act="tog" data-v="${k}"><span>${label}</span><span class="sw ${S.settings[k] ? 'on' : ''}"></span></button>`;
    main.innerHTML = `<div class="screen-title"><div><h2>나의 성장</h2><p>${esc(S.name || '모험가')}의 영어 모험 기록</p></div></div>
      <div class="stats"><div class="stat"><small>레벨</small><b>${L.level(S.exp)}</b></div><div class="stat"><small>누적 경험치</small><b>${S.exp}<em>EXP</em></b></div>
      <div class="stat"><small>완료한 단원</small><b>${L.unitsDone(S)}<em>/ 11</em></b></div><div class="stat"><small>정답률</small><b>${acc}<em>%</em></b></div>
      <div class="stat"><small>학습 시간</small><b>${mins}<em>분</em></b></div><div class="stat"><small>연속 학습</small><b>${S.streak}<em>일</em></b></div></div>
      <div class="section-h">${req ? `${STAGES[S.maxStage + 1].name} 진화 조건` : '최종 성장'}</div>
      <div class="glass reqs">${req ? req.map(r => `<div class="req ${r.done ? 'done' : ''}"><i>${r.done ? '✓' : ''}</i>${r.label}<span>${Math.min(r.have, r.need)} / ${r.need}</span></div>`).join('') :
        `<div class="req ${L.unitsDone(S) >= 11 ? 'done' : ''}"><i>${L.unitsDone(S) >= 11 ? '✓' : ''}</i>11단원 완료<span>${L.unitsDone(S)} / 11</span></div><div class="req ${S.bosses[3] ? 'done' : ''}"><i>${S.bosses[3] ? '✓' : ''}</i>최종 보스전 성공<span>${S.bosses[3] ? 1 : 0} / 1</span></div>`}
        ${S.stage < S.maxStage ? `<button class="btn blue" data-act="review" style="margin-top:6px">🔁 복습으로 원래 모습 되찾기</button>` : L.canEvolve(S) ? `<button class="btn" data-act="evolve" style="margin-top:6px">✨ 지금 진화하기!</button>` : ''}</div>
      <div class="section-h">자주 틀리는 단어</div>
      ${wrong.length ? `<div class="wlist">${wrong.map(([en, w]) => `<span><b>${esc(en)}</b>${w.n}회</span>`).join('')}</div><div class="row-btns"><button class="btn blue" data-act="review">틀린 단어 복습하기</button></div>` : `<p style="color:#c9d6f0;font-size:13.5px;margin:0">아직 없어요. 멋져요!</p>`}
      <div class="section-h">설정</div>
      <div class="toggles">${tg('sound', '효과음')}${tg('music', '배경음악')}${tg('slowVoice', '발음 기본 속도 느리게')}${tg('reduceMotion', '화면 흔들림·번쩍임 줄이기')}</div>
      <button class="link" data-act="rename">이름 바꾸기 · 현재: ${esc(S.name || '모험가')}</button>
      <button class="link" data-act="teacher" style="margin-top:8px">🔒 선생님 관리실</button>
      <p class="voice-note">기록은 지금 이 기기의 브라우저에 저장돼요. 학급 서버 저장은 다음 개발 단계에서 연결됩니다.</p>`;
  }

  /* 사과숲 */
  let forestT = null;
  function stopForest() { clearInterval(forestT); forestT = null; }
  function decorHTML(d) {
    if (d.key === 'pond') return '<div class="pond"></div>';
    if (d.key === 'goldtree') return `<svg viewBox="0 0 60 70" width="64" aria-hidden="true"><rect x="26" y="40" width="8" height="30" rx="3" fill="#7a4a2a"/><circle cx="30" cy="28" r="22" fill="#ffd45c"/><circle cx="18" cy="34" r="12" fill="#f0b21a"/><circle cx="42" cy="34" r="12" fill="#f0b21a"/><circle cx="24" cy="22" r="4" fill="#fff6a0"/><circle cx="38" cy="30" r="4" fill="#fff6a0"/><circle cx="30" cy="40" r="4" fill="#fff6a0"/></svg>`;
    return d.e;
  }
  function renderForest() {
    const unlocked = DECOR.filter(d => S.units[d.unit] && S.units[d.unit].done);
    const placed = DECOR.filter(d => S.forest[d.key] && unlocked.includes(d));
    main.innerHTML = `<div class="screen-title"><button class="back" data-act="go" data-v="home" aria-label="뒤로">←</button><div><h2>${esc(S.name || '나')}의 사과숲</h2><p>장식을 눌러 놓고, 끌어서 옮겨요</p></div></div>
      <div class="forest" id="forest"><div class="hill"></div><div class="bgtree" style="left:6%"></div><div class="bgtree" style="right:8%;top:22%;width:18%"></div>
        <svg class="maintree" viewBox="0 0 120 130" aria-hidden="true"><rect x="52" y="70" width="16" height="60" rx="5" fill="#7a4a2a"/><circle cx="60" cy="48" r="40" fill="#3fae5a"/><circle cx="32" cy="62" r="22" fill="#4cbf5e"/><circle cx="88" cy="62" r="22" fill="#4cbf5e"/>${[[44, 40], [72, 34], [60, 62], [30, 66], [90, 64]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="#e2453a"/>`).join('')}</svg>
        ${placed.map(d => `<div class="item ${['flowers', 'garden', 'mushroom'].includes(d.key) ? 'sway' : ''}" data-k="${d.key}" style="left:${S.forest[d.key].x}%;top:${S.forest[d.key].y}%">${decorHTML(d)}</div>`).join('')}
        <div class="walker" id="walker" style="left:50%;top:82%"><img src="${IMG[S.stage]}" alt="${STAGES[S.stage].name}"></div>
      </div>
      <div class="tray">${DECOR.map(d => { const u = unlocked.includes(d); const p = !!S.forest[d.key] && u; return `<button class="slot ${u ? '' : 'lock'} ${p ? 'placed' : ''}" data-act="decor" data-v="${d.key}"><span>${u ? (d.e || (d.key === 'pond' ? '💧' : '🌟')) : '🔒'}</span>${d.name}<br><small>${u ? (p ? '놓았어요 · 누르면 치우기' : '눌러서 놓기') : d.unit + '단원 완료'}</small></button>`; }).join('')}</div>`;
    bindForest();
    const w = $('#walker');
    const wander = () => { if (!w.isConnected) return stopForest(); const x = 12 + Math.random() * 76, y = 66 + Math.random() * 26; w.classList.toggle('flipx', x < parseFloat(w.style.left)); w.style.left = x + '%'; w.style.top = y + '%'; };
    if (!S.settings.reduceMotion) { forestT = setInterval(wander, 3600); setTimeout(wander, 400); }
  }
  function bindForest() {
    const f = $('#forest'); let drag = null, moved = false, sx = 0, sy = 0;
    f.addEventListener('pointerdown', e => {
      const it = e.target.closest('.item'); if (!it) return;
      drag = it; moved = false; sx = e.clientX; sy = e.clientY; it.setPointerCapture(e.pointerId); it.classList.add('drag');
    });
    f.addEventListener('pointermove', e => {
      if (!drag) return; if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 6) moved = true;
      const r = f.getBoundingClientRect();
      const x = Math.max(6, Math.min(94, (e.clientX - r.left) / r.width * 100)), y = Math.max(30, Math.min(98, (e.clientY - r.top) / r.height * 100));
      drag.style.left = x + '%'; drag.style.top = y + '%';
    });
    const up = () => {
      if (!drag) return; drag.classList.remove('drag');
      const k = drag.dataset.k; S.forest[k] = { x: parseFloat(drag.style.left), y: parseFloat(drag.style.top) }; save();
      if (!moved) AU.sparkle();
      drag = null;
    };
    f.addEventListener('pointerup', up); f.addEventListener('pointercancel', up);
    $('#walker').addEventListener('click', () => {
      const w = $('#walker'); const s = learnedSentences(); const line = s[Math.floor(Math.random() * s.length)];
      const old = w.querySelector('.bubble'); if (old) old.remove();
      const b = document.createElement('div'); b.className = 'bubble'; b.innerHTML = `<span class="en">${esc(line.en)}</span>${esc(line.ko)}`; w.append(b);
      setTimeout(() => b.remove(), 2600); speak(line.en); AU.tap();
    });
  }

  /* 선생님 관리실 (이 기기 전용 미리보기 버전) */
  function renderTeacher() {
    const r = S.rules;
    const num = (path, label, min = 1, max = 999) => `<div class="rowf"><span>${label}</span><input type="number" id="r-${path}" data-path="${path}" min="${min}" max="${max}" value="${path.split('.').reduce((o, k) => o[k], r)}"></div>`;
    const tg = (k, label) => `<button class="tg" data-act="rtog" data-v="${k}" style="padding-left:0;background:none"><span>${label}</span><span class="sw ${r[k] ? 'on' : ''}"></span></button>`;
    main.innerHTML = `<div class="screen-title"><button class="back" data-act="go" data-v="me" aria-label="뒤로">←</button><div><h2>선생님 관리실</h2><p>이 기기 미리보기 버전 · 학급 서버 연결 전</p></div></div>
      <div class="teacher">
      <div class="section-h">학습 가능 단원</div><div class="glass"><div class="ugrid">${UNITS.map(u => `<button class="${r.openUnits.includes(u.id) ? 'on' : ''}" data-act="uopen" data-v="${u.id}">${u.id}</button>`).join('')}</div></div>
      <div class="section-h">경험치·진화 규칙</div><div class="glass">
        ${num('expBasic', '기본 퀴즈 정답 경험치')}${num('expReview', '복습·보스 정답 경험치')}
        ${num('evo1.exp', '애플왕 진화: 누적 경험치')}${num('evo1.units', '애플왕 진화: 완료 단원 수', 1, 11)}
        ${num('evo2.exp', '애플대왕 진화: 누적 경험치')}${num('evo2.units', '애플대왕 진화: 완료 단원 수', 1, 11)}
        ${num('setPass', '세트 통과 정답 수 (5문제 중)', 1, 5)}${num('bossPass', '보스전 성공 정답 수 (10문제 중)', 1, 10)}</div>
      <div class="section-h">퇴화 규칙</div><div class="glass">${tg('decayOn', '미접속 퇴화 사용')}${tg('pauseWeekends', '주말에는 퇴화 타이머 멈춤')}
        ${num('decayEnergyDays', '에너지 감소 시작 (일)')}${num('decayStageDays', '1단계 하락 (일)')}${num('decayBaseDays', '풋애플까지 하락 (일)')}</div>
      <div class="section-h">미리보기</div>
      <div class="row-btns" style="margin-top:0">${[0, 1, 2].map(i => `<button class="btn ghost" data-act="tzoom" data-v="${i}">${STAGES[i].name}</button>`).join('')}</div>
      <div class="glass" style="margin-top:10px"><ol class="qprev">${UNITS.map(u => `<li><b>${u.id}. ${esc(u.title)}</b><br>${u.words.map(w => esc(w.en) + '(' + esc(w.ko) + ')').join(', ')}<br><i>${u.sentences.map(s => esc(s.en)).join(' / ')}</i></li>`).join('')}</ol></div>
      <div class="section-h">학습 기록</div>
      <div class="glass" style="font-size:13.5px;line-height:1.6;color:#d6e0f5">${UNITS.map(u => { const x = S.units[u.id]; return `${u.id}단원: ${x ? (x.done ? '완료' : '진행 중') + ` · 정답률 ${x.n ? Math.round(x.ok / x.n * 100) : 0}%` : '시작 전'}`; }).join('<br>')}</div>
      <div class="row-btns"><button class="btn ghost" data-act="csv">📋 기록 CSV 복사</button><button class="btn ghost" data-act="pin">🔑 비밀번호 변경</button></div>
      <div class="row-btns"><button class="btn" style="background:linear-gradient(180deg,#ffd0c0,#ef6a4a);color:#fff" data-act="resetask">이 기기 학습 기록 초기화</button></div>
      <p class="voice-note">다음 단계(학급 서버)에서는 학급 코드, 학생 계정, 반 전체 현황표, 엑셀 다운로드, 학습 자료 업로드·검토가 여기에 추가됩니다.</p></div>`;
    main.querySelectorAll('input[data-path]').forEach(inp => inp.addEventListener('change', () => {
      const v = Math.max(+inp.min, Math.min(+inp.max, Math.round(+inp.value || 0))); inp.value = v;
      const ks = inp.dataset.path.split('.'); let o = S.rules; while (ks.length > 1) o = o[ks.shift()]; o[ks[0]] = v; save(); toast('저장했어요');
    }));
  }

  /* ---------- 이벤트 ---------- */
  const ACT = {
    go: d => { AU.tap(); if (d.v === 'study' && d.u) return go('study', +d.u); closeSheet(); go(d.v); },
    pet: () => { AU.tap(); const m = PET[Math.floor(Math.random() * PET.length)]; setMood('greet'); const s = learnedSentences(); if (Math.random() < .5 && s.length) { const l = s[Math.floor(Math.random() * s.length)]; say(l.ko, l.en); speak(l.en); } else say(m); },
    set: d => { AU.tap(); startSet(+d.u, +d.s); },
    review: () => { AU.tap(); startReview(); },
    boss: d => { AU.tap(); startBoss(+d.v); },
    bossinfo: d => { AU.tap(); bossSheet(+d.v); },
    unit: d => { AU.tap(); unitSheet(+d.v); },
    endquiz: () => { Q = null; go('home'); },
    lprev: () => shiftLesson(-1),
    lnext: () => shiftLesson(1),
    evolve: () => doEvolve(),
    replayevo: () => { const t = Math.max(...S.cards); playEvolution(t - 1, t, true); },
    intro: () => { AU.tap(); playIntro(() => render()); },
    closeSheet: () => closeSheet(),
    speakq: () => { const q = Q && Q.list[Q.i]; if (q) speak(q.speak); },
    speakslow: () => { const q = Q && Q.list[Q.i]; if (q) speak(q.speak, .55); },
    pick: (d, el) => {
      if (!Q || Q.phase !== 'ask') return;
      const q = Q.list[Q.i]; const val = q.options[+d.v]; const ok = L.checkAnswer(q, val);
      const btns = el.parentElement.querySelectorAll('[data-act=pick]');
      btns.forEach(b => { const i = +b.dataset.v; if (q.options[i] === q.answer) b.classList.add('right'); else if (b !== el) b.classList.add('dim'); });
      el.classList.add(ok ? 'right' : 'wrong');
      handle(ok);
    },
    retry: () => { Q.phase = 'ask'; Q.order = null; Q.match = null; const q = Q.list[Q.i]; if (q.options) q.options = L.shuffle(q.options, Math.random); renderPanel(); },
    next: () => { AU.tap(); nextQ(); },
    tile: d => {
      if (!Q || Q.phase !== 'ask') return; AU.tap();
      Q.order = Q.order || []; Q.order.push(+d.v);
      const q = Q.list[Q.i];
      if (Q.order.length === q.tiles.length) {
        const ok = L.checkAnswer(q, Q.order.map(k => q.tiles[k]).join(' '));
        renderPanelKeepFb(); handle(ok);
      } else renderPanelKeepFb();
    },
    untile: d => { if (!Q || Q.phase !== 'ask') return; Q.order.splice(+d.v, 1); renderPanelKeepFb(); },
    ml: d => { if (!Q || Q.phase !== 'ask') return; AU.tap(); Q.match.sel = d.v; renderPanelKeepFb(); speak(d.v); },
    mr: (d, el) => {
      if (!Q || Q.phase !== 'ask') return; const M = Q.match, q = Q.list[Q.i];
      if (!M.sel) { toast('먼저 왼쪽 영어 단어를 눌러요'); return; }
      const pair = q.pairs.find(p => p.en === M.sel);
      if (pair.ko === d.v) { M.done.push(M.sel); M.sel = null; AU.sparkle(); renderPanelKeepFb(); if (M.done.length === q.pairs.length) handle(M.miss === 0); }
      else { M.miss++; AU.bad(); el.classList.add('bad'); setTimeout(() => el.classList.remove('bad'), 400); }
    },
    smatch: (d, el) => {
      if (!Q || Q.phase !== 'ask') return; const q = Q.list[Q.i], M = Q.match;
      const pair = q.pairs.find(p => p.ko === q.right[M.k]);
      if (pair.en === d.v) { M.done.push(d.v); M.k++; AU.sparkle(); speak(d.v); if (M.k >= 4) { renderStageQ(); handle(M.miss === 0); } else renderStageQ(); }
      else { M.miss++; AU.bad(); el.classList.add('wrong'); setTimeout(() => el.classList.remove('wrong'), 400); }
    },
    flip: () => { SD.flip = !SD.flip; $('#flash').classList.toggle('flip', SD.flip); AU.tap(); if (SD.flip) { const it = studyItems()[SD.i]; it && speak(it.en); } },
    sprev: () => { const n = studyItems().length; SD.i = (SD.i - 1 + n) % n; SD.flip = false; renderStudy(); },
    snext: () => { const n = studyItems().length; SD.i = (SD.i + 1) % n; SD.flip = false; renderStudy(); },
    sunit: d => { SD.unit = +d.v; SD.i = 0; SD.flip = false; if (SD.tab === 'x') SD.tab = 'w'; renderStudy(); },
    stab: d => { SD.tab = d.v; SD.i = 0; SD.flip = false; renderStudy(); },
    say1: () => { const it = studyItems()[SD.i]; it && speak(it.en); },
    say2: () => { const it = studyItems()[SD.i]; it && speak(it.en, .55); },
    say3: () => { const it = studyItems()[SD.i]; it && speak(it.en, .8, 3); },
    known: () => { const it = studyItems()[SD.i]; if (!it) return; L.unitRec(S, it.unit).known[it.en] = 1; if (!it.sent) { delete S.wrong[it.en]; S.mastered[it.en] = 1; } S.lastStudy = now(); save(); AU.good(); toast('😊 잘 외웠어요!', 1200); const n = studyItems().length; if (SD.tab !== 'x') SD.i = (SD.i + 1) % n; SD.flip = false; renderStudy(); },
    more: () => { const it = studyItems()[SD.i]; if (!it) return; delete L.unitRec(S, it.unit).known[it.en]; if (!it.sent) S.wrong[it.en] = { n: (S.wrong[it.en] && S.wrong[it.en].n) || 1, unit: it.unit }; S.lastStudy = now(); save(); toast('📖 오답 노트에 담았어요. 복습 퀴즈에 나와요!', 1600); SD.i = (SD.i + 1) % studyItems().length; SD.flip = false; renderStudy(); },
    zoom: d => zoomCard(+d.v),
    tzoom: d => { S.teacherPreview = true; zoomCard(+d.v); S.teacherPreview = false; },
    tog: d => { S.settings[d.v] = !S.settings[d.v]; save(); applySettings(); if (d.v === 'music') AU.bgm(S.settings.music); renderMe(); },
    rtog: d => { S.rules[d.v] = !S.rules[d.v]; save(); renderTeacher(); },
    uopen: d => { const id = +d.v, a = S.rules.openUnits; const k = a.indexOf(id); if (k >= 0) a.splice(k, 1); else a.push(id); a.sort((x, y) => x - y); save(); renderTeacher(); },
    decor: d => {
      const dd = DECOR.find(x => x.key === d.v);
      if (!(S.units[dd.unit] && S.units[dd.unit].done)) { toast(`${dd.unit}단원을 완료하면 ${dd.name}을(를) 얻어요!`); return; }
      if (S.forest[dd.key]) delete S.forest[dd.key]; else { S.forest[dd.key] = { x: 20 + Math.random() * 60, y: 60 + Math.random() * 30 }; AU.sparkle(); }
      save(); renderForest();
    },
    teacher: () => openSheet(`<button class="close" data-act="closeSheet" aria-label="닫기">✕</button><h3>🔒 선생님 관리실</h3><p class="sub">비밀번호를 입력해 주세요. (처음 비밀번호: 1234 — 들어가서 꼭 바꿔 주세요)</p>
      <form id="pinform"><input class="field" id="pin-in" type="password" inputmode="numeric" autocomplete="off" aria-label="비밀번호"><div class="row-btns"><button class="btn" type="submit">들어가기</button></div></form>`),
    pin: () => openSheet(`<button class="close" data-act="closeSheet" aria-label="닫기">✕</button><h3>비밀번호 변경</h3><form id="newpin"><input class="field" id="pin-new" inputmode="numeric" placeholder="새 비밀번호 (4자리 이상)" aria-label="새 비밀번호"><div class="row-btns"><button class="btn" type="submit">저장</button></div></form>`),
    rename: () => nameSheet(),
    csv: () => {
      const rows = [['이름', '단원', '상태', '정답', '문항', '정답률']].concat(UNITS.map(u => { const x = S.units[u.id]; return [S.name, u.id, x ? (x.done ? '완료' : '진행') : '시작 전', x ? x.ok : 0, x ? x.n : 0, x && x.n ? Math.round(x.ok / x.n * 100) + '%' : '']; }));
      const text = rows.map(r => r.join(',')).join('\n');
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast('복사했어요! 엑셀에 붙여넣기 하세요.')).catch(() => showText(text)); else showText(text);
    },
    resetask: () => openSheet(`<h3>정말 초기화할까요?</h3><p class="sub">이 기기의 경험치, 단원 기록, 카드, 사과숲이 모두 지워져요. 되돌릴 수 없어요.</p><div class="row-btns"><button class="btn ghost" data-act="closeSheet">취소</button><button class="btn" style="background:linear-gradient(180deg,#ffd0c0,#ef6a4a);color:#fff" data-act="reset">초기화</button></div>`),
    reset: () => { const pin = S.pin, rules = S.rules; S = migrate({}); S.pin = pin; S.rules = rules; S.createdAt = now(); S.cardAt[0] = now(); S.introSeen = true; Q = null; save(); closeSheet(); toast('초기화했어요'); nameSheet(); },
  };
  function showText(t) { openSheet(`<button class="close" data-act="closeSheet">✕</button><h3>아래 내용을 길게 눌러 복사하세요</h3><textarea class="field" id="csv-out" style="height:200px;font-size:13px" readonly>${esc(t)}</textarea>`); }
  function renderPanelKeepFb() { renderPanel(); }
  function nameSheet(after) {
    openSheet(`<h3>모험가 이름을 정해 주세요</h3><p class="sub">진짜 이름 대신 별명도 좋아요. (최대 10글자)</p>
      <form id="nameform"><input class="field" id="name-in" maxlength="10" value="${esc(S.name || '')}" placeholder="예: 사과용사" autocomplete="off" aria-label="이름"><div class="row-btns"><button class="btn" type="submit">좋아요!</button></div></form>`);
    setTimeout(() => { const i = $('#name-in'); i && i.focus(); }, 300);
    nameSheet.after = after;
  }
  document.addEventListener('submit', e => {
    e.preventDefault();
    if (e.target.id === 'nameform') { S.name = ($('#name-in').value || '').trim().slice(0, 10) || '모험가'; save(); closeSheet(); render(); const a = nameSheet.after; nameSheet.after = null; a && a(); }
    if (e.target.id === 'pinform') { if ($('#pin-in').value === S.pin) { closeSheet(); go('teacher'); } else toast('비밀번호가 달라요'); }
    if (e.target.id === 'newpin') { const v = $('#pin-new').value.trim(); if (v.length < 4) return toast('4자리 이상으로 정해 주세요'); S.pin = v; save(); closeSheet(); toast('비밀번호를 바꿨어요'); }
  });
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-act]'); if (!t || t.disabled) return;
    const fn = ACT[t.dataset.act]; if (fn) { e.preventDefault(); fn(t.dataset, t); }
  });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.id === 'flash') { e.preventDefault(); ACT.flip(); } });
  document.addEventListener('click', e => { const p = e.target.closest('[data-tip]'); if (p) toast(p.dataset.tip); });

  /* 학습 시간 측정 */
  setInterval(() => { if (!document.hidden && (view === 'study' || ((view === 'play' || view === 'home' || view === 'boss') && Q))) { S.stats.ms += 5000; save(); } }, 5000);

  /* ---------- 시작 ---------- */
  function afterGate() {
    const t = now();
    const away = S.lastSeen ? L.inactiveDays(S.lastSeen, t, false) : 0;
    const dec = L.applyDecay(S, t);
    S.lastSeen = t; save();
    go('home');
    if (dec.stageAfter < dec.stageBefore) {
      openSheet(`<h3>😴 ${STAGES[dec.stageBefore].name}이 조금 지쳤어요</h3><p class="sub">${dec.days}일 동안 기다리다가 잠시 <b>${STAGES[S.stage].name}</b> 모습이 되었어요.<br>학습 기록, 경험치, 카드, 사과숲은 모두 그대로예요!<br>복습 퀴즈를 ${S.rules.setPass}문제 이상 맞히면 바로 원래 모습으로 돌아와요.</p>
        <div class="row-btns"><button class="btn blue" data-act="review">🔁 복습 퀴즈 시작</button><button class="btn ghost" data-act="closeSheet">나중에</button></div>`);
    } else if (away >= 3) setTimeout(() => { setMood('greet', 1800); say('보고 싶었어! 다시 와 줘서 고마워!'); }, 600);
    else setTimeout(() => { setMood('happy'); say(`${S.name || '친구'}, 안녕! 오늘도 같이 공부하자!`); }, 600);
  }
  function boot() {
    const t = document.createElement('div'); t.className = 'title';
    const returning = S.name && S.introSeen;
    t.style.setProperty('--tbg', `url(${AQ_TITLE})`);
    t.innerHTML = `<div class="frame916"><div class="title-bg" style="background-image:url(${AQ_TITLE})"></div><div class="title-shade"></div>
      ${Array.from({ length: 12 }, (_, k) => `<i class="tspark" style="left:${(k * 37) % 100}%;top:${40 + (k * 53) % 55}%;animation-delay:${(k % 6) * .5}s"></i>`).join('')}
      <div class="title-bottom">
        ${returning ? `<p class="title-hello">${esc(S.name)}의 ${STAGES[S.stage].name}이 기다리고 있어요!</p>` : ''}
        <button class="startgame" data-t="start"><span>게임 시작하기</span></button>
        <button class="title-sound" data-t="sound">${S.settings.sound ? '🔊 소리 켜짐' : '🔇 소리 꺼짐'}</button>
      </div></div>`;
    layer.append(t);
    const proceed = () => { AU.bgm(true); if (!S.name) { go('home'); nameSheet(afterGate); } else afterGate(); };
    t.addEventListener('click', e => {
      const b = e.target.closest('[data-t]'); if (!b) return;
      AU.init(); AU.tap();
      if (b.dataset.t === 'sound') { S.settings.sound = !S.settings.sound; S.settings.music = S.settings.sound; save(); b.textContent = S.settings.sound ? '🔊 소리 켜짐' : '🔇 소리 꺼짐'; return; }
      t.remove();
      playIntro(proceed); // 게임 시작하기 → 언제나 인트로 영상부터
    });
  }
  window.__AQ = { get S() { return S; }, set S(v) { S = v; }, go, ACT, playEvolution, playIntro, L, render, save, get Q() { return Q; } };
  boot();
})();
