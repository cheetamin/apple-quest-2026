// 로컬 시험용 서버: worker.js를 node:sqlite(가짜 D1) 위에서 실행하고, 학교 검색(NEIS)은 가짜 응답을 돌려줍니다.
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import worker from '../server/worker.js';
const db = new DatabaseSync(':memory:');
const D1 = { prepare(sql) { let a = []; const st = { bind(...x) { a = x; return st; }, async first() { return db.prepare(sql).get(...a) ?? null; }, async all() { return { results: db.prepare(sql).all(...a) }; }, async run() { const r = db.prepare(sql).run(...a); return { meta: { last_row_id: Number(r.lastInsertRowid) } }; } }; return st; } };
const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => {
  if (String(u).startsWith('https://open.neis.go.kr')) {
    const q = new URL(String(u)).searchParams.get('SCHUL_NM');
    const all = [{ ATPT_OFCDC_SC_CODE: 'S10', SD_SCHUL_CODE: '7010057', SCHUL_NM: '사과초등학교', LCTN_SC_NM: '경상남도', ATPT_OFCDC_SC_NM: '경상남도교육청', ORG_RDNMA: '경상남도 진주시 사과로 1' },
                 { ATPT_OFCDC_SC_CODE: 'B10', SD_SCHUL_CODE: '7011111', SCHUL_NM: '사과나무초등학교', LCTN_SC_NM: '서울특별시', ATPT_OFCDC_SC_NM: '서울특별시교육청', ORG_RDNMA: '서울특별시 강남구 나무로 2' }];
    const row = all.filter(x => x.SCHUL_NM.includes(q));
    return new Response(JSON.stringify(row.length ? { schoolInfo: [{ head: [{ list_total_count: row.length }] }, { row }] } : { RESULT: { CODE: 'INFO-200' } }), { headers: { 'Content-Type': 'application/json' } });
  }
  return realFetch(u, o);
};
const env = { DB: D1, TOKEN_SECRET: 'dev-secret' };
http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const r = await worker.fetch(new Request('http://127.0.0.1:8787' + req.url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : Buffer.concat(chunks) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
}).listen(8787, () => console.log('dev server on 8787'));
