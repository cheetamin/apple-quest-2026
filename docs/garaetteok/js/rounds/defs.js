// 12라운드 구성
import { createChop } from './chop.js';
import { createStack } from './stack.js';
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
  { no: 3, id: 'stack', kind: 'physical', name: '가래떡 쌓기 대회', icon: '🏯', create: createStack,
    how: '손을 바구니에 대고 잠깐 기다리면 가래떡을 집어요. 탑 위 초록 칸으로 옮겨 멈추면 쌓여요.',
    score: '쌓은 높이 + 가운데에 정확히 놓을수록 보너스.',
    safety: '천천히 팔을 움직여요. 친구 쪽으로 팔을 뻗지 않아요.' },
  { no: 4, id: 'kor', kind: 'brain', subject: 'kor', name: '가래떡 맞춤법 대회', icon: '📖',
    how: '문제를 읽고 우리 팀 영역의 번호를 눌러 고른 뒤 [확정]을 눌러요. 두 팀의 번호 순서는 서로 달라요!',
    score: '정답률 80% + 빠르게 맞힌 정도 20%.', safety: '우리 팀 버튼만 눌러요.' },
  { no: 5, id: 'flags', kind: 'physical', name: '청가래떡 백가래떡 대회', icon: '🚩', create: createFlags,
    how: '청가래떡 = 내 왼팔, 백가래떡 = 내 오른팔! 명령에 맞게 팔을 올리고 내려요.',
    score: '명령을 정확히 따른 비율로 점수를 매겨요. "~하지 마!"에 속지 마세요.',
    safety: '팔을 너무 세게 휘두르지 않아요.' },
  { no: 6, id: 'soc', kind: 'brain', subject: 'soc', name: '가래떡 사회 탐험 대회', icon: '🌏',
    how: '우리 팀 영역의 번호를 눌러 고른 뒤 [확정]을 눌러요.', score: '정답률 80% + 빠르게 맞힌 정도 20%.', safety: '우리 팀 버튼만 눌러요.' },
  { no: 7, id: 'dance', kind: 'physical', name: '가래떡 댄스 대회', icon: '💃', create: createDance,
    how: '〈떡떡! 가래떡 댄스〉에 맞춰 가래떡 댄서의 동작을 거울처럼 따라 해요.',
    score: '얼마나 예쁘게 추는지가 아니라, 정해진 동작을 박자 안에 정확히 하고 유지했는지로 평가해요.',
    safety: '제자리에서 춤춰요. 뛰거나 회전하지 않아요.' },
  { no: 8, id: 'sci', kind: 'brain', subject: 'sci', name: '가래떡 과학 탐구 대회', icon: '🔬',
    how: '우리 팀 영역의 번호를 눌러 고른 뒤 [확정]을 눌러요.', score: '정답률 80% + 빠르게 맞힌 정도 20%.', safety: '우리 팀 버튼만 눌러요.' },
  { no: 9, id: 'dodge', kind: 'physical', name: '날아오는 가래떡 피하기', icon: '💨', create: createDodge,
    how: '몸을 왼쪽·오른쪽으로 옮기면 가래떡 선수도 따라 움직여요. 까만 탄 떡은 피하고 황금 가래떡은 모아요!',
    score: '피한 비율 65% + 황금 가래떡을 모은 비율 35%.',
    safety: '점프하거나 깊게 앉지 않아요. 한 걸음씩만 움직여요.' },
  { no: 10, id: 'eng', kind: 'brain', subject: 'eng', name: '가래떡 영단어 대회', icon: '🔤',
    how: '영어 문제를 듣고 우리 팀 번호를 눌러 고른 뒤 [확정]을 눌러요.', score: '정답률 80% + 빠르게 맞힌 정도 20%.', safety: '우리 팀 버튼만 눌러요.' },
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
