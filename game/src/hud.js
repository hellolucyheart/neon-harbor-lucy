// Neon Harbor — the HUD: health, money, wanted stars, speed, mission
// objective, message feed and the title / pause / busted / game-over /
// mission-complete screens. All DOM, updated from the game state.

import { formatMoney, formatTime, MISSIONS } from './config.js';

export class Hud {
  constructor() {
    this.el = {};
    for (const id of [
      'hud', 'minimap', 'health-num', 'health-bar', 'money', 'stars', 'speed',
      'speed-num', 'objective', 'objective-text', 'timer', 'feed', 'hint',
      'crosshair', 'hitmarker', 'screen-title', 'screen-pause', 'screen-busted',
      'screen-over', 'screen-mission', 'screen-story', 'title-story',
      'mission-reward', 'mission-title', 'busted-sub', 'over-sub',
      'btn-start', 'btn-continue', 'btn-resume', 'btn-restart', 'btn-save-quit',
      'btn-mission-next', 'btn-busted-retry', 'btn-over-retry', 'btn-story-close',
      'save-note', 'mute-note',
    ]) {
      this.el[id] = document.getElementById(id);
    }
    this.feedItems = [];
    this.lastStars = -1;
  }

  showScreen(name) {
    for (const key of ['screen-title', 'screen-pause', 'screen-busted', 'screen-over', 'screen-mission', 'screen-story']) {
      const node = this.el[key];
      if (node) node.classList.toggle('hidden', key !== name);
    }
    const hudVisible = name === null;
    if (this.el.hud) this.el.hud.classList.toggle('hidden', !hudVisible);
  }

  showTitle(hasSave) {
    this.showScreen('screen-title');
    if (this.el['btn-continue']) this.el['btn-continue'].classList.toggle('hidden', !hasSave);
  }

  showStory(text) {
    this.showScreen('screen-story');
    if (this.el['title-story']) this.el['title-story'].textContent = text;
  }

  showMissionComplete(mission) {
    this.showScreen('screen-mission');
    if (this.el['mission-title']) this.el['mission-title'].textContent = mission.title + ' — complete';
    if (this.el['mission-reward']) this.el['mission-reward'].textContent = 'Reward: ' + formatMoney(mission.reward);
  }

  showBusted() {
    this.showScreen('screen-busted');
  }

  showGameOver() {
    this.showScreen('screen-over');
  }

  feed(text) {
    this.feedItems.unshift(text);
    if (this.feedItems.length > 5) this.feedItems.pop();
    if (this.el.feed) {
      this.el.feed.innerHTML = this.feedItems.map((t) => `<div>${t}</div>`).join('');
    }
  }

  update(state) {
    if (this.el['health-num']) this.el['health-num'].textContent = Math.ceil(state.health);
    if (this.el['health-bar']) {
      this.el['health-bar'].style.width = Math.max(0, state.health) + '%';
      this.el['health-bar'].style.background = state.health > 50 ? '#7ddc8a' : state.health > 25 ? '#facc15' : '#ef4444';
    }
    if (this.el.money) this.el.money.textContent = formatMoney(state.money);
    if (this.el.stars) {
      const stars = '★'.repeat(state.wantedStars) + '☆'.repeat(5 - state.wantedStars);
      this.el.stars.textContent = stars;
      this.el.stars.style.color = state.wantedStars > 0 ? '#ff5a5a' : 'rgba(255,255,255,0.35)';
      if (state.wantedStars !== this.lastStars) {
        this.el.stars.classList.remove('flash');
        void this.el.stars.offsetWidth;
        if (state.wantedStars > this.lastStars && state.wantedStars > 0) this.el.stars.classList.add('flash');
        this.lastStars = state.wantedStars;
      }
    }
    if (this.el.speed) {
      const driving = !state.onFoot;
      this.el.speed.classList.toggle('hidden', !driving);
      if (driving && this.el['speed-num']) {
        this.el['speed-num'].textContent = Math.round(Math.abs(state.speed) * 3.2);
      }
    }
    if (this.el['objective-text']) this.el['objective-text'].textContent = state.objective;
    if (this.el.timer) {
      if (state.timeLeft > 0) {
        this.el.timer.textContent = '⏱ ' + formatTime(state.timeLeft);
        this.el.timer.classList.remove('hidden');
      } else {
        this.el.timer.classList.add('hidden');
      }
    }
    if (this.el.hint) {
      this.el.hint.textContent = state.onFoot
        ? 'WASD move · Shift run · E enter car · Click shoot · Esc pause'
        : 'WASD drive · Space brake · E exit car · Esc pause';
    }
    if (this.el.crosshair) this.el.crosshair.classList.toggle('hidden', !state.onFoot);
    if (this.el['save-note']) {
      this.el['save-note'].textContent = state.savedAt
        ? 'Saved ' + new Date(state.savedAt).toLocaleTimeString()
        : 'Progress saves automatically at each mission.';
    }
  }

  hitmarker() {
    if (!this.el.hitmarker) return;
    this.el.hitmarker.classList.add('on');
    setTimeout(() => this.el.hitmarker.classList.remove('on'), 120);
  }

  bind(handlers) {
    const on = (id, fn) => {
      const node = this.el[id];
      if (node) node.addEventListener('click', fn);
    };
    on('btn-start', handlers.start);
    on('btn-continue', handlers.continue);
    on('btn-resume', handlers.resume);
    on('btn-restart', handlers.restart);
    on('btn-save-quit', handlers.saveQuit);
    on('btn-mission-next', handlers.nextMission);
    on('btn-busted-retry', handlers.retry);
    on('btn-over-retry', handlers.retry);
    on('btn-story-close', handlers.closeStory);
  }
}
