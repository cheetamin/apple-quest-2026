/* 애플왕의 진화 모험 — 학급 서버 (Cloudflare Workers + D1, 무료 플랜용)
 *
 * 환경 변수(Cloudflare 대시보드 → Worker → 설정 → 변수 및 비밀):
 *   TOKEN_SECRET     (필수, 비밀) 로그인 토큰 서명용 아무 긴 문자열
 *   ADMIN_HASH       (선택) 제작자 비밀번호의 SHA-256. 없으면 기본값 사용
 *   NEIS_KEY         (선택, 비밀) 나이스 교육정보 개방포털 인증키 — 없으면 학교 검색 결과가 5개로 제한
 *   RESEND_API_KEY   (선택, 비밀) 선생님 등록 알림 메일 발송(resend.com 무료)
 *   NOTIFY_EMAIL     (선택, 비밀) 알림 받을 제작자 메일 주소
 * 바인딩: DB = D1 데이터베이스
 */
const DEFAULT_ADMIN_HASH = '03b00cc653103ede76f12cb62547e58390efd27699f8fb5c432315ef866bd611';
const MAX_STATE = 200000;           // 학생 기록 JSON 최대 크기(바이트)
const PIN_MAX_FAIL = 8;             // 연속 실패 허용 횟수
const PIN_LOCK_MS = 10 * 60 * 1000; // 잠금 시간 10분
const TOKEN_DAYS = 120;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_code TEXT NOT NULL, school_name TEXT NOT NULL, grade INTEGER NOT NULL, cls INTEGER NOT NULL, num INTEGER NOT NULL,
    nickname TEXT NOT NULL, pin_hash TEXT, fail_count INTEGER DEFAULT 0, locked_until INTEGER DEFAULT 0,
    state TEXT, summary TEXT, created_at INTEGER, updated_at INTEGER,
    UNIQUE (school_code, grade, cls, num))`,
  `CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_code TEXT NOT NULL, school_name TEXT NOT NULL, grade INTEGER NOT NULL, cls INTEGER NOT NULL,
    teacher_name TEXT, contact TEXT, pass_hash TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
    export_key TEXT NOT NULL, fail_count INTEGER DEFAULT 0, locked_until INTEGER DEFAULT 0, created_at INTEGER, decided_at INTEGER,
    UNIQUE (school_code, grade, cls))`,
  `CREATE TABLE IF NOT EXISTS surveys (
    id INTEGER PRIMARY KEY AUTOINCREMENT, rating INTEGER NOT NULL, comment TEXT, info TEXT, school_name TEXT, created_at INTEGER)`,
];

/* ---------------- 유틸 ---------------- */
const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
async function sha256(s) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(s))); }
async function hashPin(pin, salt) { return sha256(`aq-pin|${salt}|${pin}`); }
function randKey(n = 24) { const a = new Uint8Array(n); crypto.getRandomValues(a); return hex(a); }
const b64u = s => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => atob(s.replace(/-/g, '+').replace(/_/g, '/'));
async function hmac(secret, data) {
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(data)));
}
async function makeToken(env, kind, id) {
  const body = b64u(JSON.stringify({ k: kind, id, exp: Date.now() + TOKEN_DAYS * 864e5 }));
  return `${body}.${await hmac(env.TOKEN_SECRET, body)}`;
}
async function readToken(env, tok, kind) {
  if (!tok || typeof tok !== 'string' || !tok.includes('.')) return null;
  const [body, sig] = tok.split('.');
  if (sig !== await hmac(env.TOKEN_SECRET, body)) return null;
  try { const p = JSON.parse(unb64u(body)); return p.k === kind && p.exp > Date.now() ? p.id : null; } catch (e) { return null; }
}
function cors(extra = {}) {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Admin-Password', 'Access-Control-Max-Age': '86400', ...extra };
}
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: cors({ 'Content-Type': 'application/json; charset=utf-8' }) });
const fail = (msg, status = 400, extra = {}) => json({ ok: false, error: msg, ...extra }, status);
const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const int = (v, lo, hi) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
const csvCell = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function bearer(req) { const h = req.headers.get('Authorization') || ''; return h.startsWith('Bearer ') ? h.slice(7) : ''; }

let schemaReady = false;
async function ensureSchema(env) {
  if (schemaReady) return;
  for (const q of SCHEMA) await env.DB.prepare(q).run();
  schemaReady = true;
}
async function isAdmin(env, req) {
  const pw = req.headers.get('X-Admin-Password') || '';
  return pw && (await sha256(pw)) === (env.ADMIN_HASH || DEFAULT_ADMIN_HASH);
}
async function notify(env, subject, text) {
  if (!env.RESEND_API_KEY || !env.NOTIFY_EMAIL) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: '애플왕의 진화 모험 <onboarding@resend.dev>', to: [env.NOTIFY_EMAIL], subject, text }),
    });
    return r.ok;
  } catch (e) { return false; }
}

/* ---------------- 학교 검색 (나이스 교육정보 개방포털) ---------------- */
async function searchSchools(env, q, office) {
  q = str(q, 30); if (q.length < 2) return [];
  office = /^[A-Z]\d{2}$/.test(office || '') ? office : '';
  const u = new URL('https://open.neis.go.kr/hub/schoolInfo');
  u.searchParams.set('Type', 'json'); u.searchParams.set('pIndex', '1'); u.searchParams.set('pSize', '30');
  u.searchParams.set('SCHUL_KND_SC_NM', '초등학교'); u.searchParams.set('SCHUL_NM', q);
  if (office) u.searchParams.set('ATPT_OFCDC_SC_CODE', office);
  if (env.NEIS_KEY) u.searchParams.set('KEY', env.NEIS_KEY);
  const r = await fetch(u.toString(), { cf: { cacheTtl: 86400, cacheEverything: true } });
  const d = await r.json();
  const rows = (d.schoolInfo && d.schoolInfo[1] && d.schoolInfo[1].row) || [];
  return rows.map(x => ({ code: `${x.ATPT_OFCDC_SC_CODE}-${x.SD_SCHUL_CODE}`, name: x.SCHUL_NM, region: x.LCTN_SC_NM || '', office: x.ATPT_OFCDC_SC_NM || '', addr: (x.ORG_RDNMA || '').split(' ').slice(0, 3).join(' ') }));
}

/* ---------------- 학생 ---------------- */
function readClassFields(b) {
  const school_code = str(b.school_code, 40), school_name = str(b.school_name, 40);
  const grade = int(b.grade, 1, 6), cls = int(b.cls, 1, 30), num = int(b.num, 1, 60);
  if (!school_code || !school_name || !grade || !cls || !num && num !== 0) return null;
  return { school_code, school_name, grade, cls, num };
}
async function studentLogin(env, b) {
  const f = readClassFields(b); if (!f || f.num == null) return fail('학교, 학년, 반, 번호를 모두 골라 주세요.');
  const nickname = str(b.nickname, 10), pin = str(b.pin, 4);
  if (!nickname) return fail('닉네임을 적어 주세요.');
  if (!/^\d{4}$/.test(pin)) return fail('비밀번호는 숫자 4자리예요.');
  const now = Date.now();
  const row = await env.DB.prepare('SELECT * FROM students WHERE school_code=? AND grade=? AND cls=? AND num=?').bind(f.school_code, f.grade, f.cls, f.num).first();
  if (!row) {
    const salt = `${f.school_code}|${f.grade}|${f.cls}|${f.num}`;
    const res = await env.DB.prepare('INSERT INTO students (school_code,school_name,grade,cls,num,nickname,pin_hash,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(f.school_code, f.school_name, f.grade, f.cls, f.num, nickname, await hashPin(pin, salt), now, now).run();
    const id = res.meta.last_row_id;
    return json({ ok: true, created: true, token: await makeToken(env, 's', id), nickname, state: null, server_now: now });
  }
  if (row.locked_until > now) return fail(`비밀번호를 여러 번 틀려서 ${Math.ceil((row.locked_until - now) / 60000)}분 동안 잠겼어요.`, 429);
  const salt = `${row.school_code}|${row.grade}|${row.cls}|${row.num}`;
  if (!row.pin_hash) { // 선생님이 비밀번호를 초기화한 경우: 이번에 입력한 번호가 새 비밀번호
    await env.DB.prepare('UPDATE students SET pin_hash=?, fail_count=0, locked_until=0 WHERE id=?').bind(await hashPin(pin, salt), row.id).run();
  } else if (row.pin_hash !== await hashPin(pin, salt)) {
    const fc = (row.fail_count || 0) + 1;
    await env.DB.prepare('UPDATE students SET fail_count=?, locked_until=? WHERE id=?').bind(fc >= PIN_MAX_FAIL ? 0 : fc, fc >= PIN_MAX_FAIL ? now + PIN_LOCK_MS : 0, row.id).run();
    return fail(`비밀번호가 달라요. 잊어버렸다면 선생님께 초기화를 부탁하세요. (${row.nickname})`, 401);
  }
  if (row.fail_count) await env.DB.prepare('UPDATE students SET fail_count=0 WHERE id=?').bind(row.id).run();
  return json({ ok: true, created: false, token: await makeToken(env, 's', row.id), nickname: row.nickname, state: row.state ? JSON.parse(row.state) : null, updated_at: row.updated_at, server_now: now });
}
async function studentSave(env, req, b) {
  const id = await readToken(env, bearer(req), 's'); if (!id) return fail('다시 로그인해 주세요.', 401);
  const state = JSON.stringify(b.state || {});
  if (state.length > MAX_STATE) return fail('기록이 너무 커요.', 413);
  const summary = JSON.stringify(b.summary || {}).slice(0, 4000);
  const now = Date.now();
  const nick = str(b.nickname, 10);
  await env.DB.prepare(`UPDATE students SET state=?, summary=?, updated_at=?${nick ? ', nickname=?' : ''} WHERE id=?`)
    .bind(...(nick ? [state, summary, now, nick, id] : [state, summary, now, id])).run();
  return json({ ok: true, server_now: now });
}

/* ---------------- 선생님 ---------------- */
async function teacherRegister(env, b) {
  const f = readClassFields({ ...b, num: 1 }); if (!f) return fail('학교, 학년, 반을 모두 골라 주세요.');
  const pass = str(b.password, 40), teacher_name = str(b.teacher_name, 20), contact = str(b.contact, 60);
  if (pass.length < 6) return fail('선생님 비밀번호는 6자 이상으로 정해 주세요.');
  if (!teacher_name) return fail('선생님 성함을 적어 주세요.');
  const exists = await env.DB.prepare('SELECT status FROM teachers WHERE school_code=? AND grade=? AND cls=?').bind(f.school_code, f.grade, f.cls).first();
  if (exists && exists.status !== 'rejected') return fail(exists.status === 'approved' ? '이 반은 이미 등록되어 있어요.' : '이 반은 이미 승인을 기다리고 있어요.', 409);
  if (exists) await env.DB.prepare('DELETE FROM teachers WHERE school_code=? AND grade=? AND cls=?').bind(f.school_code, f.grade, f.cls).run();
  const now = Date.now();
  await env.DB.prepare('INSERT INTO teachers (school_code,school_name,grade,cls,teacher_name,contact,pass_hash,status,export_key,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .bind(f.school_code, f.school_name, f.grade, f.cls, teacher_name, contact, await sha256(`aq-teacher|${f.school_code}|${pass}`), 'pending', randKey(), now).run();
  const mailed = await notify(env, `[애플왕] 선생님 등록 승인 요청 — ${f.school_name} ${f.grade}학년 ${f.cls}반`,
    `새 선생님 등록 요청이 들어왔어요.\n\n학교: ${f.school_name}\n학년·반: ${f.grade}학년 ${f.cls}반\n선생님: ${teacher_name}\n연락처: ${contact || '(없음)'}\n\n게임 → 나의 성장 → 제작자 관리실에서 승인하거나 거절해 주세요.`);
  return json({ ok: true, status: 'pending', mailed });
}
async function teacherLogin(env, b) {
  const f = readClassFields({ ...b, num: 1 }); if (!f) return fail('학교, 학년, 반을 모두 골라 주세요.');
  const row = await env.DB.prepare('SELECT * FROM teachers WHERE school_code=? AND grade=? AND cls=?').bind(f.school_code, f.grade, f.cls).first();
  if (!row) return fail('등록되지 않은 반이에요. 먼저 선생님 등록을 해 주세요.', 404);
  const now = Date.now();
  if (row.locked_until > now) return fail('비밀번호를 여러 번 틀려서 잠시 잠겼어요. 10분 뒤에 다시 해 주세요.', 429);
  if (row.pass_hash !== await sha256(`aq-teacher|${row.school_code}|${str(b.password, 40)}`)) {
    const fc = (row.fail_count || 0) + 1;
    await env.DB.prepare('UPDATE teachers SET fail_count=?, locked_until=? WHERE id=?').bind(fc >= PIN_MAX_FAIL ? 0 : fc, fc >= PIN_MAX_FAIL ? now + PIN_LOCK_MS : 0, row.id).run();
    return fail('비밀번호가 달라요.', 401);
  }
  if (row.status === 'pending') return fail('아직 제작자 승인을 기다리고 있어요. 승인되면 들어올 수 있어요.', 403);
  if (row.status === 'rejected') return fail('등록이 승인되지 않았어요. 제작자에게 문의해 주세요.', 403);
  await env.DB.prepare('UPDATE teachers SET fail_count=0 WHERE id=?').bind(row.id).run();
  return json({ ok: true, token: await makeToken(env, 't', row.id), school_name: row.school_name, grade: row.grade, cls: row.cls, teacher_name: row.teacher_name, export_key: row.export_key });
}
async function teacherRow(env, req) {
  const id = await readToken(env, bearer(req), 't'); if (!id) return null;
  const t = await env.DB.prepare('SELECT * FROM teachers WHERE id=?').bind(id).first();
  return t && t.status === 'approved' ? t : null;
}
async function classStudents(env, t) {
  const { results } = await env.DB.prepare('SELECT id,num,nickname,summary,updated_at,created_at,pin_hash IS NULL AS pin_reset FROM students WHERE school_code=? AND grade=? AND cls=? ORDER BY num').bind(t.school_code, t.grade, t.cls).all();
  return results.map(r => ({ id: r.id, num: r.num, nickname: r.nickname, pin_reset: !!r.pin_reset, updated_at: r.updated_at, created_at: r.created_at, ...(r.summary ? JSON.parse(r.summary) : {}) }));
}
const CSV_HEAD = ['번호', '닉네임', '레벨', '경험치', '진화 단계', '완료 단원 수', '완료 단원', '정답률(%)', '학습 시간(분)', '연속 학습(일)', '보스전', '자주 틀린 단어', '마지막 학습', '마지막 저장'];
function toCSV(list) {
  const fmt = t => t ? new Date(t + 9 * 3600e3).toISOString().slice(0, 16).replace('T', ' ') : '';
  const rows = list.map(s => [s.num, s.nickname, s.level, s.exp, s.stage, s.unitsDone, (s.doneUnits || []).join(' '), s.accuracy, s.minutes, s.streak, (s.bosses || []).join(' '), (s.wrongTop || []).join(' '), fmt(s.lastStudy), fmt(s.updated_at)]);
  return '﻿' + [CSV_HEAD].concat(rows).map(r => r.map(csvCell).join(',')).join('\n');
}

/* ---------------- 라우터 ---------------- */
async function route(req, env) {
  const url = new URL(req.url), p = url.pathname.replace(/\/+$/, '');
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() });
  if (!env.DB) return fail('서버 데이터베이스(DB) 연결이 아직 안 되어 있어요.', 500);
  if (!env.TOKEN_SECRET) return fail('서버 설정(TOKEN_SECRET)이 아직 안 되어 있어요.', 500);
  await ensureSchema(env);
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

  if (p === '/api/health') return json({ ok: true, server_now: Date.now() });
  if (p === '/api/schools') { try { return json({ ok: true, schools: await searchSchools(env, url.searchParams.get('q'), url.searchParams.get('office')), limited: !env.NEIS_KEY }); } catch (e) { return fail('학교 검색이 잠시 안 돼요. 잠시 뒤 다시 해 주세요.', 502); } }

  if (p === '/api/student/login' && req.method === 'POST') return studentLogin(env, body);
  if (p === '/api/student/save' && req.method === 'POST') return studentSave(env, req, body);
  if (p === '/api/student/state') {
    const id = await readToken(env, bearer(req), 's'); if (!id) return fail('다시 로그인해 주세요.', 401);
    const row = await env.DB.prepare('SELECT nickname,state,updated_at FROM students WHERE id=?').bind(id).first();
    if (!row) return fail('기록을 찾을 수 없어요. 다시 로그인해 주세요.', 401);
    return json({ ok: true, nickname: row.nickname, state: row.state ? JSON.parse(row.state) : null, updated_at: row.updated_at, server_now: Date.now() });
  }

  if (p === '/api/survey' && req.method === 'POST') {
    const r = int(body.rating, 1, 5); if (!r) return fail('하트를 골라 주세요.');
    await env.DB.prepare('INSERT INTO surveys (rating,comment,info,school_name,created_at) VALUES (?,?,?,?,?)').bind(r, str(body.comment, 200), str(body.info, 120), str(body.school_name, 40), Date.now()).run();
    return json({ ok: true });
  }

  if (p === '/api/teacher/register' && req.method === 'POST') return teacherRegister(env, body);
  if (p === '/api/teacher/login' && req.method === 'POST') return teacherLogin(env, body);
  if (p === '/api/teacher/students') {
    const t = await teacherRow(env, req); if (!t) return fail('다시 로그인해 주세요.', 401);
    return json({ ok: true, students: await classStudents(env, t), export_key: t.export_key });
  }
  if (p === '/api/teacher/reset-pin' && req.method === 'POST') {
    const t = await teacherRow(env, req); if (!t) return fail('다시 로그인해 주세요.', 401);
    await env.DB.prepare('UPDATE students SET pin_hash=NULL, fail_count=0, locked_until=0 WHERE id=? AND school_code=? AND grade=? AND cls=?').bind(int(body.id, 1, 1e12), t.school_code, t.grade, t.cls).run();
    return json({ ok: true });
  }
  if (p === '/api/teacher/delete-student' && req.method === 'POST') {
    const t = await teacherRow(env, req); if (!t) return fail('다시 로그인해 주세요.', 401);
    await env.DB.prepare('DELETE FROM students WHERE id=? AND school_code=? AND grade=? AND cls=?').bind(int(body.id, 1, 1e12), t.school_code, t.grade, t.cls).run();
    return json({ ok: true });
  }
  if (p === '/api/teacher/delete-class' && req.method === 'POST') {
    const t = await teacherRow(env, req); if (!t) return fail('다시 로그인해 주세요.', 401);
    await env.DB.prepare('DELETE FROM students WHERE school_code=? AND grade=? AND cls=?').bind(t.school_code, t.grade, t.cls).run();
    return json({ ok: true });
  }
  if (p === '/api/export.csv') { // 구글 시트 =IMPORTDATA("...")용
    const t = await env.DB.prepare("SELECT * FROM teachers WHERE export_key=? AND status='approved'").bind(str(url.searchParams.get('key'), 80)).first();
    if (!t) return new Response('승인된 선생님 링크가 아니에요.', { status: 403, headers: cors({ 'Content-Type': 'text/plain; charset=utf-8' }) });
    return new Response(toCSV(await classStudents(env, t)), { headers: cors({ 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store' }) });
  }

  if (p.startsWith('/api/admin/')) {
    if (!(await isAdmin(env, req))) return fail('제작자 비밀번호가 달라요.', 401);
    if (p === '/api/admin/teachers') {
      const { results } = await env.DB.prepare('SELECT id,school_name,grade,cls,teacher_name,contact,status,created_at,decided_at FROM teachers ORDER BY status=\'pending\' DESC, created_at DESC LIMIT 300').all();
      const counts = await env.DB.prepare('SELECT COUNT(*) AS n FROM students').first();
      return json({ ok: true, teachers: results, students: counts.n });
    }
    if (p === '/api/admin/decide' && req.method === 'POST') {
      const st = body.approve ? 'approved' : 'rejected';
      await env.DB.prepare('UPDATE teachers SET status=?, decided_at=? WHERE id=?').bind(st, Date.now(), int(body.id, 1, 1e12)).run();
      return json({ ok: true, status: st });
    }
    if (p === '/api/admin/backup') { // 전체 백업(JSON): 학생 기록·선생님·만족도 — 비밀번호 해시는 제외
      const st = await env.DB.prepare('SELECT id,school_code,school_name,grade,cls,num,nickname,state,summary,created_at,updated_at FROM students ORDER BY school_name,grade,cls,num').all();
      const te = await env.DB.prepare('SELECT id,school_code,school_name,grade,cls,teacher_name,contact,status,created_at,decided_at FROM teachers ORDER BY school_name,grade,cls').all();
      const sv = await env.DB.prepare('SELECT * FROM surveys ORDER BY id').all();
      return json({ ok: true, exported_at: Date.now(), students: st.results.map(r => ({ ...r, state: r.state ? JSON.parse(r.state) : null, summary: r.summary ? JSON.parse(r.summary) : null })), teachers: te.results, surveys: sv.results });
    }
    if (p === '/api/admin/surveys') {
      const { results } = await env.DB.prepare('SELECT rating,comment,info,school_name,created_at FROM surveys ORDER BY id DESC LIMIT 1000').all();
      return json({ ok: true, surveys: results });
    }
  }
  return fail('없는 주소예요.', 404);
}

export default {
  async fetch(req, env) {
    try { return await route(req, env); }
    catch (e) { return fail('서버에서 문제가 생겼어요. 잠시 뒤 다시 해 주세요.', 500, { detail: String(e && e.message || e).slice(0, 200) }); }
  },
};
