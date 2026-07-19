/* ============================================================
 * theme.js — 主題切換（深色 / 淺色 / 翠綠）
 * 在 <html> 掛上 data-theme，CSS 依此重新對應調色變數。
 * 點主題鈕 → 跑出「下半圓環滾輪」；滾輪滾動（往左上／右上）看更多主題，
 * 點選任一主題即套用。
 * ============================================================ */

const THEME_KEY = 'maple_theme_v2';

const THEMES = [
  { id: 'dark',     name: '深色', icon: 'moon' },
  { id: 'light',    name: '大地', icon: 'sun'  },
  { id: 'starry',   name: '星空', icon: 'star' },
  { id: 'sakura',   name: '櫻緋', icon: 'flower' },
  { id: 'slate',    name: '霧藍', icon: 'cloud' },
  { id: 'matcha',   name: '抹茶', icon: 'leaf' },
  { id: 'lavender', name: '薰衣', icon: 'sparkles' },
];

/* 主題名稱（依語言） */
function themeName(id) {
  const fallback = (THEMES.find(t => t.id === id) || {}).name || id;
  return window.MapleI18n ? MapleI18n.t('theme.' + id + '.name') : fallback;
}
function themeTitle(id) {
  return window.MapleI18n ? MapleI18n.t('theme.' + id) : id;
}

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

  apply(id, animate) {
    const theme = THEMES.find(t => t.id === id) || THEMES[0];
    this.current = theme.id;

    const root = document.documentElement;
    const reduce = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (animate && !reduce) {
      root.classList.add('is-theming');
      setTimeout(() => root.classList.remove('is-theming'), 260);
    }
    root.setAttribute('data-theme', theme.id);

    if (this.btn && window.MapleIcons) {
      this.btn.innerHTML = MapleIcons.markup(theme.icon, { size: 18 });
      this.btn.title = themeTitle(theme.id);
      this.btn.setAttribute('aria-label', themeTitle(theme.id));
    }

    // 通知 app 依主題重繪（進度條配色跟著主題變）
    if (this.themeChanged) this.themeChanged(theme.id);
  },

  /* 直接設定並保存 */
  set(id, animate) {
    this.apply(id, animate);
    this.save(id);
  },

  /* -------- 下半圓環滾輪 -------- */
  wheel: {
    overlay: null,
    ring: null,
    label: null,
    items: [],
    focus: 0,
    acc: 0,
    R: 60,           // 半徑（小巧，貼近按鈕、不易被切）
    STEP: 46,        // 相鄰主題夾角（度）
    A0: 90,          // 焦點所在角度（90°=正下方；空間不夠時改成左下 135°）
    winMin: -2,      // 可見角度視窗
    winMax: 182,
    isOpen: false,
  },

  buildWheel() {
    const w = this.wheel;
    if (w.overlay) return;

    const overlay = document.createElement('div');
    overlay.className = 'theme-wheel-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    const ring = document.createElement('div');
    ring.className = 'theme-wheel';
    ring.setAttribute('role', 'listbox');
    ring.setAttribute('aria-label', window.MapleI18n ? MapleI18n.t('theme.pick') : '選擇主題');

    w.items = THEMES.map((t, i) => {
      const it = document.createElement('button');
      it.type = 'button';
      it.className = 'theme-wheel-item';
      it.dataset.id = t.id;
      it.setAttribute('role', 'option');
      it.innerHTML = MapleIcons.markup(t.icon, { size: 20 });
      it.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setFocus(i);
        this.closeWheel();
      });
      ring.appendChild(it);
      return it;
    });

    const label = document.createElement('div');
    label.className = 'theme-wheel-label';
    ring.appendChild(label);

    overlay.appendChild(ring);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeWheel();
    });
    // 滾輪：往上／下滾動旋轉圓環（左上 / 右上帶入更多選項）
    overlay.addEventListener('wheel', (e) => {
      e.preventDefault();
      w.acc += e.deltaY;
      if (Math.abs(w.acc) >= 28) {
        this.setFocus(w.focus + (w.acc > 0 ? 1 : -1));
        w.acc = 0;
      }
    }, { passive: false });

    document.body.appendChild(overlay);
    w.overlay = overlay;
    w.ring = ring;
    w.label = label;
  },

  layoutWheel() {
    const w = this.wheel;
    const n = THEMES.length;
    for (let i = 0; i < n; i++) {
      const delta = i - w.focus;
      const angle = w.A0 + delta * w.STEP;         // 焦點在 A0；其餘沿弧展開
      const rad = angle * Math.PI / 180;
      const x = w.R * Math.cos(rad);
      const y = w.R * Math.sin(rad);               // y 向下為正
      const it = w.items[i];
      const off = Math.min(Math.abs(delta), 3);
      const visible = angle >= w.winMin && angle <= w.winMax;   // 只顯示允許的弧段
      it.style.transform =
        `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${(1 - off * 0.16).toFixed(3)})`;
      it.style.opacity = visible ? String(1 - off * 0.28) : '0';
      it.style.pointerEvents = visible ? 'auto' : 'none';
      it.classList.toggle('is-focus', i === w.focus);
      it.setAttribute('aria-selected', i === w.focus ? 'true' : 'false');
    }
    if (w.label) {
      const rad = w.A0 * Math.PI / 180;
      const lx = (w.R + 26) * Math.cos(rad);
      const ly = (w.R + 26) * Math.sin(rad);
      w.label.textContent = themeName(THEMES[w.focus].id);
      w.label.style.transform = `translate(-50%, -50%) translate(${lx.toFixed(1)}px, ${ly.toFixed(1)}px)`;
    }
  },

  setFocus(i) {
    const w = this.wheel;
    const n = THEMES.length;
    w.focus = Math.max(0, Math.min(n - 1, i));
    this.layoutWheel();
    this.set(THEMES[w.focus].id, false);   // 即時預覽 + 保存（滾動時不做整頁淡入淡出，避免閃爍）
  },

  openWheel() {
    this.buildWheel();
    const w = this.wheel;
    w.isOpen = true;
    w.acc = 0;
    w.focus = Math.max(0, THEMES.findIndex(t => t.id === this.current));

    // 圓心 = 主題鈕中心（下半圓弧由此往下展開）
    const r = this.btn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    w.ring.style.left = cx + 'px';
    w.ring.style.top = cy + 'px';

    // 依可用空間決定弧段：右邊不夠 → 只用左下角；左邊不夠 → 只用右下角
    const need = w.R + 46;
    if (window.innerWidth - cx < need) {
      w.A0 = 135; w.winMin = 88; w.winMax = 184;    // 左下 45° 弧
    } else if (cx < need) {
      w.A0 = 45;  w.winMin = -4; w.winMax = 92;      // 右下 45° 弧
    } else {
      w.A0 = 90;  w.winMin = -2; w.winMax = 182;     // 完整下半圓
    }

    this.layoutWheel();
    w.overlay.classList.add('open');
    this.btn.setAttribute('aria-expanded', 'true');
    this._onKey = (e) => this.onKey(e);
    document.addEventListener('keydown', this._onKey);
  },

  closeWheel() {
    const w = this.wheel;
    if (!w.isOpen) return;
    w.isOpen = false;
    w.overlay.classList.remove('open');
    this.btn.setAttribute('aria-expanded', 'false');
    if (this._onKey) document.removeEventListener('keydown', this._onKey);
  },

  toggleWheel() {
    if (this.wheel.isOpen) this.closeWheel();
    else this.openWheel();
  },

  onKey(e) {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':   e.preventDefault(); this.setFocus(this.wheel.focus + 1); break;
      case 'ArrowLeft':
      case 'ArrowDown': e.preventDefault(); this.setFocus(this.wheel.focus - 1); break;
      case 'Enter':
      case ' ':         e.preventDefault(); this.closeWheel(); break;
      case 'Escape':    e.preventDefault(); this.closeWheel(); break;
    }
  },

  /* 語言切換時，更新按鈕標題與滾輪標籤 */
  refreshLabels() {
    if (this.btn) {
      this.btn.title = themeTitle(this.current);
      this.btn.setAttribute('aria-label', themeTitle(this.current));
    }
    if (this.wheel.isOpen) this.layoutWheel();
  },

  init() {
    this.btn = document.getElementById('theme-toggle');
    this.apply(this.current);
    if (this.btn) {
      this.btn.setAttribute('aria-haspopup', 'listbox');
      this.btn.setAttribute('aria-expanded', 'false');
      this.btn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleWheel(); });
    }
  },
};

// 載入當下先套用 data-theme，避免切換時閃一下預設色
ThemeManager.current = ThemeManager.load();
document.documentElement.setAttribute('data-theme', ThemeManager.current);

document.addEventListener('DOMContentLoaded', () => ThemeManager.init());

window.MapleTheme = ThemeManager;
