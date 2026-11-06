/* 사과숲 3D 디오라마 — 그라디언트 SVG + 원근(깊이) 배치 */
(function (root) {
  'use strict';
  const DEFS = `<svg class="fdefs" width="0" height="0" aria-hidden="true" focusable="false"><defs>
    <radialGradient id="fLeaf" cx="35%" cy="28%" r="75%"><stop offset="0" stop-color="#c8f58a"/><stop offset=".35" stop-color="#6cc24a"/><stop offset=".75" stop-color="#2f7d34"/><stop offset="1" stop-color="#18491f"/></radialGradient>
    <radialGradient id="fLeaf2" cx="35%" cy="28%" r="75%"><stop offset="0" stop-color="#a4e070"/><stop offset=".45" stop-color="#4fa53f"/><stop offset="1" stop-color="#173f1c"/></radialGradient>
    <radialGradient id="fLeafG" cx="35%" cy="28%" r="75%"><stop offset="0" stop-color="#fffbd0"/><stop offset=".3" stop-color="#ffe06a"/><stop offset=".7" stop-color="#e0a516"/><stop offset="1" stop-color="#8a5a00"/></radialGradient>
    <linearGradient id="fTrunk" x1="0" x2="1"><stop offset="0" stop-color="#3a2210"/><stop offset=".35" stop-color="#8a5a33"/><stop offset=".6" stop-color="#6e4424"/><stop offset="1" stop-color="#2e1a0b"/></linearGradient>
    <radialGradient id="fApple" cx="34%" cy="30%" r="70%"><stop offset="0" stop-color="#fff2ea"/><stop offset=".12" stop-color="#ff9a85"/><stop offset=".5" stop-color="#e3352a"/><stop offset="1" stop-color="#7a0f0a"/></radialGradient>
    <radialGradient id="fGold" cx="34%" cy="30%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset=".15" stop-color="#fff3a0"/><stop offset=".55" stop-color="#f2b81c"/><stop offset="1" stop-color="#8a5400"/></radialGradient>
    <radialGradient id="fWater" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#f0fdff"/><stop offset=".3" stop-color="#8fdcf6"/><stop offset=".75" stop-color="#2f8cc4"/><stop offset="1" stop-color="#14466e"/></radialGradient>
    <radialGradient id="fStone" cx="35%" cy="25%" r="80%"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#d8d3c6"/><stop offset=".8" stop-color="#8f897a"/><stop offset="1" stop-color="#5a5548"/></radialGradient>
    <linearGradient id="fStoneV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ece8dc"/><stop offset="1" stop-color="#8c8676"/></linearGradient>
    <linearGradient id="fWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3a66a"/><stop offset=".5" stop-color="#b0723c"/><stop offset="1" stop-color="#6e4020"/></linearGradient>
    <linearGradient id="fWoodS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a6030"/><stop offset="1" stop-color="#4e2c12"/></linearGradient>
    <linearGradient id="fRoof" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8a62"/><stop offset=".5" stop-color="#d4442c"/><stop offset="1" stop-color="#7e1f12"/></linearGradient>
    <linearGradient id="fRoofS" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a83220"/><stop offset="1" stop-color="#5a140a"/></linearGradient>
    <linearGradient id="fWallF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4dc"/><stop offset="1" stop-color="#e2c79a"/></linearGradient>
    <linearGradient id="fWallS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d6b98a"/><stop offset="1" stop-color="#a38458"/></linearGradient>
    <radialGradient id="fMush" cx="38%" cy="25%" r="80%"><stop offset="0" stop-color="#ffd2c4"/><stop offset=".3" stop-color="#ff6a52"/><stop offset=".75" stop-color="#c7231a"/><stop offset="1" stop-color="#6a0e08"/></radialGradient>
    <linearGradient id="fStem" x1="0" x2="1"><stop offset="0" stop-color="#d8cdb4"/><stop offset=".4" stop-color="#fffaf0"/><stop offset="1" stop-color="#b3a68a"/></linearGradient>
    <radialGradient id="fGlow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff6c8" stop-opacity=".95"/><stop offset=".4" stop-color="#ffd86a" stop-opacity=".45"/><stop offset="1" stop-color="#ffd86a" stop-opacity="0"/></radialGradient>
    <radialGradient id="fPetalP" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="#ffb3cf"/><stop offset="1" stop-color="#d9457a"/></radialGradient>
    <radialGradient id="fPetalY" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="#ffe680"/><stop offset="1" stop-color="#e09a10"/></radialGradient>
    <radialGradient id="fPetalW" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#f4f0ff"/><stop offset="1" stop-color="#b8b0d8"/></radialGradient>
    <radialGradient id="fPetalV" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#f3e4ff"/><stop offset=".45" stop-color="#b07cf0"/><stop offset="1" stop-color="#5a2aa0"/></radialGradient>
    <linearGradient id="fTulipR" x1="0" x2="1"><stop offset="0" stop-color="#8e1020"/><stop offset=".45" stop-color="#ff4a5e"/><stop offset="1" stop-color="#a01428"/></linearGradient>
    <linearGradient id="fTulipY" x1="0" x2="1"><stop offset="0" stop-color="#b07800"/><stop offset=".45" stop-color="#ffe04a"/><stop offset="1" stop-color="#c08a00"/></linearGradient>
    <linearGradient id="fTulipP" x1="0" x2="1"><stop offset="0" stop-color="#8a2a7a"/><stop offset=".45" stop-color="#ff8ad8"/><stop offset="1" stop-color="#9a2a8a"/></linearGradient>
    <linearGradient id="fGoldM" x1="0" x2="1"><stop offset="0" stop-color="#8a5a00"/><stop offset=".3" stop-color="#ffe680"/><stop offset=".5" stop-color="#fff8d0"/><stop offset=".7" stop-color="#f0b820"/><stop offset="1" stop-color="#7a4a00"/></linearGradient>
    <linearGradient id="fCastle" x1="0" x2="1"><stop offset="0" stop-color="#b8b2c8"/><stop offset=".4" stop-color="#f4f2fa"/><stop offset="1" stop-color="#8a84a0"/></linearGradient>
    <linearGradient id="fBlueRoof" x1="0" x2="1"><stop offset="0" stop-color="#1a3a8a"/><stop offset=".45" stop-color="#5a8cf0"/><stop offset="1" stop-color="#14306e"/></linearGradient>
    <linearGradient id="fGrass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ade5a"/><stop offset="1" stop-color="#2f7a2a"/></linearGradient>
    <linearGradient id="fHedge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6cc24a"/><stop offset="1" stop-color="#1f5a24"/></linearGradient>
    <filter id="fSoft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.2"/></filter>
    <filter id="fBlur4" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
  </defs></svg>`;

  const S = (vb, inner) => `<svg viewBox="${vb}" aria-hidden="true" focusable="false">${inner}</svg>`;
  const apple = (x, y, r = 5, g = 'fApple') => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${g})"/><path d="M${x} ${y - r + .5} q1 -3 3 -3.5" stroke="#4a2a10" stroke-width="1" fill="none"/>`;
  const blob = (x, y, r, g = 'fLeaf') => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${g})"/>`;

  function tree(gold) {
    const L = gold ? 'fLeafG' : 'fLeaf', L2 = gold ? 'fLeafG' : 'fLeaf2', A = gold ? 'fGold' : 'fApple';
    return S('0 0 200 220', `
      <path d="M88 220 C90 180 92 150 86 120 L114 120 C108 150 110 180 112 220 Z" fill="url(#fTrunk)"/>
      <path d="M96 140 C80 128 66 122 52 118 M104 136 C122 124 138 118 152 116" stroke="url(#fTrunk)" stroke-width="9" stroke-linecap="round" fill="none"/>
      <path d="M80 214 q-14 4 -22 6 h86 q-8 -2 -22 -6" fill="#3a2210" opacity=".6"/>
      ${blob(56, 112, 34, L2)}${blob(146, 110, 36, L2)}${blob(100, 128, 34, L2)}
      ${blob(70, 80, 40, L)}${blob(132, 76, 42, L)}${blob(100, 52, 44, L)}${blob(100, 98, 40, L)}
      ${blob(46, 96, 26, L)}${blob(158, 92, 28, L)}
      <ellipse cx="84" cy="34" rx="22" ry="10" fill="#fff" opacity=".22" filter="url(#fSoft)"/>
      ${[[64, 70], [118, 54], [146, 92], [90, 104], [52, 108], [128, 118], [104, 76], [160, 74], [74, 124]].map(([x, y]) => apple(x, y, 7, A)).join('')}
      ${gold ? '<circle cx="100" cy="80" r="96" fill="url(#fGlow)" opacity=".55"/>' : ''}`);
  }

  const DECOR = {
    flowers: () => S('0 0 100 70', `
      <ellipse cx="50" cy="62" rx="46" ry="8" fill="#3d8a2e"/>
      ${[[14, 60], [24, 58], [34, 61], [48, 59], [60, 60], [72, 58], [84, 61]].map(([x, y]) => `<path d="M${x} ${y} q-3 -14 -1 -20 M${x} ${y} q4 -12 6 -16" stroke="url(#fGrass)" stroke-width="2.4" fill="none" stroke-linecap="round"/>`).join('')}
      ${[[18, 34, 'fPetalP'], [36, 26, 'fPetalY'], [52, 36, 'fPetalW'], [68, 28, 'fPetalP'], [84, 38, 'fPetalV'], [28, 44, 'fPetalW'], [60, 46, 'fPetalY'], [76, 48, 'fPetalP']].map(([x, y, g]) =>
        `<path d="M${x} ${y + 4} L${x} 60" stroke="#2f7a2a" stroke-width="2"/>${[0, 72, 144, 216, 288].map(a => `<ellipse cx="${x + 5 * Math.cos(a * Math.PI / 180)}" cy="${y + 5 * Math.sin(a * Math.PI / 180)}" rx="4.6" ry="3.4" transform="rotate(${a} ${x + 5 * Math.cos(a * Math.PI / 180)} ${y + 5 * Math.sin(a * Math.PI / 180)})" fill="url(#${g})"/>`).join('')}<circle cx="${x}" cy="${y}" r="2.8" fill="url(#fGold)"/>`).join('')}`),
    bench: () => S('0 0 120 80', `
      <path d="M18 52 L22 76 M98 52 L94 76 M30 48 L33 68 M88 48 L86 68" stroke="#3a2210" stroke-width="5" stroke-linecap="round"/>
      <path d="M10 46 L104 40 L112 50 L18 57 Z" fill="url(#fWood)"/>
      <path d="M18 57 L112 50 L112 54 L18 61 Z" fill="url(#fWoodS)"/>
      <path d="M12 46 L104 40" stroke="#ffd6a0" stroke-width="1" opacity=".7"/>
      ${[14, 24, 34].map((y, i) => `<path d="M16 ${y} L104 ${y - 6} L104 ${y - 1} L16 ${y + 5} Z" fill="url(#fWood)"/><path d="M16 ${y + 5} L104 ${y - 1} L104 ${y + 1} L16 ${y + 7} Z" fill="#5a3214"/>`).join('')}
      <path d="M20 12 L20 50 M100 6 L100 44" stroke="url(#fWoodS)" stroke-width="5" stroke-linecap="round"/>`),
    pond: () => S('0 0 140 70', `
      <ellipse cx="70" cy="40" rx="66" ry="26" fill="#5a7a3a"/>
      ${Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2; return `<ellipse cx="${70 + 62 * Math.cos(a)}" cy="${40 + 23 * Math.sin(a)}" rx="9" ry="6" fill="url(#fStone)"/>`; }).join('')}
      <ellipse cx="70" cy="40" rx="56" ry="19" fill="url(#fWater)"/>
      <ellipse class="ripple" cx="70" cy="40" rx="30" ry="9" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.2"/>
      <ellipse cx="54" cy="33" rx="18" ry="4" fill="#fff" opacity=".5" filter="url(#fSoft)"/>
      <path d="M88 44 a9 4 0 1 0 1 -1 Z" fill="#3e9a3a"/><path d="M40 48 a7 3 0 1 0 1 -1 Z" fill="#4aa83f"/>
      <circle cx="90" cy="42" r="3" fill="url(#fPetalP)"/>`),
    mushroom: () => S('0 0 80 110', `
      <circle cx="40" cy="40" r="40" fill="url(#fGlow)" class="lamp"/>
      <path d="M32 106 C33 80 34 66 30 54 L50 54 C46 66 47 80 48 106 Z" fill="url(#fStem)"/>
      <path d="M6 56 C6 26 22 12 40 12 C58 12 74 26 74 56 C60 62 20 62 6 56 Z" fill="url(#fMush)"/>
      <path d="M8 56 C24 64 56 64 72 56 C60 68 20 68 8 56 Z" fill="#f4e6d0"/>
      ${[[24, 30, 5], [46, 22, 4], [58, 38, 5], [34, 44, 3.5], [16, 46, 3]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * .8}" fill="#fff" opacity=".95"/>`).join('')}
      <ellipse cx="28" cy="22" rx="12" ry="5" fill="#fff" opacity=".35" filter="url(#fSoft)"/>
      <rect x="35" y="72" width="10" height="12" rx="3" fill="#fff4b0"/><rect x="35" y="72" width="10" height="12" rx="3" fill="url(#fGlow)"/>`),
    house: () => S('0 0 140 130', `
      <path d="M22 70 L70 92 L70 126 L22 106 Z" fill="url(#fWallF)"/>
      <path d="M70 92 L120 72 L120 106 L70 126 Z" fill="url(#fWallS)"/>
      <path d="M12 72 L58 18 L72 94 Z" fill="url(#fRoof)"/>
      <path d="M58 18 L112 6 L128 70 L72 94 Z" fill="url(#fRoofS)"/>
      <path d="M58 18 L112 6" stroke="#ffb090" stroke-width="2"/>
      ${[30, 42, 54, 66].map(y => `<path d="M${64 + (y - 18) * .2} ${y} L${116 + (y - 6) * .25} ${y - 12}" stroke="#4a0e06" stroke-opacity=".35" stroke-width="1.4"/>`).join('')}
      <path d="M38 88 L52 94 L52 118 L38 112 Z" fill="#6e3a18"/><circle cx="49" cy="105" r="1.4" fill="#ffd45c"/>
      <path d="M84 92 L104 84 L104 98 L84 106 Z" fill="#ffe27a"/><path d="M84 92 L104 84 L104 98 L84 106 Z" fill="url(#fGlow)"/>
      <path d="M94 88 L94 102 M84 99 L104 91" stroke="#7a4a20" stroke-width="1.6"/>
      <rect x="92" y="2" width="9" height="16" fill="#8a5a3a"/><circle class="smoke" cx="96" cy="0" r="5" fill="#fff" opacity=".6"/>`),
    goldtree: () => tree(true),
    bridge: () => { // 아치형 나무다리: 데크(윗면) + 옆판 + 난간
      const yc = x => 70 - 44 * (1 - Math.pow((x - 80) / 74, 2));
      const top = Array.from({ length: 17 }, (_, i) => { const x = 6 + i * 148 / 16; return [x, yc(x)]; });
      const pts = (dy, dx = 0) => top.map(([x, y]) => `${(x + dx).toFixed(1)} ${(y + dy).toFixed(1)}`).join(' L');
      return S('0 0 170 96', `
        <path d="M${pts(0)} L${top.slice().reverse().map(([x, y]) => `${(x + 8).toFixed(1)} ${(y + 10).toFixed(1)}`).join(' L')} Z" fill="url(#fWood)"/>
        ${top.slice(0, -1).map(([x, y], i) => `<path d="M${x.toFixed(1)} ${y.toFixed(1)} L${(x + 8).toFixed(1)} ${(y + 10).toFixed(1)}" stroke="#6e4020" stroke-width=".9" opacity=".7"/>`).join('')}
        <path d="M${pts(10, 8)} L${top.slice().reverse().map(([x, y]) => `${(x + 8).toFixed(1)} ${(y + 20).toFixed(1)}`).join(' L')} Z" fill="url(#fWoodS)"/>
        ${top.filter((_, i) => i % 2 === 0).map(([x, y]) => `<path d="M${x.toFixed(1)} ${(y + 1).toFixed(1)} L${x.toFixed(1)} ${(y - 15).toFixed(1)}" stroke="url(#fWoodS)" stroke-width="3.2" stroke-linecap="round"/>`).join('')}
        <path d="M${pts(-15)}" stroke="url(#fWood)" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M${pts(-16)}" stroke="#ffe0b0" stroke-width="1" fill="none" opacity=".7"/>
        ${top.filter((_, i) => i % 2 === 1).map(([x, y]) => `<path d="M${(x + 8).toFixed(1)} ${(y + 11).toFixed(1)} L${(x + 8).toFixed(1)} ${(y - 4).toFixed(1)}" stroke="#4e2c12" stroke-width="2.6" stroke-linecap="round"/>`).join('')}
        <path d="M${pts(-4, 8)}" stroke="#8a5428" stroke-width="3" fill="none" stroke-linecap="round"/>`);
    },
    garden: () => S('0 0 130 80', `
      <path d="M4 60 Q65 40 126 60 L126 74 Q65 56 4 74 Z" fill="url(#fHedge)"/>
      <ellipse cx="65" cy="70" rx="62" ry="8" fill="#5a3a1a"/>
      ${[[14, 'fTulipR'], [28, 'fTulipY'], [42, 'fTulipP'], [56, 'fTulipR'], [70, 'fTulipY'], [84, 'fTulipP'], [98, 'fTulipR'], [112, 'fTulipY']].map(([x, g], i) => { const t = 18 + (i % 3) * 6; return `<path d="M${x} 68 L${x} ${t + 10}" stroke="#2f7a2a" stroke-width="2.2"/><path d="M${x} ${t + 30} q-8 -6 -6 -16" stroke="#3e9a3a" stroke-width="3" fill="none"/><path d="M${x - 6} ${t + 4} q0 10 6 10 q6 0 6 -10 l-3 3 l-3 -6 l-3 6 Z" fill="url(#${g})"/>`; }).join('')}
      <circle class="butterfly" cx="70" cy="16" r="3" fill="#ffd45c"/>`),
    fountain: () => S('0 0 120 120', `
      <ellipse cx="60" cy="100" rx="56" ry="16" fill="url(#fStoneV)"/>
      <ellipse cx="60" cy="96" rx="50" ry="12" fill="url(#fWater)"/>
      <path d="M52 96 L54 54 L66 54 L68 96 Z" fill="url(#fStoneV)"/>
      <ellipse cx="60" cy="56" rx="28" ry="8" fill="url(#fStoneV)"/><ellipse cx="60" cy="54" rx="24" ry="6" fill="url(#fWater)"/>
      <path d="M57 54 L58 30 L62 30 L63 54 Z" fill="url(#fStoneV)"/><circle cx="60" cy="28" r="5" fill="url(#fStone)"/>
      <g class="spray" fill="none" stroke="#c8f2ff" stroke-width="2" stroke-linecap="round" opacity=".85"><path d="M60 24 Q44 6 36 54"/><path d="M60 24 Q76 6 84 54"/><path d="M60 24 L60 10"/><path d="M38 56 Q30 70 22 92"/><path d="M82 56 Q90 70 98 92"/></g>
      <ellipse cx="44" cy="92" rx="14" ry="3" fill="#fff" opacity=".45"/>`),
    royal: () => S('0 0 140 140', `
      <path d="M20 70 L120 70 L120 130 L20 130 Z" fill="url(#fCastle)"/>
      ${[20, 36, 52, 68, 84, 100].map(x => `<rect x="${x}" y="62" width="10" height="10" fill="url(#fCastle)"/>`).join('')}
      <path d="M58 130 L58 100 Q70 86 82 100 L82 130 Z" fill="#3a2a5a"/>
      ${[[10, 40], [108, 40]].map(([x, y]) => `<rect x="${x}" y="${y}" width="22" height="90" fill="url(#fCastle)"/><path d="M${x - 4} ${y} L${x + 11} ${y - 34} L${x + 26} ${y} Z" fill="url(#fBlueRoof)"/><rect x="${x + 7}" y="${y + 20}" width="8" height="12" rx="4" fill="#ffe27a"/>`).join('')}
      <rect x="56" y="30" width="28" height="40" fill="url(#fCastle)"/><path d="M50 30 L70 -4 L90 30 Z" fill="url(#fBlueRoof)"/>
      <path d="M70 -4 L70 -18 L84 -12 L70 -8" fill="#e2453a" stroke="#7a4a20" stroke-width="1"/>
      <circle cx="70" cy="46" r="6" fill="#ffe27a"/><circle cx="70" cy="46" r="14" fill="url(#fGlow)"/>`),
    monument: () => S('0 0 100 130', `
      <path d="M18 112 L82 112 L90 128 L10 128 Z" fill="url(#fStoneV)"/>
      <path d="M28 76 L72 76 L76 112 L24 112 Z" fill="url(#fStoneV)"/>
      <rect x="34" y="88" width="32" height="12" rx="2" fill="url(#fGoldM)"/>
      <path d="M30 18 L70 18 L66 44 Q50 62 34 44 Z" fill="url(#fGoldM)"/>
      <path d="M30 22 Q16 22 18 34 Q20 44 34 44" stroke="url(#fGoldM)" stroke-width="5" fill="none"/><path d="M70 22 Q84 22 82 34 Q80 44 66 44" stroke="url(#fGoldM)" stroke-width="5" fill="none"/>
      <path d="M46 56 L54 56 L56 68 L44 68 Z" fill="url(#fGoldM)"/><rect x="38" y="68" width="24" height="8" rx="2" fill="url(#fGoldM)"/>
      <ellipse cx="42" cy="26" rx="5" ry="9" fill="#fff" opacity=".55"/>
      <path class="twinkle" d="M80 10 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 Z" fill="#fff"/>
      <circle cx="50" cy="38" r="40" fill="url(#fGlow)" opacity=".5"/>`),
  };
  const SIZE = { flowers: 92, bench: 96, pond: 140, mushroom: 62, house: 120, goldtree: 120, bridge: 140, garden: 112, fountain: 104, royal: 124, monument: 78 };

  // 원근감 있는 배경: 하늘·먼 산·숲 실루엣·초원·오솔길
  function scene() {
    const far = Array.from({ length: 16 }, (_, i) => { const x = i * 28 - 10, h = 40 + (i * 37 % 23); return `<path d="M${x} 190 L${x + 16} ${190 - h} L${x + 32} 190 Z"/>`; }).join('');
    const mid = Array.from({ length: 12 }, (_, i) => { const x = i * 38 + (i % 2) * 10 - 10, r = 22 + (i * 13 % 12); return `<circle cx="${x}" cy="${205 - r * .4}" r="${r}"/>`; }).join('');
    return `
      <div class="f-layer f-sky"><div class="f-sun"></div><div class="f-cloud c1"></div><div class="f-cloud c2"></div></div>
      <svg class="f-layer f-far" viewBox="0 0 420 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs><linearGradient id="fMtn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ab8d8"/><stop offset="1" stop-color="#c8e0ee"/></linearGradient>
        <linearGradient id="fMtn2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e9cb8"/><stop offset="1" stop-color="#a8cfd8"/></linearGradient>
        <linearGradient id="fPine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f8f6a"/><stop offset="1" stop-color="#7fb88a"/></linearGradient>
        <linearGradient id="fMid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f8a44"/><stop offset="1" stop-color="#2a6a34"/></linearGradient></defs>
        <path d="M0 150 L50 92 L92 128 L150 70 L214 132 L262 96 L330 140 L380 88 L420 120 L420 260 L0 260 Z" fill="url(#fMtn)"/>
        <path d="M150 70 L166 88 L156 86 L148 96 L140 82 Z M380 88 L392 102 L382 100 L374 108 Z" fill="#fff" opacity=".8"/>
        <path d="M0 176 L70 130 L130 168 L200 126 L270 170 L340 134 L420 168 L420 260 L0 260 Z" fill="url(#fMtn2)"/>
        <g fill="url(#fPine)">${far}</g>
        <g fill="url(#fMid)">${mid}</g>
      </svg>
      <div class="f-layer f-ground">
        <svg viewBox="0 0 420 300" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="fMeadow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd06a"/><stop offset=".45" stop-color="#5fb04a"/><stop offset="1" stop-color="#2f7a30"/></linearGradient>
          <linearGradient id="fPath" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8d4a0"/><stop offset="1" stop-color="#b08a58"/></linearGradient>
          <pattern id="fBlade" width="14" height="10" patternUnits="userSpaceOnUse"><path d="M3 10 l1 -6 M8 10 l-1 -7 M12 10 l1 -5" stroke="#2f7a2a" stroke-opacity=".35" stroke-width="1"/></pattern></defs>
          <path d="M0 18 Q210 -6 420 18 L420 300 L0 300 Z" fill="url(#fMeadow)"/>
          <path d="M0 18 Q210 -6 420 18 L420 300 L0 300 Z" fill="url(#fBlade)"/>
          <path d="M200 10 Q190 60 160 110 Q120 180 140 300 L260 300 Q230 190 250 120 Q262 60 218 10 Z" fill="url(#fPath)" opacity=".9"/>
          <path d="M200 10 Q190 60 160 110 Q120 180 140 300" stroke="#8a6a3a" stroke-opacity=".35" stroke-width="2" fill="none"/>
        </svg>
      </div>
      <div class="f-rays"></div>`;
  }
  function overlay() {
    const flies = Array.from({ length: 10 }, (_, i) => `<i style="left:${(i * 37 + 7) % 92 + 4}%;top:${(i * 53 + 11) % 50 + 40}%;animation-delay:${(i * .7) % 5}s;animation-duration:${5 + i % 4}s"></i>`).join('');
    const leaves = Array.from({ length: 6 }, (_, i) => `<b style="left:${(i * 17 + 5) % 95}%;animation-delay:${i * 1.6}s;animation-duration:${8 + i % 3 * 2}s"></b>`).join('');
    return `<div class="f-fx">${flies}${leaves}</div><div class="f-vignette"></div>`;
  }
  root.AQ_FOREST = { DEFS, tree, DECOR, SIZE, scene, overlay };
})(typeof globalThis !== 'undefined' ? globalThis : this);
