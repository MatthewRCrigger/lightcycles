/**
 * Simple Web Audio API sound generator for authentic arcade-style sound effects.
 * Uses oscillators and synthesized sounds instead of MP3 files for minimal bundle size.
 * Inspired by the original 1982 TRON arcade game's simple synthesized audio.
 */

export class SoundGenerator {
  constructor() {
    /** @type {AudioContext|null} Web Audio API context */
    this.audioContext = null;
    /** @type {GainNode|null} Master volume control */
    this.masterGain = null;
    /** @type {number} Master volume level (0.0 to 1.0) */
    this.volume = 0.3;
    /** @type {boolean} Whether audio is enabled */
    this.enabled = true;
    /** @type {Map<string, Object>} Active engine sounds by cycle ID */
    this.activeEngines = new Map();

    this.#initialize();
  }

  /**
   * Initializes the Web Audio API context.
   * @private
   */
  #initialize() {
    try {
      // Create audio context (with vendor prefixes for older browsers)
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();

      // Create master gain node for volume control
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.audioContext.destination);
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
      this.enabled = false;
    }
  }

  /**
   * Ensures audio context is running (handles browser autoplay policies).
   * @private
   */
  async #ensureAudioContext() {
    if (!this.audioContext || !this.enabled) return false;

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.warn('Failed to resume audio context:', error);
        return false;
      }
    }

    return true;
  }

  /**
   * Plays a collision sound effect (complex explosion with multiple tones).
   */
  async playCollision() {
    if (!await this.#ensureAudioContext()) return;

    const now = this.audioContext.currentTime;

    // Main explosion sound - harsh descending tone
    const osc1 = this.audioContext.createOscillator();
    const gain1 = this.audioContext.createGain();

    osc1.type = 'square';
    osc1.frequency.setValueAtTime(300, now);
    osc1.frequency.exponentialRampToValueAtTime(40, now + 0.4);

    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc1.connect(gain1);
    gain1.connect(this.masterGain);

    // Secondary crackle/static layer
    const osc2 = this.audioContext.createOscillator();
    const gain2 = this.audioContext.createGain();

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(180, now);
    osc2.frequency.exponentialRampToValueAtTime(30, now + 0.35);

    gain2.gain.setValueAtTime(0.2, now + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc2.connect(gain2);
    gain2.connect(this.masterGain);

    // High frequency impact layer
    const osc3 = this.audioContext.createOscillator();
    const gain3 = this.audioContext.createGain();

    osc3.type = 'square';
    osc3.frequency.setValueAtTime(800, now);
    osc3.frequency.exponentialRampToValueAtTime(200, now + 0.15);

    gain3.gain.setValueAtTime(0.25, now);
    gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc3.connect(gain3);
    gain3.connect(this.masterGain);

    // Start all oscillators
    osc1.start(now);
    osc1.stop(now + 0.4);
    osc2.start(now + 0.02);
    osc2.stop(now + 0.35);
    osc3.start(now);
    osc3.stop(now + 0.15);
  }

  /**
   * Plays a game start countdown sound (same tone for each beep).
   */
  async playGameStart() {
    if (!await this.#ensureAudioContext()) return;

    const now = this.audioContext.currentTime;

    // Same tone for countdown beeps, final beep is longer
    const tones = [
      { freq: 880, time: 0.0, duration: 0.15 },  // A5
      { freq: 880, time: 1.0, duration: 0.15 },  // A5
      { freq: 880, time: 2.0, duration: 0.15 },  // A5
      { freq: 880, time: 3.0, duration: 0.3 },   // A5 (longer final beep)
    ];

    tones.forEach(tone => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = tone.freq;

      const startTime = now + tone.time;
      const endTime = startTime + tone.duration;

      gainNode.gain.setValueAtTime(0.25, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);

      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain);

      oscillator.start(startTime);
      oscillator.stop(endTime);
    });
  }

  /**
   * Plays a victory sound (triumphant melodic fanfare).
   */
  async playVictory() {
    if (!await this.#ensureAudioContext()) return;

    const now = this.audioContext.currentTime;

    // Triumphant melody: C - E - G - C - G - E - C (higher octave)
    // Timing creates a more musical rhythm
    const melody = [
      { freq: 523.25, time: 0.0, duration: 0.2 },    // C5
      { freq: 659.25, time: 0.2, duration: 0.2 },    // E5
      { freq: 783.99, time: 0.4, duration: 0.2 },    // G5
      { freq: 1046.50, time: 0.6, duration: 0.3 },   // C6 (emphasized)
      { freq: 783.99, time: 0.9, duration: 0.15 },   // G5
      { freq: 659.25, time: 1.05, duration: 0.15 },  // E5
      { freq: 1046.50, time: 1.2, duration: 0.5 },   // C6 (final, longer)
    ];

    melody.forEach(note => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = 'square';
      oscillator.frequency.value = note.freq;

      const startTime = now + note.time;
      const endTime = startTime + note.duration;

      // Smooth envelope for musical quality
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(0.15, endTime - 0.05);
      gainNode.gain.linearRampToValueAtTime(0.01, endTime);

      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain);

      oscillator.start(startTime);
      oscillator.stop(endTime);
    });
  }

  /**
   * Plays a defeat sound (somber descending melody).
   */
  async playDefeat() {
    if (!await this.#ensureAudioContext()) return;

    const now = this.audioContext.currentTime;

    // Somber descending melody: E - D - C - A - G - F - E (lower)
    // Creates a "sad trombone" / defeat feeling
    const melody = [
      { freq: 659.25, time: 0.0, duration: 0.25 },   // E5
      { freq: 587.33, time: 0.25, duration: 0.25 },  // D5
      { freq: 523.25, time: 0.5, duration: 0.25 },   // C5
      { freq: 440.00, time: 0.75, duration: 0.25 },  // A4
      { freq: 392.00, time: 1.0, duration: 0.3 },    // G4
      { freq: 349.23, time: 1.3, duration: 0.3 },    // F4
      { freq: 329.63, time: 1.6, duration: 0.6 },    // E4 (final, longer)
    ];

    melody.forEach(note => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = 'triangle';
      oscillator.frequency.value = note.freq;

      const startTime = now + note.time;
      const endTime = startTime + note.duration;

      // Smooth envelope for musical quality
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(0.12, endTime - 0.05);
      gainNode.gain.linearRampToValueAtTime(0.01, endTime);

      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain);

      oscillator.start(startTime);
      oscillator.stop(endTime);
    });
  }

  /**
   * Sets the master volume.
   * @param {number} volume - Volume level (0.0 to 1.0)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  /**
   * Enables or disables sound.
   * @param {boolean} enabled - Whether sound should be enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Plays a continuous engine/motor sound for a light cycle.
   * The sound accelerates over time, mimicking the TRON arcade motorcycle effect.
   * @param {string} cycleId - Unique identifier for the light cycle
   * @param {boolean} isPlayer - Whether this is the player's cycle (affects pitch)
   */
  async playEngine(cycleId, isPlayer = false) {
    if (!await this.#ensureAudioContext()) return;

    // Stop existing engine for this cycle if any
    this.stopEngine(cycleId);

    const now = this.audioContext.currentTime;

    // Create oscillator for engine rumble (sawtooth for gritty motor sound)
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sawtooth';

    // Different base frequencies for player vs enemy (lower and deeper)
    const baseFreq = isPlayer ? 50 : 60;
    const targetFreq = isPlayer ? 100 : 110;

    // Start low and accelerate more slowly
    oscillator.frequency.setValueAtTime(baseFreq, now);
    oscillator.frequency.linearRampToValueAtTime(targetFreq, now + 1.2);

    // Volume envelope - quick attack, sustain
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.08, now + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

    oscillator.start(now);

    // Store reference for cleanup
    this.activeEngines.set(cycleId, {
      oscillator,
      gainNode,
      startTime: now
    });
  }

  /**
   * Stops the engine sound for a specific light cycle.
   * @param {string} cycleId - Unique identifier for the light cycle
   */
  stopEngine(cycleId) {
    const engine = this.activeEngines.get(cycleId);
    if (!engine) return;

    try {
      const now = this.audioContext.currentTime;

      // Quick fade out
      engine.gainNode.gain.cancelScheduledValues(now);
      engine.gainNode.gain.setValueAtTime(engine.gainNode.gain.value, now);
      engine.gainNode.gain.linearRampToValueAtTime(0.001, now + 0.05);

      // Stop oscillator after fade
      engine.oscillator.stop(now + 0.05);
    } catch (error) {
      // Oscillator might already be stopped
      console.debug('Error stopping engine:', error);
    }

    this.activeEngines.delete(cycleId);
  }

  /**
   * Stops all currently playing sounds (if needed for future enhancements).
   */
  stopAll() {
    // Stop all active engines
    for (const cycleId of this.activeEngines.keys()) {
      this.stopEngine(cycleId);
    }
  }

  /**
   * Cleans up audio resources.
   */
  cleanup() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.masterGain = null;
  }
}
