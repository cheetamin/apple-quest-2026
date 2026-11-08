// 카메라 연결 및 2인 보정
import { h, $, $$, onTap, esc, toast } from '../ui.js';
import { motion, CAMERA_ERRORS } from '../core/motion.js';
import { audio } from '../core/audio.js';

export function show(app, root) {
  const s = app.settings;
  const el = h(`<div class="screen camera-screen">
    <div class="screen-title"><button class="btn small ghost" data-a="back">← 설정</button><h2 data-pixel="60">카메라 연결 · 2인 보정</h2><span></span></div>
    <div class="cam-layout">
      <div class="cam-view card"><canvas width="1280" height="720"></canvas>
        <div class="cam-tags"><span class="tag blue">← 청팀 자리 (화면 왼쪽)</span><span class="tag white">백팀 자리 (화면 오른쪽) →</span></div>
      </div>
      <div class="cam-side card">
        <div class="cam-btns">
          <select class="txt" id="cam-sel"><option value="">기본 카메라</option></select>
          <button class="btn" data-a="connect">📷 카메라 1대 연결</button>
          <div class="row gap"><button class="btn small ghost" data-a="sim">🧪 시뮬레이션 점검</button><button class="btn small ghost" data-a="nocam">🖐 카메라 없이(대체 입력)</button></div>
        </div>
        <ul class="checks">
          <li data-c="cam">카메라 연결</li>
          <li data-c="model">자세 인식 모델 준비</li>
          <li data-c="blue">청팀 학생 인식</li>
          <li data-c="white">백팀 학생 인식</li>
          <li data-c="pos">카메라 위치·거리</li>
          <li data-c="light">조명·화질</li>
          <li data-c="ready">두 학생 모두 준비 완료</li>
        </ul>
        <div class="cam-msg" id="cam-msg">두 학생이 카메라 앞에 나란히 서 주세요. 서로 <b>두 팔 간격(약 1.5m) 이상</b>, 카메라에서 <b>2~3m</b> 떨어지면 좋아요.</div>
        <div class="row gap"><button class="btn small ghost" data-a="lr">🙋 좌우 팔 확인</button><button class="btn small ghost" data-a="recal">🔄 다시 보정</button></div>
        <div class="row"><label class="tog"><input type="checkbox" id="mir" ${s.mirror ? 'checked' : ''}><span></span>거울 모드</label><span class="diag" id="diag"></span></div>
        <button class="btn big" data-a="start" disabled>시작하기 ▶</button>
      </div>
    </div>
  </div>`);
  root.appendChild(el);
  const cv = $('canvas', el), ctx = cv.getContext('2d');
  const msg = $('#cam-msg', el);
  const setC = (k, state, text) => { const li = $(`[data-c="${k}"]`, el); li.className = state; if (text != null) li.dataset.note = text; };
  let stableSince = null, lrCheck = null, raf = 0, startedAt = performance.now();
  const startBtn = $('[data-a="start"]', el);

  motion.listCameras().then((list) => {
    const sel = $('#cam-sel', el);
    list.forEach((d, i) => sel.appendChild(h(`<option value="${esc(d.deviceId)}">${esc(d.label || '카메라 ' + (i + 1))}</option>`)));
  });

  const showErr = (e) => {
    const text = CAMERA_ERRORS[e.code] || CAMERA_ERRORS[e.name] || `오류: ${e.message || e}`;
    msg.innerHTML = `<b class="err">⚠ ${esc(text)}</b>`;
  };

  const connect = async () => {
    audio.unlock();
    setC('cam', 'wait', '연결 중…'); msg.textContent = '카메라를 연결하고 있어요… 브라우저가 권한을 물으면 "허용"을 눌러 주세요.';
    try {
      const info = await motion.startCamera($('#cam-sel', el).value || undefined);
      setC('cam', 'ok', `${info.width}×${info.height}`);
      if (info.width < 640) setC('light', 'warn', '해상도가 낮아요(640×480 이상 권장)');
    } catch (e) { setC('cam', 'bad', '실패'); showErr(e); return; }
    setC('model', 'wait', '불러오는 중… (처음 한 번은 수십 초 걸릴 수 있어요)');
    try {
      const r = await motion.loadModel(s.model);
      setC('model', r.delegate === 'GPU' ? 'ok' : 'warn', r.delegate === 'GPU' ? 'GPU 가속' : 'CPU 모드(느릴 수 있음)');
      msg.innerHTML = '두 학생이 화면 왼쪽(청팀)과 오른쪽(백팀)에 나란히 서 주세요.';
    } catch (e) { setC('model', 'bad', '실패'); showErr({ code: 'MODEL' }); return; }
    app.applySettings(); startedAt = performance.now();
  };

  const act = {
    back: () => app.go('settings'),
    connect,
    sim: () => { motion.startSim(); app.applySettings(); setC('cam', 'ok', '시뮬레이션'); setC('model', 'ok', '가상 학생'); msg.innerHTML = '가상 학생 2명으로 전체 흐름을 점검해요. 키보드: 청팀 Q W E R T / A D / S, 백팀 U I O P Y / J L / K'; },
    nocam: () => {
      motion.stopCamera(); motion.mode = 'none'; app.applySettings();
      setC('cam', 'warn', '사용 안 함'); setC('model', 'warn', '사용 안 함');
      msg.innerHTML = '<b>카메라 없이 진행해요.</b> 신체 게임은 교사가 화면 버튼으로 학생 동작을 대신 입력해요(대체 입력). 카메라 동작 인식은 사용되지 않아요.';
      startBtn.disabled = false;
    },
    recal: () => { motion.recalibrate(); stableSince = null; toast('다시 보정해요. 두 학생이 좌우로 떨어져 서 주세요.'); },
    lr: () => { lrCheck = { t: performance.now(), seen: { blue: null, white: null } }; audio.speak('두 학생 모두 왼팔을 들어 주세요.'); msg.innerHTML = '🙋 <b>두 학생 모두 자기 왼팔(청가래떡 팔)을 들어 주세요.</b>'; },
    start: () => {
      if (startBtn.disabled) return; audio.unlock();
      const g = app.game, fresh = g && g.cur.r === 0 && g.cur.m === 0 && !g.results.some((x) => x.matches.some(Boolean));
      if (fresh && app.settings.story !== false && !g.storyShown) app.go('story', { then: 'start' }); else app.startCurrent();
    },
  };
  $$('[data-a]', el).forEach((b) => onTap(b, () => act[b.dataset.a]()));
  $('#mir', el).addEventListener('change', (e) => { s.mirror = e.target.checked; app.saveSettings(); motion.recalibrate(); });

  let lastBright = 0, bright = null;
  const loop = (t) => {
    raf = requestAnimationFrame(loop);
    const st = motion.tick(t);
    motion.draw(ctx, 0, 0, 1280, 720);
    if (motion.mode === 'none') return;
    if (motion.mode === 'camera' && !motion.landmarker) return;
    for (const team of ['blue', 'white']) {
      const ss = st[team];
      if (ss.status === 'alt') setC(team, 'ok', '대체 입력');
      else if (ss.active) setC(team, ss.quality > 0.7 ? 'ok' : 'warn', `인식 완료 · 신뢰도 ${Math.round(ss.quality * 100)}%`);
      else if (!st.calibrated && st.count === 1) setC(team, 'wait', '한 명만 보여요');
      else setC(team, 'wait', ss.status === 'overlap' ? '너무 가까워요' : '찾는 중');
    }
    // 위치·거리
    const sigs = ['blue', 'white'].map((tm) => st[tm].sig).filter((x) => x && !x.alt);
    if (sigs.length) {
      const tor = Math.min(...sigs.map((x) => x.torso));
      const legs = sigs.every((x) => x.legsVisible);
      if (tor < 0.11) setC('pos', 'warn', '조금 더 가까이 와 주세요');
      else if (tor > 0.36) setC('pos', 'warn', '조금 뒤로 물러나 주세요');
      else if (!legs && !s.seated) setC('pos', 'warn', '상체는 OK · 이어달리기는 무릎·발목까지 보이면 더 정확해요');
      else setC('pos', 'ok', '카메라 위치 적절');
    }
    if (t - lastBright > 1000) {
      lastBright = t; bright = motion.brightness();
      const notes = [];
      let state = 'ok';
      if (bright != null && bright < 60) { state = 'warn'; notes.push('어두워요 — 조명을 켜 주세요'); }
      if (bright != null && bright > 215) { state = 'warn'; notes.push('너무 밝아요 — 창문 역광을 피해 주세요'); }
      if (t - startedAt > 3000 && motion.fps < 12 && motion.mode === 'camera') { state = 'warn'; notes.push(`인식 속도 ${motion.fps}fps — 성능이 부족해요(설정에서 lite 모델 사용)`); }
      setC('light', state, notes.join(' · ') || '양호');
      $('#diag', el).textContent = `${motion.mode === 'camera' ? '카메라' : '시뮬레이션'} · ${motion.fps}fps${motion.inferMs ? ` · 추론 ${motion.inferMs.toFixed(0)}ms` : ''}${bright != null ? ` · 밝기 ${bright.toFixed(0)}` : ''}`;
    }
    // 좌우 팔 확인 (카메라가 이미 좌우 반전된 영상을 줄 때 자동 교정)
    if (lrCheck) {
      for (const tm of ['blue', 'white']) {
        const sg = st[tm].sig;
        if (sg && !sg.alt && sg.leftUp !== sg.rightUp) lrCheck.seen[tm] = sg.leftUp ? 'L' : 'R';
      }
      const seen = Object.values(lrCheck.seen);
      if (seen.every(Boolean) || t - lrCheck.t > 7000) {
        if (seen.every((x) => x === 'R')) { s.swapLR = !s.swapLR; app.saveSettings(); msg.innerHTML = '✅ 카메라 영상의 좌우가 반대로 들어와 <b>자동으로 교정</b>했어요. 다시 한 번 확인해 보세요.'; }
        else if (seen.every((x) => x === 'L')) msg.innerHTML = '✅ 좌우 팔 인식이 정확해요!';
        else msg.innerHTML = '두 학생 중 한 명만 확인됐어요. 다시 [좌우 팔 확인]을 눌러 주세요.';
        lrCheck = null;
      }
    }
    const both = st.blue.active && st.white.active && !st.overlap;
    if (both) { if (!stableSince) stableSince = t; } else stableSince = null;
    const ready = stableSince && t - stableSince > 1500;
    setC('ready', ready ? 'ok' : 'wait', ready ? '두 학생 모두 준비 완료!' : '두 학생이 1.5초 동안 안정적으로 보여야 해요');
    if (ready && startBtn.disabled) { startBtn.disabled = false; audio.sfx('correct'); }
  };
  raf = requestAnimationFrame(loop);
  if (motion.mode === 'camera' && motion.landmarker) { setC('cam', 'ok'); setC('model', 'ok'); }
  else if (motion.mode === 'sim') act.sim();
  return () => cancelAnimationFrame(raf);
}
