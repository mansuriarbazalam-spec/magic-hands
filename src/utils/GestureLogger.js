import eventBus from '../core/EventBus.js';

/**
 * GestureLogger — Records fist grab/rotation data to help debug rotation issues.
 * Press 'L' to download the log as a JSON file.
 * Automatically starts recording when a fist grab begins.
 */
class GestureLogger {
  constructor() {
    this.logs = [];
    this.isRecording = false;
    this.sessionCount = 0;
  }

  init() {
    eventBus.on('gesture:fist', (data) => this._onFist(data));

    // Also log raw hand data during fist hold for analysis
    eventBus.on('hand:update', ({ hands }) => {
      if (!this.isRecording) return;
      for (const hand of hands) {
        const key = hand.handedness.toLowerCase();
        // Log palm center and key landmarks
        const lm = hand.landmarks;
        this.logs.push({
          t: performance.now(),
          type: 'hand-raw',
          hand: key,
          wrist: { x: lm[0].x, y: lm[0].y, z: lm[0].z },
          indexMCP: { x: lm[5].x, y: lm[5].y, z: lm[5].z },
          middleMCP: { x: lm[9].x, y: lm[9].y, z: lm[9].z },
          ringMCP: { x: lm[13].x, y: lm[13].y, z: lm[13].z },
          palmCenter: {
            x: (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5,
            y: (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5
          }
        });
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'L' || e.key === 'l') {
        this._download();
      }
    });

    console.log('[GestureLogger] Ready. Press L to download logs.');
  }

  _onFist(data) {
    const { hand, state, worldPosition, rotationX, rotationY } = data;

    if (state === 'grab') {
      this.isRecording = true;
      this.sessionCount++;
      this.logs.push({
        t: performance.now(),
        type: 'fist-grab',
        session: this.sessionCount,
        hand,
        worldPosition
      });
    } else if (state === 'hold') {
      this.logs.push({
        t: performance.now(),
        type: 'fist-hold',
        session: this.sessionCount,
        hand,
        worldPosition,
        rotationX,
        rotationY
      });
    } else if (state === 'release') {
      this.logs.push({
        t: performance.now(),
        type: 'fist-release',
        session: this.sessionCount,
        hand
      });
      this.isRecording = false;
    }
  }

  _download() {
    if (this.logs.length === 0) {
      console.log('[GestureLogger] No logs recorded.');
      return;
    }

    // Save to localStorage so it can be retrieved
    localStorage.setItem('gesture-log', JSON.stringify(this.logs));
    console.log(`[GestureLogger] Saved ${this.logs.length} entries to localStorage key 'gesture-log'`);

    // Also dump a summary to console
    const sessions = {};
    for (const entry of this.logs) {
      if (entry.session) {
        if (!sessions[entry.session]) sessions[entry.session] = [];
        sessions[entry.session].push(entry);
      }
    }

    for (const [sid, entries] of Object.entries(sessions)) {
      const holds = entries.filter(e => e.type === 'fist-hold');
      const rotXs = holds.map(e => e.rotationX).filter(v => v !== 0);
      const rotYs = holds.map(e => e.rotationY).filter(v => v !== 0);
      console.log(`[Session ${sid}] ${entries.length} events, ${holds.length} hold frames, rotX non-zero: ${rotXs.length}, rotY non-zero: ${rotYs.length}`);
      if (rotYs.length > 0) {
        const avgY = rotYs.reduce((a,b)=>a+b,0)/rotYs.length;
        const maxY = Math.max(...rotYs.map(Math.abs));
        console.log(`  rotY: avg=${avgY.toFixed(4)}, max=${maxY.toFixed(4)}, range=[${Math.min(...rotYs).toFixed(4)}, ${Math.max(...rotYs).toFixed(4)}]`);
      }
      if (rotXs.length > 0) {
        const avgX = rotXs.reduce((a,b)=>a+b,0)/rotXs.length;
        const maxX = Math.max(...rotXs.map(Math.abs));
        console.log(`  rotX: avg=${avgX.toFixed(4)}, max=${maxX.toFixed(4)}, range=[${Math.min(...rotXs).toFixed(4)}, ${Math.max(...rotXs).toFixed(4)}]`);
      }
    }

    // Try file download too
    try {
      const blob = new Blob([JSON.stringify(this.logs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gesture-log-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.log('[GestureLogger] File download failed, data is in localStorage.');
    }
  }
}

export default new GestureLogger();
