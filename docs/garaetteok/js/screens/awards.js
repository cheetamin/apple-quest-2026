// 최종 시상식
import { h, $, $$, onTap, esc, mountChars, confetti, toast, confirmBox } from '../ui.js';
import { audio } from '../core/audio.js';
import { store, downloadText, toCSV } from '../core/store.js';
import { ROUNDS, PRAISE } from '../rounds/defs.js';

export function gameRecord(app) {
  const g = app.game;
  const rs = g.results.map((_, i) => { const d = app.roundDef(i); return { no: d.no, name: d.name, ...app.roundScore(i) }; });
  const tot = app.totals();
  const winner = g.relay ? g.relay.winner : 'tie';
  const mins = g.endedAt ? Math.round((new Date(g.endedAt) - new Date(g.startedAt)) / 60000) : null;
  return {
    id: g.id, date: g.startedAt, grade: g.settings.grade, sem: g.settings.sem,
    teams: g.teamNames, counts: { blue: g.names.blue.length, white: g.names.white.length },
    rounds: rs, totals: tot, relay: g.relay, winner, minutes: mins,
  };
}

export function recordsCSV(list) {
  const head = ['날짜', '학년', '학기', '청팀 이름', '백팀 이름', '청팀 인원', '백팀 인원', '일반 라운드 수'];
  const maxR = Math.max(...list.map((r) => r.rounds.length));
  for (let k = 1; k <= maxR; k++) head.push(`R${k} 게임`, `R${k} 청`, `R${k} 백`);
  head.push('일반 라운드 합계 청', '일반 라운드 합계 백', '릴레이 출발보너스 청', '릴레이 출발보너스 백', '릴레이 거리 청', '릴레이 거리 백', '우승', '경기 시간(분)');
  const rows = list.map((r) => {
    const row = [new Date(r.date).toLocaleString('ko-KR'), r.grade, r.sem === 0 ? '전체' : r.sem, r.teams.blue, r.teams.white, r.counts.blue, r.counts.white, r.rounds.length];
    for (let k = 0; k < maxR; k++) { const x = r.rounds[k]; row.push(x ? x.name : '', x ? x.blue : '', x ? x.white : ''); }
    row.push(r.totals.blue, r.totals.white, r.relay ? r.relay.start.blue : '', r.relay ? r.relay.start.white : '', r.relay ? r.relay.dist.blue : '', r.relay ? r.relay.dist.white : '');
    row.push(r.winner === 'tie' ? '공동 우승' : r.teams[r.winner], r.minutes ?? '');
    return row;
  });
  return toCSV([head, ...rows]);
}

function teamPraise(app, team) {
  const rs = app.game.results.map((_, i) => ({ d: app.roundDef(i), s: app.roundScore(i)[team], o: app.roundScore(i)[team === 'blue' ? 'white' : 'blue'] }));
  const best = rs.reduce((a, c) => (c.s > a.s ? c : a));
  const phys = rs.filter((x) => x.d.kind !== 'brain'), brain = rs.filter((x) => x.d.kind === 'brain');
  const avg = (a) => a.reduce((x, y) => x + y.s, 0) / Math.max(1, a.length);
  const wins = rs.filter((x) => x.s > x.o).length;
  const msgs = [`${best.d.icon} ${best.d.name}에서 ${best.s}점으로 가장 빛났어요!`];
  msgs.push(avg(phys) >= avg(brain) ? '몸으로 하는 게임에서 힘차게 움직였어요! 💪' : '교과 퀴즈에서 반짝이는 두뇌를 보여 줬어요! 🧠');
  if (wins > rs.length / 2) msgs.push(`${rs.length}개 라운드 중 ${wins}개 라운드에서 앞섰어요!`);
  else msgs.push('마지막까지 포기하지 않고 끝까지 달렸어요!');
  return msgs;
}

export function show(app, root) {
  const g = app.game;
  const rec = gameRecord(app);
  const w = rec.winner;
  const R = g.relay;
  const pick = PRAISE[g.id % PRAISE.length];
  const el = h(`<div class="screen awards-screen">
    <div class="award-top">
      <h1 class="ph"><span class="ico">🏆</span><span data-pixel="110">${w === 'tie' ? '공동 우승!' : `${esc(g.teamNames[w])} 우승!`}</span></h1>
      <p class="award-sub">${esc(pick)} ${R ? (R.byFinishLine ? '결승선을 먼저 통과했어요!' : '결승선에 더 가까이 달렸어요!') : ''}</p>
    </div>
    <div class="podium">
      ${['blue', 'white'].map((t) => `<div class="pod ${t} ${w === t ? 'win' : ''}">
        <canvas data-char="${t}" data-pose="${w === t || w === 'tie' ? 'win' : 'clap'}" ${w === t || w === 'tie' ? 'data-prop="trophy"' : ''} width="300" height="360"></canvas>
        <div class="tn">${esc(g.teamNames[t])}</div>
        <div class="rec">일반 라운드 <b>${rec.totals[t]}</b>점 · 릴레이 ${R ? `${Math.min(100, Math.round((R.dist[t] / R.trackLength) * 100))}%${R.finishedAt[t] != null ? ' 🏁통과' : ''}` : '-'}</div>
        <ul class="praise">${teamPraise(app, t).map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
      </div>`).join('<canvas class="ref" data-char="green" data-pose="clap" data-prop="whistle" width="220" height="280"></canvas>')}
    </div>
    <div class="award-table card"><table class="tbl small"><thead><tr><th>라운드</th>${rec.rounds.map((r) => `<th>${r.no}</th>`).join('')}<th>합계</th><th>릴레이</th></tr></thead>
      <tbody>${['blue', 'white'].map((t) => `<tr class="${t}"><td>${esc(g.teamNames[t])}</td>${rec.rounds.map((r) => `<td class="${r[t] > r[t === 'blue' ? 'white' : 'blue'] ? 'w' : ''}">${r[t]}</td>`).join('')}<td><b>${rec.totals[t]}</b></td><td>${R ? `+${R.start[t]}→${R.dist[t]}` : ''}</td></tr>`).join('')}</tbody></table>
      <p class="hint">함께 응원하고 협력한 모든 친구들에게 큰 박수! 👏 오늘 우리 쌀과 농업인의 소중함도 함께 배웠어요.</p></div>
    <div class="row center gap award-btns">
      <button class="btn" data-a="save">💾 결과 저장(CSV)</button>
      <button class="btn" data-a="again">🔁 다시 시작</button>
      <button class="btn ghost" data-a="home">🏠 처음 화면으로</button>
    </div>
  </div>`);
  root.appendChild(el);
  mountChars(el);
  audio.playSong('victory'); audio.sfx('win');
  confetti(el, 7000);
  audio.speak(w === 'tie' ? '공동 우승! 두 팀 모두 정말 훌륭했어요!' : `${g.teamNames[w]} 우승! ${pick}`);
  // 기록 보관 (개인정보 최소화: 학생 이름 제외, 팀 이름·점수만)
  const list = store.get('records', []);
  if (!list.find((x) => x.id === rec.id)) { list.unshift(rec); store.set('records', list.slice(0, 200)); }
  store.del('game');
  const act = {
    save: () => { downloadText(`가래떡모션게임_결과_${new Date().toISOString().slice(0, 10)}.csv`, recordsCSV([rec])); toast('CSV 파일을 저장했어요.'); },
    again: async () => { if (await confirmBox('같은 설정으로 새 경기를 시작할까요?')) { app.newGame(); app.go('camera'); } },
    home: () => { app.game = null; app.go('main'); },
  };
  $$('[data-a]', el).forEach((b) => onTap(b, () => act[b.dataset.a]()));
  return () => audio.stopSong();
}
