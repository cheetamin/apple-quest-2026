// 〈떡떡! 가래떡 댄스〉 — 오리지널 노래. 가사 한 줄 = 2마디(8박), 한 글자 = 8분음표 하나.
export const SONG_LINES = [
  { text: '쭉쭉 늘려 가래떡!', notes: ['G5', 'G5', 'E5', 'G5', 'A5', 'G5', 'E5'] },
  { text: '톡톡 잘라 가래떡!', notes: ['A5', 'A5', 'G5', 'A5', 'C6', 'A5', 'G5'] },
  { text: '왼쪽 오른쪽 흔들흔들', notes: ['E5', 'G5', 'E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'E5', 'C5'] },
  { text: '오늘은 우리가 떡 챔피언!', notes: ['C5', 'D5', 'E5', 'G5', 'E5', 'D5', 'C5', 'D5', 'E5', 'G5'] },
  { text: '손을 번쩍, 어깨 들썩!', notes: ['A5', 'A5', 'C6', 'A5', 'G5', 'G5', 'A5', 'G5'] },
  { text: '리듬 따라 떡떡떡!', notes: ['E5', 'G5', 'A5', 'G5', 'C6', 'C6', 'C6'] },
];
export const isSyl = (ch) => /[가-힣]/.test(ch);
export const sylCount = (text) => [...text].filter(isSyl).length;
/** 박자(beat, 0부터) → { line, syl } : 지금 부르는 줄과 글자 번호 */
export function lyricAt(beat) {
  const line = Math.floor(beat / 8) % SONG_LINES.length;
  const syl = Math.floor((beat % 8) * 2);
  return { line, syl };
}

// Suno 음원 〈가래떡 댄스〉의 전체 가사 (교사가 [가사 타이밍 맞추기]에서 고칠 수 있음)
export const FULL_LYRICS = `[Intro]
(떡! 떡! 떡! 떡!)
가래떡 댄스 시작!
[Verse 1]
황금빛 들판에 벼가 춤을 춰
농부님 땀방울 반짝반짝 빛나
하얀 쌀 모아서 길게 길게 뽑아
오늘은 십일월 십일일 가래떡 데이!
[Pre-Chorus]
준비됐니? 하나 둘 셋!
모두 함께 따라 해!
[Chorus]
쭉쭉 늘려 가래떡!
톡톡 잘라 가래떡!
왼쪽 오른쪽 흔들흔들
오늘은 우리가 떡 챔피언!
손을 번쩍, 어깨 들썩!
리듬 따라 떡떡떡!
[Verse 2]
청팀도 백팀도 손을 맞잡고
쿵짝쿵짝 박자에 몸을 맡겨
고마운 마음을 노래에 담아
우리 쌀 최고야 엄지 척 척!
[Pre-Chorus]
준비됐니? 하나 둘 셋!
더 크게 따라 해!
[Chorus]
쭉쭉 늘려 가래떡!
톡톡 잘라 가래떡!
왼쪽 오른쪽 흔들흔들
오늘은 우리가 떡 챔피언!
손을 번쩍, 어깨 들썩!
리듬 따라 떡떡떡!
[Bridge]
(떡! 떡!) 양팔을 쭉 벌리고
(떡! 떡!) 하늘 높이 번쩍!
[Final Chorus]
쭉쭉 늘려 가래떡!
톡톡 잘라 가래떡!
왼쪽 오른쪽 흔들흔들
오늘은 우리가 떡 챔피언!
손을 번쩍, 어깨 들썩!
리듬 따라 떡떡떡!
[Outro]
떡떡떡! 가래떡!`;

/** 가사 줄 목록(구간 표시 [..] 제외) */
export function lyricLines(text = FULL_LYRICS) {
  return text.split('\n').map((s) => s.trim()).filter((s) => s && !/^\[.*\]$/.test(s));
}
/** 타이밍 [{t, text}] 에서 현재 줄 번호 (-1: 아직 시작 전) */
export function lineAtTime(timing, t) {
  let k = -1;
  for (let i = 0; i < timing.length; i++) if (timing[i].t <= t) k = i; else break;
  return k;
}
