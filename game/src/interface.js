// HUD: stars, cash, health, speed, objective line, toasts and hints.
export class Interface {
  constructor() {
    this.el = {
      hud: document.getElementById('hud'),
      wanted: document.getElementById('wanted'),
      money: document.getElementById('money'),
      objective: document.getElementById('objective'),
      health: document.getElementById('healthfill'),
      car: document.getElementById('carfill'),
      carLabel: document.getElementById('carlabel'),
      speedo: document.getElementById('speedo'),
      crosshair: document.getElementById('crosshair'),
      toast: document.getElementById('toast'),
      hint: document.getElementById('hint'),
      damage: document.getElementById('damage'),
      title: document.getElementById('title'),
      pause: document.getElementById('pause'),
      busted: document.getElementById('busted'),
      gameover: document.getElementById('gameover'),
      complete: document.getElementById('complete'),
      continueBtn: document.getElementById('continueBtn'),
    };
    this.toastTimer = 0;
  }

  showHud(show) {
    this.el.hud.classList.toggle('hidden', !show);
  }

  showScreen(name) {
    for (const key of ['title', 'pause', 'busted', 'gameover', 'complete']) {
      this.el[key].classList.toggle('hidden', key !== name);
    }
    if (name === null) {
      for (const key of ['title', 'pause', 'busted', 'gameover', 'complete']) {
        this.el[key].classList.add('hidden');
      }
    }
  }

  render(state) {
    let stars = '';
    for (let i = 0; i < 5; i++) {
      stars += i < state.stars ? '★' : '<span class="off">★</span>';
    }
    this.el.wanted.innerHTML = stars;
    this.el.money.textContent = '$' + state.money.toLocaleString('en-US');
    this.el.objective.innerHTML = state.objectiveHtml;
    this.el.health.style.width = Math.max(0, state.health) + '%';
    this.el.car.style.width = Math.max(0, state.carHealth) + '%';
    this.el.carLabel.textContent = state.inCar ? 'CAR' : 'ON FOOT — press E near a car';
    this.el.speedo.innerHTML = Math.round(Math.abs(state.speedKmh)) + '<small>km/h</small>';
    this.el.crosshair.classList.toggle('hidden', state.inCar);
    this.el.hint.textContent = state.hint;
    this.el.damage.style.boxShadow = state.hurtFlash > 0
      ? `inset 0 0 120px rgba(255, 0, 40, ${0.55 * state.hurtFlash})`
      : 'inset 0 0 120px rgba(255, 0, 40, 0)';
  }

  toast(text, seconds = 3) {
    this.el.toast.textContent = text;
    this.toastTimer = seconds;
  }

  tick(dt) {
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.el.toast.textContent = '';
    }
  }
}
