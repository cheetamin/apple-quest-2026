// 12라운드 구성
import { createChop } from './chop.js';
import { createFly } from './fly.js';
import { createFlags } from './flags.js';
import { createDance } from './dance.js';
import { createDodge } from './dodge.js';
import { createOX } from './ox.js';

export const ROUNDS = [
  { no: 1, id: 'chop', kind: 'physical', name: '가래떡 썰기 대회', icon: '🔪', create: createChop, char: 'chop',
    how: '팔을 머리 위로 번쩍 올렸다가 아래로 내리면 화면 속 가래떡이 썰려요. (실제 칼은 사용하지 않아요!)',
    score: '완전한 올리기·내리기 1번 = 1번 썰기. 초록 고리가 찼을 때 썰어 일정한 길이일수록 높은 점수. 마구 흔들면 점수가 오르지 않아요.',
    safety: '옆 친구와 팔이 닿지 않게 두 팔 간격 이상 떨어져 서요.' },
  { no: 2, id: 'math', kind: 'brain', subject: 'math', name: '가래떡 연산 대회', icon: '🧮',
    how: '우리 팀 숫자판으로 답을 입력하고 [확정]을 눌러요. 제한 시간 동안 팀마다 따로 문제를 풀어요.',
    score: '정답률이 가장 중요해요(60%). 맞힌 문제 수(30%)와 연속 정답 보너스(10%)도 있어요.',
    safety: '상대 팀 숫자판은 누르지 않아요.' },
  { no: 3, id: 'fly', kind: 'physical', name: '가래떡 날기 대회', icon: '🪽', create: createFly, char: 'cheer',
    how: '두 팔을 날개처럼 머리 위로 올렸다가 아래로 힘차게 내려요. 계속 퍼덕이면 가래떡이 구름 위 결승점까지 날아올라요!',
    score: '구름 위에 도착한 횟수로 점수를 매겨요. 쉬면 천천히 내려오고, 너무 빠르게 흔들기만 하면 인정되지 않아요.',
    safety: '제자리에서 팔만 움직여요. 옆 친구와 팔이 닿지 않게 간격을 넓혀요.' },
  { no: 4, id: 'kor', kind: 'brain', subject: 'kor', name: '가래떡 맞춤법 대회', icon: '📖',
    how: '팀마다 10문제를 각자 풀어요. 두 팀의 문제 순서와 번호가 모두 달라서 옆 팀을 봐도 소용없어요!',
    score: '정답 1개 7점(70점) + 10문제를 끝까지 풀고 정확도 70% 이상이면 빨리 끝낼수록 속도 보너스 최대 30점. 서두르다 4개 이상 틀리면 보너스 실패!', safety: '우리 팀 버튼만 눌러요.' },
  { no: 5, id: 'flags', kind: 'physical', name: '청가래떡 백가래떡 대회', icon: '🚩', create: createFlags,
    how: '청가래떡 = 내 왼팔, 백가래떡 = 내 오른팔! 명령에 맞게 팔을 올리고 내려요.',
    score: '명령을 정확히 따른 비율로 점수를 매겨요. "~하지 마!"에 속지 마세요.',
    safety: '팔을 너무 세게 휘두르지 않아요.' },
  { no: 6, id: 'soc', kind: 'brain', subject: 'soc', name: '가래떡 사회 탐험 대회', icon: '🌏',
    how: '팀마다 10문제를 각자 풀어요. 두 팀의 문제 순서와 번호가 모두 달라서 옆 팀을 봐도 소용없어요!',
    score: '정답 1개 7점(70점) + 10문제를 끝까지 풀고 정확도 70% 이상이면 빨리 끝낼수록 속도 보너스 최대 30점. 서두르다 4개 이상 틀리면 보너스 실패!', safety: '우리 팀 버튼만 눌러요.' },
  { no: 7, id: 'dance', kind: 'physical', name: '가래떡 댄스 대회', icon: '💃', create: createDance,
    how: '〈떡떡! 가래떡 댄스〉에 맞춰 가래떡 댄서의 동작을 거울처럼 따라 해요.',
    score: '얼마나 예쁘게 추는지가 아니라, 정해진 동작을 박자 안에 정확히 하고 유지했는지로 평가해요.',
    safety: '제자리에서 춤춰요. 뛰거나 회전하지 않아요.' },
  { no: 8, id: 'sci', kind: 'brain', subject: 'sci', name: '가래떡 과학 탐구 대회', icon: '🔬',
    how: '팀마다 10문제를 각자 풀어요. 두 팀의 문제 순서와 번호가 모두 달라서 옆 팀을 봐도 소용없어요!',
    score: '정답 1개 7점(70점) + 10문제를 끝까지 풀고 정확도 70% 이상이면 빨리 끝낼수록 속도 보너스 최대 30점. 서두르다 4개 이상 틀리면 보너스 실패!', safety: '우리 팀 버튼만 눌러요.' },
  { no: 9, id: 'dodge', kind: 'physical', name: '날아오는 가래떡 피하기', icon: '💨', create: createDodge,
    how: '몸을 왼쪽·오른쪽으로 옮기면 가래떡 선수도 따라 움직여요. 까만 탄 떡은 피하고 황금 가래떡은 모아요!',
    score: '피한 비율 65% + 황금 가래떡을 모은 비율 35%.',
    safety: '점프하거나 깊게 앉지 않아요. 한 걸음씩만 움직여요.' },
  { no: 10, id: 'eng', kind: 'brain', subject: 'eng', name: '가래떡 영단어 대회', icon: '🔤',
    how: '팀마다 10문제를 각자 풀어요. 두 팀의 문제 순서와 번호가 모두 달라서 옆 팀을 봐도 소용없어요!',
    score: '정답 1개 7점(70점) + 10문제를 끝까지 풀고 정확도 70% 이상이면 빨리 끝낼수록 속도 보너스 최대 30점. 서두르다 4개 이상 틀리면 보너스 실패!', safety: '우리 팀 버튼만 눌러요.' },
  { no: 11, id: 'ox', kind: 'mixed', subject: 'ox', name: '몸으로 말해요! 가래떡 OX', icon: '⭕', create: createOX,
    how: '문장을 읽고 맞으면 ⭕ 양팔을 머리 위로, 틀리면 ❌ 양팔을 가슴 앞에서 교차해요. 1초 유지하면 답이 확정돼요.',
    score: '정답 75% + 동작으로 답을 확정한 비율 25%.', safety: '제자리에서 천천히 자세를 바꿔요.' },
  { no: 12, id: 'relay', kind: 'relay', name: '가래떡 이어달리기 결승전', icon: '🏃',
    how: '팀원 모두가 차례로 카메라 앞에서 제자리 달리기를 해요. 팔다리를 움직일수록 가래떡 선수가 빨리 달려요!',
    score: '앞선 11라운드 점수 차이만큼 출발 위치 보너스(최대 트랙의 10%). 결승선을 먼저 통과한 팀이 우승!',
    safety: '제자리에서만 달려요. 교대할 때는 걸어서 자리를 바꿔요.' },
];

export const PRAISE = [
  '끝까지 최선을 다한 멋진 경기였어요!', '두 팀 모두 정말 훌륭했어요!', '함께 응원하고 협력한 모습이 최고였어요!',
  '오늘의 진정한 주인공은 모두 여러분이에요!', '우리 쌀의 소중함도 함께 배웠어요!',
];
export const ROUND_PRAISE = ['멋진 승부였어요!', '집중력이 대단해요!', '서로 응원하는 모습이 최고예요!', '한 뼘 더 성장했어요!', '정말 열심히 했어요!', '다음 라운드도 힘내요!'];

// ── 학생 수에 맞춘 라운드 구성 ──
// 일반 라운드 수 = 큰 팀 인원(반 전체의 절반, 홀수면 올림). 한 라운드에 팀마다 1명씩 → 모두 한 번씩 출전.
const BASE_IDS = ROUNDS.slice(0, 11).map((r) => r.id);
// 11개보다 적을 때: 신체·두뇌가 번갈아 나오도록 고른 순서
const SHORT_ORDER = ['chop', 'kor', 'flags', 'math', 'dance', 'sci', 'ox', 'soc', 'dodge', 'eng', 'fly'];
// 11개보다 많을 때 덧붙이는 순서(교과 퀴즈와 신체 게임을 번갈아 '2탄'으로)
const EXTRA_ORDER = ['kor', 'chop', 'sci', 'flags', 'soc', 'dance', 'eng', 'dodge', 'math', 'fly', 'ox'];

export function makeSequence(n) {
  n = Math.max(1, Math.round(n));
  if (n === 11) return BASE_IDS.slice();
  if (n < 11) return SHORT_ORDER.slice(0, n);
  const seq = BASE_IDS.slice();
  for (let k = 0; seq.length < n; k++) seq.push(EXTRA_ORDER[k % EXTRA_ORDER.length]);
  return seq;
}

/** r번째 일반 라운드 정보 (번호·이름은 순서에 맞게, 같은 게임 반복이면 "2탄") */
export function roundInfo(seq, r) {
  const total = seq.length + 1;
  if (r >= seq.length) return { ...ROUNDS[11], no: total, total };
  const base = ROUNDS.find((x) => x.id === seq[r]);
  const count = seq.slice(0, r + 1).filter((x) => x === seq[r]).length;
  return { ...base, no: r + 1, total, name: count > 1 ? `${base.name} ${count}탄` : base.name };
}
