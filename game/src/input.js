// Neon Harbor — keyboard and mouse state. One instance is owned by the game;
// gameplay reads it through the small query helpers, and the screenshot
// staging drives it directly instead of through real keys.

export class Input {
  constructor() {
    this.keys = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.mouseDown = false;
    this.pointerLocked = false;
    this.pressed = new Set();
    this.onKeyDown = null;
    this.onKeyUp = null;
    this.onMouseDown = null;
  }

  attach(canvas) {
    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      this.keys.add(event.code);
      this.pressed.add(event.code);
      if (this.onKeyDown) this.onKeyDown(event.code, event);
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
      if (this.onKeyUp) this.onKeyUp(event.code, event);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
    });
    canvas.addEventListener('mousedown', (event) => {
      this.mouseDown = true;
      if (this.onMouseDown) this.onMouseDown(event.button);
    });
    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });
    document.addEventListener('mousemove', (event) => {
      if (this.pointerLocked) {
        this.mouseDX += event.movementX;
        this.mouseDY += event.movementY;
      }
    });
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === canvas;
    });
  }

  lockPointer(canvas) {
    try {
      canvas.requestPointerLock();
    } catch {
      // Pointer lock is a nicety; drag-orbit still works without it.
    }
  }

  down(code) {
    return this.keys.has(code);
  }

  /** True only on the frame the key went down; consumed by endFrame. */
  wasPressed(code) {
    return this.pressed.has(code);
  }

  axis(negative, positive) {
    return (this.keys.has(positive) ? 1 : 0) - (this.keys.has(negative) ? 1 : 0);
  }

  consumeMouse() {
    const dx = this.mouseDX;
    const dy = this.mouseDY;
    this.mouseDX = 0;
    this.mouseDY = 0;
    return { dx, dy };
  }

  endFrame() {
    this.pressed.clear();
  }
}
