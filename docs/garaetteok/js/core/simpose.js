// 가상 학생 자세 생성기: 카메라 없이 추적·채점 파이프라인을 시험하기 위한 합성 랜드마크.
// 실제 카메라 영상(좌우 반전되지 않은 원본) 좌표계로 만든다: 학생의 왼쪽은 영상의 오른쪽(x 증가).
export function makeRng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/**
 * p: { cx, height, lArm, rArm, lean, step, legsVisible, noise, rng, aspect, kneeLift }
 * arm: 'down' | 'up' | 'wide' | 'cross' | 'chest' | 'over'(머리 위) | 'side'(옆으로 낮게)
 */
export function synthPose(p) {
  const aspect = p.aspect || 16 / 9;
  const H = p.height ?? 0.8;
  const top = p.top ?? (1 - H) / 2;
  const rng = p.rng || Math.random;
  const nz = p.noise ?? 0.003;
  const X = (u) => u / aspect; // y 단위 길이를 x 정규좌표로
  const cx = p.cx;
  const leanX = X((p.lean || 0) * 0.08 * H);
  const lm = Array.from({ length: 33 }, () => ({ x: cx, y: top + 0.1 * H, z: 0, visibility: 0.95 }));
  const set = (i, x, y, v = 0.95) => { lm[i] = { x: x + (rng() - 0.5) * nz * 2, y: y + (rng() - 0.5) * nz * 2, z: 0, visibility: v }; };
  const shY = top + 0.18 * H, hipY = top + 0.5 * H;
  const shW = 0.22 * H, hipW = 0.15 * H;
  const nose = { x: cx + leanX * 1.2, y: top + 0.07 * H };
  set(0, nose.x, nose.y);
  for (const i of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) set(i, nose.x + X((i % 2 ? 1 : -1) * 0.02 * H), nose.y - 0.01 * H);
  const LS = { x: cx + leanX + X(shW / 2), y: shY }, RS = { x: cx + leanX - X(shW / 2), y: shY };
  set(11, LS.x, LS.y); set(12, RS.x, RS.y);
  const LH = { x: cx + X(hipW / 2), y: hipY }, RH = { x: cx - X(hipW / 2), y: hipY };
  set(23, LH.x, LH.y); set(24, RH.x, RH.y);
  const ua = 0.17 * H, fa = 0.16 * H;
  const arm = (state, S, sideSign, iE, iW) => {
    let e, w;
    const sx = (u) => S.x + X(sideSign * u);
    switch (state) {
      case 'up': e = { x: sx(0.04 * H), y: S.y - ua }; w = { x: sx(0.05 * H), y: S.y - ua - fa }; break;
      case 'over': e = { x: sx(0.08 * H), y: S.y - ua * 0.9 }; w = { x: sx(0.0), y: S.y - ua - fa * 0.9 }; break;
      case 'wide': e = { x: sx(ua), y: S.y }; w = { x: sx(ua + fa), y: S.y }; break;
      case 'cross': e = { x: sx(0.03 * H), y: S.y + ua * 0.8 }; w = { x: sx(-(shW * 0.95)), y: S.y + ua * 0.45 }; break;
      case 'chest': e = { x: sx(0.04 * H), y: S.y + ua * 0.9 }; w = { x: sx(-0.03 * H), y: S.y + ua * 0.5 }; break;
      case 'side': e = { x: sx(0.08 * H), y: S.y + ua * 0.9 }; w = { x: sx(0.2 * H), y: S.y + ua * 1.5 }; break;
      default: e = { x: sx(0.02 * H), y: S.y + ua }; w = { x: sx(0.03 * H), y: S.y + ua + fa };
    }
    set(iE, e.x, e.y); set(iW, w.x, w.y);
    for (const i of iW === 15 ? [17, 19, 21] : [18, 20, 22]) set(i, w.x, w.y + 0.01 * H);
  };
  arm(p.lArm || 'down', LS, +1, 13, 15);
  arm(p.rArm || 'down', RS, -1, 14, 16);
  // 다리: step 위상(-1~1)에 따라 무릎 들기
  const kl = 0.12 * H * (p.kneeLift ?? 1);
  const s = p.step || 0;
  const lLift = Math.max(0, s) * kl, rLift = Math.max(0, -s) * kl;
  const lv = p.legsVisible === false ? 0.1 : 0.95;
  set(25, LH.x, top + 0.72 * H - lLift, lv); set(26, RH.x, top + 0.72 * H - rLift, lv);
  set(27, LH.x, top + 0.95 * H - lLift * 1.2, lv); set(28, RH.x, top + 0.95 * H - rLift * 1.2, lv);
  for (const [i, j] of [[29, 27], [31, 27], [30, 28], [32, 28]]) set(i, lm[j].x, lm[j].y + 0.02 * H, lv);
  return lm;
}
