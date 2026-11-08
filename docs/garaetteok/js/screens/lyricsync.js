// 🎤 가사 타이밍 맞추기: 노래를 들으며 각 줄이 시작될 때 버튼(또는 스페이스 키)을 누르면 노래방 자막 타이밍이 저장된다.
import { h, $, $$, onTap, esc, modal, toast, confirmBox } from '../ui.js';
import { CONFIG } from '../config.js';
import { store } from '../core/store.js';
import { audio } from '../core/audio.js';
import { FULL_LYRICS, lyricLines } from '../data/dancesong.js';

const REACTION = 0.15; // 사람이 누르는 반응 시간 보정(초)

export function lyricSync() {
  const file = CONFIG.audioFiles.dance;
  if (!file) { toast('댄스 음원 파일이 설정되어 있지 않아요.'); return; }
  audio.stopSong();
  const saved = store.get('dance_lyrics', null);
  let text = store.get('dance_lyrics_text', FULL_LYRICS);
  let lines = lyricLines(text);
  let timing = [], ptr = 0;
  const el = new Audio(file);
  const md = modal(`<h2>🎤 댄스 가사 타이밍 맞추기</h2>
    <p class="hint">① [▶ 처음부터 재생]을 누르고 ② 노래에서 <b>각 줄이 시작되는 순간</b> [이 줄 시작!] 버튼이나 <b>스페이스 키</b>를 눌러요. 노래에 없는 줄은 [건너뛰기]. 끝까지 하면 저장돼요(약 2분).</p>
    <div class="ls-wrap">
      <div class="ls-left">
        <div class="row gap"><button class="btn small" data-a="play">▶ 처음부터 재생</button><button class="btn small ghost" data-a="pause">⏸ 멈춤</button><span class="ls-time" id="ls-time">0:00.0</span></div>
        <div class="ls-now"><small>지금 누를 줄</small><b id="ls-cur"></b><small id="ls-next"></small></div>
        <div class="row gap"><button class="btn big" data-a="mark">⏎ 이 줄 시작! (스페이스)</button></div>
        <div class="row gap"><button class="btn small ghost" data-a="skip">⏭ 건너뛰기(노래에 없음)</button><button class="btn small ghost" data-a="undo">↩ 한 줄 되돌리기</button></div>
        <div class="row gap"><button class="btn small" data-a="save">💾 저장</button><button class="btn small ghost" data-a="clear">🗑 저장된 타이밍 지우기</button></div>
        <p class="hint" id="ls-status">${saved ? `저장된 타이밍이 있어요 (${saved.length}줄). 다시 하면 덮어써요.` : '아직 저장된 타이밍이 없어요. 없으면 댄스 화면에 후렴 가사 전체가 표시돼요.'}</p>
      </div>
      <div class="ls-right">
        <label class="hint">가사 (노래와 다르면 고쳐 주세요 · [구간] 표시 줄은 무시)</label>
        <textarea class="roster-big ls-text">${esc(text)}</textarea>
        <ol class="ls-list" id="ls-list"></ol>
      </div>
    </div>`, { cls: 'wide', onClose: () => { el.pause(); window.removeEventListener('keydown', key); } });
  const curEl = $('#ls-cur', md.el), nextEl = $('#ls-next', md.el), list = $('#ls-list', md.el), timeEl = $('#ls-time', md.el);
  const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
  const draw = () => {
    curEl.textContent = ptr < lines.length ? lines[ptr] : '✅ 마지막 줄까지 끝났어요! [저장]을 눌러요';
    nextEl.textContent = ptr + 1 < lines.length ? `다음: ${lines[ptr + 1]}` : '';
    list.innerHTML = lines.map((l, i) => {
      const tm = timing.find((x) => x.i === i);
      return `<li class="${i === ptr ? 'now' : ''} ${i < ptr && !tm ? 'skip' : ''}"><span>${tm ? fmt(tm.t) : i < ptr ? '건너뜀' : '—'}</span>${esc(l)}</li>`;
    }).join('');
    const now = $('li.now', list); if (now) now.scrollIntoView({ block: 'nearest' });
  };
  const mark = () => {
    if (ptr >= lines.length) return;
    if (el.paused) { toast('먼저 [▶ 처음부터 재생]을 눌러요.'); return; }
    timing.push({ i: ptr, t: Math.max(0, +(el.currentTime - REACTION).toFixed(2)), text: lines[ptr] });
    ptr++; draw();
  };
  const key = (e) => { if (e.code === 'Space' && !/TEXTAREA|INPUT/.test(e.target.tagName)) { e.preventDefault(); mark(); } };
  window.addEventListener('keydown', key);
  const iv = setInterval(() => { if (!md.el.isConnected) { clearInterval(iv); return; } timeEl.textContent = fmt(el.currentTime || 0); }, 100);
  $('.ls-text', md.el).addEventListener('change', (e) => { text = e.target.value; store.set('dance_lyrics_text', text); lines = lyricLines(text); timing = []; ptr = 0; draw(); });
  const act = {
    play: () => { audio.unlock(); timing = []; ptr = 0; el.currentTime = 0; el.play().catch(() => toast('재생할 수 없어요. 음원 파일을 확인해 주세요.')); draw(); },
    pause: () => el.pause(),
    mark,
    skip: () => { if (ptr < lines.length) { ptr++; draw(); } },
    undo: () => { if (ptr > 0) { ptr--; timing = timing.filter((x) => x.i !== ptr); draw(); } },
    save: () => {
      if (timing.length < 3) { toast('3줄 이상 표시한 뒤 저장할 수 있어요.'); return; }
      const out = timing.map(({ t, text: tx }) => ({ t, text: tx }));
      store.set('dance_lyrics', out);
      $('#ls-status', md.el).innerHTML = `✅ ${out.length}줄 저장 완료! 이 컴퓨터의 댄스 화면에 바로 적용돼요.<br>다른 기기에도 쓰려면 아래 내용을 <code>js/config.js</code>의 <code>danceLyrics</code>에 붙여 넣어요.<textarea class="roster-big" readonly style="height:90px">${esc(JSON.stringify(out))}</textarea>`;
      toast('가사 타이밍을 저장했어요.');
    },
    clear: async () => { if (await confirmBox('저장된 가사 타이밍을 지울까요?')) { store.del('dance_lyrics'); $('#ls-status', md.el).textContent = '지웠어요. 댄스 화면에는 후렴 가사 전체가 표시돼요.'; } },
  };
  $$('[data-a]', md.el).forEach((b) => onTap(b, () => act[b.dataset.a](), { sound: b.dataset.a === 'mark' ? 'tap' : 'tap' }));
  draw();
}
