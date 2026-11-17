// Live circular minimap drawn on a 2D canvas: streets, player, cars, cops, beacon.
import { CITY } from './harbor.js';

export class MapView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.size = canvas.width;
  }

  draw(world) {
    const ctx = this.ctx;
    const S = this.size;
    const half = CITY / 2 + 90;
    const toMap = (x, z) => [S / 2 + (x / half) * (S / 2 - 6), S / 2 + (z / half) * (S / 2 - 6)];
    ctx.clearRect(0, 0, S, S);
    // Sea on the east edge.
    ctx.fillStyle = '#0e4a6e';
    const [seaX] = toMap(CITY / 2 + 60, 0);
    ctx.fillRect(seaX, 0, S - seaX, S);
    // Streets.
    ctx.strokeStyle = 'rgba(200, 210, 240, 0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 9; i++) {
      const [x] = toMap(-CITY / 2 + 8 + i * 46, 0);
      const [, z] = toMap(0, -CITY / 2 + 8 + i * 46);
      ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x, S - 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, z); ctx.lineTo(S - 4, z); ctx.stroke();
    }
    const dot = (x, z, color, r) => {
      const [mx, mz] = toMap(x, z);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(mx, mz, r, 0, Math.PI * 2);
      ctx.fill();
    };
    if (world.beacon) {
      const [bx, bz] = toMap(world.beacon.x, world.beacon.z);
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bx, bz, 7 + Math.sin(performance.now() * 0.005) * 2, 0, Math.PI * 2); ctx.stroke();
      dot(world.beacon.x, world.beacon.z, '#ffd166', 4);
    }
    for (const c of world.traffic) dot(c.pos.x, c.pos.z, '#9fb2d8', 2.5);
    for (const u of world.police) {
      dot(u.pos.x, u.pos.z, '#ff4040', 3.5);
    }
    for (const w of world.walkers) dot(w.mesh.position.x, w.mesh.position.z, '#7dff9b', 1.6);
    // Player arrow, rotated to heading.
    const [px, pz] = toMap(world.player.x, world.player.z);
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(world.heading);
    ctx.fillStyle = '#ff2e88';
    ctx.beginPath();
    ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
