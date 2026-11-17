/* 파닉스 표 — 글자 소리 · 예시 단어 · 입 모양(SVG) */
(function (root) {
  'use strict';
  // 입 모양 9가지 (앞에서 본 모습)
  const MOUTH = {
    closed: { name: '입술 꾹', tip: '두 입술을 꼭 붙였다가 "퍽" 하고 터뜨리듯 소리 내요. (m은 입을 붙인 채 코로 "음~")' },
    fv: { name: '윗니로 아랫입술', tip: '윗니를 아랫입술에 살짝 올리고 바람을 "프~" 하고 내보내요. 한국어 "ㅍ"와 달라요!' },
    th: { name: '혀를 이 사이로', tip: '혀끝을 윗니와 아랫니 사이로 살짝 내밀고 바람을 내보내요. 거울로 혀가 보이면 성공!' },
    tip: { name: '혀끝을 윗잇몸에', tip: '입을 살짝 벌리고 혀끝을 윗니 뒤 잇몸에 붙였다가 떼면서 소리 내요.' },
    round: { name: '입술 동그랗게', tip: '입술을 동그랗게 오므려 앞으로 내밀어요. 뽀뽀하는 입 모양처럼!' },
    pucker: { name: '입술 앞으로 쭉', tip: '입술을 네모나게 앞으로 쭉 내밀고, 이는 살짝 붙여요. "쉬~" 할 때 입 모양이에요.' },
    smile: { name: '활짝 웃는 입', tip: '입꼬리를 양옆으로 쭉 당겨 웃는 입을 만들고, 윗니와 아랫니를 가까이 해요.' },
    open: { name: '입 크게 벌리기', tip: '입을 크게 아래로 벌리고, 혀는 아래에 편하게 두어요.' },
    back: { name: '혀 뒤쪽을 올리기', tip: '입을 조금 벌리고, 혀 뒤쪽을 입천장 안쪽에 붙였다가 떼면서 소리 내요.' },
  };
  // [글자, 소리 표기, 한국어로 비슷한 소리, 예시 단어, 그림, 입 모양, 한 줄 팁]
  const ALPHABET = [
    ['A a', '/æ/', '애', 'apple', '🍎', 'open', '입을 옆으로 넓게 벌리며 "애"'],
    ['B b', '/b/', '브', 'bus', '🚌', 'closed', ''],
    ['C c', '/k/', '크', 'cat', '🐱', 'back', ''],
    ['D d', '/d/', '드', 'dog', '🐶', 'tip', ''],
    ['E e', '/e/', '에', 'egg', '🥚', 'smile', '입을 살짝 옆으로 벌리며 짧게 "에"'],
    ['F f', '/f/', '프(f)', 'fish', '🐟', 'fv', ''],
    ['G g', '/g/', '그', 'goat', '🐐', 'back', ''],
    ['H h', '/h/', '흐', 'hat', '🎩', 'open', '입을 벌리고 "하~" 하고 입김을 내보내요.'],
    ['I i', '/ɪ/', '이(짧게)', 'igloo', '🛖', 'smile', '힘을 빼고 짧게 "이"'],
    ['J j', '/dʒ/', '쥐', 'juice', '🧃', 'pucker', ''],
    ['K k', '/k/', '크', 'king', '👑', 'back', ''],
    ['L l', '/l/', '을', 'lion', '🦁', 'tip', '혀끝을 윗잇몸에 붙인 채로 "을~"'],
    ['M m', '/m/', '음', 'moon', '🌙', 'closed', ''],
    ['N n', '/n/', '은', 'nest', '🪺', 'tip', ''],
    ['O o', '/ɑ/', '아', 'octopus', '🐙', 'open', '입을 크게 동그랗게 벌리며 "아"'],
    ['P p', '/p/', '프', 'pig', '🐷', 'closed', ''],
    ['Q q', '/kw/', '쿠', 'queen', '👸', 'round', 'q는 거의 늘 u와 함께 "qu(쿠)"로 써요.'],
    ['R r', '/r/', '(우)르', 'rabbit', '🐰', 'pucker', '입술을 조금 내밀고 혀끝은 어디에도 닿지 않게 말아요.'],
    ['S s', '/s/', '스', 'sun', '☀️', 'smile', ''],
    ['T t', '/t/', '트', 'tiger', '🐯', 'tip', ''],
    ['U u', '/ʌ/', '어', 'umbrella', '☂️', 'open', '입을 조금 벌리고 짧게 "어"'],
    ['V v', '/v/', '브(v)', 'violin', '🎻', 'fv', '윗니를 아랫입술에 대고 떨리게 "브~"'],
    ['W w', '/w/', '우', 'watch', '⌚', 'round', ''],
    ['X x', '/ks/', '크스', 'box', '📦', 'smile', 'x는 주로 단어 끝에서 "크스" 소리가 나요.'],
    ['Y y', '/j/', '이', 'yo-yo', '🪀', 'smile', ''],
    ['Z z', '/z/', '즈', 'zebra', '🦓', 'smile', '"스"처럼 하되 목이 떨리게 "즈~"'],
  ];
  const LONG = [
    ['a_e', '/eɪ/', '에이', 'cake', '🎂', 'smile', '끝의 e는 소리가 안 나고, 앞의 a가 이름 소리 "에이"가 돼요. (매직 e)'],
    ['i_e', '/aɪ/', '아이', 'kite', '🪁', 'open', '매직 e가 i를 "아이"로 바꿔요.'],
    ['o_e', '/oʊ/', '오우', 'bone', '🦴', 'round', '매직 e가 o를 "오우"로 바꿔요.'],
    ['u_e', '/juː/', '유', 'cube', '🧊', 'round', '매직 e가 u를 "유"로 바꿔요.'],
    ['ee', '/iː/', '이~', 'bee', '🐝', 'smile', 'e가 두 개면 길게 "이~"'],
    ['ea', '/iː/', '이~', 'tea', '🍵', 'smile', 'ea도 대부분 길게 "이~"'],
    ['ai', '/eɪ/', '에이', 'rain', '🌧️', 'smile', '단어 가운데에서 "에이"'],
    ['ay', '/eɪ/', '에이', 'play', '🛝', 'smile', '단어 끝에서 "에이"'],
    ['oa', '/oʊ/', '오우', 'boat', '⛵', 'round', ''],
    ['oo', '/uː/', '우~', 'moon', '🌙', 'round', 'book처럼 짧게 "우"가 되기도 해요.'],
  ];
  const TEAMS = [
    ['sh', '/ʃ/', '쉬', 'ship', '🚢', 'pucker', '"쉿!" 조용히 할 때 소리예요.'],
    ['ch', '/tʃ/', '취', 'chick', '🐥', 'pucker', ''],
    ['th', '/θ/', '쓰(th)', 'three', '3️⃣', 'th', ''],
    ['wh', '/w/', '우', 'whale', '🐳', 'round', 'h는 거의 들리지 않아요.'],
    ['ph', '/f/', '프(f)', 'phone', '📱', 'fv', 'ph는 f와 같은 소리예요.'],
    ['ck', '/k/', '크', 'duck', '🦆', 'back', '짧은 모음 뒤, 단어 끝에 와요.'],
    ['ng', '/ŋ/', '응', 'king', '👑', 'back', '혀 뒤쪽을 올리고 코로 "응"'],
    ['ar', '/ɑːr/', '아알', 'car', '🚗', 'open', ''],
    ['or', '/ɔːr/', '오얼', 'corn', '🌽', 'round', ''],
    ['er', '/ər/', '얼', 'tiger', '🐯', 'pucker', 'ir, ur도 같은 소리예요. (bird, nurse)'],
    ['ou', '/aʊ/', '아우', 'house', '🏠', 'open', ''],
    ['ow', '/aʊ/', '아우', 'cow', '🐄', 'open', 'snow처럼 "오우"가 되기도 해요.'],
  ];
  const mk = ([g, ipa, ko, word, e, mouth, tip]) => ({ g, ipa, ko, word, e, mouth, tip });
  const GROUPS = [
    { key: 'abc', name: '알파벳 소리', items: ALPHABET.map(mk) },
    { key: 'long', name: '긴 모음', items: LONG.map(mk) },
    { key: 'team', name: '짝꿍 글자', items: TEAMS.map(mk) },
  ];

  // 입 모양 그림 (앞에서 본 얼굴 아래쪽)
  const L = '#c8324a', LS = '#3b2314';
  function mouthSVG(key, anim = true) {
    const skin = '<ellipse cx="80" cy="64" rx="76" ry="58" fill="#ffe0c8"/><ellipse cx="34" cy="50" rx="12" ry="7" fill="#ffb0a8" opacity=".55"/><ellipse cx="126" cy="50" rx="12" ry="7" fill="#ffb0a8" opacity=".55"/>';
    const teethTop = (y, w = 44) => `<path d="M${80 - w} ${y} Q80 ${y - 4} ${80 + w} ${y} L${80 + w - 2} ${y + 9} Q80 ${y + 6} ${80 - w + 2} ${y + 9}Z" fill="#fff" stroke="#d8cfc8" stroke-width="1"/>`;
    const teethBot = (y, w = 40) => `<path d="M${80 - w} ${y} Q80 ${y + 4} ${80 + w} ${y} L${80 + w - 2} ${y - 8} Q80 ${y - 5} ${80 - w + 2} ${y - 8}Z" fill="#fff" stroke="#d8cfc8" stroke-width="1"/>`;
    const S = {
      closed: `<path d="M38 64 Q80 54 122 64 Q80 70 38 64Z" fill="${L}" stroke="${LS}" stroke-width="2"/><path d="M38 64 Q80 76 122 64 Q80 82 38 64Z" fill="#e04a62" stroke="${LS}" stroke-width="2"/><path d="M40 64 Q80 66 120 64" stroke="${LS}" stroke-width="2.5"/>`,
      fv: `<path d="M34 56 Q80 40 126 56 Q80 52 34 56Z" fill="${L}" stroke="${LS}" stroke-width="2"/><path d="M36 56 Q80 50 124 56 L120 70 Q80 66 40 70Z" fill="#5a1a24"/>${teethTop(56, 40)}<path d="M36 70 Q80 62 124 70 Q80 92 36 70Z" fill="#e04a62" stroke="${LS}" stroke-width="2"/>`,
      th: `<path d="M32 54 Q80 38 128 54 Q80 50 32 54Z" fill="${L}" stroke="${LS}" stroke-width="2"/><path d="M34 54 Q80 48 126 54 Q126 80 80 82 Q34 80 34 54Z" fill="#5a1a24"/>${teethTop(54, 40)}${teethBot(80, 36)}<path d="M54 66 Q80 56 106 66 Q104 78 80 78 Q56 78 54 66Z" fill="#ff7a8a" stroke="${LS}" stroke-width="1.6"/><path d="M80 62 L80 72" stroke="#d84a5a" stroke-width="1.4"/><path d="M34 80 Q80 102 126 80 Q80 90 34 80Z" fill="#e04a62" stroke="${LS}" stroke-width="2"/>`,
      tip: `<path d="M34 52 Q80 36 126 52 Q80 48 34 52Z" fill="${L}" stroke="${LS}" stroke-width="2"/><path d="M36 52 Q80 46 124 52 Q122 82 80 84 Q38 82 36 52Z" fill="#5a1a24"/>${teethTop(52, 40)}<path d="M52 82 Q54 64 80 62 Q106 64 108 82Z" fill="#ff7a8a" stroke="${LS}" stroke-width="1.6"/><path d="M68 64 Q80 58 92 64" stroke="#ff9aa8" stroke-width="3" fill="none"/><path d="M36 82 Q80 104 124 82 Q80 92 36 82Z" fill="#e04a62" stroke="${LS}" stroke-width="2"/>`,
      round: `<ellipse cx="80" cy="66" rx="24" ry="22" fill="${L}" stroke="${LS}" stroke-width="2"/><ellipse cx="80" cy="66" rx="12" ry="12" fill="#5a1a24"/><path d="M62 54 Q80 46 98 54" stroke="#ff9aa8" stroke-width="3" fill="none" stroke-linecap="round"/>`,
      pucker: `<path d="M48 52 Q80 40 112 52 Q118 66 112 80 Q80 92 48 80 Q42 66 48 52Z" fill="${L}" stroke="${LS}" stroke-width="2"/><path d="M60 60 Q80 56 100 60 Q102 68 100 74 Q80 78 60 74 Q58 68 60 60Z" fill="#5a1a24"/><path d="M62 61 Q80 58 98 61 L97 67 Q80 65 63 67Z" fill="#fff"/><path d="M63 73 Q80 75 97 73 L97 69 Q80 70 63 69Z" fill="#fff"/>`,
      smile: `<path d="M24 58 Q80 44 136 58 Q80 54 24 58Z" fill="${L}" stroke="${LS}" stroke-width="2"/><path d="M26 58 Q80 52 134 58 Q122 76 80 78 Q38 76 26 58Z" fill="#5a1a24"/>${teethTop(58, 48)}<path d="M34 66 Q80 72 126 66 L124 60 Q80 66 36 60Z" fill="#fff"/><path d="M26 58 Q80 92 134 58 Q122 80 80 82 Q38 80 26 58Z" fill="#e04a62" stroke="${LS}" stroke-width="2"/><path d="M22 56 q-4 -2 -6 -6 M138 56 q4 -2 6 -6" stroke="${LS}" stroke-width="2" stroke-linecap="round"/>`,
      open: `<path d="M40 44 Q80 30 120 44 Q80 40 40 44Z" fill="${L}" stroke="${LS}" stroke-width="2"/><path d="M40 44 Q80 38 120 44 Q124 96 80 104 Q36 96 40 44Z" fill="#5a1a24"/>${teethTop(44, 36)}<path d="M50 94 Q56 78 80 76 Q104 78 110 94 Q96 104 80 104 Q64 104 50 94Z" fill="#ff7a8a" stroke="${LS}" stroke-width="1.6"/><path d="M40 44 Q36 96 80 104 Q124 96 120 44 Q130 110 80 114 Q30 110 40 44Z" fill="#e04a62" stroke="${LS}" stroke-width="2"/>`,
      back: `<path d="M38 50 Q80 36 122 50 Q80 46 38 50Z" fill="${L}" stroke="${LS}" stroke-width="2"/><path d="M40 50 Q80 44 120 50 Q120 86 80 90 Q40 86 40 50Z" fill="#5a1a24"/>${teethTop(50, 38)}<path d="M48 86 Q50 70 80 72 Q110 70 112 86 Q98 92 80 92 Q62 92 48 86Z" fill="#ff7a8a" stroke="${LS}" stroke-width="1.6"/><path d="M60 62 Q80 54 100 62" stroke="#ff7a8a" stroke-width="6" fill="none" stroke-linecap="round" opacity=".7"/><path d="M40 50 Q40 86 80 90 Q120 86 120 50 Q126 98 80 100 Q34 98 40 50Z" fill="#e04a62" stroke="${LS}" stroke-width="2"/>`,
    };
    const rest = `<path d="M44 64 Q80 58 116 64 Q80 68 44 64Z" fill="${L}" stroke="${LS}" stroke-width="2"/><path d="M44 64 Q80 74 116 64 Q80 78 44 64Z" fill="#e04a62" stroke="${LS}" stroke-width="2"/>`;
    return `<svg viewBox="0 0 160 124" class="mouth ${anim ? 'anim' : ''}" aria-hidden="true">${skin}<g class="m-rest">${rest}</g><g class="m-shape">${S[key] || S.open}</g></svg>`;
  }
  root.AQ_PHONICS = { GROUPS, MOUTH, mouthSVG };
})(typeof globalThis !== 'undefined' ? globalThis : this);
