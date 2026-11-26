const test = require('node:test');
const assert = require('node:assert');
const D = require('../src/data.js');
const L = require('../src/logic.js');

const T0 = new Date(2026, 10, 2, 10).getTime(); // 2026-11-02 월요일
const day = n => T0 + n * L.DAY;

test('모든 단원에서 6문항(파닉스 포함) 세트 2개가 만들어지고 정답이 보기에 있다', () => {
  for (const u of D.UNITS) for (const si of [0, 1]) for (let seed = 1; seed < 40; seed++) {
    const qs = L.buildSet(D.UNITS, u.id, si, seed);
    assert.strictEqual(qs.length, 6, `unit ${u.id} set ${si}`);
    for (const q of qs) {
      assert.ok(q, `null question u${u.id}`);
      if (q.options) {
        assert.ok(q.options.includes(q.answer), `${q.type} u${u.id} answer missing`);
        assert.strictEqual(new Set(q.options).size, q.options.length, `${q.type} u${u.id} dup options ${q.options}`);
      }
      if (q.type === 'order') assert.strictEqual(q.tiles.slice().sort().join(' '), L.tokenize(q.answer).sort().join(' '));
      if (q.type === 'match') assert.strictEqual(new Set(q.right).size, 4);
    }
  }
});

test('보기에 뜻이 같은 단어가 정답과 함께 나오지 않는다', () => {
  for (let seed = 1; seed < 200; seed++) {
    const qs = L.buildSet(D.UNITS, 6, 0, seed).concat(L.buildSet(D.UNITS, 1, 0, seed));
    for (const q of qs) if (q.type === 'en2ko') assert.strictEqual(new Set(q.options).size, 4);
  }
});

test('같은 문제는 하루에 한 번만 경험치, 다음 날 다시 가능', () => {
  const s = L.newState(D.DEFAULT_RULES);
  assert.strictEqual(L.award(s, 'q1', 'basic', T0), 5);
  assert.strictEqual(L.award(s, 'q1', 'basic', T0 + 1000), 0);
  assert.strictEqual(L.award(s, 'q2', 'review', T0), 7);
  assert.strictEqual(L.award(s, 'q1', 'basic', day(1)), 5);
  assert.strictEqual(s.exp, 17);
});

test('진화 조건: 경험치·단원·보스전·공부한 날이 모두 필요', () => {
  const s = L.newState(D.DEFAULT_RULES);
  for (const id of [1, 2, 3, 4, 5]) { L.completeSet(s, id, 0, 5, 5, T0); L.completeSet(s, id, 1, 4, 5, T0); }
  assert.strictEqual(L.unitsDone(s), 5);
  assert.strictEqual(L.completeBoss(s, 1, 8), true);
  s.exp = 300;
  assert.strictEqual(L.canEvolve(s), false, '공부한 날이 부족하면 진화 불가');
  for (let d = 0; d < 5; d++) L.markStudy(s, day(d), 'basic');
  assert.strictEqual(s.studyDays, 5);
  s.exp = 299; assert.strictEqual(L.canEvolve(s), false, '경험치 부족');
  s.exp = 300; assert.strictEqual(L.evolve(s), true);
  assert.strictEqual(s.stage, 1);
  assert.deepStrictEqual(s.cards, [0, 1]);
  assert.strictEqual(L.canEvolve(s), false);
});

test('사과(코인): 새 정답·세트·단원·출석·보스로 모이고 상점에서 산다', () => {
  const s = L.newState(D.DEFAULT_RULES);
  L.award(s, 'q1', 'basic', T0); L.award(s, 'q1', 'basic', T0);
  assert.strictEqual(s.coins, 1, '같은 문제는 하루 한 번');
  L.markStudy(s, T0, 'basic'); L.markStudy(s, T0 + 1000, 'basic');
  assert.strictEqual(s.coins, 6, '출석 보너스는 하루 한 번');
  L.completeSet(s, 1, 0, 5, 5, T0); L.completeSet(s, 1, 1, 5, 5, T0);
  assert.strictEqual(s.coins, 6 + 5 + 5 + 10, '처음엔 배가 불러서 세트 보너스 +2');
  const item = { id: 'x', slot: 'face', price: 20, stage: 0 }, lockItem = { id: 'y', slot: 'back', price: 5, stage: 1 };
  assert.strictEqual(L.buyItem(s, lockItem), 'locked');
  assert.strictEqual(L.buyItem(s, { ...item, price: 999 }), 'poor');
  assert.strictEqual(L.buyItem(s, item), 'ok');
  assert.strictEqual(s.coins, 6); assert.strictEqual(s.wear.face, 'x');
  assert.strictEqual(L.buyItem(s, item), 'owned');
  L.toggleWear(s, item); assert.strictEqual(s.wear.face, undefined);
});

test('세트 통과 기준 미달이면 단원 완료가 아니다', () => {
  const s = L.newState(D.DEFAULT_RULES);
  L.completeSet(s, 1, 0, 2, 5, T0); L.completeSet(s, 1, 1, 5, 5, T0);
  assert.strictEqual(s.units[1].done, false);
  const r = L.completeSet(s, 1, 0, 3, 5, T0);
  assert.strictEqual(r.newlyDone, true);
  assert.strictEqual(s.fruits, 1);
});

test('퇴화: 하루라도 빠지면 한 단계 전으로, 주말 제외, 기록 유지, 복습으로 복구', () => {
  const s = L.newState(D.DEFAULT_RULES);
  s.maxStage = 2; s.stage = 2; s.cards = [0, 1, 2]; s.exp = 300; s.lastStudy = T0; // 월
  L.applyDecay(s, day(1)); // 화: 빠진 날 없음
  assert.strictEqual(s.stage, 2); assert.strictEqual(s.energy, 100);
  L.applyDecay(s, day(2)); // 수: 화요일 하루 빠짐
  assert.strictEqual(s.stage, 1); assert.ok(s.energy < 100);
  L.markStudy(s, day(2), 'review');
  assert.strictEqual(s.stage, 2);
  s.lastStudy = day(4); // 금
  L.applyDecay(s, day(7)); // 다음 월: 주말만 지남 → 그대로
  assert.strictEqual(s.stage, 2);
  L.applyDecay(s, day(20));
  assert.strictEqual(s.stage, 0);
  assert.strictEqual(s.exp, 300); assert.deepStrictEqual(s.cards, [0, 1, 2]);
  L.markStudy(s, day(20), 'review');
  assert.strictEqual(s.stage, 2); assert.strictEqual(s.energy, 100);
});

test('교사가 퇴화를 끄면 변화 없음', () => {
  const s = L.newState(D.DEFAULT_RULES);
  s.rules.decayOn = false; s.maxStage = 1; s.stage = 1; s.lastStudy = T0;
  L.applyDecay(s, day(30));
  assert.strictEqual(s.stage, 1);
});

test('주말 일시정지 끄면 주말도 센다', () => {
  assert.strictEqual(L.inactiveDays(T0, day(7), true), 4);
  assert.strictEqual(L.inactiveDays(T0, day(7), false), 6);
});

test('복습·보스 문제 생성', () => {
  const b = L.buildMixed(D.UNITS, [1, 2, 3], 10, 7, 'boss');
  assert.strictEqual(b.length, 10);
  assert.ok(b.every(q => q.id.startsWith('boss:')));
  const rv = L.buildMixed(D.UNITS, [4], 5, 3, 'review', { desk: { n: 1, unit: 4 } });
  assert.strictEqual(rv.length, 5);
  assert.ok(rv.some(q => q.item.en === 'desk'));
});

test('정답 확인: 순서 배열은 대소문자/공백 무시', () => {
  const q = { type: 'order', answer: "It's on the desk." };
  assert.ok(L.checkAnswer(q, "It's on the desk."));
  assert.ok(!L.checkAnswer(q, "on It's the desk."));
});

test('모든 교재(3·4·5·6학년·천재 4학년) 단원에서 퀴즈가 정상적으로 만들어진다', () => {
  const C = require('../src/courses.js');
  assert.strictEqual(C.COURSES.length, 5);
  for (const course of C.COURSES) {
    assert.strictEqual(course.units.length, 11, course.key);
    for (const u of course.units) for (const si of [0, 1]) for (let seed = 1; seed < 25; seed++) {
      const qs = L.buildSet(course.units, u.id, si, seed);
      assert.strictEqual(qs.length, 6, `${course.key} ${u.id}`);
      for (const q of qs) {
        assert.ok(q, `null q ${course.key} ${u.id}`);
        if (q.options) {
          assert.ok(q.options.includes(q.answer), `${course.key} u${u.id} ${q.type} answer missing`);
          assert.strictEqual(new Set(q.options).size, q.options.length, `${course.key} u${u.id} ${q.type} dup ${q.options}`);
        }
      }
    }
    const boss = L.buildMixed(course.units, course.units.map(u => u.id), 10, 3, 'boss');
    assert.strictEqual(boss.length, 10, course.key + ' boss');
  }
  const ids = C.ALL_UNITS.map(u => u.id); assert.strictEqual(new Set(ids).size, ids.length, '단원 번호 중복');
});

test('조용한 교실: 듣기 문제가 같은 정답의 읽기 문제로 바뀐다', () => {
  const C = require('../src/courses.js');
  for (const c of C.COURSES) for (const u of c.units) for (const si of [0, 1]) {
    for (const q of L.buildSet(c.units, u.id, si, 7)) {
      const s = L.silentQ(q);
      assert.ok(!['listen', 'listenSent'].includes(s.type));
      assert.strictEqual(s.id, q.id); assert.strictEqual(s.answer, q.answer);
      if (s.silent) { assert.ok(s.show && s.options.includes(s.answer)); }
    }
  }
});

test('먹이: 평일마다 배고파지고(주말 제외), 사과로 먹이를 주면 배부름·애정도가 오른다', () => {
  const s = L.newState(D.DEFAULT_RULES);
  s.full = 100; s.fullAt = T0; // 월
  assert.strictEqual(L.hungerNow(s, T0 + 3600e3), 100);
  assert.strictEqual(L.hungerNow(s, day(1)), 80); // 화
  assert.strictEqual(L.hungerNow(s, day(4)), 20); // 금
  assert.strictEqual(L.hungerNow(s, day(6)), 20); // 일: 주말은 그대로
  assert.strictEqual(L.hungerNow(s, day(7)), 0); // 다음 월
  s.coins = 30;
  const pie = { price: 25, fill: 80, love: 3 };
  assert.strictEqual(L.feed(s, pie, day(7)), 'ok');
  assert.strictEqual(L.hungerNow(s, day(7)), 80); assert.strictEqual(s.coins, 5); assert.strictEqual(s.love, 3);
  assert.strictEqual(L.feed(s, pie, day(7)), 'poor');
  s.coins = 100; L.feed(s, { price: 1, fill: 50 }, day(7));
  assert.strictEqual(L.feed(s, { price: 1, fill: 10 }, day(7)), 'full');
});

test('배부르면 세트 통과 보너스 사과 +2', () => {
  const a = L.newState(D.DEFAULT_RULES), b = L.newState(D.DEFAULT_RULES);
  a.full = 90; a.fullAt = T0; b.full = 10; b.fullAt = T0;
  L.completeSet(a, 1, 0, 5, 5, T0); L.completeSet(b, 1, 0, 5, 5, T0);
  assert.strictEqual(a.coins - b.coins, 2);
});

test('집 짓기: 사과·진화 단계·공부한 날이 필요하고 한 단계씩 올라간다', () => {
  const H = [null, { price: 10 }, { price: 20, days: 3 }, { price: 30, stage: 1 }];
  const s = L.newState(D.DEFAULT_RULES); s.coins = 100;
  assert.strictEqual(L.buildHouse(s, H), 'ok'); assert.strictEqual(s.house, 1);
  assert.strictEqual(L.buildHouse(s, H), 'days'); s.studyDays = 3;
  assert.strictEqual(L.buildHouse(s, H), 'ok');
  assert.strictEqual(L.buildHouse(s, H), 'locked'); s.maxStage = 1;
  assert.strictEqual(L.buildHouse(s, H), 'ok'); assert.strictEqual(L.buildHouse(s, H), 'max');
  assert.strictEqual(s.coins, 40);
});

test('마을 건물: 해금된 것만, 한 번만 산다', () => {
  const s = L.newState(D.DEFAULT_RULES); s.coins = 50;
  const b = { key: 'bakery', price: 40 };
  assert.strictEqual(L.buyBuilding(s, b, false), 'locked');
  assert.strictEqual(L.buyBuilding(s, b, true), 'ok');
  assert.strictEqual(L.buyBuilding(s, b, true), 'owned');
  assert.strictEqual(s.coins, 10);
});

test('파닉스: 세트마다 6문제 중 파닉스 1문제, 정답은 첫소리이고 같은 소리 글자는 보기에 없음', () => {
  const C = require('../src/courses.js');
  let ph = 0, total = 0;
  for (const c of C.COURSES) for (const u of c.units) for (const si of [0, 1]) for (const seed of [3, 9, 27]) {
    const set = L.buildSet(c.units, u.id, si, seed);
    assert.strictEqual(set.length, 6); total++;
    for (const q of set.filter(q => q.type === 'phonics')) {
      ph++;
      assert.ok(q.item.en.startsWith(q.answer) && q.show === q.item.en.slice(q.answer.length));
      assert.strictEqual(new Set(q.options).size, 4); assert.ok(q.options.includes(q.answer));
      for (const g of [['c', 'k', 'q'], ['f', 'ph'], ['w', 'wh'], ['s', 'c'], ['j', 'g']]) assert.ok(q.options.filter(o => g.includes(o)).length <= 1, q.options.join(','));
    }
  }
  assert.ok(ph / total > 0.95, `파닉스 문제 비율 ${ph}/${total}`);
  assert.strictEqual(L.phonicsOnset('ship'), 'sh'); assert.strictEqual(L.phonicsOnset('know'), null); assert.strictEqual(L.phonicsOnset('giraffe'), null); assert.strictEqual(L.phonicsOnset('ice cream'), null);
});

test('세트 통과 기준은 문제 수에 비례 (5문제 중 3 → 6문제 중 4)', () => {
  const s = L.newState(D.DEFAULT_RULES);
  assert.strictEqual(L.completeSet(s, 1, 0, 3, 6, T0).passed, false);
  assert.strictEqual(L.completeSet(s, 1, 0, 4, 6, T0).passed, true);
  assert.strictEqual(L.completeSet(s, 2, 0, 3, 5, T0).passed, true);
});

test('차시 활동: 하루 한 번 경험치, 차시를 모두 끝내면 사과 +5 한 번', () => {
  const s = L.newState(D.DEFAULT_RULES);
  const ch = ['chant', 'order', 'listen', 'short'];
  let r = L.completeActivity(s, 9, 'chant', ch, T0);
  assert.strictEqual(r.gain, D.DEFAULT_RULES.expReview); assert.ok(r.first); assert.ok(!r.chapterDone);
  r = L.completeActivity(s, 9, 'chant', ch, T0 + 1000);
  assert.strictEqual(r.gain, 0, '같은 날 또 하면 경험치 없음'); assert.ok(!r.first);
  for (const a of ['order', 'listen']) L.completeActivity(s, 9, a, ch, T0);
  const before = s.coins;
  r = L.completeActivity(s, 9, 'short', ch, T0);
  assert.ok(r.chapterDone); assert.strictEqual(s.coins - before, 1 + 5);
  r = L.completeActivity(s, 9, 'short', ch, day(1));
  assert.ok(!r.chapterDone, '차시 보너스는 한 번'); assert.strictEqual(r.gain, D.DEFAULT_RULES.expReview, '다음 날은 다시 경험치');
  assert.ok(L.activityDone(s, 9, 'order')); assert.ok(!L.activityDone(s, 9, 'speak'));
});

test('쓰기 오류 맞춤 판정: 띄어쓰기·관사·위치 낱말·대소문자·한 글자', () => {
  const W = L.writingCheck;
  assert.strictEqual(W('toy car', 'toy car').kind, 'exact');
  assert.strictEqual(W('Monday', 'Monday').ok, true);
  assert.deepStrictEqual([W('monday', 'Monday').ok, W('monday', 'Monday').kind], [true, 'case']);
  assert.deepStrictEqual([W('toycar', 'toy car').ok, W('toycar', 'toy car').kind], [false, 'space']);
  const a = W('playing game', 'playing a game'); assert.deepStrictEqual([a.ok, a.kind, a.word, a.at], [false, 'article', 'a', 1]);
  assert.strictEqual(W('in', 'under').kind, 'prep');
  assert.strictEqual(W("It's in the desk", "It's under the desk").kind, 'prep');
  assert.strictEqual(W('Frday', 'Friday').kind, 'typo');
  assert.strictEqual(W('dog', 'toy car').kind, 'wrong');
  assert.strictEqual(W('  Toy  car. ', 'toy car').ok, true);
  assert.strictEqual(W('', 'x').kind, 'empty');
});
test('오늘의 복습: 하루 한 번 보상, 연속 일수, 주말은 건너뜀', () => {
  const s = L.newState(D.DEFAULT_RULES); s.coins = 0;
  const mon = new Date(2026, 10, 23, 10).getTime(), tue = mon + 864e5, fri = mon + 4 * 864e5, nextMon = mon + 7 * 864e5, nextWed = mon + 9 * 864e5;
  let r = L.completeDaily(s, 3, 3, mon); assert.deepStrictEqual([r.first, r.streak, r.coins], [true, 1, 4]);
  r = L.completeDaily(s, 2, 3, mon + 3600e3); assert.strictEqual(r.first, false);
  r = L.completeDaily(s, 2, 3, tue); assert.strictEqual(r.streak, 2);
  assert.strictEqual(L.dailyInfo(s, tue).done, true);
  // 수·목 건너뜀 → 금요일엔 1부터
  r = L.completeDaily(s, 3, 3, fri); assert.strictEqual(r.streak, 1);
  // 금 → (주말) → 월: 이어짐
  r = L.completeDaily(s, 3, 3, nextMon); assert.strictEqual(r.streak, 2);
  assert.strictEqual(L.dailyInfo(s, nextWed).streak, 0); // 화요일을 빠뜨리면 끊김
});
test('대결 보상은 하루 3판까지, 실력 확인은 예상과 결과를 비교', () => {
  const s = L.newState(D.DEFAULT_RULES); s.coins = 0; const t = Date.now();
  assert.strictEqual(L.completeBattle(s, true, t).coins, 5);
  assert.strictEqual(L.completeBattle(s, false, t).coins, 1);
  assert.strictEqual(L.completeBattle(s, true, t).coins, 5);
  assert.strictEqual(L.completeBattle(s, true, t).coins, 0);
  assert.strictEqual(s.coins, 11); assert.strictEqual(s.battle.wins, 3);
  assert.strictEqual(L.selfCheck(s, 3, 5, 5).kind, 'match');
  assert.strictEqual(L.selfCheck(s, 3, 2, 5).kind, 'over');
  assert.strictEqual(L.selfCheck(s, 1, 5, 5).kind, 'under');
  assert.strictEqual(L.selfCheck(s, 2, 1, 5).kind, 'honest');
  assert.strictEqual(L.selfCheck(s, 2, 0, 0), null);
});

test('체험판 세트 쓰기 문제: 세트마다 1문제(세트1 단어 · 세트2 문장 빈칸), 원래 세트는 그대로', () => {
  const U = D.UNITS;
  for (const u of U.slice(0, 11)) {
    const a = L.buildSet(U, u.id, 0, 123), b = L.buildSet(U, u.id, 0, 123, { write: true }), c = L.buildSet(U, u.id, 1, 77, { write: true });
    assert.strictEqual(a.filter(q => q.type === 'write').length, 0);
    assert.strictEqual(b.length, a.length + 1);
    const w1 = b.find(q => q.type === 'write'), w2 = c.find(q => q.type === 'write');
    assert.ok(w1 && w1.answer && !w1.sentence, 'unit ' + u.id);
    assert.ok(w2 && w2.answer && w2.show.includes('____'), 'unit ' + u.id);
    assert.ok(!/[.,?!]/.test(w2.answer));
  }
});
