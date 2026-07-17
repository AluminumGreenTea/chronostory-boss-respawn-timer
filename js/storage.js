/* ============================================================
 * storage.js — 資料持久化
 * 把所有紀錄與偏好設定存進瀏覽器 localStorage，
 * 重新整理或關掉分頁後倒數依然接得上（用結束時間換算）。
 * ============================================================ */

const STORAGE_KEY = 'maple_respawn_records_v1';
const PREF_KEY = 'maple_respawn_prefs_v1';

const Storage = {
  loadRecords() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('讀取紀錄失敗，改用空清單', e);
      return [];
    }
  },

  saveRecords(records) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.warn('儲存紀錄失敗', e);
    }
  },

  loadPrefs() {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      return raw ? JSON.parse(raw) : { soundOn: true };
    } catch (e) {
      return { soundOn: true };
    }
  },

  savePrefs(prefs) {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.warn('儲存偏好失敗', e);
    }
  },
};

window.MapleStorage = Storage;
