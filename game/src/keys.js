// Keyboard + mouse-drag look controls, with a tiny helper for test harnesses.
export class Keys {
  constructor(canvas) {
    this.down = new Set();
    this.pressed = new Set();
    this.dragYaw = 0;
    this.dragPitch = 0;
    this.dragging = false;
    this.lastX = 0;
    this.lastY = 0;
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.down.add(e.code);
      this.pressed.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
    canvas.addEventListener('mousedown', (e) => {
      this.dragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });
    window.addEventListener('mouseup', () => { this.dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!this.dragging) return;
      this.dragYaw -= (e.clientX - this.lastX) * 0.005;
      this.dragPitch -= (e.clientY - this.lastY) * 0.004;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });
  }

  held(code) {
    return this.down.has(code);
  }

  // True once for the frame after the key went down.
  tapped(code) {
    return this.pressed.has(code);
  }

  consumeDrag() {
    const d = { yaw: this.dragYaw, pitch: this.dragPitch };
    this.dragYaw = 0;
    this.dragPitch = 0;
    return d;
  }

  endFrame() {
    this.pressed.clear();
  }

  // Test helper: pretend a key is held or tapped.
  fake(code, tap = false) {
    this.down.add(code);
    if (tap) this.pressed.add(code);
  }
  unfake(code) {
    this.down.delete(code);
  }
}
