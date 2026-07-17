/* ============================================================
 * sound.js — 重生提示音
 * 用 WebAudio 即時合成一段清亮的雙音上行提示（不需音檔），
 * 首次互動後才建立 AudioContext，避免瀏覽器自動播放限制。
 * ============================================================ */

const Sound = {
  ctx: null,

  _ensureCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  },

  /* 使用者第一次點擊時預熱，讓之後的自動提示音能順利播放 */
  unlock() {
    this._ensureCtx();
  },

  /* 播放「叮—叮」上行提示音 */
  chime() {
    const ctx = this._ensureCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [
      { freq: 784, start: 0.0,  dur: 0.16 }, // G5
      { freq: 1047, start: 0.14, dur: 0.30 }, // C6
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.25, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.02);
    });
  },
};

window.MapleSound = Sound;
