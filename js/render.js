/* ============================================================
 * render.js — 畫面渲染（只負責產生 / 更新 DOM）
 * 卡片、進度倒數環、篩選列、表單裡的怪物 / 符號 / 顏色選格。
 * ============================================================ */

const RING_R = 16;
const RING_C = 2 * Math.PI * RING_R;   // 小進度環周長

const Render = {
  /* ---- 左側全高圖像層：怪物圖（失敗退回符號）或自訂符號；右緣以漸層淡出 ---- */
  buildMedia(record) {
    const media = document.createElement('div');
    media.className = 'card-media';

    if (record.iconType === 'monster') {
      const mon = MapleConfig.MONSTER_BY_ID[record.monsterId];
      const img = document.createElement('img');
      img.src = mon ? mon.image : '';
      img.alt = record.monsterName || '';
      img.loading = 'lazy';
      img.onerror = () => {
        // 圖片載入失敗 → 退回顯示第一個字，維持可用性
        img.remove();
        media.appendChild(this.mediaGlyph(
          (mon && mon.fallback) || (record.monsterName || '?')[0], null));
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

    // 左側：全高圖像（右緣漸層淡出）
    card.appendChild(this.buildMedia(record));

    // 中間：名稱 / 頻道 / 間隔 / 倒數
    // 名稱（放進圓環中心）
    const name = document.createElement('span');
    name.className = 'card-name';
    name.textContent = displayName;

    // 頻道標籤（絕對定位右上角，保留就地編輯 / 方向鍵）
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

    card.appendChild(ch);

    // 圓環 + 中心（怪物名稱 / 倒數時間）
    const dial = document.createElement('div');
    dial.className = 'card-dial';
    dial.innerHTML = `
      <svg class="card-ring" viewBox="0 0 36 36" aria-hidden="true">
        <circle class="ring-track" cx="18" cy="18" r="${RING_R}"></circle>
        <circle class="ring-progress" cx="18" cy="18" r="${RING_R}"
          stroke-dasharray="${RING_C}" stroke-dashoffset="0"
          transform="rotate(-90 18 18)"></circle>
      </svg>`;
    const center = document.createElement('div');
    center.className = 'dial-center';
    const countdown = document.createElement('div');
    countdown.className = 'card-countdown';
    center.append(name, countdown);
    dial.appendChild(center);
    card.appendChild(dial);

    // 右側 / 底部：操作按鈕
    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const killBtn = document.createElement('button');
    killBtn.className = 'btn btn-kill';
    killBtn.type = 'button';
    killBtn.title = MapleI18n.t('card.reset');
    killBtn.setAttribute('aria-label', `${MapleI18n.t('card.reset')} ${who}`);
    killBtn.innerHTML = MapleIcons.markup('reset', { size: 16 });
    killBtn.addEventListener('click', () => handlers.onKill(record.id));

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn-icon';
    copyBtn.type = 'button';
    copyBtn.title = MapleI18n.t('card.copy');
    copyBtn.setAttribute('aria-label', `${MapleI18n.t('card.copy')} ${who}`);
    copyBtn.innerHTML = MapleIcons.markup('copy', { size: 16 });
    copyBtn.addEventListener('click', () => handlers.onCopy(record.id));

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-icon';
    editBtn.type = 'button';
    editBtn.title = MapleI18n.t('card.edit');
    editBtn.setAttribute('aria-label', `${MapleI18n.t('card.edit')} ${who}`);
    editBtn.innerHTML = MapleIcons.markup('pencil', { size: 18 });
    editBtn.addEventListener('click', () => handlers.onEdit(record.id));

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-icon btn-danger';
    delBtn.type = 'button';
    delBtn.title = MapleI18n.t('card.delete');
    delBtn.setAttribute('aria-label', `${MapleI18n.t('card.delete')} ${who}`);
    delBtn.innerHTML = MapleIcons.markup('trash', { size: 18 });
    delBtn.addEventListener('click', () => handlers.onDelete(record.id));

    actions.append(killBtn, copyBtn, editBtn, delBtn);
    card.appendChild(actions);

    // 底部進度條（取代原本的環）
    const progress = document.createElement('div');
    progress.className = 'card-progress';
    progress.innerHTML = '<span class="card-progress-fill"></span>';
    card.appendChild(progress);

    this.updateCard(card, record, state);
    return card;
  },

  /* ---- 每次 tick 更新卡片的動態部分 ---- */
  updateCard(card, record, state) {
    card.classList.toggle('is-ready', state.ready);
    card.classList.toggle('is-urgent', !!state.urgent);
    card.classList.toggle('is-overdue-long', !!state.overdueLong);

    const ring = card.querySelector('.ring-progress');
    if (ring) ring.style.strokeDashoffset = String(RING_C * (1 - state.progress));
    const fill = card.querySelector('.card-progress-fill');
    if (fill) fill.style.width = (state.progress * 100) + '%';

    // 時間到了直接顯示負數，不再另外顯示文字
    const countdown = card.querySelector('.card-countdown');
    countdown.textContent = state.ready
      ? '-' + MapleTimer.formatDuration(state.overdue)
      : MapleTimer.formatDuration(state.remaining);
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
