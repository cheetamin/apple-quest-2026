// 카메라 1대 → MediaPipe Pose(최대 2명) → 2인 추적기 → 팀별 동작 신호
// + 시뮬레이션(카메라 없이 점검) + 대체 입력(교사 터치/키보드)
import { CONFIG } from '../config.js';
import { toPoints, bodySignals } from './body.js';
import { TwoPersonTracker } from './tracker.js';
import { synthPose, makeRng } from './simpose.js';

const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];
export const TEAM_HEX = { blue: '#2f80ed', white: '#f5b301' };

export const CAMERA_ERRORS = {
  HTTPS_REQUIRED: '카메라는 보안 연결(https:// 또는 localhost)에서만 사용할 수 있어요. GitHub Pages 주소(https)로 접속하거나 로컬 서버(localhost)로 실행해 주세요.',
  NO_API: '이 브라우저는 카메라 기능을 지원하지 않아요. 최신 Chrome 또는 Edge를 사용해 주세요.',
  NotAllowedError: '카메라 사용이 막혀 있어요.',
  NotFoundError: '연결된 카메라를 찾지 못했어요.',
  NotReadableError: '카메라를 켤 수 없어요. 다른 프로그램이 카메라를 쓰고 있거나 윈도우 설정에서 막혀 있을 수 있어요.',
  OverconstrainedError: '선택한 카메라 설정을 사용할 수 없어요. 다른 카메라를 선택해 주세요.',
  NO_FRAMES: '카메라는 연결됐지만 화면이 들어오지 않아요.',
  SecurityError: '이 화면(또는 학교 PC 관리 정책)에서 카메라 사용이 막혀 있어요.',
  AbortError: '카메라를 켜는 도중에 멈췄어요. 잠시 후 다시 시도해 주세요.',
  MODEL: '자세 인식 모델을 불러오지 못했어요.',
  GPU: '그래픽 가속(WebGL)을 사용할 수 없어 CPU 모드로 실행 중이에요. 인식 속도가 느릴 수 있어요.',
};

// 상대 경로는 페이지(index.html) 기준으로 바꾼다 — import()는 이 파일 기준으로 풀리기 때문
const abs = (u) => { try { return new URL(u, document.baseURI).href; } catch { return u; } };

async function firstOk(urls, test) {
  let lastErr;
  for (const u of urls) {
    try { return await test(u); } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('all failed');
}
async function exists(url) {
  if (/^https?:/.test(url)) return url;
  const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
  if (!r.ok) throw new Error('missing ' + url);
  return url;
}

/** 교사 터치·키보드로 만드는 가상 동작 신호 (운동이 어려운 학생 / 카메라 오류 시 대체) */
class AltPad {
  constructor() { this.held = { blue: new Set(), white: new Set() }; this.lastAct = { blue: -1e9, white: -1e9 }; this.stepSign = { blue: 1, white: 1 }; this.pulse = { blue: {}, white: {} }; }
  down(team, a, t) {
    this.held[team].add(a);
    if (a === 'act') { this.lastAct[team] = t; this.stepSign[team] *= -1; }
  }
  up(team, a) { this.held[team].delete(a); }
  tap(team, a, t, ms = 1200) { this.pulse[team][a] = t + ms; if (a === 'act') { this.lastAct[team] = t; this.stepSign[team] *= -1; } }
  signals(team, t) {
    const has = (a) => this.held[team].has(a) || (this.pulse[team][a] || 0) > t;
    const dt = t - this.lastAct[team];
    const lane = has('left') ? -1 : has('right') ? 1 : 0;
    return {
      alt: true,
      leftUp: has('L') || has('O'), rightUp: has('R') || has('O'), bothUp: has('O'), crossed: has('X'), wide: has('W'),
      handHeight: dt < 140 ? 1 : dt < 340 ? -1 : 0,
      armSignal: dt < 600 ? this.stepSign[team] * 0.5 : null, kneeSignal: null,
      lean: lane * 0.5, laneOverride: lane, sway: lane,
      handL: null, handR: null, legsVisible: true, quality: 1,
      center: null, shW: 1, torso: 1,
    };
  }
}

/** 카메라 없이 전체 흐름을 점검하는 가상 학생 2명 (같은 추적·채점 코드를 그대로 통과) */
class SimPeople {
  constructor() {
    this.rng = makeRng(42);
    this.p = {
      blue: { dx: 0.3, height: 0.8, held: new Set(), act: -1e9, stepT: 0 },
      white: { dx: 0.7, height: 0.66, held: new Set(), act: -1e9, stepT: 0 },
    };
    this.hidden = { blue: false, white: false };
  }
  set(team, a, down, t) {
    const P = this.p[team];
    if (down) {
      P.held.add(a);
      if (a === 'act') P.act = t;
      if (a === 'left') P.dx = Math.max(0.08, P.dx - 0.07);
      if (a === 'right') P.dx = Math.min(0.92, P.dx + 0.07);
      if (a === 'hide') this.hidden[team] = !this.hidden[team];
    } else P.held.delete(a);
  }
  poses(t, mirror) {
    const out = [];
    for (const team of ['blue', 'white']) {
      if (this.hidden[team]) continue;
      const P = this.p[team], has = (a) => P.held.has(a);
      let lArm = 'down', rArm = 'down', step = 0;
      if (has('L')) lArm = 'up';
      if (has('R')) rArm = 'up';
      if (has('O')) { lArm = rArm = 'up'; }
      if (has('X')) { lArm = rArm = 'cross'; }
      if (has('W')) { lArm = rArm = 'wide'; }
      const da = t - P.act;
      if (da < 220) { lArm = rArm = 'up'; } else if (da < 450) { lArm = rArm = 'side'; }
      if (has('run')) { const ph = Math.sin(t / 1000 * Math.PI * 3); step = ph; lArm = ph > 0 ? 'chest' : 'down'; rArm = ph > 0 ? 'down' : 'chest'; }
      // 화면(거울) 기준 위치 → 원본 카메라 좌표
      const cx = mirror ? 1 - P.dx : P.dx;
      out.push(synthPose({ cx, height: P.height, lArm, rArm, step, rng: this.rng, lean: has('sway') ? (P.dx < 0.5 ? -1 : 1) : 0 }));
    }
    // MediaPipe 처럼 탐지 순서는 보장되지 않음
    if (out.length === 2 && this.rng() < 0.5) out.reverse();
    return out;
  }
}

export class MotionHub {
  constructor() {
    this.video = document.createElement('video');
    this.video.playsInline = true; this.video.muted = true; this.video.autoplay = true;
    this.tracker = new TwoPersonTracker();
    this.mode = 'none';
    this.landmarker = null;
    this.settings = { mirror: true, swapLR: false, sens: 1, seated: false };
    this.alt = { blue: false, white: false };
    this.altPad = new AltPad();
    this.sim = new SimPeople();
    this.lastPoses = []; this.lastVideoTime = -1;
    this.frames = []; this.fps = 0; this.inferMs = 0;
    this.warnings = []; this.diag = {};
    this.state = this._emptyState();
    this.aspect = 16 / 9;
    this.stream = null;
  }
  _emptyState() {
    const e = () => ({ status: 'lost', active: false, sig: null, pts: null, quality: 0 });
    return { blue: e(), white: e(), overlap: false, count: 0, calibrated: false };
  }

  async listCameras() {
    try { return (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput'); } catch { return []; }
  }

  /** 적외선(얼굴 인식용)·가상 카메라는 뒤로 미룬다 */
  static rankCamera(d) {
    const l = (d.label || '').toLowerCase();
    if (/\bir\b|infrared|적외선|hello/.test(l)) return 3;
    if (/virtual|obs|snap|manycam|xsplit|broadcast|droidcam|ndi|가상/.test(l)) return 2;
    return 0;
  }

  async _open(video) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video });
    try {
      this.video.srcObject = stream;
      this.video.muted = true; this.video.playsInline = true;
      await this.video.play().catch(() => {});
      // 실제 화면이 들어오는지 확인 (일부 카메라는 연결만 되고 영상이 안 옴)
      const ok = await new Promise((res) => {
        const t0 = performance.now();
        const chk = () => {
          if (this.video.videoWidth > 0 && this.video.readyState >= 2) return res(true);
          if (performance.now() - t0 > 6000) return res(false);
          setTimeout(chk, 100);
        };
        chk();
      });
      if (!ok) throw Object.assign(new Error('no frames'), { name: 'NO_FRAMES' });
      return stream;
    } catch (e) { stream.getTracks().forEach((t) => t.stop()); this.video.srcObject = null; throw e; }
  }

  async startCamera(deviceId) {
    this.diag.steps = [];
    const note = (x) => { this.diag.steps.push(x); };
    if (!window.isSecureContext) throw Object.assign(new Error('https'), { code: 'HTTPS_REQUIRED' });
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error('api'), { code: 'NO_API' });
    this.stopCamera();
    const base = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } };
    // 1) 고른 카메라(또는 기본) → 2) 해상도 조건 없이 → 3) 아무 카메라나 → 4) 목록의 다른 카메라
    const tries = [];
    if (deviceId) { tries.push({ deviceId: { exact: deviceId }, ...base }, { deviceId: { exact: deviceId } }); }
    tries.push(base, true);
    let lastErr = null;
    const tryOne = async (v, label) => {
      try { this.stream = await this._open(v); note(`✔ ${label}`); return true; }
      catch (e) { lastErr = e; note(`✘ ${label}: ${e.name || ''} ${e.message || ''}`.trim()); if (e.name === 'NotAllowedError' || e.name === 'SecurityError') throw e; return false; }
    };
    try {
      let ok = false;
      for (let i = 0; i < tries.length && !ok; i++) ok = await tryOne(tries[i], i === tries.length - 1 ? '기본 설정' : (deviceId ? `선택 카메라 #${i + 1}` : '권장 해상도'));
      if (!ok) {
        const list = (await this.listCameras()).filter((d) => d.deviceId && d.deviceId !== deviceId)
          .sort((a, b) => MotionHub.rankCamera(a) - MotionHub.rankCamera(b));
        for (const d of list) { if (await tryOne({ deviceId: { exact: d.deviceId } }, `다른 카메라: ${d.label || d.deviceId.slice(0, 6)}`)) { ok = true; break; } }
      }
      if (!ok) throw lastErr || Object.assign(new Error('camera'), { name: 'NotFoundError' });
    } catch (e) {
      this.diag.camError = `${e && e.name}: ${e && e.message}`;
      // DOMException 은 code 속성을 바꿀 수 없으므로 새 오류로 감싼다
      const err = new Error((e && e.message) || 'camera'); err.name = (e && e.name) || 'Error'; err.code = err.name; err.cause = e;
      throw err;
    }
    this.aspect = this.video.videoWidth / this.video.videoHeight || 16 / 9;
    this.mode = 'camera';
    this.tracker.reset();
    const tr = this.stream.getVideoTracks()[0];
    this.trackLabel = tr ? tr.label : '';
    this.deviceId = tr && tr.getSettings ? tr.getSettings().deviceId : deviceId;
    this.diag.camera = `${this.trackLabel || '(이름 없음)'} ${this.video.videoWidth}×${this.video.videoHeight}`;
    this.diag.camError = '';
    return { width: this.video.videoWidth, height: this.video.videoHeight, label: this.trackLabel, deviceId: this.deviceId };
  }
  stopCamera() {
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  async loadModel(variant = 'lite') {
    if (this.landmarker && this.modelVariant === variant) return { delegate: this.delegate };
    const log = (x) => { (this.diag.model = this.diag.model || []).push(x); };
    this.diag.model = [];
    const fail = (e) => { this.diag.modelError = `${e && e.name || ''} ${e && e.message || e}`.trim(); const err = new Error((e && e.message) || 'model'); err.code = 'MODEL'; err.cause = e; throw err; };
    let vision, wasm;
    try { vision = await firstOk(CONFIG.visionBundle, async (u) => { try { const m = await import(/* @vite-ignore */ abs(u)); log(`✔ 엔진 ${u}`); return m; } catch (e) { log(`✘ 엔진 ${u}`); throw e; } }); } catch (e) { fail(e); }
    try { wasm = await firstOk(CONFIG.wasmBase, async (u) => { try { await exists(u + '/vision_wasm_internal.js'); log(`✔ wasm ${u}`); return abs(u); } catch (e) { log(`✘ wasm ${u}`); throw e; } }); } catch (e) { fail(e); }
    const fileset = await vision.FilesetResolver.forVisionTasks(wasm).catch(fail);
    const make = (model, delegate) => vision.PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: model, delegate },
      runningMode: 'VIDEO', numPoses: 2,
      minPoseDetectionConfidence: 0.4, minPosePresenceConfidence: 0.4, minTrackingConfidence: 0.4,
    });
    let lastErr = null;
    for (const model of CONFIG.models[variant] || CONFIG.models.lite) {
      if (!/^https?:/.test(model)) { try { await exists(model); } catch { log(`✘ 모델 없음 ${model}`); continue; } }
      for (const delegate of ['GPU', 'CPU']) {
        try {
          this.landmarker = await make(abs(model), delegate); this.delegate = delegate;
          if (delegate === 'CPU') this.warnings.push(CAMERA_ERRORS.GPU);
          log(`✔ 모델 ${model} (${delegate})`);
          this.modelVariant = variant; this.diag.modelError = '';
          return { delegate: this.delegate };
        } catch (e) { lastErr = e; log(`✘ 모델 ${model} (${delegate}) ${e && e.message ? e.message.slice(0, 80) : ''}`); }
      }
    }
    fail(lastErr);
  }

  /** 선생님이 복사해서 보낼 수 있는 진단 정보 */
  diagnostics() {
    const gl = (() => { try { const c = document.createElement('canvas'); return c.getContext('webgl2') ? 'WebGL2' : c.getContext('webgl') ? 'WebGL1' : '없음'; } catch { return '확인 불가'; } })();
    return [
      `[가래떡 모션 게임 진단 정보] ${new Date().toLocaleString('ko-KR')}`,
      `주소: ${location.href.split('?')[0]}`,
      `브라우저: ${navigator.userAgent}`,
      `보안 연결: ${window.isSecureContext ? '예' : '아니오'} · 카메라 API: ${navigator.mediaDevices && navigator.mediaDevices.getUserMedia ? '있음' : '없음'} · 그래픽: ${gl}`,
      `카메라: ${this.diag.camera || '연결 안 됨'}`,
      this.diag.camError ? `카메라 오류: ${this.diag.camError}` : '',
      ...(this.diag.steps || []).map((x) => `  ${x}`),
      `카메라 목록: ${(this.diag.devices || []).join(' / ') || '(없음 또는 권한 전)'}`,
      `자세 인식: ${this.landmarker ? `준비됨(${this.delegate})` : '안 됨'}${this.diag.modelError ? ` · 오류: ${this.diag.modelError}` : ''}`,
      ...(this.diag.model || []).map((x) => `  ${x}`),
      `인식 속도: ${this.fps || 0}fps`,
    ].filter(Boolean).join('\n');
  }

  startSim() { this.mode = 'sim'; this.tracker.reset(); this.aspect = 16 / 9; }

  /** 학생 교대 후 빠른 재보정(좌=청, 우=백) */
  recalibrate() { this.tracker.reset(); }

  input(team, action, down, t = performance.now()) {
    if (this.alt[team]) { if (down) this.altPad.down(team, action, t); else this.altPad.up(team, action); }
    else if (this.mode === 'sim') this.sim.set(team, action, down, t);
  }
  tapAlt(team, action, ms) { this.altPad.tap(team, action, performance.now(), ms); }

  /** 매 프레임 호출. 새 카메라 프레임이 있을 때만 추론·추적 */
  tick(t = performance.now()) {
    let poses = null;
    if (this.mode === 'camera' && this.landmarker && this.video.readyState >= 2) {
      if (this.video.currentTime !== this.lastVideoTime) {
        this.lastVideoTime = this.video.currentTime;
        const t0 = performance.now();
        try {
          const res = this.landmarker.detectForVideo(this.video, t);
          poses = res.landmarks || [];
        } catch (e) { poses = []; this.lastError = e; }
        this.inferMs = this.inferMs * 0.9 + (performance.now() - t0) * 0.1;
      }
    } else if (this.mode === 'sim') {
      if (!this._simLast || t - this._simLast > 33) { this._simLast = t; poses = this.sim.poses(t, this.settings.mirror); }
    }
    if (poses) {
      this.frames.push(t); while (this.frames.length && t - this.frames[0] > 1000) this.frames.shift();
      this.fps = this.frames.length;
      this.lastPoses = poses;
      const pl = poses.map((p) => toPoints(p, this.aspect, this.settings.mirror, this.settings.swapLR));
      const r = this.tracker.update(pl, t);
      this.state.overlap = r.overlap; this.state.count = r.count; this.state.calibrated = r.calibrated;
      for (const team of ['blue', 'white']) {
        const s = this.state[team];
        // 관절 떨림 보정(지수 평활): 같은 팀으로 연속 인식될 때만 이전 값과 섞음
        let pts = r[team].pts;
        if (pts && s.rawPrev && s.status === 'ok' && r[team].status === 'ok') {
          const A = 0.55;
          pts = pts.map((p, i) => { const q = s.rawPrev[i]; return q ? { x: q.x + (p.x - q.x) * A, y: q.y + (p.y - q.y) * A, v: Math.max(p.v, q.v * 0.9) } : p; });
        }
        s.rawPrev = pts;
        s.pts = pts; s.quality = r[team].quality; s.status = r[team].status; s.uncertain = r[team].uncertain;
        s.sig = s.pts ? bodySignals(s.pts, this.settings.sens) : null;
      }
    }
    for (const team of ['blue', 'white']) {
      const s = this.state[team];
      if (this.alt[team]) { s.status = 'alt'; s.active = true; s.sig = this.altPad.signals(team, t); s.quality = 1; }
      else s.active = s.status === 'ok' && !!s.sig;
    }
    if (this.mode === 'none') for (const team of ['blue', 'white']) if (!this.alt[team]) { this.state[team].active = false; this.state[team].status = 'lost'; }
    return this.state;
  }

  /** 영상 + 팀별 관절 오버레이 그리기. 반환: 실제 영상이 그려진 영역 */
  draw(ctx, x, y, w, h, { centerLine = true, labels = true, dim = 0 } = {}) {
    ctx.save();
    ctx.fillStyle = '#1d2a33'; ctx.fillRect(x, y, w, h);
    let vw = w, vh = w / this.aspect;
    if (vh > h) { vh = h; vw = h * this.aspect; }
    const vx = x + (w - vw) / 2, vy = y + (h - vh) / 2;
    if (this.mode === 'camera' && this.video.readyState >= 2) {
      ctx.save();
      if (this.settings.mirror) { ctx.translate(vx + vw, vy); ctx.scale(-1, 1); ctx.drawImage(this.video, 0, 0, vw, vh); }
      else ctx.drawImage(this.video, vx, vy, vw, vh);
      ctx.restore();
    } else if (this.mode === 'sim') {
      const g = ctx.createLinearGradient(0, vy, 0, vy + vh); g.addColorStop(0, '#dfeaf1'); g.addColorStop(1, '#b9cbd6');
      ctx.fillStyle = g; ctx.fillRect(vx, vy, vw, vh);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.font = '26px "Galmuri11","Do Hyeon",sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('시뮬레이션 모드 (카메라 대신 가상 학생)', vx + 20, vy + 40);
    } else {
      ctx.fillStyle = '#9fb3c0'; ctx.font = 'bold 30px "Galmuri11","Do Hyeon",sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('카메라 없음 — 대체 입력 사용 중', x + w / 2, y + h / 2);
    }
    if (dim) { ctx.fillStyle = `rgba(255,255,255,${dim})`; ctx.fillRect(vx, vy, vw, vh); }
    if (centerLine) {
      // 청·백 구역 경계: 양쪽 색 틴트 + 굵은 실선 + 구역 이름
      const mx = Math.round(vx + vw / 2);
      ctx.fillStyle = 'rgba(59,120,231,0.13)'; ctx.fillRect(vx, vy, vw / 2, vh);
      ctx.fillStyle = 'rgba(233,169,31,0.15)'; ctx.fillRect(mx, vy, vw / 2, vh);
      ctx.fillStyle = '#2a1a0e'; ctx.fillRect(mx - 7, vy, 14, vh);
      for (let y = vy; y < vy + vh; y += 28) { ctx.fillStyle = '#3b78e7'; ctx.fillRect(mx - 4, y, 4, 14); ctx.fillStyle = '#e9a91f'; ctx.fillRect(mx, y, 4, 14); ctx.fillStyle = '#fff'; ctx.fillRect(mx - 4, y + 14, 8, 14); }
      if (vh > 300) {
        ctx.font = '22px "Galmuri11","Do Hyeon",sans-serif'; ctx.textBaseline = 'middle';
        const tag = (text, x, bg, fg, align) => { const w = ctx.measureText(text).width + 24; const lx = align === 'r' ? x - w : x; ctx.fillStyle = '#2a1a0e'; ctx.fillRect(lx - 3, vy + vh - 47, w + 6, 40); ctx.fillStyle = bg; ctx.fillRect(lx, vy + vh - 44, w, 34); ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.fillText(text, lx + w / 2, vy + vh - 27); };
        tag('청팀 구역', vx + 12, '#3b78e7', '#fff', 'l');
        tag('백팀 구역', vx + vw - 12, '#e9a91f', '#2a1a0e', 'r');
        ctx.textBaseline = 'alphabetic';
      }
    }
    const map = (p) => ({ x: vx + (p.x / this.aspect) * vw, y: vy + p.y * vh });
    for (const team of ['blue', 'white']) {
      const s = this.state[team];
      if (!s.pts || s.status === 'alt') continue;
      const col = TEAM_HEX[team];
      const P = s.pts.map(map);
      const vis = (i) => s.pts[i] && s.pts[i].v > 0.5;
      ctx.lineCap = 'round';
      for (const [a, b] of BONES) {
        if (!vis(a) || !vis(b)) continue;
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 13;
        ctx.beginPath(); ctx.moveTo(P[a].x, P[a].y); ctx.lineTo(P[b].x, P[b].y); ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(P[a].x, P[a].y); ctx.lineTo(P[b].x, P[b].y); ctx.stroke();
      }
      for (const i of [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
        if (!vis(i)) continue;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(P[i].x, P[i].y, 9, 0, 6.28); ctx.fill();
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(P[i].x, P[i].y, 6, 0, 6.28); ctx.fill();
      }
      if (this.mode === 'sim' && vis(0) && vis(11) && vis(12)) {
        const r0 = Math.abs(P[11].x - P[12].x) * 0.42;
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.strokeStyle = col; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(P[0].x, P[0].y, r0, 0, 6.28); ctx.fill(); ctx.stroke();
      }
      if (labels && vis(11) && vis(12)) {
        const tx = (P[11].x + P[12].x) / 2, ty = Math.min(P[11].y, P[12].y) - (vis(0) ? Math.abs(P[11].y - P[0].y) + 70 : 120);
        const name = team === 'blue' ? '청팀' : '백팀';
        const extra = s.status === 'overlap' ? ' · 간격!' : s.uncertain ? ' · 자리 확인' : '';
        ctx.font = 'bold 30px "Galmuri11","Do Hyeon",sans-serif'; ctx.textAlign = 'center';
        const tw = ctx.measureText(name + extra).width + 30;
        ctx.fillStyle = col; roundRect(ctx, tx - tw / 2, ty - 26, tw, 44, 22); ctx.fill();
        ctx.fillStyle = team === 'blue' ? '#fff' : '#3a2400'; ctx.fillText(name + extra, tx, ty + 7);
      }
    }
    ctx.restore();
    this.drawRect = { x: vx, y: vy, w: vw, h: vh };
    return this.drawRect;
  }

  /** 화면 좌표(픽셀)로 변환된 팀의 특정 관절 */
  screenPoint(team, idx) {
    const s = this.state[team], r = this.drawRect;
    if (!s.pts || !r || !s.pts[idx]) return null;
    return { x: r.x + (s.pts[idx].x / this.aspect) * r.w, y: r.y + s.pts[idx].y * r.h, v: s.pts[idx].v };
  }

  /** 조명 밝기 추정(0~255) — 카메라 점검 화면용 */
  brightness() {
    if (this.mode !== 'camera' || this.video.readyState < 2) return null;
    const c = this._bc || (this._bc = Object.assign(document.createElement('canvas'), { width: 64, height: 36 }));
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(this.video, 0, 0, 64, 36);
    const d = x.getImageData(0, 0, 64, 36).data;
    let s = 0; for (let i = 0; i < d.length; i += 4) s += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    return s / (d.length / 4);
  }
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export const motion = new MotionHub();
