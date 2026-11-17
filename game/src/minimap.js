// Neon Harbor — the minimap: a 2D canvas top-down view of the city grid
// with the player, traffic, police, thugs and the mission beacon.

import { CITY } from './config.js';

export class Minimap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.size = canvas.width;
  }

  worldToMap(x, z) {
    const half = CITY.half + 24;
    const s = this.size / (half * 2);
    return { x: (x + half) * s, y: (z + half) * s };
  }

  draw(game) {
    const ctx = this.ctx;
    const size = this.size;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(10, 16, 28, 0.88)';
    ctx.fillRect(0, 0, size, size);

    // Streets.
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.lineWidth = 2;
    for (const line of game.city.streetLines) {
      const a = this.worldToMap(line, -CITY.half - 24);
      const b = this.worldToMap(line, CITY.half + 24);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      const c = this.worldToMap(-CITY.half - 24, line);
      const d = this.worldToMap(CITY.half + 24, line);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.stroke();
    }

    // Sea along the south edge.
    const sea = this.worldToMap(0, CITY.half + 4);
    ctx.fillStyle = 'rgba(29, 111, 142, 0.8)';
    ctx.fillRect(0, sea.y, size, size - sea.y);

    const dot = (x, z, color, r) => {
      const p = this.worldToMap(x, z);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    };

    // Mission beacon.
    const step = game.missions.currentStep;
    if (step && step.kind === 'goto' && step.pos) {
      const p = this.worldToMap(step.pos[0], step.pos[1]);
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10 + Math.sin(game.time * 4) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Traffic (grey), thugs (red), police (blue flashing).
    for (const car of game.traffic) dot(car.pos.x, car.pos.z, '#94a3b8', 2.5);
    for (const thug of game.thugs) {
      if (thug.alive) dot(thug.pos.x, thug.pos.z, '#ef4444', 3);
    }
    for (const cop of game.police) {
      dot(cop.pos.x, cop.pos.z, Math.sin(game.time * 8) > 0 ? '#3b82f6' : '#ef4444', 4);
    }

    // Player: a white triangle pointing along the heading.
    const p = this.worldToMap(game.player.pos.x, game.player.pos.z);
    const heading = game.player.onFoot ? game.player.heading : game.player.car ? game.player.car.heading : game.player.heading;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(heading);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // North marker.
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', size / 2, 11);
  }
}
