// 점수 규칙 (순수 함수). 1~11라운드는 팀별 0~100점.
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const clamp100 = (v) => Math.round(clamp(v, 0, 100));

/** 인식된 시간 비율로 목표치를 낮춰, 카메라 인식 실패로 인한 불이익을 막는다 */
export function fairTarget(baseTarget, activeFrac) {
  return Math.max(1, baseTarget * clamp(activeFrac, 0.25, 1));
}

/** 두뇌(퀴즈) 라운드: 정답률 80% + 속도 20% (속도는 맞힌 문제에만) */
export function quizScore({ asked, correct, speedSum }) {
  if (!asked) return 0;
  const acc = correct / asked;
  const speed = correct ? speedSum / correct : 0; // 0~1
  return clamp100(100 * (0.8 * acc + 0.2 * acc * speed));
}

/** 연산 대회: 정답률 60% + 해결 수 30% + 연속 정답 보너스 최대 10% */
export function mathSprintScore({ attempts, correct, target, bestStreak }) {
  if (!attempts) return 0;
  const acc = correct / attempts;
  const vol = Math.min(1, correct / Math.max(1, target));
  const streak = Math.min(1, bestStreak / 5);
  return clamp100(100 * (0.6 * acc * Math.min(1, correct / 2) + 0.3 * vol + 0.1 * streak * acc));
}

/** 혼합(OX): 문제 해결 75% + 동작 인식 25% */
export function oxScore({ asked, correct, confirmed }) {
  if (!asked) return 0;
  return clamp100(100 * (0.75 * (correct / asked) + 0.25 * (confirmed / asked)));
}

/** 여러 경기(확장 모드)의 점수는 평균 → 경기 수가 많아도 100점 만점 유지 */
export function averageMatches(list) {
  const v = list.filter((x) => typeof x === 'number');
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
}

/**
 * 결승 이어달리기 설계
 * - 두 팀 모두 같은 구간 수(L = 큰 팀 인원) → 인원 차이로 인한 유불리 없음
 * - 트랙 길이 = 표준 속도로 전체 구간을 달렸을 때 거리의 92%
 * - 출발 보너스 = 점수 차 × 0.03%(트랙 대비), 최대 10% → 앞선 팀 우대 + 역전 가능
 */
export const RELAY = { BONUS_PER_POINT: 0.0003, BONUS_CAP: 0.10, TRACK_FACTOR: 0.92 };

export function relaySetup({ blueTotal, whiteTotal, legs, legSeconds, refSpeed = 1, maxTotal = 1100 }) {
  const trackLength = Math.round(legs * legSeconds * refSpeed * RELAY.TRACK_FACTOR * 10) / 10;
  const diff = blueTotal - whiteTotal;
  // 점수 차를 일반 라운드 만점(라운드 수×100) 대비 비율로 환산 → 라운드 수가 달라도 같은 기준
  const frac = Math.min(RELAY.BONUS_CAP, (Math.abs(diff) / maxTotal) * 1100 * RELAY.BONUS_PER_POINT);
  const bonus = Math.round(trackLength * frac * 10) / 10;
  return {
    trackLength,
    start: { blue: diff > 0 ? bonus : 0, white: diff < 0 ? bonus : 0 },
    bonusFrac: frac, diff,
  };
}

/** 걸음 빈도 → 속도 (표준 빈도 r0일 때 1.0, 최대 1.3배까지만: 과격한 질주 방지) */
export function runSpeed(rate, r0) {
  return clamp(rate / r0, 0, 1.3);
}

export function decideWinner(blueTotal, whiteTotal) {
  if (blueTotal > whiteTotal) return 'blue';
  if (whiteTotal > blueTotal) return 'white';
  return 'tie';
}

/**
 * 교과 퀴즈 스피드 레이스 (팀마다 같은 10문제를 서로 다른 순서로 각자 풀기 → 옆 팀 답을 봐도 소용없음)
 * - 정답 1개 = 7점 (10문제 70점)
 * - 속도 보너스 최대 30점: 10문제를 모두 풀고 정확도 70% 이상일 때만. 빨리 끝낼수록 많이.
 *   급하게 풀다 3개 넘게 틀리면 속도 보너스 '실패'
 */
export const QUIZ_RACE = { COUNT: 10, PER_CORRECT: 70, BONUS: 30, BONUS_MIN_ACC: 0.7 };
export function quizRaceScore({ total, correct, finished, timeUsed, limit }) {
  if (!total) return 0;
  const acc = correct / total;
  const base = QUIZ_RACE.PER_CORRECT * acc;
  let bonus = 0;
  if (finished && acc >= QUIZ_RACE.BONUS_MIN_ACC) bonus = QUIZ_RACE.BONUS * clamp((limit - timeUsed) / (limit * 0.7), 0, 1) * acc;
  return clamp100(base + bonus);
}
export function quizLimit(grade, slow = false) {
  return Math.round((grade <= 2 ? 150 : grade <= 4 ? 120 : 100) * (slow ? 1.3 : 1));
}
