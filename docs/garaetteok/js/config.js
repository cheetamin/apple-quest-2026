// 배포 환경에 맞게 바꿀 수 있는 설정
export const CONFIG = {
  // MediaPipe Tasks Vision (무료, 브라우저 안에서 처리 — 영상은 외부로 전송되지 않음)
  // vendor/ 폴더에 파일을 넣어 두면 인터넷이 없어도 동작합니다 (docs/OFFLINE.md 참고).
  visionBundle: [
    './vendor/mediapipe/vision_bundle.mjs',
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs',
  ],
  wasmBase: [
    './vendor/mediapipe/wasm',
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
  ],
  models: {
    lite: [
      './vendor/mediapipe/pose_landmarker_lite.task',
      'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
    ],
    full: [
      './vendor/mediapipe/pose_landmarker_full.task',
      'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
    ],
  },
  // 음원 파일로 바꾸고 싶을 때: assets/audio/ 에 파일을 넣고 경로를 적으세요. 비워 두면 내장 합성 음악 사용.
  audioFiles: {
    // main: './assets/audio/main.mp3',
    dance: './assets/audio/dance.mp3',   // 〈가래떡 댄스〉 (Suno로 제작한 노래)
    relay: './assets/audio/dance.mp3',   // 이어달리기에서도 같은 노래
  },
  // 댄스 음원의 실제 박자 시각(초). 음원을 바꾸면 이 파일도 다시 만들어야 동작 판정이 박자에 맞아요.
  danceBeats: './assets/audio/dance.beats.json',
  danceBpm: 112,
  // 노래방 자막 타이밍(초). 교사용 설정 → [🎤 가사 타이밍 맞추기]로 만든 값을 붙여 넣으면 모든 기기에 적용돼요.
  danceLyrics: null,
};
