/* ============================================================
 * timer.js — 計時相關的純函式（不碰 DOM）
 * 負責：由 startTime + 間隔算出剩餘/超時、格式化文字、排序。
 * ============================================================ */

const TimerLogic = {
  /* 狀態色門檻（毫秒）：剩餘 ≤ 60 秒為「緊迫」；超時 ≥ 5 分為「早該重生」 */
  URGENT_MS: 60 * 1000,
  OVERDUE_LONG_MS: 5 * 60 * 1000,

  /* 由一筆紀錄算出目前狀態 */
  computeState(record, now = Date.now()) {
    const endTime = record.startTime + record.intervalMs;
    const remaining = endTime - now;          // >0 倒數中，<=0 可重生
    const ready = remaining <= 0;
    const overdue = ready ? -remaining : 0;   // 已超時毫秒
    const progress = ready
      ? 1
      : 1 - remaining / record.intervalMs;    // 0→1 進度環用
    return {
      endTime,
      ready,
      remaining,                              // 毫秒，可能為負
      overdue,
      // 狀態色語意：倒數中最後一分鐘轉琥珀；超時過久轉紅（ops dashboard 慣例）
      urgent: !ready && remaining <= this.URGENT_MS,
      overdueLong: ready && overdue >= this.OVERDUE_LONG_MS,
      progress: Math.min(Math.max(progress, 0), 1),
    };
  },

  /* 毫秒 → mm:ss 或 h:mm:ss（自動判斷是否需要小時位） */
  formatDuration(ms) {
    const totalSec = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  },

  /* 間隔的說明文字，例如「每 1 小時 30 分重生」 */
  formatInterval(record) {
    const parts = [];
    if (record.intervalH > 0) parts.push(`${record.intervalH} 小時`);
    if (record.intervalM > 0) parts.push(`${record.intervalM} 分`);
    return `每 ${parts.join(' ') || '0 分'}重生`;
  },

  /* 排序：可重生（超時久的在前）→ 倒數中（剩餘時間近到遠） */
  sortRecords(records, now = Date.now()) {
    return [...records].sort((a, b) => {
      const sa = this.computeState(a, now);
      const sb = this.computeState(b, now);
      if (sa.ready !== sb.ready) return sa.ready ? -1 : 1;
      if (sa.ready) return sb.overdue - sa.overdue;   // 超時越久越前面
      return sa.remaining - sb.remaining;             // 剩越少越前面
    });
  },

  /* 一筆紀錄的「種類」key，供篩選分組用（跨頻道視為同種） */
  typeKey(record) {
    if (record.iconType === 'monster') {
      return `m:${record.monsterId || record.monsterName}`;
    }
    return `c:${record.symbol}:${record.color}:${record.label || ''}`;
  },

  /* 種類的顯示名稱 */
  typeLabel(record) {
    if (record.iconType === 'monster') return record.monsterName;
    return record.label || record.symbol;
  },
};

window.MapleTimer = TimerLogic;
