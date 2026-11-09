/* 꾸미기 상점 — 아이템 목록과 캐릭터 위에 입히는 그림(SVG) */
(function (root) {
  'use strict';
  // 캐릭터 그림(px)별 부위 위치: [x, y, 폭]
  const SPR = [
    { w: 298, h: 352, face: [190, 160, 104], neck: [182, 242, 112], back: [180, 252, 170], hand: [98, 262, 1.0], pin: [106, 96, .9], aura: [176, 210, 330] },
    { w: 279, h: 263, face: [142, 92, 90], neck: [141, 130, 74], back: [141, 150, 150], hand: [104, 152, .72], pin: [96, 58, .7], aura: [140, 140, 270] },
    { w: 295, h: 341, face: [94, 116, 132], neck: [100, 186, 84], back: [104, 236, 170], hand: [24, 214, .9], pin: [44, 92, .8], aura: [120, 180, 330] },
  ];
  const SLOTS = [
    { key: 'face', name: '얼굴' }, { key: 'neck', name: '목' }, { key: 'back', name: '등' },
    { key: 'hand', name: '손' }, { key: 'pin', name: '머리 장식' }, { key: 'aura', name: '빛 효과' },
  ];
  const DEFS = `<defs>
    <linearGradient id="dGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c0"/><stop offset=".45" stop-color="#ffcf3a"/><stop offset="1" stop-color="#d48a00"/></linearGradient>
    <radialGradient id="dGoldR" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fffde8"/><stop offset=".35" stop-color="#ffd84a"/><stop offset="1" stop-color="#c88200"/></radialGradient>
    <linearGradient id="dRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a7a"/><stop offset=".55" stop-color="#f0443a"/><stop offset="1" stop-color="#c21f2a"/></linearGradient>
    <linearGradient id="dCape" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5a6a"/><stop offset="1" stop-color="#b8142e"/></linearGradient>
    <linearGradient id="dCapeIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a0a24"/><stop offset="1" stop-color="#4a0414"/></linearGradient>
    <linearGradient id="dBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ae0ff"/><stop offset="1" stop-color="#3a8af0"/></linearGradient>
    <linearGradient id="dPurple" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c8a8ff"/><stop offset=".5" stop-color="#8a5cf0"/><stop offset="1" stop-color="#5a32c0"/></linearGradient>
    <linearGradient id="dPink" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd0e8"/><stop offset=".5" stop-color="#ff8ac4"/><stop offset="1" stop-color="#e8509a"/></linearGradient>
    <linearGradient id="dMint" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8f5dc"/><stop offset="1" stop-color="#3ec08e"/></linearGradient>
    <linearGradient id="dCream" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#f0dcb8"/></linearGradient>
    <linearGradient id="dFrame" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d89a5a"/><stop offset=".5" stop-color="#9a5a2a"/><stop offset="1" stop-color="#6a3a1a"/></linearGradient>
    <radialGradient id="dLens" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#ffffff" stop-opacity=".9"/><stop offset=".5" stop-color="#d8f2ff" stop-opacity=".55"/><stop offset="1" stop-color="#8ac8f0" stop-opacity=".6"/></radialGradient>
    <radialGradient id="dDark" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#8a6ad8"/><stop offset=".6" stop-color="#3a2a6a"/><stop offset="1" stop-color="#1a1238"/></radialGradient>
    <linearGradient id="dWood" x1="0" x2="1"><stop offset="0" stop-color="#c88a52"/><stop offset=".5" stop-color="#e8b47a"/><stop offset="1" stop-color="#9a6030"/></linearGradient>
    <radialGradient id="dGem" cx="35%" cy="28%" r="75%"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#ffb8e0"/><stop offset=".75" stop-color="#ff4aa8"/><stop offset="1" stop-color="#b0186a"/></radialGradient>
    <radialGradient id="dGemB" cx="35%" cy="28%" r="75%"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#9ae8ff"/><stop offset="1" stop-color="#2a6ad8"/></radialGradient>
    <linearGradient id="dWingB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe0f4"/><stop offset=".45" stop-color="#ffa8dc"/><stop offset="1" stop-color="#a8c8ff"/></linearGradient>
    <linearGradient id="dWingB2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8d8ff"/><stop offset="1" stop-color="#8ad8ff"/></linearGradient>
    <linearGradient id="dFeather" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#fff4d0"/><stop offset="1" stop-color="#ffcf4a"/></linearGradient>
    <radialGradient id="dGlow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff6c8" stop-opacity=".9"/><stop offset=".5" stop-color="#ffd86a" stop-opacity=".35"/><stop offset="1" stop-color="#ffd86a" stop-opacity="0"/></radialGradient>
  </defs>`;
  const O = 'stroke="#3b2314" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
  const O2 = 'stroke="#3b2314" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';
  const HL = 'fill="#fff" opacity=".75"';
  const starD = (cx, cy, r, k = .48) => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * k : r; d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(1) + ' ' + (cy + rr * Math.sin(a)).toFixed(1); } return d + 'Z'; };
  const star = (cx, cy, r, fill, extra = '') => `<path d="${starD(cx, cy, r)}" fill="${fill}" ${extra}/>`;
  const spark = (x, y, r, cls = '', c = '#fff8d0') => `<path class="${cls}" d="M${x} ${y - r} Q${x + r * .18} ${y - r * .18} ${x + r} ${y} Q${x + r * .18} ${y + r * .18} ${x} ${y + r} Q${x - r * .18} ${y + r * .18} ${x - r} ${y} Q${x - r * .18} ${y - r * .18} ${x} ${y - r}Z" fill="${c}"/>`;
  const heart = (x, y, r, fill, extra = '') => `<path d="M${x} ${y + r * .9} C${x - r * 1.4} ${y - r * .1} ${x - r * .8} ${y - r * 1.2} ${x} ${y - r * .45} C${x + r * .8} ${y - r * 1.2} ${x + r * 1.4} ${y - r * .1} ${x} ${y + r * .9}Z" fill="${fill}" ${extra}/>`;
  const cuteFace = (x, y, k = 1) => `<circle cx="${x - 5 * k}" cy="${y}" r="${1.8 * k}" fill="#3b2314"/><circle cx="${x + 5 * k}" cy="${y}" r="${1.8 * k}" fill="#3b2314"/><path d="M${x - 2.5 * k} ${y + 3 * k} Q${x} ${y + 5.5 * k} ${x + 2.5 * k} ${y + 3 * k}" stroke="#3b2314" stroke-width="${1.4 * k}" fill="none" stroke-linecap="round"/><ellipse cx="${x - 8.5 * k}" cy="${y + 3.5 * k}" rx="${2.6 * k}" ry="${1.6 * k}" fill="#ff8aa8" opacity=".8"/><ellipse cx="${x + 8.5 * k}" cy="${y + 3.5 * k}" rx="${2.6 * k}" ry="${1.6 * k}" fill="#ff8aa8" opacity=".8"/>`;
  const petal5 = (r, rx, ry, fill, o = O2) => [0, 72, 144, 216, 288].map(a => { const x = (r * Math.cos((a - 90) * Math.PI / 180)).toFixed(1), y = (r * Math.sin((a - 90) * Math.PI / 180)).toFixed(1); return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${a} ${x} ${y})" fill="${fill}" ${o}/>`; }).join('');

  // 그림은 부위 중심 (0,0), 폭 100 기준. 손 장식은 쥐는 곳이 (0,0). tier: 1 일반 · 2 희귀 · 3 전설
  const ITEMS = [
    { id: 'glasses', slot: 'face', name: '동글동글 안경', price: 90, stage: 0, tier: 1,
      svg: `${[-24, 24].map(x => `<circle cx="${x}" cy="0" r="21" fill="url(#dFrame)" ${O}/><circle cx="${x}" cy="0" r="14.5" fill="url(#dLens)" ${O2}/><path d="M${x - 9} -5 Q${x - 6} -10 ${x - 1} -11" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round"/><circle cx="${x + 7}" cy="7" r="2" fill="#fff" opacity=".8"/>`).join('')}
        <path d="M-6 -4 Q0 -10 6 -4" stroke="#3b2314" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M-6 -4 Q0 -10 6 -4" stroke="#b87a42" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <path d="M-44 -6 l-9 -4 M44 -6 l9 -4" stroke="#3b2314" stroke-width="5" stroke-linecap="round"/>` },
    { id: 'starglass', slot: 'face', name: '반짝 별 선글라스', price: 220, stage: 0, tier: 2,
      svg: `${[-26, 26].map(x => `<path d="${starD(x, 0, 27, .52)}" fill="url(#dPink)" ${O}/><path d="${starD(x, 1, 17, .52)}" fill="url(#dDark)" ${O2}/><path d="M${x - 7} -5 l5 -5" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><circle cx="${x + 5}" cy="5" r="1.8" fill="#fff"/>`).join('')}
        <path d="M-8 -6 Q0 -12 8 -6" stroke="#3b2314" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M-8 -6 Q0 -12 8 -6" stroke="#ff8ac4" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        ${spark(48, -22, 7, 'tw', '#fff')}${spark(-50, 18, 5, 'tw d2', '#fff')}` },
    { id: 'mask', slot: 'face', name: '밤하늘 영웅 가면', price: 380, stage: 1, tier: 2,
      svg: `<path d="M-54 -6 l-18 -10 q-4 12 6 16Z M54 -6 l18 -10 q4 12 -6 16Z" fill="url(#dPurple)" ${O2}/>
        <path fill-rule="evenodd" fill="url(#dPurple)" ${O} d="M-56 -4 Q-34 -30 0 -14 Q34 -30 56 -4 Q52 20 24 18 Q8 16 0 6 Q-8 16 -24 18 Q-52 20 -56 -4Z M-38 0 Q-25 -12 -11 -1 Q-24 10 -38 0Z M11 -1 Q25 -12 38 0 Q24 10 11 -1Z"/>
        <path d="M-46 -10 Q-30 -22 -12 -14" stroke="#fff" stroke-width="3" opacity=".6" fill="none" stroke-linecap="round"/>${star(0, -6, 6, 'url(#dGold)', O2)}` },
    { id: 'bowtie', slot: 'neck', name: '물방울 나비넥타이', price: 80, stage: 0, tier: 1,
      svg: `<path d="M-6 -7 C-24 -24 -46 -26 -48 -10 C-50 4 -48 22 -30 22 C-20 22 -12 12 -6 7Z" fill="url(#dRed)" ${O}/><path d="M6 -7 C24 -24 46 -26 48 -10 C50 4 48 22 30 22 C20 22 12 12 6 7Z" fill="url(#dRed)" ${O}/>
        ${[[-34, -8], [-22, 8], [-40, 10], [34, -8], [22, 8], [40, 10]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="#fff" opacity=".9"/>`).join('')}
        <path d="M-30 -12 Q-20 -2 -12 0 M30 -12 Q20 -2 12 0" stroke="#a01020" stroke-width="2" fill="none" opacity=".6"/>
        <rect x="-11" y="-12" width="22" height="24" rx="8" fill="url(#dRed)" ${O}/><path d="M-6 -6 q4 -3 9 -1" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".8"/>` },
    { id: 'scarf', slot: 'neck', name: '폭신 민트 목도리', price: 150, stage: 0, tier: 1,
      svg: `<path d="M14 6 L22 56 Q16 60 6 58 L2 10Z" fill="url(#dMint)" ${O}/>${[22, 34, 46].map(y => `<path d="M${4 + y * .06} ${y} L${19 + y * .05} ${y - 2}" stroke="#fffaf0" stroke-width="5"/>`).join('')}
        ${[6, 11, 16, 21].map(x => `<path d="M${x} 58 l-1 9" stroke="#3ec08e" stroke-width="3.5" stroke-linecap="round"/>`).join('')}
        <path d="M-52 -12 Q0 14 52 -12 Q56 4 50 12 Q0 36 -50 12 Q-56 4 -52 -12Z" fill="url(#dMint)" ${O}/>
        ${[-36, -18, 0, 18, 36].map(x => `<path d="M${x - 4} ${1 + Math.abs(x) * -.12 + 4} q4 6 8 0" stroke="#fffaf0" stroke-width="3" fill="none" opacity=".85"/>`).join('')}
        <path d="M-40 -6 Q-10 8 20 2" stroke="#fff" stroke-width="3" opacity=".55" fill="none" stroke-linecap="round"/>` },
    { id: 'medal', slot: 'neck', name: '1등 금메달', price: 450, stage: 1, tier: 2,
      svg: `<path d="M-30 -16 L-6 28 L8 28 L-14 -16Z" fill="#3a8af0" ${O2}/><path d="M30 -16 L6 28 L-8 28 L14 -16Z" fill="#f0443a" ${O2}/><path d="M-22 -16 L-2 24 M22 -16 L2 24" stroke="#fff" stroke-width="3" opacity=".8"/>
        <circle cx="0" cy="46" r="22" fill="url(#dGoldR)" ${O}/><circle cx="0" cy="46" r="15" fill="none" stroke="#c88200" stroke-width="2"/>${star(0, 46, 10, '#fff3a0', 'stroke="#c88200" stroke-width="1.5"')}
        <path d="M-12 34 Q-6 28 2 28" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round"/>${spark(20, 30, 6, 'tw', '#fff')}` },
    { id: 'necklace', slot: 'neck', name: '왕실 하트 보석 목걸이', price: 700, stage: 2, tier: 3,
      svg: `<path d="M-50 -12 Q0 36 50 -12" stroke="#3b2314" stroke-width="8" fill="none" stroke-linecap="round"/>${Array.from({ length: 11 }, (_, i) => { const t = i / 10, x = -50 + 100 * t, y = -12 + 48 * t * (1 - t) * 2 - 0; return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="url(#dGoldR)" ${O2.replace('2"', '1.5"')}/>`; }).join('')}
        ${heart(0, 30, 16, 'url(#dGem)', O)}<path d="M-8 20 q4 -5 9 -3" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M0 18 L0 42 M-12 26 L12 26" stroke="#fff" stroke-width="1" opacity=".35"/>
        <circle cx="0" cy="30" r="30" fill="url(#dGlow)" opacity=".7"/>${spark(18, 14, 6, 'tw', '#fff')}${spark(-20, 42, 4, 'tw d1', '#fff')}` },
    { id: 'cape', slot: 'back', name: '용사의 빨간 망토', price: 250, stage: 0, tier: 1,
      svg: `<path d="M-30 -40 Q-48 10 -58 48 Q-30 58 0 54 Q30 58 58 48 Q48 10 30 -40Z" fill="url(#dCapeIn)" ${O}/>
        <path d="M-30 -40 Q-50 10 -62 46 Q-50 54 -40 50 Q-34 10 -20 -34Z M30 -40 Q50 10 62 46 Q50 54 40 50 Q34 10 20 -34Z" fill="url(#dCape)" ${O}/>
        <path d="M-52 30 Q-46 8 -36 -16 M52 30 Q46 8 36 -16" stroke="#fff" stroke-width="3" opacity=".45" fill="none" stroke-linecap="round"/>
        <path d="M-34 -44 Q0 -30 34 -44 L32 -34 Q0 -20 -32 -34Z" fill="url(#dGold)" ${O2}/>` },
    { id: 'bwings', slot: 'back', name: '꿈빛 나비 날개', price: 500, stage: 1, tier: 2,
      svg: `${[1, -1].map(m => `<g class="flap ${m < 0 ? 'r' : ''}" transform="scale(${m} 1)"><path d="M-6 -4 C-30 -70 -92 -62 -86 -22 C-82 0 -40 6 -6 2Z" fill="url(#dWingB)" ${O}/><path d="M-6 6 C-40 14 -70 34 -58 56 C-44 70 -16 44 -4 12Z" fill="url(#dWingB2)" ${O}/>
        <path d="M-10 -2 Q-44 -30 -70 -34 M-10 -2 Q-50 -10 -78 -16 M-8 8 Q-30 26 -48 44" stroke="#fff" stroke-width="2" opacity=".7" fill="none"/><circle cx="-62" cy="-30" r="7" fill="#fff" opacity=".85"/><circle cx="-44" cy="40" r="5" fill="#fff" opacity=".85"/>${heart(-74, -8, 5, '#ff5aa8')}</g>`).join('')}` },
    { id: 'gwings', slot: 'back', name: '황금 천사 날개', price: 1000, stage: 2, tier: 3,
      svg: `<circle cx="0" cy="-10" r="70" fill="url(#dGlow)" opacity=".6"/>${[1, -1].map(m => `<g class="flap ${m < 0 ? 'r' : ''}" transform="scale(${m} 1)">${[0, 1, 2, 3, 4].map(i => `<path d="M-4 ${-16 + i * 9} C${-30 - i * 4} ${-56 + i * 10} ${-78 + i * 8} ${-62 + i * 18} ${-100 + i * 14} ${-46 + i * 22} C${-76 + i * 10} ${-24 + i * 16} ${-40 + i * 4} ${-6 + i * 10} -4 ${0 + i * 9}Z" fill="url(#dFeather)" ${O2}/>`).join('')}<path d="M-20 -30 Q-50 -48 -78 -48" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></g>`).join('')}${spark(-80, -60, 7, 'tw', '#fff')}${spark(84, -40, 6, 'tw d1', '#fff')}` },
    { id: 'balloon', slot: 'hand', name: '사과 풍선', price: 120, stage: 0, tier: 1,
      svg: `<path d="M0 0 Q-14 -24 -6 -48 Q2 -70 -18 -92 Q-30 -106 -40 -118" stroke="#3b2314" stroke-width="2" fill="none"/><g class="bob">
        <path d="M-40 -118 C-74 -116 -80 -160 -62 -176 C-52 -184 -44 -180 -40 -176 C-36 -180 -28 -184 -18 -176 C0 -160 -6 -116 -40 -118Z" fill="url(#dRed)" ${O}/>
        <path d="M-40 -176 Q-38 -190 -32 -196" stroke="#3b2314" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M-36 -186 Q-22 -198 -14 -186 Q-24 -180 -36 -186Z" fill="#6ec84a" ${O2}/>
        <ellipse cx="-58" cy="-158" rx="6" ry="11" transform="rotate(20 -58 -158)" ${HL}/><circle cx="-50" cy="-138" r="2.5" fill="#fff" opacity=".7"/>
        <path d="M-44 -118 l4 6 l4 -6Z" fill="#c21f2a" ${O2}/></g>` },
    { id: 'flag', slot: 'hand', name: 'ABC 응원 깃발', price: 180, stage: 0, tier: 1,
      svg: `<path d="M0 10 L0 -92" stroke="#3b2314" stroke-width="8" stroke-linecap="round"/><path d="M0 10 L0 -92" stroke="url(#dWood)" stroke-width="4.5" stroke-linecap="round"/>
        <path class="wave" d="M-2 -90 Q-34 -96 -70 -82 Q-50 -72 -66 -58 Q-34 -66 -2 -56Z" fill="url(#dBlue)" ${O}/><text x="-56" y="-66" font-family="Arial Black,Arial" font-weight="900" font-size="15" fill="#fff" stroke="#1a4aa8" stroke-width=".8">ABC</text>
        ${star(-14, -84, 4, '#ffe14a')}<circle cx="0" cy="-96" r="6" fill="url(#dGoldR)" ${O2}/>` },
    { id: 'wand', slot: 'hand', name: '별님 마법 지팡이', price: 350, stage: 1, tier: 2,
      svg: `<path d="M0 8 L-18 -62" stroke="#3b2314" stroke-width="9" stroke-linecap="round"/><path d="M0 8 L-18 -62" stroke="url(#dPink)" stroke-width="5" stroke-linecap="round"/>${[-10, -24, -38, -52].map(y => `<path d="M${-3 + y * .26} ${y} l5 -3" stroke="#fff" stroke-width="2" opacity=".85"/>`).join('')}
        <circle cx="-20" cy="-78" r="30" fill="url(#dGlow)"/><path d="${starD(-20, -78, 22, .5)}" fill="url(#dGold)" ${O}/>${cuteFace(-20, -77, .9)}
        <path d="M-16 -58 q-10 6 -14 0 q4 -8 14 0 q10 6 14 0 q-4 -8 -14 0" fill="url(#dPink)" ${O2}/>${spark(-48, -100, 7, 'tw')}${spark(6, -98, 5, 'tw d2')}${spark(-46, -60, 4, 'tw d1')}` },
    { id: 'scepter', slot: 'hand', name: '애플대왕의 황금 왕홀', price: 800, stage: 2, tier: 3,
      svg: `<path d="M0 14 L0 -66" stroke="#3b2314" stroke-width="10" stroke-linecap="round"/><path d="M0 14 L0 -66" stroke="url(#dGold)" stroke-width="6" stroke-linecap="round"/>${[-10, -30, -50].map(y => `<ellipse cx="0" cy="${y}" rx="7" ry="3.5" fill="url(#dGoldR)" ${O2}/>`).join('')}
        <path d="M-22 -70 L-16 -92 L-8 -80 L0 -96 L8 -80 L16 -92 L22 -70Z" fill="url(#dGold)" ${O}/><circle cx="0" cy="-96" r="3" fill="url(#dGemB)"/>
        <circle cx="0" cy="-112" r="34" fill="url(#dGlow)"/>${heart(0, -112, 15, 'url(#dGem)', O)}<path d="M-8 -120 q3 -4 8 -3" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>
        ${spark(24, -132, 7, 'tw', '#fff')}${spark(-26, -124, 5, 'tw d1', '#fff')}${spark(20, -90, 4, 'tw d2', '#fff')}` },
    { id: 'flowerpin', slot: 'pin', name: '벚꽃 머리핀', price: 60, stage: 0, tier: 1,
      svg: `<path d="M6 8 Q18 14 24 6 Q16 0 6 8Z" fill="#6ec84a" ${O2}/>${petal5(11, 9, 12, 'url(#dPink)')}<circle r="7" fill="url(#dGoldR)" ${O2}/>${[0, 120, 240].map(a => `<circle cx="${(3 * Math.cos(a * Math.PI / 180)).toFixed(1)}" cy="${(3 * Math.sin(a * Math.PI / 180)).toFixed(1)}" r="1.2" fill="#c88200"/>`).join('')}<ellipse cx="-4" cy="-16" rx="3" ry="4" ${HL}/>` },
    { id: 'starpin', slot: 'pin', name: '웃는 별 머리핀', price: 140, stage: 0, tier: 1,
      svg: `<path d="${starD(0, 0, 20, .52)}" fill="url(#dGold)" ${O}/>${cuteFace(0, 1, .9)}<path d="M-8 -10 l4 -4" stroke="#fff" stroke-width="3" stroke-linecap="round"/>${spark(20, -18, 6, 'tw')}` },
    { id: 'ribbon', slot: 'pin', name: '분홍 땡땡이 리본', price: 110, stage: 0, tier: 1,
      svg: `<path d="M-3 4 L-12 26 L-6 24 L-3 30Z M3 4 L12 26 L6 24 L3 30Z" fill="url(#dPink)" ${O2}/>
        <path d="M-4 0 C-16 -22 -38 -18 -34 -2 C-32 12 -16 14 -4 4Z M4 0 C16 -22 38 -18 34 -2 C32 12 16 14 4 4Z" fill="url(#dPink)" ${O}/>
        ${[[-24, -8], [-16, 2], [24, -8], [16, 2]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.3" fill="#fff"/>`).join('')}<circle r="6" fill="url(#dPink)" ${O}/><path d="M-26 -12 q6 -4 12 -2" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".8"/>` },
    { id: 'sparkle', slot: 'aura', name: '하트 반짝 효과', price: 480, stage: 1, tier: 2,
      svg: `${[[-44, -36, 9, '#fff6a0'], [44, -30, 7, '#ffffff'], [-50, 18, 6, '#ffd0f0'], [48, 24, 8, '#fff6a0'], [0, -52, 6, '#ffffff'], [-22, 46, 5, '#d0f0ff'], [26, 48, 6, '#ffd0f0']].map(([x, y, r, c], i) => spark(x, y, r, 'tw d' + (i % 3), c)).join('')}${[[-38, -8], [40, -2], [10, -46]].map(([x, y], i) => `<g class="tw d${i}">${heart(x, y, 5, '#ff6ab0', O2.replace('2"', '1.2"'))}</g>`).join('')}` },
    { id: 'rainbow', slot: 'aura', name: '구름 무지개 오라', price: 1200, stage: 2, tier: 3, behind: true,
      svg: `<circle cx="0" cy="0" r="54" fill="url(#dGlow)" opacity=".6"/>${['#ff6a6a', '#ffaa4a', '#ffe14a', '#6ad07a', '#5aaaff', '#9a7aff'].map((c, i) => `<path d="M${-50 + i * 4.5} 12 A${50 - i * 4.5} ${50 - i * 4.5} 0 0 1 ${50 - i * 4.5} 12" stroke="${c}" stroke-width="5" fill="none"/>`).join('')}
        ${[-48, 48].map(x => `<g><circle cx="${x - 8}" cy="14" r="9" fill="#fff" ${O2}/><circle cx="${x + 7}" cy="14" r="10" fill="#fff" ${O2}/><circle cx="${x}" cy="7" r="11" fill="#fff" ${O2}/><path d="M${x - 16} 18 h32" stroke="#fff" stroke-width="6"/></g>`).join('')}${spark(0, -58, 6, 'tw', '#fff')}` },
  ];
  const byId = id => ITEMS.find(x => x.id === id);

  function place(stage, item) {
    const a = SPR[stage][item.slot];
    if (item.slot === 'hand' || item.slot === 'pin') return `<g transform="translate(${a[0]} ${a[1]}) scale(${a[2]})">${item.svg}</g>`;
    const k = a[2] / 100;
    return `<g transform="translate(${a[0]} ${a[1]}) scale(${k})">${item.svg}</g>`;
  }
  // 입은 아이템이 있으면 SVG로 합성해서, 없으면 원래 그림 그대로
  function dressed(stage, src, wear, alt = '', cls = '') {
    const ids = Object.values(wear || {}).map(byId).filter(Boolean);
    if (!ids.length) return `<img class="${cls}" src="${src}" alt="${alt}" draggable="false">`;
    const sp = SPR[stage], pad = 60;
    const back = ids.filter(i => i.slot === 'back' || i.behind), front = ids.filter(i => !(i.slot === 'back' || i.behind));
    return `<svg class="dressed ${cls}" viewBox="${-pad} ${-pad - 50} ${sp.w + pad * 2} ${sp.h + pad + 50}" preserveAspectRatio="xMidYMax meet" role="img" aria-label="${alt}">${DEFS}
      ${back.map(i => place(stage, i)).join('')}<image href="${src}" x="0" y="0" width="${sp.w}" height="${sp.h}"/>${front.map(i => place(stage, i)).join('')}</svg>`;
  }
  // 상점 진열용 작은 그림
  function icon(item) {
    const vb = item.slot === 'hand' ? (item.id === 'balloon' ? '-95 -205 110 215' : '-80 -150 110 170') : item.slot === 'back' ? '-108 -78 216 150' : item.slot === 'aura' ? '-60 -60 120 120' : item.slot === 'pin' ? '-40 -32 80 66' : item.slot === 'neck' ? '-62 -30 124 104' : '-78 -40 156 80';
    return `<svg viewBox="${vb}" aria-hidden="true">${DEFS}${item.svg}</svg>`;
  }
  const TIERS = ['', '일반', '희귀', '전설'];
  root.AQ_SHOP = { ITEMS, SLOTS, TIERS, byId, dressed, icon, DEFS, O, O2, HL, star, starD, spark, heart, cuteFace, petal5 };
  if (typeof module !== 'undefined') module.exports = root.AQ_SHOP;
})(typeof globalThis !== 'undefined' ? globalThis : this);
