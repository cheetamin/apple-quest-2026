// 12라운드: 가래떡 이어달리기 결승전 — 팀원 전원이 차례로 제자리 달리기
import { h, $, $$, onTap, esc, fmtTime, countdown } from '../ui.js';
import { audio } from '../core/audio.js';
import { motion } from '../core/motion.js';
import { StepDetector } from '../core/gestures.js';
import { relaySetup, runSpeed, RELAY } from '../core/scoring.js';
import { drawCharacter } from '../core/character.js';
import { band, label } from '../rounds/common.js';
import { bindKeys } from './physical.js';
import { swapPlayers } from './intro.js';

const REF_SPEED = 1; // 표준 속도(칸/초)
const LEG_CAP = 1.25; // 한 구간에서 낼 수 있는 최대 거리(균등 몫의 배수) — 과격한 질주 방지, 꾸준한 참여 중시

export function relayParams(app) {
  const g = app.game, s = g.settings, tot = app.totals();
  const L = g.legs.length;
  const setup = relaySetup({ blueTotal: tot.blue, whiteTotal: tot.white, legs: L, legSeconds: s.relaySec, refSpeed: REF_SPEED });
  const share = setup.trackLength / L;
  return { ...setup, L, share, cap: share * LEG_CAP, r0: [0, 1.8, 2.1, 2.3][band(s.grade)] * (s.slow ? 0.8 : 1), tot };
}

export function showIntro(app, root) {
  const g = app.game, s = g.settings;
  const P = relayParams(app);
  const lead = P.diff > 0 ? 'blue' : P.diff < 0 ? 'white' : null;
  const el = h(`<div class="screen intro-screen">
    <div class="intro-card card">
      <div class="intro-head"><span class="round-badge">ROUND 12 / 12 · 결승</span><span class="kind relay">팀원 전원 참여</span></div>
      <h1 class="ph"><span class="ico">🏃</span><span data-pixel="84">가래떡 이어달리기 결승전</span></h1>
      <div class="relay-info">
        <table class="tbl">
          <tr><th></th><th class="blue">${esc(g.teamNames.blue)}</th><th class="white">${esc(g.teamNames.white)}</th></tr>
          <tr><td>1~11라운드 누적</td><td><b>${P.tot.blue}</b>점</td><td><b>${P.tot.white}</b>점</td></tr>
          <tr><td>출발 위치 보너스</td><td>${P.start.blue ? `+${P.start.blue}칸` : '0칸'}</td><td>${P.start.white ? `+${P.start.white}칸` : '0칸'}</td></tr>
          <tr><td>달리는 학생 / 구간</td><td>${g.names.blue.length}명 / ${P.L}구간</td><td>${g.names.white.length}명 / ${P.L}구간</td></tr>
        </table>
        <ul class="rules">
          <li>트랙 길이 <b>${P.trackLength}칸</b> = ${P.L}구간 × ${s.relaySec}초 × 표준 속도 × ${RELAY.TRACK_FACTOR}</li>
          <li>출발 보너스 = 점수 차 ${Math.abs(P.diff)}점 × 0.03% × 트랙 길이 (최대 트랙의 ${RELAY.BONUS_CAP * 100}%) → ${lead ? `${esc(g.teamNames[lead])} +${P.start[lead]}칸` : '동점이라 보너스 없음'}</li>
          <li>두 팀 모두 같은 <b>${P.L}구간</b>을 달려요. 인원이 적은 팀은 몇 명이 한 번 더 달려요.</li>
          <li>팔다리를 흔드는 빠르기만큼 앞으로 가요. 한 구간 최대 거리가 정해져 있어서 무리하게 빨리 뛸 필요가 없어요.</li>
          <li>결승선을 <b>먼저 통과한 팀이 우승</b>! 통과한 뒤에도 남은 친구들은 끝까지 함께 달려요.</li>
        </ul>
      </div>
      <p class="hint">⚠️ 제자리에서만 달려요. 교대할 때는 걸어서 자리를 바꿔요. ${s.seated ? '앉아서 참여 모드: 팔 흔들기로 달려요.' : ''}</p>
      <div class="row center gap"><button class="btn big" data-a="go">결승전 시작 ▶</button></div>
    </div>
  </div>`);
  root.appendChild(el);
  audio.playSong('relay');
  onTap($('[data-a="go"]', el), () => app.go('relay'));
  return () => audio.stopSong();
}

export function show(app, root) {
  const g = app.game, s = g.settings;
  const P = relayParams(app);
  const st = {
    leg: 0, phase: 'ready', legLeft: s.relaySec, wait: 0,
    T: {
      blue: { dist: P.start.blue, legDist: 0, step: new StepDetector(), rate: 0, finishedAt: null, legsDone: 0, baton: 0 },
      white: { dist: P.start.white, legDist: 0, step: new StepDetector(), rate: 0, finishedAt: null, legsDone: 0, baton: 0 },
    },
    clock: 0, winner: null,
  };
  const el = h(`<div class="screen relay-screen">
    <header class="topbar">
      <div class="tb-title"><span class="round-badge">ROUND 12 / 12</span><span class="subj">🏃 결승 이어달리기</span></div>
      <div class="tb-name" id="legname"></div>
      <div class="tb-right"><span class="timer" id="timer">${fmtTime(s.relaySec)}</span></div>
    </header>
    <canvas id="track" width="1920" height="540"></canvas>
    <div class="relay-bottom">
      ${['blue', 'white'].map((t) => `<div class="relay-team ${t}">
        <div class="tn">${esc(g.teamNames[t])}</div>
        <div class="runner" data-runner="${t}"></div>
        <div class="meter"><i data-meter="${t}"></i></div>
        <div class="rinfo" data-info="${t}"></div>
        ${motion.alt[t] ? `<button class="btn alt-run" data-run="${t}">👟 달리기(연타)</button>` : ''}
      </div>`).join('<canvas id="rcam" width="768" height="432"></canvas>')}
    </div>
    <div class="handoff hidden" id="handoff"><div class="card"><h2>🥢 바통 터치!</h2><p id="ho-text"></p><p class="hint" id="ho-st"></p><div class="row center gap"><button class="btn small ghost" data-a="swap">👥 주자 바꾸기</button><button class="btn" data-a="force">바로 시작 ▶</button></div></div></div>
    <div class="pause-veil hidden" id="veil"><div class="card"><h2 id="veil-t"></h2><p id="veil-m"></p></div></div>
  </div>`);
  root.appendChild(el);
  const tc = $('#track', el).getContext('2d'), cc = $('#rcam', el).getContext('2d');
  const unbind = bindKeys();
  $$('[data-run]', el).forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); motion.tapAlt(b.dataset.run, 'act', 150); b.classList.add('pressed'); setTimeout(() => b.classList.remove('pressed'), 90); }));

  const runnerName = (t, leg) => g.names[t][g.legs[leg][t]];
  const updateNames = () => {
    $('#legname', el).textContent = `${st.leg + 1}번째 주자 / 전체 ${P.L}구간`;
    for (const t of ['blue', 'white']) {
      const nx = st.leg + 1 < P.L ? ` · 다음: ${esc(runnerName(t, st.leg + 1))}` : ' · 마지막 주자!';
      $(`[data-runner="${t}"]`, el).innerHTML = `🏃 <b>${esc(runnerName(t, st.leg))}</b><small>${nx}</small>`;
    }
  };

  let startReady = 0;
  const beginHandoff = (first) => {
    st.phase = 'handoff'; startReady = 0;
    motion.recalibrate();
    updateNames();
    $('#handoff', el).classList.remove('hidden');
    $('#ho-text', el).innerHTML = first
      ? `첫 번째 주자 <b class="blue-t">${esc(runnerName('blue', 0))}</b> · <b class="white-t">${esc(runnerName('white', 0))}</b> 준비!`
      : `다음 주자 <b class="blue-t">${esc(runnerName('blue', st.leg))}</b> · <b class="white-t">${esc(runnerName('white', st.leg))}</b> 자리로! (왼쪽=청, 오른쪽=백)`;
    if (!first) { audio.sfx('baton'); st.T.blue.baton = st.T.white.baton = 1; }
    audio.speak(first ? '첫 번째 주자, 준비!' : '바통 터치! 다음 주자 준비!');
  };
  const startLeg = async () => {
    if (st.phase !== 'handoff') return;
    st.phase = 'count';
    $('#handoff', el).classList.add('hidden');
    await countdown(el, 3);
    st.phase = 'run'; st.legLeft = s.relaySec;
    for (const t of ['blue', 'white']) { st.T[t].legDist = 0; st.T[t].step.reset(); }
  };
  onTap($('[data-a="force"]', el), startLeg);
  onTap($('[data-a="swap"]', el), () => swapPlayers(app, 12, st.leg, updateNames));

  const endLeg = () => {
    for (const t of ['blue', 'white']) st.T[t].legsDone++;
    st.leg++;
    if (st.leg >= P.L) { finish(); return; }
    beginHandoff(false);
  };
  const finish = () => {
    st.phase = 'done';
    const B = st.T.blue, W = st.T.white;
    let winner;
    if (B.finishedAt != null || W.finishedAt != null) {
      if (B.finishedAt != null && (W.finishedAt == null || B.finishedAt < W.finishedAt)) winner = 'blue';
      else if (W.finishedAt != null && (B.finishedAt == null || W.finishedAt < B.finishedAt)) winner = 'white';
      else winner = 'tie';
    } else winner = B.dist > W.dist ? 'blue' : W.dist > B.dist ? 'white' : 'tie';
    audio.stopSong(); audio.sfx('finish');
    const result = {
      winner, trackLength: P.trackLength, start: P.start, legs: P.L,
      dist: { blue: +B.dist.toFixed(1), white: +W.dist.toFixed(1) },
      finishedAt: { blue: B.finishedAt, white: W.finishedAt },
      byFinishLine: B.finishedAt != null || W.finishedAt != null,
    };
    setTimeout(() => app.finishGame(result), 1800);
  };

  let raf = 0, lastT = null, lostFor = 0;
  const frame = (t) => {
    raf = requestAnimationFrame(frame);
    const dt = lastT == null ? 0 : Math.min(0.05, (t - lastT) / 1000); lastT = t;
    const ms = motion.tick(t);
    motion.draw(cc, 0, 0, 768, 432, { labels: true });
    if (st.phase === 'handoff') {
      const ready = ms.blue.active && ms.white.active && !ms.overlap;
      startReady = ready ? startReady + dt : 0;
      $('#ho-st', el).textContent = ready ? `두 주자 인식 완료! ${Math.max(0, 1.5 - startReady).toFixed(1)}초 뒤 출발` : `인식 중… 청팀 ${ms.blue.active ? '✅' : '⏳'} · 백팀 ${ms.white.active ? '✅' : '⏳'}`;
      if (startReady >= 1.5) startLeg();
    }
    // 공정성: 한 팀이라도 인식이 안 되면 두 팀 모두 멈춤
    const anyLost = !ms.blue.active || !ms.white.active;
    lostFor = st.phase === 'run' && anyLost ? lostFor + dt : 0;
    const paused = app.paused || (st.phase === 'run' && lostFor > 0.6);
    const veil = $('#veil', el);
    veil.classList.toggle('hidden', !paused);
    if (paused) {
      $('#veil-t', el).textContent = app.paused ? '⏸ 일시정지' : '⚠ 주자가 보이지 않아요';
      $('#veil-m', el).textContent = app.paused ? '교사 메뉴에서 [계속하기]를 누르세요.' : `${!ms.blue.active ? '청팀' : ''}${!ms.blue.active && !ms.white.active ? '·' : ''}${!ms.white.active ? '백팀' : ''} 주자가 카메라 앞 자기 자리에 서면 이어서 달려요. 공정하게 두 팀 모두 멈춰요.`;
    }
    if (st.phase === 'run' && !paused) {
      st.clock += dt;
      st.legLeft -= dt;
      for (const tm of ['blue', 'white']) {
        const T = st.T[tm], sig = ms[tm].sig;
        let signal = null;
        if (sig) signal = !s.seated && sig.kneeSignal != null && Math.abs(sig.kneeSignal) > Math.abs(sig.armSignal || 0) * 0.5 ? sig.kneeSignal : sig.armSignal;
        T.rate = T.step.update(signal, t, s.sens);
        const v = runSpeed(T.rate, P.r0) * REF_SPEED;
        const add = Math.min(v * dt, Math.max(0, P.cap - T.legDist));
        T.legDist += add; T.dist += add;
        if (T.finishedAt == null && T.dist >= P.trackLength) {
          T.finishedAt = st.clock; audio.sfx('finish');
          if (!st.winner) { st.winner = tm; audio.speak(`${g.teamNames[tm]} 결승선 통과!`); }
        }
      }
      if (st.legLeft <= 0) endLeg();
    }
    for (const tm of ['blue', 'white']) {
      const T = st.T[tm];
      T.baton = Math.max(0, T.baton - dt);
      $(`[data-meter="${tm}"]`, el).style.width = `${Math.min(100, (T.rate / (P.r0 * 1.3)) * 100)}%`;
      $(`[data-info="${tm}"]`, el).innerHTML = `${Math.min(100, Math.round((T.dist / P.trackLength) * 100))}% 진행 · 이번 구간 ${T.legDist.toFixed(1)}/${P.cap.toFixed(1)}칸${T.finishedAt != null ? ' · 🏁 통과!' : ''}`;
    }
    $('#timer', el).textContent = fmtTime(st.phase === 'run' ? st.legLeft : s.relaySec);
    drawTrack(tc, t / 1000);
  };

  const drawTrack = (ctx, tt) => {
    const W = 1920, H = 540;
    const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#8fd3ff'); sky.addColorStop(0.35, '#cdeeff'); sky.addColorStop(0.36, '#7cc36a'); sky.addColorStop(1, '#5aa64c');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // 관중석 깃발
    for (let i = 0; i < 24; i++) { ctx.fillStyle = i % 2 ? '#2f80ed' : '#f5b301'; ctx.beginPath(); ctx.moveTo(40 + i * 80, 40); ctx.lineTo(80 + i * 80, 40); ctx.lineTo(60 + i * 80, 70); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 40); ctx.lineTo(W, 40); ctx.stroke();
    const x0 = 140, x1 = W - 160;
    const lanes = { blue: 270, white: 440 };
    for (const tm of ['blue', 'white']) {
      ctx.fillStyle = '#d9663f'; ctx.fillRect(0, lanes[tm] - 70, W, 120);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, lanes[tm] - 70); ctx.lineTo(W, lanes[tm] - 70); ctx.moveTo(0, lanes[tm] + 50); ctx.lineTo(W, lanes[tm] + 50); ctx.stroke();
    }
    // 거리 눈금
    for (const k of [0.25, 0.5, 0.75]) { const x = x0 + (x1 - x0) * k; ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x - 2, 200, 4, 300); label(ctx, `${k * 100}%`, x, 185, { size: 20, bg: 'rgba(0,0,0,0.35)' }); }
    // 출발선·결승선
    ctx.fillStyle = '#fff'; ctx.fillRect(x0 - 3, 200, 6, 300);
    for (let y = 200; y < 500; y += 20) for (let k = 0; k < 2; k++) { ctx.fillStyle = (y / 20 + k) % 2 ? '#222' : '#fff'; ctx.fillRect(x1 + k * 14, y, 14, 20); }
    ctx.fillStyle = '#e53935'; ctx.fillRect(x1 + 40, 120, 10, 380); ctx.fillRect(x1 - 30, 120, 10, 380);
    label(ctx, '🏁 결승선', x1 + 14, 105, { size: 30, bg: '#e53935' });
    for (const tm of ['blue', 'white']) {
      const T = st.T[tm];
      const k = Math.min(1, T.dist / P.trackLength);
      const x = x0 + (x1 - x0) * k;
      if (T.dist > 0 && P.start[tm] > 0) { const bx = x0 + (x1 - x0) * (P.start[tm] / P.trackLength); ctx.fillStyle = tm === 'blue' ? 'rgba(47,128,237,0.35)' : 'rgba(245,179,1,0.35)'; ctx.fillRect(x0, lanes[tm] - 66, bx - x0, 112); label(ctx, `보너스 +${P.start[tm]}`, (x0 + bx) / 2, lanes[tm] - 50, { size: 18 }); }
      const pose = T.finishedAt != null ? 'win' : st.phase === 'run' && T.rate > 0.3 ? 'run' : T.baton > 0 ? 'cheer' : 'idle';
      drawCharacter(ctx, x, lanes[tm] + 40, 150, { team: tm, pose, t: tt * (0.5 + Math.min(1.5, T.rate / P.r0)), prop: 'baton' });
      label(ctx, runnerName(tm, Math.min(st.leg, P.L - 1)), x, lanes[tm] + 62, { size: 20, bg: tm === 'blue' ? '#2f80ed' : '#c98a00' });
    }
    if (st.winner) label(ctx, `🏆 ${g.teamNames[st.winner]} 결승선 1등 통과!`, W / 2, 120, { size: 44, bg: 'rgba(40,25,10,0.8)', color: '#fff7c2' });
  };

  raf = requestAnimationFrame(frame);
  audio.playSong('relay');
  beginHandoff(true);
  return () => { cancelAnimationFrame(raf); unbind(); audio.stopSong(); };
}
