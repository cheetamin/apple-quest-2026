// 관절 좌표 → 게임용 신체 신호 변환 (순수 함수, 브라우저/Node 공용)
// MediaPipe Pose 33개 랜드마크 인덱스
export const LM = {
  NOSE: 0, L_SH: 11, R_SH: 12, L_EL: 13, R_EL: 14, L_WR: 15, R_WR: 16,
  L_HIP: 23, R_HIP: 24, L_KN: 25, R_KN: 26, L_AN: 27, R_AN: 28,
};
const LR_PAIRS = [[1, 4], [2, 5], [3, 6], [7, 8], [9, 10], [11, 12], [13, 14], [15, 16], [17, 18], [19, 20], [21, 22], [23, 24], [25, 26], [27, 28], [29, 30], [31, 32]];

const VIS = 0.4;
const VIS_LOOSE = 0.25; // 팔을 교차하면 손목이 가려져 신뢰도가 떨어지므로 X 판정에는 낮은 기준 사용

/**
 * 정규화 랜드마크(0~1) → 화면 좌표계 점 배열.
 * x 는 화면(표시) 기준 좌우, 가로세로 비율을 반영해 y 와 같은 단위.
 * mirror: 화면 표시가 거울 모드인지. swapLR: 카메라 하드웨어가 이미 좌우 반전된 영상을 줄 때 좌/우 라벨 교정.
 */
export function toPoints(pose, aspect = 16 / 9, mirror = true, swapLR = false) {
  const pts = pose.map((p) => ({
    x: (mirror ? 1 - p.x : p.x) * aspect,
    y: p.y,
    v: p.visibility == null ? 1 : p.visibility,
  }));
  if (swapLR) {
    for (const [a, b] of LR_PAIRS) {
      if (pts[a] && pts[b]) { const t = pts[a]; pts[a] = pts[b]; pts[b] = t; }
    }
  }
  return pts;
}

const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, v: Math.min(a.v, b.v) });
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const ok = (p) => p && p.v >= VIS;
const okLoose = (p) => p && p.v >= VIS_LOOSE;
function segCross(a, b, c, d) {
  const o = (p, q, r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
}

/** 사람 한 명의 핵심 특징(중심, 크기, 체형 서명) — 추적기에서 사용 */
export function personGeometry(pts) {
  const ls = pts[LM.L_SH], rs = pts[LM.R_SH], lh = pts[LM.L_HIP], rh = pts[LM.R_HIP];
  if (!ok(ls) || !ok(rs)) return null;
  const shC = mid(ls, rs);
  const shW = Math.max(dist(ls, rs), 1e-4);
  let hipC = null;
  if (ok(lh) && ok(rh)) hipC = mid(lh, rh);
  else if (ok(lh)) hipC = { x: lh.x + (shC.x - ls.x), y: lh.y, v: lh.v };
  else if (ok(rh)) hipC = { x: rh.x + (shC.x - rs.x), y: rh.y, v: rh.v };
  const torso = hipC ? Math.max(dist(shC, hipC), shW * 0.8) : shW * 1.45;
  const center = hipC ? mid(shC, hipC) : { x: shC.x, y: shC.y + torso * 0.5, v: shC.v };
  // 보이는 점으로 경계 상자
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of pts) {
    if (!ok(p)) continue;
    if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
  }
  // 체형 서명: 몸통 대비 비율 (얼굴/외모가 아닌 관절 길이 비율만 사용)
  const seg = (a, b) => (ok(pts[a]) && ok(pts[b]) ? dist(pts[a], pts[b]) / torso : null);
  const sig = [
    shW / torso,
    avg(seg(LM.L_SH, LM.L_EL), seg(LM.R_SH, LM.R_EL)),
    avg(seg(LM.L_EL, LM.L_WR), seg(LM.R_EL, LM.R_WR)),
    hipC && ok(lh) && ok(rh) ? dist(lh, rh) / torso : null,
    avg(seg(LM.L_HIP, LM.L_KN), seg(LM.R_HIP, LM.R_KN)),
  ];
  const keyVis = [LM.L_SH, LM.R_SH, LM.L_EL, LM.R_EL, LM.L_WR, LM.R_WR, LM.L_HIP, LM.R_HIP]
    .reduce((s, i) => s + Math.min(1, pts[i] ? pts[i].v : 0), 0) / 8;
  return { shC, hipC, center, shW, torso, bbox: { x0, x1, y0, y1 }, sig, keyVis };
}

function avg(a, b) {
  if (a == null && b == null) return null;
  if (a == null) return b; if (b == null) return a;
  return (a + b) / 2;
}

/**
 * 게임에서 쓰는 의미 단위 동작 신호.
 * 모든 임계값은 몸통 길이/어깨너비 기준이라 키·체격 차이를 자동 보정한다.
 * sens: 민감도(0.6~1.5). 클수록 판정이 관대해진다.
 */
export function bodySignals(pts, sens = 1) {
  const g = personGeometry(pts);
  if (!g) return null;
  const { shC, hipC, shW, torso } = g;
  const ls = pts[LM.L_SH], rs = pts[LM.R_SH];
  const lw = pts[LM.L_WR], rw = pts[LM.R_WR], le = pts[LM.L_EL], re = pts[LM.R_EL];
  const nose = pts[LM.NOSE];
  const k = 1 / Math.max(0.5, Math.min(1.6, sens));
  const headY = ok(nose) ? nose.y : shC.y - torso * 0.45;

  const armUp = (w, s) => ok(w) && w.y < s.y - 0.3 * torso * k;
  const leftUp = armUp(lw, ls);
  const rightUp = armUp(rw, rs);
  const overHead = (w) => ok(w) && w.y < headY - 0.05 * torso * k;
  const bothUp = overHead(lw) && overHead(rw);
  const wideArm = (w, s) => ok(w) && Math.abs(w.y - s.y) < 0.45 * torso / k && Math.abs(w.x - shC.x) > 1.25 * shW * k;
  const wide = wideArm(lw, ls) && wideArm(rw, rs);
  // X(팔 교차): 해부학적 좌우축(오른어깨→왼어깨) 기준이라 거울 모드와 무관.
  // 아래 셋 중 하나면 X — ① 손목이 서로 반대편으로 넘어감 ② 아래팔(팔꿈치→손목) 두 선분이 교차
  // ③ 두 손목이 가슴 가운데에 모이고 팔꿈치는 바깥에 있음(팔짱형 X)
  const dir = Math.sign(ls.x - rs.x) || 1;
  const hipY = hipC ? hipC.y : shC.y + torso;
  let crossed = false;
  if (okLoose(lw) && okLoose(rw)) {
    const inBand = lw.y > headY - 0.15 * torso && rw.y > headY - 0.15 * torso && lw.y < hipY + 0.2 * torso && rw.y < hipY + 0.2 * torso;
    const passed = (lw.x - rw.x) * dir < -0.02 * shW;
    const elbows = okLoose(le) && okLoose(re);
    const forearms = elbows && segCross(le, lw, re, rw);
    const nearMid = elbows && Math.abs(lw.x - shC.x) < 0.42 * shW * k * 1.2 && Math.abs(rw.x - shC.x) < 0.42 * shW * k * 1.2 &&
      Math.abs(lw.y - rw.y) < 0.45 * torso && (le.x - shC.x) * dir > 0.3 * shW && (re.x - shC.x) * dir < -0.3 * shW;
    crossed = inBand && (passed || forearms || nearMid);
  }

  const wy = [lw, rw].filter(ok).map((p) => p.y);
  const handHeight = wy.length ? (shC.y - wy.reduce((a, b) => a + b, 0) / wy.length) / torso : null;
  const rel = (w) => (ok(w) ? { x: (w.x - shC.x) / torso, y: (w.y - shC.y) / torso } : null);
  const lean = hipC ? (shC.x - hipC.x) / shW : 0;
  const lk = pts[LM.L_KN], rk = pts[LM.R_KN], la = pts[LM.L_AN], ra = pts[LM.R_AN];
  const legsVisible = ok(la) && ok(ra);
  const kneesVisible = ok(lk) && ok(rk);
  const kneeSignal = kneesVisible ? (lk.y - rk.y) / torso : null;
  const armSignal = ok(lw) && ok(rw) ? (lw.y - rw.y) / torso : null;
  const elbowsOk = ok(le) && ok(re);
  return {
    geo: g, center: g.center, shW, torso,
    leftUp, rightUp, bothUp, wide, crossed,
    handHeight, handL: rel(lw), handR: rel(rw), lean,
    kneeSignal, armSignal, legsVisible, kneesVisible, elbowsOk,
    quality: g.keyVis,
  };
}
