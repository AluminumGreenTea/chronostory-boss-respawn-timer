/* ============================================================
 * render.js — 畫面渲染（只負責產生 / 更新 DOM）
 * 卡片、進度倒數環、篩選列、表單裡的怪物 / 符號 / 顏色選格。
 * ============================================================ */

const GAUGE_R = 20;                     // 右半圓進度半徑
const GAUGE_LEN = Math.PI * GAUGE_R;    // 半圓弧長

/* 進度環：以 5 分鐘為單位分色（越接近重生越暖），最後 1 分鐘轉金色；
 * 30 分鐘以上則沿用該卡片 / 主題色。 */
const RING_GOLD = '#ffc93c';
function ringBandColor(remainingMs, fallback) {
  const mins = remainingMs / 60000;
  if (mins < 1) return RING_GOLD;   // 最後 1 分鐘：金
  if (mins < 5) return '#ff7a3b';   // 0–5：橘
  if (mins < 10) return '#ff9f3d';  // 5–10：琥珀
  if (mins < 15) return '#f2c53c';  // 10–15：黃
  if (mins < 20) return '#bcd24a';  // 15–20：黃綠
  if (mins < 25) return '#7fc65c';  // 20–25：綠
  if (mins < 30) return '#4fbf9e';  // 25–30：青
  return fallback;                  // 30 分以上：卡片 / 主題色
}

/* 載入失敗的圖片網址快取：之後重建同一張卡直接顯示替代符號，不再重試 / 閃爍 */
const FAILED_IMG = new Set();

/* 每個主題各有一組「進度條色盤」，讓進度環配色跟著主題變化；
 * 自訂圖示則直接用使用者選的顏色。 */
const CARD_PALETTES = {
  dark:     ['#e8963a', '#5cae54', '#3f9bd6', '#9b6fd0', '#e0794e', '#33bcae', '#d9a441', '#d46a95'],
  light:    ['#b0713a', '#8a7a3c', '#a4592f', '#6f8a4f', '#c19a4a', '#9c6b4a', '#7d8a5c', '#b5834a'],
  starry:   ['#8b9cf0', '#b98bf0', '#5ec8e0', '#e08bd0', '#6ee0c0', '#e8c86a', '#e58ba0', '#7aa0f0'],
  sakura:   ['#c1475f', '#d97a8e', '#e0965c', '#b0708f', '#c9a24a', '#7fa06a', '#9c6f9e', '#6f8bb0'],
  slate:    ['#5b7d99', '#79987e', '#b0868a', '#b3a06a', '#6f9791', '#8b7f9c', '#a08a6f', '#7d8ca0'],
  matcha:   ['#7d9150', '#8a9b6a', '#b0a05f', '#6f9080', '#a98a5f', '#9c9a5a', '#7f9b95', '#a97f6f'],
  lavender: ['#8878aa', '#a08bb0', '#7f8bb0', '#b08a9e', '#9a9b6f', '#6f9aa0', '#b0956f', '#8f7f9e'],
};
const DEFAULT_PALETTE = CARD_PALETTES.dark;

const Render = {
  /* 兩色線性混合（t=0→hex，t=1→target），回傳 #rrggbb */
  mixHex(hex, target, t) {
    const a = parseInt(hex.slice(1), 16), b = parseInt(target.slice(1), 16);
    const mix = (sh) => {
      const x = (a >> sh) & 255, y = (b >> sh) & 255;
      return Math.round(x + (y - x) * t);
    };
    const r = mix(16), g = mix(8), bl = mix(0);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
  },

  /* 目前主題的警示色（讀 CSS 變數並快取；主題切換時由 app 呼叫 invalidate 清除） */
  _dangerHex: null,
  dangerColor() {
    if (!this._dangerHex) {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue('--danger').trim();
      this._dangerHex = /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#e9695c';
    }
    return this._dangerHex;
  },

  /* 依紀錄決定卡片進度色：自訂圖示用其顏色；怪物用 id 雜湊，從「目前主題」的色盤挑一色 */
  cardColor(record) {
    if (record.iconType === 'custom' && record.color) {
      const c = MapleConfig.COLOR_BY_ID[record.color];
      if (c) return c.hex;
    }
    const palette = (window.MapleTheme && CARD_PALETTES[MapleTheme.current]) || DEFAULT_PALETTE;
    const key = String(record.monsterId || record.monsterName || record.id || '');
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  },

  /* ---- 左側全高圖像層：怪物圖（載入佔位 / 失敗退回符號）或自訂符號；右緣以漸層淡出 ---- */
  buildMedia(record) {
    const media = document.createElement('div');
    media.className = 'card-media';

    if (record.iconType === 'monster') {
      const mon = MapleConfig.MONSTER_BY_ID[record.monsterId];
      const url = mon ? mon.image : '';
      const fallbackGlyph = () => this.mediaGlyph(
        (mon && mon.fallback) || (record.monsterName || '?')[0], null);

      // 之前載入失敗過 → 直接顯示替代符號，不再嘗試（免閃爍）
      if (!url || FAILED_IMG.has(url)) {
        media.appendChild(fallbackGlyph());
        return media;
      }

      media.classList.add('is-loading');   // 載入佔位（微光）
      const img = document.createElement('img');
      img.src = url;
      img.alt = record.monsterName || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('load', () => media.classList.remove('is-loading'), { once: true });
      img.onerror = () => {
        FAILED_IMG.add(url);
        media.classList.remove('is-loading');
        img.remove();
        media.appendChild(fallbackGlyph());
      };
      media.appendChild(img);
    } else {
      const hex = (MapleConfig.COLOR_BY_ID[record.color] || {}).hex || null;
      media.appendChild(this.mediaGlyph(record.symbol, hex));
    }
    return media;
  },

  /* 圖像層裡的符號 / 退回文字 */
  mediaGlyph(text, color) {
    const g = document.createElement('span');
    g.className = 'card-media-glyph';
    g.textContent = text;
    if (color) g.style.color = color;
    return g;
  },

  /* ---- 單張卡片 ---- */
  buildCard(record, state, handlers) {
    const card = document.createElement('article');
    card.className = 'card' + (state.ready ? ' is-ready' : '');
    card.dataset.id = record.id;
    const mon = record.iconType === 'monster' ? MapleConfig.MONSTER_BY_ID[record.monsterId] : null;
    const displayName = mon
      ? MapleI18n.monster(mon)
      : (record.iconType === 'monster' ? (record.monsterName || '') : (record.label || record.symbol));
    const who = `${displayName} CH${record.channel}`;
    card.setAttribute('role', 'group');
    card.setAttribute('aria-label', who);
    card.style.setProperty('--card-color', this.cardColor(record));

    // 主要區：左圖 + 右資訊
    const main = document.createElement('div');
    main.className = 'card-main';
    main.appendChild(this.buildMedia(record));

    // 頻道標籤（左上角，保留就地編輯 / 方向鍵）
    const ch = document.createElement('span');
    ch.className = 'ch-tag ch-editable';
    ch.textContent = `CH ${record.channel}`;
    ch.tabIndex = 0;
    ch.setAttribute('role', 'button');
    ch.title = MapleI18n.t('ch.title');
    ch.setAttribute('aria-label', MapleI18n.t('ch.aria', { n: record.channel }));

    // 點擊 / Enter：就地把頻道換成數字輸入框，改完 Enter 或失焦即套用
    const startChannelEdit = () => {
      if (ch.querySelector('input')) return;
      handlers.beginChannelEdit();
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '1';
      input.step = '1';
      input.inputMode = 'numeric';
      input.className = 'ch-input';
      input.value = record.channel;
      ch.textContent = 'CH ';
      ch.appendChild(input);
      input.focus();
      input.select();

      let done = false;
      const finish = (commit) => {
        if (done) return;
        done = true;
        const val = parseInt(input.value, 10);
        const next = (commit && Number.isFinite(val) && val > 0) ? val : null;
        handlers.endChannelEdit(record.id, next);   // 由 app 更新資料並重繪
      };
      input.addEventListener('keydown', (e) => {
        e.stopPropagation();                         // 不要觸發全域 Esc / Tab 陷阱
        if (e.key === 'Enter') { e.preventDefault(); finish(true); }
        else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
        else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          // 在輸入框內也支援 ±1 / Shift ±10（不用先送出）
          e.preventDefault();
          const s = e.shiftKey ? 10 : 1;
          const cur = parseInt(input.value, 10);
          const base = Number.isFinite(cur) ? cur : record.channel;
          input.value = Math.max(1, base + (e.key === 'ArrowUp' ? s : -s));
        }
      });
      input.addEventListener('blur', () => finish(true));
      input.addEventListener('click', (e) => e.stopPropagation());
    };
    ch.addEventListener('click', startChannelEdit);
    ch.addEventListener('keydown', (e) => {
      if (ch.querySelector('input')) return;               // 編輯輸入框開啟時不攔截
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        startChannelEdit();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;                  // Shift 一次 ±10
        const next = handlers.stepChannel(record.id, e.key === 'ArrowUp' ? step : -step);
        if (next != null) {
          record.channel = next;                           // 就地更新，保留焦點（不整批重建）
          ch.textContent = `CH ${next}`;
          ch.setAttribute('aria-label', MapleI18n.t('ch.aria', { n: next }));
        }
      }
    });

    main.appendChild(ch);

    // 右側資訊欄：名稱 + （倒數 / 剩餘時間 + 進度環 / 百分比）
    const body = document.createElement('div');
    body.className = 'card-body';

    const name = document.createElement('span');
    name.className = 'card-name';
    name.textContent = displayName;

    const readout = document.createElement('div');
    readout.className = 'card-readout';

    const timeCol = document.createElement('div');
    timeCol.className = 'card-time';
    const countdown = document.createElement('div');
    countdown.className = 'card-countdown';
    const remaining = document.createElement('div');
    remaining.className = 'card-remaining';
    remaining.textContent = MapleI18n.t('card.remaining');
    timeCol.append(countdown, remaining);

    const cc = this.cardColor(record);
    const gid = 'grad-' + record.id;
    const light = this.mixHex(cc, '#ffffff', 0.55);   // 上下尾端的淺色
    const gauge = document.createElement('div');
    gauge.className = 'card-gauge';
    gauge.innerHTML = `
      <svg class="card-ring" viewBox="0 0 26 46" aria-hidden="true">
        <defs>
          <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="${light}"></stop>
            <stop offset="0.5" stop-color="${cc}"></stop>
            <stop offset="1" stop-color="${light}"></stop>
          </linearGradient>
        </defs>
        <path class="ring-track" d="M3 3 A20 20 0 0 1 3 43"></path>
        <path class="ring-progress" d="M3 3 A20 20 0 0 1 3 43"
          stroke="url(#${gid})"
          stroke-dasharray="${GAUGE_LEN}" stroke-dashoffset="${GAUGE_LEN}"></path>
      </svg>`;
    const pct = document.createElement('span');
    pct.className = 'card-pct';
    gauge.appendChild(pct);

    readout.append(timeCol, gauge);
    body.append(name, readout);
    main.appendChild(body);
    card.appendChild(main);

    // 快取動態節點，tick 更新時直接取用（免每次 querySelector）
    card._countdown = countdown;
    card._pct = pct;
    card._ring = gauge.querySelector('.ring-progress');
    card._stops = gauge.querySelectorAll('stop');   // 漸層三個色停，換色時就地更新
    card._ch = ch;

    // 底部：整條分格操作列（圖示 + 文字）
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const mkBtn = (icon, key, cls, onClick) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ' + cls;
      b.title = MapleI18n.t(key);
      b.setAttribute('aria-label', `${MapleI18n.t(key)} ${who}`);
      b.innerHTML = MapleIcons.markup(icon, { size: 15 }) +
        `<span class="btn-label">${MapleI18n.t(key)}</span>`;
      b.addEventListener('click', onClick);
      return b;
    };
    actions.append(
      mkBtn('reset', 'card.reset', 'btn-kill', () => handlers.onKill(record.id)),
      mkBtn('copy', 'card.copy', 'btn-icon', () => handlers.onCopy(record.id)),
      mkBtn('pencil', 'card.edit', 'btn-icon', () => handlers.onEdit(record.id)),
      mkBtn('trash', 'card.delete', 'btn-icon btn-danger', () => handlers.onDelete(record.id)),
    );
    card.appendChild(actions);

    this.updateCard(card, record, state);
    return card;
  },

  /* ---- 每次 tick 更新卡片的動態部分（用快取節點 + 只在文字改變時才寫 DOM） ---- */
  updateCard(card, record, state) {
    card.classList.toggle('is-ready', state.ready);
    card.classList.toggle('is-urgent', !!state.urgent);
    card.classList.toggle('is-overdue-long', !!state.overdueLong);

    const ring = card._ring || (card._ring = card.querySelector('.ring-progress'));
    if (ring) {
      const off = String(GAUGE_LEN * (1 - state.progress));
      if (ring._off !== off) { ring.style.strokeDashoffset = off; ring._off = off; }
    }

    // 進度環顏色：超時→珊瑚紅；剛可重生→金；倒數中依 5 分鐘分色（30 分以上用卡片/主題色）
    const color = state.overdueLong
      ? this.dangerColor()
      : state.ready
        ? RING_GOLD
        : ringBandColor(state.remaining, this.cardColor(record));
    this.setRingColor(card, color);

    const pct = card._pct || (card._pct = card.querySelector('.card-pct'));
    if (pct) {
      const t = Math.round(state.progress * 100) + '%';
      if (pct.textContent !== t) pct.textContent = t;
    }
    // 時間到了直接顯示負數，不再另外顯示文字
    const countdown = card._countdown || (card._countdown = card.querySelector('.card-countdown'));
    if (countdown) {
      const t = state.ready
        ? '-' + MapleTimer.formatDuration(state.overdue)
        : MapleTimer.formatDuration(state.remaining);
      if (countdown.textContent !== t) countdown.textContent = t;
    }
    // 頻道標籤：非編輯中才同步（涵蓋方向鍵 / 編輯 / 複製造成的頻道變動）
    const ch = card._ch;
    if (ch && !ch.querySelector('input')) {
      const t = `CH ${record.channel}`;
      if (ch.textContent !== t) {
        ch.textContent = t;
        ch.setAttribute('aria-label', MapleI18n.t('ch.aria', { n: record.channel }));
      }
    }
    // 可重生時的定時漣漪由 CSS（.card.is-ready .card-gauge::after）處理，不需 JS
  },

  /* 設定進度環顏色（更新 --card-color 與半圓漸層 3 個色停）；只在改變時動 DOM */
  setRingColor(card, hex) {
    if (card._rc === hex) return;
    card._rc = hex;
    card.style.setProperty('--card-color', hex);
    const stops = card._stops || (card._stops = card.querySelectorAll('.card-gauge stop'));
    if (stops && stops.length >= 3) {
      // 明顯的漸層：起點偏深 → 本色 → 收尾偏亮
      const deep = this.mixHex(hex, '#000000', 0.18);
      const light = this.mixHex(hex, '#ffffff', 0.5);
      stops[0].setAttribute('stop-color', deep);
      stops[1].setAttribute('stop-color', hex);
      stops[2].setAttribute('stop-color', light);
    }
  },

  /* 主題切換用：清掉快取色，讓下次 updateCard 依新主題重算環色（不重建卡片） */
  invalidateColor(card) {
    card._rc = null;
  },

  /* ---- 篩選列（種類 ≥ 2 才顯示） ---- */
  renderFilters(container, types, activeKey, onSelect) {
    container.innerHTML = '';
    if (types.length < 2) {
      container.classList.add('hidden');
      return;
    }
    container.classList.remove('hidden');

    const makeChip = (key, label) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip' + (activeKey === key ? ' active' : '');
      chip.textContent = label;
      chip.addEventListener('click', () => onSelect(key));
      return chip;
    };

    container.appendChild(makeChip('all', `${MapleI18n.t('filter.all')} (${types.reduce((n, t) => n + t.count, 0)})`));
    types.forEach(t => container.appendChild(makeChip(t.key, `${t.label} (${t.count})`)));
  },

  /* ---- 表單：怪物選格 ---- */
  buildMonsterGrid(grid, onPick) {
    grid.innerHTML = '';
    MapleConfig.MONSTERS.forEach(mon => {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'pick-monster';
      cell.dataset.id = mon.id;
      const img = document.createElement('img');
      img.src = mon.image;
      img.alt = mon.name;
      img.onerror = () => {
        img.remove();
        const fb = document.createElement('span');
        fb.className = 'pick-fallback';
        fb.textContent = mon.fallback;
        cell.insertBefore(fb, cell.firstChild);
      };
      const cap = document.createElement('span');
      cap.className = 'pick-cap';
      cap.textContent = MapleI18n.monster(mon);
      cell.append(img, cap);
      cell.addEventListener('click', () => onPick(mon.id));
      grid.appendChild(cell);
    });
  },

  /* ---- 表單：符號選格 ---- */
  buildSymbolGrid(grid, onPick) {
    grid.innerHTML = '';
    MapleConfig.SYMBOLS.forEach(sym => {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'pick-symbol';
      cell.dataset.symbol = sym;
      cell.textContent = sym;
      cell.addEventListener('click', () => onPick(sym));
      grid.appendChild(cell);
    });
  },

  /* ---- 表單：顏色選格 ---- */
  buildColorGrid(grid, onPick) {
    grid.innerHTML = '';
    MapleConfig.COLORS.forEach(col => {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'pick-color';
      cell.dataset.color = col.id;
      cell.title = MapleI18n.color(col);
      cell.style.background = col.hex;
      cell.addEventListener('click', () => onPick(col.id));
      grid.appendChild(cell);
    });
  },
};

window.MapleRender = Render;
