// 서버(worker.js)를 node:sqlite로 만든 가짜 D1 위에서 끝까지 시험합니다.
import test from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import worker from '../server/worker.js';

function makeD1() {
  const db = new DatabaseSync(':memory:');
  return {
    prepare(sql) {
      let args = [];
      const st = { bind(...a) { args = a; return st; },
        async first() { return db.prepare(sql).get(...args) ?? null; },
        async all() { return { results: db.prepare(sql).all(...args) }; },
        async run() { const r = db.prepare(sql).run(...args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } };
      return st;
    },
  };
}
const env = { DB: makeD1(), DB_CONTEST: makeD1(), TOKEN_SECRET: 'test-secret', ADMIN_PASSWORD: 'test-admin-pw' }; // 테스트 전용 비밀번호
const call = async (path, body, headers = {}) => {
  const init = body === undefined ? { method: 'GET', headers } : { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) };
  const res = await worker.fetch(new Request('https://api.test' + path, init), env);
  const ct = res.headers.get('Content-Type') || '';
  return { status: res.status, body: ct.includes('json') ? await res.json() : await res.text() };
};
const SCHOOL = { school_code: 'S10-7010057', school_name: '사과초등학교', grade: 4, cls: 2 };
const ADMIN = { 'X-Admin-Password': 'test-admin-pw' };

test('학생: 처음 로그인하면 새로 만들고, 저장한 기록을 다른 기기에서 이어서 불러온다', async () => {
  let r = await call('/api/student/login', { ...SCHOOL, num: 7, nickname: '사과용사', pin: '1234' });
  assert.strictEqual(r.status, 200); assert.ok(r.body.created);
  const tok = r.body.token;
  r = await call('/api/student/save', { state: { exp: 55, stage: 0 }, summary: { level: 3, exp: 55, unitsDone: 1 } }, { Authorization: 'Bearer ' + tok });
  assert.strictEqual(r.body.ok, true);
  r = await call('/api/student/state', undefined, { Authorization: 'Bearer ' + tok });
  assert.strictEqual(r.body.state.exp, 55);
  r = await call('/api/student/login', { ...SCHOOL, num: 7, nickname: '사과용사', pin: '1234' }); // 다른 기기
  assert.strictEqual(r.body.created, false); assert.strictEqual(r.body.state.exp, 55);
});

test('학생: 비밀번호가 틀리면 거부하고, 여러 번 틀리면 잠근다', async () => {
  for (let i = 0; i < 7; i++) assert.strictEqual((await call('/api/student/login', { ...SCHOOL, num: 7, nickname: 'x', pin: '9999' })).status, 401);
  assert.strictEqual((await call('/api/student/login', { ...SCHOOL, num: 7, nickname: 'x', pin: '9999' })).status, 401);
  assert.strictEqual((await call('/api/student/login', { ...SCHOOL, num: 7, nickname: 'x', pin: '1234' })).status, 429);
});

test('학생: 잘못된 입력과 토큰 없는 저장은 거부', async () => {
  assert.strictEqual((await call('/api/student/login', { ...SCHOOL, num: 8, nickname: 'a', pin: '12' })).status, 400);
  assert.strictEqual((await call('/api/student/login', { ...SCHOOL, num: 8, nickname: '', pin: '1234' })).status, 400);
  assert.strictEqual((await call('/api/student/save', { state: {} })).status, 401);
  assert.strictEqual((await call('/api/student/save', { state: {} }, { Authorization: 'Bearer abc.def' })).status, 401);
});

test('선생님: 등록 → 승인 전에는 못 들어감 → 제작자 승인 → 우리 반만 보임 → 구글 시트 CSV', async () => {
  await call('/api/student/login', { ...SCHOOL, num: 3, nickname: '바나나', pin: '0000' });
  await call('/api/student/login', { ...SCHOOL, cls: 3, num: 1, nickname: '다른반', pin: '0000' });
  let r = await call('/api/teacher/register', { ...SCHOOL, teacher_name: '김선생', password: 'teach123' });
  assert.strictEqual(r.body.status, 'pending');
  assert.strictEqual((await call('/api/teacher/register', { ...SCHOOL, teacher_name: '가짜', password: 'xxxxxx' })).status, 409);
  assert.strictEqual((await call('/api/teacher/login', { ...SCHOOL, password: 'teach123' })).status, 403);
  assert.strictEqual((await call('/api/admin/teachers', undefined, { 'X-Admin-Password': 'wrong' })).status, 401);
  r = await call('/api/admin/teachers', undefined, ADMIN);
  const t = r.body.teachers.find(x => x.cls === 2); assert.strictEqual(t.status, 'pending');
  await call('/api/admin/decide', { id: t.id, approve: true }, ADMIN);
  assert.strictEqual((await call('/api/teacher/login', { ...SCHOOL, password: 'nope99' })).status, 401);
  r = await call('/api/teacher/login', { ...SCHOOL, password: 'teach123' });
  assert.strictEqual(r.status, 200);
  const tt = r.body.token, key = r.body.export_key;
  r = await call('/api/teacher/students', undefined, { Authorization: 'Bearer ' + tt });
  assert.deepStrictEqual(r.body.students.map(s => s.nickname), ['바나나', '사과용사']);
  r = await call('/api/export.csv?key=' + key);
  assert.ok(r.body.includes('번호,닉네임')); assert.ok(r.body.includes('사과용사')); assert.ok(!r.body.includes('다른반'));
  assert.strictEqual((await call('/api/export.csv?key=bad')).status, 403);
  // 학생 토큰으로 선생님 기능 사용 불가
  const st = (await call('/api/student/login', { ...SCHOOL, num: 3, nickname: '바나나', pin: '0000' })).body.token;
  assert.strictEqual((await call('/api/teacher/students', undefined, { Authorization: 'Bearer ' + st })).status, 401);
});

test('선생님: 학생 비밀번호 초기화 후 학생이 새 비밀번호로 들어온다', async () => {
  const tt = (await call('/api/teacher/login', { ...SCHOOL, password: 'teach123' })).body.token;
  const list = (await call('/api/teacher/students', undefined, { Authorization: 'Bearer ' + tt })).body.students;
  const s = list.find(x => x.num === 3);
  await call('/api/teacher/reset-pin', { id: s.id }, { Authorization: 'Bearer ' + tt });
  assert.strictEqual((await call('/api/student/login', { ...SCHOOL, num: 3, nickname: '바나나', pin: '5555' })).status, 200);
  assert.strictEqual((await call('/api/student/login', { ...SCHOOL, num: 3, nickname: '바나나', pin: '0000' })).status, 401);
});

test('만족도 조사가 모이고 제작자만 볼 수 있다', async () => {
  await call('/api/survey', { rating: 5, comment: '재밌어요', school_name: '사과초등학교' });
  await call('/api/survey', { rating: 4 });
  assert.strictEqual((await call('/api/survey', { rating: 9 })).status, 400);
  assert.strictEqual((await call('/api/admin/surveys')).status, 401);
  const r = await call('/api/admin/surveys', undefined, ADMIN);
  assert.strictEqual(r.body.surveys.length, 2);
});

test('설정이 빠지면 친절한 오류', async () => {
  const res = await worker.fetch(new Request('https://api.test/api/health'), { TOKEN_SECRET: 'x' });
  assert.strictEqual(res.status, 500);
});

test('CORS: 다른 주소(GitHub Pages)에서 오는 요청을 허용', async () => {
  const res = await worker.fetch(new Request('https://api.test/api/admin/teachers', { method: 'OPTIONS' }), env);
  const h = res.headers.get('Access-Control-Allow-Headers');
  assert.ok(h.includes('Authorization') && h.includes('X-Admin-Password') && h.includes('Content-Type'));
  assert.strictEqual(res.headers.get('Access-Control-Allow-Origin'), '*');
});

test('제작자 전체 백업: 비밀번호 해시는 빼고 모든 기록을 내보낸다', async () => {
  assert.strictEqual((await call('/api/admin/backup')).status, 401);
  const r = await call('/api/admin/backup', undefined, ADMIN);
  assert.ok(r.body.students.length >= 2 && r.body.teachers.length >= 1);
  const txt = JSON.stringify(r.body);
  assert.ok(!txt.includes('pin_hash') && !txt.includes('pass_hash') && !txt.includes('export_key'));
  assert.strictEqual(r.body.students.find(s => s.nickname === '사과용사').state.exp, 55);
});

test('제작자: 비밀번호가 틀리면 401, 맞으면 들어간다', async () => {
  assert.strictEqual((await call('/api/admin/check', undefined, { 'X-Admin-Password': 'wrong' })).status, 401);
  assert.strictEqual((await call('/api/admin/check', undefined, ADMIN)).status, 200);
});

test('공모전 체험판: 다른 DB를 쓰고, 토큰도 서로 통하지 않으며, 선생님은 바로 승인된다', async () => {
  const S2 = { school_code: 'S10-7777777', school_name: '체험초등학교', grade: 5, cls: 1 };
  let r = await call('/contest/api/student/login', { ...S2, num: 1, nickname: '심사위원', pin: '1111' });
  assert.ok(r.body.created); const ctok = r.body.token;
  r = await call('/api/student/login', { ...S2, num: 1, nickname: '심사위원', pin: '2222' });
  assert.ok(r.body.created, '원래 버전 DB에는 체험판 학생이 없다');
  const mtok = r.body.token;
  assert.strictEqual((await call('/api/student/state', undefined, { Authorization: 'Bearer ' + ctok })).status, 401, '체험판 토큰은 원래 서버에서 안 통함');
  assert.strictEqual((await call('/contest/api/student/state', undefined, { Authorization: 'Bearer ' + mtok })).status, 401, '원래 토큰은 체험판에서 안 통함');
  r = await call('/contest/api/teacher/register', { ...S2, password: 'judge1234', teacher_name: '심사' });
  assert.strictEqual(r.body.status, 'approved');
  r = await call('/contest/api/teacher/login', { ...S2, password: 'judge1234' });
  assert.ok(r.body.token);
  r = await call('/contest/api/teacher/students', undefined, { Authorization: 'Bearer ' + r.body.token });
  assert.strictEqual(r.body.students.length, 1);
  r = await call('/api/teacher/register', { ...S2, password: 'judge1234', teacher_name: '심사' });
  assert.strictEqual(r.body.status, 'pending', '원래 버전은 여전히 제작자 승인');
});

test('AI 선생님 설명: 체험판 + 로그인한 학생만, 같은 질문은 저장해 두고 하루 한도를 지킨다', async () => {
  const S2 = { school_code: 'S10-7777777', school_name: '체험초등학교', grade: 5, cls: 1 };
  const tok = (await call('/contest/api/student/login', { ...S2, num: 1, nickname: '심사위원', pin: '1111' })).body.token;
  const Q = { type: 'ko2en', prompt: '뜻에 알맞은 영어 단어를 고르세요.', show: '상자', options: ['box', 'bag', 'bed', 'bus'], answer: 'box', given: 'bag', explain: 'box = 상자' };
  assert.strictEqual((await call('/contest/api/ai/explain', Q, { Authorization: 'Bearer ' + tok })).status, 503, '키가 없으면 꺼짐');
  env.ANTHROPIC_API_KEY = 'test-key'; env.AI_DAILY_LIMIT = '2';
  let calls = 0; const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { calls++; assert.ok(String(url).includes('anthropic')); const b = JSON.parse(init.body); assert.ok(b.system.includes('초등학생')); return new Response(JSON.stringify({ content: [{ type: 'text', text: 'box는 상자예요! 📦' }] }), { status: 200 }); };
  try {
    assert.strictEqual((await call('/api/ai/explain', Q, { Authorization: 'Bearer ' + tok })).status, 404, '원래 버전에는 AI 없음');
    assert.strictEqual((await call('/contest/api/ai/explain', Q)).status, 401, '로그인 필요');
    let r = await call('/contest/api/ai/explain', Q, { Authorization: 'Bearer ' + tok });
    assert.strictEqual(r.body.text, 'box는 상자예요! 📦');
    r = await call('/contest/api/ai/explain', Q, { Authorization: 'Bearer ' + tok });
    assert.ok(r.body.cached); assert.strictEqual(calls, 1);
    await call('/contest/api/ai/explain', { ...Q, given: 'bed' }, { Authorization: 'Bearer ' + tok });
    r = await call('/contest/api/ai/explain', { ...Q, given: 'bus' }, { Authorization: 'Bearer ' + tok });
    assert.strictEqual(r.status, 429, '하루 한도'); assert.strictEqual(calls, 2);
  } finally { globalThis.fetch = realFetch; delete env.ANTHROPIC_API_KEY; delete env.AI_DAILY_LIMIT; }
});
