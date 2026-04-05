import eventBus from '../core/EventBus.js';

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17]
];

const FINGERTIPS = [4, 8, 12, 16, 20];
const DIP = [3, 7, 11, 15, 19];
const PIP = [2, 6, 10, 14, 18];
const MCP = [1, 5, 9, 13, 17];

// How many sub-joint points to interpolate between each joint pair
const SUB_POINTS = 5;

class HandVisualizer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.visible = true;
    this.velocities = [];
    this.prevPts = [];
    this._init();
  }

  _init() {
    this.canvas = document.getElementById('hand-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    eventBus.on('hand:update', (data) => this._draw(data));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'D' || e.key === 'd') {
        this.visible = !this.visible;
        this.canvas.style.display = this.visible ? 'block' : 'none';
        if (!this.visible) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    });

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  _draw(data) {
    if (!this.visible || !this.ctx) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, W, H);

    const now = performance.now();

    for (let hi = 0; hi < data.hands.length; hi++) {
      const lm = data.hands[hi].landmarks;
      const pts = lm.map(l => ({ x: l.x * W, y: l.y * H, z: l.z }));

      // Velocity tracking
      if (!this.prevPts[hi]) this.prevPts[hi] = pts.map(p => ({ ...p }));
      if (!this.velocities[hi]) this.velocities[hi] = new Float32Array(21);
      const prev = this.prevPts[hi];
      const vel = this.velocities[hi];
      for (let i = 0; i < 21; i++) {
        const dx = pts[i].x - prev[i].x;
        const dy = pts[i].y - prev[i].y;
        vel[i] = vel[i] * 0.5 + Math.sqrt(dx * dx + dy * dy) * 0.5;
      }
      this.prevPts[hi] = pts.map(p => ({ ...p }));

      // === SUB-JOINT INTERPOLATED POINTS along each bone ===
      const subPts = [];
      for (const [a, b] of HAND_CONNECTIONS) {
        for (let s = 1; s <= SUB_POINTS; s++) {
          const t = s / (SUB_POINTS + 1);
          subPts.push({
            x: pts[a].x + (pts[b].x - pts[a].x) * t,
            y: pts[a].y + (pts[b].y - pts[a].y) * t,
            vel: vel[a] * (1 - t) + vel[b] * t
          });
        }
      }

      // === LAYER 1: Wide glow bones ===
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const [a, b] of HAND_CONNECTIONS) {
        const intensity = Math.min(1, (vel[a] + vel[b]) / 12);
        ctx.beginPath();
        ctx.moveTo(pts[a].x, pts[a].y);
        ctx.lineTo(pts[b].x, pts[b].y);
        ctx.strokeStyle = `rgba(0, 150, 255, ${0.1 + intensity * 0.15})`;
        ctx.lineWidth = 8 + intensity * 6;
        ctx.shadowColor = '#00aaff';
        ctx.shadowBlur = 15 + intensity * 10;
        ctx.stroke();
      }
      ctx.restore();

      // === LAYER 2: Core bones ===
      ctx.save();
      ctx.lineCap = 'round';
      for (const [a, b] of HAND_CONNECTIONS) {
        const intensity = Math.min(1, (vel[a] + vel[b]) / 12);
        const r = Math.round(intensity * 200);
        const g = Math.round(200 + intensity * 55);
        ctx.beginPath();
        ctx.moveTo(pts[a].x, pts[a].y);
        ctx.lineTo(pts[b].x, pts[b].y);
        ctx.strokeStyle = `rgb(${r}, ${g}, 255)`;
        ctx.lineWidth = 2 + intensity * 1.5;
        ctx.shadowColor = `rgb(${r}, ${g}, 255)`;
        ctx.shadowBlur = 4;
        ctx.stroke();
      }
      ctx.restore();

      // === LAYER 3: Bright center line ===
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(180, 230, 255, 0.5)';
      ctx.lineWidth = 0.8;
      for (const [a, b] of HAND_CONNECTIONS) {
        ctx.beginPath();
        ctx.moveTo(pts[a].x, pts[a].y);
        ctx.lineTo(pts[b].x, pts[b].y);
        ctx.stroke();
      }
      ctx.restore();

      // === SUB-JOINT TRACKING POINTS (the precision markers between joints) ===
      ctx.save();
      for (const sp of subPts) {
        const intensity = Math.min(1, sp.vel / 6);
        const size = 1.5 + intensity * 1;

        // Outer ring
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, size + 2, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 200, 255, ${0.15 + intensity * 0.15})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Core dot
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 220, 255, ${0.4 + intensity * 0.3})`;
        ctx.fill();

        // Center bright pixel
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + intensity * 0.3})`;
        ctx.fill();
      }
      ctx.restore();

      // === MAIN JOINTS ===
      for (let i = 0; i < 21; i++) {
        this._drawJoint(ctx, pts[i], i, vel[i], now);
      }

      // === FINGERTIP RETICLES ===
      for (const tip of FINGERTIPS) {
        this._drawReticle(ctx, pts[tip], vel[tip], now);
      }

      // === WRIST HUD ===
      this._drawWristHUD(ctx, pts[0], data.hands[hi].handedness, now);

      // === FINGER-TO-FINGER CONNECTION ARCS (palm web) ===
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 180, 255, 0.06)';
      ctx.lineWidth = 0.5;
      const tipPairs = [[4,8],[8,12],[12,16],[16,20]];
      for (const [a,b] of tipPairs) {
        ctx.beginPath();
        ctx.moveTo(pts[a].x, pts[a].y);
        const mx = (pts[a].x + pts[b].x) / 2;
        const my = (pts[a].y + pts[b].y) / 2 - 10;
        ctx.quadraticCurveTo(mx, my, pts[b].x, pts[b].y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  _drawJoint(ctx, p, index, velocity, now) {
    let baseR, color;

    if (FINGERTIPS.includes(index)) {
      baseR = 5; color = [0, 255, 210];
    } else if (DIP.includes(index)) {
      baseR = 3.5; color = [0, 230, 255];
    } else if (PIP.includes(index)) {
      baseR = 3.5; color = [0, 210, 255];
    } else if (MCP.includes(index)) {
      baseR = 4; color = [0, 190, 255];
    } else if (index === 0) {
      baseR = 6; color = [255, 160, 0];
    } else {
      baseR = 3; color = [0, 200, 255];
    }

    const intensity = Math.min(1, velocity / 5);
    const r = baseR + intensity * 2;
    const pulse = 1 + Math.sin(now * 0.01 + index * 0.5) * 0.1;

    ctx.save();

    // Outer tracking ring
    ctx.beginPath();
    ctx.arc(p.x, p.y, (r + 4) * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${0.12 + intensity * 0.15})`;
    ctx.lineWidth = 0.8;
    ctx.shadowColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    ctx.shadowBlur = 8 + intensity * 8;
    ctx.stroke();

    // Filled joint
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * pulse, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${0.6 + intensity * 0.3})`;
    ctx.shadowBlur = 6 + intensity * 6;
    ctx.fill();

    // White-hot core
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 0.3 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.75 + intensity * 0.25})`;
    ctx.fill();

    ctx.restore();
  }

  _drawReticle(ctx, p, velocity, now) {
    const intensity = Math.min(1, velocity / 5);
    const size = 14 + intensity * 6;
    const rot = now * 0.004;
    const pulse = 1 + Math.sin(now * 0.007) * 0.08;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(rot);

    const s = size * pulse;
    const gap = 4;
    const clr = intensity > 0.4 ? '#00ffcc' : '#00d4ff';

    ctx.strokeStyle = clr;
    ctx.lineWidth = 1;
    ctx.shadowColor = clr;
    ctx.shadowBlur = 6;

    // Crosshair
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, -gap); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, gap); ctx.lineTo(0, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(-gap, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gap, 0); ctx.lineTo(s, 0); ctx.stroke();

    // Corner brackets
    const c = s * 0.75;
    const bl = 4;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-c, -c + bl); ctx.lineTo(-c, -c); ctx.lineTo(-c + bl, -c); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c - bl, -c); ctx.lineTo(c, -c); ctx.lineTo(c, -c + bl); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-c, c - bl); ctx.lineTo(-c, c); ctx.lineTo(-c + bl, c); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c - bl, c); ctx.lineTo(c, c); ctx.lineTo(c, c - bl); ctx.stroke();

    // Inner diamond
    const d = gap * 1.3;
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = `rgba(0, 255, 204, ${0.25 + intensity * 0.3})`;
    ctx.beginPath();
    ctx.moveTo(0, -d); ctx.lineTo(d, 0); ctx.lineTo(0, d); ctx.lineTo(-d, 0); ctx.closePath();
    ctx.stroke();

    // Precision dot at exact center
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  }

  _drawWristHUD(ctx, wrist, handedness, now) {
    const t = now * 0.002;
    const pulse = 1 + Math.sin(now * 0.003) * 0.06;

    ctx.save();
    ctx.translate(wrist.x, wrist.y);

    // Spinning arcs
    ctx.strokeStyle = 'rgba(255, 160, 0, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#ff8800';
    ctx.shadowBlur = 6;

    ctx.beginPath(); ctx.arc(0, 0, 14 * pulse, t, t + 1.0); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 14 * pulse, t + Math.PI, t + Math.PI + 1.0); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 20 * pulse, -t * 0.6, -t * 0.6 + 0.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 20 * pulse, Math.PI - t * 0.6, Math.PI - t * 0.6 + 0.6); ctx.stroke();

    // Label
    ctx.shadowBlur = 0;
    ctx.font = '7px monospace';
    ctx.fillStyle = 'rgba(255, 160, 0, 0.5)';
    ctx.textAlign = 'center';
    ctx.fillText(handedness.toUpperCase(), 0, 30);

    ctx.restore();
  }
}

export default new HandVisualizer();
