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

test('AI 선생님: 키가 없으면 Cloudflare 무료 AI를 쓰고, 한도 초과 오류는 "내일 다시"로 안내', async () => {
  const S2 = { school_code: 'S10-7777777', school_name: '체험초등학교', grade: 5, cls: 1 };
  const tok = (await call('/contest/api/student/login', { ...S2, num: 1, nickname: '심사위원', pin: '1111' })).body.token;
  const Q = { type: 'pic', prompt: '그림에 알맞은 영어 단어를 고르세요.', show: '🐶', options: ['dog', 'cat', 'pig', 'cow'], answer: 'dog', given: 'cat', explain: 'dog = 개' };
  let model = '';
  env.AI = { run: async (m, inp) => { model = m; assert.strictEqual(inp.messages[0].role, 'system'); return { response: '<think>생각</think>dog는 강아지예요! 🐶' }; } };
  try {
    let r = await call('/contest/api/ai/explain', Q, { Authorization: 'Bearer ' + tok });
    assert.strictEqual(r.body.text, 'dog는 강아지예요! 🐶'); assert.ok(model.startsWith('@cf/'));
    env.AI = { run: async () => { throw new Error('daily free allocation exceeded'); } };
    r = await call('/contest/api/ai/explain', { ...Q, given: 'pig' }, { Authorization: 'Bearer ' + tok });
    assert.strictEqual(r.status, 429);
    r = await call('/contest/api/health');
    assert.strictEqual(r.body.ai_provider, 'workers-ai');
  } finally { delete env.AI; }
});

test('AI 도우미: 질문 종류·단원 정보를 보내고, 50자 넘는 글은 자르고, 학생별 하루 한도를 지킨다', async () => {
  const S2 = { school_code: 'S10-7777777', school_name: '체험초등학교', grade: 5, cls: 1 };
  const tok = (await call('/contest/api/student/login', { ...S2, num: 2, nickname: '질문왕', pin: '2222' })).body.token;
  let seen = '';
  env.AI = { run: async (m, inp) => { seen = inp.messages[1].content; assert.ok(inp.messages[0].content.includes('영어 공부에 관한 것만')); return { response: 'library는 도서관이에요. 📚' }; } };
  env.AI_STUDENT_LIMIT = '2';
  try {
    const unit = { title: 'Where Is the Library?', words: [{ en: 'library', ko: '도서관' }], sentences: [{ en: 'Where is the library?', ko: '도서관은 어디에 있니?' }] };
    let r = await call('/contest/api/ai/ask', { kind: 'word', text: 'library 뜻이 뭐예요?', unit, grade: '4학년' }, { Authorization: 'Bearer ' + tok });
    assert.strictEqual(r.body.text, 'library는 도서관이에요. 📚');
    assert.ok(seen.includes('[질문 종류] 단어 뜻') && seen.includes('library(도서관)'));
    r = await call('/contest/api/ai/ask', { kind: 'hint', text: '힌트 주세요', unit, current: { prompt: '빈칸', show: 'Where ____ the library?', options: ['is', 'are'] } }, { Authorization: 'Bearer ' + tok });
    assert.ok(seen.includes('[힌트만]'), '정답 없이 물으면 힌트만');
    r = await call('/contest/api/ai/ask', { kind: 'free', text: 'x'.repeat(200), unit }, { Authorization: 'Bearer ' + tok });
    assert.strictEqual(r.status, 429, '학생별 한도');
    assert.strictEqual((await call('/api/ai/ask', { kind: 'word', text: 'a' }, { Authorization: 'Bearer ' + tok })).status, 404, '원래 버전에는 없음');
  } finally { delete env.AI; delete env.AI_STUDENT_LIMIT; }
});

test('AI 도우미 힌트: AI가 보기 단어를 말해도 가려진다', async () => {
  const S2 = { school_code: 'S10-7777777', school_name: '체험초등학교', grade: 5, cls: 1 };
  const tok = (await call('/contest/api/student/login', { ...S2, num: 3, nickname: '힌트', pin: '3333' })).body.token;
  env.AI = { run: async () => ({ response: '도서관은 하나니까 "is"가 맞을 거예요. are는 여럿일 때 써요.' }) };
  try {
    const r = await call('/contest/api/ai/ask', { kind: 'hint', text: '지금 문제 힌트 주세요', unit: { title: 'L11' }, current: { prompt: '빈칸', show: 'Where ____ the library?', options: ['is', 'are', 'am', 'do'] } }, { Authorization: 'Bearer ' + tok });
    assert.ok(!/\bis\b|\bare\b/.test(r.body.text), r.body.text);
    assert.ok(r.body.text.includes('○○'));
  } finally { delete env.AI; }
});

test('학급 코드: 승인되면 6자리 코드가 생기고, 학생은 코드로 반을 찾고, 선생님은 코드+비밀번호로 들어온다', async () => {
  const C3 = { school_code: 'S10-5555555', school_name: '코드초등학교', grade: 3, cls: 2 };
  let r = await call('/api/teacher/register', { ...C3, password: 'code1234', teacher_name: '코드' });
  assert.strictEqual(r.body.status, 'pending');
  const list = (await call('/api/admin/teachers', undefined, ADMIN)).body.teachers;
  const t = list.find(x => x.school_name === '코드초등학교');
  r = await call('/api/admin/decide', { id: t.id, approve: true }, ADMIN);
  const code = r.body.class_code;
  assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/);
  r = await call('/api/class?code=' + code.toLowerCase());
  assert.strictEqual(r.body.school_name, '코드초등학교'); assert.strictEqual(r.body.grade, 3); assert.strictEqual(r.body.cls, 2);
  assert.strictEqual((await call('/api/class?code=ZZZZZZ')).status, 404);
  r = await call('/api/teacher/login', { class_code: code, password: 'code1234' });
  assert.ok(r.body.token); assert.strictEqual(r.body.class_code, code);
  assert.strictEqual((await call('/api/teacher/login', { class_code: code, password: 'wrong' })).status, 401);
  r = await call('/contest/api/teacher/register', { ...C3, password: 'code1234', teacher_name: '체험' });
  assert.match(r.body.class_code, /^[A-Z2-9]{6}$/, '체험판은 등록하자마자 코드');
  assert.strictEqual((await call('/api/class?code=' + r.body.class_code)).status, 404, '체험판 코드는 원래 서버에 없음');
});

test('학급 코드 직접 정하기: 등록할 때 DH0401처럼 정하고, 겹치면 거절, 나중에 바꾸기', async () => {
  const D = { school_code: 'S10-6666666', school_name: '대한초등학교', grade: 4, cls: 1 };
  assert.strictEqual((await call('/api/teacher/register', { ...D, password: 'daehan12', teacher_name: '대한', class_code: '대한' })).status, 400, '영어·숫자만');
  let r = await call('/api/teacher/register', { ...D, password: 'daehan12', teacher_name: '대한', class_code: 'dh-0401' });
  assert.strictEqual(r.body.status, 'pending');
  assert.strictEqual((await call('/api/class?code=DH0401')).status, 404, '승인 전에는 안 열림');
  const D2 = { ...D, cls: 2 };
  assert.strictEqual((await call('/api/teacher/register', { ...D2, password: 'daehan12', teacher_name: '대한2', class_code: 'DH0401' })).status, 409, '이미 쓰는 코드');
  const t = (await call('/api/admin/teachers', undefined, ADMIN)).body.teachers.find(x => x.school_name === '대한초등학교' && x.cls === 1);
  r = await call('/api/admin/decide', { id: t.id, approve: true }, ADMIN);
  assert.strictEqual(r.body.class_code, 'DH0401', '정한 코드 그대로');
  assert.strictEqual((await call('/api/class?code=dh0401')).body.cls, 1);
  const tok = (await call('/api/teacher/login', { class_code: 'DH0401', password: 'daehan12' })).body.token;
  r = await call('/api/teacher/set-code', { class_code: 'DAEHAN41' }, { Authorization: 'Bearer ' + tok });
  assert.strictEqual(r.body.class_code, 'DAEHAN41');
  assert.strictEqual((await call('/api/class?code=DH0401')).status, 404);
  assert.strictEqual((await call('/api/class?code=DAEHAN41')).body.school_name, '대한초등학교');
});

test('AI 대화 짝꿍·쓰기 도우미 + 선생님의 우리 반 AI 끄기', async () => {
  const C = { school_code: 'S10-8888888', school_name: '짝꿍초등학교', grade: 4, cls: 9 };
  const tr = await call('/contest/api/teacher/register', { ...C, password: 'pair1234', teacher_name: '짝꿍' });
  const ttok = (await call('/contest/api/teacher/login', { ...C, password: 'pair1234' })).body.token;
  const stok = (await call('/contest/api/student/login', { ...C, num: 1, nickname: '짝', pin: '1111' })).body.token;
  let sys = '', usr = '';
  env.AI = { run: async (m, inp) => { sys = inp.messages[0].content; usr = inp.messages[1].content; return { response: sys.includes('쓰기 도우미') ? '👍 잘한 점: 좋아요\n✏️ 고쳐 볼 곳: 없어요! 완벽해요.\n✨ 다듬은 글: Today is Monday.' : 'EN: Great! I have art class today.\nKO: 잘했어요! 👍' }; } };
  try {
    let r = await call('/contest/api/ai/talk', { scenario: 'roleplay', text: "It's Thursday.", history: [{ me: false, text: "Hi! I'm Jun. What day is it today?" }] }, { Authorization: 'Bearer ' + stok });
    assert.strictEqual(r.body.en, 'Great! I have art class today.'); assert.strictEqual(r.body.ko, '잘했어요! 👍');
    assert.ok(sys.includes('준(Jun)') && usr.includes("It's Thursday."));
    r = await call('/contest/api/ai/talk', { scenario: 'day', text: 'Bye', last: true }, { Authorization: 'Bearer ' + stok });
    assert.ok(usr.includes('[마무리]'));
    r = await call('/contest/api/ai/write', { text: 'today is monday. i have art class today' }, { Authorization: 'Bearer ' + stok });
    assert.ok(r.body.text.includes('다듬은 글'));
    r = await call('/contest/api/teacher/ai', { off: true }, { Authorization: 'Bearer ' + ttok });
    assert.strictEqual(r.body.ai_off, true);
    r = await call('/contest/api/ai/talk', { scenario: 'day', text: 'Hi' }, { Authorization: 'Bearer ' + stok });
    assert.strictEqual(r.status, 403); assert.ok(r.body.ai_off);
    assert.strictEqual((await call('/contest/api/teacher/students', undefined, { Authorization: 'Bearer ' + ttok })).body.ai_off, true);
    await call('/contest/api/teacher/ai', { off: false }, { Authorization: 'Bearer ' + ttok });
    assert.strictEqual((await call('/contest/api/ai/talk', { scenario: 'day', text: 'Hi' }, { Authorization: 'Bearer ' + stok })).status, 200);
    assert.strictEqual((await call('/api/ai/talk', { scenario: 'day', text: 'Hi' }, { Authorization: 'Bearer ' + stok })).status, 404, '원래 버전에는 없음');
  } finally { delete env.AI; }
});
