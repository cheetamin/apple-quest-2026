// 게임 시작 전: 가래떡이 들려주는 '농업인의 날' 이야기
import { h, $, $$, onTap, esc, mountChars } from '../ui.js';
import { setCharacter } from '../core/character.js';
import { audio } from '../core/audio.js';
import { drawTteok } from '../rounds/common.js';

// 사실 확인: 十+一=土(흙 토) → 土月土日 = 11월 11일, 1996년 법정기념일 지정,
// 정부는 2006년부터 쌀 소비를 늘리기 위해 같은 날을 '가래떡데이'로 알려 왔다.
export const STORY = [
  {
    pose: 'wave', art: 'hello',
    text: '안녕, 친구들! 나는 우리 쌀로 만든 가래떡이야. 혹시 11월 11일이 무슨 날인지 알고 있니?',
  },
  {
    pose: 'cheer', art: 'farm',
    text: '11월 11일은 바로 [농업인의 날]이야! 우리가 먹는 쌀, 채소, 과일을 정성껏 길러 주시는 농업인께 고마운 마음을 전하는 날이지.',
  },
  {
    pose: 'think', art: 'hanja',
    text: '왜 하필 11월 11일일까? 한자 열 십(十)과 한 일(一)을 위아래로 겹치면 흙 토(土)가 돼. 흙에서 곡식을 길러 내는 농업인을 기리려고, 흙 토가 두 번 겹치는 날로 정했대.',
  },
  {
    pose: 'success', art: 'tteok',
    text: '그리고 길쭉한 내 모습이 숫자 1을 닮아서, 이날을 [가래떡 데이]라고도 불러! 가래떡을 나눠 먹으며 우리 쌀의 소중함을 생각해 보는 거야.',
  },
  {
    pose: 'jump', art: 'go',
    text: '오늘은 청팀과 백팀이 힘을 모아 가래떡 운동회를 할 거야. 친구를 응원하고, 끝나면 다 함께 "농업인 여러분, 고맙습니다!" 하고 외쳐 보자. 준비됐지?',
  },
];

const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const rich = (s) => esc(s).replace(/\[(.+?)\]/g, '<mark>$1</mark>');
const plain = (s) => s.replace(/[[\]]/g, '');

function artHTML(kind) {
  switch (kind) {
    case 'hello':
      return `<div class="st-cal"><div class="st-cal-top">11월</div><div class="st-cal-day">11</div><div class="st-cal-q">무슨 날?</div></div>`;
    case 'farm':
      return `<div class="st-farm">
        <div class="st-crops"><span>🌾</span><span>🍚</span><span>🥬</span><span>🍎</span><span>🥕</span></div>
        <div class="st-field"></div><div class="st-thanks">고맙습니다, 농업인!</div></div>`;
    case 'hanja':
      return `<div class="st-hanja">
        <div class="st-eq"><span class="hj a">十</span><span class="op">+</span><span class="hj b">一</span><span class="op">=</span><span class="hj c">土</span></div>
        <div class="st-sub">열 십 + 한 일 = <b>흙 토</b></div>
        <div class="st-eq2"><span>土月 土日</span><span class="op">→</span><span><b>11</b>월 <b>11</b>일</span></div>
      </div>`;
    case 'tteok':
      return `<div class="st-tteok"><canvas width="520" height="360"></canvas><div class="st-sub">길쭉한 가래떡 = 숫자 1 → <b>11월 11일</b></div></div>`;
    case 'go':
      return `<div class="st-go"><canvas data-char="blue" data-pose="cheer" width="200" height="250"></canvas><div class="st-vs">VS</div><canvas data-char="white" data-pose="cheer" width="200" height="250"></canvas></div>`;
    default: return '';
  }
}

function paintTteok(c) {
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  // 세로로 세운 가래떡 4개 = "11 11"
  const xs = [60, 150, 330, 420];
  for (const x of xs) {
    ctx.save(); ctx.translate(x, 330); ctx.rotate(-Math.PI / 2);
    drawTteok(ctx, 0, 0, 300, 58);
    ctx.restore();
  }
  ctx.fillStyle = '#7a4a1a'; ctx.font = '900 44px "Noto Sans KR",sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('월', 240, 320); ctx.fillText('일', 500, 320);
}

/** params.then: 'start'(경기 시작) | 'main'(처음 화면으로) */
export function show(app, root, { then = 'start' } = {}) {
  let i = 0, typing = null, timer = null;
  const el = h(`<div class="screen story-screen">
    <div class="story-top"><span class="story-badge">📖 11월 11일 이야기</span><span class="st-dots"></span></div>
    <div class="story-art"></div>
    <div class="story-box">
      <canvas class="story-char" data-char="green" data-pose="wave" width="240" height="300"></canvas>
      <div class="story-talk"><div class="story-name">가래떡</div><p class="story-text"></p></div>
    </div>
    <div class="row center gap story-nav">
      <button class="btn ghost" data-a="prev">◀ 이전</button>
      <button class="btn ghost" data-a="replay">🔊 다시 듣기</button>
      <button class="btn big" data-a="next">다음 ▶</button>
      <button class="btn ghost" data-a="skip">건너뛰기 ⏭</button>
    </div>
  </div>`);
  root.appendChild(el);
  mountChars(el);
  const charC = $('.story-char', el), art = $('.story-art', el), txt = $('.story-text', el), dots = $('.st-dots', el), nextB = $('[data-a="next"]', el);
  audio.playSong('main');

  const finishType = () => { if (typing) { clearInterval(typing); typing = null; } txt.innerHTML = rich(STORY[i].text); };
  const say = () => { if ('speechSynthesis' in window) speechSynthesis.cancel(); audio.speak(plain(STORY[i].text), 'ko-KR', app.settings.slow ? 0.85 : 0.95); };

  const render = () => {
    const p = STORY[i];
    setCharacter(charC, { pose: p.pose });
    art.innerHTML = artHTML(p.art);
    art.classList.toggle('still', reduced());
    mountChars(art);
    const tc = $('.st-tteok canvas', art); if (tc) paintTteok(tc);
    dots.innerHTML = STORY.map((_, k) => `<i class="${k === i ? 'on' : k < i ? 'done' : ''}"></i>`).join('');
    $('[data-a="prev"]', el).disabled = i === 0;
    nextB.innerHTML = i === STORY.length - 1 ? (then === 'start' ? '게임 시작! ▶' : '처음 화면으로 ▶') : '다음 ▶';
    // 글자가 한 글자씩 나오는 레트로 대화창 (움직임 줄이기 설정이면 바로 전체 표시)
    if (typing) clearInterval(typing);
    if (reduced()) { txt.innerHTML = rich(p.text); typing = null; }
    else {
      const full = plain(p.text); let n = 0;
      txt.textContent = '';
      typing = setInterval(() => { n += 1; txt.textContent = full.slice(0, n); if (n >= full.length) finishType(); }, 32);
    }
    say();
  };

  const done = () => {
    if (typing) clearInterval(typing);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (app.game) { app.game.storyShown = true; app.saveGame(); }
    if (then === 'start') { audio.stopSong(); app.startCurrent(); } else app.go('main');
  };
  const act = {
    next: () => { if (typing) { finishType(); return; } if (i < STORY.length - 1) { i++; render(); } else done(); },
    prev: () => { if (i > 0) { i--; render(); } },
    replay: () => say(),
    skip: () => done(),
  };
  $$('[data-a]', el).forEach((b) => onTap(b, () => act[b.dataset.a]()));
  const onKey = (e) => {
    if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); act.next(); }
    else if (e.key === 'ArrowLeft') act.prev();
  };
  window.addEventListener('keydown', onKey);
  render();
  return () => { window.removeEventListener('keydown', onKey); if (typing) clearInterval(typing); clearTimeout(timer); if ('speechSynthesis' in window) speechSynthesis.cancel(); };
}
