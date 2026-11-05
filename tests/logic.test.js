const test = require('node:test');
const assert = require('node:assert');
const D = require('../src/data.js');
const L = require('../src/logic.js');

const T0 = new Date(2026, 10, 2, 10).getTime(); // 2026-11-02 월요일
const day = n => T0 + n * L.DAY;

test('모든 단원에서 5문항 세트 2개가 만들어지고 정답이 보기에 있다', () => {
  for (const u of D.UNITS) for (const si of [0, 1]) for (let seed = 1; seed < 40; seed++) {
    const qs = L.buildSet(D.UNITS, u.id, si, seed);
    assert.strictEqual(qs.length, 5, `unit ${u.id} set ${si}`);
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

test('진화 조건: 경험치·단원·보스전이 모두 필요', () => {
  const s = L.newState(D.DEFAULT_RULES);
  s.exp = 120;
  for (const id of [1, 2, 3]) { L.completeSet(s, id, 0, 5, 5, T0); L.completeSet(s, id, 1, 4, 5, T0); }
  assert.strictEqual(L.unitsDone(s), 3);
  assert.strictEqual(L.canEvolve(s), false, '보스전 전에는 진화 불가');
  assert.strictEqual(L.completeBoss(s, 1, 6), false);
  assert.strictEqual(L.completeBoss(s, 1, 8), true);
  assert.strictEqual(L.evolve(s), true);
  assert.strictEqual(s.stage, 1);
  assert.deepStrictEqual(s.cards, [0, 1]);
  assert.strictEqual(L.canEvolve(s), false);
});

test('세트 통과 기준 미달이면 단원 완료가 아니다', () => {
  const s = L.newState(D.DEFAULT_RULES);
  L.completeSet(s, 1, 0, 2, 5, T0); L.completeSet(s, 1, 1, 5, 5, T0);
  assert.strictEqual(s.units[1].done, false);
  const r = L.completeSet(s, 1, 0, 3, 5, T0);
  assert.strictEqual(r.newlyDone, true);
  assert.strictEqual(s.fruits, 1);
});

test('퇴화: 주말 제외 일수 기준, 기록과 카드는 유지, 복습으로 복구', () => {
  const s = L.newState(D.DEFAULT_RULES);
  s.maxStage = 2; s.stage = 2; s.cards = [0, 1, 2]; s.exp = 300; s.lastStudy = T0; // 월
  let r = L.applyDecay(s, day(2)); // 수: 화 1일만 지남... 오늘 포함 2
  assert.strictEqual(s.stage, 2); assert.strictEqual(s.energy, 100);
  r = L.applyDecay(s, day(4)); // 금: 화수목금 = 4 → 에너지 감소
  assert.ok(s.energy < 100); assert.strictEqual(s.stage, 2);
  r = L.applyDecay(s, day(11)); // 다음 주 금: 평일 9일 → 1단계 하락
  assert.strictEqual(s.stage, 1);
  L.applyDecay(s, day(25));
  assert.strictEqual(s.stage, 0);
  assert.strictEqual(s.exp, 300); assert.deepStrictEqual(s.cards, [0, 1, 2]);
  L.markStudy(s, day(25), 'review');
  assert.strictEqual(s.stage, 2); assert.strictEqual(s.energy, 100);
});

test('교사가 퇴화를 끄면 변화 없음', () => {
  const s = L.newState(D.DEFAULT_RULES);
  s.rules.decayOn = false; s.maxStage = 1; s.stage = 1; s.lastStudy = T0;
  L.applyDecay(s, day(30));
  assert.strictEqual(s.stage, 1);
});

test('주말 일시정지 끄면 주말도 센다', () => {
  assert.strictEqual(L.inactiveDays(T0, day(7), true), 5);
  assert.strictEqual(L.inactiveDays(T0, day(7), false), 7);
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
