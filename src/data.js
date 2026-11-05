/* 애플왕의 진화 모험 — 학습 데이터
 * 출처: 선생님이 제공한 「4th grade word test」 1학기(1~6단원)·2학기(7~11단원) 한글 학습지.
 * 정리 시 바로잡은 부분: 오탈자(Its→It's, Dont→Don't), 중복 단어(night, where, bread 등) 1회만 수록,
 * 같은 뜻이 겹치는 단어는 구분되도록 뜻을 보완(breakfast 아침→아침 식사, dinner 저녁→저녁 식사).
 * e = 그림 힌트(이모지). 비어 있으면 그림 문제에 나오지 않음.
 */
(function (root) {
  const W = (en, ko, e = '') => ({ en, ko, e });
  const S = (en, ko) => ({ en, ko });
  const Pr = (en, ko) => ({ en, ko, p: true }); // 교과서 문형을 바탕으로 만든 응용(연습) 문장

  const UNITS = [
    { id: 1, sem: 1, title: "What's Your Name?", ko: '이름이 뭐니?', icon: '👋',
      words: [W('morning','아침','🌅'),W('afternoon','오후','🌤️'),W('evening','저녁','🌇'),W('night','밤','🌙'),
        W('ball','공','⚽'),W('catch','잡다','🤾'),W('name','이름','📛'),W('friend','친구','🧑‍🤝‍🧑'),
        W('together','함께','👫'),W('good','좋은','👍'),W('here','여기','📍'),W('okay','좋아','👌')],
      sentences: [S("What's your name?",'너의 이름은 뭐야?'),S('My name is Jin.','내 이름은 진이야.'),
        Pr('My name is Mina.','내 이름은 미나야.'),Pr('My name is Tom.','내 이름은 톰이야.'),Pr("What's his name?",'그의 이름은 뭐야?'),Pr('Good morning.','좋은 아침이에요.'),Pr('Good afternoon.','안녕하세요. (오후 인사)'),Pr('Good evening.','안녕하세요. (저녁 인사)'),Pr('Good night.','잘 자요.'),Pr('Catch the ball.','공을 잡아.'),Pr('You are my friend.','너는 내 친구야.'),Pr("Let's play together.",'함께 놀자.')] },
    { id: 2, sem: 1, title: "Don't Push, Please.", ko: '밀지 마세요.', icon: '🙏',
      words: [W('at','~에'),W('butterfly','나비','🦋'),W('careful','조심스러운','⚠️'),W('chair','의자','🪑'),
        W('eat','먹다','😋'),W('enter','들어가다','🚪'),W('fish','물고기','🐟'),W('lion','사자','🦁'),
        W('push','밀다','🫸'),W('ship','배','🚢'),W('talk','이야기하다','💬'),W('touch','만지다','👆'),
        W('sorry','미안','🙇'),W('please','부탁해요','🙏')],
      sentences: [S("Don't push, please.",'밀지 마세요.'),
        Pr("Don't touch, please.",'만지지 마세요.'),Pr("Don't talk, please.",'떠들지 마세요.'),Pr("Don't eat, please.",'먹지 마세요.'),Pr("Don't enter, please.",'들어가지 마세요.'),Pr("Don't push the chair.",'의자를 밀지 마세요.'),Pr('Be careful.','조심해.'),Pr("I'm sorry.",'미안해.'),Pr('Look at the lion.','사자를 봐.'),Pr("Don't touch the fish.",'물고기를 만지지 마세요.')] },
    { id: 3, sem: 1, title: 'Do You Want Some Pizza?', ko: '피자 좀 먹을래?', icon: '🍕',
      words: [W('bread','빵','🍞'),W('cake','케이크','🍰'),W('chicken','치킨','🍗'),W('hot','더운','🥵'),
        W('juice','주스','🧃'),W('noodles','국수','🍜'),W('pizza','피자','🍕'),W('rice','밥','🍚'),
        W('spaghetti','스파게티','🍝'),W('want','원하다'),W('milk','우유','🥛'),W('and','그리고'),W('some','몇몇의, 약간의')],
      sentences: [S('Do you want some pizza?','피자 좀 먹을래?'),S('Yes, please.','네, 주세요.'),S('No, thanks.','아니요, 괜찮아요.'),
        Pr('Do you want some bread?','빵 좀 먹을래?'),Pr('Do you want some cake?','케이크 좀 먹을래?'),Pr('Do you want some chicken?','치킨 좀 먹을래?'),Pr('Do you want some juice?','주스 좀 마실래?'),Pr('Do you want some milk?','우유 좀 마실래?'),Pr('Do you want some noodles?','국수 좀 먹을래?'),Pr('I want some rice.','나는 밥을 좀 원해.'),Pr("It's hot.",'뜨거워.'),Pr('Pizza and juice, please.','피자랑 주스 주세요.')] },
    { id: 4, sem: 1, title: "It's on the Desk.", ko: '책상 위에 있어.', icon: '📦',
      words: [W('bat','야구방망이','🏏'),W('desk','책상','🧑‍💻'),W('bed','침대','🛏️'),W('table','탁자'),
        W('phone','전화','📱'),W('scarf','스카프','🧣'),W('photo','사진','📷'),W('robot','로봇','🤖'),
        W('on','~위에'),W('in','~안에'),W('under','~아래에'),W('find','찾다','🔍'),W('fun','재미있는','🎉'),W('where','어디에','❓')],
      sentences: [S('Where is my cat?','내 고양이는 어디에 있지?'),S("It's on the desk.",'책상 위에 있어.'),
        Pr('Where is my phone?','내 전화는 어디에 있지?'),Pr('Where is my robot?','내 로봇은 어디에 있지?'),Pr('Where is my scarf?','내 스카프는 어디에 있지?'),Pr("It's on the bed.",'침대 위에 있어.'),Pr("It's on the table.",'탁자 위에 있어.'),Pr("It's under the desk.",'책상 아래에 있어.'),Pr("It's under the bed.",'침대 아래에 있어.'),Pr("It's in the box.",'상자 안에 있어.'),Pr("I can't find my bat.",'내 야구방망이를 못 찾겠어.')] },
    { id: 5, sem: 1, title: 'Is This Your Watch?', ko: '이거 네 시계니?', icon: '⌚',
      words: [W('cap','모자','🧢'),W('brown','갈색','🟤'),W('bank','은행','🏦'),W('glove','장갑','🧤'),
        W('shoe','신발','👟'),W('think','생각하다','🤔'),W('umbrella','우산','☂️'),W('watch','시계','⌚'),
        W('black','검은색','⚫'),W('great','멋진, 위대한','🌟'),W('blue','파란색','🔵'),W('your','너의'),W('pink','분홍색','🩷')],
      sentences: [S('Is this your watch?','이거 네 시계니?'),S('Yes, it is.','응, 맞아.'),
        Pr('Is this your cap?','이거 네 모자니?'),Pr('Is this your glove?','이거 네 장갑이니?'),Pr('Is this your umbrella?','이거 네 우산이니?'),Pr('Is this your shoe?','이거 네 신발이니?'),Pr("No, it isn't.",'아니, 그렇지 않아.'),Pr("It's blue.",'그건 파란색이야.'),Pr("It's black.",'그건 검은색이야.'),Pr("It's pink.",'그건 분홍색이야.'),Pr("I think it's brown.",'내 생각에 그건 갈색이야.')] },
    { id: 6, sem: 1, title: 'What Time Is It?', ko: '몇 시야?', icon: '⏰',
      words: [W('breakfast','아침 식사','🥞'),W('lunch','점심 식사','🍱'),W('dinner','저녁 식사','🍽️'),W('clean','깨끗한','🧼'),
        W('for','~를 위한'),W('help','도와주다','🆘'),W('late','늦은','🏃'),W('eleven','11'),W('twelve','12'),
        W('twenty','20'),W('thirty','30'),W('forty','40'),W('fifty','50'),W('wake','깨다, 일어나다','⏰')],
      sentences: [S('What time is it?','몇 시야?'),S("It's ten o'clock.",'10시야.'),S("It's time for bed.",'잘 시간이야.'),
        Pr("It's eleven o'clock.",'11시야.'),Pr("It's twelve o'clock.",'12시야.'),Pr("It's seven o'clock.",'7시야.'),Pr("It's time for breakfast.",'아침 먹을 시간이야.'),Pr("It's time for lunch.",'점심 먹을 시간이야.'),Pr("It's time for dinner.",'저녁 먹을 시간이야.'),Pr('Wake up!','일어나!'),Pr("I'm late.",'나 늦었어.'),Pr('Clean your room.','네 방을 청소하렴.')] },
    { id: 7, sem: 2, title: "I'm a Doctor.", ko: '나는 의사야.', icon: '🩺',
      words: [W('cook','요리사','🧑‍🍳'),W('doctor','의사','🧑‍⚕️'),W('drone','드론'),W('farmer','농부','🧑‍🌾'),
        W('fire','불','🔥'),W('firefighter','소방관','🧑‍🚒'),W('painter','화가','🧑‍🎨'),W('pilot','조종사','🧑‍✈️'),W('tent','텐트','⛺')],
      sentences: [S("I'm a cook.",'나는 요리사예요.'),S("I'm a firefighter.",'나는 소방관이에요.'),
        Pr("I'm a doctor.",'나는 의사예요.'),Pr("I'm a farmer.",'나는 농부예요.'),Pr("I'm a pilot.",'나는 조종사예요.'),Pr("I'm a painter.",'나는 화가예요.'),Pr('Are you a cook?','너는 요리사니?'),Pr('Yes, I am.','응, 맞아.'),Pr("No, I'm not.",'아니, 그렇지 않아.'),Pr('He is a firefighter.','그는 소방관이에요.'),Pr('She is a doctor.','그녀는 의사예요.')] },
    { id: 8, sem: 2, title: 'How Much Is It?', ko: '이거 얼마예요?', icon: '💰',
      words: [W('brush','빗','🪮'),W('toy car','장난감 자동차','🚗'),W('pencil case','필통','✏️'),W('cheap','싼'),
        W('hundred','백(100)','💯'),W('jump rope','줄넘기','🪢'),W('much','많은'),W('old','오래된, 나이가 많은','👴'),
        W('pretty','예쁜','🌸'),W('thousand','천(1000)')],
      sentences: [S('How much is it?','이거 얼마예요?'),S("It's one hundred won.",'100원이에요.'),
        S('I like this toy car.','나는 이 장난감 자동차가 좋아요.'),S('Can I help you?','무엇을 도와드릴까요?'),
        Pr("It's two hundred won.",'200원이에요.'),Pr("It's five hundred won.",'500원이에요.'),Pr("It's one thousand won.",'1000원이에요.'),Pr("It's three thousand won.",'3000원이에요.'),Pr('I like this brush.','나는 이 빗이 좋아요.'),Pr('I like this pencil case.','나는 이 필통이 좋아요.'),Pr('I like this jump rope.','나는 이 줄넘기가 좋아요.'),Pr("It's cheap.",'싸네요.'),Pr("It's pretty.",'예쁘네요.')] },
    { id: 9, sem: 2, title: 'What Day Is It Today?', ko: '오늘 무슨 요일이야?', icon: '📅',
      words: [W('art','미술','🎨'),W('class','수업','🏫'),W('day','날, 하루'),W('home','집','🏠'),W('sure','물론, 좋아','👌'),
        W('today','오늘','📅'),W('Monday','월요일'),W('Tuesday','화요일'),W('Wednesday','수요일'),W('Thursday','목요일'),
        W('Friday','금요일'),W('Saturday','토요일'),W('Sunday','일요일')],
      sentences: [S('What day is it today?','오늘 무슨 요일이야?'),S("It's Friday.",'금요일이에요.'),
        Pr("It's Monday.",'월요일이에요.'),Pr("It's Tuesday.",'화요일이에요.'),Pr("It's Wednesday.",'수요일이에요.'),Pr("It's Thursday.",'목요일이에요.'),Pr("It's Saturday.",'토요일이에요.'),Pr("It's Sunday.",'일요일이에요.'),Pr('I have art class today.','나는 오늘 미술 수업이 있어.'),Pr("Let's go home.",'집에 가자.'),Pr('Sure.','물론이지.')] },
    { id: 10, sem: 2, title: 'How Old Is He?', ko: '그는 몇 살이니?', icon: '🎂',
      words: [W('beautiful','아름다운','🌈'),W('cute','귀여운','🥰'),W('excuse','실례합니다'),W('house','집, 주택','🏡'),
        W('seventy','칠십(70)'),W('sweet','달콤한','🍬'),W('year','해, 년'),W('three','삼(3)','3️⃣'),W('years old','~살','🎂')],
      sentences: [S('How old is he?','그는 몇 살이니?'),S("He's ten years old.",'그는 10살이에요.'),
        S("It's two hundred years old.",'그것은 200살이에요.'),
        Pr("He's nine years old.",'그는 9살이에요.'),Pr("He's eleven years old.",'그는 11살이에요.'),Pr("She's eight years old.",'그녀는 8살이에요.'),Pr('How old is she?','그녀는 몇 살이니?'),Pr("It's three hundred years old.",'그것은 300살이에요.'),Pr("It's seventy years old.",'그것은 70살이에요.'),Pr("It's beautiful.",'아름다워요.'),Pr("It's cute.",'귀여워요.'),Pr("It's sweet.",'달콤해요.')] },
    { id: 11, sem: 2, title: 'What Are You Doing?', ko: '너 뭐 하고 있니?', icon: '🎻',
      words: [W('dance','춤추다','💃'),W('draw','그리다','✍️'),W('drink','마시다','🥤'),W('homework','숙제','📚'),
        W('make','만들다','🛠️'),W('music','음악','🎵'),W('picture','그림','🖼️'),W('quiet','조용한','🤫'),
        W('water','물','💧'),W('singing','노래 부르기','🎤'),W('dancing','춤추기','🕺')],
      sentences: [S('What are you doing?','너 뭐 하고 있니?'),S("I'm playing the violin.",'나는 바이올린을 연주하고 있어요.'),
        S("I'm making orange juice.",'나는 오렌지 주스를 만들고 있어요.'),S("I'm drawing a picture.",'나는 그림을 그리고 있어요.'),
        Pr("I'm dancing.",'나는 춤추고 있어요.'),Pr("I'm singing.",'나는 노래 부르고 있어요.'),Pr("I'm drinking water.",'나는 물을 마시고 있어요.'),Pr("I'm doing my homework.",'나는 숙제를 하고 있어요.'),Pr("I'm making a cake.",'나는 케이크를 만들고 있어요.'),Pr("I'm drawing a cat.",'나는 고양이를 그리고 있어요.'),Pr("I'm playing the piano.",'나는 피아노를 치고 있어요.'),Pr('What is she doing?','그녀는 뭐 하고 있니?'),Pr('Be quiet, please.','조용히 해 주세요.')] },
  ];

  const STAGES = [
    { key: 'pung', name: '풋애플', en: 'Green Apple', tier: 'STAGE 1 · 새싹', rarity: 1, no: '001',
      trait: '영어로 성장!', traitText: '영어 단어와 문장을 배우고 문제를 풀면, 경험치를 얻어 진화할 수 있다!',
      skill: '영어 퀴즈 도전', skillText: '선택한 단원의 영어 문제를 풀어 경험치를 얻는다.', theme: 'leaf' },
    { key: 'king', name: '애플왕', en: 'Apple King', tier: 'STAGE 2 · 왕관', rarity: 2, no: '002',
      trait: '덩굴 왕관', traitText: '황금 왕관과 길어진 덩굴 꼬리로 더 어려운 문장도 척척 붙잡는다!',
      skill: '덩굴 문장 잡기', skillText: '연속으로 정답을 맞힐수록 덩굴 꼬리가 빛난다.', theme: 'gold' },
    { key: 'great', name: '애플대왕', en: 'Grand Apple King', tier: 'STAGE 3 · 전설', rarity: 3, no: '003',
      trait: '황금 사과의 힘', traitText: '보석 왕관과 황금 사과 덩굴로 숲 전체를 영어의 빛으로 채운다!',
      skill: '황금 사과 오라', skillText: '모든 단원의 영어 힘을 하나로 모아 숲을 밝힌다.', theme: 'jewel' },
  ];

  const DECOR = [
    { unit: 1, key: 'flowers', name: '작은 꽃밭', e: '🌼' },
    { unit: 2, key: 'bench', name: '나무 의자', e: '🪑' },
    { unit: 3, key: 'pond', name: '반짝이는 연못', e: '' },
    { unit: 4, key: 'mushroom', name: '버섯 가로등', e: '🍄' },
    { unit: 5, key: 'house', name: '풋애플의 작은 집', e: '🛖' },
    { unit: 6, key: 'goldtree', name: '황금 사과나무', e: '' },
    { unit: 7, key: 'bridge', name: '숲속 다리', e: '🌉' },
    { unit: 8, key: 'garden', name: '마법 정원', e: '🌷' },
    { unit: 9, key: 'fountain', name: '작은 분수', e: '⛲' },
    { unit: 10, key: 'royal', name: '왕실 정원', e: '🏰' },
    { unit: 11, key: 'monument', name: '기념 조형물', e: '🏆' },
  ];

  const BOSSES = [
    { id: 1, afterUnit: 3, range: [1, 2, 3], title: '숲의 수호 나무', goal: '시들어 가는 수호 나무를 영어의 힘으로 되살려요!', reward: '애플왕 진화 해금' },
    { id: 2, afterUnit: 6, range: [4, 5, 6], title: '황금 사과의 시련', goal: '빛을 잃은 황금 사과나무에 다시 빛을 채워요!', reward: '애플대왕 진화 해금' },
    { id: 3, afterUnit: 11, range: [1,2,3,4,5,6,7,8,9,10,11], title: '전설의 사과나무', goal: '숲에서 가장 오래된 전설의 나무를 깨워요!', reward: '전설 카드 장식 · 특별 배지' },
  ];

  const DEFAULT_RULES = {
    expBasic: 5, expReview: 7,
    evo1: { exp: 100, units: 3, boss: 1 },
    evo2: { exp: 250, units: 6, boss: 2 },
    quizLen: 10, setLen: 5, reviewLen: 5, bossLen: 10, bossPass: 7, setPass: 3,
    decayOn: true, decayEnergyDays: 3, decayStageDays: 7, decayBaseDays: 14, pauseWeekends: true,
    openUnits: [1,2,3,4,5,6,7,8,9,10,11],
  };

  /* 만족도 조사 보내기 설정 (제작자용)
   * 구글 설문지 주소와 질문 번호(entry.숫자)를 넣으면 학생 응답이 제작자의 구글 설문지로 모입니다.
   * 비워 두면 응답은 그 기기의 선생님 관리실에만 기록됩니다. */
  // resultsCsv: 응답 시트를 '웹에 게시(CSV)'한 주소 — 넣으면 제작자 관리실에서 모든 학생의 응답을 모아 봅니다.
  const SURVEY = { formAction: '', entryRating: '', entryComment: '', entryInfo: '', resultsCsv: '' };
  // 제작자 관리실 비밀번호의 SHA-256 해시 (비밀번호 원문은 코드에 넣지 않음)
  const ADMIN_HASH = '03b00cc653103ede76f12cb62547e58390efd27699f8fb5c432315ef866bd611';
  const CREATOR = '치타민';

  /* 학급 서버(Cloudflare Worker) 주소. 비워 두면 기록은 각 기기에만 저장됩니다. 예: 'https://apple-quest-api.이름.workers.dev' */
  const API_BASE = '';

  root.AQ_DATA = { UNITS, STAGES, DECOR, BOSSES, DEFAULT_RULES, SURVEY, CREATOR, ADMIN_HASH, API_BASE };
  if (typeof module !== 'undefined') module.exports = root.AQ_DATA;
})(typeof globalThis !== 'undefined' ? globalThis : this);
