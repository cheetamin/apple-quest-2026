/* 애플왕의 진화 모험 — 화면과 상호작용 */
(function () {
  'use strict';
  const { STAGES, DECOR, BOSSES: BASE_BOSSES, DEFAULT_RULES, SURVEY, CREATOR } = AQ_DATA;
  const { COURSES, ALL_UNITS } = AQ_COURSES;
  let UNITS = COURSES[COURSES.length - 1].units, BOSSES = BASE_BOSSES, COURSE = COURSES[COURSES.length - 1];
  function setCourse(key) { // 교재 바꾸기: 단원·보스전 범위를 그 교재 것으로
    COURSE = COURSES.find(c => c.key === key) || COURSES[COURSES.length - 1];
    UNITS = COURSE.units;
    BOSSES = BASE_BOSSES.map(b => ({ ...b, afterUnit: UNITS[b.afterUnit - 1].id, range: b.range.map(i => UNITS[i - 1].id) }));
  }
  const unitNo = id => { const u = ALL_UNITS.find(x => x.id === id); return u ? u.no : id; };
  const decorDone = d => COURSES.some(c => { const u = c.units[d.unit - 1]; return u && S.units[u.id] && S.units[u.id].done; });
  /* SHA-256 (비밀번호 확인용, 외부 라이브러리 없이) */
  function sha256(str) {
    const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const bytes = Array.from(new TextEncoder().encode(str)); const l = bytes.length * 8;
    bytes.push(0x80); while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i > 3 ? 0 : (l >>> (i * 8)) & 0xff);
    let H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const r = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < bytes.length; o += 64) {
      const w = []; for (let i = 0; i < 16; i++) w[i] = (bytes[o + i * 4] << 24) | (bytes[o + i * 4 + 1] << 16) | (bytes[o + i * 4 + 2] << 8) | bytes[o + i * 4 + 3];
      for (let i = 16; i < 64; i++) { const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) { const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0; h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0; }
      H = H.map((x, i) => (x + [a, b, c, d, e, f, g, h][i]) | 0);
    }
    return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
  }
  let adminOK = false;
  const L = AQ_LOGIC;
  const IMG = AQ_IMG;
  const KEY = 'aq-apple-quest-v1';
  const $ = s => document.querySelector(s);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let clockOffset = 0; // 서버 시간과의 차이(기기 시계를 바꿔도 퇴화 판정이 흔들리지 않게)
  const now = () => Date.now() + clockOffset;
  const main = $('#main'), layer = $('#layer');

  /* ---------- 저장 ---------- */
  function migrate(o) {
    const base = L.newState(DEFAULT_RULES);
    const s = Object.assign(base, o);
    s.rules = Object.assign(JSON.parse(JSON.stringify(DEFAULT_RULES)), o.rules || {});
    if ((s.rules.v || 1) < DEFAULT_RULES.v) { // 규칙 업데이트(진화 더 어렵게 · 하루 빠지면 한 단계 전으로)
      for (const k of ['v', 'evo1', 'evo2', 'decayEnergyDays', 'decayStageDays', 'decayBaseDays']) s.rules[k] = JSON.parse(JSON.stringify(DEFAULT_RULES[k]));
    }
    if (o.coins == null && o.exp) s.coins = Math.floor(o.exp / 5); // 기존 학생: 지금까지 쌓은 경험치만큼 사과로 시작
    if (o.studyDays == null && o.lastStudy) { s.studyDays = Math.max(1, o.streak || 1); s.lastStudyDay = o.lastDay || ''; }
    s.owned = s.owned || []; s.wear = s.wear || {};
    if (o.full == null) { s.full = 80; s.fullAt = 0; } s.town = s.town || {}; s.house = s.house || 0; s.love = s.love || 0;
    s.settings = Object.assign(L.newState(DEFAULT_RULES).settings, o.settings || {});
    s.mastered = s.mastered || {}; s.streak = s.streak || 0; s.sentOK = s.sentOK || 0;
    s.cardAt = s.cardAt || {}; s.pin = s.pin || '1234';
    if (!s.course && o.units && Object.keys(o.units).some(k => +k < 100)) s.course = 'cj4'; // 기존 기록은 천재(이) 4학년
    return s;
  }
  function load() { try { const t = localStorage.getItem(KEY); if (t) return migrate(JSON.parse(t)); } catch (e) {} return migrate({}); }
  let saveT, cloudDirty = false; function save() { cloudDirty = true; clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }, 120); }
  let S = load();
  if (!S.createdAt) { S.createdAt = now(); S.cardAt[0] = now(); }
  setCourse(S.course);

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
  let quietToastAt = 0;
  function quietify() { if (Q) Q.coins0 = S.coins || 0; if (Q && S.settings.quiet) Q.list = Q.list.map(L.silentQ); }
  function speak(text, rate, times = 1) {
    if (S.settings.quiet) { if (Date.now() - quietToastAt > 4000) { quietToastAt = Date.now(); toast('🔇 조용한 교실 모드라 소리가 꺼져 있어요 · 설정에서 끌 수 있어요', 2200); } return; }
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
  { const li = document.getElementById('logoImg'); if (li) li.src = AQ_LOGO; }
  { const bg = document.getElementById('bgimg'); if (bg) bg.style.backgroundImage = `url(${AQ_TPL})`; }

  const unitById = id => ALL_UNITS.find(u => u.id === id);
  const isOpen = id => S.rules.openUnits.includes(unitNo(id));
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
    $('#pEnergy').textContent = S.energy; $('#pFruit').textContent = S.fruits; $('#pExp').textContent = S.coins || 0;
    const ep = L.expProgress(S);
    const f = $('#expFill'); if (f) f.style.width = ep.pct + '%';
    const t = $('#expTxt'); if (t) t.textContent = ep.to ? `${S.exp} / ${ep.to}` : `${S.exp} MAX`;
    const lv = $('#lvTxt'); if (lv) lv.textContent = 'Lv.' + L.level(S.exp);
    const hp = $('#hpTxt'); if (hp) hp.textContent = S.energy;
    [['sEnergy', S.energy], ['sExp', S.coins || 0], ['sFruit', S.fruits]].forEach(([id, v]) => { const e = document.getElementById(id); if (e) e.textContent = v; });
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
          <div class="mascot ${sleepy ? 'mood-sleepy' : ''}" ${live ? 'id="mascot" data-act="pet"' : ''}>${live ? SHOP.dressed(i, IMG[i], S.wear, st.name) : `<img src="${IMG[i]}" alt="${st.name}" draggable="false">`}</div>
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
    Q = { mode: 'set', unit: unitId, setIdx, list: L.buildSet(UNITS, unitId, setIdx, now() & 0xffff), i: 0, results: [], combo: 0, first: true, phase: 'ask' }; quietify();
    closeSheet(); go('play');
  }
  function startReview() {
    let ids = L.doneIds(S);
    const wrongUnits = [...new Set(Object.values(S.wrong).map(w => w.unit))];
    ids = [...new Set(ids.concat(wrongUnits))].filter(id => isOpen(id) && UNITS.some(u => u.id === id));
    if (!ids.length) ids = [currentUnit().id];
    Q = { mode: 'review', units: ids, list: L.buildMixed(UNITS, ids, S.rules.reviewLen, now() & 0xffff, 'review', S.wrong), i: 0, results: [], combo: 0, first: true, phase: 'ask' }; quietify();
    closeSheet(); go('play');
    setTimeout(() => { setMood('cheer'); say('복습하면 더 튼튼해져! 힘내!'); }, 300);
  }
  function startBoss(id) {
    const b = BOSSES.find(x => x.id === id);
    if (!L.bossOpen(S, b)) { toast(`${unitNo(b.afterUnit)}단원을 완료하면 열려요.`); return; }
    Q = { mode: 'boss', boss: id, list: L.buildMixed(UNITS, b.range, S.rules.bossLen, now() & 0xffff, 'boss'), i: 0, results: [], combo: 0, first: true, phase: 'ask' }; quietify();
    closeSheet(); go('boss');
  }

  const LETTERS = 'ABCD';
  function qtopHTML() {
    let tag, dots = '', label;
    if (Q.mode === 'set') {
      const u = S.units[Q.unit]; const off = Q.setIdx * 5;
      tag = `<span class="lesson">Lesson ${unitNo(Q.unit)}</span>`;
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
    const listen = `<div class="listen"><button class="spk" data-act="speakq" aria-label="듣기">🔊</button><button class="spk slow" data-act="speakslow" aria-label="천천히 듣기">🐢</button>눌러서 다시 들어요</div><button class="mute-btn" data-act="mute">🔇 소리를 켤 수 없어요 → 읽기 문제로 풀기</button>`;
    switch (q.type) {
      case 'pic': return `<div class="qshow banner"><span class="pic">${q.show}</span></div>${opts(q.options)}`;
      case 'ko2en': return `<div class="qshow banner"><span class="ko">${esc(q.show)}</span></div>${opts(q.options)}`;
      case 'en2ko': return `<div class="qshow banner"><span class="sent">${esc(q.show)}</span>${q.item && q.item.e ? `<span class="side-pic">${q.item.e}</span>` : ''}</div>${opts(q.options, true)}`;
      case 'listen': return `<div class="qshow banner">${listen}</div>${opts(q.options)}`;
      case 'listenSent': return `<div class="qshow banner">${listen}</div>${opts(q.options, false, true)}`;
      case 'ko2sent': return `<div class="qshow banner"><span class="ko" style="font-size:22px">${esc(q.show)}</span></div>${opts(q.options, false, true)}`;
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
    return `<div class="qtop"><span class="lesson">Lesson ${u.no}</span><div class="dots">${[0, 1].map(k => `<i class="${rec && rec.sets[k] ? 'ok' : ''}"></i>`).join('')}<b>세트 ${rec ? rec.sets.filter(Boolean).length : 0} / 2</b></div></div>
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
      title = R.passed ? (R.newlyDone ? `${unitNo(Q.unit)}단원 완료!` : `세트 ${Q.setIdx + 1} 통과!`) : '조금만 더 해 볼까?';
      sub = R.passed ? `${R.ok} / ${R.n} 정답 · 경험치 +${R.gain}${R.coins ? ` · 🍎 +${R.coins}` : ''}` : `${S.rules.setPass}문제 이상 맞히면 통과예요. (${R.ok} / ${R.n})`;
      if (R.newlyDone) sub += `<br>🍎 성장 열매 +1${R.decor ? ` · 🎁 ${R.decor} 해금` : ''}`;
      if (R.boss) sub += `<br>🌳 ${R.boss} 보스전이 열렸어요!`;
      const other = rec.sets[0] && !rec.sets[1] ? 1 : !rec.sets[0] ? 0 : null;
      if (!R.passed) btns += `<button class="btn" data-act="set" data-u="${Q.unit}" data-s="${Q.setIdx}">다시 도전</button>`;
      else if (other !== null) btns += `<button class="btn" data-act="set" data-u="${Q.unit}" data-s="${other}">다음 세트 ▶</button>`;
      else { const nu = currentUnit(); if (nu.id !== Q.unit) btns += `<button class="btn" data-act="set" data-u="${nu.id}" data-s="0">Lesson ${nu.no} ▶</button>`; }
    } else if (Q.mode === 'review') {
      title = R.recovered ? '원래 모습으로 돌아왔어요!' : R.ok >= S.rules.setPass ? '복습 완료!' : '복습 한 번 더?';
      sub = `${R.ok} / ${R.n} 정답 · 경험치 +${R.gain}${R.coins ? ` · 🍎 +${R.coins}` : ''}`;
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
        if (['blank', 'order', 'listenSent', 'ko2sent'].includes(q.type)) S.sentOK++;
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
        const d = DECOR.find(x => x.unit === unitNo(Q.unit)); R.decor = d && d.name;
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
    R.coins = Math.max(0, (S.coins || 0) - (Q.coins0 || 0));
    Q.summary = R; Q.phase = 'result';
    save(); cloudFlush();
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
    S.cardAt[S.stage] = now(); save(); cloudFlush();
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
  const NAVMAP = { home: 'home', play: 'quiz', units: 'units', study: 'study', quiz: 'quiz', dex: 'dex', me: 'me', forest: 'home', shop: 'me', village: 'home', boss: 'units', teacher: 'me', tch: 'me' };
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
    ({ home: renderHome, play: renderHome, units: renderUnits, study: renderStudy, quiz: renderQuizHub, dex: renderDex, me: renderMe, forest: renderForest, shop: renderShop, village: renderVillage, boss: renderBoss, teacher: renderTeacher, tch: renderTeach }[view] || renderHome)();
    updateHUD();
  }
  function autoQ(unitId) {
    const u = unitById(unitId || currentUnit().id); const rec = S.units[u.id];
    const si = rec && rec.sets[0] && !rec.sets[1] ? 1 : 0;
    Q = { mode: 'set', unit: u.id, setIdx: si, list: L.buildSet(UNITS, u.id, si, now() & 0xffff), i: 0, results: [], combo: 0, first: true, phase: 'ask' }; quietify();
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
      <div class="s-logo" style="${P(4, 0, 178, 110)}"><img src="${AQ_LOGO}" alt="애플왕의 진화 모험 English Quest"></div>
      <button class="s-stat" style="${P(196, 40, 410, 84)}" data-tip="⚡ 성장 에너지: 꾸준히 공부하면 가득 차요"><span class="ic">⚡</span><b><span id="sEnergy">${S.energy}</span><small>/100</small></b></button>
      <button class="s-stat" style="${P(414, 40, 618, 84)}" data-act="go" data-v="shop" aria-label="사과 ${S.coins || 0}개 · 꾸미기 상점"><span class="ic">🍎</span><b id="sExp">${S.coins || 0}</b></button>
      <button class="s-stat" style="${P(622, 40, 828, 84)}" data-tip="💎 성장 보석: 단원을 완료하면 1개씩 받아요"><span class="ic">💎</span><b id="sFruit">${S.fruits}</b></button>
      <button class="s-hit" style="${P(857, 27, 923, 93)}" data-act="go" data-v="me" aria-label="설정"></button>

      <div class="s-railtab" style="${P(30, 222, 156, 266)}">진화 라인</div>
      ${[350, 522, 690].map((cy, k) => `<div class="s-pt ${S.stage === k ? 'cur' : ''} ${S.cards.includes(k) ? '' : 'lock'}" style="${P(88 - 62, cy - 62, 88 + 62, cy + 62)}"><img src="${IMG[k]}" alt="${STAGES[k].name}"></div>`).join('')}
      <button class="s-forest" style="${P(22, 832, 156, 908)}" data-act="go" data-v="forest"><span>🌳</span>사과숲</button>
      <button class="s-forest s-village ${L.hungerNow(S, now()) < 30 ? 'alert' : ''}" style="${P(22, 918, 156, 994)}" data-act="go" data-v="village"><span>🏘️</span>마을</button>
      <button class="s-exit" style="${P(24, 112, 154, 196)}" data-act="exit" aria-label="나가기"><span>🚪</span>나가기</button>

      <div class="s-tier" style="${P(182, 171, 304, 207)}">${TIER[i]}</div>
      <div class="s-name" style="${P(316, 160, 558, 224)}">${st.name}</div>
      <div class="s-lv" style="${P(566, 175, 666, 215)}" id="lvTxt">Lv. ${L.level(S.exp)}</div>
      <div class="s-hp" style="${P(672, 156, 818, 224)}"><small>HP</small><b id="hpTxt">${S.energy}</b></div>
      ${i > 0 ? `<div class="s-emb e${i}" style="${P(828, 160, 886, 218)}">${EMB[i]}</div>` : ''}
      <div class="s-art" id="art" style="${P(207, 234, 878, 588)};background-image:url(${AQ_ART[i]})">
        <div class="glint"></div>
        ${SPARKS.map(([x, y, d]) => `<i class="spark" style="left:${x}%;top:${y}%;animation-delay:${d}s"></i>`).join('')}
        <div class="aura"></div>
        <div class="mascot ${sleepy ? 'mood-sleepy' : ''}" id="mascot" data-act="pet">${SHOP.dressed(i, IMG[i], S.wear, st.name)}</div>
        ${sleepy ? '<span class="zz">z z</span>' : ''}${btn}
        ${L.hungerNow(S, now()) < 30 ? `<button class="hungry-bubble" data-act="go" data-v="village">배고파요… 🍎<small>먹이 주러 가기</small></button>` : ''}
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
      tag = `Lesson ${unitNo(Q.unit)}`;
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
    const listen = `<div class="s-listen"><button class="s-spk" data-act="speakq" aria-label="듣기">🔊</button><button class="s-spk slow" data-act="speakslow" aria-label="천천히 듣기">🐢</button><button class="s-mute" data-act="mute">🔇 소리를 켤 수 없어요<small>읽기 문제로 풀기</small></button></div>`;
    switch (q.type) {
      case 'pic': banner = `<span class="s-pic">${q.show}</span>`; opts = L4(q.options); break;
      case 'ko2en': banner = `<span class="s-ko">${esc(q.show)}</span>`; opts = L4(q.options); break;
      case 'en2ko': banner = `<span class="s-sent" style="font-size:48px">${esc(q.show)}</span>${q.item && q.item.e ? `<span class="s-side">${q.item.e}</span>` : ''}`; opts = L4(q.options, true); break;
      case 'listen': case 'listenSent': banner = listen; opts = L4(q.options); break;
      case 'ko2sent': banner = `<span class="s-ko" style="font-size:${q.show.length > 14 ? 34 : 42}px">${esc(q.show)}</span>`; opts = L4(q.options); break;
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
      title = R.passed ? (R.newlyDone ? `${unitNo(Q.unit)}단원 완료!` : `세트 ${Q.setIdx + 1} 통과!`) : '조금만 더 해 볼까?';
      sub = R.passed ? `${R.ok} / ${R.n} 정답 · 경험치 +${R.gain}${R.coins ? ` · 🍎 +${R.coins}` : ''}` : `${S.rules.setPass}문제 이상 맞히면 통과예요 (${R.ok} / ${R.n})`;
      if (R.newlyDone) sub += ` · 💎 +1${R.decor ? ` · 🎁 ${R.decor}` : ''}`;
      const other = rec.sets[0] && !rec.sets[1] ? 1 : !rec.sets[0] ? 0 : null;
      if (!R.passed) acts.push(['다시 도전', 'set', `data-u="${Q.unit}" data-s="${Q.setIdx}"`]);
      else if (other !== null) acts.push(['다음 세트 ▶', 'set', `data-u="${Q.unit}" data-s="${other}"`]);
      else { const nu = currentUnit(); if (nu.id !== Q.unit) acts.push([`Lesson ${nu.no} ▶`, 'set', `data-u="${nu.id}" data-s="0"`]); }
      if (R.boss) acts.push(['🌳 보스전', 'bossinfo', `data-v="${BOSSES.find(b => b.afterUnit === Q.unit).id}"`]);
    } else {
      title = R.recovered ? '원래 모습으로 돌아왔어요!' : R.ok >= S.rules.setPass ? '복습 완료!' : '복습 한 번 더?';
      sub = `${R.ok} / ${R.n} 정답 · 경험치 +${R.gain}${R.coins ? ` · 🍎 +${R.coins}` : ''}`;
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
      <span class="num">${u.icon}<b>${u.no}</b></span><span style="min-width:0"><h3>${esc(u.title)}</h3><p>${u.ko}</p><div class="bar"><i style="width:${pct}%"></i></div></span>
      <span class="st ${st}">${LBL[st]}</span></button>`;
  }
  function bossRowHTML(b) {
    const open = L.bossOpen(S, b), done = !!S.bosses[b.id];
    return `<button class="bossnode ${open ? '' : 'locked'}" data-act="bossinfo" data-v="${b.id}"><span class="num">${done ? '🌳' : '🥀'}</span>
      <span><h3>${b.id === 3 ? '최종' : b.id + '차'} 보스전 · ${b.title}</h3><p>${b.range.length > 3 ? '전체 단원' : unitNo(b.range[0]) + '~' + unitNo(b.range[b.range.length - 1]) + '단원'} 복습 · ${b.reward}</p></span>
      <span class="st ${done ? 'done' : open ? 'studying' : 'locked'}">${done ? '성공' : open ? '도전 가능' : '잠김'}</span></button>`;
  }
  function renderUnits() {
    let html = `<div class="screen-title"><div><h2>단원 선택</h2><p>📚 ${COURSE.label} · <button class="linkish" data-act="course">교재 바꾸기</button></p></div></div>`;
    const groups = COURSE.key === 'cj4' ? [[1, '1학기'], [2, '2학기']] : [[0, `${COURSE.label} · ${COURSE.sub}`]];
    for (const [sem, gl] of groups) {
      html += `<div class="sem">${gl}</div><div class="units">`;
      for (const u of UNITS.filter(x => !sem || x.sem === sem)) {
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
    openSheet(`<button class="close" data-act="closeSheet" aria-label="닫기">✕</button><h3 class="en">Lesson ${u.no}. ${esc(u.title)}</h3><p class="sub">${u.ko} · 단어 ${u.words.length}개 · 핵심 문장 ${u.sentences.length}개</p>
      <div class="grid2"><button class="btn ghost" data-act="go" data-v="study" data-u="${id}">🎧 공부방<small>단어·문장 카드</small></button>
      <button class="btn" data-act="set" data-u="${id}" data-s="0">⚔️ 세트 1 ${rec && rec.sets[0] ? '✅' : ''}<small>그림·뜻·듣기·빈칸</small></button>
      <button class="btn" data-act="set" data-u="${id}" data-s="1">⚔️ 세트 2 ${rec && rec.sets[1] ? '✅' : ''}<small>문장 듣기·순서·짝맞추기</small></button>
      <button class="btn blue" data-act="review">🔁 복습 퀴즈<small>경험치 +${S.rules.expReview}</small></button></div>
      <p class="sub" style="margin-top:12px">${u.words.slice(0, 8).map(w => w.en).join(' · ')}${u.words.length > 8 ? ' …' : ''}</p>`);
  }
  function bossSheet(id) {
    const b = BOSSES.find(x => x.id === id); const open = L.bossOpen(S, b);
    openSheet(`<button class="close" data-act="closeSheet" aria-label="닫기">✕</button><h3>🌳 ${b.title}</h3><p class="sub">${b.goal}</p>
      <p class="sub">복습 범위: ${b.range.length > 3 ? '1~11단원 전체' : b.range.map(unitNo).join(', ') + '단원'} · ${S.rules.bossLen}문제 · ${S.rules.bossPass}문제 이상 맞히면 성공<br>보상: <b>${b.reward}</b>${S.bosses[id] ? ' (이미 받음)' : ''}</p>
      ${open ? `<button class="btn" data-act="boss" data-v="${id}" style="width:100%">도전하기!</button>` : `<button class="btn" disabled style="width:100%">${b.afterUnit}단원을 완료하면 열려요</button>`}`);
  }

  function renderQuizHub() {
    const done = L.doneIds(S);
    let html = `<div class="screen-title"><div><h2>퀴즈 도전</h2><p>5문제씩 나눠서 풀어요. 틀려도 경험치는 줄지 않아요.</p></div></div>`;
    html += `<div class="glass" style="margin-bottom:10px;color:#fff"><div style="display:flex;gap:10px;align-items:center"><span style="font-size:34px">🔁</span><div style="flex:1"><b style="font-family:var(--f-display);font-size:17px;font-weight:400">복습 퀴즈</b><div style="font-size:12.5px;color:#c9d6f0">완료한 단원 + 틀린 단어 · 정답마다 +${S.rules.expReview} EXP</div></div><button class="btn blue" data-act="review" style="flex:0 0 auto">시작</button></div></div>`;
    html += `<div class="units">` + BOSSES.map(bossRowHTML).join('') + `</div><div class="sem">단원별 퀴즈</div><div class="units">`;
    for (const u of UNITS) {
      const rec = S.units[u.id], lock = !isOpen(u.id);
      html += `<div class="unit ${lock ? 'locked' : ''}" style="grid-template-columns:50px 1fr"><span class="num">${u.icon}<b>${u.no}</b></span><span style="min-width:0"><h3>${esc(u.title)}</h3>
        <div class="row-btns" style="margin-top:6px"><button class="btn" style="min-height:38px;font-size:14px" data-act="set" data-u="${u.id}" data-s="0" ${lock ? 'disabled' : ''}>세트 1 ${rec && rec.sets[0] ? '✅' : ''}</button><button class="btn" style="min-height:38px;font-size:14px" data-act="set" data-u="${u.id}" data-s="1" ${lock ? 'disabled' : ''}>세트 2 ${rec && rec.sets[1] ? '✅' : ''}</button></div></span></div>`;
    }
    main.innerHTML = html + '</div>';
  }

  /* 공부방 */
  const SD = { unit: null, tab: 'w', i: 0, flip: false };
  function studyItems() {
    if (SD.tab === 'x') return Object.keys(S.wrong).map(en => { for (const u of ALL_UNITS) { const w = u.words.find(x => x.en === en); if (w) return { ...w, unit: u.id }; } return null; }).filter(Boolean);
    const u = unitById(SD.unit);
    return SD.tab === 'w' ? u.words.map(w => ({ ...w, unit: u.id })) : u.sentences.map(s => ({ ...s, unit: u.id, sent: true }));
  }
  function renderStudy() {
    if (viewArg) { SD.unit = viewArg; SD.i = 0; SD.flip = false; viewArg = null; }
    if (!SD.unit || !UNITS.some(x => x.id === SD.unit) || !isOpen(SD.unit)) SD.unit = currentUnit().id;
    const items = studyItems(); if (SD.i >= items.length) SD.i = 0;
    const it = items[SD.i];
    const u = unitById(SD.unit), rec = L.unitRec(S, SD.unit);
    const known = it && rec.known[it.en];
    const voiceNote = !TTS.ok ? '이 브라우저는 발음 듣기를 지원하지 않아요. 크롬이나 사파리 최신 버전을 사용해 보세요.' : !TTS.voice ? '영어 음성을 찾는 중이에요. 소리가 나지 않으면 기기 설정에서 영어 음성을 추가해 주세요.' : `발음: ${esc(TTS.voice.name)} (기기·브라우저마다 목소리가 달라요)`;
    main.innerHTML = `<div class="screen-title"><div><h2>영어 공부방</h2><p>카드를 누르면 뒤집혀요</p></div></div>
      <div class="unit-chips">${UNITS.map(x => `<button class="${x.id === SD.unit && SD.tab !== 'x' ? 'on' : ''}" data-act="sunit" data-v="${x.id}" ${isOpen(x.id) ? '' : 'disabled'}>${x.no}</button>`).join('')}</div>
      <div class="tabs"><button class="${SD.tab === 'w' ? 'on' : ''}" data-act="stab" data-v="w">단어</button><button class="${SD.tab === 's' ? 'on' : ''}" data-act="stab" data-v="s">문장</button><button class="${SD.tab === 'x' ? 'on' : ''}" data-act="stab" data-v="x">오답 노트 ${Object.keys(S.wrong).length || ''}</button></div>
      ${!it ? `<div class="glass" style="text-align:center;padding:28px;color:#fff">틀린 단어가 없어요! 🎉<br><span style="font-size:13px;color:#c9d6f0">퀴즈에서 틀리거나 "더 공부할래요"를 누른 단어가 여기에 모여요.</span></div>` : `
      <div class="flash-wrap"><div class="flash ${SD.flip ? 'flip' : ''}" id="flash" data-act="flip" role="button" tabindex="0" aria-label="카드 뒤집기">
        <div class="face"><div>${known ? '<span class="tag k">잘 외웠어요</span>' : ''}${it.p ? '<span class="tag" style="left:14px;right:auto;background:#e2efff;color:#1d4fa0">응용 문장</span>' : it.sent ? `<span class="tag" style="left:14px;right:auto;background:#fff2c2;color:#8a5a00">${(unitById(it.unit) || {}).course === 'cj4' ? '교과서 문장' : '핵심 문장'}</span>` : ''}<span class="pic">${it.sent ? unitById(it.unit).icon : (it.e || '🍎')}</span><span class="word ${it.sent ? 's' : ''} en">${esc(it.en)}</span><span class="hint">${SD.tab === 'x' ? 'Lesson ' + unitNo(it.unit) + ' · ' : ''}눌러서 뜻 보기</span></div></div>
        <div class="face back"><div><span class="mean">${esc(it.ko)}</span><span class="word s en" style="font-size:22px;color:#4a5277">${esc(it.en)}</span><span class="hint">다시 누르면 앞면</span></div></div>
      </div></div>
      <div class="flash-nav"><button class="arrow" data-act="sprev" aria-label="이전">◀</button><span class="count">${SD.i + 1} / ${items.length}</span><button class="arrow" data-act="snext" aria-label="다음">▶</button></div>
      <div class="audio-row"><button class="btn" data-act="say1">🔊<small>듣기</small></button><button class="btn blue" data-act="say2">🐢<small>천천히</small></button><button class="btn ghost" data-act="say3">🔁<small>3번 반복</small></button></div>
      <div class="row-btns"><button class="btn green" data-act="known">😊 잘 외웠어요</button><button class="btn ghost" data-act="more">📖 더 공부할래요</button></div>`}
      <p class="voice-note">${voiceNote}</p>
      <div class="row-btns"><button class="btn" data-act="set" data-u="${u.id}" data-s="0">Lesson ${u.no} 퀴즈 도전 ▶</button></div>`;
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
      <button class="btn shop-entry vil" data-act="go" data-v="village">🏘️ 애플 마을<small>먹이 주기 · 집 짓기 · 마을 만들기</small></button>
      <button class="btn shop-entry" data-act="go" data-v="shop">👕 꾸미기 상점<small>🍎 사과 ${S.coins || 0}개 · 옷과 장식으로 ${esc(STAGES[S.stage].name)} 꾸미기</small></button>
      <div class="section-h">${req ? `${STAGES[S.maxStage + 1].name} 진화 조건` : '최종 성장'}</div>
      <div class="glass reqs">${req ? req.map(r => `<div class="req ${r.done ? 'done' : ''}"><i>${r.done ? '✓' : ''}</i>${r.label}<span>${Math.min(r.have, r.need)} / ${r.need}</span></div>`).join('') :
        `<div class="req ${L.unitsDone(S) >= 11 ? 'done' : ''}"><i>${L.unitsDone(S) >= 11 ? '✓' : ''}</i>11단원 완료<span>${L.unitsDone(S)} / 11</span></div><div class="req ${S.bosses[3] ? 'done' : ''}"><i>${S.bosses[3] ? '✓' : ''}</i>최종 보스전 성공<span>${S.bosses[3] ? 1 : 0} / 1</span></div>`}
        ${S.stage < S.maxStage ? `<button class="btn blue" data-act="review" style="margin-top:6px">🔁 복습으로 원래 모습 되찾기</button>` : L.canEvolve(S) ? `<button class="btn" data-act="evolve" style="margin-top:6px">✨ 지금 진화하기!</button>` : ''}</div>
      <div class="section-h">자주 틀리는 단어</div>
      ${wrong.length ? `<div class="wlist">${wrong.map(([en, w]) => `<span><b>${esc(en)}</b>${w.n}회</span>`).join('')}</div><div class="row-btns"><button class="btn blue" data-act="review">틀린 단어 복습하기</button></div>` : `<p style="color:#c9d6f0;font-size:13.5px;margin:0">아직 없어요. 멋져요!</p>`}
      <div class="section-h">설정</div>
      <div class="toggles">${tg('sound', '효과음')}${tg('music', '배경음악')}${tg('quiet', '🔇 조용한 교실 모드 (소리 없이 · 듣기 문제를 읽기 문제로)')}${tg('slowVoice', '발음 기본 속도 느리게')}${tg('reduceMotion', '화면 흔들림·번쩍임 줄이기')}</div>
      <button class="link" data-act="course">📚 교재: <b>${COURSE.label}</b> · 바꾸기</button>
      <button class="link" data-act="rename" style="margin-top:8px">이름 바꾸기 · 현재: ${esc(S.name || '모험가')}</button>
      ${SESS ? `<p class="voice-note">🏫 ${esc(SESS.school_name)} ${SESS.grade}학년 ${SESS.cls}반 ${SESS.num}번 · 기록은 학급 서버에 자동 저장돼요.</p>` : ''}
      <button class="link" data-act="go" data-v="tch" style="margin-top:8px">👩‍🏫 선생님 탭</button>
      <button class="link" data-act="teacher" style="margin-top:8px">🔒 제작자 관리실</button>
      <button class="link" data-act="exit" style="margin-top:8px">🚪 나가기</button>
      ${SESS ? '' : '<p class="voice-note">기록은 지금 이 기기의 브라우저에 저장돼요.</p>'}`;
  }

  /* 꾸미기 상점 */
  let shopSlot = 'all';
  function renderShop() {
    const wearing = Object.values(S.wear || {});
    const list = SHOP.ITEMS.filter(it => shopSlot === 'all' || it.slot === shopSlot);
    main.innerHTML = `<div class="screen-title"><button class="back" data-act="go" data-v="me" aria-label="뒤로">←</button><div><h2>꾸미기 상점</h2><p>문제를 맞히고 모은 🍎 사과로 옷과 장식을 사요</p></div></div>
      <div class="shop-top glass"><div class="shop-prev">${SHOP.dressed(S.stage, IMG[S.stage], S.wear, STAGES[S.stage].name)}</div>
        <div class="shop-info"><b class="coins">🍎 ${S.coins || 0}</b><small>내 사과</small>
          <p>🍎 모으는 방법<br>· 새로 맞힌 문제 1개<br>· 세트 통과 3개 · 단원 완료 10개<br>· 오늘 첫 공부 5개 · 보스전 승리 20개</p></div></div>
      <div class="shop-tabs">${[['all', '전체']].concat(SHOP.SLOTS.map(x => [x.key, x.name])).map(([k, n]) => `<button class="${shopSlot === k ? 'on' : ''}" data-act="shoptab" data-v="${k}">${n}</button>`).join('')}</div>
      <div class="shop-grid">${list.map(it => {
        const own = (S.owned || []).includes(it.id), on = wearing.includes(it.id), lock = (it.stage || 0) > S.maxStage;
        const tag = on ? '<em class="on">입는 중</em>' : own ? '<em>가지고 있음</em>' : lock ? `<em class="lock">🔒 ${STAGES[it.stage].name}부터</em>` : `<em class="price">🍎 ${it.price}</em>`;
        return `<button class="shop-item t${it.tier || 1} ${on ? 'on' : ''} ${lock && !own ? 'lock' : ''}" data-act="shopitem" data-v="${it.id}"><i class="tier">${SHOP.TIERS[it.tier || 1]}</i><span class="ic">${SHOP.icon(it)}</span><b>${it.name}</b>${tag}</button>`;
      }).join('')}</div>
      <p class="voice-note">산 아이템은 홈 카드와 사과숲에서 캐릭터가 입고 나와요. 진화하면 더 멋진 아이템이 열려요!</p>`;
  }

  /* 애플 마을: 먹이 · 집 · 마을 */
  let vTab = 'food', villT = null;
  const LOVE_NAMES = ['새 친구', '친한 친구', '단짝', '베스트 프렌드', '영원한 단짝'];
  function villageScene() {
    const H = VIL.HOUSES[S.house || 0], hs = VIL.HOUSE_SPOT;
    const owned = VIL.BUILDINGS.filter(b => S.town && S.town[b.key]).length;
    const plots = VIL.BUILDINGS.map(b => {
      if (S.town && S.town[b.key]) return `<button class="f-item v-bld" data-act="vbld" data-v="${b.key}" style="${placeStyle(b.x, b.y, b.w)}" aria-label="${b.name}">${b.art()}</button>`;
      const open = decorDone(b);
      return `<button class="f-item v-plot ${open ? 'open' : ''}" data-act="vbld" data-v="${b.key}" style="${placeStyle(b.x, b.y, 54)}" aria-label="${b.name} 자리"><span>${open ? `🍎${b.price}` : `🔒${b.unit}단원`}</span></button>`;
    }).join('');
    const vill = VIL.VILLAGERS.slice(0, Math.min(3, Math.floor(owned / 3) + (owned ? 1 : 0))).map((g, k) => `<div class="f-item v-npc" data-k="${k}" style="${placeStyle(20 + k * 30, 80 + k * 5, 30)}">${VIL.villager(g)}</div>`).join('');
    return `<div class="forest f3d village" id="vscene">${FX.DEFS}${SHOP.DEFS.replace('<defs>', '<svg width="0" height="0" style="position:absolute"><defs>').replace('</defs>', '</defs></svg>')}${VIL.DEFS.replace('<defs>', '<svg width="0" height="0" style="position:absolute"><defs>').replace('</defs>', '</defs></svg>')}${FX.scene()}
      <button class="f-item v-house" data-act="vtab" data-v="house" style="${placeStyle(hs.x, hs.y, hs.w)}" aria-label="${H.name}">${H.art()}</button>
      ${plots}${vill}
      <div class="walker f-item" id="vwalker" style="${placeStyle(50, 80, 70)}">${SHOP.dressed(S.stage, IMG[S.stage], S.wear, STAGES[S.stage].name)}</div>
      ${FX.overlay()}</div>`;
  }
  function renderVillage() {
    const full = L.hungerNow(S, now()), lv = L.loveLevel(S.love || 0);
    const fcol = full >= 60 ? 'ok' : full >= 30 ? 'mid' : 'low';
    let panel = '';
    if (vTab === 'food') {
      panel = `<p class="v-hint">${full < 30 ? `😢 ${esc(STAGES[S.stage].name)}가 배고파요! 맛있는 걸 주세요.` : full >= 100 ? '😋 배불러요! 내일 또 주세요.' : '먹이를 주면 배부름과 애정도가 올라요. 배가 부르면(50 이상) 세트를 통과할 때 사과를 2개 더 받아요!'} 주말을 빼고 하루에 20씩 배가 고파져요.</p>
        <div class="v-grid">${VIL.FOODS.map(f => { const lock = (f.stage || 0) > S.maxStage; return `<button class="v-card ${lock ? 'lock' : ''}" data-act="vfeed" data-v="${f.key}"><span class="ic">${f.art()}</span><b>${f.name}</b><small>배부름 +${f.fill} · 💕+${f.love}</small><em class="price">${lock ? `🔒 ${STAGES[f.stage].name}부터` : `🍎 ${f.price}`}</em></button>`; }).join('')}</div>`;
    } else if (vTab === 'house') {
      const cur = VIL.HOUSES[S.house || 0], nx = VIL.HOUSES[(S.house || 0) + 1];
      const need = nx ? [`🍎 사과 ${nx.price}개 (${S.coins || 0})`, nx.days ? `📅 공부한 날 ${nx.days}일 (${S.studyDays || 0})` : '', nx.stage ? `✨ ${STAGES[nx.stage].name} 진화` : ''].filter(Boolean) : [];
      panel = `<div class="v-house-row"><div class="v-card big"><span class="ic">${cur.art()}</span><b>지금: ${cur.name}</b><small>${S.house || 0} / ${VIL.HOUSES.length - 1}단계</small></div>
        ${nx ? `<div class="v-arrow">▶</div><div class="v-card big next"><span class="ic">${nx.art()}</span><b>다음: ${nx.name}</b><small>${need.join('<br>')}</small><button class="btn" data-act="vbuild">🔨 집 짓기</button></div>` : '<div class="v-card big next"><b>🏰 최고의 집을 완성했어요!</b><small>정말 대단해요!</small></div>'}</div>
        <p class="v-hint">집은 텐트 → 오두막 → 사과 지붕 집 → 2층 집 → 애플 궁전으로 커져요. 꾸준히 공부한 날이 쌓여야 더 큰 집을 지을 수 있어요.</p>`;
    } else {
      panel = `<p class="v-hint">단원을 하나 마칠 때마다 마을에 새 건물 자리가 열려요. 사과로 건물을 지어 마을을 키워요! 건물이 늘면 이웃 친구들도 이사 와요.</p>
        <div class="v-grid">${VIL.BUILDINGS.map(b => { const own = S.town && S.town[b.key], open = decorDone(b); return `<button class="v-card ${own ? 'own' : ''} ${!own && !open ? 'lock' : ''}" data-act="vbld" data-v="${b.key}"><span class="ic">${b.art()}</span><b>${b.name}</b><em class="${own ? 'on' : 'price'}">${own ? '완성!' : open ? `🍎 ${b.price}` : `🔒 ${b.unit}단원 완료`}</em></button>`; }).join('')}</div>`;
    }
    main.innerHTML = `<div class="screen-title"><button class="back" data-act="go" data-v="home" aria-label="뒤로">←</button><div><h2>${esc(S.name || '나')}의 애플 마을</h2><p>먹이를 주고, 집을 짓고, 마을을 키워요</p></div></div>
      ${villageScene()}
      <div class="v-status glass"><div class="v-bar ${fcol}"><span>🍽️ 배부름</span><i><b style="width:${full}%"></b></i><em>${full}</em></div>
        <div class="v-love"><span>💕 ${LOVE_NAMES[lv]}</span><em>애정 ${S.love || 0}</em></div><div class="v-coin">🍎 ${S.coins || 0}</div></div>
      <div class="v-tabs">${[['food', '🍽️ 먹이 주기'], ['house', '🏠 내 집'], ['town', '🏘️ 마을']].map(([k, n]) => `<button class="${vTab === k ? 'on' : ''}" data-act="vtab" data-v="${k}">${n}</button>`).join('')}</div>
      <div class="v-panel">${panel}</div>`;
    clearInterval(villT);
    if (!S.settings.reduceMotion) {
      const wander = () => { const sc = $('#vscene'); if (!sc) return clearInterval(villT);
        const w = $('#vwalker'); if (w) { const x = 30 + Math.random() * 40, y = 74 + Math.random() * 10; w.classList.toggle('flipx', x < parseFloat(w.style.left)); w.style.cssText = placeStyle(x, y, 70); }
        sc.querySelectorAll('.v-npc').forEach(n => { const x = 8 + Math.random() * 84, y = 72 + Math.random() * 24; n.classList.toggle('flipx', x < parseFloat(n.style.left)); n.style.cssText = placeStyle(x, y, 30); }); };
      villT = setInterval(wander, 3800); setTimeout(wander, 300);
    }
  }
  function feedFx(food) {
    const sc = $('#vscene'), w = $('#vwalker'); if (!sc || !w) return;
    const f = document.createElement('div'); f.className = 'v-fly'; f.innerHTML = food.art();
    f.style.left = w.style.left; f.style.top = w.style.top; sc.append(f);
    const b = document.createElement('div'); b.className = 'bubble v-yum'; b.innerHTML = ['냠냠! 고마워!', '맛있어요! 💕', 'Yummy! Thank you!', '배불러요~ 😋'][Math.floor(Math.random() * 4)];
    w.append(b); for (let k = 0; k < 5; k++) { const h = document.createElement('i'); h.className = 'v-heart'; h.textContent = '💕'; h.style.left = (20 + k * 15) + '%'; h.style.animationDelay = (k * .12) + 's'; w.append(h); }
    setTimeout(() => { f.remove(); b.remove(); w.querySelectorAll('.v-heart').forEach(x => x.remove()); }, 2200);
  }

  /* 사과숲 */
  let forestT = null;
  function stopForest() { clearInterval(forestT); forestT = null; }
  const FX = AQ_FOREST, SHOP = AQ_SHOP, VIL = AQ_VILLAGE;
  const depthS = y => 0.5 + (Math.max(44, Math.min(98, y)) - 44) / 54 * 0.72; // 멀수록 작게
  const placeStyle = (x, y, w) => `left:${x}%;top:${y}%;--s:${depthS(y).toFixed(3)};--w:${w}px;z-index:${Math.round(y * 10)}`;
  function decorHTML(d) { return (FX.DECOR[d.key] || (() => d.e))(); }
  function renderForest() {
    const unlocked = DECOR.filter(decorDone);
    const placed = DECOR.filter(d => S.forest[d.key] && unlocked.includes(d));
    main.innerHTML = `<div class="screen-title"><button class="back" data-act="go" data-v="home" aria-label="뒤로">←</button><div><h2>${esc(S.name || '나')}의 사과숲</h2><p>장식을 눌러 놓고, 끌어서 옮겨요 · 앞으로 끌면 커져요</p></div></div>
      <div class="forest f3d" id="forest">${FX.DEFS}${FX.scene()}
        <div class="f-item f-tree" style="${placeStyle(50, 60, 190)}">${FX.tree(false)}</div>
        ${placed.map(d => { const p = S.forest[d.key]; const y = Math.max(46, p.y); return `<div class="item f-item ${['flowers', 'garden', 'mushroom'].includes(d.key) ? 'sway' : ''}" data-k="${d.key}" style="${placeStyle(p.x, y, FX.SIZE[d.key] || 80)}">${decorHTML(d)}</div>`; }).join('')}
        <div class="walker f-item" id="walker" style="${placeStyle(50, 84, 74)}">${SHOP.dressed(S.stage, IMG[S.stage], S.wear, STAGES[S.stage].name)}</div>
        ${FX.overlay()}
      </div>
      <div class="tray">${DECOR.map(d => { const u = unlocked.includes(d); const p = !!S.forest[d.key] && u; return `<button class="slot ${u ? '' : 'lock'} ${p ? 'placed' : ''}" data-act="decor" data-v="${d.key}"><span class="ico">${u ? decorHTML(d) : '🔒'}</span>${d.name}<br><small>${u ? (p ? '놓았어요 · 누르면 치우기' : '눌러서 놓기') : d.unit + '단원 완료'}</small></button>`; }).join('')}</div>`;
    bindForest();
    const w = $('#walker');
    const wander = () => { if (!w.isConnected) return stopForest(); const x = 12 + Math.random() * 76, y = 70 + Math.random() * 24; w.classList.toggle('flipx', x < parseFloat(w.style.left)); w.style.cssText = placeStyle(x, y, 74); };
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
      const x = Math.max(6, Math.min(94, (e.clientX - r.left) / r.width * 100)), y = Math.max(46, Math.min(98, (e.clientY - r.top) / r.height * 100));
      drag.style.cssText = placeStyle(x, y, FX.SIZE[drag.dataset.k] || 80);
    });
    if (!S.settings.reduceMotion) f.addEventListener('pointermove', e => { // 시점 살짝 움직이기(입체감)
      if (drag) return; const r = f.getBoundingClientRect();
      f.style.setProperty('--px', ((e.clientX - r.left) / r.width - .5).toFixed(3)); f.style.setProperty('--py', ((e.clientY - r.top) / r.height - .5).toFixed(3));
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

  /* 제작자 관리실 */
  let remoteSurveys = null, remoteState = '';
  function parseCSV(t) {
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < t.length; i++) { const c = t[i];
      if (q) { if (c === '"' && t[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; } else cur += c; }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }
  function loadRemoteSurveys() {
    if (API) { loadAdmin(); return; }
    if (!SURVEY.resultsCsv) return;
    remoteState = '불러오는 중…'; renderTeacher();
    fetch(SURVEY.resultsCsv, { cache: 'no-store' }).then(r => r.text()).then(t => {
      const rows = parseCSV(t).slice(1).filter(x => x.length > 1);
      remoteSurveys = rows.map(x => ({ t: x[0], r: Math.max(0, Math.min(5, parseInt(x[1], 10) || 0)), c: x[2] || '', info: x[3] || '' })).filter(x => x.r > 0);
      remoteState = ''; if (view === 'teacher') renderTeacher();
    }).catch(() => { remoteState = '결과를 불러오지 못했어요. 인터넷 연결이나 시트 게시 상태를 확인해 주세요.'; if (view === 'teacher') renderTeacher(); });
  }
  function surveyHTML() {
    const list = remoteSurveys || (S.surveys || []).map(x => ({ t: new Date(x.t).toLocaleString('ko-KR'), r: x.r, c: x.c }));
    const n = list.length, avg = n ? list.reduce((a, x) => a + x.r, 0) / n : 0;
    const dist = [5, 4, 3, 2, 1].map(k => [k, list.filter(x => x.r === k).length]);
    const max = Math.max(1, ...dist.map(d => d[1]));
    const src = remoteSurveys ? (API ? '모든 학생의 응답 (학급 서버)' : '모든 학생의 응답 (구글 시트)') : SURVEY.resultsCsv ? '이 기기의 응답' : '이 기기의 응답 · 전체 취합은 학급 서버 연결 후 가능';
    return `<div class="section-h">💗 만족도 조사 결과</div>
      <div class="glass survey-box">
        <div class="sv-top"><div><b class="sv-avg">${n ? avg.toFixed(1) : '-'}</b><span class="sv-of">/ 5</span></div><div class="sv-meta">응답 ${n}개<br><small>${src}</small></div></div>
        <div class="sv-dist">${dist.map(([k, c]) => `<div class="sv-row"><span>${'♥'.repeat(k)}</span><div class="sv-bar"><i style="width:${c / max * 100}%"></i></div><b>${c}</b></div>`).join('')}</div>
        ${remoteState ? `<p class="sv-note">${remoteState}</p>` : ''}
        <div class="sv-comments">${list.filter(x => x.c).slice(-30).reverse().map(x => `<div class="sv-c"><span class="sv-h">${'♥'.repeat(x.r)}${'♡'.repeat(5 - x.r)}</span><p>${esc(x.c)}</p><small>${esc(x.t || '')}</small></div>`).join('') || '<p class="sv-note">아직 남겨진 코멘트가 없어요.</p>'}</div>
        <div class="row-btns">${SURVEY.resultsCsv || API ? '<button class="btn ghost" data-act="svreload">🔄 새로고침</button>' : ''}<button class="btn ghost" data-act="svcopy">📋 결과 복사</button></div>
      </div>`;
  }
  function renderTeacher() {
    if (!adminOK) { go('me'); return; }
    const r = S.rules;
    const num = (path, label, min = 1, max = 999) => `<div class="rowf"><span>${label}</span><input type="number" id="r-${path}" data-path="${path}" min="${min}" max="${max}" value="${path.split('.').reduce((o, k) => o[k], r)}"></div>`;
    const tg = (k, label) => `<button class="tg" data-act="rtog" data-v="${k}" style="padding-left:0;background:none"><span>${label}</span><span class="sw ${r[k] ? 'on' : ''}"></span></button>`;
    main.innerHTML = `<div class="screen-title"><button class="back" data-act="go" data-v="me" aria-label="뒤로">←</button><div><h2>제작자 관리실</h2><p>만족도 조사 결과와 게임 규칙을 관리해요</p></div></div>
      <div class="teacher">
      ${API ? adminTeachersHTML() : ''}
      ${surveyHTML()}
      <div class="section-h">학습 가능 단원</div><div class="glass"><div class="ugrid">${UNITS.map(u => `<button class="${r.openUnits.includes(u.no) ? 'on' : ''}" data-act="uopen" data-v="${u.no}">${u.no}</button>`).join('')}</div></div>
      <div class="section-h">경험치·진화 규칙</div><div class="glass">
        ${num('expBasic', '기본 퀴즈 정답 경험치')}${num('expReview', '복습·보스 정답 경험치')}
        ${num('evo1.exp', '애플왕 진화: 누적 경험치')}${num('evo1.units', '애플왕 진화: 완료 단원 수', 1, 11)}
        ${num('evo2.exp', '애플대왕 진화: 누적 경험치')}${num('evo2.units', '애플대왕 진화: 완료 단원 수', 1, 11)}
        ${num('setPass', '세트 통과 정답 수 (5문제 중)', 1, 5)}${num('bossPass', '보스전 성공 정답 수 (10문제 중)', 1, 10)}</div>
      <div class="section-h">퇴화 규칙</div><div class="glass">${tg('decayOn', '미접속 퇴화 사용')}${tg('pauseWeekends', '주말에는 퇴화 타이머 멈춤')}
        ${num('decayEnergyDays', '에너지 감소 시작 (일)')}${num('decayStageDays', '1단계 하락 (일)')}${num('decayBaseDays', '풋애플까지 하락 (일)')}</div>
      <div class="section-h">미리보기</div>
      <div class="row-btns" style="margin-top:0">${[0, 1, 2].map(i => `<button class="btn ghost" data-act="tzoom" data-v="${i}">${STAGES[i].name}</button>`).join('')}</div>
      <div class="glass" style="margin-top:10px"><ol class="qprev">${UNITS.map(u => `<li><b>${u.no}. ${esc(u.title)}</b><br>${u.words.map(w => esc(w.en) + '(' + esc(w.ko) + ')').join(', ')}<br><i>${u.sentences.map(s => esc(s.en)).join(' / ')}</i></li>`).join('')}</ol></div>
      <div class="section-h">학습 기록</div>
      <div class="glass" style="font-size:13.5px;line-height:1.6;color:#d6e0f5">${UNITS.map(u => { const x = S.units[u.id]; return `${u.no}단원: ${x ? (x.done ? '완료' : '진행 중') + ` · 정답률 ${x.n ? Math.round(x.ok / x.n * 100) : 0}%` : '시작 전'}`; }).join('<br>')}</div>
      <div class="row-btns"><button class="btn ghost" data-act="csv">📋 기록 CSV 복사</button></div>
      <div class="row-btns"><button class="btn" style="background:linear-gradient(180deg,#ffd0c0,#ef6a4a);color:#fff" data-act="resetask">이 기기 학습 기록 초기화</button></div>
      <div class="row-btns"><button class="btn ghost" data-act="adminout">🔒 관리실 잠그기</button></div></div>`;
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
    mute: () => {
      if (!Q) return; AU.tap(); if (window.speechSynthesis) speechSynthesis.cancel();
      S.settings.quiet = true; save();
      Q.list = Q.list.map((q, k) => (k >= Q.i ? L.silentQ(q) : q));
      toast('🔇 조용한 교실 모드 켜짐 · 듣기 문제는 읽기 문제로 나와요 (나의 성장 › 설정에서 끌 수 있어요)', 2600);
      renderPanel();
    },
    vtab: d => { AU.tap(); vTab = d.v; renderVillage(); },
    vfeed: d => {
      const f = VIL.FOODS.find(x => x.key === d.v); if (!f) return;
      if ((f.stage || 0) > S.maxStage) { toast(`🔒 ${STAGES[f.stage].name}(으)로 진화하면 줄 수 있어요!`); return; }
      const r = L.feed(S, f, now());
      if (r === 'full') { toast('😋 배가 가득 찼어요! 내일 또 주세요.'); return; }
      if (r === 'poor') { toast(`🍎 사과가 ${f.price - (S.coins || 0)}개 더 필요해요. 문제를 풀고 모아 봐요!`); return; }
      AU.sparkle(); save(); cloudFlush(); renderVillage(); feedFx(f);
      const before = L.loveLevel((S.love || 0) - (f.love || 1)), after = L.loveLevel(S.love || 0);
      if (after > before) setTimeout(() => { AU.fanfare(); toast(`💕 애정도가 올라서 "${LOVE_NAMES[after]}"가 되었어요!`, 2600); }, 900);
    },
    vbuild: () => {
      const nx = VIL.HOUSES[(S.house || 0) + 1]; const r = L.buildHouse(S, VIL.HOUSES);
      if (r === 'locked') { toast(`🔒 ${STAGES[nx.stage].name}(으)로 진화해야 지을 수 있어요!`); return; }
      if (r === 'days') { toast(`📅 공부한 날이 ${nx.days - (S.studyDays || 0)}일 더 필요해요. 매일 조금씩 공부해요!`); return; }
      if (r === 'poor') { toast(`🍎 사과가 ${nx.price - (S.coins || 0)}개 더 필요해요!`); return; }
      if (r === 'ok') { AU.fanfare(); save(); cloudFlush(); renderVillage(); const h = $('.v-house'); if (h) h.classList.add('built'); toast(`🔨 뚝딱뚝딱! ${nx.name}을(를) 지었어요!`, 2600); }
    },
    vbld: d => {
      const b = VIL.BUILDINGS.find(x => x.key === d.v); if (!b) return;
      if (S.town && S.town[b.key]) { AU.tap(); toast(`🏘️ ${b.name} — 우리 마을의 자랑이에요!`); return; }
      const r = L.buyBuilding(S, b, decorDone(b));
      if (r === 'locked') { toast(`🔒 ${b.unit}단원을 마치면 ${b.name} 자리가 열려요!`); return; }
      if (r === 'poor') { toast(`🍎 사과가 ${b.price - (S.coins || 0)}개 더 필요해요!`); return; }
      if (r === 'ok') { AU.fanfare(); save(); cloudFlush(); vTab = 'town'; renderVillage(); toast(`🎉 마을에 ${b.name}이(가) 생겼어요!`, 2400); }
    },
    shoptab: d => { AU.tap(); shopSlot = d.v; renderShop(); },
    shopitem: d => {
      const it = SHOP.byId(d.v); if (!it) return;
      if ((S.owned || []).includes(it.id)) { L.toggleWear(S, it); AU.tap(); save(); cloudFlush(); renderShop(); return; }
      const r = L.buyItem(S, it);
      if (r === 'locked') { toast(`🔒 ${STAGES[it.stage].name}(으)로 진화하면 살 수 있어요!`); return; }
      if (r === 'poor') { toast(`🍎 사과가 ${it.price - (S.coins || 0)}개 더 필요해요. 문제를 풀고 모아 봐요!`); return; }
      if (r === 'ok') { AU.fanfare(); toast(`🎉 ${it.name}을(를) 샀어요! 바로 입었어요`); save(); cloudFlush(); renderShop(); }
    },
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
      if (!decorDone(dd)) { toast(`${dd.unit}단원을 완료하면 ${dd.name}을(를) 얻어요!`); return; }
      if (S.forest[dd.key]) delete S.forest[dd.key]; else { S.forest[dd.key] = { x: 18 + Math.random() * 64, y: 62 + Math.random() * 30 }; AU.sparkle(); }
      save(); renderForest();
    },
    teacher: () => { if (adminOK) { go('teacher'); loadRemoteSurveys(); return; } openSheet(`<button class="close" data-act="closeSheet" aria-label="닫기">✕</button><h3>🔒 제작자 관리실</h3><p class="sub">제작자 비밀번호를 입력해 주세요.</p>
      <form id="pinform"><input class="field" id="pin-in" type="password" autocomplete="off" autocapitalize="off" aria-label="비밀번호"><div class="row-btns"><button class="btn" type="submit">들어가기</button></div></form>`); setTimeout(() => { const i = $('#pin-in'); i && i.focus(); }, 300); },
    svreload: () => loadRemoteSurveys(),
    svcopy: () => {
      const list = remoteSurveys || (S.surveys || []).map(x => ({ t: new Date(x.t).toLocaleString('ko-KR'), r: x.r, c: x.c }));
      const text = ['시간,만족도,코멘트'].concat(list.map(x => [x.t, x.r, '"' + String(x.c || '').replace(/"/g, '""') + '"'].join(','))).join('\n');
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast('복사했어요! 엑셀에 붙여넣기 하세요.')).catch(() => showText(text)); else showText(text);
    },
    adminout: () => { adminOK = false; adminPw = ''; toast('관리실을 잠갔어요'); go('me'); },
    adecide: d => adminDecide(+d.v, d.ok === '1'),
    abackup: async () => {
      toast('백업 파일을 만드는 중…', 1500);
      const r = await api('/api/admin/backup', undefined, { admin: adminPw, timeout: 30000 });
      if (!r.ok) { toast(r.error || '백업을 받지 못했어요.'); return; }
      delete r.status;
      const day = new Date(now()).toISOString().slice(0, 10);
      saveFile(`애플왕_백업_${day}.json`, JSON.stringify(r, null, 1), 'application/json');
      const head = ['학교', '학년', '반', '번호', '닉네임', '레벨', '경험치', '진화 단계', '완료 단원 수', '정답률(%)', '학습 시간(분)', '마지막 학습', '가입일'];
      const cell = v => { const x = String(v == null ? '' : v); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; };
      const rows = r.students.map(x => { const m = x.summary || {}; return [x.school_name, x.grade, x.cls, x.num, x.nickname, m.level, m.exp, m.stage, m.unitsDone, m.accuracy, m.minutes, m.lastStudy ? new Date(m.lastStudy).toLocaleString('ko-KR') : '', new Date(x.created_at).toLocaleDateString('ko-KR')]; });
      setTimeout(() => saveFile(`애플왕_학생목록_${day}.csv`, '\uFEFF' + [head].concat(rows).map(a => a.map(cell).join(',')).join('\n'), 'text/csv'), 600);
      toast(`백업 완료! 학생 ${r.students.length}명 · 선생님 ${r.teachers.length}명 · 만족도 ${r.surveys.length}개`, 3200);
    },
    ttab: d => { TV = d.v; renderTeach(); },
    tlogout: () => { TS = null; lsSet(TSESS_KEY, null); TLIST = null; renderTeach(); },
    treload: () => loadTeach(),
    tcopyf: () => copyText(sheetFormula(), '수식을 복사했어요! 구글 시트 A1 칸에 붙여 넣으세요.'),
    tcsv: () => { if (!TLIST) return; copyText(TLIST.map(x => [x.num, x.nickname, x.course || '', x.level || 1, x.stage || '풋애플', x.unitsDone || 0, (x.accuracy || 0) + '%', fmtDate(x.lastStudy)].join('\t')).join('\n'), '복사했어요! 엑셀이나 시트에 붙여 넣으세요.'); },
    tpin: d => confirmSheet(`${d.n}번 학생의 비밀번호를 초기화할까요?`, '학생이 다음에 들어올 때 새로 입력하는 4자리가 새 비밀번호가 돼요.', '초기화', async () => { const r = await api('/api/teacher/reset-pin', { id: +d.v }, { token: TS.token }); toast(r.ok ? '초기화했어요' : r.error); loadTeach(); }),
    tdel: d => confirmSheet(`${d.n}번 학생 기록을 지울까요?`, '이 학생의 캐릭터와 학습 기록이 모두 지워지고 되돌릴 수 없어요.', '지우기', async () => { const r = await api('/api/teacher/delete-student', { id: +d.v }, { token: TS.token }); toast(r.ok ? '지웠어요' : r.error); loadTeach(); }),
    tdelall: () => confirmSheet('우리 반 기록을 모두 지울까요?', '학년이 끝났을 때 쓰는 기능이에요. 우리 반 학생들의 캐릭터와 학습 기록이 모두 지워지고 되돌릴 수 없어요.', '모두 지우기', async () => { const r = await api('/api/teacher/delete-class', {}, { token: TS.token }); toast(r.ok ? '모두 지웠어요' : r.error); loadTeach(); }),
    spmanual: (d, el) => {
      const box = el.closest('.sp'), office = box.querySelector('.sp-office').value;
      let name = box.querySelector('.sp-input').value.trim().replace(/\s+/g, ''); if (!/초등학교$/.test(name)) name = name.replace(/초$/, '') + '초등학교';
      const region = (OFFICES.find(o => o[0] === office) || ['', ''])[1];
      // 직접 등록한 학교도 같은 시·도 + 같은 이름이면 같은 학교로 묶여요(선생님과 학생이 똑같이 적어야 해요)
      ACT.spick({ code: `M-${office || 'X00'}-${name}`, name, addr: `${region || '지역 미선택'} · 직접 등록` }, el);
    },
    spick: (d, el) => { const box = el.closest('.sp'); box.dataset.code = d.code; box.dataset.name = d.name; box.querySelector('.sp-sel').innerHTML = `✅ <b>${esc(d.name)}</b> <small>${esc(d.addr || '')}</small>`; box.querySelector('.sp-list').innerHTML = ''; box.querySelector('.sp-input').value = d.name; lsSet(LAST_SCHOOL, { code: d.code, name: d.name, addr: d.addr }); },
    switchkid: () => { cloudFlush(); SESS = null; lsSet(SESS_KEY, null); const intro = S.introSeen; S = migrate({}); S.introSeen = intro; S.createdAt = now(); S.cardAt[0] = now(); save(); toast('다른 친구로 시작해요'); const t = document.querySelector('.title'); if (t) { t.remove(); boot(); } },
    rename: () => nameSheet(),
    csv: () => {
      const rows = [['이름', '단원', '상태', '정답', '문항', '정답률']].concat(UNITS.map(u => { const x = S.units[u.id]; return [S.name, u.no, x ? (x.done ? '완료' : '진행') : '시작 전', x ? x.ok : 0, x ? x.n : 0, x && x.n ? Math.round(x.ok / x.n * 100) + '%' : '']; }));
      const text = rows.map(r => r.join(',')).join('\n');
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast('복사했어요! 엑셀에 붙여넣기 하세요.')).catch(() => showText(text)); else showText(text);
    },
    resetask: () => openSheet(`<h3>정말 초기화할까요?</h3><p class="sub">이 기기의 경험치, 단원 기록, 카드, 사과숲이 모두 지워져요. 되돌릴 수 없어요.</p><div class="row-btns"><button class="btn ghost" data-act="closeSheet">취소</button><button class="btn" style="background:linear-gradient(180deg,#ffd0c0,#ef6a4a);color:#fff" data-act="reset">초기화</button></div>`),
    exit: () => { AU.tap(); openExit(); },
    course: () => { AU.tap(); closeSheet(); coursePicker(() => go('home'), false); },
    reset: () => { const pin = S.pin, rules = S.rules, sv = S.surveys; S = migrate({}); S.pin = pin; S.rules = rules; S.surveys = sv; S.createdAt = now(); S.cardAt[0] = now(); S.introSeen = true; Q = null; save(); closeSheet(); toast('초기화했어요'); nameSheet(); },
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
    if (e.target.id === 'nameform') { S.name = ($('#name-in').value || '').trim().slice(0, 10) || '모험가'; save(); if (SESS) { SESS.nickname = S.name; lsSet(SESS_KEY, SESS); cloudFlush(); } closeSheet(); render(); const a = nameSheet.after; nameSheet.after = null; a && a(); }
    if (e.target.id === 'pinform') { const pw = $('#pin-in').value; const btn = e.target.querySelector('[type=submit]'); if (btn) btn.disabled = true;
      api('/api/admin/check', undefined, { admin: pw }).then(r => { if (btn) btn.disabled = false;
        if (r.ok) { adminOK = true; adminPw = pw; closeSheet(); go('teacher'); loadRemoteSurveys(); }
        else toast(r.status === 401 || r.status === 403 ? '비밀번호가 달라요' : '서버에 연결하지 못했어요. 잠시 뒤 다시 해 주세요.'); }); }
    if (e.target.id === 'slogin') studentLoginSubmit(e.target);
    if (e.target.id === 'tlogin' || e.target.id === 'treg') teacherSubmit(e.target);
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

  /* ================= 학급 서버: 로그인 · 자동 저장 · 선생님 탭 · 승인 ================= */
  const API = (AQ_DATA.API_BASE || '').replace(/\/+$/, '');
  const SESS_KEY = 'aq-session-v1', TSESS_KEY = 'aq-teacher-v1', LAST_SCHOOL = 'aq-last-school';
  const lsGet = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  let SESS = API ? lsGet(SESS_KEY) : null, TS = API ? lsGet(TSESS_KEY) : null, TV = 'login', TLIST = null, TERR = '', adminPw = '', ADMIN = null;
  const acct = s => s ? `${s.school_code}|${s.grade}|${s.cls}|${s.num}` : '';
  const fmtDate = t => { if (!t) return '-'; const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  async function api(path, body, opt = {}) {
    if (!API) return { ok: false, error: '학급 서버가 아직 연결되지 않았어요.' };
    const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), opt.timeout || 12000);
    try {
      const headers = {};
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      if (opt.token) headers.Authorization = 'Bearer ' + opt.token;
      if (opt.admin) headers['X-Admin-Password'] = opt.admin;
      const r = await fetch(API + path, { method: body === undefined ? 'GET' : 'POST', headers, body: body === undefined ? undefined : JSON.stringify(body), signal: ctrl.signal, keepalive: !!opt.keepalive });
      const j = await r.json().catch(() => ({ ok: false, error: '서버 응답을 읽지 못했어요.' }));
      j.status = r.status; return j;
    } catch (e) { return { ok: false, error: '인터넷 연결을 확인해 주세요.', offline: true }; }
    finally { clearTimeout(tm); }
  }
  function saveFile(name, text, type) {
    try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' })); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
    catch (e) { showText(text); }
  }
  function copyText(t, msg) {
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast(msg)).catch(() => showText(t)); else showText(t);
  }
  function confirmSheet(title, sub, label, fn) {
    openSheet(`<h3>${title}</h3><p class="sub">${sub}</p><div class="row-btns"><button class="btn ghost" data-act="closeSheet">취소</button><button class="btn danger" id="cfm">${label}</button></div>`);
    $('#cfm').addEventListener('click', () => { closeSheet(); fn(); });
  }
  function summary() {
    const done = L.doneIds(S).map(id => { const u = unitById(id); return u ? `${COURSES.find(c => c.key === u.course).label.replace('학년', '')}-${u.no}` : id; });
    return { course: COURSE.label, level: L.level(S.exp), exp: S.exp, stage: STAGES[S.stage].name, unitsDone: done.length, doneUnits: done,
      accuracy: S.stats.answered ? Math.round(S.stats.correct / S.stats.answered * 100) : 0, minutes: Math.round(S.stats.ms / 60000), streak: S.streak,
      bosses: BOSSES.filter(b => S.bosses[b.id]).map(b => b.id + '차'), wrongTop: Object.entries(S.wrong).sort((a, b) => b[1].n - a[1].n).slice(0, 5).map(x => x[0]), lastStudy: S.lastStudy };
  }
  let cloudBusy = false, cloudWarned = false;
  async function cloudFlush(keepalive) {
    if (!API || !SESS || cloudBusy) return;
    cloudBusy = true; cloudDirty = false;
    S.account = acct(SESS); S.savedAt = now();
    const r = await api('/api/student/save', { state: S, summary: summary(), nickname: SESS.nickname }, { token: SESS.token, keepalive });
    cloudBusy = false;
    if (r.ok) { S.cloudAt = r.server_now || S.savedAt; cloudWarned = false; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
    else {
      cloudDirty = true;
      if (r.status === 401) { SESS = null; lsSet(SESS_KEY, null); toast('로그인이 풀렸어요. 다음에 시작할 때 다시 들어와 주세요.', 3200); }
      else if (!cloudWarned) { cloudWarned = true; toast('인터넷이 연결되지 않아 이 기기에 먼저 저장해 둘게요.', 2800); }
    }
  }
  setInterval(() => { if (cloudDirty && SESS) cloudFlush(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (document.hidden && cloudDirty && SESS) cloudFlush(true); });
  function adoptState(st) {
    const intro = S.introSeen, settings = S.settings;
    S = migrate(st || {}); S.introSeen = intro || S.introSeen; if (!st) { S.createdAt = now(); S.cardAt[0] = now(); S.settings = settings; }
    S.account = acct(SESS); S.name = SESS.nickname; setCourse(S.course); Q = null; save();
  }
  async function resumeCloud(after) {
    go('home'); toast('기록을 불러오는 중…', 1200);
    const r = await api('/api/student/state', undefined, { token: SESS.token });
    if (r.ok) {
      clockOffset = (r.server_now || Date.now()) - Date.now();
      const mine = S.account === acct(SESS);
      if (!mine || !(S.savedAt && S.savedAt > (r.updated_at || 0) && cloudDirty)) { if (r.state || !mine) adoptState(r.state); }
      S.name = r.nickname || S.name; SESS.nickname = S.name; lsSet(SESS_KEY, SESS);
      after(); if (mine && cloudDirty) cloudFlush();
    } else if (r.status === 401) { SESS = null; lsSet(SESS_KEY, null); go('home'); loginScreen(after); }
    else { toast('인터넷이 연결되지 않아 이 기기의 기록으로 시작해요.', 2800); after(); }
  }
  const OFFICES = [['', '전국'], ['B10', '서울'], ['C10', '부산'], ['D10', '대구'], ['E10', '인천'], ['F10', '광주'], ['G10', '대전'], ['H10', '울산'], ['I10', '세종'], ['J10', '경기'], ['K10', '강원'], ['M10', '충북'], ['N10', '충남'], ['P10', '전북'], ['Q10', '전남'], ['R10', '경북'], ['S10', '경남'], ['T10', '제주']];
  function schoolPickerHTML(id) {
    const last = lsGet(LAST_SCHOOL);
    const off = last && last.code ? (last.code.match(/^(?:M-)?([A-Z]\d{2})/) || [])[1] || '' : '';
    return `<div class="sp" id="${id}" ${last ? `data-code="${esc(last.code)}" data-name="${esc(last.name)}"` : ''}>
      <div class="sp-row"><select class="field sp-office" id="${id}-o" aria-label="시·도">${OFFICES.map(([c, n]) => `<option value="${c}" ${c === off ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <input class="field sp-input" id="${id}-q" placeholder="학교 이름" autocomplete="off" value="${last ? esc(last.name) : ''}" aria-label="학교 이름 검색"><button type="button" class="btn sp-go" data-sp="${id}">검색</button></div>
      <div class="sp-sel">${last ? `✅ <b>${esc(last.name)}</b> <small>${esc(last.addr || '')}</small>` : '<small>시·도를 고르고 학교를 검색해서 골라 주세요</small>'}</div>
      <div class="sp-list"></div></div>`;
  }
  let spT = null;
  async function spSearch(box) {
    const q = box.querySelector('.sp-input').value.trim().replace(/초등학교$|초$/, '');
    const office = box.querySelector('.sp-office').value;
    const list = box.querySelector('.sp-list');
    if (q.length < 2) { list.innerHTML = '<p class="sp-msg">2글자 이상 적어 주세요.</p>'; return; }
    list.innerHTML = '<p class="sp-msg">찾는 중…</p>';
    const r = await api('/api/schools?q=' + encodeURIComponent(q) + (office ? '&office=' + office : ''));
    if (!r.ok) { list.innerHTML = `<p class="sp-msg">${esc(r.error || '검색이 안 돼요.')}</p>`; return; }
    const manual = `<button type="button" class="sp-item manual" data-act="spmanual" data-sp="-">✏️ 목록에 없어요 · <b>${esc(q)}초등학교</b>(으)로 직접 등록${office ? '' : ' <small>(시·도를 먼저 고르면 더 정확해요)</small>'}</button>`;
    list.innerHTML = (r.schools.length ? r.schools.map(x => `<button type="button" class="sp-item" data-act="spick" data-code="${esc(x.code)}" data-name="${esc(x.name)}" data-addr="${esc(x.addr || x.region)}"><b>${esc(x.name)}</b><small>${esc(x.addr || x.region)} · ${esc(x.office)}</small></button>`).join('')
      + (r.limited && r.schools.length >= 5 ? `<p class="sp-msg">결과가 5개까지만 보여요. ${office ? '이름을 더 자세히 적어 보세요.' : '위에서 시·도를 고르면 찾기 쉬워요.'}</p>` : '')
      : '<p class="sp-msg">찾는 학교가 없어요. 이름을 다시 확인하거나 시·도를 바꿔 보세요.</p>') + manual;
  }
  document.addEventListener('input', e => { if (e.target.classList && e.target.classList.contains('sp-input')) { const box = e.target.closest('.sp'); delete box.dataset.code; box.querySelector('.sp-sel').innerHTML = '<small>학교를 검색해서 골라 주세요</small>'; clearTimeout(spT); spT = setTimeout(() => spSearch(box), 450); } });
  document.addEventListener('click', e => { const b = e.target.closest('[data-sp]'); if (b && b.dataset.sp !== '-') spSearch(document.getElementById(b.dataset.sp)); });
  document.addEventListener('change', e => { if (e.target.classList && e.target.classList.contains('sp-office')) { const box = e.target.closest('.sp'); if (box.querySelector('.sp-input').value.trim().length >= 2) spSearch(box); } });
  const opts = (n, sel, unit) => Array.from({ length: n }, (_, k) => `<option value="${k + 1}" ${k + 1 === sel ? 'selected' : ''}>${k + 1}${unit}</option>`).join('');
  function classSelectHTML(prefix, withNum) {
    const last = lsGet(LAST_SCHOOL) || {};
    return `<div class="cls-row"><label>학년<select class="field" id="${prefix}-g">${opts(6, last.grade || 4, '학년')}</select></label>
      <label>반<select class="field" id="${prefix}-c">${opts(20, last.cls || 1, '반')}</select></label>
      ${withNum ? `<label>번호<select class="field" id="${prefix}-n">${opts(40, 1, '번')}</select></label>` : ''}</div>`;
  }
  function loginScreen(after) {
    const ov = document.createElement('div'); ov.className = 'loginov';
    ov.innerHTML = `<form class="loginbox" id="slogin" autocomplete="off">
      <img class="login-logo" src="${AQ_LOGO}" alt="">
      <h3>모험을 시작해요!</h3>
      <p class="sub">처음이면 새 모험이 시작되고, 전에 했다면 <b>어느 기기에서든</b> 이어서 할 수 있어요.</p>
      <label class="lb">우리 학교</label>${schoolPickerHTML('sp-s')}
      ${classSelectHTML('s', true)}
      <label class="lb" for="s-nick">닉네임 <small>(진짜 이름 대신 별명도 좋아요)</small></label>
      <input class="field" id="s-nick" maxlength="10" placeholder="예: 사과용사" value="${esc(S.name || '')}">
      <label class="lb" for="s-pin">비밀번호 숫자 4자리 <small>(꼭 기억해 두세요!)</small></label>
      <input class="field pin" id="s-pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="••••">
      <p class="login-err" id="s-err"></p>
      <button class="btn" type="submit">시작하기</button>
      <p class="login-note">학교·반·번호와 비밀번호는 내 캐릭터를 지키는 열쇠예요. 친구에게 알려 주지 마세요.</p>
    </form>`;
    layer.append(ov);
    loginScreen.after = after;
  }
  async function studentLoginSubmit(form) {
    const box = form.querySelector('.sp'), err = form.querySelector('#s-err'), btn = form.querySelector('[type=submit]');
    const body = { school_code: box.dataset.code, school_name: box.dataset.name, grade: +$('#s-g').value, cls: +$('#s-c').value, num: +$('#s-n').value, nickname: $('#s-nick').value.trim(), pin: $('#s-pin').value.trim() };
    if (!body.school_code) { err.textContent = '학교를 검색해서 목록에서 골라 주세요.'; return; }
    if (!body.nickname) { err.textContent = '닉네임을 적어 주세요.'; return; }
    if (!/^\d{4}$/.test(body.pin)) { err.textContent = '비밀번호는 숫자 4자리로 적어 주세요.'; return; }
    btn.disabled = true; err.textContent = '';
    const r = await api('/api/student/login', body);
    btn.disabled = false;
    if (!r.ok) {
      err.textContent = r.error || '들어가지 못했어요.'; AU.bad();
      if (r.offline || r.status >= 500) { // 서버가 잠시 안 될 때도 공부는 할 수 있게
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ghost'; b.style.marginTop = '8px'; b.textContent = '이 기기에서 먼저 하기 (나중에 다시 로그인)';
        b.onclick = () => { S.name = body.nickname; save(); form.closest('.loginov').remove(); toast('이 기기에 먼저 저장해요. 다음에 로그인하면 이어서 할 수 있어요.', 3000); const a = loginScreen.after; loginScreen.after = null; a && a(); };
        err.append(document.createElement('br'), b);
      }
      return;
    }
    const last = lsGet(LAST_SCHOOL) || {}; lsSet(LAST_SCHOOL, { ...last, code: body.school_code, name: body.school_name, grade: body.grade, cls: body.cls });
    clockOffset = (r.server_now || Date.now()) - Date.now();
    const hadLocal = !S.account && S.exp > 0; // 서버 연결 전 이 기기에서 하던 기록은 새 계정으로 옮겨 줌
    SESS = { token: r.token, school_code: body.school_code, school_name: body.school_name, grade: body.grade, cls: body.cls, num: body.num, nickname: r.nickname };
    lsSet(SESS_KEY, SESS);
    if (r.created && hadLocal) { S.account = acct(SESS); S.name = r.nickname; save(); }
    else adoptState(r.state);
    form.closest('.loginov').remove(); AU.good();
    toast(r.created ? `환영해요, ${esc(r.nickname)}! 새 모험을 시작해요.` : `다시 만나서 반가워요, ${esc(r.nickname)}!`, 2400);
    cloudFlush();
    const a = loginScreen.after; loginScreen.after = null; a && a();
  }

  /* 선생님 탭 */
  function sheetFormula() { return TS ? `=IMPORTDATA("${API}/api/export.csv?key=${TS.export_key}")` : ''; }
  async function loadTeach() {
    if (!TS) return;
    TERR = '불러오는 중…'; renderTeach();
    const r = await api('/api/teacher/students', undefined, { token: TS.token });
    if (r.ok) { TLIST = r.students; TS.export_key = r.export_key || TS.export_key; lsSet(TSESS_KEY, TS); TERR = ''; }
    else if (r.status === 401) { TS = null; lsSet(TSESS_KEY, null); TERR = '다시 로그인해 주세요.'; }
    else TERR = r.error;
    if (view === 'tch') renderTeach();
  }
  function renderTeach() {
    let h = `<div class="screen-title"><button class="back" data-act="go" data-v="me" aria-label="뒤로">←</button><div><h2>선생님 탭</h2><p>우리 반 아이들의 학습 현황을 확인해요</p></div></div>`;
    if (!API) { main.innerHTML = h + `<div class="glass" style="color:#eef3ff;line-height:1.6">학급 서버가 연결되면 사용할 수 있어요.<br><small style="color:#a9bce0">제작자가 서버 주소를 설정하면 열려요.</small></div>`; return; }
    if (!TS) {
      h += `<div class="tabs"><button class="${TV === 'login' ? 'on' : ''}" data-act="ttab" data-v="login">로그인</button><button class="${TV === 'reg' ? 'on' : ''}" data-act="ttab" data-v="reg">처음 등록하기</button></div>
        <form class="glass tform" id="${TV === 'login' ? 'tlogin' : 'treg'}" autocomplete="off">
          <label class="lb">학교</label>${schoolPickerHTML('sp-t')}
          ${classSelectHTML('t', false)}
          ${TV === 'reg' ? `<label class="lb" for="t-name">선생님 성함</label><input class="field" id="t-name" maxlength="20" placeholder="예: 김사과">
            <label class="lb" for="t-contact">연락처 <small>(선택 · 승인 안내용 이메일 등)</small></label><input class="field" id="t-contact" maxlength="60" placeholder="예: teacher@school.kr">` : ''}
          <label class="lb" for="t-pw">선생님 비밀번호 ${TV === 'reg' ? '<small>(6자 이상, 새로 정해요)</small>' : ''}</label><input class="field" id="t-pw" type="password" maxlength="40">
          <p class="login-err" id="t-err">${esc(TERR)}</p>
          <button class="btn" type="submit">${TV === 'login' ? '들어가기' : '등록 요청 보내기'}</button>
          <p class="login-note">${TV === 'reg' ? '등록 요청을 보내면 제작자가 확인한 뒤 승인해요. 승인되면 같은 학교·학년·반과 비밀번호로 들어올 수 있어요. 다른 반 학생 정보는 볼 수 없어요.' : '아직 등록하지 않았다면 "처음 등록하기"를 눌러 주세요.'}</p>
        </form>`;
      main.innerHTML = h; return;
    }
    const L2 = TLIST || [];
    const today = new Date(now()); today.setHours(0, 0, 0, 0);
    const active = L2.filter(x => x.lastStudy && x.lastStudy >= today.getTime()).length;
    const accAvg = L2.length ? Math.round(L2.reduce((a, x) => a + (x.accuracy || 0), 0) / L2.length) : 0;
    const needReview = L2.filter(x => !x.lastStudy || now() - x.lastStudy > 7 * L.DAY).length;
    h += `<div class="glass tinfo"><b>🏫 ${esc(TS.school_name)} ${TS.grade}학년 ${TS.cls}반</b><span>${esc(TS.teacher_name || '')} 선생님</span></div>
      <div class="stats" style="margin-top:10px"><div class="stat"><small>등록 학생</small><b>${L2.length}<em>명</em></b></div><div class="stat"><small>오늘 학습</small><b>${active}<em>명</em></b></div>
      <div class="stat"><small>평균 정답률</small><b>${accAvg}<em>%</em></b></div><div class="stat"><small>7일 넘게 쉼</small><b>${needReview}<em>명</em></b></div></div>
      ${TERR ? `<p class="sv-note">${esc(TERR)}</p>` : ''}
      <div class="section-h">우리 반 학생</div>
      <div class="ttable-wrap"><table class="ttable"><thead><tr><th>번호</th><th>닉네임</th><th>교재</th><th>단계</th><th>Lv</th><th>완료</th><th>정답률</th><th>마지막 학습</th><th>자주 틀린 단어</th><th></th></tr></thead><tbody>
      ${L2.map(x => `<tr><td>${x.num}</td><td>${esc(x.nickname)}${x.pin_reset ? ' <small class="tag-reset">비번 초기화됨</small>' : ''}</td><td>${esc(x.course || '-')}</td><td>${esc(x.stage || '풋애플')}</td><td>${x.level || 1}</td><td>${x.unitsDone || 0}/11</td><td>${x.accuracy || 0}%</td><td>${fmtDate(x.lastStudy)}</td><td class="tw">${esc((x.wrongTop || []).slice(0, 3).join(', '))}</td>
        <td class="tact"><button data-act="tpin" data-v="${x.id}" data-n="${x.num}">비번 초기화</button><button data-act="tdel" data-v="${x.id}" data-n="${x.num}">삭제</button></td></tr>`).join('') || '<tr><td colspan="10" style="text-align:center;padding:16px">아직 들어온 학생이 없어요.</td></tr>'}
      </tbody></table></div>
      <div class="row-btns"><button class="btn ghost" data-act="treload">🔄 새로고침</button><button class="btn ghost" data-act="tcsv">📋 표 복사</button></div>
      <div class="section-h">📊 구글 시트로 보기</div>
      <div class="glass gsheet"><ol><li><a href="https://sheets.new" target="_blank" rel="noopener">새 구글 시트</a>를 만들어요.</li><li>아래 수식을 복사해서 <b>A1 칸</b>에 붙여 넣어요.</li><li>우리 반 기록이 표로 들어오고, 시트를 열 때마다 새로 갱신돼요.</li></ol>
        <code class="formula">${esc(sheetFormula())}</code>
        <button class="btn" data-act="tcopyf">수식 복사하기</button>
        <p class="login-note">이 수식에는 우리 반 전용 열쇠가 들어 있어요. 다른 사람과 공유하지 마세요.</p></div>
      <div class="row-btns"><button class="btn danger" data-act="tdelall">학년 말: 우리 반 기록 모두 지우기</button></div>
      <div class="row-btns"><button class="btn ghost" data-act="tlogout">로그아웃</button></div>`;
    main.innerHTML = h;
  }
  async function teacherSubmit(form) {
    const reg = form.id === 'treg', box = form.querySelector('.sp'), err = form.querySelector('#t-err'), btn = form.querySelector('[type=submit]');
    const body = { school_code: box.dataset.code, school_name: box.dataset.name, grade: +$('#t-g').value, cls: +$('#t-c').value, password: $('#t-pw').value };
    if (!body.school_code) { err.textContent = '학교를 검색해서 목록에서 골라 주세요.'; return; }
    if (reg) { body.teacher_name = $('#t-name').value.trim(); body.contact = $('#t-contact').value.trim(); }
    btn.disabled = true; err.textContent = '';
    const r = await api(reg ? '/api/teacher/register' : '/api/teacher/login', body);
    btn.disabled = false;
    if (!r.ok) { err.textContent = r.error; return; }
    const last = lsGet(LAST_SCHOOL) || {}; lsSet(LAST_SCHOOL, { ...last, code: body.school_code, name: body.school_name, grade: body.grade, cls: body.cls });
    if (reg) { TV = 'login'; TERR = ''; renderTeach(); openSheet(`<h3>등록 요청을 보냈어요</h3><p class="sub">${esc(body.school_name)} ${body.grade}학년 ${body.cls}반<br>제작자가 확인하고 승인하면 같은 정보와 비밀번호로 로그인할 수 있어요.</p><div class="row-btns"><button class="btn" data-act="closeSheet">확인</button></div>`); return; }
    TS = { token: r.token, school_name: r.school_name, grade: r.grade, cls: r.cls, teacher_name: r.teacher_name, export_key: r.export_key };
    lsSet(TSESS_KEY, TS); TERR = ''; loadTeach();
  }

  /* 제작자: 선생님 승인 · 전체 응답 */
  async function loadAdmin() {
    remoteState = '불러오는 중…'; if (view === 'teacher') renderTeacher();
    const [t, sv] = await Promise.all([api('/api/admin/teachers', undefined, { admin: adminPw }), api('/api/admin/surveys', undefined, { admin: adminPw })]);
    if (t.ok) ADMIN = t; if (sv.ok) remoteSurveys = sv.surveys.map(x => ({ t: new Date(x.created_at).toLocaleString('ko-KR') + (x.school_name ? ' · ' + x.school_name : ''), r: x.rating, c: x.comment || '' })).reverse();
    remoteState = t.ok && sv.ok ? '' : (t.error || sv.error || '서버에서 불러오지 못했어요.');
    if (view === 'teacher') renderTeacher();
  }
  async function adminDecide(id, ok) {
    const r = await api('/api/admin/decide', { id, approve: ok }, { admin: adminPw });
    toast(r.ok ? (ok ? '승인했어요' : '거절했어요') : r.error); loadAdmin();
  }
  function adminTeachersHTML() {
    if (!ADMIN) return `<div class="section-h">👩‍🏫 선생님 등록 승인</div><div class="glass" style="color:#a9bce0">불러오는 중…</div>`;
    const ST = { pending: '승인 대기', approved: '승인됨', rejected: '거절됨' };
    const pend = ADMIN.teachers.filter(x => x.status === 'pending').length;
    return `<div class="section-h">👩‍🏫 선생님 등록 승인 ${pend ? `<span class="badge-n">${pend}</span>` : ''}</div>
      <div class="glass approvals"><p class="sv-note" style="margin:0 0 8px">전체 학생 ${ADMIN.students}명 · 등록 반 ${ADMIN.teachers.filter(x => x.status === 'approved').length}개</p>
      <button class="btn ghost" data-act="abackup" style="margin-bottom:6px">💾 전체 백업 받기 (모든 학교·학생·선생님·만족도)</button>
      ${ADMIN.teachers.map(x => `<div class="ap-row ${x.status}"><div><b>${esc(x.school_name)} ${x.grade}학년 ${x.cls}반</b><small>${esc(x.teacher_name || '')}${x.contact ? ' · ' + esc(x.contact) : ''} · ${new Date(x.created_at).toLocaleDateString('ko-KR')}</small></div>
        <span class="st ${x.status === 'approved' ? 'done' : x.status === 'pending' ? 'studying' : 'locked'}">${ST[x.status]}</span>
        <div class="ap-btns">${x.status !== 'approved' ? `<button data-act="adecide" data-v="${x.id}" data-ok="1">승인</button>` : ''}${x.status !== 'rejected' ? `<button data-act="adecide" data-v="${x.id}" data-ok="0">${x.status === 'approved' ? '승인 취소' : '거절'}</button>` : ''}</div></div>`).join('') || '<p class="sv-note">아직 등록 요청이 없어요.</p>'}</div>`;
  }

  /* ---------- 시작 ---------- */
  function afterGate() {
    if (!S.course) { go('home'); coursePicker(afterGate, true); return; }
    setCourse(S.course);
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
  /* ---------- 교재 고르기 ---------- */
  function coursePicker(after, first) {
    const ov = document.createElement('div'); ov.className = 'courseov';
    const rec = SESS ? 'g' + SESS.grade : '';
    ov.innerHTML = `<div class="coursebox">
      <img class="login-logo" src="${AQ_LOGO}" alt="">
      <h3>${first ? '어떤 교재로 모험할까요?' : '교재 바꾸기'}</h3>
      <p class="sub">${first ? '내 학년이나 우리 반 교과서를 골라요. 나중에 나의 성장에서 바꿀 수 있어요.' : '교재를 바꿔도 캐릭터·경험치·카드는 그대로예요. 단원 진도는 교재마다 따로 기록돼요.'}</p>
      <div class="course-grid">${COURSES.map(c => `<button class="course-btn ${c.key === 'cj4' ? 'tb' : ''} ${S.course === c.key ? 'cur' : ''} ${rec === c.key ? 'rec' : ''}" data-c="${c.key}">
        <b>${c.label}</b><small>${c.sub}</small>${S.course === c.key ? '<i>지금 교재</i>' : rec === c.key ? '<i>내 학년</i>' : ''}</button>`).join('')}</div>
      ${first ? '' : '<button class="btn ghost" data-c="">닫기</button>'}
    </div>`;
    layer.append(ov);
    ov.addEventListener('click', e => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      AU.tap();
      if (b.dataset.c) {
        const changed = S.course !== b.dataset.c;
        S.course = b.dataset.c; setCourse(S.course); if (changed) { Q = null; SD.unit = null; }
        save(); cloudFlush();
        toast(`📚 ${COURSE.label}으로 공부해요!`, 1800);
      }
      if (!b.dataset.c && first) return;
      ov.remove(); after && after();
    });
  }

  /* ---------- 나가기 · 만족도 조사 ---------- */
  const HEART_LABEL = ['', '아쉬웠어요', '조금 아쉬워요', '괜찮았어요', '재미있었어요', '최고예요!'];
  function copyrightHTML() {
    return `<p class="copyright">© 2026 ${CREATOR}. 「애플왕의 진화 모험 — English Quest」의 기획, 디자인, 캐릭터, 영상, 프로그램에 대한 저작권과 모든 권리는 제작자 ${CREATOR}에게 있습니다.
      학교 수업과 같은 비영리 교육 목적의 이용은 환영하지만, 제작자의 허락 없이 복제·수정·재배포하거나 상업적으로 이용할 수 없습니다.
      영어 단어와 문장은 초등학교 4학년 영어 교육과정을 참고해 정리했으며, 교과서 원문의 저작권은 해당 저작권자에게 있습니다.</p>`;
  }
  function openExit() {
    clearTimeout(autoNextT);
    const ov = document.createElement('div'); ov.className = 'exitov';
    let rating = 0;
    ov.innerHTML = `<div class="exitbox">
      <h3>오늘 모험은 어땠나요?</h3>
      <p class="exit-sub">하트를 눌러 만족도를 알려 주세요. <b>(필수)</b></p>
      <div class="hearts" role="radiogroup" aria-label="만족도">${[1, 2, 3, 4, 5].map(k => `<button class="heart" data-h="${k}" role="radio" aria-checked="false" aria-label="하트 ${k}개"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21 C 6 16.5 2 13 2 8.5 A5 5 0 0 1 12 6 A5 5 0 0 1 22 8.5 C 22 13 18 16.5 12 21Z"/></svg></button>`).join('')}</div>
      <p class="heart-label" id="hlabel">하트를 눌러 주세요</p>
      <label class="exit-sub" for="exit-comment">하고 싶은 말이 있다면 남겨 주세요. (선택)</label>
      <textarea id="exit-comment" class="field exit-ta" maxlength="200" placeholder="예: 진화 장면이 멋졌어요! 문제가 조금 더 많았으면 좋겠어요."></textarea>
      <div class="row-btns"><button class="btn ghost" data-e="stay">계속 할래요</button><button class="btn" data-e="send" disabled>보내고 나가기</button></div>
    </div>`;
    layer.append(ov);
    const send = ov.querySelector('[data-e=send]');
    ov.addEventListener('click', e => {
      const h = e.target.closest('[data-h]');
      if (h) {
        rating = +h.dataset.h; AU.tap();
        ov.querySelectorAll('.heart').forEach(x => { const on = +x.dataset.h <= rating; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(+x.dataset.h === rating)); });
        ov.querySelector('#hlabel').textContent = HEART_LABEL[rating]; send.disabled = false; return;
      }
      const b = e.target.closest('[data-e]'); if (!b) return;
      if (b.dataset.e === 'stay') { ov.remove(); return; }
      if (b.dataset.e === 'send') {
        if (!rating) { toast('하트를 1개 이상 눌러 주세요'); return; }
        const comment = ov.querySelector('#exit-comment').value.trim().slice(0, 200);
        submitSurvey(rating, comment); ov.remove(); showThanks();
      }
    });
  }
  function submitSurvey(r, c) {
    S.surveys = S.surveys || []; S.surveys.push({ r, c, t: now() }); if (S.surveys.length > 100) S.surveys.shift(); save();
    if (API) { api('/api/survey', { rating: r, comment: c, school_name: SESS ? SESS.school_name : '', info: `Lv.${L.level(S.exp)} · ${STAGES[S.stage].name} · 완료 단원 ${L.unitsDone(S)}` }, { keepalive: true }); cloudFlush(true); }
    if (!SURVEY.formAction) return;
    try {
      const fd = new URLSearchParams();
      fd.append(SURVEY.entryRating, String(r));
      if (SURVEY.entryComment) fd.append(SURVEY.entryComment, c);
      if (SURVEY.entryInfo) fd.append(SURVEY.entryInfo, `Lv.${L.level(S.exp)} · ${STAGES[S.stage].name} · 완료 단원 ${L.unitsDone(S)}`);
      fetch(SURVEY.formAction, { method: 'POST', mode: 'no-cors', body: fd }).catch(() => {});
    } catch (e) {}
  }
  function showThanks() {
    AU.bgm(false); AU.fanfare();
    const ov = document.createElement('div'); ov.className = 'thanks';
    ov.innerHTML = `<div class="thanks-in">
      ${SHOP.dressed(S.stage, IMG[S.stage], S.wear, STAGES[S.stage].name, 'thx-char')}
      <h3>함께해 줘서 고마워요!</h3>
      <p>오늘도 영어 모험에 함께해 주셔서 진심으로 감사합니다.<br>
      여러분이 익힌 단어와 문장 하나하나가 ${STAGES[S.stage].name}을 더 크고 멋지게 키워 주었어요.<br>
      소중한 의견은 더 재미있는 모험을 만드는 데 꼭 반영할게요.<br>
      다음에도 사과숲에서 또 만나요!</p>
      <p class="sign">— ${CREATOR} 드림</p>
      <button class="btn" data-th="home">처음 화면으로</button>
      <p class="close-note">이제 창을 닫아도 괜찮아요. ${SESS ? '기록은 학급 서버에 저장되어 어느 기기에서든 이어서 할 수 있어요.' : '기록은 이 기기에 저장되어 있어요.'}</p>
      ${copyrightHTML()}
    </div>`;
    layer.append(ov);
    ov.addEventListener('click', e => {
      if (!e.target.closest('[data-th=home]')) return;
      ov.remove(); closeSheet(); Q = null; boot();
    });
  }

  function boot() {
    const t = document.createElement('div'); t.className = 'title';
    const returning = S.name && S.introSeen;
    t.style.setProperty('--tbg', `url(${AQ_TITLE})`);
    t.innerHTML = `<div class="frame916"><div class="title-bg" style="background-image:url(${AQ_TITLE})"></div><div class="title-shade"></div>
      ${Array.from({ length: 12 }, (_, k) => `<i class="tspark" style="left:${(k * 37) % 100}%;top:${40 + (k * 53) % 55}%;animation-delay:${(k % 6) * .5}s"></i>`).join('')}
      <div class="title-bottom">
        ${SESS ? `<p class="title-hello">${esc(SESS.school_name)} ${SESS.grade}-${SESS.cls} ${SESS.num}번 ${esc(SESS.nickname)}의 ${STAGES[S.stage].name}이 기다리고 있어요!</p>` : returning && !API ? `<p class="title-hello">${esc(S.name)}의 ${STAGES[S.stage].name}이 기다리고 있어요!</p>` : ''}
        <button class="startgame" data-t="start"><span>게임 시작하기</span></button>
        <div class="title-links"><button class="title-sound" data-t="sound">${S.settings.sound ? '🔊 소리 켜짐' : '🔇 소리 꺼짐'}</button>${SESS ? '<button class="title-sound" data-act="switchkid">👥 다른 친구로 시작하기</button>' : ''}</div>
      </div></div>`;
    layer.append(t);
    const proceed = () => {
      AU.bgm(true);
      if (API) { if (SESS) resumeCloud(afterGate); else { go('home'); loginScreen(afterGate); } return; }
      if (!S.name) { go('home'); nameSheet(afterGate); } else afterGate();
    };
    t.addEventListener('click', e => {
      const b = e.target.closest('[data-t]'); if (!b) return;
      AU.init(); AU.tap();
      if (b.dataset.act) return;
      if (b.dataset.t === 'sound') { S.settings.sound = !S.settings.sound; S.settings.music = S.settings.sound; save(); b.textContent = S.settings.sound ? '🔊 소리 켜짐' : '🔇 소리 꺼짐'; return; }
      t.remove();
      playIntro(proceed); // 게임 시작하기 → 언제나 인트로 영상부터
    });
  }
  window.__AQ = { get S() { return S; }, set S(v) { S = v; }, go, ACT, cloudFlush, playEvolution, playIntro, L, render, save, get Q() { return Q; } };
  boot();
})();
