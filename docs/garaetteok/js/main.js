// 진입점
import { app, registerScreen } from './app.js';
import { drawScenery } from './core/scenery.js';
import { audio } from './core/audio.js';
import { onTap } from './ui.js';
import * as mainS from './screens/main.js';
import * as settingsS from './screens/settings.js';
import * as cameraS from './screens/camera.js';
import * as introS from './screens/intro.js';
import * as physicalS from './screens/physical.js';
import * as quizS from './screens/quiz.js';
import * as mathS from './screens/math.js';
import * as resultS from './screens/result.js';
import * as relayS from './screens/relay.js';
import * as awardsS from './screens/awards.js';
import * as recordsS from './screens/records.js';
import * as storyS from './screens/story.js';
import { openTeacherMenu } from './screens/teacher.js';
import { motion } from './core/motion.js';

// 오래된 브라우저용 roundRect 보완
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(typeof r === 'number' ? r : (r && r[0]) || 0, w / 2, h / 2);
    this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); return this;
  };
}

registerScreen('main', mainS);
registerScreen('settings', settingsS);
registerScreen('camera', cameraS);
registerScreen('intro', introS);
registerScreen('physical', physicalS);
registerScreen('quiz', quizS);
registerScreen('math', mathS);
registerScreen('result', resultS);
registerScreen('relayIntro', { show: relayS.showIntro });
registerScreen('relay', relayS);
registerScreen('awards', awardsS);
registerScreen('records', recordsS);
registerScreen('story', storyS);

// 1920×1080 무대를 화면에 맞게 확대/축소 (16:9 유지)
const stage = document.getElementById('stage');
const fit = () => {
  const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  stage.style.transform = `translate(${(window.innerWidth - 1920 * s) / 2}px, ${(window.innerHeight - 1080 * s) / 2}px) scale(${s})`;
};
window.addEventListener('resize', fit); fit();

drawScenery(document.getElementById('bg'));

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { e.preventDefault(); openTeacherMenu(app); }
});
onTap(document.getElementById('teacher-btn'), () => openTeacherMenu(app));
onTap(document.getElementById('mute-btn'), () => {
  audio.unlock(); audio.configure({ muted: !audio.muted });
  document.getElementById('mute-btn').textContent = audio.muted ? '🔇' : '🔊';
});

app.applySettings();
// 주소에 ?sim=1 을 붙이면 카메라 없이 가상 학생으로 점검 (개발·시연용)
if (new URLSearchParams(location.search).has('sim') || location.hash === '#sim') motion.startSim();
app.go('main');
