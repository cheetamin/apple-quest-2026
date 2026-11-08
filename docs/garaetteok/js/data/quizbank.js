// 문제은행 엔진: 기본 문제 + 교사 추가/수정 문제 병합, 학년·학기·교과 필터, 중복 최소화, 팀별 선택지 섞기
import { RAW } from './bank.js';

export function parseGrades(s) {
  const m = String(s).trim().match(/^(\d)(?:-(\d))?$/);
  if (!m) return [];
  const a = +m[1], b = m[2] ? +m[2] : a;
  const out = [];
  for (let g = a; g <= b; g++) out.push(g);
  return out;
}

export function parseRaw(subject, text) {
  const out = [];
  let n = 0;
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const f = t.split('|');
    n++;
    if (subject === 'ox') {
      const [g, sem, lv, stmt, ans, explain] = f;
      out.push({ id: `ox-${n}`, subject, grades: parseGrades(g), sem: +sem, level: +lv, q: stmt, answer: ans.trim(), choices: ['O', 'X'], explain: explain || '' });
    } else {
      const [g, sem, lv, q, ch, explain, emoji, listen] = f;
      const choices = ch.split(';').map((s) => s.trim());
      out.push({ id: `${subject}-${n}`, subject, grades: parseGrades(g), sem: +sem, level: +lv, q, answer: choices[0], choices, explain: explain || '', emoji: emoji || '', listen: listen || '' });
    }
  }
  return out;
}

let BUILTIN = null;
export function builtinQuestions() {
  if (!BUILTIN) BUILTIN = Object.entries(RAW).flatMap(([s, t]) => parseRaw(s, t));
  return BUILTIN;
}

/** 문제 하나가 유효한지 검사 (오답 선택지 타당성 포함). 오류 메시지 배열 반환 */
export function validateQuestion(q) {
  const e = [];
  if (!q.q || !q.q.trim()) e.push('문제가 비어 있어요.');
  if (!q.grades || !q.grades.length || q.grades.some((g) => g < 1 || g > 6)) e.push('학년이 올바르지 않아요.');
  if (![0, 1, 2].includes(q.sem)) e.push('학기가 올바르지 않아요.');
  if (q.subject === 'ox') {
    if (!['O', 'X'].includes(q.answer)) e.push('OX 정답은 O 또는 X여야 해요.');
  } else {
    if (!q.choices || q.choices.length < 3) e.push('선택지는 정답 포함 3개 이상이어야 해요.');
    if (q.choices && q.choices.some((c) => !c || !c.trim())) e.push('빈 선택지가 있어요.');
    if (q.choices && new Set(q.choices).size !== q.choices.length) e.push('같은 선택지가 중복되어 있어요.');
    if (q.choices && q.choices[0] !== q.answer) e.push('정답은 첫 번째 선택지여야 해요.');
    if (q.choices && q.choices.length > 4) e.push('선택지는 최대 4개예요.');
  }
  return e;
}

/** 저장소(localStorage 등)를 받아 기본+교사 문제를 합친 목록 */
export function allQuestions(store) {
  const custom = store ? store.get('bank_custom', []) : [];
  const disabled = new Set(store ? store.get('bank_disabled', []) : []);
  const byId = new Map();
  for (const q of builtinQuestions()) byId.set(q.id, q);
  for (const q of custom) byId.set(q.id, { ...q, custom: true });
  return [...byId.values()].filter((q) => !disabled.has(q.id));
}

export function filterQuestions(list, { grade, sem, subject }) {
  return list.filter((q) => q.subject === subject && q.grades.includes(grade) &&
    (sem === 0 || q.sem === 0 || q.sem === sem));
}

/**
 * 출제 순서 만들기: 최근 출제 문제는 뒤로, 같은 난이도 안에서 섞고 쉬운 문제부터.
 */
export function pickQuestions(pool, count, recentIds = [], rng = Math.random) {
  const recent = new Set(recentIds);
  const sh = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const fresh = sh(pool.filter((q) => !recent.has(q.id)));
  const old = sh(pool.filter((q) => recent.has(q.id)));
  const chosen = [...fresh, ...old].slice(0, count);
  return chosen.sort((a, b) => a.level - b.level);
}

/**
 * 두 팀에 서로 다른 순서의 선택지를 만든다. 가능하면 정답 번호도 서로 다르게.
 * 반환: { blue: [...], white: [...] } 각 원소는 선택지 문자열
 */
export function teamOrders(choices, rng = Math.random) {
  const n = choices.length;
  const perm = () => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const p1 = perm();
  let p2 = perm(), tries = 0;
  const ansPos = (p) => p.indexOf(0);
  while (n > 1 && (ansPos(p2) === ansPos(p1) || p2.join() === p1.join()) && tries < 30) { p2 = perm(); tries++; }
  return { blue: p1.map((i) => choices[i]), white: p2.map((i) => choices[i]) };
}
