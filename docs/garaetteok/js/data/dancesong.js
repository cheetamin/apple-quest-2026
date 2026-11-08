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
