import { GAME_CONFIG } from './config.js';

/**
 * Drives the GRID chrome that reports machine state: the StatusBar, the top
 * rail's state badge, and the CYCLE .TELEMETRY panel.
 *
 * Everything here is machine voice — lowercase, mono, exact, never a human
 * sentence. Values are read from live game state; nothing is invented.
 */

/** Ticks in the occupancy meter. Matches the Meter component's default. */
const METER_SEGMENTS = 32;

/* Full scale for the grid-load meter, as a percentage of board cells.
   The board is 100x100 = 10,000 cells and a long match walls off only a few
   percent of it, so a 0-100% meter would never light a single tick. This is
   the range the data actually occupies — the printed number stays the true
   percentage; only the tick scale is compressed. */
const LOAD_FULL_SCALE_PCT = 8;

/** How often the readouts refresh, in ms. The numbers are sampled, not
 *  animated: a readout that updates every frame is noise, not information. */
const SAMPLE_INTERVAL = 200;

/** Compass direction → the vector notation the readout prints. */
const VECTOR_LABELS = { N: 'n 00:-1', E: 'e +1:00', S: 's 00:+1', W: 'w -1:00' };

export class GridTelemetry {
  constructor() {
    this.el = {
      statusLeft: document.querySelector('[data-status-left]'),
      statusCenter: document.querySelector('[data-status-center]'),
      statusRight: document.querySelector('[data-status-right]'),
      statusBar: document.querySelector('[data-statusbar]'),

      shellState: document.querySelector('[data-shell-state]'),
      shellStateText: document.querySelector('[data-shell-state-text]'),

      cycleState: document.querySelector('[data-cycle-state]'),
      cycleStateText: document.querySelector('[data-cycle-state-text]'),

      vector: document.querySelector('[data-telem-vector]'),
      trail: document.querySelector('[data-telem-trail]'),

      occMeter: document.querySelector('[data-occupancy-meter]'),
      occValue: document.querySelector('[data-occupancy-value]'),
      occTrack: document.querySelector('[data-occupancy-track]'),

      roundCurrent: document.querySelector('[data-round-current]'),
      playerLabel: document.querySelector('[data-player-label]'),
    };

    this.#buildMeterTicks();
    this.lastSample = 0;

    /* The StatusBar counts its own frames. PerformanceMonitor is gated behind
       DEBUG.SHOW_PERFORMANCE_STATS, which also draws an on-canvas debug
       overlay — so reading fps from it would mean shipping that overlay. */
    this.frames = 0;
    this.fpsWindowStart = 0;
    this.fps = 0;
  }

  /** Builds the meter's ticks once; only their on/off class changes later. */
  #buildMeterTicks() {
    if (!this.el.occTrack || this.el.occTrack.childElementCount) return;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < METER_SEGMENTS; i++) {
      const tick = document.createElement('span');
      tick.className = 'g-meter__tick';
      frag.appendChild(tick);
    }
    this.el.occTrack.appendChild(frag);
  }

  /**
   * Sets the badge shown in the top rail and on the telemetry panel.
   * @param {string} text - Uppercase state name.
   * @param {'live'|'danger'|'success'|'accent'|'default'} tone
   */
  setState(text, tone = 'default') {
    for (const [badge, label] of [
      [this.el.shellState, this.el.shellStateText],
      [this.el.cycleState, this.el.cycleStateText],
    ]) {
      if (!badge || !label) continue;
      label.textContent = text;
      badge.className = 'g-badge' + (tone === 'default' ? '' : ` g-badge--${tone}`);
    }
  }

  /** Writes the left segment of the StatusBar. Machine state only. */
  setStatus({ left, center, right, tone } = {}) {
    if (left != null && this.el.statusLeft) this.el.statusLeft.textContent = left;
    if (center != null && this.el.statusCenter) this.el.statusCenter.textContent = center;
    if (right != null && this.el.statusRight) this.el.statusRight.textContent = right;

    if (tone !== undefined && this.el.statusBar) {
      this.el.statusBar.className =
        'g-statusbar' + (tone && tone !== 'accent' ? ` g-statusbar--${tone}` : '');
    }
  }

  /** Shows the user's handle as the label on their score row. */
  setPlayerLabel(name) {
    if (this.el.playerLabel && name) {
      this.el.playerLabel.textContent = String(name).toLowerCase();
    }
  }

  /** Zero-padded round counter, per the system's counter convention. */
  setRound(n) {
    if (this.el.roundCurrent) {
      this.el.roundCurrent.textContent = String(n).padStart(3, '0');
    }
  }

  /**
   * Samples live game state into the readouts. Called from the game loop,
   * but throttled — the numbers are sampled, not animated.
   * @param {object} board - The live Board.
   * @param {object} perf - The PerformanceMonitor.
   * @param {number} now - performance.now() timestamp.
   */
  sample(board, perf, now = performance.now()) {
    // Count every frame, even though the readouts refresh far less often.
    this.frames++;
    if (this.fpsWindowStart === 0) this.fpsWindowStart = now;
    const elapsed = now - this.fpsWindowStart;
    if (elapsed >= 1000) {
      this.fps = Math.round((this.frames * 1000) / elapsed);
      this.frames = 0;
      this.fpsWindowStart = now;
    }

    if (now - this.lastSample < SAMPLE_INTERVAL) return;
    this.lastSample = now;

    if (!board) return;
    const player = board.playerTeam?.[0];

    // VECTOR — which way the cycle is travelling.
    if (this.el.vector) {
      this.el.vector.textContent =
        player?.alive ? (VECTOR_LABELS[player.direction] ?? '--') : '--';
    }

    // TRAIL — how much wall the player has laid down, zero-padded so the
    // row never reflows as it grows.
    if (this.el.trail) {
      const len = player?.segments?.length ?? 0;
      this.el.trail.textContent = String(len).padStart(4, '0');
    }

    // GRID .LOAD — how much of the board is now wall.
    const cells = (board.boardWidth ?? 0) * (board.boardHeight ?? 0);
    const used = board.collisionGrid?.size?.() ?? 0;
    const pct = cells > 0 ? (used / cells) * 100 : 0;
    this.#setOccupancy(pct);

    // StatusBar right segment: frame rate, exact, zero-padded.
    this.setStatus({ right: `${String(this.fps).padStart(2, '0')} fps` });
  }

  /** @param {number} pct - Occupancy as a true percentage of board cells. */
  #setOccupancy(pct) {
    const clamped = Math.max(0, Math.min(100, pct));

    // The readout prints the real percentage; the ticks use the compressed
    // scale so the meter actually reads during a match.
    const scaled = Math.min(100, (clamped / LOAD_FULL_SCALE_PCT) * 100);

    if (this.el.occValue) this.el.occValue.textContent = clamped.toFixed(1);
    if (this.el.occMeter) {
      this.el.occMeter.setAttribute('aria-valuenow', clamped.toFixed(1));

      // Tone shifts with load — never rely on the number alone.
      const tone = scaled >= 75 ? 'danger' : scaled >= 40 ? 'live' : '';
      this.el.occMeter.className = 'g-meter telemetry__meter' + (tone ? ` g-meter--${tone}` : '');
    }

    if (!this.el.occTrack) return;
    const filled = Math.round((scaled / 100) * METER_SEGMENTS);
    const ticks = this.el.occTrack.children;
    for (let i = 0; i < ticks.length; i++) {
      ticks[i].classList.toggle('g-meter__tick--on', i < filled);
    }
  }

  /** Resets every readout to its pre-match state. */
  reset() {
    this.setState('STANDBY', 'default');
    this.setStatus({ left: 'sys .ready', center: '--', right: '00 fps', tone: 'accent' });
    if (this.el.vector) this.el.vector.textContent = '--';
    if (this.el.trail) this.el.trail.textContent = '0000';
    this.#setOccupancy(0);
    this.frames = 0;
    this.fpsWindowStart = 0;
    this.fps = 0;
  }
}

/** One instance per page; the chrome is a singleton surface. */
export const telemetry = new GridTelemetry();
