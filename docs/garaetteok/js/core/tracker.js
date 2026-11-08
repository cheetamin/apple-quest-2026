// 카메라 1대 영상에서 탐지된 최대 2명의 자세를 청팀/백팀에 지속적으로 배정하는 추적기 (순수 로직)
// - 처음엔 화면 왼쪽=청팀, 오른쪽=백팀으로 보정
// - 이후엔 "위치 연속성 + 크기 + 체형 비율" 비용으로 배정 (화면 반 자르기 아님)
// - 겹침 감지 시 두 팀 채점 일시정지, 분리되면 체형 서명으로 재확인
import { personGeometry } from './body.js';

export const TEAMS = ['blue', 'white'];

const LOST_MS = 450;          // 이 시간 이상 매칭이 없으면 '인식 안 됨'
const OVERLAP_IOU = 0.28;

function iou(a, b) {
  const ix = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
  const iy = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  const inter = ix * iy;
  const ua = (a.x1 - a.x0) * (a.y1 - a.y0) + (b.x1 - b.x0) * (b.y1 - b.y0) - inter;
  return ua > 0 ? inter / ua : 0;
}

function sigDiff(a, b) {
  if (!a || !b) return 0;
  let s = 0, n = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] == null || b[i] == null) continue;
    s += Math.abs(a[i] - b[i]) / Math.max(0.2, (a[i] + b[i]) / 2); n++;
  }
  return n ? s / n : 0;
}

function newTrack(team) {
  return {
    team, active: false, status: 'lost', lastSeen: -1e9, pos: null, vel: { x: 0, y: 0 },
    scale: null, sig: null, sigN: 0, quality: 0, det: null, uncertain: false,
  };
}

export class TwoPersonTracker {
  constructor() { this.reset(); }

  reset() {
    this.tracks = { blue: newTrack('blue'), white: newTrack('white') };
    this.calibrated = false;
    this.overlap = false;
    this.lastT = null;
    this.events = [];
  }

  /** 현재 두 명이 분리되어 보일 때 좌=청, 우=백으로 (재)보정. 성공 시 true */
  calibrateFromSides(dets) {
    const ds = dets.filter(Boolean);
    if (ds.length < 2) return false;
    ds.sort((a, b) => a.center.x - b.center.x);
    const [l, r] = ds;
    if (iou(l.bbox, r.bbox) > OVERLAP_IOU) return false;
    this._assign(this.tracks.blue, l, this.lastT ?? 0, 1);
    this._assign(this.tracks.white, r, this.lastT ?? 0, 1);
    this.tracks.blue.sig = null; this.tracks.white.sig = null;
    this.tracks.blue.sigN = this.tracks.white.sigN = 0;
    this.calibrated = true;
    return true;
  }

  _assign(tr, det, t, conf) {
    if (tr.pos && tr.lastSeen > -1e8) {
      const dt = Math.max(1, t - tr.lastSeen) / 1000;
      const vx = (det.center.x - tr.pos.x) / dt, vy = (det.center.y - tr.pos.y) / dt;
      tr.vel = { x: tr.vel.x * 0.6 + vx * 0.4, y: tr.vel.y * 0.6 + vy * 0.4 };
    }
    tr.pos = { x: det.center.x, y: det.center.y };
    tr.scale = tr.scale ? tr.scale * 0.85 + det.torso * 0.15 : det.torso;
    tr.lastSeen = t;
    tr.active = true;
    tr.det = det;
    tr.quality = tr.quality * 0.8 + 0.2 * Math.max(0, Math.min(1, det.keyVis * conf));
  }

  _learnSig(tr, det) {
    if (!det.sig) return;
    if (!tr.sig) { tr.sig = det.sig.slice(); tr.sigN = 1; return; }
    const a = Math.max(0.03, 1 / (tr.sigN + 1));
    tr.sig = tr.sig.map((v, i) => (det.sig[i] == null ? v : v == null ? det.sig[i] : v * (1 - a) + det.sig[i] * a));
    tr.sigN = Math.min(200, tr.sigN + 1);
  }

  _predict(tr, t) {
    if (!tr.pos) return null;
    const dt = Math.min(0.5, Math.max(0, (t - tr.lastSeen) / 1000));
    return { x: tr.pos.x + tr.vel.x * dt * 0.5, y: tr.pos.y + tr.vel.y * dt * 0.5 };
  }

  _cost(tr, det, t, other) {
    const p = this._predict(tr, t);
    const scale = tr.scale || det.torso;
    let c = p ? Math.hypot(det.center.x - p.x, det.center.y - p.y) / scale : 1;
    c += 0.6 * Math.abs(Math.log(det.torso / scale));
    if (tr.sigN > 15) c += 1.2 * sigDiff(tr.sig, det.sig);
    return c;
  }

  /**
   * poses: 각 원소는 toPoints() 결과 배열. t: ms.
   * 반환: { blue:{status,quality,pts,uncertain}, white:{...}, overlap, calibrated, count }
   */
  update(posesPts, t) {
    this.lastT = t;
    this.events = [];
    const dets = [];
    posesPts.forEach((pts, i) => {
      const g = personGeometry(pts);
      if (g) dets.push({ ...g, pts, idx: i });
    });
    const B = this.tracks.blue, W = this.tracks.white;

    if (!this.calibrated) {
      if (dets.length >= 2) this.calibrateFromSides(dets);
      return this._result(dets.length);
    }

    // 겹침 판정
    let overlapNow = false;
    if (dets.length >= 2 && iou(dets[0].bbox, dets[1].bbox) > OVERLAP_IOU) overlapNow = true;
    if (dets.length >= 2) {
      const d = Math.abs(dets[0].center.x - dets[1].center.x);
      if (d < 0.55 * Math.min(dets[0].shW, dets[1].shW) * 2) overlapNow = true;
    }
    // 둘 다 최근까지 보였고 서로 가까웠는데 한 명만 남은 경우 → 가림(겹침)
    const recent = (tr) => t - tr.lastSeen < LOST_MS;
    if (dets.length === 1 && recent(B) && recent(W) && B.pos && W.pos) {
      const sep = Math.abs(B.pos.x - W.pos.x);
      if (sep < 1.6 * Math.max(B.scale || 0, W.scale || 0)) overlapNow = true;
    }

    const assignments = new Map();
    if (dets.length >= 2) {
      const [d0, d1] = dets;
      const sideP = (det, team) => {
        // 약한 좌우 사전 확률: 연속성이 애매할 때만 결정권을 가짐
        const other = det === d0 ? d1 : d0;
        const isLeft = det.center.x < other.center.x;
        return (team === 'blue') === isLeft ? 0 : 0.35;
      };
      const both = B.pos && W.pos;
      let cA, cB;
      if (both) {
        cA = this._cost(B, d0, t) + this._cost(W, d1, t);
        cB = this._cost(B, d1, t) + this._cost(W, d0, t);
        // 연속성 비용이 거의 같을 때만 좌우 위치로 결정
        if (Math.abs(cA - cB) < 0.12) { cA += sideP(d0, 'blue'); cB += sideP(d1, 'blue'); }
      } else { cA = sideP(d0, 'blue'); cB = sideP(d1, 'blue'); }
      // 두 명 모두 놓쳤다가 다시 나타나면 좌우 기준으로 재보정
      if (!recent(B) && !recent(W)) { cA = sideP(d0, 'blue'); cB = sideP(d1, 'blue'); }
      const pick = cA <= cB ? [d0, d1] : [d1, d0];
      const margin = Math.abs(cA - cB);
      const conf = Math.max(0.3, Math.min(1, margin / 0.8 + 0.4));
      assignments.set('blue', { det: pick[0], conf });
      assignments.set('white', { det: pick[1], conf });
      // 겹침이 풀린 직후 판단이 애매하면 경고
      if (this.overlap && !overlapNow && margin < 0.25) {
        B.uncertain = W.uncertain = true;
        this.events.push('identity-uncertain');
      } else if (!overlapNow && margin > 0.6) {
        B.uncertain = W.uncertain = false;
      }
    } else if (dets.length === 1) {
      const d = dets[0];
      const cb = B.pos ? this._cost(B, d, t) : 9;
      const cw = W.pos ? this._cost(W, d, t) : 9;
      const gate = 2.2;
      const bRecent = recent(B), wRecent = recent(W);
      let team = null;
      if (bRecent && !wRecent) team = cb < gate ? 'blue' : (cw < gate + 1 ? 'white' : null);
      else if (wRecent && !bRecent) team = cw < gate ? 'white' : (cb < gate + 1 ? 'blue' : null);
      else team = cb <= cw ? (cb < gate * 1.5 ? 'blue' : null) : (cw < gate * 1.5 ? 'white' : null);
      if (team) assignments.set(team, { det: d, conf: overlapNow ? 0.3 : 0.8 });
    }

    for (const team of ['blue', 'white']) {
      const tr = this.tracks[team];
      const a = assignments.get(team);
      if (a) {
        const keepScale = overlapNow ? tr.scale : null;
        this._assign(tr, a.det, t, a.conf);
        if (keepScale) tr.scale = keepScale; // 겹침 중에는 크기 학습 중지
        if (!overlapNow) this._learnSig(tr, a.det);
      } else {
        tr.det = null;
        tr.quality *= 0.85;
      }
    }
    this.overlap = overlapNow;
    return this._result(dets.length);
  }

  _result(count) {
    const t = this.lastT ?? 0;
    const out = { overlap: this.overlap, calibrated: this.calibrated, count };
    for (const team of ['blue', 'white']) {
      const tr = this.tracks[team];
      let status;
      if (!this.calibrated) status = 'calibrating';
      else if (t - tr.lastSeen > LOST_MS || !tr.active) status = 'lost';
      else if (this.overlap) status = 'overlap';
      else if (!tr.det) status = 'holding';  // 잠깐 놓침(유예)
      else status = 'ok';
      tr.status = status;
      out[team] = { status, quality: tr.quality, pts: tr.det ? tr.det.pts : null, uncertain: tr.uncertain };
    }
    return out;
  }
}
