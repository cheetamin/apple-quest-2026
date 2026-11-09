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
    <linearGradient id="dGold" x1="0" x2="1"><stop offset="0" stop-color="#8a5a00"/><stop offset=".35" stop-color="#ffe680"/><stop offset=".5" stop-color="#fff8d0"/><stop offset=".7" stop-color="#f0b820"/><stop offset="1" stop-color="#7a4a00"/></linearGradient>
    <radialGradient id="dGoldR" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fffbe0"/><stop offset=".4" stop-color="#ffd23a"/><stop offset="1" stop-color="#9a6400"/></radialGradient>
    <linearGradient id="dRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a6a"/><stop offset=".5" stop-color="#e2302a"/><stop offset="1" stop-color="#8a1010"/></linearGradient>
    <linearGradient id="dCape" x1="0" x2="1"><stop offset="0" stop-color="#7a0c18"/><stop offset=".45" stop-color="#e83a4a"/><stop offset="1" stop-color="#6a0a14"/></linearGradient>
    <linearGradient id="dBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ad0ff"/><stop offset="1" stop-color="#2a6ad0"/></linearGradient>
    <radialGradient id="dGem" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#7ad8ff"/><stop offset="1" stop-color="#1a4aa8"/></radialGradient>
    <radialGradient id="dPinkGem" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#ff9ad8"/><stop offset="1" stop-color="#a01a6a"/></radialGradient>
    <linearGradient id="dWingB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd0f0" stop-opacity=".95"/><stop offset=".5" stop-color="#b08aff" stop-opacity=".85"/><stop offset="1" stop-color="#6ad0ff" stop-opacity=".8"/></linearGradient>
    <linearGradient id="dScarf" x1="0" x2="1"><stop offset="0" stop-color="#2a8a4a"/><stop offset=".5" stop-color="#5ad07a"/><stop offset="1" stop-color="#1f6a3a"/></linearGradient>
    <radialGradient id="dGlow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff6c8" stop-opacity=".9"/><stop offset=".5" stop-color="#ffd86a" stop-opacity=".35"/><stop offset="1" stop-color="#ffd86a" stop-opacity="0"/></radialGradient>
  </defs>`;
  const star = (cx, cy, r, fill, extra = '') => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(1) + ' ' + (cy + rr * Math.sin(a)).toFixed(1); } return `<path d="${d}Z" fill="${fill}" ${extra}/>`; };
  const spark = (x, y, r, cls = '') => `<path class="${cls}" d="M${x} ${y - r} Q${x + r * .18} ${y - r * .18} ${x + r} ${y} Q${x + r * .18} ${y + r * .18} ${x} ${y + r} Q${x - r * .18} ${y + r * .18} ${x - r} ${y} Q${x - r * .18} ${y - r * .18} ${x} ${y - r}Z" fill="#fff8d0"/>`;

  // 그림은 부위 중심 (0,0), 폭 100 기준으로 그림. 손 장식은 쥐는 곳이 (0,0)
  const ITEMS = [
    { id: 'glasses', slot: 'face', name: '동그란 안경', price: 30, stage: 0,
      svg: `<g fill="rgba(200,235,255,.35)" stroke="#2a2a3a" stroke-width="5"><circle cx="-24" cy="0" r="19"/><circle cx="24" cy="0" r="19"/></g><path d="M-5 -2 Q0 -7 5 -2" stroke="#2a2a3a" stroke-width="4" fill="none"/><path d="M-36 -10 l8 3 M12 -10 l8 3" stroke="#fff" stroke-width="3" opacity=".8"/>` },
    { id: 'starglass', slot: 'face', name: '별 선글라스', price: 70, stage: 0,
      svg: `${star(-25, 0, 24, '#22182e', 'stroke="url(#dGold)" stroke-width="4"')}${star(25, 0, 24, '#22182e', 'stroke="url(#dGold)" stroke-width="4"')}<path d="M-6 -3 Q0 -9 6 -3" stroke="url(#dGold)" stroke-width="4" fill="none"/><path d="M-32 -10 l7 4 M18 -10 l7 4" stroke="#fff" stroke-width="3" opacity=".7"/>` },
    { id: 'mask', slot: 'face', name: '영웅 가면', price: 120, stage: 1,
      svg: `<path fill-rule="evenodd" fill="url(#dBlue)" stroke="#123a8a" stroke-width="3" d="M-54 -6 Q-30 -26 0 -12 Q30 -26 54 -6 Q48 18 22 16 Q8 14 0 4 Q-8 14 -22 16 Q-48 18 -54 -6Z M-36 -2 Q-24 -12 -12 -2 Q-24 8 -36 -2Z M12 -2 Q24 -12 36 -2 Q24 8 12 -2Z"/><path d="M-54 -6 l-16 -4 M54 -6 l16 -4" stroke="#123a8a" stroke-width="4"/>` },
    { id: 'bowtie', slot: 'neck', name: '빨간 나비넥타이', price: 25, stage: 0,
      svg: `<path d="M-6 -6 L-44 -24 Q-52 0 -44 24 L-6 6Z M6 -6 L44 -24 Q52 0 44 24 L6 6Z" fill="url(#dRed)" stroke="#6a0a0a" stroke-width="2.5"/><rect x="-10" y="-11" width="20" height="22" rx="6" fill="url(#dRed)" stroke="#6a0a0a" stroke-width="2.5"/><path d="M-40 -14 Q-30 -6 -20 -8" stroke="#fff" stroke-width="2.5" opacity=".6" fill="none"/>` },
    { id: 'scarf', slot: 'neck', name: '초록 목도리', price: 50, stage: 0,
      svg: `<path d="M-50 -10 Q0 12 50 -10 L50 6 Q0 30 -50 6Z" fill="url(#dScarf)" stroke="#145a2a" stroke-width="2"/><path d="M18 10 L30 54 L12 56 L6 14Z" fill="url(#dScarf)" stroke="#145a2a" stroke-width="2"/>${[-34, -14, 6, 26].map(x => `<path d="M${x} ${x < 0 ? -2 : -1} l6 ${x < 0 ? 4 : 3}" stroke="#fff" stroke-width="4" opacity=".55"/>`).join('')}<path d="M14 54 l-2 8 M20 54 l0 9 M26 54 l2 8" stroke="#1f6a3a" stroke-width="3"/>` },
    { id: 'medal', slot: 'neck', name: '1등 금메달', price: 140, stage: 1,
      svg: `<path d="M-30 -14 L-8 30 L4 30 L-18 -14Z" fill="#2a5ad0"/><path d="M30 -14 L8 30 L-4 30 L18 -14Z" fill="#e2302a"/><circle cx="0" cy="44" r="20" fill="url(#dGoldR)" stroke="#8a5a00" stroke-width="3"/>${star(0, 44, 11, '#fff3a0')}` },
    { id: 'necklace', slot: 'neck', name: '왕실 보석 목걸이', price: 220, stage: 2,
      svg: `<path d="M-48 -12 Q0 34 48 -12" stroke="url(#dGold)" stroke-width="6" fill="none"/>${[-30, -14, 14, 30].map(x => `<circle cx="${x}" cy="${Math.round(10 + 8 * (1 - Math.abs(x) / 40))}" r="5" fill="url(#dGoldR)"/>`).join('')}<path d="M0 14 L14 30 L0 50 L-14 30Z" fill="url(#dGem)" stroke="url(#dGold)" stroke-width="4"/><path d="M-4 24 l6 -4" stroke="#fff" stroke-width="3"/>` },
    { id: 'cape', slot: 'back', name: '용사의 망토', price: 80, stage: 0,
      svg: `<path d="M-28 -40 Q0 -30 28 -40 L52 40 Q0 56 -52 40Z" fill="url(#dCape)"/><path d="M-28 -40 Q0 -30 28 -40 L30 -32 Q0 -22 -30 -32Z" fill="url(#dGold)"/><path d="M-16 -20 Q-26 10 -34 38 M14 -20 Q22 10 30 40" stroke="#5a0610" stroke-width="2" opacity=".5" fill="none"/>` },
    { id: 'bwings', slot: 'back', name: '나비 날개', price: 160, stage: 1,
      svg: `<g class="flap"><path d="M-6 -6 Q-60 -64 -82 -20 Q-74 4 -8 2Z M-6 4 Q-56 20 -58 50 Q-30 54 -4 10Z" fill="url(#dWingB)" stroke="#fff" stroke-width="2"/></g><g class="flap r"><path d="M6 -6 Q60 -64 82 -20 Q74 4 8 2Z M6 4 Q56 20 58 50 Q30 54 4 10Z" fill="url(#dWingB)" stroke="#fff" stroke-width="2"/></g><circle cx="-50" cy="-22" r="7" fill="#fff" opacity=".6"/><circle cx="50" cy="-22" r="7" fill="#fff" opacity=".6"/>` },
    { id: 'gwings', slot: 'back', name: '황금 천사 날개', price: 320, stage: 2,
      svg: `${[1, -1].map(m => `<g class="flap ${m < 0 ? 'r' : ''}" transform="scale(${-m} 1)">${[0, 1, 2, 3].map(i => `<path d="M-6 ${-10 + i * 8} Q${-40 - i * 4} ${-60 + i * 16} ${-92 + i * 10} ${-40 + i * 22} Q${-60 + i * 6} ${-14 + i * 14} -6 ${2 + i * 8}Z" fill="url(#dGold)" stroke="#a87000" stroke-width="1.5"/>`).join('')}</g>`).join('')}<circle cx="0" cy="-10" r="60" fill="url(#dGlow)" opacity=".5"/>` },
    { id: 'balloon', slot: 'hand', name: '빨간 풍선', price: 40, stage: 0,
      svg: `<path d="M0 0 Q-6 -60 -38 -118" stroke="#555" stroke-width="2" fill="none"/><g class="bob"><ellipse cx="-42" cy="-152" rx="28" ry="34" fill="url(#dRed)"/><path d="M-46 -118 l4 -6 l4 6Z" fill="#a01818"/><ellipse cx="-52" cy="-164" rx="7" ry="12" fill="#fff" opacity=".55"/></g>` },
    { id: 'flag', slot: 'hand', name: 'ABC 응원 깃발', price: 60, stage: 0,
      svg: `<path d="M0 10 L0 -90" stroke="#7a4a20" stroke-width="5" stroke-linecap="round"/><path class="wave" d="M-2 -88 L-66 -72 L-2 -54Z" fill="url(#dBlue)" stroke="#123a8a" stroke-width="2"/><text x="-52" y="-66" font-family="Arial Black,Arial" font-weight="900" font-size="15" fill="#fff">ABC</text><circle cx="0" cy="-92" r="5" fill="url(#dGoldR)"/>` },
    { id: 'wand', slot: 'hand', name: '마법 지팡이', price: 110, stage: 1,
      svg: `<path d="M0 8 L-18 -64" stroke="#4a2a6a" stroke-width="6" stroke-linecap="round"/><path d="M-2 -4 L-4 -14" stroke="url(#dGold)" stroke-width="7"/><circle cx="-20" cy="-74" r="26" fill="url(#dGlow)"/>${star(-20, -74, 18, 'url(#dGoldR)', 'stroke="#a87000" stroke-width="2"')}${spark(-44, -96, 6, 'tw')}${spark(2, -94, 5, 'tw d2')}` },
    { id: 'scepter', slot: 'hand', name: '황금 왕홀', price: 260, stage: 2,
      svg: `<path d="M0 14 L0 -70" stroke="url(#dGold)" stroke-width="8" stroke-linecap="round"/><circle cx="0" cy="-30" r="6" fill="url(#dGoldR)"/><path d="M-16 -72 L16 -72 L10 -84 L-10 -84Z" fill="url(#dGold)"/><circle cx="0" cy="-98" r="16" fill="url(#dPinkGem)" stroke="url(#dGold)" stroke-width="4"/><circle cx="0" cy="-98" r="34" fill="url(#dGlow)"/><path d="M-5 -104 l6 -4" stroke="#fff" stroke-width="3"/>` },
    { id: 'flowerpin', slot: 'pin', name: '꽃 핀', price: 20, stage: 0,
      svg: `${[0, 72, 144, 216, 288].map(a => `<ellipse cx="${(13 * Math.cos(a * Math.PI / 180)).toFixed(1)}" cy="${(13 * Math.sin(a * Math.PI / 180)).toFixed(1)}" rx="11" ry="8" transform="rotate(${a} ${(13 * Math.cos(a * Math.PI / 180)).toFixed(1)} ${(13 * Math.sin(a * Math.PI / 180)).toFixed(1)})" fill="#ffb3cf" stroke="#d9457a" stroke-width="1.5"/>`).join('')}<circle r="7" fill="url(#dGoldR)"/>` },
    { id: 'starpin', slot: 'pin', name: '반짝 별 핀', price: 45, stage: 0,
      svg: `${star(0, 0, 18, 'url(#dGoldR)', 'stroke="#a87000" stroke-width="2"')}${spark(16, -16, 5, 'tw')}` },
    { id: 'ribbon', slot: 'pin', name: '분홍 리본', price: 35, stage: 0,
      svg: `<path d="M-4 0 Q-30 -22 -32 -2 Q-30 18 -4 4Z M4 0 Q30 -22 32 -2 Q30 18 4 4Z" fill="#ff8ac4" stroke="#c0307a" stroke-width="2"/><circle r="6" fill="#ff5aa8" stroke="#c0307a" stroke-width="2"/><path d="M-3 4 L-10 24 M3 4 L10 24" stroke="#ff5aa8" stroke-width="5" stroke-linecap="round"/>` },
    { id: 'sparkle', slot: 'aura', name: '반짝반짝 효과', price: 150, stage: 1,
      svg: `${[[-40, -38, 9], [42, -30, 7], [-46, 20, 6], [44, 26, 8], [0, -48, 6], [-20, 44, 5], [24, 46, 6]].map(([x, y, r], i) => spark(x, y, r, 'tw d' + (i % 3))).join('')}` },
    { id: 'rainbow', slot: 'aura', name: '무지개 오라', price: 350, stage: 2, behind: true,
      svg: `${['#ff5a5a', '#ffa83a', '#ffe14a', '#5ad06a', '#4aa8ff', '#8a6aff'].map((c, i) => `<path d="M${-48 + i * 4} 10 A${48 - i * 4} ${48 - i * 4} 0 0 1 ${48 - i * 4} 10" stroke="${c}" stroke-width="4" fill="none" opacity=".75"/>`).join('')}<circle cx="0" cy="0" r="50" fill="url(#dGlow)" opacity=".6"/>` },
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
    const vb = item.slot === 'hand' ? '-80 -190 110 210' : item.slot === 'back' ? '-100 -70 200 130' : item.slot === 'aura' ? '-60 -60 120 120' : item.slot === 'pin' ? '-36 -30 72 60' : item.slot === 'neck' ? '-60 -30 120 100' : '-75 -35 150 70';
    return `<svg viewBox="${vb}" aria-hidden="true">${DEFS}${item.slot === 'aura' ? '<circle r="34" fill="#ffd45c" opacity=".25"/>' : ''}${item.svg}</svg>`;
  }
  root.AQ_SHOP = { ITEMS, SLOTS, byId, dressed, icon };
  if (typeof module !== 'undefined') module.exports = root.AQ_SHOP;
})(typeof globalThis !== 'undefined' ? globalThis : this);
