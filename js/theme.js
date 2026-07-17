/* ============================================================
 * theme.js — 深色 / 淺色切換
 * 在 <html> 掛上 data-theme，CSS 依此重新對應調色變數。
 * 兩種主題共用同一個跳色 #FF9900；預設為深色（深藍→近黑）。
 * ============================================================ */

const THEME_KEY = 'maple_theme_v2';

const THEMES = [
  { id: 'dark',  name: '深色', icon: 'moon' },
  { id: 'light', name: '淺色', icon: 'sun' },
];

const ThemeManager = {
  themes: THEMES,
  current: THEMES[0].id,
  btn: null,

  load() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return THEMES.some(t => t.id === saved) ? saved : THEMES[0].id;
    } catch (e) {
      return THEMES[0].id;
    }
  },

  save(id) {
    try { localStorage.setItem(THEME_KEY, id); } catch (e) { /* 忽略 */ }
  },

  apply(id) {
    const theme = THEMES.find(t => t.id === id) || THEMES[0];
    this.current = theme.id;
    document.documentElement.setAttribute('data-theme', theme.id);
    if (this.btn && window.MapleIcons) {
      this.btn.innerHTML = MapleIcons.markup(theme.icon, { size: 18 });
      const title = window.MapleI18n
        ? MapleI18n.t(theme.id === 'dark' ? 'theme.dark' : 'theme.light')
        : theme.name;
      this.btn.title = title;
      this.btn.setAttribute('aria-label', title);
    }
  },

  next() {
    const i = THEMES.findIndex(t => t.id === this.current);
    const theme = THEMES[(i + 1) % THEMES.length];

    const reduce = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      this.apply(theme.id);
    } else {
      const root = document.documentElement;
      root.classList.add('is-theming');
      this.apply(theme.id);
      setTimeout(() => root.classList.remove('is-theming'), 260);
    }
    this.save(theme.id);
  },

  init() {
    this.btn = document.getElementById('theme-toggle');
    this.apply(this.current);   // 補上按鈕圖示（data-theme 已於載入時套用）
    if (this.btn) this.btn.addEventListener('click', () => this.next());
  },
};

// 載入當下先套用 data-theme，避免切換時閃一下預設色
ThemeManager.current = ThemeManager.load();
document.documentElement.setAttribute('data-theme', ThemeManager.current);

document.addEventListener('DOMContentLoaded', () => ThemeManager.init());

window.MapleTheme = ThemeManager;
