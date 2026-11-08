// Web Audio 합성 음악·효과음 (모든 음원 자체 제작, 외부 음원 사용 없음)
// 브라우저 자동재생 제한 때문에 사용자가 버튼을 누른 뒤 unlock() 으로 활성화한다.
import { CONFIG } from '../config.js';
import { SONG_LINES, sylCount } from '../data/dancesong.js';

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const hz = (n) => {
  if (typeof n === 'number') return n;
  const m = n.match(/^([A-G]#?)(\d)$/);
  return 440 * Math.pow(2, (NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12);
};

// 16분음표 단위 패턴. '.' 쉼표, 음이름은 공백 구분
const seq = (s) => s.trim().split(/\s+/).map((x) => (x === '.' ? null : x));

const SONGS = {
  main: {
    bpm: 112, bars: 4,
    mel: seq(`E5 . G5 . A5 . G5 E5 D5 . E5 . G5 . . .  C5 . D5 . E5 . G5 . A5 . G5 . E5 . . .
              E5 . G5 . A5 . C6 A5 G5 . A5 . G5 E5 . .  D5 . E5 . D5 . C5 . D5 . . . C5 . . .`),
    bass: seq(`C3 . . . C3 . . . A2 . . . A2 . . .  F2 . . . F2 . . . G2 . . . G2 . . .
               C3 . . . C3 . . . A2 . . . A2 . . .  F2 . . . G2 . . . C3 . . . C3 . . .`),
    drums: 'k.h.s.h.k.h.s.hh', wave: 'triangle',
  },
  quiz: {
    bpm: 92, bars: 2,
    mel: seq(`C5 . E5 . G5 . E5 . D5 . G5 . A5 . G5 .  C5 . E5 . G5 . A5 . G5 . E5 . D5 . . .`),
    bass: seq(`C3 . . . . . . . G2 . . . . . . .  A2 . . . . . . . G2 . . . . . . .`),
    drums: '..h...h...h...h.', wave: 'sine', melGain: 0.07,
  },
  physical: {
    bpm: 124, bars: 2,
    mel: seq(`G5 . G5 A5 . G5 E5 . D5 . E5 . G5 . . .  A5 . A5 C6 . A5 G5 . E5 . D5 . C5 . . .`),
    bass: seq(`C3 . C3 . C3 . C3 . A2 . A2 . A2 . A2 .  F2 . F2 . G2 . G2 . C3 . C3 . G2 . G2 .`),
    drums: 'k.hck.h.k.hck.hc', wave: 'square', melGain: 0.05,
  },
  // 〈떡떡! 가래떡 댄스〉 — 가사 멜로디(보컬 신스)는 아래 buildDanceSong()에서 채움
  dance: null,
  relay: {
    bpm: 144, bars: 2,
    mel: seq(`C5 E5 G5 E5 C5 E5 G5 C6 A5 G5 E5 G5 A5 . . .  D5 F5 A5 F5 D5 F5 A5 D6 C6 A5 G5 E5 D5 . . .`),
    bass: seq(`C3 . G2 . C3 . G2 . A2 . E2 . A2 . E2 .  F2 . C3 . F2 . C3 . G2 . D3 . G2 . D3 .`),
    drums: 'k.h.s.hkk.h.s.hh', wave: 'square', melGain: 0.05,
  },
  victory: {
    bpm: 120, bars: 2,
    mel: seq(`C5 . E5 . G5 . C6 . . . G5 . C6 . . .  A5 . C6 . D6 . E6 . . . D6 . C6 . . .`),
    bass: seq(`C3 . . . C3 . . . E3 . . . E3 . . .  F3 . . . G3 . . . C3 . . . C3 . . .`),
    drums: 'k...s...k.k.s.hh', wave: 'triangle',
  },
};

// 노래: 6줄 × 2마디 = 12마디. 16분음표 단위 192칸. 글자마다 8분음표 하나(2칸)
function buildDanceSong() {
  const steps = SONG_LINES.length * 32;
  const vox = Array(steps).fill(null), voxLen = Array(steps).fill(0);
  SONG_LINES.forEach((ln, li) => {
    const n = sylCount(ln.text);
    for (let k = 0; k < n; k++) { vox[li * 32 + k * 2] = ln.notes[k] || ln.notes[ln.notes.length - 1]; voxLen[li * 32 + k * 2] = k === n - 1 ? 5 : 1.7; }
  });
  const bassBar = ['C3', null, null, 'C3', null, null, 'G2', null, 'A2', null, null, 'A2', null, null, 'E2', null, 'F2', null, null, 'F2', null, null, 'C3', null, 'G2', null, null, 'G2', null, 'D3', null, null];
  const bass = Array.from({ length: steps }, (_, i) => bassBar[i % 32]);
  // 노래 사이사이 짧은 반주 장식
  const mel = Array.from({ length: steps }, (_, i) => (i % 32 >= 24 && i % 2 === 0 ? ['C6', 'A5', 'G5', 'E5'][(i % 8) / 2] : null));
  return { bpm: CONFIG.danceBpm, bars: SONG_LINES.length * 2, mel, bass, vox, voxLen, drums: 'kwhwskhhk.hwskhw', wave: 'square', melGain: 0.035 };
}
SONGS.dance = buildDanceSong();

class AudioEngine {
  constructor() {
    this.ctx = null; this.enabled = { bgm: true, sfx: true, tts: true };
    this.vol = { master: 0.8, bgm: 0.5, sfx: 0.8 }; this.muted = false;
    this.song = null; this.timer = null; this.fileEl = null; this.failedFiles = new Set(); this.danceBeats = null;
    if (CONFIG.danceBeats && typeof fetch === 'function') fetch(CONFIG.danceBeats).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j && j.beats) this.danceBeats = j.beats; }).catch(() => {});
  }
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.bgmGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.bgmGain.connect(this.master); this.sfxGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolume();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  applyVolume() {
    if (!this.ctx) return;
    const m = this.muted ? 0 : this.vol.master;
    this.master.gain.value = m;
    this.bgmGain.gain.value = this.enabled.bgm ? this.vol.bgm : 0;
    this.sfxGain.gain.value = this.enabled.sfx ? this.vol.sfx : 0;
    if (this.fileEl) this.fileEl.volume = this.enabled.bgm && !this.muted ? m * this.vol.bgm : 0;
  }
  configure({ bgm, sfx, tts, vol, muted } = {}) {
    if (bgm != null) this.enabled.bgm = bgm;
    if (sfx != null) this.enabled.sfx = sfx;
    if (tts != null) this.enabled.tts = tts;
    if (vol) Object.assign(this.vol, vol);
    if (muted != null) this.muted = muted;
    this.applyVolume();
  }

  _env(g, t, a, d, peak) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  tone(f, t, dur, type = 'sine', peak = 0.2, dest = this.sfxGain, slideTo = null) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(hz(f), t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(hz(slideTo), t + dur);
    this._env(g, t, 0.008, dur, peak);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  noise(t, dur, freq, q, peak, dest = this.sfxGain, type = 'bandpass') {
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain(); this._env(g, t, 0.003, dur, peak);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + dur + 0.05);
  }

  sfx(name) {
    if (!this.ctx || !this.enabled.sfx) return;
    const t = this.ctx.currentTime + 0.01;
    switch (name) {
      case 'correct': ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => this.tone(n, t + i * 0.07, 0.18, 'triangle', 0.22)); break;
      case 'wrong': this.tone('A3', t, 0.25, 'sawtooth', 0.08, this.sfxGain, 'E3'); this.tone('F3', t + 0.15, 0.3, 'sawtooth', 0.07); break;
      case 'point': this.tone('E6', t, 0.08, 'square', 0.06); this.tone('A6', t + 0.05, 0.1, 'square', 0.05); break;
      case 'chop': this.noise(t, 0.06, 2500, 1.2, 0.5); this.tone(180, t, 0.12, 'sine', 0.35, this.sfxGain, 70); break;
      case 'stack': this.tone(420, t, 0.07, 'triangle', 0.25); this.noise(t, 0.04, 1200, 3, 0.25); break;
      case 'flag': this.noise(t, 0.18, 900, 0.8, 0.25, this.sfxGain, 'lowpass'); this.tone('G5', t + 0.05, 0.08, 'triangle', 0.08); break;
      case 'tap': this.tone('C6', t, 0.05, 'sine', 0.12); break;
      case 'select': this.tone('G5', t, 0.06, 'triangle', 0.14); this.tone('C6', t + 0.04, 0.06, 'triangle', 0.1); break;
      case 'count': this.tone('A5', t, 0.15, 'square', 0.08); break;
      case 'go': this.tone('A6', t, 0.35, 'square', 0.09); break;
      case 'baton': this.tone('E5', t, 0.1, 'triangle', 0.2); this.tone('B5', t + 0.1, 0.18, 'triangle', 0.2); break;
      case 'finish': ['G5', 'C6', 'E6', 'G6'].forEach((n, i) => this.tone(n, t + i * 0.09, 0.25, 'square', 0.08)); break;
      case 'win': ['C5', 'E5', 'G5', 'C6', 'G5', 'C6', 'E6'].forEach((n, i) => this.tone(n, t + i * 0.12, 0.3, 'triangle', 0.18)); break;
      case 'whistle': this.tone(2400, t, 0.12, 'sine', 0.12); this.tone(2600, t + 0.14, 0.35, 'sine', 0.12); break;
      case 'tteok': this.tone(800, t, 0.05, 'square', 0.12); this.noise(t, 0.03, 3000, 5, 0.2); break;
      case 'hit': this.tone(150, t, 0.2, 'sawtooth', 0.15, this.sfxGain, 60); break;
      case 'gold': ['A5', 'C#6', 'E6'].forEach((n, i) => this.tone(n, t + i * 0.05, 0.15, 'triangle', 0.15)); break;
      default: break;
    }
  }

  playSong(name) {
    if (!this.ctx) return;
    if (this.song && this.song.name === name) return;
    this.stopSong();
    const file = CONFIG.audioFiles[name];
    this.songStart = this.ctx.currentTime + 0.1;
    if (file && !this.failedFiles.has(file)) {
      this.fileEl = new Audio(file); this.fileEl.loop = name !== 'victory';
      this.fileEl.addEventListener('error', () => { this.failedFiles.add(file); if (this.song && this.song.name === name) { this.stopSong(); this.playSong(name); } });
      this.fileEl.play().catch(() => {});
      this.song = { name, def: SONGS[name] || { bpm: 120 }, file: true };
      this.applyVolume();
      return;
    }
    const def = SONGS[name];
    if (!def) return;
    this.song = { name, def, step: 0, next: this.songStart };
    const stepDur = 60 / def.bpm / 4;
    this.timer = setInterval(() => {
      const s = this.song; if (!s || s.file) return;
      while (s.next < this.ctx.currentTime + 0.12) {
        this._step(s.def, s.step, s.next, stepDur);
        s.step++; s.next += stepDur;
        if (name === 'victory' && s.step >= def.bars * 16) { this.stopSong(); return; }
      }
    }, 25);
  }
  _step(def, i, t, sd) {
    const n = def.bars * 16, k = i % n;
    const m = def.mel[k % def.mel.length], b = def.bass[k % def.bass.length];
    if (m) this.tone(m, t, sd * 1.8, def.wave, def.melGain || 0.09, this.bgmGain);
    if (b) this.tone(b, t, sd * 3, 'triangle', 0.16, this.bgmGain);
    if (def.vox && def.vox[k]) this.voice(def.vox[k], t, sd * def.voxLen[k]);
    const d = def.drums[k % 16];
    if (d === 'k') this.tone(130, t, 0.12, 'sine', 0.4, this.bgmGain, 45);
    if (d === 's' || d === 'c') this.noise(t, 0.09, d === 'c' ? 1500 : 1800, 0.8, 0.18, this.bgmGain);
    if (d === 'h' || d === 's' || d === 'k') this.noise(t, 0.025, 8000, 1, 0.05, this.bgmGain, 'highpass');
    if (d === 'w') { this.tone(900, t, 0.04, 'square', 0.06, this.bgmGain); this.noise(t, 0.02, 3200, 6, 0.12, this.bgmGain); }
  }
  /** 노래하는 듯한 음색: 살짝 어긋난 사각파 2개 + 비브라토 + 모음 같은 필터 */
  voice(note, t, dur) {
    const f = hz(note);
    const g = this.ctx.createGain();
    const flt = this.ctx.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = 1100; flt.Q.value = 1.2;
    const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain(); lfo.frequency.value = 5.5; lg.gain.value = f * 0.012;
    lfo.connect(lg);
    for (const det of [-6, 6]) {
      const o = this.ctx.createOscillator(); o.type = 'square'; o.frequency.value = f; o.detune.value = det;
      lg.connect(o.frequency); o.connect(flt); o.start(t); o.stop(t + dur + 0.1);
    }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.11, t + 0.02);
    g.gain.setValueAtTime(0.11, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    flt.connect(g); g.connect(this.bgmGain); lfo.start(t); lfo.stop(t + dur + 0.1);
  }

  stopSong() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.fileEl) { this.fileEl.pause(); this.fileEl = null; }
    this.song = null;
  }
  /** 현재 곡의 박자(0부터). 댄스 동기화용. 오디오 꺼짐이면 null */
  /** 음원 파일로 재생 중인지 */
  usingFile(name) { return !!(this.song && this.song.file && this.song.name === name && this.fileEl); }
  /** 음원 파일의 현재 재생 위치(초) */
  fileTime() { return this.fileEl ? this.fileEl.currentTime : null; }
  beat() {
    if (!this.ctx || !this.song) return null;
    // 댄스 음원: 미리 분석한 실제 박자 시각으로 박자 번호 계산(곡의 미세한 빠르기 변화까지 반영)
    if (this.song.file && this.song.name === 'dance' && this.danceBeats && this.fileEl) {
      const B = this.danceBeats, t = this.fileEl.currentTime;
      if (t < B[0]) return (t - B[0]) / (B[1] - B[0]);
      let lo = 0, hi = B.length - 1;
      if (t >= B[hi]) return hi + (t - B[hi]) / (B[hi] - B[hi - 1]);
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (B[mid] <= t) lo = mid; else hi = mid; }
      return lo + (t - B[lo]) / (B[lo + 1] - B[lo]);
    }
    const bpm = this.song.def.bpm;
    const t = this.song.file && this.fileEl ? this.fileEl.currentTime : this.ctx.currentTime - this.songStart;
    return (t * bpm) / 60;
  }

  speak(text, lang = 'ko-KR', rate = 1, { duck = true, force = false } = {}) {
    if ((!this.enabled.tts && !force) || this.muted || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang; u.rate = rate;
      const v = speechSynthesis.getVoices().find((x) => x.lang && x.lang.replace('_', '-').startsWith(lang.slice(0, 2)));
      if (v) u.voice = v;
      if (this.bgmGain && duck) {
        this.bgmGain.gain.value = this.enabled.bgm ? this.vol.bgm * 0.3 : 0;
        u.onend = () => this.applyVolume();
      }
      speechSynthesis.speak(u);
    } catch { /* 음성 미지원 */ }
  }
  speakSeq(parts) {
    if (!this.enabled.tts || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      for (const [text, lang] of parts) {
        const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = lang.startsWith('en') ? 0.85 : 1;
        const v = speechSynthesis.getVoices().find((x) => x.lang && x.lang.replace('_', '-').startsWith(lang.slice(0, 2)));
        if (v) u.voice = v;
        speechSynthesis.speak(u);
      }
    } catch { /* 무시 */ }
  }
}

export const audio = new AudioEngine();
