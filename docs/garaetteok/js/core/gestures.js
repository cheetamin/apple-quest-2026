// 시간에 따른 동작 판정기 (순수 로직)

/** 조건을 일정 시간 유지하면 1회 확정 */
export class HoldDetector {
  constructor(ms) { this.ms = ms; this.since = null; this.fired = false; }
  reset() { this.since = null; this.fired = false; }
  update(cond, t) {
    if (!cond) { this.since = null; this.fired = false; return false; }
    if (this.since == null) this.since = t;
    if (!this.fired && t - this.since >= this.ms) { this.fired = true; return true; }
    return false;
  }
  progress(t) { return this.since == null ? 0 : Math.min(1, (t - this.since) / this.ms); }
}

/**
 * 가래떡 썰기: 팔을 위로(손이 어깨보다 충분히 위) → 아래로(손이 허리 쪽) 한 번 = 1회.
 * 빠르게 흔들어도 완전한 상승·하강이 아니면 인정하지 않고, 최소 간격으로 중복을 막는다.
 */
export class ChopDetector {
  constructor({ upTh = 0.45, downTh = -0.35, minGap = 320, maxCycle = 2500 } = {}) {
    Object.assign(this, { upTh, downTh, minGap, maxCycle });
    this.reset();
  }
  reset() { this.armed = false; this.armedAt = 0; this.last = -1e9; this.count = 0; }
  update(h, t, sens = 1) {
    if (h == null) return false;
    const up = this.upTh / sens, down = this.downTh / sens;
    if (h > up) { this.armed = true; this.armedAt = t; return false; }
    if (this.armed && h < down) {
      this.armed = false;
      if (t - this.armedAt > this.maxCycle) return false;
      if (t - this.last < this.minGap) return false;
      this.last = t; this.count++;
      return true;
    }
    return false;
  }
}

/** 제자리 달리기: 좌우 교대 신호(무릎 높이 차 또는 팔 흔들기)의 교차를 걸음으로 센다 */
export class StepDetector {
  constructor({ hyst = 0.12, window = 2000, maxRate = 4.5 } = {}) {
    Object.assign(this, { hyst, window, maxRate });
    this.reset();
  }
  reset() { this.side = 0; this.steps = []; this.total = 0; }
  update(signal, t, sens = 1) {
    if (signal != null) {
      const h = this.hyst / sens;
      let s = this.side;
      if (signal > h) s = 1; else if (signal < -h) s = -1;
      if (s !== 0 && s !== this.side) {
        if (this.side !== 0) {
          const lastT = this.steps.length ? this.steps[this.steps.length - 1] : -1e9;
          if (t - lastT > 1000 / (this.maxRate * 1.6)) { this.steps.push(t); this.total++; }
        }
        this.side = s;
      }
    }
    while (this.steps.length && t - this.steps[0] > this.window) this.steps.shift();
    return this.rate(t);
  }
  rate(t) {
    const n = this.steps.filter((s) => t - s <= this.window).length;
    return Math.min(this.maxRate, n / (this.window / 1000));
  }
}

/** 몸통 좌우 이동 → 3개 차선 (-1,0,1), 히스테리시스로 떨림 방지 */
export class LaneTracker {
  constructor({ th = 0.55, hyst = 0.15 } = {}) { this.th = th; this.hyst = hyst; this.lane = 0; this.base = null; }
  setBase(x) { this.base = x; this.lane = 0; }
  update(x, shW, sens = 1) {
    if (x == null || !shW) return this.lane;
    if (this.base == null) this.base = x;
    const s = (x - this.base) / shW;
    const th = this.th / sens;
    const L = this.lane;
    if (L === 0) { if (s > th + this.hyst) this.lane = 1; else if (s < -th - this.hyst) this.lane = -1; }
    else if (L === 1) { if (s < th - this.hyst) this.lane = s < -th - this.hyst ? -1 : 0; }
    else if (L === -1) { if (s > -th + this.hyst) this.lane = s > th + this.hyst ? 1 : 0; }
    return this.lane;
  }
}

/** 퀴즈 모션 선택: 1=왼손, 2=오른손, 3=양손 (몸 기준 실제 좌우) */
export function motionChoice(sig) {
  if (!sig) return 0;
  if (sig.leftUp && sig.rightUp) return 3;
  if (sig.leftUp) return 1;
  if (sig.rightUp) return 2;
  return 0;
}

/** OX 자세: O=양팔 머리 위, X=양팔 교차 */
export function oxPose(sig) {
  if (!sig) return null;
  if (sig.crossed) return 'X';
  if (sig.bothUp) return 'O';
  return null;
}
