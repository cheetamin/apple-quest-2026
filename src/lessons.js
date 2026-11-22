/* 차시별 복습 활동 — 공모전 체험판의 '천재(이) 4학년' 단원에 붙는 4차시 15개 활동
   (챈트·대화·읽기 글·역할극 대본은 단원 단어·문장으로 새로 지은 것으로, 교과서 원문을 옮기지 않았어요) */
(function (root) {
  'use strict';
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const DAYS_KO = { Sunday: '일요일', Monday: '월요일', Tuesday: '화요일', Wednesday: '수요일', Thursday: '목요일', Friday: '금요일', Saturday: '토요일' };
  const L9 = {
    unit: 9, course: 'cj4',
    title: 'What Day Is It Today?', ko: '오늘 무슨 요일이야?',
    goal: '요일을 묻고 답하며, 오늘 있는 수업을 말할 수 있어요.',
    chapters: [
      { no: 1, name: '챈트·단어', icon: '🎵', acts: [
        { id: 'chant', type: 'chant', title: '요일 챈트 따라 부르기', desc: '박자에 맞춰 요일을 신나게 불러요', lines: [
          ['Sunday, Monday, Tuesday!', '일요일, 월요일, 화요일!'],
          ['Wednesday, Thursday, Friday!', '수요일, 목요일, 금요일!'],
          ['Saturday, Saturday, it\'s a fun day!', '토요일, 토요일, 신나는 날!'],
          ['What day is it today?', '오늘 무슨 요일이야?'],
          ['It\'s Friday! It\'s Friday!', '금요일이야! 금요일이야!'],
          ['I have art class today!', '나는 오늘 미술 수업이 있어!'],
          ['Let\'s go home! Sure!', '집에 가자! 좋아!'],
        ] },
        { id: 'order', type: 'order', title: '요일 순서 맞추기', desc: '일요일부터 토요일까지 차례대로 눌러요', items: DAYS },
        { id: 'listen', type: 'choice', title: '듣고 요일 고르기', desc: '들려주는 요일 카드를 골라요', gen: 'listenDays', n: 5 },
        { id: 'short', type: 'match', title: '줄임말 짝 맞추기', desc: '달력에 쓰는 줄임말과 요일을 이어요', pairs: DAYS.map(d => [d.slice(0, 3), d]) },
      ] },
      { no: 2, name: '듣고 말하기', icon: '🗣️', acts: [
        { id: 'dialog', type: 'choice', title: '대화 듣고 고르기', desc: '달력을 보고 대화의 빈칸을 채워요', steps: [
          { cal: 'Wednesday', lines: [['A', 'What day is it today?'], ['B', 'It\'s ____.']], options: ['Wednesday', 'Monday', 'Friday', 'Sunday'], answer: 'Wednesday' },
          { cal: 'Monday', lines: [['A', 'What ____ is it today?'], ['B', 'It\'s Monday.']], options: ['day', 'home', 'art', 'class'], answer: 'day' },
          { cal: 'Saturday', lines: [['A', 'What day is it today?'], ['B', 'It\'s ____.']], options: ['Saturday', 'Sunday', 'Thursday', 'Tuesday'], answer: 'Saturday' },
          { cal: 'Friday', lines: [['A', 'Let\'s go home.'], ['B', '____.']], options: ['Sure', 'Monday', 'Today', 'Art'], answer: 'Sure' },
        ] },
        { id: 'speak', type: 'speak', title: '따라 말하기', desc: '마이크에 대고 또박또박 말해 봐요', sentences: [
          ['What day is it today?', '오늘 무슨 요일이야?'], ['It\'s Monday.', '월요일이야.'], ['It\'s Thursday.', '목요일이야.'],
          ['I have art class today.', '나는 오늘 미술 수업이 있어.'], ['Let\'s go home.', '집에 가자.'],
        ] },
        { id: 'timetable', type: 'choice', title: '시간표 보고 답하기', desc: '민지의 시간표를 보고 질문에 답해요',
          table: [['Monday', 'English', '영어'], ['Tuesday', 'art', '미술'], ['Wednesday', 'music', '음악'], ['Thursday', 'P.E.', '체육'], ['Friday', 'science', '과학']],
          steps: [
            { q: 'It\'s Tuesday. What class do I have today?', ko: '화요일이에요. 오늘은 무슨 수업이 있나요?', options: ['art', 'music', 'P.E.', 'English'], answer: 'art' },
            { q: 'I have music class today. What day is it today?', ko: '오늘 음악 수업이 있어요. 오늘은 무슨 요일인가요?', options: ['Wednesday', 'Monday', 'Friday', 'Tuesday'], answer: 'Wednesday' },
            { q: 'It\'s Thursday. What class do I have today?', ko: '목요일이에요. 오늘은 무슨 수업이 있나요?', options: ['P.E.', 'science', 'art', 'English'], answer: 'P.E.' },
            { q: 'I have science class today. What day is it today?', ko: '오늘 과학 수업이 있어요. 오늘은 무슨 요일인가요?', options: ['Friday', 'Thursday', 'Sunday', 'Wednesday'], answer: 'Friday' },
          ] },
        { id: 'partner', type: 'aitalk', title: 'AI 대화 짝꿍', desc: 'AI 친구와 요일을 묻고 답해요', scenario: 'day', starter: ['Hi! I\'m Apple. What day is it today?', '안녕! 나는 애플이야. 오늘 무슨 요일이야?'], turns: 4,
          hints: ['It\'s Monday.', 'It\'s Friday.', 'I have art class today.', 'What day is it today?', 'Sure!'] },
      ] },
      { no: 3, name: '읽기·쓰기', icon: '✏️', acts: [
        { id: 'read', type: 'read', title: '민지의 일기 읽기', desc: '글을 읽고 맞으면 O, 틀리면 X', passage: [
          ['Hi, I\'m Minji.', '안녕, 나는 민지야.'],
          ['Today is Wednesday.', '오늘은 수요일이야.'],
          ['I have art class today. I like art!', '나는 오늘 미술 수업이 있어. 나는 미술이 좋아!'],
          ['On Friday, I have music class.', '금요일에는 음악 수업이 있어.'],
          ['On Sunday, I stay home with my family.', '일요일에는 가족과 집에 있어.'],
        ], qs: [
          ['Today is Monday.', false, '오늘은 수요일(Wednesday)이에요.'],
          ['Minji has art class today.', true, '"I have art class today."라고 했어요.'],
          ['Minji has music class on Friday.', true, '"On Friday, I have music class."라고 했어요.'],
          ['Minji goes to school on Sunday.', false, '일요일에는 가족과 집에 있어요(stay home).'],
        ] },
        { id: 'spell', type: 'spell', title: '요일 철자 쓰기', desc: '우리말을 보고 요일을 영어로 써요', words: DAYS.map(d => [d, DAYS_KO[d]]) },
        { id: 'sentence', type: 'write', title: '문장 완성하기', desc: '빈칸에 알맞은 낱말을 써서 문장을 완성해요', items: [
          ['오늘 무슨 요일이야?', 'What ____ is it today?', 'day'],
          ['금요일이야.', 'It\'s ____.', 'Friday'],
          ['나는 오늘 미술 수업이 있어.', 'I have ____ class today.', 'art'],
          ['집에 가자.', 'Let\'s go ____.', 'home'],
          ['오늘은 화요일이야.', 'Today is ____.', 'Tuesday'],
        ] },
        { id: 'aiwrite', type: 'aiwrite', title: 'AI 쓰기 도우미', desc: '오늘을 소개하는 글을 쓰면 AI가 다듬어 줘요',
          task: '오늘이 무슨 요일인지, 오늘 어떤 수업이 있는지 영어로 2~3문장 써 봐요.', frames: ['Today is ____.', 'It\'s ____.', 'I have ____ class today.', 'I like ____.'] },
      ] },
      { no: 4, name: '역할극', icon: '🎭', acts: [
        { id: 'script', type: 'script', title: '역할극 대본 읽기', desc: '역할을 골라 친구(AI 목소리)와 대화해요', roles: ['Minji', 'Jun'], lines: [
          ['Jun', 'Hi, Minji!', '안녕, 민지야!'],
          ['Minji', 'Hi, Jun! What day is it today?', '안녕, 준아! 오늘 무슨 요일이야?'],
          ['Jun', 'It\'s Thursday.', '목요일이야.'],
          ['Minji', 'Oh, I have art class today!', '아, 나 오늘 미술 수업 있어!'],
          ['Jun', 'Me, too! I like art.', '나도! 나는 미술이 좋아.'],
          ['Minji', 'Let\'s go to art class.', '미술 수업에 가자.'],
          ['Jun', 'Sure!', '좋아!'],
          ['Minji', 'Class is over. Let\'s go home.', '수업이 끝났다. 집에 가자.'],
          ['Jun', 'Sure. Bye, Minji!', '좋아. 안녕, 민지야!'],
        ] },
        { id: 'scriptfill', type: 'choice', title: '대본 빈칸 채우기', desc: '역할극 대본의 빈칸에 알맞은 말을 골라요', steps: [
          { lines: [['Minji', 'Hi, Jun! What ____ is it today?'], ['Jun', 'It\'s Thursday.']], options: ['day', 'class', 'home', 'art'], answer: 'day' },
          { lines: [['Jun', 'It\'s ____.'], ['Minji', 'Oh, I have art class today!']], options: ['Thursday', 'Sure', 'home', 'today'], answer: 'Thursday' },
          { lines: [['Minji', 'Oh, I have ____ class today!'], ['Jun', 'Me, too! I like art.']], options: ['art', 'day', 'home', 'Sunday'], answer: 'art' },
          { lines: [['Minji', 'Class is over. Let\'s go ____.'], ['Jun', 'Sure. Bye, Minji!']], options: ['home', 'art', 'day', 'Friday'], answer: 'home' },
        ] },
        { id: 'roleplay', type: 'aitalk', title: 'AI 친구와 역할극', desc: 'AI 친구 준과 학교 장면을 연기해요', scenario: 'roleplay', starter: ['Hi! I\'m Jun. What day is it today?', '안녕! 나는 준이야. 오늘 무슨 요일이야?'], turns: 5,
          hints: ['It\'s Thursday.', 'I have art class today.', 'Me, too!', 'Let\'s go home.', 'Sure!'] },
      ] },
    ],
  };
  const LESSONS = { 9: L9 };
  root.AQ_LESSONS = { LESSONS, DAYS, DAYS_KO };
  if (typeof module !== 'undefined') module.exports = root.AQ_LESSONS;
})(typeof globalThis !== 'undefined' ? globalThis : this);
