/* 애플왕의 진화 모험 — 게임 규칙(순수 함수). 브라우저와 node 테스트에서 함께 사용합니다.
 * 서버(Cloudflare Workers) 단계에서는 이 파일의 보상·진화·퇴화 계산을 서버로 옮겨 검증합니다.
 */
(function (root) {
  const DAY = 86400000;

  function newState(rules) {
    return {
      v: 1, name: '', introSeen: false, createdAt: 0,
      exp: 0, stage: 0, maxStage: 0, energy: 100,
      units: {}, bosses: {}, cards: [0], badges: [],
      earned: {}, wrong: {}, stats: { answered: 0, correct: 0, ms: 0, best: 0 },
      fruits: 0, lastStudy: 0, lastSeen: 0, forest: {},
      coins: 0, owned: [], wear: {}, studyDays: 0, lastStudyDay: '',
      settings: { sound: true, music: true, reduceMotion: false, slowVoice: false },
      rules: JSON.parse(JSON.stringify(rules)),
    };
  }

  const level = exp => 1 + Math.floor(exp / 20);
  const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const unitRec = (s, id) => (s.units[id] = s.units[id] || { sets: [false, false], done: false, ok: 0, n: 0, known: {}, last: 0 });
  const unitsDone = s => Object.keys(s.units).filter(k => s.units[k].done).length;
  const doneIds = s => Object.keys(s.units).filter(k => s.units[k].done).map(Number).sort((a, b) => a - b);

  /* 다음 진화 조건 (maxStage 기준). 퇴화 중이면 진화 대신 복구가 먼저입니다. */
  function evoRequirements(s) {
    const r = s.rules;
    if (s.maxStage >= 2) return null;
    const c = s.maxStage === 0 ? r.evo1 : r.evo2;
    return [
      { label: `누적 경험치 ${c.exp}`, have: s.exp, need: c.exp, done: s.exp >= c.exp },
      { label: `단원 완료 ${c.units}개`, have: unitsDone(s), need: c.units, done: unitsDone(s) >= c.units },
      { label: `${c.boss}차 복습 보스전 성공`, have: s.bosses[c.boss] ? 1 : 0, need: 1, done: !!s.bosses[c.boss] },
    ].concat(c.days ? [{ label: `공부한 날 ${c.days}일`, have: s.studyDays || 0, need: c.days, done: (s.studyDays || 0) >= c.days }] : []);
  }
  function canEvolve(s) {
    const req = evoRequirements(s);
    return !!req && s.stage === s.maxStage && req.every(x => x.done);
  }
  function evolve(s) {
    if (!canEvolve(s)) return false;
    s.maxStage += 1; s.stage = s.maxStage;
    if (!s.cards.includes(s.stage)) s.cards.push(s.stage);
    return true;
  }
  function expProgress(s) {
    const r = s.rules;
    const from = s.maxStage === 0 ? 0 : s.maxStage === 1 ? r.evo1.exp : r.evo2.exp;
    const to = s.maxStage === 0 ? r.evo1.exp : s.maxStage === 1 ? r.evo2.exp : null;
    if (to == null) return { cur: s.exp, to: null, pct: 100 };
    return { cur: s.exp, to, pct: Math.max(0, Math.min(100, ((s.exp - from) / (to - from)) * 100)), left: Math.max(0, to - s.exp) };
  }

  /* 보상: 같은 문제(qid)는 하루 1번만 경험치. 오답은 차감 없음. */
  function award(s, qid, kind, now) {
    const k = dayKey(now);
    if (!s.earned[k]) s.earned = { [k]: {} }; // 오늘 기록만 보관
    if (s.earned[k][qid]) return 0;
    s.earned[k][qid] = 1;
    const g = kind === 'review' || kind === 'boss' ? s.rules.expReview : s.rules.expBasic;
    s.exp += g; s.coins = (s.coins || 0) + 1; // 🍎 사과: 새로 맞힌 문제마다 1개
    return g;
  }

  function recordAnswer(s, q, correct) {
    s.stats.answered++;
    const key = q.item ? q.item.en : null;
    if (correct) s.stats.correct++;
    if (key) {
      if (!correct) s.wrong[key] = { n: ((s.wrong[key] && s.wrong[key].n) || 0) + 1, unit: q.unit };
      else if (s.wrong[key] && q.kind === 'review') delete s.wrong[key];
    }
  }

  /* 미접속 일수: 마지막 학습일 다음 날부터 오늘 전날까지. 주말 일시정지 옵션. */
  function inactiveDays(last, now, pauseWeekends) {
    if (!last) return 0;
    const a = new Date(last); a.setHours(0, 0, 0, 0);
    const b = new Date(now); b.setHours(0, 0, 0, 0);
    let n = 0;
    for (let t = a.getTime() + DAY; t < b.getTime(); t += DAY) { // 오늘은 빼고, 완전히 빠진 날만
      const wd = new Date(t).getDay();
      if (pauseWeekends && (wd === 0 || wd === 6)) continue;
      n++;
    }
    return Math.max(0, n - 0);
  }

  function applyDecay(s, now) {
    const r = s.rules;
    const res = { days: 0, energyBefore: s.energy, stageBefore: s.stage, changed: false };
    if (!r.decayOn || !s.lastStudy) return res;
    const d = inactiveDays(s.lastStudy, now, r.pauseWeekends);
    res.days = d;
    let energy = 100, stage = s.maxStage;
    if (d >= r.decayEnergyDays) energy = Math.max(20, 100 - (d - r.decayEnergyDays + 1) * 12);
    if (d >= r.decayBaseDays) stage = 0;
    else if (d >= r.decayStageDays) stage = Math.max(0, s.maxStage - 1);
    // 이미 복구한 뒤에는 다시 계산해도 더 떨어지지만 않게 (현재 값과 비교해 낮은 쪽)
    if (energy < s.energy) { s.energy = energy; res.changed = true; }
    if (stage < s.stage) { s.stage = stage; res.changed = true; }
    res.energyAfter = s.energy; res.stageAfter = s.stage;
    return res;
  }

  /* 학습 활동 기록. 복습 퀴즈 완료 시 퇴화에서 원래 단계로 복구. */
  function markStudy(s, now, kind) {
    s.lastStudy = now;
    const k = dayKey(now);
    if (s.lastStudyDay !== k) { s.lastStudyDay = k; s.studyDays = (s.studyDays || 0) + 1; s.coins = (s.coins || 0) + 5; } // 출석 보너스
    if (kind === 'review') s.coins = (s.coins || 0) + 3;
    s.energy = Math.min(100, s.energy + (kind === 'review' ? 100 : 10));
    if (kind === 'review') s.stage = s.maxStage;
  }

  function completeSet(s, unitId, setIdx, ok, total, now) {
    const u = unitRec(s, unitId);
    u.ok += ok; u.n += total; u.last = now;
    const passed = ok >= s.rules.setPass;
    if (passed) { u.sets[setIdx] = true; s.coins = (s.coins || 0) + 3; }
    let newlyDone = false;
    if (!u.done && u.sets.every(Boolean)) { u.done = true; newlyDone = true; s.fruits += 1; s.coins += 10; }
    return { passed, newlyDone };
  }

  function completeBoss(s, bossId, ok) {
    const win = ok >= s.rules.bossPass;
    if (win) s.coins = (s.coins || 0) + (s.bosses[bossId] ? 5 : 20);
    if (win && !s.bosses[bossId]) {
      s.bosses[bossId] = true;
      if (bossId === 3 && !s.badges.includes('legend')) s.badges.push('legend');
    }
    return win;
  }

  function bossOpen(s, boss) { return !!(s.units[boss.afterUnit] && s.units[boss.afterUnit].done); }

  function unitStatus(s, unit, now) {
    if (!s.rules.openUnits.includes(unit.no || unit.id)) return 'locked';
    const u = s.units[unit.id];
    if (!u) return 'open';
    if (u.done) {
      const hasWrong = Object.values(s.wrong).some(w => w.unit === unit.id);
      if (hasWrong || (now - u.last) > 7 * DAY) return 'review';
      return 'done';
    }
    if (u.sets.some(Boolean) || Object.keys(u.known).length) return 'studying';
    return 'open';
  }

  /* ---------- 문제 만들기 ---------- */
  function rng(seed) { let x = seed >>> 0 || 1; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function shuffle(a, r) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const norm = t => t.toLowerCase().replace(/[^a-z' ]/g, '').replace(/’/g, "'").trim();

  function pickDistractors(pool, ans, k, r, field) {
    const seen = new Set([norm(ans.en), ans.ko]);
    const out = [];
    for (const w of shuffle(pool, r)) {
      if (out.length >= k) break;
      if (seen.has(norm(w.en)) || seen.has(w.ko)) continue;
      if (field === 'e' && (!w.e || w.e === ans.e)) continue;
      seen.add(norm(w.en)); seen.add(w.ko); out.push(w);
    }
    return out;
  }

  function tokenize(sent) { return sent.replace(/’/g, "'").split(/\s+/).filter(Boolean); }

  function makeQ(type, unit, item, ctx, r) {
    const pool = ctx.pool;
    const base = { type, unit: unit.id, item, kind: ctx.kind };
    const id = `${unit.id}:${type}:${item.en}`;
    if (type === 'pic' || type === 'ko2en' || type === 'listen') {
      const ds = pickDistractors(type === 'pic' ? pool.filter(w => w.e) : pool, item, 3, r, type === 'pic' ? 'e' : '');
      if (ds.length < 3) return null;
      const opts = shuffle([item, ...ds], r).map(w => w.en);
      const prompt = type === 'pic' ? '그림에 알맞은 영어 단어를 고르세요.' : type === 'ko2en' ? '뜻에 알맞은 영어 단어를 고르세요.' : '잘 듣고 들리는 단어를 고르세요.';
      return { ...base, id, prompt, show: type === 'pic' ? item.e : type === 'ko2en' ? item.ko : '', speak: item.en, options: opts, answer: item.en, explain: `${item.en} = ${item.ko}` };
    }
    if (type === 'en2ko') {
      const ds = pickDistractors(pool, item, 3, r, '');
      if (ds.length < 3) return null;
      return { ...base, id, prompt: '영어 단어의 뜻을 고르세요.', show: item.en, speak: item.en, options: shuffle([item, ...ds], r).map(w => w.ko), answer: item.ko, explain: `${item.en} = ${item.ko}` };
    }
    if (type === 'listenSent') {
      const sp = ctx.sentPool.filter(x => x.en !== item.en);
      const ds = shuffle(sp, r).slice(0, 3);
      if (ds.length < 3) return null;
      return { ...base, id, prompt: '잘 듣고 알맞은 문장을 고르세요.', show: '', speak: item.en, options: shuffle([item, ...ds], r).map(x => x.en), answer: item.en, explain: `${item.en} = ${item.ko}`, wide: true };
    }
    if (type === 'blank') {
      const toks = tokenize(item.en);
      if (toks.length < 2) return null;
      const vocab = new Set(unit.words.map(w => norm(w.en)));
      let idx = toks.findIndex(t => vocab.has(norm(t)));
      if (idx < 0) { let best = -1, len = 0; toks.forEach((t, i) => { const n = norm(t).replace(/'/g, ''); if (!t.includes("'") && n.length > len) { len = n.length; best = i; } }); idx = best; }
      if (idx < 0) return null;
      const raw = toks[idx]; const word = raw.replace(/[.,?!]/g, ''); const punct = raw.slice(word.length);
      const cap = /^[A-Z]/.test(word) && idx === 0;
      const ds = [];
      for (const w of shuffle(pool, r)) {
        if (ds.length >= 3) break;
        if (w.en.includes(' ') || norm(w.en) === norm(word) || ds.includes(w.en)) continue;
        ds.push(cap ? w.en[0].toUpperCase() + w.en.slice(1) : w.en);
      }
      const shown = toks.map((t, i) => (i === idx ? '____' + punct : t)).join(' ');
      return { ...base, id: id, prompt: '문장의 빈칸에 알맞은 말을 고르세요.', show: shown, sentence: true, speak: item.en, options: shuffle([word, ...ds], r), answer: word, explain: `${item.en} (${item.ko})` };
    }
    if (type === 'order') {
      const toks = tokenize(item.en);
      if (toks.length < 3) return null;
      let sh = shuffle(toks, r); let guard = 0;
      while (sh.join(' ') === toks.join(' ') && guard++ < 5) sh = shuffle(toks, r);
      return { ...base, id, prompt: '단어를 순서대로 눌러 문장을 완성하세요.', show: item.ko, speak: item.en, tiles: sh, answer: toks.join(' '), explain: `${item.en} (${item.ko})` };
    }
    if (type === 'match') {
      const ws = [item, ...pickDistractors(unit.words.length >= 4 ? unit.words : pool, item, 3, r, '')];
      if (ws.length < 4) return null;
      return { ...base, id, prompt: '영어 단어와 뜻을 짝지어 보세요.', pairs: ws.map(w => ({ en: w.en, ko: w.ko })), left: shuffle(ws.map(w => w.en), r), right: shuffle(ws.map(w => w.ko), r), answer: 'match', explain: ws.map(w => `${w.en} = ${w.ko}`).join(' · ') };
    }
    return null;
  }

  // 세트마다 단어 2~3문제 + 문장(교과서 문형·응용 문장) 2~3문제
  const SET_PLANS = [
    ['pic', 'blank', 'ko2en', 'order', 'listenSent'],
    ['blank', 'listen', 'order', 'match', 'listenSent'],
  ];

  function buildSet(UNITS, unitId, setIdx, seed) {
    const r = rng(seed);
    const unit = UNITS.find(u => u.id === unitId);
    const pool = UNITS.flatMap(u => u.words);
    const sentPool = UNITS.flatMap(u => u.sentences);
    const ctx = { pool: unit.words.length >= 8 ? unit.words.concat(pool.slice(0, 0)) : pool, sentPool, kind: 'basic' };
    ctx.pool = unit.words; // 같은 단원 단어로 오답 보기 구성 (부족하면 전체에서 보충)
    const words = shuffle(unit.words, r);
    const used = new Set();
    const out = [];
    for (const type of SET_PLANS[setIdx % 2]) {
      let q = null;
      if (type === 'blank' || type === 'order' || type === 'listenSent') {
        for (const s of shuffle(unit.sentences, r)) {
          if (used.has(s.en)) continue;
          q = makeQ(type, unit, s, ctx, r);
          if (q) used.add(s.en);
          if (!q && type !== 'listenSent') continue;
          if (q) break;
        }
        if (!q) q = makeQ('listenSent', unit, unit.sentences[0], ctx, r);
      } else {
        for (const w of words) {
          if (used.has(w.en)) continue;
          if (type === 'pic' && !w.e) continue;
          q = makeQ(type, unit, w, { ...ctx, pool: unit.words.length >= 6 ? unit.words : pool }, r);
          if (!q && unit.words.length < 6) q = makeQ(type, unit, w, { ...ctx, pool }, r);
          if (q) { used.add(w.en); break; }
        }
      }
      if (!q) { // 대체: 뜻→영어
        const w = words.find(x => !used.has(x.en)); used.add(w.en);
        q = makeQ('ko2en', unit, w, { ...ctx, pool }, r);
      }
      out.push(q);
    }
    return out;
  }

  /* 복습/보스: 범위 단원에서 섞어서. 틀린 단어가 있으면 먼저. */
  function buildMixed(UNITS, unitIds, n, seed, kind, wrongMap) {
    const r = rng(seed);
    const pool = UNITS.flatMap(u => u.words);
    const units = UNITS.filter(u => unitIds.includes(u.id));
    const types = ['ko2en', 'pic', 'en2ko', 'listen', 'blank', 'ko2en', 'listenSent', 'order', 'en2ko', 'pic'];
    const wrongItems = [];
    if (wrongMap) for (const u of units) for (const w of u.words) if (wrongMap[w.en]) wrongItems.push({ u, w });
    const allItems = shuffle(units.flatMap(u => u.words.map(w => ({ u, w }))), r);
    const queue = shuffle(wrongItems, r).concat(allItems);
    const used = new Set(); const out = [];
    let ti = 0;
    while (out.length < n && ti < n * 4) {
      const type = types[ti++ % types.length];
      let q = null;
      if (type === 'blank' || type === 'order' || type === 'listenSent') {
        const u = units[Math.floor(r() * units.length)];
        const s = u.sentences[Math.floor(r() * u.sentences.length)];
        if (used.has(s.en)) continue;
        q = makeQ(type, u, s, { pool, sentPool: UNITS.flatMap(x => x.sentences), kind }, r);
        if (q) used.add(s.en);
      } else {
        const it = queue.find(x => !used.has(x.w.en) && (type !== 'pic' || x.w.e));
        if (!it) continue;
        q = makeQ(type, it.u, it.w, { pool: it.u.words.length >= 6 ? it.u.words : pool, sentPool: [], kind }, r);
        if (q) used.add(it.w.en);
      }
      if (q) { q.kind = kind; q.id = kind + ':' + q.id; out.push(q); }
    }
    return out;
  }

  // 조용한 교실: 듣기 문제 → 같은 정답·보기의 읽기 문제로 (문제 id는 그대로라 경험치 규칙도 그대로)
  function silentQ(q) {
    if (!q) return q;
    if (q.type === 'listen') return { ...q, type: 'ko2en', silent: true, prompt: '뜻에 알맞은 영어 단어를 고르세요.', show: q.item.ko };
    if (q.type === 'listenSent') return { ...q, type: 'ko2sent', silent: true, prompt: '뜻에 알맞은 영어 문장을 고르세요.', show: q.item.ko };
    return q;
  }

  function checkAnswer(q, given) {
    if (q.type === 'order') return norm(given) === norm(q.answer);
    if (q.type === 'match') return given === true;
    return given === q.answer;
  }

  /* 꾸미기 상점 */
  function buyItem(s, item) {
    if (!item) return 'none';
    s.owned = s.owned || []; s.wear = s.wear || {};
    if (s.owned.includes(item.id)) return 'owned';
    if ((item.stage || 0) > s.maxStage) return 'locked';
    if ((s.coins || 0) < item.price) return 'poor';
    s.coins -= item.price; s.owned.push(item.id); s.wear[item.slot] = item.id;
    return 'ok';
  }
  function toggleWear(s, item) {
    s.wear = s.wear || {};
    if (!(s.owned || []).includes(item.id)) return false;
    if (s.wear[item.slot] === item.id) delete s.wear[item.slot]; else s.wear[item.slot] = item.id;
    return true;
  }

  root.AQ_LOGIC = { buyItem, toggleWear, newState, level, dayKey, unitRec, unitsDone, doneIds, evoRequirements, canEvolve, evolve, expProgress,
    award, recordAnswer, inactiveDays, applyDecay, markStudy, completeSet, completeBoss, bossOpen, unitStatus,
    buildSet, buildMixed, silentQ, checkAnswer, shuffle, rng, tokenize, norm, DAY };
  if (typeof module !== 'undefined') module.exports = root.AQ_LOGIC;
})(typeof globalThis !== 'undefined' ? globalThis : this);
