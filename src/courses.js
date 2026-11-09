/* 애플왕의 진화 모험 — 학년별 교재(코스)
 *
 * 3·4·5·6학년: 2022 개정 영어과 교육과정 「기본 어휘 목록」 중 초등 권장 어휘(*)와
 *   학년군별 의사소통 기능을 바탕으로 제작자가 새로 구성한 단원입니다. (교과서 원문이 아님)
 *   교육과정은 3~4학년군·5~6학년군 단위로만 제시하므로, 학년별 배치는 쉬운 것부터 나눈 것입니다.
 * 천재(이) 4학년: 선생님이 제공한 학습지(data.js의 UNITS)를 그대로 사용합니다.
 *
 * 단원 번호: 3학년 301~311, 4학년 401~411, 5학년 501~511, 6학년 601~611, 천재(이) 4학년 1~11
 * (보스전은 각 교재의 3·6·11번째 단원 뒤, 사과숲 장식은 n번째 단원을 끝내면 열려요.)
 */
(function (root) {
  const D = root.AQ_DATA || (typeof require !== 'undefined' ? require('./data.js') : null);
  const W = (en, ko, e = '') => ({ en, ko, e });
  const S = (en, ko) => ({ en, ko });
  const U = (id, title, ko, icon, words, sentences) => ({ id, title, ko, icon, words, sentences });

  const G3 = [
    U(301, 'Hello, I\'m Mina', '안녕, 나는 미나야', '👋',
      [W('hello', '안녕', '👋'), W('goodbye', '잘 가'), W('name', '이름', '📛'), W('friend', '친구', '🧑‍🤝‍🧑'), W('nice', '좋은, 반가운'), W('meet', '만나다', '🤝'), W('boy', '소년', '👦'), W('girl', '소녀', '👧')],
      [S('Hello, I\'m Mina.', '안녕, 나는 미나야.'), S('What\'s your name?', '너의 이름은 뭐니?'), S('My name is Tom.', '내 이름은 톰이야.'), S('Nice to meet you.', '만나서 반가워.'), S('Goodbye, see you.', '잘 가, 또 만나.')]),
    U(302, 'What\'s This?', '이것은 뭐니?', '❓',
      [W('book', '책', '📕'), W('pen', '펜', '🖊️'), W('bag', '가방', '🎒'), W('cap', '모자', '🧢'), W('ball', '공', '⚽'), W('desk', '책상'), W('robot', '로봇', '🤖'), W('doll', '인형', '🪆')],
      [S('What\'s this?', '이것은 뭐니?'), S('It\'s a book.', '그것은 책이야.'), S('Is it a ball?', '그것은 공이니?'), S('Yes, it is.', '응, 맞아.'), S('No, it isn\'t.', '아니, 그렇지 않아.')]),
    U(303, 'Sit Down, Please', '앉아 주세요', '🪑',
      [W('sit', '앉다'), W('stand', '서다', '🧍'), W('open', '열다'), W('close', '닫다'), W('door', '문', '🚪'), W('window', '창문', '🪟'), W('quiet', '조용한', '🤫'), W('please', '부탁해요', '🙏')],
      [S('Sit down, please.', '앉아 주세요.'), S('Stand up, please.', '일어서 주세요.'), S('Open the door, please.', '문을 열어 주세요.'), S('Close the window.', '창문을 닫으렴.'), S('Be quiet, please.', '조용히 해 주세요.')]),
    U(304, 'How Many Apples?', '사과가 몇 개니?', '🍎',
      [W('one', '하나(1)', '1️⃣'), W('two', '둘(2)', '2️⃣'), W('three', '셋(3)', '3️⃣'), W('four', '넷(4)', '4️⃣'), W('five', '다섯(5)', '5️⃣'), W('six', '여섯(6)', '6️⃣'), W('seven', '일곱(7)', '7️⃣'), W('ten', '열(10)', '🔟'), W('apple', '사과', '🍎')],
      [S('How many apples?', '사과가 몇 개니?'), S('Three apples.', '사과 세 개.'), S('How many dogs?', '개가 몇 마리니?'), S('Five dogs.', '개 다섯 마리.'), S('I have two pens.', '나는 펜이 두 개 있어.')]),
    U(305, 'I Like Pizza', '나는 피자를 좋아해', '🍕',
      [W('pizza', '피자', '🍕'), W('chicken', '치킨', '🍗'), W('milk', '우유', '🥛'), W('juice', '주스', '🧃'), W('banana', '바나나', '🍌'), W('carrot', '당근', '🥕'), W('candy', '사탕', '🍬'), W('like', '좋아하다')],
      [S('Do you like pizza?', '너는 피자를 좋아하니?'), S('Yes, I do.', '응, 좋아해.'), S('No, I don\'t.', '아니, 안 좋아해.'), S('I like chicken.', '나는 치킨을 좋아해.'), S('I don\'t like carrots.', '나는 당근을 좋아하지 않아.')]),
    U(306, 'What Color Is It?', '그것은 무슨 색이니?', '🎨',
      [W('red', '빨간색', '🔴'), W('blue', '파란색', '🔵'), W('yellow', '노란색', '🟡'), W('green', '초록색', '🟢'), W('white', '흰색', '⚪'), W('black', '검은색', '⚫'), W('pink', '분홍색', '🩷'), W('color', '색깔', '🌈')],
      [S('What color is it?', '그것은 무슨 색이니?'), S('It\'s red.', '빨간색이야.'), S('It\'s yellow.', '노란색이야.'), S('I like blue.', '나는 파란색을 좋아해.'), S('My bag is green.', '내 가방은 초록색이야.')]),
    U(307, 'Can You Swim?', '너는 수영할 수 있니?', '🏊',
      [W('swim', '수영하다', '🏊'), W('skate', '스케이트 타다', '⛸️'), W('ski', '스키 타다', '⛷️'), W('jump', '점프하다'), W('run', '달리다', '🏃'), W('soccer', '축구', '⚽'), W('baseball', '야구', '⚾'), W('tennis', '테니스', '🎾')],
      [S('Can you swim?', '너는 수영할 수 있니?'), S('Yes, I can.', '응, 할 수 있어.'), S('No, I can\'t.', '아니, 못 해.'), S('Let\'s play soccer.', '축구하자.'), S('Sounds good.', '좋아.')]),
    U(308, 'How\'s the Weather?', '날씨가 어때?', '⛅',
      [W('sunny', '화창한', '☀️'), W('rain', '비', '🌧️'), W('snow', '눈', '❄️'), W('wind', '바람', '🌬️'), W('cloud', '구름', '☁️'), W('hot', '더운', '🥵'), W('cold', '추운', '🥶'), W('warm', '따뜻한')],
      [S('How\'s the weather?', '날씨가 어때?'), S('It\'s sunny.', '화창해.'), S('It\'s raining.', '비가 오고 있어.'), S('It\'s snowing.', '눈이 오고 있어.'), S('It\'s cold today.', '오늘은 추워.')]),
    U(309, 'This Is My Family', '이분은 우리 가족이야', '👨‍👩‍👧',
      [W('family', '가족', '👨‍👩‍👧'), W('father', '아버지', '👨'), W('mother', '어머니', '👩'), W('brother', '남자 형제', '👦'), W('sister', '여자 형제', '👧'), W('grandfather', '할아버지', '👴'), W('baby', '아기', '👶'), W('uncle', '삼촌')],
      [S('Who is he?', '그는 누구니?'), S('He is my father.', '그는 우리 아버지야.'), S('Who is she?', '그녀는 누구니?'), S('She is my sister.', '그녀는 우리 언니(누나)야.'), S('This is my family.', '이분들은 우리 가족이야.')]),
    U(310, 'It\'s a Big Lion', '그것은 커다란 사자야', '🦁',
      [W('lion', '사자', '🦁'), W('tiger', '호랑이', '🐯'), W('monkey', '원숭이', '🐒'), W('elephant', '코끼리', '🐘'), W('rabbit', '토끼', '🐰'), W('bird', '새', '🐦'), W('big', '큰'), W('small', '작은')],
      [S('What\'s that?', '저것은 뭐니?'), S('It\'s a lion.', '그것은 사자야.'), S('It\'s big.', '그것은 커.'), S('It\'s small and cute.', '그것은 작고 귀여워.'), S('Look at the monkey.', '저 원숭이를 봐.')]),
    U(311, 'How Old Are You?', '너는 몇 살이니?', '🎂',
      [W('birthday', '생일', '🎂'), W('cake', '케이크', '🍰'), W('party', '파티', '🎉'), W('card', '카드'), W('toy', '장난감', '🧸'), W('happy', '행복한', '😄'), W('old', '나이가 ~인'), W('thank', '고마워하다')],
      [S('How old are you?', '너는 몇 살이니?'), S('I\'m ten years old.', '나는 열 살이야.'), S('Happy birthday!', '생일 축하해!'), S('This is for you.', '이건 너를 위한 거야.'), S('Thank you very much.', '정말 고마워.')]),
  ];

  const G4 = [
    U(401, 'Where Is My Bag?', '내 가방은 어디 있니?', '🎒',
      [W('where', '어디에'), W('on', '~ 위에'), W('in', '~ 안에'), W('under', '~ 아래에'), W('box', '상자', '📦'), W('bed', '침대', '🛏️'), W('table', '탁자'), W('bag', '가방', '🎒')],
      [S('Where is my bag?', '내 가방은 어디 있니?'), S('It\'s on the desk.', '책상 위에 있어.'), S('It\'s under the bed.', '침대 아래에 있어.'), S('It\'s in the box.', '상자 안에 있어.'), S('Where is the cat?', '고양이는 어디 있니?')]),
    U(402, 'What Time Is It?', '몇 시니?', '⏰',
      [W('time', '시간'), W('clock', '시계', '🕰️'), W('morning', '아침', '🌅'), W('breakfast', '아침 식사', '🥞'), W('lunch', '점심 식사', '🍱'), W('dinner', '저녁 식사', '🍽️'), W('school', '학교', '🏫'), W('eleven', '열하나(11)', '🕚'), W('twelve', '열둘(12)', '🕛')],
      [S('What time is it?', '몇 시니?'), S('It\'s seven o\'clock.', '7시야.'), S('It\'s time for lunch.', '점심 먹을 시간이야.'), S('It\'s time for bed.', '잘 시간이야.'), S('It\'s twelve thirty.', '12시 30분이야.')]),
    U(403, 'What Are You Doing?', '너는 무엇을 하고 있니?', '🎨',
      [W('read', '읽다', '📖'), W('sing', '노래하다', '🎤'), W('dance', '춤추다', '💃'), W('cook', '요리하다', '🧑‍🍳'), W('draw', '그리다', '🖍️'), W('sleep', '자다', '😴'), W('watch', '보다', '📺'), W('write', '쓰다', '✍️')],
      [S('What are you doing?', '너는 무엇을 하고 있니?'), S('I\'m reading a book.', '나는 책을 읽고 있어.'), S('I\'m cooking.', '나는 요리하고 있어.'), S('I\'m watching TV.', '나는 텔레비전을 보고 있어.'), S('She is singing.', '그녀는 노래하고 있어.')]),
    U(404, 'Whose Cap Is This?', '이건 누구의 모자니?', '🧢',
      [W('whose', '누구의'), W('cap', '모자', '🧢'), W('shoe', '신발', '👟'), W('sock', '양말', '🧦'), W('jacket', '재킷', '🧥'), W('umbrella', '우산', '☂️'), W('watch', '손목시계', '⌚'), W('mine', '나의 것')],
      [S('Whose cap is this?', '이건 누구의 모자니?'), S('It\'s mine.', '그건 내 거야.'), S('Is this your umbrella?', '이거 네 우산이니?'), S('It\'s Tom\'s.', '그건 톰의 것이야.'), S('These are my socks.', '이건 내 양말이야.')]),
    U(405, 'How Much Is It?', '그것은 얼마니?', '💰',
      [W('much', '많은'), W('hundred', '백(100)', '💯'), W('money', '돈', '💵'), W('buy', '사다', '🛒'), W('cheap', '싼'), W('shop', '가게', '🏪'), W('pencil', '연필', '✏️'), W('notebook', '공책', '📓')],
      [S('How much is it?', '그것은 얼마니?'), S('It\'s five hundred won.', '500원이야.'), S('I want this pencil.', '나는 이 연필을 원해.'), S('Here you are.', '여기 있어.'), S('It\'s cheap.', '싸네요.')]),
    U(406, 'What Day Is It?', '오늘은 무슨 요일이니?', '📅',
      [W('Monday', '월요일'), W('Tuesday', '화요일'), W('Wednesday', '수요일'), W('Thursday', '목요일'), W('Friday', '금요일'), W('Saturday', '토요일'), W('Sunday', '일요일'), W('today', '오늘'), W('week', '주, 일주일')],
      [S('What day is it today?', '오늘은 무슨 요일이니?'), S('It\'s Monday.', '월요일이야.'), S('I have music class today.', '나는 오늘 음악 수업이 있어.'), S('See you on Friday.', '금요일에 만나.'), S('I play soccer on Sunday.', '나는 일요일에 축구를 해.')]),
    U(407, 'Let\'s Eat Together', '같이 먹자', '🍲',
      [W('eat', '먹다'), W('drink', '마시다', '🥤'), W('water', '물', '💧'), W('bread', '빵', '🍞'), W('soup', '수프', '🍲'), W('salad', '샐러드', '🥗'), W('sandwich', '샌드위치', '🥪'), W('delicious', '맛있는', '😋')],
      [S('Are you hungry?', '너 배고프니?'), S('Yes, I am.', '응, 배고파.'), S('Let\'s eat together.', '같이 먹자.'), S('Can I have some water?', '물 좀 마셔도 될까?'), S('It\'s delicious.', '맛있어.')]),
    U(408, 'Can You Help Me?', '나를 도와줄 수 있니?', '🤝',
      [W('help', '돕다'), W('carry', '나르다'), W('clean', '청소하다', '🧹'), W('wash', '씻다', '🧼'), W('room', '방'), W('dish', '접시', '🍽️'), W('sure', '물론'), W('sorry', '미안한')],
      [S('Can you help me?', '나를 도와줄 수 있니?'), S('Sure, I can.', '물론, 도와줄게.'), S('Sorry, I can\'t.', '미안, 못 도와줘.'), S('Clean your room.', '네 방을 청소하렴.'), S('Wash your hands.', '손을 씻으렴.')]),
    U(409, 'What\'s Wrong?', '무슨 일이니?', '🤒',
      [W('head', '머리'), W('tooth', '이, 치아', '🦷'), W('hand', '손', '✋'), W('foot', '발', '🦶'), W('arm', '팔', '💪'), W('leg', '다리', '🦵'), W('sick', '아픈', '🤒'), W('doctor', '의사', '🧑‍⚕️')],
      [S('What\'s wrong?', '무슨 일이니?'), S('I have a cold.', '나는 감기에 걸렸어.'), S('I have a headache.', '나는 머리가 아파.'), S('Are you okay?', '너 괜찮니?'), S('Take care.', '몸조심해.')]),
    U(410, 'I Get Up at Seven', '나는 7시에 일어나', '🌅',
      [W('wake', '깨다, 일어나다', '⏰'), W('get', '얻다, ~하게 되다'), W('go', '가다', '🚶'), W('come', '오다'), W('home', '집', '🏠'), W('homework', '숙제', '📝'), W('night', '밤', '🌙'), W('early', '일찍')],
      [S('What time do you get up?', '너는 몇 시에 일어나니?'), S('I get up at seven.', '나는 7시에 일어나.'), S('I go to school at eight.', '나는 8시에 학교에 가.'), S('I do my homework at night.', '나는 밤에 숙제를 해.'), S('I go to bed early.', '나는 일찍 자.')]),
    U(411, 'Where Is the Library?', '도서관은 어디 있니?', '🏙️',
      [W('library', '도서관', '📚'), W('park', '공원', '🌳'), W('hospital', '병원', '🏥'), W('bank', '은행', '🏦'), W('zoo', '동물원', '🦒'), W('restaurant', '식당', '🍽️'), W('store', '가게', '🏬'), W('near', '가까운')],
      [S('Where is the library?', '도서관은 어디 있니?'), S('It\'s next to the park.', '공원 옆에 있어.'), S('Is it near here?', '여기서 가깝니?'), S('Let\'s go to the zoo.', '동물원에 가자.'), S('It\'s near the bank.', '은행 근처에 있어.')]),
  ];

  const G5 = [
    U(501, 'Where Are You From?', '너는 어디에서 왔니?', '🌏',
      [W('Korea', '한국', '🇰🇷'), W('China', '중국', '🇨🇳'), W('Japan', '일본', '🇯🇵'), W('Canada', '캐나다', '🇨🇦'), W('France', '프랑스', '🇫🇷'), W('country', '나라', '🗺️'), W('grade', '학년'), W('fifth', '다섯 번째')],
      [S('Where are you from?', '너는 어디에서 왔니?'), S('I\'m from Korea.', '나는 한국에서 왔어.'), S('What grade are you in?', '너는 몇 학년이니?'), S('I\'m in the fifth grade.', '나는 5학년이야.'), S('Nice to meet you, too.', '나도 만나서 반가워.')]),
    U(502, 'What Do You Do on Weekends?', '주말에 무엇을 하니?', '🚲',
      [W('weekend', '주말'), W('visit', '방문하다'), W('movie', '영화', '🎬'), W('bike', '자전거', '🚲'), W('hike', '하이킹하다', '🥾'), W('badminton', '배드민턴', '🏸'), W('grandmother', '할머니', '👵'), W('usually', '보통, 대개')],
      [S('What do you do on weekends?', '너는 주말에 무엇을 하니?'), S('I play badminton.', '나는 배드민턴을 쳐.'), S('I visit my grandmother.', '나는 할머니 댁에 가.'), S('I usually ride my bike.', '나는 보통 자전거를 타.'), S('I watch a movie with my family.', '나는 가족과 영화를 봐.')]),
    U(503, 'You Should See a Doctor', '병원에 가 보렴', '🩺',
      [W('cold', '감기', '🤧'), W('fever', '열', '🌡️'), W('headache', '두통', '🤕'), W('toothache', '치통', '🦷'), W('rest', '쉬다', '🛌'), W('medicine', '약', '💊'), W('should', '~해야 한다'), W('hospital', '병원', '🏥')],
      [S('What\'s wrong?', '무슨 일이니?'), S('I have a fever.', '나는 열이 나.'), S('You should see a doctor.', '병원에 가 보렴.'), S('You should get some rest.', '좀 쉬어야 해.'), S('Get well soon.', '빨리 낫기를 바라.')]),
    U(504, 'Go Straight and Turn Left', '쭉 가서 왼쪽으로 돌아', '🧭',
      [W('straight', '똑바로', '⬆️'), W('left', '왼쪽', '⬅️'), W('right', '오른쪽', '➡️'), W('turn', '돌다', '↩️'), W('block', '구역, 블록'), W('station', '역', '🚉'), W('next', '옆의, 다음의'), W('post office', '우체국', '🏤')],
      [S('Where is the post office?', '우체국은 어디 있니?'), S('Go straight one block.', '한 블록 쭉 가.'), S('Turn left.', '왼쪽으로 돌아.'), S('It\'s on your right.', '오른쪽에 있어.'), S('It\'s next to the station.', '역 옆에 있어.')]),
    U(505, 'What Did You Do Yesterday?', '어제 무엇을 했니?', '📸',
      [W('yesterday', '어제'), W('visited', '방문했다'), W('played', '놀았다'), W('watched', '봤다', '📺'), W('went', '갔다', '🚶'), W('ate', '먹었다'), W('made', '만들었다'), W('beach', '해변', '🏖️')],
      [S('What did you do yesterday?', '너는 어제 무엇을 했니?'), S('I visited my uncle.', '나는 삼촌 댁에 갔어.'), S('I watched a movie.', '나는 영화를 봤어.'), S('I went to the beach.', '나는 해변에 갔어.'), S('I made cookies.', '나는 쿠키를 만들었어.')]),
    U(506, 'I Want to Be a Pilot', '나는 조종사가 되고 싶어', '✈️',
      [W('pilot', '조종사', '🧑‍✈️'), W('doctor', '의사', '🧑‍⚕️'), W('cook', '요리사', '🧑‍🍳'), W('teacher', '선생님', '🧑‍🏫'), W('singer', '가수', '🎤'), W('scientist', '과학자', '🧑‍🔬'), W('police officer', '경찰관', '👮'), W('want', '원하다')],
      [S('What do you want to be?', '너는 무엇이 되고 싶니?'), S('I want to be a pilot.', '나는 조종사가 되고 싶어.'), S('I like cooking.', '나는 요리하는 것을 좋아해.'), S('I\'m good at singing.', '나는 노래를 잘해.'), S('That\'s a great dream.', '멋진 꿈이야.')]),
    U(507, 'May I Come In?', '들어가도 될까요?', '🚪',
      [W('may', '~해도 된다'), W('use', '사용하다'), W('borrow', '빌리다'), W('take', '가져가다, 찍다'), W('picture', '사진, 그림', '🖼️'), W('enter', '들어가다'), W('of course', '물론'), W('sorry', '미안한')],
      [S('May I come in?', '들어가도 될까요?'), S('Sure. Come in.', '그럼요. 들어오세요.'), S('May I use your pen?', '네 펜을 써도 될까?'), S('Sorry, you can\'t.', '미안하지만, 안 돼.'), S('May I take a picture?', '사진을 찍어도 될까요?')]),
    U(508, 'When Is Your Birthday?', '네 생일은 언제니?', '🎂',
      [W('January', '1월'), W('March', '3월'), W('May', '5월'), W('July', '7월'), W('October', '10월'), W('December', '12월'), W('month', '달, 월', '🗓️'), W('birthday', '생일', '🎂')],
      [S('When is your birthday?', '네 생일은 언제니?'), S('It\'s on May fifth.', '5월 5일이야.'), S('My birthday is in July.', '내 생일은 7월에 있어.'), S('Let\'s have a party.', '파티를 하자.'), S('What month is it?', '지금은 몇 월이니?')]),
    U(509, 'What Would You Like?', '무엇을 드릴까요?', '🍔',
      [W('hamburger', '햄버거', '🍔'), W('spaghetti', '스파게티', '🍝'), W('steak', '스테이크', '🥩'), W('ice cream', '아이스크림', '🍦'), W('cookie', '쿠키', '🍪'), W('order', '주문하다'), W('would', '~하고 싶다(정중)'), W('else', '그 밖의')],
      [S('What would you like?', '무엇을 드릴까요?'), S('I\'d like a hamburger.', '햄버거 주세요.'), S('Anything else?', '더 필요한 것 있으세요?'), S('Some juice, please.', '주스 주세요.'), S('How about you?', '너는 어때?')]),
    U(510, 'Who Is Taller?', '누가 더 키가 크니?', '📏',
      [W('tall', '키가 큰', '🦒'), W('short', '키가 작은'), W('fast', '빠른', '🐆'), W('slow', '느린', '🐢'), W('strong', '힘센', '💪'), W('heavy', '무거운', '🏋️'), W('long', '긴', '🐍'), W('than', '~보다')],
      [S('Who is taller?', '누가 더 키가 크니?'), S('Mina is taller than Jin.', '미나가 진보다 키가 더 커.'), S('A tiger is faster than a dog.', '호랑이는 개보다 더 빨라.'), S('An elephant is heavier than a horse.', '코끼리는 말보다 더 무거워.'), S('Which is longer?', '어느 것이 더 기니?')]),
    U(511, 'What Will You Do This Summer?', '이번 여름에 무엇을 할 거니?', '🏕️',
      [W('summer', '여름', '☀️'), W('vacation', '방학', '🏖️'), W('travel', '여행하다', '🧳'), W('camp', '야영하다', '⛺'), W('mountain', '산', '⛰️'), W('trip', '여행'), W('plan', '계획'), W('will', '~할 것이다')],
      [S('What will you do this summer?', '이번 여름에 무엇을 할 거니?'), S('I\'m going to visit my grandmother.', '나는 할머니 댁에 갈 거야.'), S('I will go camping.', '나는 캠핑을 갈 거야.'), S('What\'s your plan?', '너의 계획은 뭐니?'), S('Have a nice trip.', '즐거운 여행 되렴.')]),
  ];

  const G6 = [
    U(601, 'How Often Do You Exercise?', '얼마나 자주 운동하니?', '🏃',
      [W('exercise', '운동하다', '🏋️'), W('often', '자주'), W('always', '항상'), W('never', '절대 ~ 않다'), W('every', '모든, ~마다'), W('once', '한 번'), W('twice', '두 번'), W('week', '주, 일주일')],
      [S('How often do you exercise?', '너는 얼마나 자주 운동하니?'), S('I exercise twice a week.', '나는 일주일에 두 번 운동해.'), S('I always eat breakfast.', '나는 항상 아침을 먹어.'), S('I never eat fast food.', '나는 패스트푸드를 절대 안 먹어.'), S('I walk my dog every day.', '나는 매일 개를 산책시켜.')]),
    U(602, 'Why Are You Happy?', '너는 왜 기쁘니?', '😊',
      [W('why', '왜'), W('because', '왜냐하면'), W('happy', '행복한', '😄'), W('sad', '슬픈', '😢'), W('tired', '피곤한', '😩'), W('worried', '걱정하는', '😟'), W('glad', '기쁜'), W('angry', '화난', '😠')],
      [S('Why are you happy?', '너는 왜 기쁘니?'), S('Because I won the game.', '왜냐하면 경기에서 이겼거든.'), S('Why are you sad?', '너는 왜 슬프니?'), S('I\'m tired because I ran a lot.', '많이 뛰어서 피곤해.'), S('Don\'t worry.', '걱정하지 마.')]),
    U(603, 'What\'s Your Favorite Subject?', '가장 좋아하는 과목이 뭐니?', '📚',
      [W('math', '수학', '➗'), W('science', '과학', '🔬'), W('art', '미술', '🎨'), W('music', '음악', '🎵'), W('English', '영어', '🔤'), W('history', '역사', '🏯'), W('subject', '과목'), W('favorite', '가장 좋아하는')],
      [S('What\'s your favorite subject?', '네가 가장 좋아하는 과목은 뭐니?'), S('My favorite subject is science.', '내가 가장 좋아하는 과목은 과학이야.'), S('I\'m good at math.', '나는 수학을 잘해.'), S('I like art because I like drawing.', '나는 그림 그리기를 좋아해서 미술이 좋아.'), S('What about you?', '너는 어때?')]),
    U(604, 'Let\'s Save the Earth', '지구를 지키자', '🌍',
      [W('earth', '지구', '🌍'), W('save', '아끼다, 구하다'), W('plastic', '플라스틱'), W('paper', '종이', '📄'), W('bottle', '병', '🍾'), W('light', '전등, 빛', '💡'), W('turn off', '끄다'), W('recycle', '재활용하다', '♻️')],
      [S('We should save water.', '우리는 물을 아껴야 해.'), S('Turn off the light.', '전등을 끄렴.'), S('Don\'t use plastic bags.', '비닐봉지를 쓰지 마.'), S('Let\'s recycle bottles.', '병을 재활용하자.'), S('Let\'s save the earth.', '지구를 지키자.')]),
    U(605, 'How Was Your Trip?', '여행은 어땠니?', '🧳',
      [W('trip', '여행'), W('was', '~이었다'), W('great', '아주 좋은'), W('fun', '재미있는'), W('sea', '바다', '🌊'), W('swam', '수영했다', '🏊'), W('saw', '보았다', '👀'), W('took', '찍었다, 탔다')],
      [S('How was your trip?', '여행은 어땠니?'), S('It was great.', '아주 좋았어.'), S('I went to Jeju.', '나는 제주도에 갔어.'), S('I swam in the sea.', '나는 바다에서 수영했어.'), S('I took many pictures.', '나는 사진을 많이 찍었어.')]),
    U(606, 'What Do You Think?', '너는 어떻게 생각하니?', '💭',
      [W('think', '생각하다', '🤔'), W('idea', '생각, 아이디어', '💡'), W('agree', '동의하다'), W('right', '옳은', '✅'), W('wrong', '틀린', '❌'), W('good', '좋은', '👍'), W('important', '중요한'), W('so', '그렇게')],
      [S('What do you think?', '너는 어떻게 생각하니?'), S('I think it\'s a good idea.', '좋은 생각인 것 같아.'), S('I agree with you.', '나는 네 말에 동의해.'), S('I don\'t think so.', '나는 그렇게 생각하지 않아.'), S('You\'re right.', '네 말이 맞아.')]),
    U(607, 'Will You Join Us?', '우리와 함께할래?', '🎉',
      [W('join', '함께하다'), W('invite', '초대하다', '💌'), W('party', '파티', '🎉'), W('busy', '바쁜'), W('free', '한가한'), W('love', '정말 좋아하다', '❤️'), W('come', '오다'), W('tomorrow', '내일')],
      [S('Will you join us?', '우리와 함께할래?'), S('Sure, I\'d love to.', '물론, 정말 좋아.'), S('Sorry, I can\'t. I\'m busy.', '미안, 못 가. 바빠.'), S('Can you come to my party?', '내 파티에 올 수 있니?'), S('Are you free tomorrow?', '내일 시간 있니?')]),
    U(608, 'Who Made It?', '누가 그것을 만들었니?', '🖼️',
      [W('made', '만들었다'), W('wrote', '썼다', '✍️'), W('painted', '그렸다', '🎨'), W('built', '지었다', '🏗️'), W('invented', '발명했다'), W('book', '책', '📕'), W('picture', '그림', '🖼️'), W('famous', '유명한')],
      [S('Who painted this picture?', '누가 이 그림을 그렸니?'), S('Gogh painted it.', '고흐가 그렸어.'), S('Who wrote this book?', '누가 이 책을 썼니?'), S('King Sejong made Hangeul.', '세종대왕이 한글을 만들었어.'), S('He is very famous.', '그는 아주 유명해.')]),
    U(609, 'What Does She Look Like?', '그녀는 어떻게 생겼니?', '👀',
      [W('hair', '머리카락', '💇'), W('long', '긴'), W('short', '짧은'), W('eyes', '눈', '👀'), W('glasses', '안경', '👓'), W('wear', '입다, 쓰다'), W('tall', '키가 큰', '🦒'), W('look', '보다, ~해 보이다')],
      [S('What does she look like?', '그녀는 어떻게 생겼니?'), S('She has long hair.', '그녀는 머리가 길어.'), S('He has big eyes.', '그는 눈이 커.'), S('He is wearing glasses.', '그는 안경을 쓰고 있어.'), S('She is tall.', '그녀는 키가 커.')]),
    U(610, 'You Should Wear a Helmet', '헬멧을 써야 해', '⛑️',
      [W('helmet', '헬멧', '⛑️'), W('careful', '조심하는', '⚠️'), W('safe', '안전한'), W('danger', '위험', '🚨'), W('cross', '건너다', '🚸'), W('street', '거리', '🛣️'), W('run', '달리다', '🏃'), W('shouldn\'t', '~하면 안 된다')],
      [S('You should wear a helmet.', '너는 헬멧을 써야 해.'), S('Be careful.', '조심해.'), S('You shouldn\'t run here.', '여기서 뛰면 안 돼.'), S('Look both ways before you cross.', '건너기 전에 양쪽을 살펴.'), S('Safety first!', '안전이 먼저야!')]),
    U(611, 'My Dream for the Future', '나의 미래 꿈', '🚀',
      [W('future', '미래'), W('dream', '꿈'), W('become', '~이 되다'), W('job', '직업', '💼'), W('world', '세계', '🌐'), W('people', '사람들', '👨‍👩‍👧‍👦'), W('help', '돕다'), W('scientist', '과학자', '🧑‍🔬')],
      [S('What\'s your dream?', '너의 꿈은 뭐니?'), S('My dream is to become a scientist.', '내 꿈은 과학자가 되는 거야.'), S('I want to help people.', '나는 사람들을 돕고 싶어.'), S('I will travel around the world.', '나는 세계 여행을 할 거야.'), S('Follow your dream.', '꿈을 따라가렴.')]),
  ];

  const CJ4 = (D && D.UNITS) || [];
  const tag = (units, course) => units.map((u, i) => ({ ...u, no: i + 1, course }));
  const COURSES = [
    { key: 'g3', label: '3학년', sub: '교육과정 권장 어휘', grade: 3, src: 'curriculum', units: tag(G3, 'g3') },
    { key: 'g4', label: '4학년', sub: '교육과정 권장 어휘', grade: 4, src: 'curriculum', units: tag(G4, 'g4') },
    { key: 'g5', label: '5학년', sub: '교육과정 권장 어휘', grade: 5, src: 'curriculum', units: tag(G5, 'g5') },
    { key: 'g6', label: '6학년', sub: '교육과정 권장 어휘', grade: 6, src: 'curriculum', units: tag(G6, 'g6') },
    { key: 'cj4', label: '천재(이) 4학년', sub: '교과서 학습지 + 응용 문장', grade: 4, src: 'textbook', units: tag(CJ4, 'cj4') },
  ];
  const ALL_UNITS = COURSES.flatMap(c => c.units);

  root.AQ_COURSES = { COURSES, ALL_UNITS };
  if (typeof module !== 'undefined') module.exports = root.AQ_COURSES;
})(typeof globalThis !== 'undefined' ? globalThis : this);
