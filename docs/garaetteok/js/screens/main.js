import { h, $, onTap, mountChars, modal, esc, confirmBox } from '../ui.js';
import { audio } from '../core/audio.js';
import { ROUNDS } from '../rounds/defs.js';
import { volumePanel } from './teacher.js';

export function show(app, root) {
  const saved = app.loadSavedGame();
  const el = h(`<div class="screen main-screen">
    <div class="main-left">
      <div class="sign-board"><span class="date" data-pixel="54" data-pc="#fff7dc,#ffe7b0,#f8d58a">11월 11일</span><span class="sub" data-pixel="32" data-pc="#fff7dc,#ffe7b0">가래떡 운동회</span></div>
      <h1 class="logo" aria-label="가래떡 모션 게임"><span class="l1" data-pixel="132" data-pc="#ffffff,#fff6e0,#ffe9bd,#f3c47a">가래떡</span><span class="l2" data-pixel="118" data-pc="#fff59a,#ffd23f,#f7a81b,#e07b00">모션 게임</span><span class="press">PRESS START</span></h1>
      <p class="edu-badge">🌾 11월 11일 농업인의 날 계기교육 프로그램</p>
      <p class="tagline">움직이고, 생각하고, 함께 배우는 학급 대항전!</p>
      <div class="main-chars">
        <canvas data-char="blue" data-pose="cheer" width="230" height="280"></canvas>
        <canvas data-char="white" data-pose="wave" data-prop="rice" width="250" height="300"></canvas>
        <canvas data-char="green" data-pose="jump" data-prop="whistle" width="210" height="260"></canvas>
      </div>
    </div>
    <div class="main-menu card">
      ${saved ? `<button class="btn big blue-btn" data-a="resume">▶ 이어하기 <small>${esc(saved.teamNames.blue)} vs ${esc(saved.teamNames.white)} · ${saved.cur.r + 1}라운드</small></button>` : ''}
      <button class="btn big" data-a="start">🎮 시작하기</button>
      <button class="btn" data-a="settings">⚙️ 교사용 설정</button>
      <button class="btn" data-a="how">📘 게임 방법</button>
      <button class="btn" data-a="story">🌾 농업인의 날 이야기</button>
      <button class="btn" data-a="records">🏆 기록 보기</button>
      <button class="btn" data-a="volume">🔊 음량 설정</button>
      <p class="hint">전자칠판 카메라 1대로 두 학생을 동시에 인식해요 · 카메라 영상은 이 기기 안에서만 처리되고 저장·전송되지 않아요.</p>
    </div>
  </div>`);
  root.appendChild(el);
  mountChars(el);
  const unlockOnce = () => { audio.unlock(); audio.playSong('main'); };
  el.addEventListener('pointerdown', unlockOnce, { once: true });
  if (audio.ctx) audio.playSong('main');

  const act = {
    resume: () => { app.resume(saved); app.go('camera', { resume: true }); },
    start: async () => {
      if (saved && !(await confirmBox('진행 중인 경기가 있어요. 새 경기를 시작할까요?', { ok: '새 경기', cancel: '취소' }))) return;
      app.go('settings', { startAfter: true });
    },
    settings: () => app.go('settings', { startAfter: true }),
    how: () => howTo(),
    story: () => app.go('story', { then: 'main' }),
    records: () => app.go('records'),
    volume: () => volumePanel(app),
  };
  el.querySelectorAll('[data-a]').forEach((b) => onTap(b, () => act[b.dataset.a]()));
}

export function howTo() {
  const rows = ROUNDS.map((r) => `<tr><td>${r.no}</td><td>${r.icon} ${esc(r.name)}</td><td><span class="kind ${r.kind}">${{ physical: '신체', brain: '두뇌', mixed: '혼합', relay: '결승' }[r.kind]}</span></td><td>${esc(r.how)}</td></tr>`).join('');
  modal(`<h2>📘 게임 방법</h2>
    <div class="scroll">
    <ol class="how-steps">
      <li><b>교사용 설정</b>에서 학년·학기·팀·학생 수·시간을 정해요.</li>
      <li><b>카메라 연결</b>: 두 학생이 카메라 앞에 나란히 서요. <b>화면 왼쪽 = 청팀, 오른쪽 = 백팀</b>이에요. 두 팔을 벌려도 닿지 않을 만큼 떨어져 서요.</li>
      <li>경기 전에 가래떡이 <b>11월 11일 농업인의 날</b> 이야기를 들려줘요.</li>
      <li>반 인원의 절반만큼(예: 24명 → 12라운드) <b>신체 게임(모션 인식)</b>과 <b>두뇌 게임(팀별 터치)</b>을 번갈아 해요. 각 라운드는 팀별 100점 만점이에요.</li>
      <li>마지막 <b>가래떡 이어달리기</b>는 팀원 모두가 차례로 제자리 달리기를 해요. 앞선 점수가 높은 팀은 조금 앞에서 출발해요(최대 트랙의 10%).</li>
      <li>결승선을 먼저 통과한 팀이 우승! 모두에게 칭찬이 기다리고 있어요.</li>
    </ol>
    <table class="tbl"><thead><tr><th>#</th><th>라운드</th><th>구분</th><th>방법</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="hint">교사는 게임 중 <b>ESC 키</b> 또는 오른쪽 위 <b>⚙</b> 버튼으로 관리 메뉴(일시정지·건너뛰기·점수 수정·학생 교대 등)를 열 수 있어요.</p>
    </div>`, { cls: 'wide' });
}
