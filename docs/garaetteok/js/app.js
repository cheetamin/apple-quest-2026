// 앱 상태·화면 전환·게임 진행
import { store } from './core/store.js';
import { audio } from './core/audio.js';
import { motion } from './core/motion.js';
import { buildPlan, relayLegs, parseNames, shuffled } from './core/roster.js';
import { averageMatches } from './core/scoring.js';
import { ROUNDS, makeSequence, roundInfo } from './rounds/defs.js';
import { $, h, pixelize } from './ui.js';

export const DEFAULTS = {
  grade: 4, sem: 2, teamMode: 'class', teamNames: { blue: '청가래떡팀', white: '백가래떡팀' },
  count: { blue: 12, white: 12 }, rosterText: { blue: '', white: '' }, autoOrder: true, order: { blue: null, white: null },
  roundSec: 60, relaySec: 15, mode: 'auto', squad: 1,
  classRosterText: '', classCount: 24, teamLists: { blue: [], white: [] },
  bgm: true, sfx: true, tts: true, sing: true, story: true, sens: 1.15, mirror: true, swapLR: false, showScore: true,
  altInput: 'none', seated: false, slow: false, bigText: false, highContrast: false,
  model: 'lite', mathInput: 'pad', quizInput: 'touch', engTrial: true,
  vol: { master: 0.8, bgm: 0.5, sfx: 0.8 },
};

const SCREENS = {};
export function registerScreen(name, mod) { SCREENS[name] = mod; }

class App {
  constructor() {
    this.settings = { ...DEFAULTS, ...store.get('settings', {}) };
    for (const k of ['teamNames', 'count', 'rosterText', 'order', 'vol', 'teamLists']) this.settings[k] = { ...DEFAULTS[k], ...(this.settings[k] || {}) };
    if (!this.settings._relay15) { this.settings.relaySec = 15; this.settings._relay15 = true; }
    if (this.settings.mode === 'all') this.settings.mode = 'auto';
    this.game = null;
    this.cleanup = null;
    this.paused = false;
    this.current = null;
    this.listeners = new Set();
  }

  saveSettings() { store.set('settings', this.settings); this.applySettings(); }
  applySettings() {
    const s = this.settings;
    audio.configure({ bgm: s.bgm, sfx: s.sfx, tts: s.tts, vol: s.vol });
    Object.assign(motion.settings, { mirror: s.mirror, swapLR: s.swapLR, sens: s.sens, seated: s.seated });
    motion.alt.blue = s.altInput === 'blue' || s.altInput === 'both' || (motion.mode === 'none');
    motion.alt.white = s.altInput === 'white' || s.altInput === 'both' || (motion.mode === 'none');
    const st = document.getElementById('stage');
    st.classList.toggle('big', !!s.bigText);
    st.classList.toggle('hc', !!s.highContrast);
  }

  go(name, params = {}) {
    if (this.cleanup) { try { this.cleanup(); } catch (e) { console.error(e); } }
    this.cleanup = null;
    this.paused = false;
    const root = $('#screen');
    root.innerHTML = '';
    this.current = { name, params };
    const mod = SCREENS[name];
    if (!mod) { root.appendChild(h(`<div class="card">화면 없음: ${name}</div>`)); return; }
    this.cleanup = mod.show(this, root, params) || null;
    pixelize(root);
    if (document.fonts && !this._fontsReady) document.fonts.ready.then(() => { this._fontsReady = true; $$px(root); });
    document.body.dataset.screen = name;
  }

  // ── 게임 ──
  teamLabel(t) { return this.game ? this.game.teamNames[t] : this.settings.teamNames[t]; }

  newGame() {
    const s = this.settings;
    const names = {
      blue: parseNames(s.rosterText.blue, s.count.blue, s.teamNames.blue.replace(/팀$/, '')),
      white: parseNames(s.rosterText.white, s.count.white, s.teamNames.white.replace(/팀$/, '')),
    };
    const order = {};
    for (const t of ['blue', 'white']) {
      const n = s.count[t];
      const saved = s.order[t];
      order[t] = !s.autoOrder && saved && saved.length === n ? saved.slice() : s.autoOrder ? shuffled([...Array(n).keys()]) : [...Array(n).keys()];
    }
    const plan = buildPlan({ blueCount: s.count.blue, whiteCount: s.count.white, mode: s.mode, squad: s.squad, orderBlue: order.blue, orderWhite: order.white });
    this.game = {
      id: Date.now(), startedAt: new Date().toISOString(),
      settings: JSON.parse(JSON.stringify(s)), teamNames: { ...s.teamNames }, names, order, plan,
      legs: relayLegs({ blueCount: s.count.blue, whiteCount: s.count.white, orderBlue: order.blue, orderWhite: order.white }),
      seq: makeSequence(plan.rounds.length),
      results: plan.rounds.map((rr) => ({ matches: rr.map(() => null) })),
      cur: { r: 0, m: 0 }, relay: null, finished: false, seed: Math.floor(Math.random() * 1e6),
    };
    this.saveGame();
  }
  saveGame() { if (this.game) store.set('game', this.game); }
  loadSavedGame() { const g = store.get('game', null); return g && !g.finished ? g : null; }
  resume(g) { this.game = g; }

  /** 일반 라운드 수 (마지막 결승 이어달리기 제외) */
  get G() { return this.game ? (this.game.seq ? this.game.seq.length : 11) : 0; }
  roundDef(r) { return roundInfo(this.game.seq || makeSequence(11), r); }

  participants(r, m) {
    const g = this.game;
    if (r >= this.G) { const leg = g.legs[m] || g.legs[0]; return { blue: [leg.blue], white: [leg.white] }; }
    return g.plan.rounds[r][m];
  }
  names(team, idxs) { return idxs.map((i) => this.game.names[team][i]).join(', '); }

  roundScore(r) {
    const ms = this.game.results[r].matches;
    const out = {};
    for (const t of ['blue', 'white']) out[t] = averageMatches(ms.filter(Boolean).map((x) => x[t]));
    return out;
  }
  totals() {
    const out = { blue: 0, white: 0 };
    for (let r = 0; r < this.G; r++) { const s = this.roundScore(r); out.blue += s.blue; out.white += s.white; }
    return out;
  }
  recordMatch(r, m, scores, detail = null, extra = {}) {
    this.game.results[r].matches[m] = { blue: scores.blue, white: scores.white, detail, ...extra };
    this.saveGame();
  }
  /** 다음 경기로 이동 */
  next() {
    const g = this.game;
    let { r, m } = g.cur;
    if (r < this.G) {
      m++;
      if (m >= g.plan.rounds[r].length) { r++; m = 0; }
    }
    g.cur = { r, m };
    this.saveGame();
    if (r >= this.G) this.go('relayIntro');
    else this.go('intro', { r, m });
  }
  startCurrent() {
    const { r, m } = this.game.cur;
    if (r >= this.G) this.go('relayIntro'); else this.go('intro', { r, m });
  }
  playRound(r, m) {
    const def = this.roundDef(r);
    if (def.kind === 'physical' || def.kind === 'mixed') this.go('physical', { r, m });
    else if (def.id === 'math') this.go('math', { r, m });
    else this.go('quiz', { r, m });
  }
  skipCurrent() {
    const { r, m } = this.game.cur;
    if (r < this.G) { this.recordMatch(r, m, { blue: 0, white: 0 }, null, { skipped: true }); this.next(); }
  }
  finishGame(relayResult) {
    this.game.relay = relayResult;
    this.game.finished = true;
    this.game.endedAt = new Date().toISOString();
    this.saveGame();
    this.go('awards');
  }
}

function $$px(root) { root.querySelectorAll('[data-pixel]').forEach((el) => { el.textContent = el.dataset.text || el.textContent; }); pixelize(root); }

export const app = new App();
window.__gt = { app, motion, audio };
