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
  const CONTEST = !!window.AQ_CONTEST;
  const KEY = CONTEST ? 'aq-contest-v1' : 'aq-apple-quest-v1'; // 체험판은 저장 공간도 따로
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
  function startDaily() { // ③ 오늘의 복습 3문제 (체험판)
    let ids = L.doneIds(S);
    const wrongUnits = [...new Set(Object.values(S.wrong).map(w => w.unit))];
    ids = [...new Set(ids.concat(wrongUnits, [currentUnit().id]))].filter(id => isOpen(id) && UNITS.some(u => u.id === id));
    Q = { mode: 'daily', units: ids, list: L.buildMixed(UNITS, ids, 3, now() & 0xffff, 'review', S.wrong), i: 0, results: [], combo: 0, first: true, phase: 'ask' }; quietify();
    closeSheet(); go('play');
    setTimeout(() => { setMood('cheer'); say('오늘의 복습 3문제! 금방 끝나요!'); }, 300);
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
      const u = S.units[Q.unit]; const N = Q.list.length, off = Q.setIdx * N;
      tag = `<span class="lesson">Lesson ${unitNo(Q.unit)}</span>`;
      for (let k = 0; k < N * 2; k++) {
        let c = '';
        if (k < off) c = u && u.sets[0] ? 'ok' : '';
        else if (k >= off + N) c = u && u.sets[1] ? 'ok' : '';
        else { const r = Q.results[k - off]; c = r || (k - off === Q.i ? 'cur' : ''); }
        dots += `<i class="${c}"></i>`;
      }
      label = `${Math.min(off + Q.i + 1, N * 2)} / ${N * 2}`;
    } else {
      tag = Q.mode === 'boss' ? `<span class="lesson boss">Boss</span>` : Q.mode === 'daily' ? `<span class="lesson review">Daily</span>` : `<span class="lesson review">Review</span>`;
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
      case 'phonics': return `<div class="qshow banner ph-q"><span class="ph-word"><b class="ph-blank">${'?'.repeat(q.blankLen)}</b>${esc(q.show)}</span><small class="ph-hint">${esc(q.hint)}</small></div>${opts(q.options)}`;
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
    } else if (Q.mode === 'daily') {
      const D = R.daily || {};
      title = D.first ? `오늘의 복습 완료! 🔥 ${D.streak}일 연속` : '오늘의 복습 한 번 더 완료!';
      sub = `${R.ok} / ${R.n} 정답 · 경험치 +${R.gain}${R.coins ? ` · 🍎 +${R.coins}` : ''}${D.bonus ? ' · 5일 연속 보너스!' : ''}`;
      btns += `<button class="btn" data-act="battle">⚔️ 애플왕과 대결</button><button class="btn" data-act="review">복습 더 하기</button>`;
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
        <div class="row-btns">${CONTEST ? '<button class="btn ai-btn" data-act="aiexplain">🤖 AI 선생님</button>' : ''}<button class="btn" data-act="retry">다시 도전</button><button class="btn ghost" data-act="next">다음 ▶</button></div>`;
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
        gain = L.award(S, q.id, Q.mode === 'set' ? 'basic' : Q.mode === 'daily' ? 'review' : Q.mode, now());
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
    } else if (Q.mode === 'daily') {
      R.daily = L.completeDaily(S, ok, n, t);
      L.markStudy(S, t, ok >= n - 1 ? 'review' : 'basic'); touchDay();
      if (R.daily.first) AU.fanfare();
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
    ov.innerHTML = `<div class="frame916"><video id="introVideo" playsinline webkit-playsinline preload="auto" src="${CONTEST ? '../intro.mp4' : 'intro.mp4'}"></video>
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
  const NAVMAP = { home: 'home', play: 'quiz', units: 'units', study: 'study', quiz: 'quiz', dex: 'dex', me: 'me', forest: 'home', shop: 'me', village: 'home', phonics: 'units', lessons: 'units', lchap: 'units', lact: 'units', battle: 'units', boss: 'units', teacher: 'me', tch: 'me' };
  function go(v, arg) {
    if (Q && Q.mode === 'boss' && v !== 'boss') Q = null;
    if (v !== 'battle' && BT) { clearInterval(BT.iv); BT = null; }
    if (Q && Q.phase === 'result' && v !== 'play' && v !== 'home') Q = null;
    stopForest();
    view = v; viewArg = arg;
    document.body.classList.toggle('on-stage', v === 'home' || v === 'play');
    clearTimeout(autoNextT);
    document.querySelectorAll('.nav button').forEach(b => b.classList.toggle('on', b.dataset.v === NAVMAP[v]));
    render(); main.scrollTop = 0;
  }
  function render() {
    ({ home: renderHome, play: renderHome, units: renderUnits, study: renderStudy, quiz: renderQuizHub, dex: renderDex, me: renderMe, forest: renderForest, shop: renderShop, village: renderVillage, phonics: renderPhonics, lessons: renderLessons, lchap: renderLchap, lact: renderLact, battle: renderBattle, boss: renderBoss, teacher: renderTeacher, tch: renderTeach }[view] || renderHome)();
    updateHUD();
    if (CONTEST) aiFab();
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
      ${CONTEST ? (() => { const di = L.dailyInfo(S, now()); return `<button class="s-forest s-row s-daily ${di.done ? 'done' : 'todo'}" style="${P(22, 828, 156, 878)}" data-act="daily" aria-label="오늘의 복습 3문제"><span>${di.done ? '✅' : '📅'}</span>${di.done ? (di.streak ? di.streak + '일째' : '복습 끝') : '오늘 복습'}</button>`; })() : ''}
      <button class="s-forest ${CONTEST ? 's-row' : ''}" style="${CONTEST ? P(22, 886, 156, 936) : P(22, 832, 156, 908)}" data-act="go" data-v="forest"><span>🌳</span>사과숲</button>
      <button class="s-forest s-village ${CONTEST ? 's-row' : ''} ${L.hungerNow(S, now()) < 30 ? 'alert' : ''}" style="${CONTEST ? P(22, 944, 156, 994) : P(22, 918, 156, 994)}" data-act="go" data-v="village"><span>🏘️</span>마을</button>
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
        ${CONTEST ? `<button class="ai-chip" data-act="aihelp" aria-label="AI 도우미">${AI_ICON}<span class="ai-txt"><b>AI 도우미</b></span><i class="ai-spk"></i></button>` : ''}
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
      const u = S.units[Q.unit], N = Q.list.length, off = Q.setIdx * N;
      tag = `Lesson ${unitNo(Q.unit)}`;
      for (let k = 0; k < N * 2; k++) {
        let c = '';
        if (k < off) c = u && u.sets[0] ? 'ok' : ''; else if (k >= off + N) c = u && u.sets[1] ? 'ok' : '';
        else { const r = Q.results[k - off]; c = r || (k - off === Q.i && Q.phase !== 'result' ? 'cur' : ''); }
        dots += `<i class="${c}"></i>`;
      }
      label = `${Math.min(off + Q.i + 1, N * 2)}/${N * 2}`;
    } else {
      tag = Q.mode === 'boss' ? 'Boss' : Q.mode === 'daily' ? 'Daily' : 'Review';
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
      case 'phonics': banner = `<span class="s-ph"><span class="ph-word"><b class="ph-blank">${'?'.repeat(q.blankLen)}</b>${esc(q.show)}</span><small>${esc(q.hint)}</small></span>`; opts = L4(q.options); break;
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
      bn.innerHTML = `<span class="s-explain">${esc(q.explain)}</span><span class="s-fbtns">${CONTEST ? '<button class="s-next ai" data-act="aiexplain">🤖 AI</button>' : ''}<button class="s-next re" data-act="retry">다시</button><button class="s-next" data-act="next">다음 ▶</button></span>`;
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
    } else if (Q.mode === 'daily') {
      const D = R.daily || {};
      title = D.first ? `오늘의 복습 완료! 🔥 ${D.streak}일 연속` : '오늘의 복습 한 번 더 완료!';
      sub = `${R.ok} / ${R.n} 정답 · 경험치 +${R.gain}${R.coins ? ` · 🍎 +${R.coins}` : ''}${D.bonus ? ' · 5일 연속 보너스!' : ''}`;
      acts.push(['⚔️ 애플왕과 대결', 'battle', '']); acts.push(['복습 더 하기', 'review', '']);
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
      <span class="num">${u.icon}<b>${u.no}</b></span><span style="min-width:0"><h3>${esc(u.title)}</h3><p>${u.ko}${lessonFor(u.id) ? ` <em class="l-tag">📅 차시 복습 ${lessonCount(u.id)}</em>` : ''}</p><div class="bar"><i style="width:${pct}%"></i></div></span>
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
    if (CONTEST) { const di = L.dailyInfo(S, now()); html += `<div class="bt-entry"><button class="btn bt-go" data-act="battle">⚔️ 애플왕과 대결<small>배운 단어로 1:1 퀴즈 대결</small></button><button class="btn daily-go ${di.done ? 'done' : ''}" data-act="daily">${di.done ? '✅' : '📅'} 오늘의 복습<small>${di.done ? (di.streak ? `🔥 ${di.streak}일 연속` : '오늘 완료') : '3문제 · 🍎 보상'}</small></button></div>`; }
    html += `<div class="sem">시작하기 전에</div><div class="units"><button class="unit ph-unit" data-act="go" data-v="phonics"><span class="num">🔤<b>0</b></span><span style="min-width:0"><h3>Phonics · 파닉스 표</h3><p>글자를 누르면 소리와 입 모양을 볼 수 있어요</p></span><span class="st">▶</span></button></div>`;
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
      <button class="btn" data-act="set" data-u="${id}" data-s="0">⚔️ 세트 1 ${rec && rec.sets[0] ? '✅' : ''}<small>그림·뜻·빈칸·파닉스</small></button>
      <button class="btn" data-act="set" data-u="${id}" data-s="1">⚔️ 세트 2 ${rec && rec.sets[1] ? '✅' : ''}<small>듣기·순서·짝맞추기·파닉스</small></button>
      <button class="btn blue" data-act="review">🔁 복습 퀴즈<small>경험치 +${S.rules.expReview}</small></button></div>
      ${lessonFor(id) ? lessonSheetHTML(id) : ''}
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
    let html = `<div class="screen-title"><div><h2>퀴즈 도전</h2><p>6문제씩(파닉스 1문제 포함) 나눠서 풀어요. 틀려도 경험치는 줄지 않아요.</p></div></div>`;
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
      ${CONTEST ? `<div class="section-h">🎁 체험 도우미 (심사·시연용)</div>
      <p class="voice-note" style="margin-top:0">실제 학생들은 매일 공부해서 모으는 것들을, 체험판에서는 바로 볼 수 있게 해 두었어요.</p>
      <div class="grid2 demo-btns"><button class="btn" data-act="demo" data-v="coins">🍎 사과 +1000</button><button class="btn" data-act="demo" data-v="units">📚 이 교재 단원 모두 완료</button>
      <button class="btn" data-act="demo" data-v="evolve">✨ 다음 단계로 진화</button><button class="btn" data-act="demo" data-v="hungry">🍽️ 배고픈 상태 만들기</button>
      <button class="btn ghost" data-act="demo" data-v="decay">😴 하루 빠진 상태 만들기</button><button class="btn ghost" data-act="demo" data-v="reset">🔄 처음부터 다시</button></div>
      <button class="link" data-act="go" data-v="tch" style="margin-top:8px">👩‍🏫 선생님 탭 (체험판은 등록하면 바로 승인)</button>` : `<button class="link" data-act="go" data-v="tch" style="margin-top:8px">👩‍🏫 선생님 탭</button>
      <button class="link" data-act="teacher" style="margin-top:8px">🔒 제작자 관리실</button>`}
      <button class="link" data-act="exit" style="margin-top:8px">🚪 나가기</button>
      ${SESS ? '' : '<p class="voice-note">기록은 지금 이 기기의 브라우저에 저장돼요.</p>'}`;
  }

  /* ---------- AI 애플 도우미 (공모전 체험판) ---------- */
  const AIH = { log: [], busy: false };
  // AI 사과 로봇 아이콘(안테나 달린 사과)
  const AI_ICON = `<svg class="ai-ico" viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="aiA" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#ffd8cc"/><stop offset=".4" stop-color="#ff5a4a"/><stop offset="1" stop-color="#b01a2a"/></radialGradient><radialGradient id="aiS" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#e8fbff"/><stop offset="1" stop-color="#8ad8ff"/></radialGradient></defs>
    <path d="M32 14 L32 6" stroke="#3b2314" stroke-width="3" stroke-linecap="round"/><circle class="ai-ant" cx="32" cy="5" r="4" fill="#ffe14a" stroke="#3b2314" stroke-width="2"/>
    <path d="M32 18 C18 10 6 22 9 38 C12 54 24 60 32 56 C40 60 52 54 55 38 C58 22 46 10 32 18Z" fill="url(#aiA)" stroke="#3b2314" stroke-width="3"/>
    <path d="M36 15 Q46 6 52 14 Q44 18 36 15Z" fill="#6ec84a" stroke="#3b2314" stroke-width="2"/>
    <rect x="15" y="28" width="34" height="18" rx="9" fill="url(#aiS)" stroke="#3b2314" stroke-width="2.5"/>
    <circle class="ai-eye" cx="25" cy="37" r="3.4" fill="#2a3a8a"/><circle class="ai-eye" cx="39" cy="37" r="3.4" fill="#2a3a8a"/><circle cx="26.2" cy="35.8" r="1.1" fill="#fff"/><circle cx="40.2" cy="35.8" r="1.1" fill="#fff"/>
    <path d="M28 49 Q32 52 36 49" stroke="#3b2314" stroke-width="2.4" fill="none" stroke-linecap="round"/><ellipse cx="17" cy="24" rx="4" ry="6" fill="#fff" opacity=".55" transform="rotate(25 17 24)"/></svg>`;
  function aiFab() {
    let b = $('#aiFab');
    if (!b) { b = document.createElement('button'); b.id = 'aiFab'; b.className = 'ai-fab'; b.dataset.act = 'aihelp'; b.innerHTML = AI_ICON + '<b>AI 도우미</b>'; b.setAttribute('aria-label', 'AI 도우미'); $('#screen').append(b); }
    b.hidden = view === 'home' || view === 'play' || view === 'teacher' || view === 'tch' || view === 'lessons' || view === 'lchap' || view === 'lact' || view === 'battle';
  }
  function aiContext() {
    const u = view === 'study' && SD.unit ? unitById(SD.unit) : Q && Q.mode === 'set' ? unitById(Q.unit) : currentUnit();
    const ctx = { grade: COURSE.label, unit: { title: `Lesson ${u.no}. ${u.title} (${u.ko})`, words: u.words.map(w => ({ en: w.en, ko: w.ko })), sentences: u.sentences.slice(0, 6).map(x => ({ en: x.en, ko: x.ko })) } };
    if (Q && (view === 'home' || view === 'play') && Q.phase !== 'result') {
      const q = Q.list[Q.i];
      if (q) ctx.current = { prompt: q.prompt, show: q.type === 'phonics' ? '?' + q.show : (q.show || ''), options: q.options || q.tiles || [], answer: Q.phase === 'fb' ? (q.answer === 'match' ? q.explain : q.answer) : '' };
    }
    if (view === 'study') { const it = studyItems()[SD.i]; if (it) ctx.card = it; }
    return ctx;
  }
  const AI_PRESET = {
    phonics: ['sh 소리는 어떻게 내요?', 'th 소리는 어떻게 내요?', '매직 e가 뭐예요?', 'c는 언제 ㅋ, 언제 ㅅ 소리가 나요?', 'ee와 ea는 어떻게 읽어요?', 'f와 p 소리는 뭐가 달라요?'],
    grammar: ['is와 are는 언제 써요?', 'a와 an은 뭐가 달라요?', '-ing(하고 있어요)는 어떻게 만들어요?', 'do와 does는 언제 써요?', '지난 일(과거)은 어떻게 말해요?', 'can은 어떻게 써요?'],
  };
  function aiSubChips(k) {
    const c = aiContext();
    if (k === 'word') return c.unit.words.map(w => `<button class="ai-c" data-act="aiq" data-k="word" data-q="${esc(w.en)} 뜻과 예문 알려 주세요">${esc(w.en)}</button>`).join('');
    if (k === 'sentence') return c.unit.sentences.map(x => `<button class="ai-c long" data-act="aiq" data-k="sentence" data-q="${esc(x.en.slice(0, 40))} 무슨 뜻이에요?">${esc(x.en)}</button>`).join('');
    return (AI_PRESET[k] || []).map(q => `<button class="ai-c long" data-act="aiq" data-k="${k}" data-q="${esc(q)}">${esc(q)}</button>`).join('');
  }
  function aiLogHTML() {
    if (!AIH.log.length) return `<div class="ai-msg bot"><p>안녕! 나는 AI 애플 도우미야 🍎<br>단어 뜻, 문장 뜻, 파닉스, 문법… 영어에서 궁금한 걸 물어봐 줘요!</p></div>`;
    return AIH.log.map((m, i) => m.me ? `<div class="ai-msg me"><p>${esc(m.text)}</p></div>` : `<div class="ai-msg bot ${m.err ? 'err' : ''}"><p>${esc(m.text).replace(/\n/g, '<br>')}</p>${m.err ? '' : `<button class="ai-say" data-act="aisay" data-v="${i}">🔊 영어 부분 듣기</button>`}</div>`).join('') + (AIH.busy ? '<div class="ai-msg bot"><p class="ai-wait">생각하는 중이에요<span>…</span></p></div>' : '');
  }
  function aiHelp() {
    if (!SESS) { toast('🤖 AI 도우미는 로그인한 친구만 쓸 수 있어요.'); return; }
    const c = aiContext();
    const top = [];
    if (c.current) top.push(`<button class="ai-c hot" data-act="aiq" data-k="hint" data-q="${c.current.answer ? '방금 문제 왜 이게 답이에요?' : '지금 문제 힌트 주세요'}">🧩 ${c.current.answer ? '방금 문제 설명' : '지금 문제 힌트'}</button>`);
    if (c.card) top.push(`<button class="ai-c hot" data-act="aiq" data-k="card" data-q="${esc(c.card.en.slice(0, 40))} 설명해 주세요">📖 이 카드 설명</button>`);
    openSheet(`<button class="close" data-act="closeSheet" aria-label="닫기">✕</button>
      <div class="ai-head"><span class="ai-ava">${SHOP.dressed(S.stage, IMG[S.stage], S.wear, STAGES[S.stage].name)}</span><div><h3>🤖 AI 애플 도우미</h3><p class="sub">${esc(c.unit.title)} · 영어 공부 질문만 도와줘요</p></div></div>
      <div class="ai-log" id="aiLog">${aiLogHTML()}</div>
      <div class="ai-cats">${top.join('')}<button class="ai-c" data-act="aichips" data-v="word">🔤 단어 뜻</button><button class="ai-c" data-act="aichips" data-v="sentence">💬 문장 뜻</button><button class="ai-c" data-act="aichips" data-v="phonics">🅰️ 파닉스</button><button class="ai-c" data-act="aichips" data-v="grammar">📐 문법</button></div>
      <div class="ai-sub"></div>
      <form class="ai-form" id="aiForm"><input id="aiIn" maxlength="50" autocomplete="off" placeholder="궁금한 걸 짧게 적어요 (50자)" aria-label="AI에게 질문"><button class="btn" type="submit">보내기</button></form>
      <p class="voice-note">AI가 만든 답이라 틀릴 수도 있어요. 이름·학교·전화번호 같은 내 정보는 적지 마세요.</p>`, 'ai-sheet');
    const f = $('#aiForm'); if (f) f.addEventListener('submit', e => { e.preventDefault(); const v = $('#aiIn').value.trim(); if (v) { $('#aiIn').value = ''; aiAsk('free', v); } });
    aiScroll();
  }
  function aiScroll() { const l = $('#aiLog'); if (l) l.scrollTop = l.scrollHeight; }
  function aiRefresh() { const l = $('#aiLog'); if (l) { l.innerHTML = aiLogHTML(); aiScroll(); } }
  async function aiAsk(kind, text) {
    if (AIH.busy || !SESS) return;
    if (/\d{2,3}[- ]?\d{3,4}[- ]?\d{4}/.test(text)) { toast('전화번호 같은 내 정보는 적지 않아요!'); return; }
    const c = aiContext();
    AIH.log.push({ me: true, text }); AIH.busy = true; aiRefresh();
    const r = await api('/api/ai/ask', { kind, text, grade: c.grade, unit: c.unit, current: kind === 'hint' ? c.current : undefined }, { token: SESS.token, timeout: 25000 });
    AIH.busy = false;
    AIH.log.push(r.ok ? { text: r.text } : { text: r.error || 'AI 도우미와 연결이 안 돼요.', err: true });
    if (AIH.log.length > 30) AIH.log.splice(0, AIH.log.length - 30);
    aiRefresh();
  }

  /* ---------- 애플왕과 대결 (공모전 체험판) ---------- */
  let BT = null;
  const BT_TYPES = ['ko2en', 'en2ko', 'pic', 'blank'];
  function battleUnits() {
    let ids = L.doneIds(S); const wrongUnits = [...new Set(Object.values(S.wrong).map(w => w.unit))];
    ids = [...new Set(ids.concat(wrongUnits, [currentUnit().id]))].filter(id => isOpen(id) && UNITS.some(u => u.id === id));
    return ids;
  }
  function renderBattle() {
    if (BT && BT.view) return drawBattle();
    const b = S.battle || {}, today = b.day === L.dayKey(now()) ? b.todayPlays || 0 : 0, rv = STAGES[S.stage].name;
    main.innerHTML = `<div class="screen-title"><button class="back" data-act="btquit" aria-label="뒤로">←</button><div><h2>⚔️ 애플왕과 대결</h2><p>배운 단어로 1:1 퀴즈 대결</p></div></div>
      <div class="glass bt-intro"><div class="bt-arena"><div class="bt-side"><div class="bt-ava">${SHOP.dressed(S.stage, IMG[S.stage], S.wear, rv)}</div><b>나</b></div><div class="bt-vs">VS</div><div class="bt-side rv"><div class="bt-ava shadow"><img src="${IMG[S.stage]}" alt=""></div><b>그림자 ${esc(rv)}</b></div></div>
      <ul class="bt-rules"><li>⭕ 정답을 맞히면 그림자에게 <b>공격!</b> (3연속이면 더 세게)</li><li>❌ 틀리거나 시간이 지나면 내가 공격받아요</li><li>⏱️ 한 문제에 ${[12, 10, 8][S.stage] || 10}초 · 진화할수록 그림자도 빨라져요</li><li>🍎 이기면 사과 5개, 져도 1개 (하루 3판까지) · 틀린 단어는 오답 노트로</li></ul>
      <button class="btn bt-go" data-act="btstart">⚔️ 대결 시작</button><p class="voice-note">오늘 ${today}판 했어요 · 지금까지 ${b.wins || 0}번 이겼어요</p></div>`;
  }
  function startBattle() {
    const ids = battleUnits(); let list = [], seen = new Set();
    for (let k = 0; k < 6 && list.length < 16; k++) for (const q of L.buildMixed(UNITS, ids, 24, (now() + k * 7919) & 0xffff, 'review', S.wrong)) if (q && BT_TYPES.includes(q.type) && q.options && !seen.has(q.id)) { seen.add(q.id); list.push(q); }
    if (list.length < 5) { toast('문제가 부족해요. 단원을 조금 더 공부하고 와요!'); return; }
    BT = { view: true, list: list.slice(0, 16), i: 0, hp: 100, rhp: 100, combo: 0, ok: 0, n: 0, sec: [12, 10, 8][S.stage] || 10, lock: false, iv: null, msg: '' };
    drawBattle(); nextBattleQ(true);
  }
  function drawBattle() {
    const rv = STAGES[S.stage].name;
    main.innerHTML = `<div class="screen-title"><button class="back" data-act="btquit" aria-label="그만하기">←</button><div><h2>⚔️ 애플왕과 대결</h2><p id="btMsg">${BT.msg || '정답을 맞혀 공격해요!'}</p></div></div>
      <div class="glass bt-arena play"><div class="bt-side" id="btMe"><div class="bt-ava">${SHOP.dressed(S.stage, IMG[S.stage], S.wear, rv)}</div><b>나</b><div class="bt-hp"><i id="btHp" style="width:${BT.hp}%"></i></div></div>
      <div class="bt-vs">VS<small id="btCombo">${BT.combo >= 2 ? BT.combo + ' COMBO' : ''}</small></div>
      <div class="bt-side rv" id="btRv"><div class="bt-ava shadow"><img src="${IMG[S.stage]}" alt=""></div><b>그림자 ${esc(rv)}</b><div class="bt-hp rv"><i id="btRhp" style="width:${BT.rhp}%"></i></div></div></div>
      <div class="bt-timer"><i id="btT"></i></div><div class="glass bt-q" id="btQ"></div>`;
    if (BT.result) return battleResult();
  }
  function nextBattleQ(first) {
    if (!BT) return;
    if (!first) BT.i++;
    if (BT.rhp <= 0 || BT.hp <= 0 || BT.i >= BT.list.length) return endBattle();
    const q = BT.list[BT.i]; BT.lock = false;
    const show = q.type === 'pic' ? `<div class="bt-pic">${esc(q.show)}</div>` : q.show ? `<div class="bt-show ${q.sentence ? 'sent' : ''}">${esc(q.show)}</div>` : '';
    $('#btQ').innerHTML = `<p class="bt-prompt">${BT.i + 1}. ${esc(q.prompt)}</p>${show}<div class="bt-opts">${q.options.map((o, k) => `<button class="l-opt" data-act="btans" data-v="${k}">${esc(o)}</button>`).join('')}</div>`;
    BT.t0 = Date.now(); clearInterval(BT.iv);
    BT.iv = setInterval(() => {
      if (!BT || view !== 'battle') return clearInterval(BT && BT.iv);
      const left = BT.sec - (Date.now() - BT.t0) / 1000, el = $('#btT');
      if (el) { el.style.width = Math.max(0, left / BT.sec * 100) + '%'; el.classList.toggle('hurry', left < 3); }
      if (left <= 0) battleAnswer(-1, null);
    }, 100);
  }
  function battleHit(target, dmg) {
    const el = $(target === 'rv' ? '#btRv' : '#btMe'); if (!el) return;
    if (!S.settings.reduceMotion) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
    const f = document.createElement('span'); f.className = 'bt-dmg'; f.textContent = '-' + dmg; el.append(f); setTimeout(() => f.remove(), 900);
  }
  function battleAnswer(k, el) {
    if (!BT || BT.lock) return; BT.lock = true; clearInterval(BT.iv);
    const q = BT.list[BT.i], o = k >= 0 ? q.options[k] : null, ok = o === q.answer; BT.n++;
    L.recordAnswer(S, q, ok);
    const btns = [...document.querySelectorAll('#btQ .l-opt')];
    btns.forEach(b => { if (b.textContent === q.answer) b.classList.add('ok'); });
    if (ok) {
      BT.ok++; BT.combo++; const dmg = BT.combo >= 3 ? 25 : 20; BT.rhp = Math.max(0, BT.rhp - dmg);
      L.award(S, q.id, 'review', now()); AU.good(); battleHit('rv', dmg);
      BT.msg = BT.combo >= 3 ? `🔥 ${BT.combo}연속 정답! 강한 공격!` : '⭕ 정답! 공격 성공!';
      if (q.speak && !S.settings.quiet) setTimeout(() => speak(q.speak), 150);
    } else {
      BT.combo = 0; BT.hp = Math.max(0, BT.hp - 20); AU.bad(); battleHit('me', 20);
      if (el) el.classList.add('bad');
      BT.msg = k < 0 ? `⏱️ 시간 초과! 정답은 ${esc(q.answer)}` : `❌ 아쉬워요! 정답은 ${esc(q.answer)}`;
    }
    const m = $('#btMsg'); if (m) m.innerHTML = BT.msg;
    const hp = $('#btHp'), rhp = $('#btRhp'), cb = $('#btCombo');
    if (hp) hp.style.width = BT.hp + '%'; if (rhp) rhp.style.width = BT.rhp + '%'; if (cb) cb.textContent = BT.combo >= 2 ? BT.combo + ' COMBO' : '';
    save(); updateHUD();
    setTimeout(() => nextBattleQ(false), ok ? 800 : 1500);
  }
  function endBattle() {
    clearInterval(BT.iv);
    const win = BT.rhp <= 0 || (BT.hp > 0 && BT.rhp < BT.hp);
    BT.result = { win, ...L.completeBattle(S, win, now()) };
    L.markStudy(S, now(), 'basic'); touchDay(); save(); cloudFlush(); updateHUD();
    if (win) AU.fanfare();
    battleResult();
  }
  function battleResult() {
    const r = BT.result;
    $('#btQ').innerHTML = `<div class="bt-res"><div class="big">${r.win ? '🏆' : '💪'}</div><h3>${r.win ? '그림자를 이겼어요!' : '아쉽게 졌어요. 다시 도전!'}</h3>
      <p>${BT.n}문제 중 ${BT.ok}개 정답${r.coins ? ` · 🍎 +${r.coins}` : ' · (오늘 보상은 다 받았어요)'}</p>${BT.n - BT.ok ? '<p class="voice-note">틀린 단어는 오답 노트에 담겼어요. 오늘의 복습에 나와요!</p>' : ''}
      <div class="row-btns"><button class="btn" data-act="btstart">⚔️ 다시 대결</button><button class="btn ghost" data-act="daily">📅 오늘의 복습</button><button class="btn ghost" data-act="go" data-v="home">홈으로</button></div></div>`;
    const t = $('#btT'); if (t) t.style.width = '0%';
  }

  /* ---------- 차시별 복습 (공모전 체험판 · 천재(이) Lesson 9) ---------- */
  const LSN = window.AQ_LESSONS || { LESSONS: {} };
  let LU = 9, LCH = 1, LACT = null, sayTok = 0;
  const lessonCount = uid => { const lp = lessonFor(uid), all = lp.chapters.flatMap(c => c.acts); return `${all.filter(a => L.activityDone(S, uid, a.id)).length}/${all.length}`; };
  const chDone = (uid, ch) => ch.acts.filter(a => L.activityDone(S, uid, a.id)).length;
  function lessonSheetHTML(id) {
    const lp = lessonFor(id);
    return `<div class="l-sheet"><div class="l-sheet-h"><b>📅 차시별 복습</b><small>차시를 누르면 활동을 차례대로 안내해 줘요</small></div>
      <div class="l-sheet-g">${lp.chapters.map(ch => { const dn = chDone(id, ch), all = ch.acts.length, full = dn === all;
        return `<button class="l-sc-btn ${full ? 'done' : dn ? 'ing' : ''}" data-act="lchap" data-u="${id}" data-c="${ch.no}"><span class="no">${ch.no}차시</span><span class="ic">${ch.icon}</span><b>${esc(ch.name)}</b><small>${full ? '완료 🌟' : `${dn}/${all} 활동`}</small><i class="pg"><i style="width:${Math.round(dn / all * 100)}%"></i></i></button>`; }).join('')}</div>
      <button class="linkish l-all" data-act="lessons" data-v="${id}">전체 차시 한눈에 보기 ›</button></div>`;
  }
  /* 차시 안내: 활동을 순서대로 */
  function renderLchap() {
    const LP = lessonFor(LU); if (!LP) { go('units'); return; }
    const ch = LP.chapters.find(c => c.no === LCH) || LP.chapters[0]; LCH = ch.no;
    const u = unitById(LU), dn = chDone(LU, ch), nextIdx = ch.acts.findIndex(a => !L.activityDone(S, LU, a.id)), full = nextIdx < 0, nx = full ? null : ch.acts[nextIdx];
    const later = LP.chapters.find(c => c.no === ch.no + 1);
    main.innerHTML = `<div class="screen-title"><button class="back" data-act="go" data-v="units" aria-label="뒤로">←</button><div><h2>${ch.icon} ${ch.no}차시 · ${esc(ch.name)}</h2><p>Lesson ${u.no} ${esc(LP.title)}</p></div></div>
      <div class="l-tabs">${LP.chapters.map(c => `<button class="l-tab ${c.no === ch.no ? 'on' : ''} ${chDone(LU, c) === c.acts.length ? 'done' : ''}" data-act="lchap" data-u="${LU}" data-c="${c.no}">${c.no}차시${chDone(LU, c) === c.acts.length ? ' ✓' : ''}</button>`).join('')}</div>
      <div class="glass l-guide"><p class="l-guide-t">${full ? '🌟 이 차시를 모두 끝냈어요! 다시 해도 좋아요.' : dn ? `👍 잘하고 있어요! 이제 <b>${nextIdx + 1}번 활동</b>을 할 차례예요.` : `오늘은 이 순서로 복습해요. 위에서부터 하나씩!`}</p>
        <ol class="l-steps">${ch.acts.map((a, k) => { const ok = L.activityDone(S, LU, a.id), now_ = k === nextIdx, ai = a.type.startsWith('ai');
          return `<li class="${ok ? 'ok' : ''} ${now_ ? 'now' : ''}"><button data-act="lstart" data-c="${ch.no}" data-v="${a.id}"><span class="dot">${ok ? '✓' : k + 1}</span><span class="tx"><b>${ACT_ICON[a.type] || ''} ${esc(a.title)}${ai ? ' <em class="ai-mini">AI</em>' : ''}</b><small>${esc(a.desc || '')}</small></span>${now_ ? '<span class="go">지금!</span>' : ok ? '<span class="re">다시</span>' : ''}</button></li>`; }).join('')}</ol>
        ${nx ? `<button class="btn l-cta" data-act="lstart" data-c="${ch.no}" data-v="${nx.id}">▶ ${nextIdx + 1}번 활동 시작<small>${esc(nx.title)}</small></button>`
          : later ? `<button class="btn l-cta" data-act="lnextch">▶ ${later.no}차시로 가기<small>${later.icon} ${esc(later.name)}</small></button>`
          : `<button class="btn l-cta" data-act="go" data-v="units">🏆 4차시까지 모두 끝! 단원 목록으로</button>`}
        <p class="voice-note">활동마다 경험치 +${S.rules.expReview} · 한 차시를 다 끝내면 🍎 +5 보너스</p></div>`;
  }
  function lessonFor(uid) { const lp = LSN.LESSONS[uid]; return CONTEST && COURSE.key === 'cj4' && lp && lp.course === 'cj4' ? lp : null; }
  function stopSay() { sayTok++; if (window.speechSynthesis) speechSynthesis.cancel(); }
  function sayP(text, rate = .85) { // 끝날 때까지 기다리는 발음
    return new Promise(res => {
      if (S.settings.quiet || !TTS.ok) return setTimeout(res, 500);
      const u = new SpeechSynthesisUtterance(String(text).replace(/’/g, "'").replace(/_{2,}/g, 'blank')); u.lang = 'en-US'; u.rate = rate; if (TTS.voice) u.voice = TTS.voice;
      u.onend = u.onerror = () => res(); speechSynthesis.speak(u); setTimeout(res, 9000);
    });
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const shuf = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const ACT_ICON = { chant: '🎵', order: '🔢', choice: '👆', match: '🔗', speak: '🎙️', read: '📖', spell: '⌨️', write: '✏️', aitalk: '🤖', aiwrite: '🤖', script: '🎭' };
  function renderLessons() {
    const LP = lessonFor(LU); if (!LP) { go('units'); return; }
    const u = unitById(LU), all = LP.chapters.flatMap(c => c.acts), dn = all.filter(a => L.activityDone(S, LU, a.id)).length;
    main.innerHTML = `<div class="screen-title"><button class="back" data-act="go" data-v="units" aria-label="뒤로">←</button><div><h2>Lesson ${u.no} 차시별 복습</h2><p>${esc(LP.title)} · ${esc(LP.ko)}</p></div></div>
      <div class="glass l-goal"><b>🎯 이번 단원 목표</b><p>${esc(LP.goal)}</p><div class="l-prog"><i style="width:${Math.round(dn / all.length * 100)}%"></i></div><small>${dn} / ${all.length} 활동 완료 · 활동마다 경험치 +${S.rules.expReview} · 한 차시를 다 끝내면 🍎 +5</small></div>
      ${LP.chapters.map(ch => { const cd = ch.acts.every(a => L.activityDone(S, LU, a.id)); return `<div class="l-ch ${cd ? 'done' : ''}"><button class="l-ch-h" data-act="lchap" data-u="${LU}" data-c="${ch.no}"><span class="l-no">${ch.no}차시</span><b>${ch.icon} ${esc(ch.name)}</b>${cd ? '<em>완료 🌟</em>' : '<em class="go">순서대로 하기 ›</em>'}</button>
        <div class="l-acts">${ch.acts.map((a, k) => { const ok = L.activityDone(S, LU, a.id), ai = a.type.startsWith('ai'); return `<button class="l-act ${ok ? 'ok' : ''} ${ai ? 'ai' : ''}" data-act="lstart" data-c="${ch.no}" data-v="${a.id}"><span class="ic">${ACT_ICON[a.type] || '⭐'}</span><span class="tx"><b>${k + 1}. ${esc(a.title)}</b><small>${esc(a.desc || '')}</small></span><span class="st">${ok ? '✅' : '▶'}</span></button>`; }).join('')}</div></div>`; }).join('')}`;
  }
  function startAct(chNo, actId) {
    const LP = lessonFor(LU), ch = LP.chapters.find(c => c.no === chNo), a = ch.acts.find(x => x.id === actId);
    LACT = { ch, a, i: 0, ok: 0, n: 0, done: false, st: {} };
    if (a.type === 'choice') LACT.steps = a.gen === 'listen' ? shuf(a.words).slice(0, a.n || 5).map(w => ({ speak: w[0], ko: w[1], options: shuf([w[0], ...shuf(a.words.filter(x => x[0] !== w[0])).slice(0, 3).map(x => x[0])]), answer: w[0] })) : a.steps.map(x => ({ ...x, options: shuf(x.options) }));
    if (a.type === 'order') { LACT.seqs = a.sents ? a.sents.map(x => ({ items: x[0].split(' '), ko: x[1] })) : [{ items: a.items }]; orderSetup(); }
    if (a.type === 'match') LACT.left = shuf(a.pairs.map(p => p[0])), LACT.right = shuf(a.pairs.map(p => p[1])), LACT.got = [], LACT.sel = null;
    if (a.type === 'spell' || a.type === 'speak') LACT.items = shuf(a.words || a.sentences).slice(0, a.type === 'spell' ? 5 : 5);
    if (a.type === 'aitalk') LACT.log = [{ me: false, text: a.starter[0], ko: a.starter[1] }], LACT.sent = 0;
    if (a.type === 'script') LACT.role = null;
    if (CONTEST && (['choice', 'read', 'spell', 'write'].includes(a.type) || (a.type === 'order' && a.sents))) LACT.askConf = true; // ⑤ 나의 실력 확인
    go('lact');
    if (a.type === 'aitalk') sayP(a.starter[0]);
    if (a.type === 'choice' && !LACT.askConf && LACT.steps[0] && LACT.steps[0].speak && !S.settings.quiet) setTimeout(() => sayP(LACT.steps[0].speak), 300);
  }
  function lHead(extra = '') { const { a, ch } = LACT; return `<div class="screen-title"><button class="back" data-act="lback" aria-label="뒤로">←</button><div><h2>${ACT_ICON[a.type] || ''} ${esc(a.title)}</h2><p>${ch.no}차시 · ${esc(ch.name)} ${extra}</p></div></div>`; }
  function lDone(msg) { LACT.done = true; renderLact(msg); }
  function renderLact(msg) {
    if (!LACT) { go('lessons'); return; }
    const { a } = LACT;
    if (LACT.done) {
      const r = LACT.result || (LACT.result = L.completeActivity(S, LU, a.id, LACT.ch.acts.map(x => x.id), now()));
      if (!LACT.saved) { LACT.saved = true; save(); cloudFlush(); AU.fanfare(); }
      const nx = nextActInfo();
      main.innerHTML = lHead() + `<div class="glass l-result"><div class="big">🎉</div><h3>활동 완료!</h3>${msg ? `<p>${msg}</p>` : ''}
        <p class="gain">${r.gain ? `⭐ 경험치 +${r.gain} · 🍎 +1` : '오늘은 이미 경험치를 받았어요. 복습 최고! 👍'}</p>${r.chapterDone ? `<p class="bonus">🌟 ${LACT.ch.no}차시를 모두 끝냈어요! 🍎 +5 보너스</p>` : ''}${selfCardHTML()}
        ${l_after(nx)}</div>`;
      updateHUD(); return;
    }
    if (LACT.askConf) { main.innerHTML = lHead() + `<div class="glass l-conf"><div class="big">🤔</div><h3>시작하기 전에! 이 활동, 자신 있어요?</h3><div class="l-opts g3"><button class="l-opt" data-act="lconf" data-v="3">😎<br>자신 있어요</button><button class="l-opt" data-act="lconf" data-v="2">🙂<br>조금요</button><button class="l-opt" data-act="lconf" data-v="1">😥<br>아직이요</button></div><p class="voice-note">끝나면 내 예상과 실제 결과를 나란히 보여 줘요.</p></div>`; return; }
    const f = { chant: rChant, order: rOrder, choice: rChoice, match: rMatch, speak: rSpeak, read: rRead, spell: rSpell, write: rWrite, aitalk: rTalk, aiwrite: rWriteAI, script: rScript }[a.type];
    main.innerHTML = lHead(LACT.steps ? `· ${Math.min(LACT.i + 1, LACT.steps.length)}/${LACT.steps.length}` : '') + f();
    afterRender();
  }
  function selfCardHTML() {
    if (!LACT.pred || !LACT.n) return '';
    if (!LACT.sc) { LACT.sc = L.selfCheck(S, LACT.pred, LACT.ok, LACT.n); save(); }
    const c = LACT.sc, P = { 3: '😎 자신 있어요', 2: '🙂 조금요', 1: '😥 아직이요' }[LACT.pred], miss = c.n - c.ok;
    const msg = { match: '예상대로 잘했어요! 자신감이 실력이 됐어요 💪', over: `자신 있었는데 ${miss}개를 틀렸어요. 틀린 곳을 다시 보면 진짜 내 것이 돼요.`, under: '생각보다 훨씬 잘했어요! 더 자신 가져도 돼요 🌟', honest: '솔직하게 예상했어요. 한 번 더 하면 분명 좋아져요!' }[c.kind];
    return `<div class="l-self k-${c.kind}"><b>📊 나의 실력 확인</b><div class="l-self-row"><span>내 예상<br><em>${P}</em></span><span>실제 결과<br><em>${c.ok} / ${c.n} (${Math.round(c.acc * 100)}%)</em></span></div><p>${msg}</p>${c.kind === 'over' || c.kind === 'honest' ? '<button class="btn ghost sm" data-act="lretry">🔁 한 번 더 해 보기</button>' : ''}</div>`;
  }
  function nextActInfo() { // 같은 차시에서 아직 안 한 다음 활동 (차례대로)
    const ch = LACT.ch, k = ch.acts.findIndex(a => a.id === LACT.a.id);
    const a = ch.acts.slice(k + 1).find(x => !L.activityDone(S, LU, x.id)) || ch.acts.slice(0, k).find(x => !L.activityDone(S, LU, x.id));
    return a ? { c: ch, a, k: ch.acts.indexOf(a) } : null;
  }
  function nextAct() { const nx = nextActInfo(); if (nx) startAct(nx.c.no, nx.a.id); else { LCH = LACT.ch.no; go('lchap'); } }
  function l_after(nx) {
    const LP = lessonFor(LU), ch = LACT.ch, later = LP.chapters.find(c => c.no === ch.no + 1), n = ch.acts.length, dn = chDone(LU, ch);
    const steps = `<div class="l-mini">${ch.acts.map((a, k) => `<i class="${L.activityDone(S, LU, a.id) ? 'ok' : ''} ${nx && nx.a.id === a.id ? 'now' : ''}">${k + 1}</i>`).join('<b></b>')}</div><p class="voice-note">${ch.no}차시 ${dn}/${n} 활동 완료</p>`;
    if (nx) return steps + `<div class="row-btns"><button class="btn" data-act="lnext">${nx.k + 1}번 활동으로 ▶<small>${esc(nx.a.title)}</small></button><button class="btn ghost" data-act="lback">차시 안내</button></div>`;
    return steps + `<div class="row-btns">${later ? `<button class="btn" data-act="lnextch">${later.no}차시로 ▶<small>${later.icon} ${esc(later.name)}</small></button>` : `<button class="btn" data-act="go" data-v="units">🏆 단원 목록으로</button>`}<button class="btn ghost" data-act="lback">차시 안내</button></div>`;
  }
  let afterRender = () => {};
  const opt = (o, k, cls = '') => `<button class="l-opt ${cls}" data-act="lpick" data-v="${k}">${esc(o)}</button>`;
  const bubbles = lines => `<div class="l-dlg">${lines.map(([who, t]) => `<div class="l-b ${who === lines[0][0] ? 'l' : 'r'}"><i>${esc(who)}</i><p>${esc(t).replace(/_{2,}/g, '<span class="l-blank">?</span>')}</p></div>`).join('')}</div>`;

  /* 1) 챈트 */
  function rChant() {
    const { a } = LACT;
    afterRender = () => {};
    return `<div class="glass l-chant"><p class="sub">한 줄씩 듣고 크게 따라 불러요. 줄을 누르면 그 줄만 들을 수 있어요.</p>
      ${a.lines.map(([en, ko], k) => `<button class="l-line ${LACT.st.cur === k ? 'cur' : ''} ${LACT.st.max >= k ? 'sung' : ''}" data-act="lsay" data-t="${esc(en)}"><b>${esc(en)}</b><small>${esc(ko)}</small></button>`).join('')}
      <div class="row-btns"><button class="btn" id="chantGo">${LACT.st.playing ? '⏸ 멈추기' : '▶ 따라 부르기 (듣고 → 따라 하기)'}</button></div>
      <button class="btn ghost" data-act="lgo" ${LACT.st.max >= a.lines.length - 1 || S.settings.quiet ? '' : 'disabled'}>✅ 다 불렀어요</button>
      ${S.settings.quiet ? '<p class="voice-note">조용한 교실 모드라 소리가 나지 않아요. 가사를 보며 작게 불러 보고 ✅를 눌러요.</p>' : ''}</div>`;
  }
  async function chantPlay() {
    const { a } = LACT; if (LACT.st.playing) { LACT.st.playing = false; stopSay(); renderLact(); return; }
    LACT.st.playing = true; const tok = ++sayTok;
    for (let k = 0; k < a.lines.length; k++) {
      if (tok !== sayTok || !LACT || view !== 'lact') return;
      LACT.st.cur = k; renderLact(); await sayP(a.lines[k][0], .8);
      if (tok !== sayTok) return; await wait(1600 + a.lines[k][0].length * 45); // 따라 부를 시간
      LACT.st.max = Math.max(LACT.st.max ?? -1, k);
    }
    LACT.st.playing = false; LACT.st.cur = null; renderLact(); toast('👏 잘 불렀어요! ✅ 다 불렀어요를 눌러요');
  }

  /* 2) 순서 맞추기 (요일 차례 · 낱말 카드로 문장 만들기) */
  function orderSetup() { const q = LACT.seqs[LACT.i]; LACT.items = q.items; LACT.pool = shuf(q.items.map((_, k) => k)); LACT.got = []; LACT.miss = 0; LACT.sMiss = false; }
  function rOrder() {
    afterRender = () => {}; const q = LACT.seqs[LACT.i], sent = !!LACT.a.sents;
    return `<div class="glass l-order">${sent ? `<div class="l-big sm">${esc(q.ko)}</div><p class="sub">낱말 카드를 차례대로 눌러 문장을 만들어요 · ${LACT.i + 1}/${LACT.seqs.length}</p>` : `<p class="sub">${esc(LACT.a.desc)}</p>`}
      <div class="l-slots ${sent ? 'sent' : ''}">${LACT.items.map((_, k) => `<span class="l-slot ${LACT.got[k] != null ? 'ok' : ''}">${LACT.got[k] != null ? esc(LACT.items[LACT.got[k]]) : k + 1}</span>`).join('')}</div>
      <div class="l-opts">${LACT.pool.map(k => LACT.got.includes(k) ? '' : opt(LACT.items[k], k)).join('')}</div></div>`;
  }
  /* 3) 고르기 (듣기·대화·시간표·대본) */
  function rChoice() {
    const st = LACT.steps[LACT.i], a = LACT.a;
    afterRender = () => {};
    let top = '';
    if (st.speak) top = S.settings.quiet ? `<div class="l-big">${esc(st.ko)}</div><p class="sub">조용한 교실 모드: 우리말을 보고 골라요</p>` : `<button class="l-spk" data-act="lsay" data-t="${esc(st.speak)}">🔊</button><p class="sub">잘 듣고 알맞은 요일 카드를 골라요 · 🔊를 누르면 다시 들려요</p>`;
    if (st.pic) top = `<div class="l-pic"><b>${esc(st.pic)}</b>${st.picKo ? `<small>${esc(st.picKo)}</small>` : ''}</div>`;
    if (st.cal) top = `<div class="l-cal"><i>TODAY</i><b>${esc(st.cal)}</b><small>${esc(LSN.DAYS_KO[st.cal] || '')}</small></div>`;
    if (a.table) top = (st.pic ? top : '') + `${a.tableTitle ? `<p class="l-tt-t">${esc(a.tableTitle)}</p>` : ''}<table class="l-tt"><tr>${a.table.map(r => `<th>${esc(a.thShort ? r[0].slice(0, 3) : r[0])}</th>`).join('')}</tr><tr>${a.table.map(r => `<td>${esc(r[1])}<small>${esc(r[2])}</small></td>`).join('')}</tr></table><p class="l-q">${esc(st.q)}</p><p class="sub">${esc(st.ko)}</p>`;
    if (st.lines) top += bubbles(st.lines) + (S.settings.quiet ? '' : `<button class="btn ghost sm" data-act="lsay" data-t="${esc(st.lines.map(l => l[1]).join(' '))}">🔊 대화 듣기</button>`);
    return `<div class="glass l-choice">${top}<div class="l-opts g2">${st.options.map((o, k) => opt(o, k)).join('')}</div></div>`;
  }
  /* 4) 짝 맞추기 */
  function rMatch() {
    afterRender = () => {};
    const col = (arr, side) => arr.map((o, k) => { const done = LACT.got.some(g => g[side] === o); return `<button class="l-opt ${done ? 'ok' : ''} ${LACT.sel && LACT.sel.side === side && LACT.sel.v === o ? 'sel' : ''}" data-act="lpick" data-v="${side * 100 + k}" ${done ? 'disabled' : ''}>${esc(o)}</button>`; }).join('');
    return `<div class="glass l-match"><p class="sub">${esc(LACT.a.how || '왼쪽 낱말을 누르고, 알맞은 짝을 오른쪽에서 눌러요.')}</p><div class="l-mcols"><div>${col(LACT.left, 0)}</div><div>${col(LACT.right, 1)}</div></div></div>`;
  }
  function lPick(v, el) {
    const { a } = LACT; if (LACT.lock) return;
    if (a.type === 'order') {
      const need = LACT.items[LACT.got.length];
      if (LACT.items[v] === need) {
        const free = LACT.pool.find(k => !LACT.got.includes(k) && LACT.items[k] === need); LACT.got.push(free); AU.good(); LACT.miss = 0;
        if (LACT.got.length === LACT.items.length) {
          if (!a.sents) return lDone(a.doneMsg || '순서를 완벽하게 맞혔어요!');
          sayP(LACT.items.join(' ')); LACT.n++; if (!LACT.sMiss) LACT.ok++; LACT.i++;
          if (LACT.i >= LACT.seqs.length) return lDone('문장을 모두 바르게 만들었어요! 🧩');
          toast('⭕ ' + LACT.seqs[LACT.i - 1].items.join(' '), 1300); orderSetup();
        }
        renderLact();
      } else {
        AU.bad(); el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 400); LACT.miss++; LACT.sMiss = true;
        toast(LACT.miss >= 2 ? `${LACT.got.length + 1}번째 낱말은 "${need}"이에요!` : (LSN.DAYS_KO && LSN.DAYS_KO[need] && !a.sents ? `${LACT.got.length + 1}번째는 ${LSN.DAYS_KO[need]}이에요!` : '다시 생각해 봐요! 우리말 뜻을 떠올려요'), 1400);
      }
      return;
    }
    if (a.type === 'match') {
      const side = v >= 100 ? 1 : 0, k = v % 100, val = side ? LACT.right[k] : LACT.left[k];
      if (!LACT.sel || LACT.sel.side === side) { LACT.sel = { side, v: val }; renderLact(); return; }
      const l = side ? LACT.sel.v : val, r = side ? val : LACT.sel.v; LACT.sel = null;
      if (a.pairs.some(p => p[0] === l && p[1] === r)) { LACT.got.push([l, r]); AU.good ? AU.good() : AU.tap(); if (LACT.got.length === a.pairs.length) return lDone(a.doneMsg || '짝을 모두 찾았어요! 🔗'); }
      else { AU.bad(); toast('다시 찾아봐요!', 1000); }
      renderLact(); return;
    }
    if (a.type === 'choice') {
      const st = LACT.steps[LACT.i], o = st.options[v], ok = o === st.answer; LACT.n++; if (ok) LACT.ok++;
      LACT.lock = true; el.classList.add(ok ? 'ok' : 'bad');
      if (!ok) { AU.bad(); const right = [...document.querySelectorAll('.l-opt')].find(b => b.textContent === st.answer); if (right) right.classList.add('ok'); } else { AU.good ? AU.good() : AU.tap(); }
      if (ok) setTimeout(choiceAdvance, 650);
      else { LACT.wrongNow = { given: o }; lessonWrongBar(`정답은 <b>${esc(st.answer)}</b> 예요.`); }
      return;
    }
    if (a.type === 'read') {
      const q = a.qs[LACT.i], ok = (v === 1) === q[1]; LACT.n++; if (ok) LACT.ok++; LACT.lock = true;
      el.classList.add(ok ? 'ok' : 'bad'); ok ? (AU.good ? AU.good() : AU.tap()) : AU.bad();
      const ex = $('#rdEx'); if (ex) ex.innerHTML = `${ok ? '⭕ 맞아요!' : '❌ 아쉬워요!'} ${esc(q[2])}`;
      if (ok) setTimeout(choiceAdvance, 1500);
      else { LACT.wrongNow = { given: v === 1 ? '맞아요' : '틀려요' }; lessonWrongBar(''); }
    }
  }
  function choiceAdvance() {
    if (!LACT) return; const { a } = LACT; LACT.lock = false; LACT.wrongNow = null; LACT.i++;
    if (a.type === 'read') { if (LACT.i >= a.qs.length) return lDone(`${a.qs.length}문제 중 ${LACT.ok}개 맞혔어요!`); return renderLact(); }
    if (LACT.i >= LACT.steps.length) return lDone(`${LACT.steps.length}문제 중 ${LACT.ok}개 맞혔어요!`);
    renderLact(); const nx = LACT.steps[LACT.i]; if (nx.speak && !S.settings.quiet) sayP(nx.speak);
  }
  function lessonWrongBar(html) { // ④ 틀리면 바로 넘어가지 않고 '왜 틀렸어?'를 볼 수 있게
    const card = main.querySelector('.l-choice, .l-read'); if (!card) return;
    const d = document.createElement('div'); d.className = 'l-fb';
    d.innerHTML = `${html ? `<p>❌ ${html}</p>` : ''}<div class="row-btns">${CONTEST ? '<button class="btn ai-btn sm" data-act="lwhy">🤖 왜 틀렸어?</button>' : ''}<button class="btn sm" data-act="lnextq">다음 ▶</button></div>`;
    card.append(d); d.scrollIntoView({ block: 'nearest', behavior: S.settings.reduceMotion ? 'auto' : 'smooth' });
  }
  async function lessonWhy() {
    if (!LACT) return; AU.tap();
    if (!SESS) { toast('🤖 AI 선생님은 로그인한 친구만 쓸 수 있어요.'); return; }
    const { a } = LACT; let body;
    if (a.type === 'choice') {
      const st = LACT.steps[LACT.i];
      const show = st.speak ? '' : [st.cal ? `[달력: ${st.cal}]` : '', st.pic ? `[그림: ${st.picKo || st.pic}]` : '', st.q || '', (st.lines || []).map(l => `${l[0]}: ${l[1]}`).join(' / ')].filter(Boolean).join(' ');
      body = { type: 'lesson-choice', prompt: `${a.title}: ${a.desc || ''}`, show, options: st.options, answer: st.answer, given: (LACT.wrongNow || {}).given || '', explain: st.ko || a.desc || '' };
    } else if (a.type === 'read') {
      const q = a.qs[LACT.i];
      body = { type: 'lesson-read', prompt: `글을 읽고 O/X: ${q[0]}`, show: a.passage.map(p => p[0]).join(' '), options: ['맞아요', '틀려요'], answer: q[1] ? '맞아요' : '틀려요', given: (LACT.wrongNow || {}).given || '', explain: q[2] };
    } else {
      const isSpell = a.type === 'spell', it = isSpell ? LACT.items[LACT.i] : a.items[LACT.i];
      body = { type: 'lesson-write', prompt: isSpell ? `우리말 '${it[1]}'을 영어로 쓰기` : `${it[0]} → 빈칸 쓰기`, show: isSpell ? it[1] : it[1], options: [], answer: isSpell ? it[0] : it[2], given: LACT.st.given || '', explain: isSpell ? `${it[0]} = ${it[1]}` : it[1].replace('____', it[2]) };
    }
    openSheet(`<button class="close" data-act="closeSheet" aria-label="닫기">✕</button><h3>🤖 AI 애플 선생님</h3><div class="ai-box"><p class="ai-wait">생각하는 중이에요<span>…</span></p></div>`);
    const r = await api('/api/ai/explain', body, { token: SESS.token, timeout: 25000 });
    const box = $('.sheet .ai-box'); if (!box) return;
    box.innerHTML = r.ok ? `<p>${esc(r.text).replace(/\n/g, '<br>')}</p><p class="voice-note">AI가 만든 설명이에요. 이상한 점이 있으면 선생님께 물어보세요.</p>` : `<p>${esc(r.error || 'AI 선생님과 연결이 안 돼요.')}</p>`;
  }
  /* 5) 따라 말하기 (음성 인식, 안 되면 스스로 확인) */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  function listenOnce() {
    return new Promise(res => {
      if (!SR) return res(null);
      const r = new SR(); r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 3;
      let got = null; r.onresult = e => { got = [...e.results[0]].map(x => x.transcript); }; r.onerror = () => res(got); r.onend = () => res(got);
      try { r.start(); } catch (e) { res(null); }
      setTimeout(() => { try { r.stop(); } catch (e) {} }, 6000);
    });
  }
  const norm = t => String(t || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  function speechScore(target, alts) { const tw = norm(target).split(' '); let best = 0; for (const a of alts || []) { const w = norm(a).split(' '); best = Math.max(best, tw.filter(x => w.includes(x)).length / tw.length); } return best; }
  function rSpeak() {
    const it = LACT.items[LACT.i];
    afterRender = () => {};
    return `<div class="glass l-speak"><div class="l-card"><b>${esc(it[0])}</b><small>${esc(it[1])}</small></div>
      <div class="row-btns"><button class="btn ghost" data-act="lsay" data-t="${esc(it[0])}">🔊 듣기</button><button class="btn ghost" data-act="lsay" data-t="${esc(it[0])}" data-slow="1">🐢 천천히</button></div>
      ${SR ? `<button class="btn mic" id="micGo">🎙️ 눌러서 말하기</button>` : ''}<p class="l-heard" id="heard">${LACT.st.heard || ''}</p>
      <button class="btn ${SR ? 'ghost' : ''}" data-act="lgo">${SR ? '건너뛰기 · 말해 봤어요 ▶' : '✅ 말해 봤어요 ▶'}</button>
      <p class="voice-note">${LACT.i + 1} / ${LACT.items.length}${SR ? '' : ' · 이 브라우저는 음성 인식이 안 돼서 스스로 확인해요'}</p></div>`;
  }
  async function micGo() {
    const it = LACT.items[LACT.i], b = $('#micGo'); if (!b) return;
    b.disabled = true; b.textContent = '🎙️ 듣고 있어요… 말해 보세요!';
    const alts = await listenOnce(); const sc = speechScore(it[0], alts);
    if (!alts) { LACT.st.heard = '🎙️ 잘 안 들렸어요. 다시 해 보거나 "말해 봤어요"를 눌러요.'; }
    else if (sc >= .7) { LACT.ok++; AU.good ? AU.good() : AU.tap(); LACT.st.heard = `✅ 훌륭해요! "${esc(alts[0])}"`; renderLact(); await wait(900); return lStep(); }
    else LACT.st.heard = `🙂 "${esc(alts[0])}"(으)로 들렸어요. 한 번 더 또박또박!`;
    renderLact();
  }
  /* 6) 읽기 + OX */
  function rRead() {
    const { a } = LACT, q = a.qs[LACT.i];
    afterRender = () => {};
    return `<div class="glass l-read"><div class="l-passage">${a.passage.map(([en, ko]) => `<p><button class="lk" data-act="lsay" data-t="${esc(en)}">🔊</button><b>${esc(en)}</b><small class="${LACT.st.ko ? '' : 'hid'}">${esc(ko)}</small></p>`).join('')}</div>
      <button class="linkish" id="koT">${LACT.st.ko ? '해석 숨기기' : '해석 보기'}</button>
      <p class="l-q">Q${LACT.i + 1}. ${esc(q[0])}</p><div class="l-opts g2">${opt('⭕ 맞아요', 1, 'o')}${opt('❌ 틀려요', 0, 'x')}</div><p class="l-ex" id="rdEx"></p></div>`;
  }
  /* 7) 철자 쓰기 · 8) 문장 완성 */
  function rSpell() {
    const it = LACT.items[LACT.i], hint = it[0].slice(0, LACT.st.h || 0);
    afterRender = () => { const i = $('#spIn'); if (i) i.focus(); };
    return `<div class="glass l-spell"><div class="l-big">${esc(it[1])}</div><p class="sub">${esc(LACT.a.how || '영어로 써 보세요')}</p>
      <form id="spForm" class="l-form"><input id="spIn" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="16" placeholder="${hint ? esc(hint) + '…' : '영어로 쓰기'}"><button class="btn" type="submit">확인</button></form>
      <p class="l-heard" id="heard">${LACT.st.msg || ''}</p>${typedHelpHTML()}<button class="linkish" id="spHint">💡 힌트 (글자 하나씩)</button><p class="voice-note">${LACT.i + 1} / ${LACT.items.length}</p></div>`;
  }
  function rWrite() {
    const it = LACT.a.items[LACT.i];
    afterRender = () => { const i = $('#spIn'); if (i) i.focus(); };
    return `<div class="glass l-spell"><p class="sub">${esc(it[0])}</p><div class="l-frame">${esc(it[1]).replace('____', `<input id="spIn" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="24" style="width:${Math.max(130, it[2].length * 16 + 40)}px">`)}</div>
      <form id="spForm" class="l-form"><button class="btn" type="submit">확인</button></form><p class="l-heard" id="heard">${LACT.st.msg || ''}</p>${typedHelpHTML()}<p class="voice-note">${LACT.i + 1} / ${LACT.a.items.length}</p></div>`;
  }
  function writingMsg(w, ans, isSpell) { // ① 학급 조사에서 많았던 쓰기 오류를 콕 집어 알려 줌
    if (w.kind === 'space') return `✂️ <b>띄어쓰기만 고치면 정답!</b> ${w.want > w.got ? '두 낱말 사이를 띄어 써요' : '붙여 써야 해요'} → <b class="en">${esc(ans)}</b>`;
    if (w.kind === 'article') { const t = ans.split(' ').map(esc); t[w.at] = '<u>&nbsp;□&nbsp;</u>'; return `🔎 <b>작은 낱말 하나가 빠졌어요!</b> <span class="en">${t.join(' ')}</span><br>□ 자리에 a, an, the 같은 낱말이 들어가요.`; }
    if (w.kind === 'articleExtra') return '🔎 필요 없는 a, an, the가 들어갔어요. 빼고 다시 써 봐요.';
    if (w.kind === 'prep') return `📍 <b>위치 낱말을 다시 봐요.</b> "${esc(w.got)}"가 아니에요. 그림 속 위치를 떠올려요. (on 위 · in 안 · under 아래)`;
    if (w.kind === 'typo') return '✏️ <b>거의 다 맞았어요!</b> 한 글자만 고쳐 볼까요?';
    return `🙂 다시 써 볼까요? ${isSpell ? '' : '(힌트: ' + esc(ans[0]) + '…)'}`;
  }
  function checkTyped() {
    const { a } = LACT, isSpell = a.type === 'spell', it = isSpell ? LACT.items[LACT.i] : a.items[LACT.i], ans = isSpell ? it[0] : it[2];
    const raw = ($('#spIn').value || '').trim();
    if (!raw) return;
    const w = L.writingCheck(raw, ans);
    if (w.ok) {
      LACT.n++; if (!LACT.st.missed) LACT.ok++; AU.good ? AU.good() : AU.tap(); LACT.st = {};
      const capNote = w.kind === 'case' ? (isSpell && a.cap ? ` (${a.cap}: ${ans})` : ` (대문자·소문자도 확인: ${ans})`) : '';
      toast(`⭕ 정답! ${esc(ans)}${capNote}`, 1300); sayP(isSpell ? ans : it[1].replace('____', ans));
      LACT.i++; const total = isSpell ? LACT.items.length : a.items.length;
      if (LACT.i >= total) return lDone(isSpell ? '철자를 모두 바르게 썼어요! ⌨️' : '문장을 모두 완성했어요!');
      renderLact();
    } else {
      AU.bad(); LACT.st.missed = true; LACT.st.given = raw; LACT.st.tries = (LACT.st.tries || 0) + 1;
      LACT.st.msg = writingMsg(w, ans, isSpell);
      if (w.kind === 'wrong' || w.kind === 'typo') LACT.st.h = Math.min((LACT.st.h || 0) + 1, ans.length - 1);
      renderLact();
    }
  }
  function typedHelpHTML() {
    if (!LACT.st.missed) return '';
    return `<div class="row-btns l-why">${CONTEST ? '<button class="btn ai-btn sm" data-act="lwhy">🤖 왜 틀렸어?</button>' : ''}${(LACT.st.tries || 0) >= 3 ? '<button class="btn ghost sm" data-act="lreveal">정답 보고 넘어가기</button>' : ''}</div>`;
  }
  /* 9) AI 대화 짝꿍 · 역할극 */
  function rTalk() {
    const { a } = LACT, left = a.turns - LACT.sent;
    afterRender = () => { const l = $('#tkLog'); if (l) l.scrollTop = l.scrollHeight; };
    return `<div class="glass l-talk"><div class="ai-log" id="tkLog">${LACT.log.map(m => m.me ? `<div class="ai-msg me"><p>${esc(m.text)}</p></div>` : `<div class="ai-msg bot ${m.err ? 'err' : ''}"><p><b class="en">${esc(m.text)}</b>${m.ko ? `<small class="ko">${esc(m.ko)}</small>` : ''}</p>${m.err ? '' : `<button class="ai-say" data-act="lsay" data-t="${esc(m.text)}">🔊 듣기</button>`}</div>`).join('')}${LACT.busy ? '<div class="ai-msg bot"><p class="ai-wait">생각하는 중이에요<span>…</span></p></div>' : ''}</div>
      ${LACT.end ? `<button class="btn" data-act="lgo">✅ 대화 끝! 완료하기</button>` : `<div class="ai-cats">${a.hints.map(h => `<button class="ai-c" data-act="lhint" data-t="${esc(h)}">${esc(h)}</button>`).join('')}</div>
      <form id="tkForm" class="ai-form"><input id="tkIn" maxlength="60" autocomplete="off" placeholder="영어로 대답해요 (모르면 한국어도 OK)">${SR ? '<button type="button" class="btn ghost" id="tkMic" aria-label="말해서 입력">🎙️</button>' : ''}<button class="btn" type="submit">보내기</button></form>
      <p class="voice-note">남은 대답 ${left}번 · 아래 문장을 눌러서 써도 돼요${LACT.fail ? ' · <button class="linkish" data-act="lgo">AI 없이 완료하기</button>' : ''}</p>`}</div>`;
  }
  async function talkSend(text) {
    if (LACT.busy || !text) return;
    if (/\d{2,3}[- ]?\d{3,4}[- ]?\d{4}/.test(text)) { toast('전화번호 같은 내 정보는 적지 않아요!'); return; }
    if (!SESS) { toast('🤖 AI 짝꿍은 로그인한 친구만 쓸 수 있어요.'); LACT.fail = true; renderLact(); return; }
    const { a } = LACT; LACT.sent++; const last = LACT.sent >= a.turns;
    LACT.log.push({ me: true, text }); LACT.busy = true; renderLact();
    const r = await api('/api/ai/talk', { unit: LU, scenario: a.scenario, text, last, history: LACT.log.slice(0, -1).map(m => ({ me: !!m.me, text: m.text })) }, { token: SESS.token, timeout: 25000 });
    LACT.busy = false;
    if (r.ok) { LACT.log.push({ text: r.en, ko: r.ko }); sayP(r.en); if (last) LACT.end = true; }
    else { LACT.log.push({ text: r.error || 'AI 짝꿍과 연결이 안 돼요.', err: true }); LACT.fail = true; LACT.sent--; }
    renderLact();
  }
  /* 10) AI 쓰기 도우미 */
  function rWriteAI() {
    const { a } = LACT;
    afterRender = () => {};
    return `<div class="glass l-aiw"><p class="l-q">✏️ ${esc(a.task)}</p><div class="ai-cats">${a.frames.map(f => `<button class="ai-c" data-act="lframe" data-t="${esc(f)}">${esc(f)}</button>`).join('')}</div>
      <textarea id="awIn" maxlength="200" rows="4" placeholder="예: Today is Monday. I have art class today.">${esc(LACT.st.text || '')}</textarea>
      <div class="row-btns"><button class="btn" id="awGo" ${LACT.busy ? 'disabled' : ''}>${LACT.busy ? '🤖 읽는 중…' : '🤖 AI에게 보여 주기'}</button></div>
      ${LACT.st.fb ? `<div class="ai-box aw-fb">${esc(LACT.st.fb).replace(/\n/g, '<br>')}</div><p class="voice-note">AI가 만든 도움말이라 틀릴 수도 있어요.</p>` : ''}
      ${LACT.st.fb || LACT.fail ? `<button class="btn ${LACT.st.fb ? '' : 'ghost'}" data-act="lgo">✅ 완료하기</button>` : ''}</div>`;
  }
  async function writeSend() {
    const v = ($('#awIn').value || '').trim(); LACT.st.text = v;
    if (v.split(/\s+/).length < 3) { toast('영어로 2~3문장 써 볼까요?'); return; }
    if (!SESS) { toast('🤖 AI 쓰기 도우미는 로그인한 친구만 쓸 수 있어요.'); LACT.fail = true; renderLact(); return; }
    LACT.busy = true; renderLact();
    const r = await api('/api/ai/write', { unit: LU, text: v }, { token: SESS.token, timeout: 25000 });
    LACT.busy = false; if (r.ok) LACT.st.fb = r.text; else { toast(r.error || 'AI 도우미와 연결이 안 돼요.', 2600); LACT.fail = true; }
    renderLact();
  }
  /* 11) 역할극 대본 */
  function rScript() {
    const { a } = LACT;
    afterRender = () => { const c = $('.l-sline.cur'); if (c) c.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
    if (!LACT.role) return `<div class="glass l-script"><p class="sub">누구 역할을 해 볼까요? 다른 역할은 친구(기기 목소리)가 읽어 줘요.</p><div class="l-opts g2">${a.roles.map(r => `<button class="l-opt" data-act="lrole" data-v="${r}">🎭 ${r}</button>`).join('')}</div></div>`;
    const k = LACT.i, line = a.lines[k];
    return `<div class="glass l-script"><p class="sub">나는 <b>${esc(LACT.role)}</b> · 내 차례가 되면 크게 읽고 ▶를 눌러요</p>
      <div class="l-sc">${a.lines.map(([who, en, ko], j) => `<div class="l-sline ${who === LACT.role ? 'me' : ''} ${j === k ? 'cur' : ''} ${j < k ? 'past' : ''}"><i>${esc(who)}</i><b>${esc(en)}</b><small>${esc(ko)}</small></div>`).join('')}</div>
      ${k < a.lines.length ? (line[0] === LACT.role ? `<button class="btn" data-act="lgo">🗣️ 읽었어요 ▶</button>` : `<button class="btn ghost" data-act="lgo">▶ 친구 대사 듣기</button>`) : ''}</div>`;
  }
  async function scriptStep() {
    const { a } = LACT; const line = a.lines[LACT.i];
    if (!line) return lDone(`${LACT.role} 역할을 멋지게 해냈어요! 🎭`);
    if (line[0] !== LACT.role) { await sayP(line[1], .85); }
    LACT.i++;
    if (LACT.i >= a.lines.length) return lDone(`${LACT.role} 역할을 멋지게 해냈어요! 🎭`);
    renderLact();
    const nx = a.lines[LACT.i]; if (nx && nx[0] !== LACT.role && !S.settings.quiet) { await wait(300); if (LACT && LACT.a.type === 'script' && LACT.i < a.lines.length && a.lines[LACT.i][0] !== LACT.role) scriptStep(); }
  }
  function lStep() { // 활동마다 '다음/완료' 버튼
    if (!LACT) return; const { a } = LACT;
    if (a.type === 'chant' || a.type === 'aitalk' || a.type === 'aiwrite') return lDone(a.type === 'chant' ? '챈트를 끝까지 불렀어요! 🎵' : a.type === 'aitalk' ? 'AI 친구와 영어로 대화했어요! 🤖' : '영어 글을 쓰고 다듬었어요! ✏️');
    if (a.type === 'speak') { LACT.st = {}; LACT.i++; if (LACT.i >= LACT.items.length) return lDone('다섯 문장을 모두 말해 봤어요! 🎙️'); return renderLact(); }
    if (a.type === 'script') return scriptStep();
  }
  document.addEventListener('click', e => { // 차시 활동 화면 전용 버튼
    if (view !== 'lact' || !LACT) return;
    const t = e.target.closest('#chantGo, #micGo, #koT, #spHint, #awGo, #tkMic, [data-act=lhint], [data-act=lframe], [data-act=lrole]'); if (!t) return;
    e.preventDefault(); e.stopPropagation();
    if (t.id === 'chantGo') chantPlay();
    else if (t.id === 'micGo') micGo();
    else if (t.id === 'koT') { LACT.st.ko = !LACT.st.ko; renderLact(); }
    else if (t.id === 'spHint') { const it = LACT.items[LACT.i]; LACT.st.h = Math.min((LACT.st.h || 0) + 1, it[0].length - 1); renderLact(); }
    else if (t.id === 'awGo') writeSend();
    else if (t.id === 'tkMic') { t.disabled = true; t.textContent = '👂'; listenOnce().then(al => { const i = $('#tkIn'); if (al && i) i.value = al[0]; t.disabled = false; t.textContent = '🎙️'; }); }
    else if (t.dataset.act === 'lhint') { const i = $('#tkIn'); if (i) { i.value = t.dataset.t; i.focus(); } }
    else if (t.dataset.act === 'lframe') { const i = $('#awIn'); if (i) { i.value = (i.value ? i.value.trim() + ' ' : '') + t.dataset.t; i.focus(); } }
    else if (t.dataset.act === 'lrole') { AU.tap(); LACT.role = t.dataset.v; LACT.i = 0; renderLact(); if (LACT.a.lines[0][0] !== LACT.role) setTimeout(scriptStep, 400); }
  }, true);
  document.addEventListener('submit', e => {
    if (view !== 'lact' || !LACT) return;
    if (e.target.id === 'spForm') { e.preventDefault(); e.stopPropagation(); checkTyped(); }
    if (e.target.id === 'tkForm') { e.preventDefault(); e.stopPropagation(); const i = $('#tkIn'); const v = i.value.trim(); i.value = ''; talkSend(v); }
  }, true);

  /* 파닉스 표 */
  const PH = AQ_PHONICS; let phGroup = 'abc';
  function renderPhonics() {
    const g = PH.GROUPS.find(x => x.key === phGroup) || PH.GROUPS[0];
    main.innerHTML = `<div class="screen-title"><button class="back" data-act="go" data-v="units" aria-label="뒤로">←</button><div><h2>파닉스 표</h2><p>글자를 누르면 소리를 듣고 입 모양을 따라 할 수 있어요</p></div></div>
      <div class="v-tabs">${PH.GROUPS.map(x => `<button class="${x.key === g.key ? 'on' : ''}" data-act="phgroup" data-v="${x.key}">${x.name}</button>`).join('')}</div>
      <div class="ph-grid ${g.key}">${g.items.map((it, k) => `<button class="ph-cell" data-act="phcell" data-v="${k}"><b>${esc(it.g)}</b><span class="e">${it.e}</span><small>${esc(it.word)}</small><i>${esc(it.ko)}</i></button>`).join('')}</div>
      <p class="voice-note">${g.key === 'abc' ? '글자마다 이름(에이, 비…)과 소리(애, 브…)가 달라요. 단어 속에서는 "소리"로 읽어요!' : g.key === 'long' ? '모음 뒤에 e가 붙거나 모음 두 개가 짝꿍이 되면, 모음이 자기 이름 소리를 내요.' : '두 글자가 만나서 새로운 한 소리를 만들어요.'} 🔊 발음은 기기의 영어 음성으로 들려줘요.</p>`;
  }
  function phSay(it, slow) {
    const name = it.g.length <= 3 && it.g.includes(' ') ? it.g.split(' ')[0] + '.' : '';
    speak(`${name} ${it.word}. ${it.word}.`, slow ? 0.55 : 0.8);
  }
  function phVideoHTML(gk, it) { // 입 모양 영상 (체험판) — 누를 때만 유튜브를 불러옴
    const v = PH.VIDEO && PH.VIDEO[`${gk}:${it.g}`];
    if (!v) return `<p class="ph-vnone">🎬 이 소리는 아직 입 모양 영상이 없어요. 위 그림을 보고 따라 해요!</p>`;
    return `<div class="ph-video" data-id="${esc(v[0])}"><button class="btn ph-vbtn" data-act="phvideo">🎬 실제 입 모양 영상 보기<small>영상 속 예시 단어: ${esc(v[1])}</small></button></div>`;
  }
  function phonicsSheet(k) {
    const g = PH.GROUPS.find(x => x.key === phGroup), it = g.items[k]; if (!it) return;
    const m = PH.MOUTH[it.mouth];
    const word = it.word, idx = g.key === 'long' && it.g.includes('_') ? -1 : word.indexOf(it.g.split(' ').pop().toLowerCase());
    const wordHTML = idx >= 0 ? `${esc(word.slice(0, idx))}<em>${esc(word.slice(idx, idx + it.g.split(' ').pop().length))}</em>${esc(word.slice(idx + it.g.split(' ').pop().length))}` : esc(word).replace(/[aeiou](?=[^aeiou]e$)|e$/g, c => `<em>${c}</em>`);
    openSheet(`<button class="close" data-act="closeSheet" aria-label="닫기">✕</button>
      <div class="ph-detail"><div class="ph-big">${esc(it.g)}</div><div class="ph-sound"><b>${esc(it.ipa)}</b><span>"${esc(it.ko)}" 소리</span></div></div>
      <div class="ph-mouth">${PH.mouthSVG(it.mouth, !S.settings.reduceMotion)}<div><b>👄 ${m.name}</b><p>${esc(it.tip || m.tip)}</p>${it.tip ? `<p class="sub">${esc(m.tip)}</p>` : ''}</div></div>
      ${CONTEST ? phVideoHTML(g.key, it) : ''}
      <div class="ph-ex"><span class="e">${it.e}</span><span class="w">${wordHTML}</span></div>
      <div class="grid2"><button class="btn" data-act="phsay" data-v="${k}">🔊 소리 듣기</button><button class="btn ghost" data-act="phsay" data-v="${k}" data-slow="1">🐢 천천히</button></div>
      <div class="grid2" style="margin-top:8px"><button class="btn ghost" data-act="phcell" data-v="${(k + g.items.length - 1) % g.items.length}">◀ 이전</button><button class="btn ghost" data-act="phcell" data-v="${(k + 1) % g.items.length}">다음 ▶</button></div>`);
    if (!S.settings.quiet) phSay(it);
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
    aiexplain: async () => {
      if (!CONTEST || !Q) return; AU.tap();
      const q = Q.list[Q.i];
      if (!SESS) { toast('🤖 AI 선생님은 로그인한 친구만 쓸 수 있어요.'); return; }
      openSheet(`<button class="close" data-act="closeSheet" aria-label="닫기">✕</button><h3>🤖 AI 애플 선생님</h3><div class="ai-box"><p class="ai-wait">생각하는 중이에요<span>…</span></p></div>`);
      const r = await api('/api/ai/explain', { type: q.type, prompt: q.prompt, show: q.type === 'phonics' ? '?' + q.show : (q.show || ''), options: q.options || q.tiles || [], answer: q.answer === 'match' ? q.explain : q.answer, given: Q.given || '', explain: q.explain }, { token: SESS.token, timeout: 25000 });
      const box = $('.sheet .ai-box'); if (!box) return;
      box.innerHTML = r.ok ? `<p>${esc(r.text).replace(/\n/g, '<br>')}</p><p class="voice-note">AI가 만든 설명이에요. 이상한 점이 있으면 선생님께 물어보세요.</p>` : `<p>${esc(r.error || 'AI 선생님과 연결이 안 돼요.')}</p>`;
    },
    tfromlogin: () => { AU.tap(); const ov = $('.loginov'); if (ov) ov.remove(); TV = 'reg'; TERR = ''; go('tch'); },
    tbacklogin: () => { AU.tap(); if (SESS) { go('me'); return; } go('home'); loginScreen(loginScreen.after || afterGate); },
    tai: async () => {
      AU.tap(); const off = !TS.ai_off;
      const r = await api('/api/teacher/ai', { off }, { token: TS.token });
      if (!r.ok) { toast(r.error || '바꾸지 못했어요.'); return; }
      TS.ai_off = r.ai_off; lsSet(TSESS_KEY, TS); toast(r.ai_off ? '🤖 우리 반 AI 기능을 껐어요.' : '🤖 우리 반 AI 기능을 켰어요!'); renderTeach();
    },
    lessons: d => { AU.tap(); closeSheet(); LU = +d.v; go('lessons'); },
    daily: () => { if (!CONTEST) return; AU.tap(); startDaily(); },
    battle: () => { if (!CONTEST) return; AU.tap(); closeSheet(); BT = null; go('battle'); },
    btstart: () => { AU.tap(); startBattle(); },
    btans: (d, el) => { battleAnswer(+d.v, el); },
    btquit: () => { AU.tap(); if (BT && BT.iv) clearInterval(BT.iv); BT = null; go('units'); },
    lconf: d => { AU.tap(); LACT.pred = +d.v; LACT.askConf = false; renderLact(); const st = LACT.steps && LACT.steps[0]; if (st && st.speak && !S.settings.quiet) setTimeout(() => sayP(st.speak), 250); },
    lwhy: () => { lessonWhy(); },
    lnextq: () => { AU.tap(); choiceAdvance(); },
    lretry: () => { AU.tap(); startAct(LACT.ch.no, LACT.a.id); },
    lreveal: () => { const { a } = LACT, isSpell = a.type === 'spell', it = isSpell ? LACT.items[LACT.i] : a.items[LACT.i], ans = isSpell ? it[0] : it[2]; toast(`정답은 ${ans} 예요. 다음에 다시 써 봐요!`, 2200); LACT.n++; LACT.st = {}; LACT.i++; const total = isSpell ? LACT.items.length : a.items.length; if (LACT.i >= total) return lDone(isSpell ? '철자 쓰기를 끝냈어요! ⌨️' : '문장 완성을 끝냈어요!'); renderLact(); },
    lchap: d => { AU.tap(); closeSheet(); stopSay(); LU = +d.u; LCH = +d.c; go('lchap'); },
    lnextch: () => { AU.tap(); stopSay(); LCH++; go('lchap'); },
    lstart: d => { AU.tap(); startAct(+d.c, d.v); },
    lnext: () => { AU.tap(); nextAct(); },
    lback: () => { AU.tap(); stopSay(); if (LACT) LCH = LACT.ch.no; go('lchap'); },
    lpick: (d, el) => { lPick(+d.v, el); },
    lsay: d => { sayP(d.t, d.slow ? .6 : .85); },
    lgo: () => { lStep(); },
    tsetcode: () => {
      AU.tap();
      openSheet(`<button class="close" data-act="closeSheet" aria-label="닫기">✕</button><h3>✏️ 학급 코드 바꾸기</h3>
        <p class="sub">영어·숫자 4~8자리로 정해요. 예: 대한초 4학년 1반 → <b>DH0401</b><br>바꾸면 예전 코드로는 더 이상 찾을 수 없어요. 이미 들어온 학생 기록은 그대로예요.</p>
        <input class="field code-in" id="newcode" maxlength="8" value="${esc(TS.class_code || '')}" autocomplete="off" autocapitalize="characters">
        <p class="login-err" id="newcode-err"></p>
        <div class="row-btns"><button class="btn" data-act="tsavecode">저장하기</button><button class="btn ghost" data-act="closeSheet">취소</button></div>`);
    },
    tsavecode: async () => {
      const v = ($('#newcode').value || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), e = $('#newcode-err');
      if (!/^[A-Z0-9]{4,8}$/.test(v)) { e.textContent = '영어·숫자 4~8자리로 적어 주세요.'; return; }
      const r = await api('/api/teacher/set-code', { class_code: v }, { token: TS.token });
      if (!r.ok) { e.textContent = r.error || '바꾸지 못했어요.'; return; }
      TS.class_code = r.class_code; lsSet(TSESS_KEY, TS); closeSheet(); toast(`🔑 학급 코드가 ${r.class_code}(으)로 바뀌었어요!`); renderTeach();
    },
    tcopycode: () => { if (TS && TS.class_code) copyText(TS.class_code, '학급 코드를 복사했어요!'); },
    scode: async () => {
      const inp = $('#s-code'), ok = $('#s-code-ok'); if (!inp) return;
      const code = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); inp.value = code;
      if (code.length < 4) { ok.className = 'code-ok bad'; ok.textContent = '학급 코드를 다시 확인해 주세요. (영어·숫자 4~8자리)'; return; }
      ok.className = 'code-ok'; ok.textContent = '확인하는 중…';
      const r = await api('/api/class?code=' + encodeURIComponent(code));
      if (!r.ok) { ok.className = 'code-ok bad'; ok.textContent = r.error || '학급 코드를 찾을 수 없어요.'; AU.bad(); return; }
      const sp = $('#sp-s'); sp.dataset.code = r.school_code; sp.dataset.name = r.school_name;
      const q = $('#sp-s-q'); if (q) q.value = r.school_name;
      const sel = sp.querySelector('.sp-sel'); if (sel) sel.innerHTML = `✅ <b>${esc(r.school_name)}</b>`;
      const sg = $('#s-g'), sc = $('#s-c'); if (sg) sg.value = String(r.grade); if (sc) sc.value = String(r.cls);
      ok.className = 'code-ok good'; ok.innerHTML = `✅ <b>${esc(r.school_name)} ${r.grade}학년 ${r.cls}반</b>${r.teacher_name ? ` · ${esc(r.teacher_name)} 선생님 반` : ''}<br><small>이제 번호·닉네임·비밀번호만 적으면 돼요!</small>`;
      AU.good && AU.good(); const n = $('#s-n'); if (n) n.focus();
    },
    aihelp: () => { AU.tap(); aiHelp(); },
    aiq: (d, el) => { AU.tap(); aiAsk(d.k, el.dataset.q || el.textContent.trim()); },
    aichips: d => { AU.tap(); const box = $('.ai-sub'); if (box) { box.innerHTML = aiSubChips(d.v); box.dataset.on = d.v; } },
    aisay: d => { const m = AIH.log[+d.v]; if (!m) return; const en = (m.text.match(/[A-Za-z][A-Za-z'’,.!? -]*[A-Za-z.!?]/g) || []).filter(x => /[a-z]{2,}/i.test(x)).join('. '); if (en) speak(en); else toast('영어 부분이 없어요.'); },
    demo: d => {
      if (!CONTEST) return;
      const v = d.v; AU.tap();
      if (v === 'coins') { S.coins = (S.coins || 0) + 1000; toast('🍎 사과 1000개를 받았어요! 상점과 마을에서 써 보세요.'); }
      if (v === 'units') { UNITS.forEach(u => { const r = L.unitRec(S, u.id); r.sets = [true, true]; if (!r.done) { r.done = true; S.fruits += 1; } }); BOSSES.forEach(b => { S.bosses[b.id] = true; }); S.studyDays = Math.max(S.studyDays || 0, 15); toast('📚 모든 단원·보스전 완료! 장식·마을 건물이 열렸어요.'); }
      if (v === 'evolve') { if (S.maxStage >= 2) { toast('이미 최종 단계(애플대왕)예요!'); return; } S.maxStage += 1; S.stage = S.maxStage; if (!S.cards.includes(S.maxStage)) S.cards.push(S.maxStage); S.exp = Math.max(S.exp, [0, 300, 900][S.maxStage]); toast(`✨ ${STAGES[S.stage].name}(으)로 진화했어요!`); }
      if (v === 'hungry') { S.full = 10; S.fullAt = now(); toast('🍽️ 배고픈 상태가 되었어요. 홈과 마을을 확인해 보세요.'); }
      if (v === 'decay') { if (!S.maxStage) { toast('먼저 진화해야 퇴화를 볼 수 있어요.'); return; } S.lastStudy = now() - 5 * 86400000; S.lastSeen = S.lastStudy; L.applyDecay(S, now()); toast('😴 며칠 빠진 상태예요. 복습 퀴즈로 되찾아 보세요!'); }
      if (v === 'reset') { try { localStorage.removeItem(KEY); localStorage.removeItem(SESS_KEY); } catch (e) {} location.reload(); return; }
      save(); render();
    },
    phvideo: (d, el) => {
      AU.tap(); const box = el.closest('.ph-video'), id = box.dataset.id;
      if (!navigator.onLine) { toast('인터넷에 연결되어 있어야 영상을 볼 수 있어요.'); return; }
      box.innerHTML = `<div class="ph-frame"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&playsinline=1&autoplay=1&modestbranding=1" title="입 모양 영상" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
        <p class="ph-vsrc">영상 출처: <a href="${PH.VIDEO_SRC.url}" target="_blank" rel="noopener">${esc(PH.VIDEO_SRC.name)}</a> · 영국식 발음 · 안 나오면 <a href="https://youtu.be/${encodeURIComponent(id)}" target="_blank" rel="noopener">유튜브에서 열기</a></p>`;
    },
    phgroup: d => { AU.tap(); phGroup = d.v; renderPhonics(); },
    phcell: d => { AU.tap(); closeSheet(); phonicsSheet(+d.v); },
    phsay: d => { const g = PH.GROUPS.find(x => x.key === phGroup); const it = g && g.items[+d.v]; if (it) phSay(it, !!d.slow); },
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
      const q = Q.list[Q.i]; const val = q.options[+d.v]; const ok = L.checkAnswer(q, val); Q.given = val;
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
        Q.given = Q.order.map(k => q.tiles[k]).join(' '); const ok = L.checkAnswer(q, Q.given);
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
  const PFX = CONTEST ? 'aq-contest-' : 'aq-'; // 체험판은 로그인 정보도 따로 저장
  const SESS_KEY = PFX + 'session-v1', TSESS_KEY = PFX + 'teacher-v1', LAST_SCHOOL = PFX + 'last-school';
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
      <div class="who-row"><span class="who on">🎒 학생</span><button type="button" class="who" data-act="tfromlogin">👩‍🏫 선생님</button></div>
      <label class="lb" for="s-code">학급 코드 <small>(선생님께 받은 코드 · 있으면 학교·반이 자동으로 채워져요)</small></label>
      <div class="sp-row"><input class="field code-in" id="s-code" maxlength="8" placeholder="예: DH0401" autocomplete="off" autocapitalize="characters"><button type="button" class="btn sp-go" data-act="scode">확인</button></div>
      <p class="code-ok" id="s-code-ok"></p>
      <label class="lb">우리 학교 <small>(학급 코드가 없으면 직접 골라요)</small></label>${schoolPickerHTML('sp-s')}
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
    if (r.ok) { TLIST = r.students; TS.export_key = r.export_key || TS.export_key; if (r.class_code) TS.class_code = r.class_code; TS.ai_off = !!r.ai_off; lsSet(TSESS_KEY, TS); TERR = ''; }
    else if (r.status === 401) { TS = null; lsSet(TSESS_KEY, null); TERR = '다시 로그인해 주세요.'; }
    else TERR = r.error;
    if (view === 'tch') renderTeach();
  }
  function renderTeach() {
    let h = `<div class="screen-title"><button class="back" ${SESS ? 'data-act="go" data-v="me"' : 'data-act="tbacklogin"'} aria-label="뒤로">←</button><div><h2>선생님 탭</h2><p>${SESS ? '우리 반 아이들의 학습 현황을 확인해요' : '선생님 등록 · 로그인'}</p></div></div>`;
    if (!SESS && !TS) h += `<div class="glass t-guide">👩‍🏫 <b>처음이신가요?</b> "처음 등록하기"로 우리 반을 등록하면 ${CONTEST ? '바로 승인되고' : '제작자 승인 후'} <b>학급 코드</b>가 생겨요. 학생들은 첫 화면에 이 코드만 넣으면 우리 반으로 들어와요.<br><button class="linkish" data-act="tbacklogin">← 학생으로 시작하기</button></div>`;
    if (!API) { main.innerHTML = h + `<div class="glass" style="color:#eef3ff;line-height:1.6">학급 서버가 연결되면 사용할 수 있어요.<br><small style="color:#a9bce0">제작자가 서버 주소를 설정하면 열려요.</small></div>`; return; }
    if (!TS) {
      h += `<div class="tabs"><button class="${TV === 'login' ? 'on' : ''}" data-act="ttab" data-v="login">로그인</button><button class="${TV === 'reg' ? 'on' : ''}" data-act="ttab" data-v="reg">처음 등록하기</button></div>
        <form class="glass tform" id="${TV === 'login' ? 'tlogin' : 'treg'}" autocomplete="off">
          ${TV === 'login' ? `<label class="lb" for="t-code">학급 코드 <small>(있으면 학교·반 대신 코드로 들어와요)</small></label><input class="field code-in" id="t-code" maxlength="8" placeholder="예: DH0401" autocomplete="off" autocapitalize="characters">
          <p class="login-note" style="margin:2px 0 6px">또는 학교·학년·반으로</p>` : ''}
          <label class="lb">학교</label>${schoolPickerHTML('sp-t')}
          ${classSelectHTML('t', false)}
          ${TV === 'reg' ? `<label class="lb" for="t-name">선생님 성함</label><input class="field" id="t-name" maxlength="20" placeholder="예: 김사과">
            <label class="lb" for="t-contact">연락처 <small>(선택 · 승인 안내용 이메일 등)</small></label><input class="field" id="t-contact" maxlength="60" placeholder="예: teacher@school.kr">
            <label class="lb" for="t-mycode">우리 반 학급 코드 정하기 <small>(선택 · 영어·숫자 4~8자리)</small></label><input class="field code-in" id="t-mycode" maxlength="8" placeholder="예: DH0401" autocomplete="off" autocapitalize="characters">
            <p class="login-note" style="margin:2px 0 6px">학교 영어 앞글자 + 학년 2자리 + 반 2자리로 만들면 기억하기 쉬워요. (대한초 4학년 1반 → <b>DH0401</b>) 비워 두면 자동으로 만들어 드려요.</p>` : ''}
          <label class="lb" for="t-pw">선생님 비밀번호 ${TV === 'reg' ? '<small>(6자 이상, 새로 정해요)</small>' : ''}</label><input class="field" id="t-pw" type="password" maxlength="40">
          <p class="login-err" id="t-err">${esc(TERR)}</p>
          <button class="btn" type="submit">${TV === 'login' ? '들어가기' : '등록 요청 보내기'}</button>
          <p class="login-note">${TV === 'reg' ? (CONTEST ? '체험판은 등록하면 바로 승인되고 학급 코드가 만들어져요.' : '등록 요청을 보내면 제작자가 확인한 뒤 승인해요. 승인되면 학급 코드가 생기고, 같은 학교·학년·반(또는 학급 코드)과 비밀번호로 들어올 수 있어요.') + ' 다른 반 학생 정보는 볼 수 없어요.' : '아직 등록하지 않았다면 "처음 등록하기"를 눌러 주세요.'}</p>
        </form>`;
      main.innerHTML = h; return;
    }
    const L2 = TLIST || [];
    const today = new Date(now()); today.setHours(0, 0, 0, 0);
    const active = L2.filter(x => x.lastStudy && x.lastStudy >= today.getTime()).length;
    const accAvg = L2.length ? Math.round(L2.reduce((a, x) => a + (x.accuracy || 0), 0) / L2.length) : 0;
    const needReview = L2.filter(x => !x.lastStudy || now() - x.lastStudy > 7 * L.DAY).length;
    h += `<div class="glass tinfo"><b>🏫 ${esc(TS.school_name)} ${TS.grade}학년 ${TS.cls}반</b><span>${esc(TS.teacher_name || '')} 선생님</span></div>
      ${!TS.class_code ? `<div class="code-card"><small>🔑 우리 반 학급 코드</small><p style="margin:6px 0 10px">아직 학급 코드가 없어요. 직접 정해 보세요! (예: 대한초 4학년 1반 → DH0401)</p><button class="btn" data-act="tsetcode">✏️ 학급 코드 만들기</button></div>` : ''}
      ${TS.class_code ? `<div class="code-card"><small>🔑 우리 반 학급 코드</small><b>${esc(TS.class_code)}</b><p>학생들은 첫 화면의 <b>학급 코드</b> 칸에 이 코드를 넣으면 학교·학년·반이 자동으로 채워져요. 선생님도 이 코드와 비밀번호로 로그인할 수 있어요.</p><div class="row-btns"><button class="btn" data-act="tcopycode">코드 복사하기</button><button class="btn ghost" data-act="tsetcode">✏️ 코드 바꾸기</button></div></div>` : ''}
      ${CONTEST ? `<div class="glass ai-switch"><span>🤖 우리 반 AI 기능 <small>(AI 선생님 · 도우미 · 대화 짝꿍 · 쓰기 도우미)</small></span><button class="sw-btn ${TS.ai_off ? 'off' : 'on'}" data-act="tai">${TS.ai_off ? '꺼짐' : '켜짐'}</button></div>` : ''}
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
    if (!renderTeach.shown) { main.scrollTop = 0; window.scrollTo(0, 0); renderTeach.shown = true; }
  }
  async function teacherSubmit(form) {
    const reg = form.id === 'treg', box = form.querySelector('.sp'), err = form.querySelector('#t-err'), btn = form.querySelector('[type=submit]');
    const tcode = !reg && $('#t-code') ? $('#t-code').value.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
    const body = tcode ? { class_code: tcode, password: $('#t-pw').value } : { school_code: box.dataset.code, school_name: box.dataset.name, grade: +$('#t-g').value, cls: +$('#t-c').value, password: $('#t-pw').value };
    if (!tcode && !body.school_code) { err.textContent = '학급 코드를 넣거나, 학교를 검색해서 목록에서 골라 주세요.'; return; }
    if (reg) {
      body.teacher_name = $('#t-name').value.trim(); body.contact = $('#t-contact').value.trim();
      const mc = $('#t-mycode').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (mc && !/^[A-Z0-9]{4,8}$/.test(mc)) { err.textContent = '학급 코드는 영어·숫자 4~8자리로 정해 주세요. (예: DH0401)'; return; }
      if (mc) body.class_code = mc;
    }
    btn.disabled = true; err.textContent = '';
    const r = await api(reg ? '/api/teacher/register' : '/api/teacher/login', body);
    btn.disabled = false;
    if (!r.ok) { err.textContent = r.error; return; }
    if (!tcode) { const last = lsGet(LAST_SCHOOL) || {}; lsSet(LAST_SCHOOL, { ...last, code: body.school_code, name: body.school_name, grade: body.grade, cls: body.cls }); }
    if (reg && r.approved) { const lr = await api('/api/teacher/login', { school_code: body.school_code, school_name: body.school_name, grade: body.grade, cls: body.cls, password: body.password }); if (lr.ok) { toast('✅ 체험판이라 바로 승인됐어요!'); TS = { token: lr.token, school_name: lr.school_name, grade: lr.grade, cls: lr.cls, teacher_name: lr.teacher_name, export_key: lr.export_key, class_code: lr.class_code }; lsSet(TSESS_KEY, TS); TERR = ''; loadTeach(); return; } }
    if (reg) { TV = 'login'; TERR = ''; renderTeach(); openSheet(`<h3>등록 요청을 보냈어요</h3><p class="sub">${esc(body.school_name)} ${body.grade}학년 ${body.cls}반<br>제작자가 확인하고 승인하면 같은 정보와 비밀번호로 로그인할 수 있어요. 로그인하면 우리 반 <b>학급 코드</b>가 보여요.</p><p class="sub">학생들은 승인을 기다리지 않고 지금 바로 시작해도 돼요. 기록은 승인 뒤 선생님 화면에 모두 보여요.</p><div class="row-btns"><button class="btn" data-act="closeSheet">확인</button></div>`); return; }
    TS = { token: r.token, school_name: r.school_name, grade: r.grade, cls: r.cls, teacher_name: r.teacher_name, export_key: r.export_key, class_code: r.class_code };
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
        ${CONTEST ? '<p class="contest-badge">🏆 공모전 출품 체험판 · 🤖 AI 선생님</p>' : ''}
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
  window.__AQ = { get S() { return S; }, set S(v) { S = v; }, go, ACT, cloudFlush, playEvolution, playIntro, L, render, save, get Q() { return Q; }, get LACT() { return LACT; }, get BT() { return BT; } };
  boot();
})();
