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
    // dance: './assets/audio/dance.mp3',   // 댄스 음원을 바꾸면 danceBpm도 맞춰 주세요
  },
  danceBpm: 112,
};
