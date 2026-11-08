// 라운드 결과
import { h, $, $$, onTap, esc, mountChars, confetti } from '../ui.js';
import { audio } from '../core/audio.js';
import { ROUNDS, ROUND_PRAISE } from '../rounds/defs.js';

export function show(app, root, { r, m }) {
  const def = ROUNDS[r];
  const g = app.game;
  const res = g.results[r].matches[m] || { blue: 0, white: 0 };
  const nMatches = g.plan.rounds[r].length;
  const roundAvg = app.roundScore(r);
  const tot = app.totals();
  const win = res.blue > res.white ? 'blue' : res.white > res.blue ? 'white' : 'tie';
  const praise = ROUND_PRAISE[(r + m) % ROUND_PRAISE.length];
  const isLast = r === 10 && m === nMatches - 1;
  const fracNote = (t) => (res.activeFrac && res.activeFrac[t] < 0.95 && res.activeFrac[t] > 0 ? `<small class="note">인식된 시간 ${Math.round(res.activeFrac[t] * 100)}% 기준으로 공정하게 채점했어요</small>` : '');
  const el = h(`<div class="screen result-screen">
    <div class="card result-card">
      <div class="intro-head"><span class="round-badge">ROUND ${def.no} / 12 결과</span>${nMatches > 1 ? `<span class="chip">경기 ${m + 1}/${nMatches}</span>` : ''}</div>
      <h1 class="ph"><span class="ico">${def.icon}</span><span data-pixel="72">${esc(def.name)}</span></h1>
      <div class="res-row">
        ${['blue', 'white'].map((t) => `<div class="res-team ${t} ${win === t ? 'win' : ''}">
          <canvas data-char="${t}" data-pose="${win === t ? 'win' : win === 'tie' ? 'cheer' : 'clap'}" width="220" height="260"></canvas>
          <div class="tn">${esc(g.teamNames[t])}</div>
          <div class="big-score"><b data-score="${t}">${res[t]}</b><small>점</small></div>
          ${res.detail ? `<div class="detail">${esc(res.detail[t])}</div>` : ''}
          ${fracNote(t)}
          ${nMatches > 1 ? `<div class="detail">이 라운드 평균 ${roundAvg[t]}점</div>` : ''}
          <div class="total">누적 <b>${tot[t]}</b>점</div>
          <div class="fix hidden"><button data-fix="${t}:-5">−5</button><button data-fix="${t}:-1">−1</button><button data-fix="${t}:1">+1</button><button data-fix="${t}:5">+5</button></div>
        </div>`).join('<div class="vs">VS</div>')}
      </div>
      <div class="res-msg">${res.skipped ? '이 경기는 건너뛰었어요 (두 팀 모두 0점).' : win === 'tie' ? '무승부! ' + praise : `🎉 ${esc(g.teamNames[win])} 승리! ${praise}`}</div>
      <div class="row center gap">
        <button class="btn small ghost" data-a="fix">✏️ 점수 수정(교사)</button>
        <button class="btn small ghost" data-a="retry">🔁 다시 하기</button>
        <button class="btn big" data-a="next">${isLast ? '🏃 결승 이어달리기로!' : '다음 ▶'}</button>
      </div>
    </div>
  </div>`);
  root.appendChild(el);
  mountChars(el);
  if (win !== 'tie' && !res.skipped) { audio.sfx('win'); confetti(el, 1500); }
  const act = {
    next: () => app.next(),
    retry: () => app.go('intro', { r, m }),
    fix: () => $$('.fix', el).forEach((f) => f.classList.toggle('hidden')),
  };
  $$('[data-a]', el).forEach((b) => onTap(b, () => act[b.dataset.a]()));
  $$('[data-fix]', el).forEach((b) => onTap(b, () => {
    const [t, d] = b.dataset.fix.split(':');
    res[t] = Math.max(0, Math.min(100, res[t] + +d));
    res.manual = true;
    g.results[r].matches[m] = res; app.saveGame();
    $(`[data-score="${t}"]`, el).textContent = res[t];
    $$('.total b', el).forEach((x, i) => { x.textContent = app.totals()[i === 0 ? 'blue' : 'white']; });
  }));
}
