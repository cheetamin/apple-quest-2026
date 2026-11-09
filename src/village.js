/* 애플 마을 — 먹이 · 집 · 마을 건물 목록과 일러스트(SVG) */
(function (root) {
  'use strict';
  const SH = root.AQ_SHOP;
  const { O, O2, HL, starD, spark, heart, cuteFace } = SH;
  const pts = a => a.map(p => p.map(n => n.toFixed(1)).join(' ')).join(' ');
  const poly = (a, fill, o = O) => `<polygon points="${pts(a)}" fill="${fill}" ${o}/>`;
  const DEFS = `<defs>
    <linearGradient id="vCream" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#f0dcb4"/></linearGradient>
    <linearGradient id="vCreamS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8cfa0"/><stop offset="1" stop-color="#c8a878"/></linearGradient>
    <linearGradient id="vPinkW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0f6"/><stop offset="1" stop-color="#ffc8dc"/></linearGradient>
    <linearGradient id="vPinkWS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0b0c8"/><stop offset="1" stop-color="#d890ac"/></linearGradient>
    <linearGradient id="vBlueW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0f8ff"/><stop offset="1" stop-color="#c8e0f8"/></linearGradient>
    <linearGradient id="vBlueWS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b0cce8"/><stop offset="1" stop-color="#8aaad0"/></linearGradient>
    <linearGradient id="vLog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8a06a"/><stop offset="1" stop-color="#a86a38"/></linearGradient>
    <linearGradient id="vLogS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8723e"/><stop offset="1" stop-color="#7a4a22"/></linearGradient>
    <linearGradient id="vBarn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a62"/><stop offset="1" stop-color="#d03a2a"/></linearGradient>
    <linearGradient id="vBarnS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c8402e"/><stop offset="1" stop-color="#982818"/></linearGradient>
    <linearGradient id="vStone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f0ea"/><stop offset="1" stop-color="#cfc6b8"/></linearGradient>
    <linearGradient id="vStoneS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c8beb0"/><stop offset="1" stop-color="#a0968a"/></linearGradient>
    <linearGradient id="vRoofR" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8a6a"/><stop offset="1" stop-color="#d03828"/></linearGradient>
    <linearGradient id="vRoofG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8ade6a"/><stop offset="1" stop-color="#3a9a3a"/></linearGradient>
    <linearGradient id="vRoofB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8ac8ff"/><stop offset="1" stop-color="#3a72d8"/></linearGradient>
    <linearGradient id="vRoofP" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d8a8ff"/><stop offset="1" stop-color="#7a4ad0"/></linearGradient>
    <linearGradient id="vRoofBr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d8955a"/><stop offset="1" stop-color="#8a4a20"/></linearGradient>
    <linearGradient id="vRoofPk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb0d0"/><stop offset="1" stop-color="#e8508a"/></linearGradient>
    <linearGradient id="vRoofY" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe88a"/><stop offset="1" stop-color="#f0a820"/></linearGradient>
    <linearGradient id="vGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8fbff"/><stop offset="1" stop-color="#7ac0ec"/></linearGradient>
    <linearGradient id="vWarm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c0"/><stop offset="1" stop-color="#ffc85a"/></linearGradient>
    <linearGradient id="vDoor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b87a46"/><stop offset="1" stop-color="#7a4620"/></linearGradient>
    <linearGradient id="vTentA" x1="0" x2="1"><stop offset="0" stop-color="#ffb04a"/><stop offset="1" stop-color="#f07a1a"/></linearGradient>
    <linearGradient id="vGrassP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ade6a"/><stop offset="1" stop-color="#4aa43a"/></linearGradient>
    <linearGradient id="vSoil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b07a4a"/><stop offset="1" stop-color="#7a4a22"/></linearGradient>
    <radialGradient id="vAppleR" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#ffd0c4"/><stop offset=".35" stop-color="#ff5a4a"/><stop offset="1" stop-color="#b01a1a"/></radialGradient>
    <radialGradient id="vAppleG" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#f0ffc8"/><stop offset=".4" stop-color="#9ad84a"/><stop offset="1" stop-color="#4a8a1a"/></radialGradient>
    <radialGradient id="vAppleY" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fffbe0"/><stop offset=".4" stop-color="#ffd84a"/><stop offset="1" stop-color="#c88a00"/></radialGradient>
    <radialGradient id="vPie" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#ffe0a8"/><stop offset="1" stop-color="#d88a3a"/></radialGradient>
  </defs>`;

  /* 2.5D 상자 건물: 앞면(왼쪽 아래 → 가운데) · 옆면(가운데 → 오른쪽) · 박공지붕 */
  function box({ x0 = 18, xm = 78, x1 = 124, yb = 132, dl = 12, dr = 16, H = 46, R = 26, wall = 'url(#vCream)', side = 'url(#vCreamS)', roof = 'url(#vRoofR)', over = 6 }) {
    const L = [x0, yb - dl], M = [xm, yb], Rr = [x1, yb - dl - dr];
    const fp = (u, v) => [L[0] + u * (M[0] - L[0]), L[1] + u * (M[1] - L[1]) - v * H]; // 앞면 좌표
    const sp = (u, v) => [M[0] + u * (Rr[0] - M[0]), M[1] + u * (Rr[1] - M[1]) - v * H]; // 옆면 좌표
    const apex = [(M[0] + Rr[0]) / 2, (M[1] + Rr[1]) / 2 - H - R];
    const ridgeL = [apex[0] - (M[0] - L[0]), apex[1] - (M[1] - L[1])];
    let svg = poly([sp(0, 0), sp(1, 0), sp(1, 1), sp(0, 1)], side) + poly([fp(0, 0), fp(1, 0), fp(1, 1), fp(0, 1)], wall)
      + poly([sp(0, 1), sp(1, 1), apex], side)
      + poly([[fp(0, 1)[0] - over, fp(0, 1)[1] + over * .3], [fp(1, 1)[0] + 2, fp(1, 1)[1] + over * .6], [apex[0] + 3, apex[1] - 1], [ridgeL[0] - over, ridgeL[1] - 1]], roof)
      + `<path d="M${(ridgeL[0] - over).toFixed(1)} ${(ridgeL[1] - 1).toFixed(1)} L${(apex[0] + 3).toFixed(1)} ${(apex[1] - 1).toFixed(1)}" stroke="#fff" stroke-width="2.5" opacity=".55" stroke-linecap="round"/>`;
    return { svg, fp, sp, apex, ridgeL, H };
  }
  const quad = (f, u0, u1, v0, v1, fill, o = O2) => poly([f(u0, v0), f(u1, v0), f(u1, v1), f(u0, v1)], fill, o);
  function win(f, u0, u1, v0, v1, warm) {
    const c = f((u0 + u1) / 2, (v0 + v1) / 2), t = f((u0 + u1) / 2, v1), b = f((u0 + u1) / 2, v0), l = f(u0, (v0 + v1) / 2), r = f(u1, (v0 + v1) / 2);
    return quad(f, u0, u1, v0, v1, warm ? 'url(#vWarm)' : 'url(#vGlass)') + `<path d="M${pts([t])} L${pts([b])} M${pts([l])} L${pts([r])}" stroke="#3b2314" stroke-width="1.6"/>`
      + `<path d="M${pts([f(u0 + .02, v1 - .06)])} L${pts([f(u0 + (u1 - u0) * .4, v1 - .06)])}" stroke="#fff" stroke-width="2" opacity=".8"/>` + (c ? '' : '');
  }
  function door(f, u0, u1, v1, color = 'url(#vDoor)') {
    const a = f(u0, 0), b = f(u1, 0), c = f(u1, v1), d = f(u0, v1), top = f((u0 + u1) / 2, v1 + .1);
    return `<path d="M${pts([a])} L${pts([b])} L${pts([c])} Q${pts([top])} ${pts([d])}Z" fill="${color}" ${O2}/><circle cx="${f(u1 - .03, v1 * .45)[0].toFixed(1)}" cy="${f(u1 - .03, v1 * .45)[1].toFixed(1)}" r="1.6" fill="#ffd45c"/>`;
  }
  function awning(f, u0, u1, v, c1, c2) { // 줄무늬 차양
    const n = 5; let s = '';
    for (let i = 0; i < n; i++) { const a = u0 + (u1 - u0) * i / n, b = u0 + (u1 - u0) * (i + 1) / n; const p1 = f(a, v), p2 = f(b, v), p3 = f(b, v - .14), p4 = f(a, v - .14); s += `<path d="M${pts([p1])} L${pts([p2])} L${pts([[p3[0], p3[1] + 6]])} Q${pts([[(p3[0] + p4[0]) / 2, p3[1] + 10]])} ${pts([[p4[0], p4[1] + 6]])}Z" fill="${i % 2 ? c2 : c1}" ${O2}/>`; }
    return s;
  }
  function sign(f, u, v, inner, bg = '#fffaf0') { const c = f(u, v); return `<g transform="translate(${c[0].toFixed(1)} ${c[1].toFixed(1)})"><rect x="-13" y="-10" width="26" height="20" rx="4" fill="${bg}" ${O2}/>${inner}</g>`; }
  const chimney = (x, y, smoke = true) => `<path d="M${x} ${y} l0 -16 l10 -2 l0 14" fill="url(#vRoofBr)" ${O2}/><rect x="${x - 2}" y="${y - 20}" width="14" height="5" rx="1.5" fill="#8a4a20" ${O2}/>${smoke ? `<g class="v-smoke"><circle cx="${x + 5}" cy="${y - 28}" r="5" fill="#fff" opacity=".8"/><circle cx="${x + 11}" cy="${y - 38}" r="7" fill="#fff" opacity=".6"/></g>` : ''}`;
  const flowerPot = (x, y, c = '#ff6aa8') => `<path d="M${x - 6} ${y} l2 9 h8 l2 -9Z" fill="#d8784a" ${O2}/>${[[-4, -4], [0, -8], [4, -4]].map(([dx, dy]) => `<circle cx="${x + dx}" cy="${y + dy}" r="3.6" fill="${c}" ${O2.replace('2"', '1.3"')}/>`).join('')}`;
  const bush = (x, y, r = 9) => `<path d="M${x - r * 1.4} ${y} a${r} ${r} 0 0 1 ${r * .9} ${-r * .9} a${r} ${r} 0 0 1 ${r} ${-r * .3} a${r} ${r} 0 0 1 ${r * .9} ${r * 1.2}Z" fill="url(#vGrassP)" ${O2}/>`;
  const appleTree = (x, y, k = 1) => `<g transform="translate(${x} ${y}) scale(${k})"><path d="M-4 0 L-3 -22 L3 -22 L4 0Z" fill="url(#vLogS)" ${O2}/><circle cx="0" cy="-34" r="18" fill="url(#vGrassP)" ${O}/><circle cx="-10" cy="-28" r="10" fill="url(#vGrassP)" ${O2}/><circle cx="10" cy="-27" r="10" fill="url(#vGrassP)" ${O2}/>${[[-7, -38], [6, -42], [10, -28], [-10, -26], [0, -30]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="3.2" fill="url(#vAppleR)" ${O2.replace('2"', '1"')}/>`).join('')}<ellipse cx="-6" cy="-46" rx="5" ry="3" ${HL}/></g>`;
  const S = (vb, inner) => `<svg viewBox="${vb}" aria-hidden="true" focusable="false">${inner}</svg>`;

  /* ---------- 먹이 ---------- */
  const FOODS = [
    { key: 'slice', name: '아삭 사과 조각', price: 5, fill: 20, love: 1, stage: 0,
      art: () => S('-40 -36 80 64', `<ellipse cx="0" cy="12" rx="34" ry="11" fill="#fff" ${O}/><ellipse cx="0" cy="10" rx="26" ry="7" fill="#e8f4ff"/>
        ${[[-14, 2, -20], [2, 0, 0], [16, 3, 22]].map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M-10 0 A12 12 0 0 1 10 0Z" fill="#fff7d8" ${O2}/><path d="M-10 0 A12 12 0 0 1 10 0" fill="none" stroke="#e8352a" stroke-width="3.5"/><circle cx="-2" cy="-4" r="1.3" fill="#5a3214"/><circle cx="3" cy="-4" r="1.3" fill="#5a3214"/></g>`).join('')}`) },
    { key: 'juice', name: '꿀사과 주스', price: 12, fill: 40, love: 1, stage: 0,
      art: () => S('-36 -50 72 84', `<path d="M8 -42 l10 -8" stroke="#ff5a8a" stroke-width="4" stroke-linecap="round"/><path d="M4 -40 L8 -42" stroke="#ff5a8a" stroke-width="4"/>
        <path d="M-18 -30 L18 -30 L13 26 Q0 32 -13 26Z" fill="url(#vWarm)" ${O}/><path d="M-17 -22 L17 -22" stroke="#fff" stroke-width="2" opacity=".6"/><path d="M-12 -24 L-9 20" stroke="#fff" stroke-width="3" opacity=".7" stroke-linecap="round"/>
        <path d="M6 -40 L4 10" stroke="#ff5a8a" stroke-width="4" stroke-linecap="round"/><circle cx="16" cy="-30" r="8" fill="url(#vAppleR)" ${O2}/><path d="M16 -38 q2 -4 6 -4" stroke="#3b2314" stroke-width="1.6" fill="none"/>${[[-6, 6], [2, 14], [-2, -6]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#fff" opacity=".7"/>`).join('')}`) },
    { key: 'pie', name: '따끈 사과파이', price: 25, fill: 70, love: 2, stage: 0,
      art: () => S('-44 -36 88 66', `<g class="v-steam"><path d="M-10 -26 q-6 -8 0 -14 M2 -28 q-6 -8 0 -14 M14 -26 q-6 -8 0 -14" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/></g>
        <ellipse cx="0" cy="12" rx="40" ry="13" fill="#fff" ${O}/><path d="M-32 6 Q-32 -14 0 -16 Q32 -14 32 6 Q0 18 -32 6Z" fill="url(#vPie)" ${O}/>
        ${[-18, -6, 6, 18].map(x => `<path d="M${x - 6} -10 L${x + 8} 8" stroke="#c8782a" stroke-width="4" stroke-linecap="round"/>`).join('')}${[-20, -8, 4, 16].map(x => `<path d="M${x + 8} -10 L${x - 6} 8" stroke="#f4b860" stroke-width="3.5" stroke-linecap="round"/>`).join('')}
        <path d="M-32 6 Q0 18 32 6" stroke="#a85a1a" stroke-width="3" fill="none"/><ellipse cx="-14" cy="-10" rx="8" ry="3" ${HL}/>`) },
    { key: 'cake', name: '딸기 생크림 케이크', price: 40, fill: 90, love: 3, stage: 0,
      art: () => S('-42 -48 84 80', `<ellipse cx="0" cy="22" rx="38" ry="10" fill="#fff" ${O}/>
        <path d="M-28 14 L-28 -12 L24 -22 L30 -14 L30 10 L-28 14Z" fill="#fff6f0" ${O}/><path d="M-28 0 L30 -4" stroke="#ff8aa8" stroke-width="5"/><path d="M-28 -12 L24 -22 L30 -14 L-22 -4Z" fill="#fff" ${O2}/>
        ${[-16, -2, 12].map((x, i) => `<path d="M${x} ${-10 - i * 3} q-4 -4 0 -8 q4 4 0 8" fill="#fff" ${O2}/>`).join('')}
        <path d="M2 -28 C-8 -30 -8 -40 2 -44 C12 -40 12 -30 2 -28Z" fill="#ff3a5a" ${O2}/><path d="M-2 -44 l4 -4 l4 4 l-4 -1Z" fill="#5ac84a" ${O2}/>${[[0, -38], [4, -34], [-2, -32]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="#ffe14a"/>`).join('')}`) },
    { key: 'golden', name: '전설의 황금 사과', price: 70, fill: 100, love: 6, stage: 1,
      art: () => S('-40 -46 80 80', `<circle r="34" fill="url(#dGlow)"/><path d="M0 -20 C-20 -32 -36 -14 -32 6 C-28 26 -12 32 0 26 C12 32 28 26 32 6 C36 -14 20 -32 0 -20Z" fill="url(#vAppleY)" ${O}/>
        <path d="M0 -20 Q2 -32 8 -38" stroke="#3b2314" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M4 -32 Q16 -44 24 -32 Q14 -28 4 -32Z" fill="#6ec84a" ${O2}/>
        <ellipse cx="-16" cy="-8" rx="6" ry="10" transform="rotate(25 -16 -8)" ${HL}/>${spark(26, -26, 6, 'tw', '#fff')}${spark(-28, 22, 5, 'tw d1', '#fff')}`) },
  ];

  /* ---------- 내 집 (0 = 빈 땅) ---------- */
  const HOUSES = [
    { name: '빈 땅', price: 0, art: () => S('0 0 140 140', `<ellipse cx="70" cy="118" rx="54" ry="16" fill="url(#vSoil)" ${O}/><path d="M48 112 l6 -3 M74 120 l7 -2 M92 110 l5 2" stroke="#5a3214" stroke-width="2" stroke-linecap="round"/><path d="M60 118 L60 86" stroke="#7a4a22" stroke-width="4"/><rect x="44" y="76" width="34" height="16" rx="3" fill="url(#vCream)" ${O2}/><text x="61" y="88" text-anchor="middle" font-size="10" font-weight="900" fill="#7a4a22">집터</text>`) },
    { name: '아늑한 텐트', price: 60, days: 0, stage: 0,
      art: () => S('0 0 140 140', `<ellipse cx="70" cy="128" rx="58" ry="9" fill="#2f7a2a" opacity=".35"/>
        <path d="M70 34 L16 124 L124 124Z" fill="url(#vTentA)" ${O}/><path d="M70 34 L104 124 L124 124Z" fill="#d85a10" ${O}/>${[0, 1, 2].map(i => `<path d="M${70 - 10 - i * 14} ${52 + i * 24} L${70 + 8 + i * 9} ${52 + i * 24}" stroke="#fff3d0" stroke-width="5" opacity=".7"/>`).join('')}
        <path d="M70 70 L52 124 L88 124Z" fill="#7a3a10" ${O2}/><path d="M70 70 L60 124 L70 112Z" fill="#ffb04a" ${O2}/><path d="M70 34 L70 18" stroke="#3b2314" stroke-width="3"/><path class="wave" d="M70 18 L88 23 L70 28Z" fill="#ff5a8a" ${O2}/>
        ${flowerPot(30, 116)}${bush(116, 124)}`) },
    { name: '통나무 오두막', price: 180, days: 3, stage: 0,
      art: () => { const b = box({ H: 40, R: 24, wall: 'url(#vLog)', side: 'url(#vLogS)', roof: 'url(#vRoofG)' }); return S('0 0 140 140', `<ellipse cx="72" cy="128" rx="60" ry="8" fill="#2f7a2a" opacity=".35"/>${b.svg}
        ${[.2, .4, .6, .8].map(v => `<path d="M${pts([b.fp(0, v)])} L${pts([b.fp(1, v)])} M${pts([b.sp(0, v)])} L${pts([b.sp(1, v)])}" stroke="#7a4a22" stroke-width="1.6" opacity=".7"/>`).join('')}
        ${door(b.fp, .38, .62, .62)}${win(b.sp, .3, .7, .35, .75, true)}${chimney(100, 70)}${bush(18, 122)}${flowerPot(84, 132, '#ffd84a')}`); } },
    { name: '빨간 사과 지붕 집', price: 350, days: 6, stage: 1,
      art: () => { const b = box({ H: 46, R: 30, roof: 'url(#vRoofR)' }); return S('0 0 140 140', `<ellipse cx="72" cy="128" rx="60" ry="8" fill="#2f7a2a" opacity=".35"/>${b.svg}
        ${door(b.fp, .4, .62, .6)}${win(b.fp, .1, .3, .4, .75, true)}${win(b.fp, .72, .92, .4, .75, true)}${win(b.sp, .3, .7, .4, .78)}
        <path d="M${b.apex[0] + 2} ${b.apex[1] - 1} q2 -10 8 -14" stroke="#3b2314" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M${b.apex[0] + 6} ${b.apex[1] - 11} q10 -8 16 2 q-10 4 -16 -2Z" fill="#6ec84a" ${O2}/>
        ${flowerPot(16, 122)}${flowerPot(126, 112, '#ffd84a')}<path d="M30 132 Q60 136 72 132" stroke="#e8d4a0" stroke-width="8" stroke-linecap="round"/>`); } },
    { name: '2층 나무집', price: 600, days: 10, stage: 1,
      art: () => { const b = box({ H: 70, R: 28, roof: 'url(#vRoofB)', wall: 'url(#vBlueW)', side: 'url(#vBlueWS)' }); return S('0 -10 140 150', `<ellipse cx="72" cy="128" rx="60" ry="8" fill="#2f7a2a" opacity=".35"/>${b.svg}
        ${door(b.fp, .4, .6, .36)}${win(b.fp, .1, .3, .14, .36, true)}${win(b.fp, .72, .92, .14, .36, true)}${win(b.fp, .14, .4, .56, .8)}${win(b.fp, .6, .86, .56, .8)}${win(b.sp, .3, .7, .2, .4)}${win(b.sp, .3, .7, .58, .82, true)}
        ${quad(b.fp, .05, .95, .47, .52, 'url(#vLog)')}${[.1, .25, .4, .55, .7, .85].map(u => `<path d="M${pts([b.fp(u, .47)])} L${pts([b.fp(u, .44)])}" stroke="#3b2314" stroke-width="1.5"/>`).join('')}
        ${chimney(98, 36)}${appleTree(14, 130, .8)}${flowerPot(122, 116)}`); } },
    { name: '애플 궁전', price: 1000, days: 15, stage: 2,
      art: () => S('0 -24 140 164', `<ellipse cx="70" cy="128" rx="64" ry="9" fill="#2f7a2a" opacity=".35"/>
        ${[[14, 50], [104, 50]].map(([x, y]) => `<rect x="${x}" y="${y}" width="22" height="76" fill="url(#vStone)" ${O}/><path d="M${x - 4} ${y} L${x + 11} ${y - 36} L${x + 26} ${y}Z" fill="url(#vRoofR)" ${O}/><path d="M${x + 11} ${y - 36} l0 -8" stroke="#3b2314" stroke-width="2"/><circle cx="${x + 11}" cy="${y - 46}" r="4" fill="url(#vAppleY)" ${O2}/><path d="M${x + 6} ${y + 20} h10 v12 h-10Z" fill="url(#vWarm)" ${O2}/>`).join('')}
        <rect x="34" y="62" width="72" height="64" fill="url(#vStone)" ${O}/>${[34, 46, 58, 70, 82, 94].map(x => `<rect x="${x}" y="54" width="8" height="9" fill="url(#vStone)" ${O2}/>`).join('')}
        <rect x="52" y="20" width="36" height="44" fill="url(#vStone)" ${O}/><path d="M46 20 L70 -16 L94 20Z" fill="url(#vRoofY)" ${O}/><path d="M70 -16 l0 -10" stroke="#3b2314" stroke-width="2"/><path class="wave" d="M70 -26 l14 4 l-14 4Z" fill="#ff5a6a" ${O2}/>
        <circle cx="70" cy="40" r="9" fill="url(#vAppleR)" ${O2}/><path d="M70 31 q2 -5 5 -6" stroke="#3b2314" stroke-width="1.6" fill="none"/>
        <path d="M58 126 L58 98 Q70 84 82 98 L82 126Z" fill="url(#vDoor)" ${O}/><path d="M70 90 L70 126" stroke="#3b2314" stroke-width="1.5"/>${[[40, 76], [90, 76]].map(([x, y]) => `<path d="M${x} ${y} h10 v14 h-10Z" fill="url(#vWarm)" ${O2}/>`).join('')}
        ${spark(124, 0, 6, 'tw', '#fff')}${spark(16, 8, 5, 'tw d1', '#fff')}${flowerPot(30, 128)}${flowerPot(110, 128, '#ffd84a')}`) },
  ];

  /* ---------- 마을 건물 (단원을 마치면 열림) ---------- */
  const BUILDINGS = [
    { unit: 1, key: 'florist', name: '꽃가게', price: 80, x: 15, y: 58, w: 96,
      art: () => { const b = box({ H: 40, R: 20, wall: 'url(#vPinkW)', side: 'url(#vPinkWS)', roof: 'url(#vRoofPk)' }); return S('0 0 140 140', `${b.svg}${door(b.fp, .58, .8, .58)}${win(b.fp, .12, .46, .25, .62)}${awning(b.fp, .06, .52, .8, '#ff6aa8', '#fff')}${win(b.sp, .3, .7, .35, .72)}
        ${sign(b.fp, .5, .92, `<circle cx="0" cy="0" r="5" fill="#ff6aa8"/>${[0, 72, 144, 216, 288].map(a => `<circle cx="${(6 * Math.cos(a * Math.PI / 180)).toFixed(1)}" cy="${(6 * Math.sin(a * Math.PI / 180)).toFixed(1)}" r="3.4" fill="#ffb0d0"/>`).join('')}<circle r="2.4" fill="#ffd84a"/>`)}
        ${flowerPot(12, 120)}${flowerPot(28, 126, '#ffd84a')}${flowerPot(46, 130, '#b07aff')}`); } },
    { unit: 2, key: 'bakery', name: '빵집', price: 100, x: 85, y: 58, w: 96,
      art: () => { const b = box({ H: 42, R: 22, wall: 'url(#vCream)', side: 'url(#vCreamS)', roof: 'url(#vRoofBr)' }); return S('0 0 140 140', `${b.svg}${door(b.fp, .4, .62, .6)}${win(b.fp, .08, .32, .3, .62, true)}${win(b.fp, .7, .94, .3, .62, true)}${awning(b.fp, .04, .96, .8, '#ffb04a', '#fff')}${win(b.sp, .3, .7, .35, .72, true)}
        ${chimney(102, 68)}${sign(b.fp, .5, .95, `<path d="M-9 4 Q-10 -6 0 -6 Q10 -6 9 4Z" fill="url(#vPie)" stroke="#3b2314" stroke-width="1.4"/><path d="M-4 -4 l2 6 M1 -5 l2 6" stroke="#a85a1a" stroke-width="1.5"/>`)}`); } },
    { unit: 3, key: 'post', name: '우체국', price: 120, x: 30, y: 50, w: 92,
      art: () => { const b = box({ H: 44, R: 22, wall: 'url(#vCream)', side: 'url(#vCreamS)', roof: 'url(#vRoofR)' }); return S('0 0 140 140', `${b.svg}${door(b.fp, .4, .62, .6, 'url(#vRoofB)')}${win(b.fp, .1, .3, .35, .7)}${win(b.fp, .72, .92, .35, .7)}${win(b.sp, .3, .7, .35, .72)}
        ${sign(b.fp, .5, .9, `<rect x="-9" y="-6" width="18" height="12" rx="1.5" fill="#fff" stroke="#3b2314" stroke-width="1.4"/><path d="M-9 -6 L0 2 L9 -6" fill="none" stroke="#3b2314" stroke-width="1.4"/><circle cx="0" cy="2" r="2" fill="#f0443a"/>`)}
        <rect x="120" y="104" width="12" height="16" rx="5" fill="url(#vBarn)" ${O2}/><path d="M126 120 L126 130" stroke="#3b2314" stroke-width="3"/><rect x="122" y="109" width="8" height="2.5" fill="#3b2314"/>`); } },
    { unit: 4, key: 'playground', name: '놀이터', price: 140, x: 28, y: 76, w: 100,
      art: () => S('0 0 140 140', `<ellipse cx="70" cy="122" rx="62" ry="14" fill="#e8d4a0" ${O2}/>
        <path d="M18 120 L28 60 M52 120 L42 60 M24 60 L46 60" stroke="#3b2314" stroke-width="6" stroke-linecap="round"/><path d="M18 120 L28 60 M52 120 L42 60 M24 60 L46 60" stroke="#ff8a4a" stroke-width="3" stroke-linecap="round"/>
        <path d="M30 60 L30 92 M40 60 L40 92" stroke="#3b2314" stroke-width="1.5"/><rect x="26" y="92" width="18" height="5" rx="2" fill="#3a8af0" ${O2}/>
        <path d="M78 120 L78 64 L94 64 L94 120" fill="none" stroke="#3b2314" stroke-width="5"/><path d="M78 120 L78 64 L94 64 L94 120" fill="none" stroke="#5ac87a" stroke-width="2.5"/>${[74, 86, 98, 110].map(y => `<path d="M78 ${y} L94 ${y}" stroke="#3b2314" stroke-width="2"/>`).join('')}
        <path d="M94 64 Q118 84 128 118 L118 120 Q110 90 92 72Z" fill="url(#vRoofY)" ${O}/><path d="M76 64 L86 52 L96 64Z" fill="url(#vRoofR)" ${O2}/>`) },
    { unit: 5, key: 'library', name: '도서관', price: 180, x: 70, y: 50, w: 100,
      art: () => { const b = box({ H: 48, R: 18, wall: 'url(#vStone)', side: 'url(#vStoneS)', roof: 'url(#vRoofB)' }); return S('0 0 140 140', `${b.svg}${[.08, .3, .7, .92].map(u => `${quad(b.fp, u - .04, u + .04, 0, .78, 'url(#vCream)')}`).join('')}${door(b.fp, .4, .6, .62, 'url(#vRoofB)')}${win(b.fp, .14, .26, .3, .66)}${win(b.fp, .74, .86, .3, .66)}${win(b.sp, .3, .7, .35, .75, true)}
        ${sign(b.fp, .5, .9, `<path d="M0 -6 Q-5 -8 -10 -6 L-10 6 Q-5 4 0 6 Q5 4 10 6 L10 -6 Q5 -8 0 -6Z" fill="#fff" stroke="#3b2314" stroke-width="1.3"/><path d="M0 -6 L0 6" stroke="#3b2314" stroke-width="1.3"/><text x="-8" y="2" font-size="5" font-weight="900" fill="#3a72d8">ABC</text>`)}`); } },
    { unit: 6, key: 'fountain', name: '분수 광장', price: 200, x: 50, y: 100, w: 70,
      art: () => S('0 0 140 140', `<ellipse cx="70" cy="114" rx="66" ry="20" fill="url(#vStone)" ${O2}/>${Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return `<path d="M${(70 + 66 * Math.cos(a)).toFixed(1)} ${(114 + 20 * Math.sin(a)).toFixed(1)} L${(70 + 48 * Math.cos(a)).toFixed(1)} ${(114 + 14 * Math.sin(a)).toFixed(1)}" stroke="#a0968a" stroke-width="1.2"/>`; }).join('')}
        <ellipse cx="70" cy="112" rx="40" ry="11" fill="url(#vStoneS)" ${O}/><ellipse cx="70" cy="110" rx="34" ry="8" fill="url(#vGlass)"/>
        <path d="M64 110 L66 76 L74 76 L76 110Z" fill="url(#vStone)" ${O2}/><ellipse cx="70" cy="76" rx="20" ry="6" fill="url(#vStone)" ${O}/><ellipse cx="70" cy="75" rx="16" ry="4" fill="url(#vGlass)"/>
        <circle cx="70" cy="60" r="9" fill="url(#vAppleR)" ${O2}/><path d="M70 51 q2 -5 6 -6" stroke="#3b2314" stroke-width="1.6" fill="none"/>
        <g class="v-spray" fill="none" stroke="#bdf0ff" stroke-width="2.5" stroke-linecap="round"><path d="M70 52 Q56 40 50 74"/><path d="M70 52 Q84 40 90 74"/><path d="M52 78 Q44 88 40 106"/><path d="M88 78 Q96 88 100 106"/></g>
        ${bush(10, 122)}${bush(132, 120)}${flowerPot(30, 132)}${flowerPot(110, 132, '#ffd84a')}`) },
    { unit: 7, key: 'farm', name: '사과 농장', price: 240, x: 11, y: 84, w: 96,
      art: () => { const b = box({ x0: 50, xm: 92, x1: 128, yb: 108, dl: 8, dr: 12, H: 34, R: 20, wall: 'url(#vBarn)', side: 'url(#vBarnS)', roof: 'url(#vRoofBr)' }); return S('0 0 140 140', `${b.svg}${quad(b.fp, .3, .7, 0, .62, '#fff')}${quad(b.fp, .34, .66, 0, .56, 'url(#vBarnS)')}<path d="M${pts([b.fp(.34, 0)])} L${pts([b.fp(.66, .56)])} M${pts([b.fp(.66, 0)])} L${pts([b.fp(.34, .56)])}" stroke="#fff" stroke-width="2"/>
        ${appleTree(18, 100, .9)}${appleTree(40, 118, 1)}${appleTree(16, 134, .8)}
        ${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<path d="M${54 + i * 11} ${130 - i * 2.5} l0 -12" stroke="#3b2314" stroke-width="3.5"/><path d="M${54 + i * 11} ${130 - i * 2.5} l0 -12" stroke="#f0dcb4" stroke-width="2"/>`).join('')}<path d="M54 122 L131 104 M54 127 L131 109" stroke="#f0dcb4" stroke-width="2.5"/>
        ${[[70, 124], [86, 120], [104, 116]].map(([x, y]) => `<circle cx="${x}" cy="${y - 4}" r="4" fill="url(#vAppleR)" ${O2.replace('2"', '1.2"')}/>`).join('')}`); } },
    { unit: 8, key: 'school', name: '영어 학교', price: 280, x: 88, y: 83, w: 100,
      art: () => { const b = box({ H: 46, R: 18, wall: 'url(#vCream)', side: 'url(#vCreamS)', roof: 'url(#vRoofR)' }); return S('0 -26 140 166', `${b.svg}${door(b.fp, .4, .62, .58)}${[.06, .22, .74, .9].map(u => win(b.fp, u, u + .1, .4, .74)).join('')}${win(b.sp, .15, .4, .4, .74)}${win(b.sp, .6, .85, .4, .74)}
        <path d="M${b.apex[0] - 30} ${b.apex[1] + 6} l0 -34 l16 -4 l0 34" fill="url(#vCream)" ${O2}/><path d="M${b.apex[0] - 34} ${b.apex[1] - 28} L${b.apex[0] - 22} ${b.apex[1] - 48} L${b.apex[0] - 10} ${b.apex[1] - 32}Z" fill="url(#vRoofR)" ${O2}/>
        <circle cx="${b.apex[0] - 22}" cy="${b.apex[1] - 16}" r="5" fill="url(#vAppleY)" ${O2}/>
        ${sign(b.fp, .5, .88, `<text x="0" y="3" text-anchor="middle" font-family="Arial Black,Arial" font-size="8" font-weight="900" fill="#d03828">ABC</text>`)}
        <path d="M14 128 L14 92" stroke="#3b2314" stroke-width="2.5"/><path class="wave" d="M14 92 L32 96 L14 101Z" fill="#3a8af0" ${O2}/>`); } },
    { unit: 9, key: 'clock', name: '시계탑', price: 320, x: 66, y: 72, w: 70,
      art: () => S('0 -20 100 160', `<path d="M30 132 L30 40 L70 40 L70 132Z" fill="url(#vStone)" ${O}/><path d="M70 40 L82 34 L82 126 L70 132Z" fill="url(#vStoneS)" ${O}/>
        <path d="M24 42 L50 4 L76 42Z" fill="url(#vRoofB)" ${O}/><path d="M76 42 L50 4 L86 36Z" fill="#2a5ab0" ${O}/><circle cx="50" cy="0" r="4" fill="url(#vAppleY)" ${O2}/>
        <circle cx="50" cy="62" r="15" fill="#fffaf0" ${O}/>${Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return `<circle cx="${(50 + 11.5 * Math.cos(a)).toFixed(1)}" cy="${(62 + 11.5 * Math.sin(a)).toFixed(1)}" r="1" fill="#3b2314"/>`; }).join('')}
        <path d="M50 62 L50 52 M50 62 L57 65" stroke="#3b2314" stroke-width="2.4" stroke-linecap="round"/><path d="M42 132 L42 104 Q50 94 58 104 L58 132Z" fill="url(#vDoor)" ${O2}/><path d="M38 82 h24" stroke="#a0968a" stroke-width="2"/>`) },
    { unit: 10, key: 'station', name: '꼬마 기차역', price: 360, x: 17, y: 99, w: 96,
      art: () => { const b = box({ x0: 8, xm: 60, x1: 104, yb: 104, dl: 10, dr: 14, H: 34, R: 16, wall: 'url(#vBlueW)', side: 'url(#vBlueWS)', roof: 'url(#vRoofG)' }); return S('0 0 140 140', `${b.svg}${door(b.fp, .38, .62, .66)}${win(b.fp, .08, .3, .35, .7)}${win(b.fp, .7, .92, .35, .7)}
        <path d="M2 136 L138 112 M2 128 L138 104" stroke="#7a4a22" stroke-width="2.5"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${6 + i * 15} ${133 - i * 2.6} l2 -9" stroke="#a86a38" stroke-width="3"/>`).join('')}
        <g class="v-train"><path d="M70 122 L70 104 L96 99 L96 117Z" fill="url(#vBarn)" ${O2}/><path d="M96 117 L96 99 L126 94 L126 112Z" fill="url(#vRoofY)" ${O2}/><path d="M74 104 L74 94 L84 92 L84 102Z" fill="url(#vBarn)" ${O2}/><circle cx="78" cy="122" r="4" fill="#3b2314"/><circle cx="90" cy="120" r="4" fill="#3b2314"/><circle cx="104" cy="117" r="4" fill="#3b2314"/><circle cx="118" cy="115" r="4" fill="#3b2314"/>${cuteFace(83, 110, .7)}</g>`); } },
    { unit: 11, key: 'hall', name: '애플 마을 회관', price: 440, x: 84, y: 99, w: 98,
      art: () => { const b = box({ H: 52, R: 26, wall: 'url(#vCream)', side: 'url(#vCreamS)', roof: 'url(#vRoofP)' }); return S('0 -16 140 156', `${b.svg}${[.1, .3, .7, .9].map(u => quad(b.fp, u - .04, u + .04, 0, .8, 'url(#vStone)')).join('')}${door(b.fp, .4, .6, .6, 'url(#vRoofP)')}${win(b.sp, .3, .7, .4, .78, true)}
        ${quad(b.fp, .15, .85, .84, .98, '#ffd84a')}<text x="${b.fp(.5, .9)[0].toFixed(1)}" y="${(b.fp(.5, .9)[1] + 2).toFixed(1)}" text-anchor="middle" font-size="7" font-weight="900" fill="#7a4ad0" transform="rotate(11 ${b.fp(.5, .9)[0].toFixed(1)} ${b.fp(.5, .9)[1].toFixed(1)})">APPLE TOWN</text>
        <path d="M${b.apex[0]} ${b.apex[1]} l0 -14" stroke="#3b2314" stroke-width="2"/><path class="wave" d="M${b.apex[0]} ${b.apex[1] - 14} l14 4 l-14 4Z" fill="#ff5a8a" ${O2}/>${spark(14, 30, 6, 'tw', '#fff')}`); } },
  ];

  // 마을 주민(작은 사과 친구들)
  const villager = (g, k = 0) => `<svg viewBox="-20 -34 40 44" aria-hidden="true"><path d="M-5 4 l-2 6 M5 4 l2 6" stroke="#3b2314" stroke-width="2.5" stroke-linecap="round"/><path d="M0 -20 C-12 -28 -18 -12 -16 -2 C-14 8 -6 10 0 7 C6 10 14 8 16 -2 C18 -12 12 -28 0 -20Z" fill="url(#${g})" ${O2}/><path d="M0 -20 q1 -6 5 -8" stroke="#3b2314" stroke-width="1.6" fill="none"/><path d="M3 -26 q7 -5 10 1 q-6 2 -10 -1Z" fill="#6ec84a" ${O2.replace('2"', '1.2"')}/>${cuteFace(0, -8, .8)}<ellipse cx="-8" cy="-14" rx="2.5" ry="4" ${HL}/></svg>`;
  const VILLAGERS = ['vAppleG', 'vAppleY', 'vAppleR'];

  const HOUSE_SPOT = { x: 50, y: 66, w: 150 };
  root.AQ_VILLAGE = { DEFS, FOODS, HOUSES, BUILDINGS, HOUSE_SPOT, villager, VILLAGERS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
