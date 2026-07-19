/* ============================================================
 * i18n.js — 中 / 英雙語
 * t(key, params) 取字串（{x} 會被 params.x 取代）。
 * 靜態 DOM 用 data-i18n / -ph / -title / -aria 標記，apply() 一次套用。
 * 動態字串（卡片、Toast、錯誤…）由各模組呼叫 t()。
 * ============================================================ */

const I18N_KEY = "maple_lang_v1";

const STRINGS = {
  "app.title": { zh: "怪物重生計時器", en: "Boss Respawn Timer" },
  "app.desc": {
    zh: "依頻道追蹤每一隻 BOSS 的重生時間",
    en: "Track each boss’s respawn time by channel",
  },

  "tool.add": { zh: "新增計時器", en: "Add timer" },
  "tool.clear": { zh: "清除全部", en: "Clear all" },
  "tool.lang": { zh: "切換語言（中 / EN）", en: "Switch language (中 / EN)" },

  "search.ph": {
    zh: "搜尋名稱、備註或頻道…",
    en: "Search name, note or channel…",
  },
  "search.aria": { zh: "搜尋計時器", en: "Search timers" },

  "empty.title": { zh: "還沒有任何計時器", en: "No timers yet" },
  "empty.hint": {
    zh: "點「＋ 新增計時器」，選好怪物與頻道就會立即開始倒數。",
    en: "Tap “+ Add timer”, pick a boss and channel to start the countdown.",
  },
  "noresult.title": { zh: "找不到符合條件的計時器", en: "No matching timers" },
  "noresult.hint": {
    zh: "試試其他關鍵字，或清空搜尋欄。",
    en: "Try a different keyword, or clear the search.",
  },

  "modal.add": { zh: "新增計時器", en: "Add timer" },
  "modal.edit": { zh: "編輯計時器", en: "Edit timer" },
  "field.icon": { zh: "選擇圖示", en: "Icon" },
  "mode.monster": { zh: "怪物圖片", en: "Monster" },
  "mode.custom": { zh: "自訂圖示", en: "Custom" },
  "field.symbol": { zh: "符號（10 選 1）", en: "Symbol (pick 1 of 10)" },
  "field.color": { zh: "顏色（8 選 1）", en: "Color (pick 1 of 8)" },
  "field.note": { zh: "備註標籤（選填）", en: "Note label (optional)" },
  "note.ph": { zh: "例如：紅寶、魚王…", en: "e.g. Red Snail, Pianus…" },
  "field.channel": { zh: "頻道", en: "Channel" },
  "channel.sub": {
    zh: "一筆 = 一個頻道；多頻道請各自新增",
    en: "One entry = one channel; add each separately",
  },
  "channel.ph": {
    zh: "輸入頻道數字，例如 3",
    en: "Enter a channel number, e.g. 3",
  },
  "field.persist": { zh: "記錄到此瀏覽器", en: "Save to this browser" },
  "persist.sub": {
    zh: "關閉則僅本次瀏覽有效，重新整理後消失",
    en: "Off: only for this session, gone after refresh",
  },
  "field.interval": { zh: "重生間隔", en: "Respawn interval" },
  "interval.sub": { zh: "需大於 0", en: "must be > 0" },
  "interval.hours": { zh: "小時", en: "Hours" },
  "interval.minutes": { zh: "分鐘", en: "Minutes" },
  "btn.cancel": { zh: "取消", en: "Cancel" },
  "btn.submit": { zh: "建立並開始倒數", en: "Create & start" },

  "err.monster": { zh: "請先選一隻怪物。", en: "Please pick a boss first." },
  "err.symbol": { zh: "請選一個符號。", en: "Please pick a symbol." },
  "err.color": { zh: "請選一個顏色。", en: "Please pick a color." },
  "err.channel": {
    zh: "請輸入正確的頻道數字。",
    en: "Please enter a valid channel number.",
  },
  "err.interval": {
    zh: "重生間隔需大於 0。",
    en: "Respawn interval must be greater than 0.",
  },

  "card.remaining": { zh: "剩餘時間", en: "Time left" },
  "card.reset": { zh: "重置", en: "Reset" },
  "card.copy": { zh: "複製", en: "Copy" },
  "card.edit": { zh: "編輯", en: "Edit" },
  "card.delete": { zh: "刪除", en: "Delete" },
  "ch.title": {
    zh: "點擊修改頻道；聚焦後上下鍵 ±1，Shift+上下鍵 ±10",
    en: "Click to edit channel; ↑/↓ ±1, Shift+↑/↓ ±10",
  },
  "ch.aria": {
    zh: "頻道 {n}，點擊修改，或用上下方向鍵增減",
    en: "Channel {n}, click to edit, or use arrow keys",
  },

  "filter.all": { zh: "全部", en: "All" },
  "filter.scrollHint": {
    zh: "標籤過多，可用滾輪左右滾動",
    en: "More tags — scroll horizontally with the wheel",
  },
  "toast.undo": { zh: "復原", en: "Undo" },
  "toast.deleted": { zh: "已刪除「{who}」", en: "Deleted “{who}”" },
  "toast.cleared": {
    zh: "已清除全部 {n} 筆計時器",
    en: "Cleared all {n} timers",
  },
  "toast.copied": { zh: "已複製為「{who}」", en: "Copied as “{who}”" },
  "announce.respawned": { zh: "{names} 已重生", en: "{names} respawned" },
  "announce.restored": { zh: "已復原「{who}」", en: "Restored “{who}”" },
  "announce.copyUndone": { zh: "已復原複製", en: "Copy undone" },
  "announce.clearRestored": {
    zh: "已復原 {n} 筆計時器",
    en: "Restored {n} timers",
  },
  "summary.timers": { zh: "{n} 個計時器", en: "{n} timers" },
  "summary.respawned": { zh: "{n} 個已重生", en: "{n} respawned" },

  "sound.on": { zh: "提示音：開（點擊關閉）", en: "Sound: on (click to mute)" },
  "sound.off": {
    zh: "提示音：關（點擊開啟）",
    en: "Sound: off (click to unmute)",
  },
  "theme.dark": {
    zh: "深色模式（點擊切換主題）",
    en: "Dark mode (click to switch theme)",
  },
  "theme.light": {
    zh: "大地模式（點擊切換主題）",
    en: "Earth mode (click to switch theme)",
  },
  "theme.starry": {
    zh: "星空模式（點擊切換主題）",
    en: "Starry mode (click to switch theme)",
  },
  "theme.sakura": {
    zh: "櫻緋模式（點擊切換主題）",
    en: "Sakura mode (click to switch theme)",
  },
  "theme.slate": {
    zh: "霧藍模式（點擊切換主題）",
    en: "Slate mode (click to switch theme)",
  },
  "theme.matcha": {
    zh: "抹茶模式（點擊切換主題）",
    en: "Matcha mode (click to switch theme)",
  },
  "theme.lavender": {
    zh: "薰衣模式（點擊切換主題）",
    en: "Lavender mode (click to switch theme)",
  },
  "theme.dark.name": { zh: "深色", en: "Dark" },
  "theme.light.name": { zh: "大地", en: "Earth" },
  "theme.starry.name": { zh: "星空", en: "Starry" },
  "theme.sakura.name": { zh: "櫻緋", en: "Sakura" },
  "theme.slate.name": { zh: "霧藍", en: "Slate" },
  "theme.matcha.name": { zh: "抹茶", en: "Matcha" },
  "theme.lavender.name": { zh: "薰衣", en: "Lavender" },
  "theme.pick": { zh: "選擇主題", en: "Choose theme" },
};

const MapleI18n = {
  lang: "zh",
  btn: null,
  onChange: null,

  load() {
    try {
      const v = localStorage.getItem(I18N_KEY);
      return v === "en" || v === "zh" ? v : "zh";
    } catch (e) {
      return "zh";
    }
  },
  save(l) {
    try {
      localStorage.setItem(I18N_KEY, l);
    } catch (e) {
      /* 忽略 */
    }
  },

  /* 取字串；params 內的 {x} 會被替換 */
  t(key, params) {
    const entry = STRINGS[key];
    let s = entry ? entry[this.lang] || entry.zh : key;
    if (params) {
      for (const k in params) s = s.split("{" + k + "}").join(params[k]);
    }
    return s;
  },

  /* 依語言取怪物 / 顏色名稱（config 需有 nameEn） */
  monster(mon) {
    return this.lang === "en" && mon && mon.nameEn
      ? mon.nameEn
      : mon
        ? mon.name
        : "";
  },
  color(col) {
    return this.lang === "en" && col && col.nameEn
      ? col.nameEn
      : col
        ? col.name
        : "";
  },

  /* 套用到有 data-i18n* 標記的靜態 DOM */
  apply() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = this.t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      el.setAttribute("placeholder", this.t(el.dataset.i18nPh));
    });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.title = this.t(el.dataset.i18nTitle);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      el.setAttribute("aria-label", this.t(el.dataset.i18nAria));
    });
    document.documentElement.lang = this.lang === "en" ? "en" : "zh-Hant";
  },

  updateBtn() {
    if (!this.btn) return;
    this.btn.textContent = this.lang === "zh" ? "EN" : "中";
    this.btn.title = this.t("tool.lang");
    this.btn.setAttribute("aria-label", this.t("tool.lang"));
  },

  set(l) {
    this.lang = l === "en" ? "en" : "zh";
    this.save(this.lang);
    this.apply();
    this.updateBtn();
    if (this.onChange) this.onChange(); // 讓 app 重繪動態內容
  },
  toggle() {
    this.set(this.lang === "zh" ? "en" : "zh");
  },

  init(onChange) {
    this.onChange = onChange;
    this.btn = document.getElementById("lang-toggle");
    this.apply();
    this.updateBtn();
    if (this.btn) this.btn.addEventListener("click", () => this.toggle());
  },
};

// 載入時先決定語言（apply 在 DOMContentLoaded 之後由 init 執行）
MapleI18n.lang = MapleI18n.load();
document.documentElement.lang = MapleI18n.lang === "en" ? "en" : "zh-Hant";

window.MapleI18n = MapleI18n;
