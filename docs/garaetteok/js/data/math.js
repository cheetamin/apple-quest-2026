// 학년·학기별 연산 문제 생성기 (2022 개정 교육과정 수와 연산 영역의 학년별 계산 범위)
// 생성 문제는 매번 새 숫자로 출제되며, 객관식 오답은 학생들이 자주 하는 실수 유형으로 만든다.

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const lcm = (a, b) => (a / gcd(a, b)) * b;

export function frac(n, d) {
  const g = gcd(n, d) || 1;
  return { n: n / g, d: d / g };
}
export const fracVal = (f) => f.n / f.d;
/** 분수 표시용 문자열 (HTML 렌더러가 해석: "2|3" → 3분의 2, "1 2|3" → 대분수) */
export function fracStr(f) {
  if (f.d === 1) return String(f.n);
  if (f.n > f.d) { const w = Math.floor(f.n / f.d), r = f.n % f.d; return r ? `${w} ${r}|${f.d}` : String(w); }
  return `${f.n}|${f.d}`;
}
export function fracSpeech(s) {
  return String(s).replace(/(\d+) (\d+)\|(\d+)/g, '$1과 $3분의 $2').replace(/(\d+)\|(\d+)/g, '$2분의 $1');
}
const fmtNum = (x) => String(Math.round(x * 1000) / 1000);

function mcFrac(correct, wrongs, reduce = true) {
  const red = (w) => (reduce ? frac(w.n, w.d) : { n: w.n, d: w.d });
  const seen = new Set([fracVal(correct).toFixed(6)]);
  const out = [];
  for (const w of wrongs) {
    if (!w || w.n <= 0 || w.d <= 0) continue;
    const r = red(w);
    const k = fracVal(r).toFixed(6);
    if (seen.has(k)) continue;
    seen.add(k); out.push(fracStr(r));
    if (out.length === 2) break;
  }
  let bump = 1;
  while (out.length < 2) {
    const r = red({ n: correct.n + bump, d: correct.d });
    const k = fracVal(r).toFixed(6);
    if (!seen.has(k)) { seen.add(k); out.push(fracStr(r)); }
    bump++;
  }
  return { type: 'mc', answer: fracStr(correct), wrongs: out };
}

const R = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));

// 각 생성기: (rng) => { q, type:'num'|'mc', answer, wrongs?, explain, topic }
const G = {
  add9: (r) => { const a = R(r, 1, 8), b = R(r, 1, 9 - a); return { q: `${a} + ${b} = ?`, type: 'num', answer: a + b, explain: `${a}에 ${b}를 더하면 ${a + b}예요.`, topic: '9까지의 수 덧셈' }; },
  sub9: (r) => { const a = R(r, 2, 9), b = R(r, 1, a - 1); return { q: `${a} − ${b} = ?`, type: 'num', answer: a - b, explain: `${a}에서 ${b}를 빼면 ${a - b}예요.`, topic: '9까지의 수 뺄셈' }; },
  add10: (r) => { const a = R(r, 2, 9), b = R(r, Math.max(2, 11 - a), 9); return { q: `${a} + ${b} = ?`, type: 'num', answer: a + b, explain: `10을 만들어 더해요: ${a} + ${10 - a} = 10, 남은 ${b - (10 - a)}를 더하면 ${a + b}.`, topic: '받아올림 있는 덧셈' }; },
  sub10: (r) => { const a = R(r, 11, 18), b = R(r, a - 9, 9); return { q: `${a} − ${b} = ?`, type: 'num', answer: a - b, explain: `${a} − ${b} = ${a - b}예요.`, topic: '받아내림 있는 뺄셈' }; },
  add2d1: (r) => { const t = R(r, 1, 8) * 10, o = R(r, 0, 5), b = R(r, 1, 9 - o); return { q: `${t + o} + ${b} = ?`, type: 'num', answer: t + o + b, explain: `일의 자리끼리 더해요: ${o} + ${b} = ${o + b}.`, topic: '두 자리 수 덧셈(받아올림 없음)' }; },
  add2d2: (r) => { const a = R(r, 15, 69), b = R(r, 12, 99 - a); return { q: `${a} + ${b} = ?`, type: 'num', answer: a + b, explain: `일의 자리부터 더하고, 10이 넘으면 받아올려요. 답은 ${a + b}.`, topic: '두 자리 수 덧셈' }; },
  sub2d2: (r) => { const a = R(r, 40, 99), b = R(r, 11, a - 10); return { q: `${a} − ${b} = ?`, type: 'num', answer: a - b, explain: `일의 자리부터 빼고, 모자라면 받아내려요. 답은 ${a - b}.`, topic: '두 자리 수 뺄셈' }; },
  times: (r) => { const a = R(r, 2, 9), b = R(r, 2, 9); return { q: `${a} × ${b} = ?`, type: 'num', answer: a * b, explain: `${a}단: ${a} × ${b} = ${a * b}.`, topic: '곱셈구구' }; },
  add3d: (r) => { const a = R(r, 120, 680), b = R(r, 110, 999 - a); return { q: `${a} + ${b} = ?`, type: 'num', answer: a + b, explain: `같은 자리끼리 더해요. 답은 ${a + b}.`, topic: '세 자리 수 덧셈' }; },
  sub3d: (r) => { const a = R(r, 300, 999), b = R(r, 105, a - 50); return { q: `${a} − ${b} = ?`, type: 'num', answer: a - b, explain: `같은 자리끼리 빼요. 답은 ${a - b}.`, topic: '세 자리 수 뺄셈' }; },
  divFact: (r) => { const b = R(r, 2, 9), q = R(r, 2, 9); return { q: `${b * q} ÷ ${b} = ?`, type: 'num', answer: q, explain: `${b} × ${q} = ${b * q}이므로 ${b * q} ÷ ${b} = ${q}.`, topic: '나눗셈(곱셈구구 범위)' }; },
  mul2x1: (r) => { const a = R(r, 12, 49), b = R(r, 2, 9); return { q: `${a} × ${b} = ?`, type: 'num', answer: a * b, explain: `${a} × ${b} = ${a * b}.`, topic: '(두 자리 수) × (한 자리 수)' }; },
  mul3x1: (r) => { const a = R(r, 112, 399), b = R(r, 2, 6); return { q: `${a} × ${b} = ?`, type: 'num', answer: a * b, explain: `${a} × ${b} = ${a * b}.`, topic: '(세 자리 수) × (한 자리 수)' }; },
  mul2x2: (r) => { const a = R(r, 11, 39), b = R(r, 11, 29); return { q: `${a} × ${b} = ?`, type: 'num', answer: a * b, explain: `${a} × ${b} = ${a * b}.`, topic: '(두 자리 수) × (두 자리 수)' }; },
  div2d1: (r) => { const b = R(r, 2, 9), q = R(r, 11, Math.floor(99 / b)); return { q: `${b * q} ÷ ${b} = ?`, type: 'num', answer: q, explain: `${b} × ${q} = ${b * q}.`, topic: '(두 자리 수) ÷ (한 자리 수)' }; },
  mul3x2: (r) => { const a = R(r, 105, 499), b = R(r, 11, 30); return { q: `${a} × ${b} = ?`, type: 'num', answer: a * b, explain: `${a} × ${b} = ${a * b}.`, topic: '(세 자리 수) × (두 자리 수)' }; },
  div3d2: (r) => { const b = R(r, 12, 45), q = R(r, 3, 9); return { q: `${b * q} ÷ ${b} = ?`, type: 'num', answer: q, explain: `${b} × ${q} = ${b * q}.`, topic: '(세 자리 수) ÷ (두 자리 수)' }; },
  fracSame: (r) => {
    const d = R(r, 4, 12), a = R(r, 1, d - 2), b = R(r, 1, d - 1 - a);
    const c = { n: a + b, d };
    const ans = mcFrac(c, [{ n: a + b, d: d + d }, { n: a + b + 1, d }, { n: Math.abs(a - b) || 1, d }], false);
    return { q: `${a}|${d} + ${b}|${d} = ?`, ...ans, answer: `${a + b}|${d}`, explain: `분모가 같으면 분자끼리 더해요: ${a} + ${b} = ${a + b}.`, topic: '분모가 같은 분수의 덧셈', noReduce: true };
  },
  fracSameSub: (r) => {
    const d = R(r, 4, 12), a = R(r, 3, d - 1), b = R(r, 1, a - 1);
    const ans = mcFrac({ n: a - b, d }, [{ n: a - b, d: d * 2 }, { n: a + b, d }, { n: a - b + 1, d }], false);
    return { q: `${a}|${d} − ${b}|${d} = ?`, ...ans, answer: `${a - b}|${d}`, explain: `분모가 같으면 분자끼리 빼요: ${a} − ${b} = ${a - b}.`, topic: '분모가 같은 분수의 뺄셈', noReduce: true };
  },
  decAdd: (r) => { const a = R(r, 11, 89) / 10, b = R(r, 11, 89) / 10; return { q: `${a} + ${b} = ?`, type: 'num', answer: +(a + b).toFixed(2), explain: `소수점끼리 맞추어 더해요. 답은 ${fmtNum(a + b)}.`, topic: '소수의 덧셈' }; },
  decSub: (r) => { const a = R(r, 30, 99) / 10, b = R(r, 11, a * 10 - 5) / 10; return { q: `${a} − ${b} = ?`, type: 'num', answer: +(a - b).toFixed(2), explain: `소수점끼리 맞추어 빼요. 답은 ${fmtNum(a - b)}.`, topic: '소수의 뺄셈' }; },
  mixedOps: (r) => {
    const a = R(r, 2, 20), b = R(r, 2, 9), c = R(r, 2, 9);
    const k = R(r, 0, 2);
    if (k === 0) return { q: `${a} + ${b} × ${c} = ?`, type: 'num', answer: a + b * c, explain: `곱셈을 먼저 해요: ${b} × ${c} = ${b * c}, ${a} + ${b * c} = ${a + b * c}.`, topic: '자연수의 혼합 계산' };
    if (k === 1) return { q: `(${a} + ${b}) × ${c} = ?`, type: 'num', answer: (a + b) * c, explain: `괄호 안을 먼저 계산해요: ${a + b} × ${c} = ${(a + b) * c}.`, topic: '자연수의 혼합 계산' };
    const big = b * c + a;
    return { q: `${big} − ${b} × ${c} = ?`, type: 'num', answer: a, explain: `곱셈을 먼저 해요: ${big} − ${b * c} = ${a}.`, topic: '자연수의 혼합 계산' };
  },
  gcdQ: (r) => { const g = R(r, 2, 9), x = R(r, 2, 6); let y = R(r, 2, 7); while (gcd(x, y) !== 1 || y === x) y = R(r, 2, 7); const a = g * x, b = g * y; return { q: `${a}와(과) ${b}의 최대공약수는?`, type: 'num', answer: g, explain: `두 수의 공약수 중 가장 큰 수는 ${g}예요.`, topic: '약수와 배수' }; },
  lcmQ: (r) => { const a = R(r, 2, 9); let b = R(r, 3, 12); if (b === a) b++; return { q: `${a}와(과) ${b}의 최소공배수는?`, type: 'num', answer: lcm(a, b), explain: `두 수의 공배수 중 가장 작은 수는 ${lcm(a, b)}예요.`, topic: '약수와 배수' }; },
  fracUnlike: (r) => {
    let d1 = R(r, 2, 6), d2 = R(r, 2, 8); while (d2 === d1) d2 = R(r, 2, 8);
    const a = R(r, 1, d1 - 1), b = R(r, 1, d2 - 1);
    const c = frac(a * d2 + b * d1, d1 * d2);
    const ans = mcFrac(c, [{ n: a + b, d: d1 + d2 }, { n: a * d2 + b * d1 + 1, d: d1 * d2 }, { n: a + b, d: d1 * d2 }]);
    return { q: `${a}|${d1} + ${b}|${d2} = ?`, ...ans, explain: `통분하여 더한 뒤 기약분수로 나타내요. 답은 ${fracSpeech(fracStr(c))}.`, topic: '분모가 다른 분수의 덧셈' };
  },
  fracUnlikeSub: (r) => {
    let d1, d2, a, b;
    do {
      d1 = R(r, 2, 6); d2 = R(r, 2, 8); a = R(r, 1, d1 - 1); b = R(r, 1, d2 - 1);
      if (a / d1 < b / d2) { [a, b, d1, d2] = [b, a, d2, d1]; }
    } while (d1 === d2 || a * d2 === b * d1);
    const c = frac(a * d2 - b * d1, d1 * d2);
    const ans = mcFrac(c, [{ n: Math.abs(a - b) || 1, d: Math.abs(d1 - d2) || 1 }, { n: c.n + 1, d: c.d }, { n: a + b, d: d1 * d2 }]);
    return { q: `${a}|${d1} − ${b}|${d2} = ?`, ...ans, explain: `통분하여 뺀 뒤 기약분수로 나타내요. 답은 ${fracSpeech(fracStr(c))}.`, topic: '분모가 다른 분수의 뺄셈' };
  },
  fracMulWhole: (r) => { const d = R(r, 3, 9), a = R(r, 1, d - 1), w = R(r, 2, 6); const c = frac(a * w, d); const ans = mcFrac(c, [{ n: a * w, d: d * w }, { n: a + w, d }, { n: c.n + 1, d: c.d }]); return { q: `${a}|${d} × ${w} = ?`, ...ans, explain: `분자에 자연수를 곱해요: ${a} × ${w} = ${a * w}.`, topic: '분수의 곱셈' }; },
  fracMul: (r) => { const d1 = R(r, 2, 7), d2 = R(r, 2, 7), a = R(r, 1, d1 - 1), b = R(r, 1, d2 - 1); const c = frac(a * b, d1 * d2); const ans = mcFrac(c, [{ n: a * d2, d: b * d1 }, { n: a + b, d: d1 + d2 }, { n: a * b, d: d1 + d2 }]); return { q: `${a}|${d1} × ${b}|${d2} = ?`, ...ans, explain: `분자끼리, 분모끼리 곱해요. 답은 ${fracSpeech(fracStr(c))}.`, topic: '분수의 곱셈' }; },
  decMul: (r) => { const a = R(r, 11, 49) / 10, b = R(r, 2, 9) / 10 + R(r, 0, 2); const ans = +(a * b).toFixed(3); return { q: `${a} × ${fmtNum(b)} = ?`, type: 'num', answer: ans, explain: `자연수처럼 곱한 뒤 소수점 자리 수를 맞춰요. 답은 ${fmtNum(ans)}.`, topic: '소수의 곱셈' }; },
  fracDivWhole: (r) => { const d = R(r, 2, 7), a = R(r, 1, d * 2), w = R(r, 2, 5); const c = frac(a, d * w); const ans = mcFrac(c, [{ n: a * w, d }, { n: a, d: d + w }, { n: c.n + 1, d: c.d }]); return { q: `${fracStr(frac(a, d))} ÷ ${w} = ?`, ...ans, explain: `÷ ${w}는 × 1/${w}과 같아요. 답은 ${fracSpeech(fracStr(c))}.`, topic: '분수의 나눗셈' }; },
  decDivWhole: (r) => { const w = R(r, 2, 9), q = R(r, 11, 99) / 10; const a = +(q * w).toFixed(2); return { q: `${fmtNum(a)} ÷ ${w} = ?`, type: 'num', answer: q, explain: `${w} × ${fmtNum(q)} = ${fmtNum(a)}.`, topic: '소수의 나눗셈' }; },
  percent: (r) => { const opts = [[1, 4], [1, 2], [3, 4], [1, 5], [2, 5], [3, 5], [1, 10], [3, 10], [7, 10], [9, 20], [7, 25]]; const [a, b] = opts[R(r, 0, opts.length - 1)]; return { q: `비율 ${a} : ${b}를 백분율(%)로 나타내면?`, type: 'num', answer: (a / b) * 100, explain: `${a} ÷ ${b} × 100 = ${(a / b) * 100}%.`, topic: '비와 비율' }; },
  fracDivFrac: (r) => { const d1 = R(r, 2, 7), d2 = R(r, 2, 7), a = R(r, 1, d1 - 1), b = R(r, 1, d2 - 1); const c = frac(a * d2, d1 * b); const ans = mcFrac(c, [{ n: a * b, d: d1 * d2 }, { n: d1 * b, d: a * d2 }, { n: c.n + 1, d: c.d }]); return { q: `${a}|${d1} ÷ ${b}|${d2} = ?`, ...ans, explain: `나누는 분수의 분자와 분모를 바꾸어 곱해요. 답은 ${fracSpeech(fracStr(c))}.`, topic: '분수의 나눗셈' }; },
  decDivDec: (r) => { const b = R(r, 2, 9) / 10, q = R(r, 2, 25); const a = +(b * q).toFixed(2); return { q: `${fmtNum(a)} ÷ ${fmtNum(b)} = ?`, type: 'num', answer: q, explain: `두 수에 10을 곱해 자연수의 나눗셈으로 바꿔요. 답은 ${q}.`, topic: '소수의 나눗셈' }; },
  proportion: (r) => { const a = R(r, 1, 9), b = R(r, 2, 9), k = R(r, 2, 6); return { q: `${a} : ${b} = ${a * k} : □  □는?`, type: 'num', answer: b * k, explain: `앞의 항이 ${k}배가 되었으니 뒤의 항도 ${k}배: ${b} × ${k} = ${b * k}.`, topic: '비례식' }; },
};

export const MATH_POOLS = {
  1: { 1: ['add9', 'sub9'], 2: ['add10', 'sub10', 'add2d1'] },
  2: { 1: ['add2d2', 'sub2d2'], 2: ['times'] },
  3: { 1: ['add3d', 'sub3d', 'divFact', 'mul2x1'], 2: ['mul3x1', 'mul2x2', 'div2d1'] },
  4: { 1: ['mul3x2', 'div3d2'], 2: ['fracSame', 'fracSameSub', 'decAdd', 'decSub'] },
  5: { 1: ['mixedOps', 'gcdQ', 'lcmQ', 'fracUnlike', 'fracUnlikeSub'], 2: ['fracMulWhole', 'fracMul', 'decMul'] },
  6: { 1: ['fracDivWhole', 'decDivWhole', 'percent'], 2: ['fracDivFrac', 'decDivDec', 'proportion'] },
};

export function mathPool(grade, sem) {
  const p = MATH_POOLS[grade];
  if (sem === 1) return p[1];
  if (sem === 2) return p[2];
  return [...p[1], ...p[2]];
}

/** 학년·학기에 맞는 연산 문제 1개 생성 */
export function genMath(grade, sem, rng = Math.random, last = null) {
  const pool = mathPool(grade, sem);
  let item, tries = 0;
  do {
    const key = pool[Math.floor(rng() * pool.length)];
    item = { ...G[key](rng), gen: key };
    tries++;
  } while (last && item.q === last && tries < 10);
  if (item.type === 'num') item.answer = +(+item.answer).toFixed(3);
  return item;
}

export function checkNumAnswer(input, answer) {
  const v = parseFloat(String(input).replace(',', '.'));
  return Number.isFinite(v) && Math.abs(v - answer) < 1e-6;
}

export const MATH_GEN = G;
