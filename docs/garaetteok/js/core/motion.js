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
  NotAllowedError: '카메라 사용 권한이 거부되었어요. 주소창 왼쪽의 자물쇠(사이트 설정)에서 카메라를 "허용"으로 바꾼 뒤 다시 시도해 주세요.',
  NotFoundError: '연결된 카메라를 찾지 못했어요. 전자칠판 카메라가 켜져 있는지, 케이블이 연결되어 있는지 확인해 주세요.',
  NotReadableError: '카메라를 다른 프로그램(화상회의 등)이 사용 중이에요. 다른 프로그램을 닫고 다시 시도해 주세요.',
  OverconstrainedError: '선택한 카메라 설정을 사용할 수 없어요. 다른 카메라를 선택해 주세요.',
  MODEL: '자세 인식 모델을 불러오지 못했어요. 인터넷 연결을 확인하거나, 오프라인용 vendor 폴더 설치 방법(docs/OFFLINE.md)을 참고해 주세요.',
  GPU: '그래픽 가속(WebGL)을 사용할 수 없어 CPU 모드로 실행 중이에요. 인식 속도가 느릴 수 있어요.',
};

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
    this.warnings = [];
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

  async startCamera(deviceId) {
    if (!window.isSecureContext) throw Object.assign(new Error('https'), { code: 'HTTPS_REQUIRED' });
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error('api'), { code: 'NO_API' });
    this.stopCamera();
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { deviceId: deviceId ? { exact: deviceId } : undefined, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
      });
    } catch (e) { throw Object.assign(e, { code: e.name }); }
    this.video.srcObject = this.stream;
    await this.video.play().catch(() => {});
    await new Promise((r) => { if (this.video.videoWidth) r(); else this.video.onloadedmetadata = () => r(); });
    this.aspect = this.video.videoWidth / this.video.videoHeight || 16 / 9;
    this.mode = 'camera';
    this.tracker.reset();
    const tr = this.stream.getVideoTracks()[0];
    this.trackLabel = tr ? tr.label : '';
    return { width: this.video.videoWidth, height: this.video.videoHeight, label: this.trackLabel };
  }
  stopCamera() {
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  async loadModel(variant = 'lite') {
    if (this.landmarker && this.modelVariant === variant) return { delegate: this.delegate };
    const vision = await firstOk(CONFIG.visionBundle, (u) => import(/* @vite-ignore */ u)).catch((e) => { throw Object.assign(e, { code: 'MODEL' }); });
    const wasm = await firstOk(CONFIG.wasmBase, (u) => exists(u + '/vision_wasm_internal.js').then(() => u)).catch((e) => { throw Object.assign(e, { code: 'MODEL' }); });
    const model = await firstOk(CONFIG.models[variant], exists).catch((e) => { throw Object.assign(e, { code: 'MODEL' }); });
    const fileset = await vision.FilesetResolver.forVisionTasks(wasm);
    const make = (delegate) => vision.PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: model, delegate },
      runningMode: 'VIDEO', numPoses: 2,
      minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
    });
    try { this.landmarker = await make('GPU'); this.delegate = 'GPU'; }
    catch { this.landmarker = await make('CPU'); this.delegate = 'CPU'; this.warnings.push(CAMERA_ERRORS.GPU); }
    this.modelVariant = variant;
    return { delegate: this.delegate };
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
        s.pts = r[team].pts; s.quality = r[team].quality; s.status = r[team].status; s.uncertain = r[team].uncertain;
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
      ctx.setLineDash([18, 14]); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.moveTo(vx + vw / 2, vy + 8); ctx.lineTo(vx + vw / 2, vy + vh - 8); ctx.stroke(); ctx.setLineDash([]);
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
