// 학생 명단·출전 계획 (순수 로직). 인원 수 고정 없음(1~60명).
export const ROUND_KIND = ['physical', 'brain', 'physical', 'brain', 'physical', 'brain', 'physical', 'brain', 'physical', 'brain', 'mixed'];

export function defaultNames(teamLabel, n) {
  return Array.from({ length: n }, (_, i) => `${teamLabel} ${i + 1}번`);
}

export function parseNames(text, n, teamLabel) {
  const given = (text || '').split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
  const out = defaultNames(teamLabel, n);
  for (let i = 0; i < Math.min(n, given.length); i++) out[i] = given[i];
  return out;
}

export function shuffled(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/**
 * 1~11라운드 출전 계획.
 * mode 'basic': 라운드마다 팀별 대표 1명(순서대로 돌아가며)
 * mode 'all'  : 모든 학생이 최소 1회 출전하도록 경기를 추가. 두뇌 라운드는 최대 3명 모둠.
 * order: 팀별 출전 순서(학생 인덱스 배열)
 */
export function buildPlan({ blueCount, whiteCount, mode = 'basic', orderBlue, orderWhite, squad = 3 }) {
  orderBlue = orderBlue || [...Array(blueCount).keys()];
  orderWhite = orderWhite || [...Array(whiteCount).keys()];
  if (mode === 'auto') {
    // 학생 수 맞춤: 라운드 수 = 큰 팀 인원, 라운드마다 팀별 1명. 인원이 적은 팀은 앞 순서 학생부터 한 번 더.
    const R = Math.max(blueCount, whiteCount);
    const rounds = Array.from({ length: R }, (_, i) => [{ blue: [orderBlue[i % blueCount]], white: [orderWhite[i % whiteCount]] }]);
    return { rounds, brainSquad: 1 };
  }
  const brainSquad = mode === 'all' ? Math.max(1, Math.min(3, squad)) : 1;
  const slotsOf = (r) => (ROUND_KIND[r] === 'brain' ? brainSquad : 1);
  const matches = Array(11).fill(1);
  if (mode === 'all') {
    const need = Math.max(blueCount, whiteCount);
    const pref = [0, 4, 8, 2, 6, 10, 1, 3, 5, 7, 9];
    let cap = matches.reduce((s, m, r) => s + m * slotsOf(r), 0);
    let p = 0;
    while (cap < need) {
      const r = pref[p % pref.length];
      matches[r]++; cap += slotsOf(r); p++;
    }
  }
  const mk = (count, order) => {
    const apps = Array(count).fill(0);
    let cursor = 0;
    return () => {
      // 아직 덜 출전한 학생 우선, 같으면 출전 순서대로
      let best = -1;
      for (let k = 0; k < count; k++) {
        const idx = order[(cursor + k) % count];
        if (best < 0 || apps[idx] < apps[best]) best = idx;
      }
      apps[best]++;
      cursor = (order.indexOf(best) + 1) % count;
      return best;
    };
  };
  const nextB = mk(blueCount, orderBlue), nextW = mk(whiteCount, orderWhite);
  const rounds = matches.map((m, r) => Array.from({ length: m }, () => {
    const n = slotsOf(r);
    const blue = [], white = [];
    for (let s = 0; s < n; s++) {
      const b = nextB(); if (!blue.includes(b) || blueCount < n) blue.push(b);
      const w = nextW(); if (!white.includes(w) || whiteCount < n) white.push(w);
    }
    return { blue, white };
  }));
  return { rounds, brainSquad };
}

/**
 * 결승 이어달리기 구간. 두 팀 모두 같은 구간 수(큰 팀 인원).
 * 적은 팀은 출전 횟수가 가장 적은 학생부터 한 번씩 더 달린다(균등 분배).
 */
export function relayLegs({ blueCount, whiteCount, orderBlue, orderWhite }) {
  orderBlue = orderBlue || [...Array(blueCount).keys()];
  orderWhite = orderWhite || [...Array(whiteCount).keys()];
  const L = Math.max(blueCount, whiteCount);
  const legs = [];
  for (let i = 0; i < L; i++) legs.push({ blue: orderBlue[i % blueCount], white: orderWhite[i % whiteCount] });
  return legs;
}

export function countAppearances(plan, team, count) {
  const a = Array(count).fill(0);
  for (const r of plan.rounds) for (const m of r) for (const i of m[team]) a[i]++;
  return a;
}

export function estimateMinutes({ plan, roundSeconds, legs, legSeconds }) {
  const matches = plan.rounds.reduce((s, r) => s + r.length, 0);
  const sec = matches * (roundSeconds + 35) + legs * (legSeconds + 6) + 120;
  return Math.round(sec / 60);
}
