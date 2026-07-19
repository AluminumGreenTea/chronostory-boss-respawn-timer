/* ============================================================
 * app.js — 主程式（把各模組串起來）
 * 狀態管理、表單流程、tick 迴圈、篩選、重生音效判定。
 * ============================================================ */

(function () {
  const { MONSTER_BY_ID } = MapleConfig;

  /* ---------------- 狀態 ---------------- */
  let records = MapleStorage.loadRecords();
  let prefs = MapleStorage.loadPrefs();
  let activeFilter = 'all';
  let editingId = null;

  // 表單暫存的選擇
  let form = { mode: 'monster', monsterId: null, symbol: null, color: null };

  // 音效判定用：記住上一輪已經「可重生」的 id，避免重複響
  let alertedIds = new Set();
  // 畫面差異比對用；null 為「強制重建」哨兵（空清單的簽章為 ''，故不可用 '' 當哨兵）
  let lastSignature = null;
  // 上一輪畫面上的卡片 id，用來判斷哪些是「新出現」的卡片（只讓新卡做進場動畫）
  let prevIds = new Set();
  // 篩選列簽章：內容沒變就不重建，避免每 500ms 重建 chip 導致點擊被中斷
  let lastFilterSig = null;
  // 卡片頻道就地編輯中：暫停整批重建，避免輸入框被 tick 重繪清掉
  let inlineEditing = false;
  // 搜尋關鍵字（名稱 / 備註 / 頻道）
  let searchTerm = '';
  // 開啟彈窗前的焦點元素，關閉後歸還焦點（無障礙）
  let lastFocused = null;

  /* ---------------- DOM 參照 ---------------- */
  const $ = (sel) => document.querySelector(sel);
  const grid = $('#records-grid');
  const emptyState = $('#empty-state');
  const noResults = $('#no-results');
  const summary = $('#summary');
  const searchInput = $('#search-input');
  const liveRegion = $('#live-region');
  const filterBar = $('#filter-bar');
  const modal = $('#modal');
  const modalTitle = $('#modal-title');
  const formErr = $('#form-error');
  const monsterGrid = $('#monster-grid');
  const symbolGrid = $('#symbol-grid');
  const colorGrid = $('#color-grid');
  const labelInput = $('#label-input');
  const channelInput = $('#channel-input');
  const hoursInput = $('#hours-input');
  const minutesInput = $('#minutes-input');
  const persistToggle = $('#persist-toggle');
  const soundToggle = $('#sound-toggle');

  /* ---------------- 工具 ---------------- */
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  // 只把「要記錄到瀏覽器」的計時器寫入 localStorage；persist === false 者僅存在於本次瀏覽
  const save = () => MapleStorage.saveRecords(records.filter(r => r.persist !== false));

  /* 依目前語言取得一筆紀錄的顯示名稱（怪物用 id 查，跟著語言變） */
  function recordLabel(r) {
    if (r.iconType === 'monster') {
      const mon = MONSTER_BY_ID[r.monsterId];
      return mon ? MapleI18n.monster(mon) : (r.monsterName || '');
    }
    return r.label || r.symbol || '';
  }

  /* ---------------- 篩選種類 ---------------- */
  function buildTypes() {
    const map = new Map();
    records.forEach(r => {
      const key = MapleTimer.typeKey(r);
      if (!map.has(key)) map.set(key, { key, label: recordLabel(r), count: 0 });
      map.get(key).count++;
    });
    return [...map.values()];
  }

  /* 是否符合搜尋關鍵字（比對顯示名稱、備註、頻道） */
  function matchesSearch(r) {
    if (!searchTerm) return true;
    const mon = r.iconType === 'monster' ? MONSTER_BY_ID[r.monsterId] : null;
    const hay = [
      recordLabel(r),
      mon ? `${mon.name} ${mon.nameEn || ''}` : '',   // 中英名都可搜
      r.label || '',
      r.symbol || '',
      'ch' + r.channel,
      String(r.channel),
    ].join(' ').toLowerCase();
    return hay.includes(searchTerm);
  }

  function visibleRecords() {
    return records.filter(r =>
      (activeFilter === 'all' || MapleTimer.typeKey(r) === activeFilter) &&
      matchesSearch(r));
  }

  /* ---------------- 渲染 ---------------- */
  function render() {
    const now = Date.now();
    const types = buildTypes();

    // 篩選鍵若已不存在則重設
    if (activeFilter !== 'all' && !types.some(t => t.key === activeFilter)) {
      activeFilter = 'all';
    }
    // 只有在種類/數量/選取狀態改變時才重建 chip，避免 tick 期間重建打斷點擊
    const filterSig = types.map(t => `${t.key}:${t.count}`).join('|') + '#' + activeFilter;
    if (filterSig !== lastFilterSig) {
      lastFilterSig = filterSig;
      MapleRender.renderFilters(filterBar, types, activeFilter, (key) => {
        activeFilter = key;
        lastSignature = null;   // 強制重建卡片
        render();
      });
      updateFilterOverflow();   // 標籤重建後重新判斷是否溢出
    }

    const sorted = MapleTimer.sortRecords(visibleRecords(), now);
    const states = sorted.map(r => MapleTimer.computeState(r, now));

    // 摘要：以全部紀錄計數（不受篩選 / 搜尋影響）
    updateSummary(now);

    // 空狀態 / 無搜尋結果
    emptyState.classList.toggle('hidden', records.length > 0);
    if (noResults) {
      noResults.classList.toggle('hidden', !(records.length > 0 && sorted.length === 0));
    }

    // 用「順序 + 可重生狀態」當簽章，結構有變才整批重建
    const signature = sorted.map((r, i) => r.id + (states[i].ready ? 'R' : 'C')).join('|');
    if (signature !== lastSignature && !inlineEditing) {
      lastSignature = signature;
      grid.innerHTML = '';
      const handlers = { onKill, onCopy, onEdit, onDelete, stepChannel, beginChannelEdit, endChannelEdit };
      let newCount = 0;
      sorted.forEach((r, i) => {
        const isNew = !prevIds.has(r.id);
        const card = MapleRender.buildCard(r, states[i], handlers);
        if (isNew) {
          card.classList.add('card-enter');
          // 多張同時進場時做輕微錯落，最多疊到 6 張避免拖太久
          card.style.animationDelay = Math.min(newCount++, 6) * 45 + 'ms';
        }
        grid.appendChild(card);
      });
      prevIds = new Set(sorted.map(r => r.id));
    } else {
      sorted.forEach((r, i) => {
        const card = grid.querySelector(`[data-id="${r.id}"]`);
        if (card) MapleRender.updateCard(card, r, states[i]);
      });
    }
  }

  /* 工具列摘要：總數與可重生數 */
  function updateSummary(now) {
    if (!summary) return;
    const total = records.length;
    const ready = records.reduce(
      (n, r) => n + (MapleTimer.computeState(r, now).ready ? 1 : 0), 0);
    if (total === 0) {
      summary.textContent = '';
      summary.classList.add('hidden');
      return;
    }
    summary.classList.remove('hidden');
    summary.innerHTML =
      `<span class="summary-total">${MapleI18n.t('summary.timers', { n: total })}</span>` +
      (ready > 0 ? ` · <span class="summary-ready">${MapleI18n.t('summary.respawned', { n: ready })}</span>` : '');
  }

  /* ---------------- tick 迴圈 ---------------- */
  function tick() {
    const now = Date.now();

    // 偵測「本輪剛變成可重生」的紀錄 → 播提示音 + 螢幕報讀
    let justReady = false;
    const readyNames = [];
    records.forEach(r => {
      const ready = MapleTimer.computeState(r, now).ready;
      if (ready && !alertedIds.has(r.id)) {
        alertedIds.add(r.id);
        justReady = true;
        readyNames.push(`${recordLabel(r)} CH${r.channel}`);
      }
      if (!ready) alertedIds.delete(r.id);
    });
    if (justReady) {
      if (prefs.soundOn) MapleSound.chime();
      const sep = MapleI18n.lang === 'en' ? ', ' : '、';
      announce(MapleI18n.t('announce.respawned', { names: readyNames.join(sep) }));
    }

    render();
  }

  /* 螢幕報讀：更新 aria-live 區域（視覺隱藏） */
  function announce(text) {
    if (liveRegion) liveRegion.textContent = text;
  }

  /* 篩選列是否溢出（標籤超過視窗寬）：切換淡出提示 + hover tooltip */
  function updateFilterOverflow() {
    if (!filterBar) return;
    const overflow = filterBar.scrollWidth - filterBar.clientWidth > 2;
    filterBar.classList.toggle('is-overflow', overflow);
    if (overflow) {
      filterBar.title = MapleI18n.t('filter.scrollHint');
    } else {
      filterBar.removeAttribute('title');
    }
  }

  /* 切換語言後：重繪需要用到字串的動態內容 */
  function onLangChange() {
    updateSoundToggle();
    if (window.MapleTheme && MapleTheme.refreshLabels) MapleTheme.refreshLabels();
    if (modal.classList.contains('open')) {
      modalTitle.textContent = MapleI18n.t(editingId ? 'modal.edit' : 'modal.add');
    }
    lastFilterSig = null;   // 篩選 chip（含「全部」與種類名）以新語言重建
    lastSignature = null;   // 卡片以新語言重建
    render();
  }

  /* ---------------- 卡片操作 ---------------- */
  function onKill(id) {
    const r = records.find(x => x.id === id);
    if (!r) return;
    r.startTime = Date.now();   // 以現在時間重新倒數
    alertedIds.delete(id);
    save();
    lastSignature = null;
    render();
  }

  function onDelete(id) {
    const index = records.findIndex(x => x.id === id);
    if (index < 0) return;
    const removed = records[index];
    const who = `${recordLabel(removed)} CH${removed.channel}`;

    // 先刪除（樂觀更新），再提供「復原」，取代原生 confirm
    records.splice(index, 1);
    alertedIds.delete(id);
    save();
    lastSignature = null;
    render();

    MapleToast.show(MapleI18n.t('toast.deleted', { who }), {
      icon: MapleIcons.markup('trash', { size: 18 }),
      actionLabel: MapleI18n.t('toast.undo'),
      onAction: () => {
        // 放回原本的位置
        records.splice(Math.min(index, records.length), 0, removed);
        save();
        lastSignature = null;
        render();
        announce(MapleI18n.t('announce.restored', { who }));
      },
    });
  }

  function onCopy(id) {
    const src = records.find(x => x.id === id);
    if (!src) return;
    // 複製一張新卡：以「同種類目前最大的頻道號碼 + 1」為新頻道（非母體 +1）
    const key = MapleTimer.typeKey(src);
    const maxCh = records.reduce((mx, r) =>
      (MapleTimer.typeKey(r) === key && Number.isFinite(r.channel)) ? Math.max(mx, r.channel) : mx,
      0);
    const copy = {
      ...src,
      id: uid(),
      channel: Number.isFinite(src.channel) ? maxCh + 1 : src.channel,
      startTime: Date.now(),
    };
    const idx = records.findIndex(x => x.id === id);
    records.splice(idx + 1, 0, copy);   // 插在原卡片後面
    alertedIds.delete(copy.id);
    save();
    lastSignature = null;
    render();

    MapleToast.show(MapleI18n.t('toast.copied', { who: `${recordLabel(copy)} CH${copy.channel}` }), {
      icon: MapleIcons.markup('copy', { size: 18 }),
      actionLabel: MapleI18n.t('toast.undo'),
      onAction: () => {
        records = records.filter(x => x.id !== copy.id);
        alertedIds.delete(copy.id);
        save();
        lastSignature = null;
        render();
        announce(MapleI18n.t('announce.copyUndone'));
      },
    });
  }

  function onEdit(id) {
    const r = records.find(x => x.id === id);
    if (!r) return;
    editingId = id;
    openModal(r);
  }

  /* 上下鍵 ±1：就地更新頻道並存檔，回傳新頻道（不觸發整批重建，保留焦點）*/
  function stepChannel(id, delta) {
    const r = records.find(x => x.id === id);
    if (!r || !Number.isFinite(r.channel)) return null;
    const next = Math.max(1, r.channel + delta);
    if (next !== r.channel) {
      r.channel = next;
      save();
    }
    return next;
  }

  /* 卡片頻道就地編輯 */
  function beginChannelEdit() {
    inlineEditing = true;
  }
  function endChannelEdit(id, value) {
    inlineEditing = false;
    if (value != null) {
      const r = records.find(x => x.id === id);
      if (r && r.channel !== value) {
        r.channel = value;
        save();
      }
    }
    lastSignature = null;   // 重建卡片（還原/套用新頻道）
    render();
  }

  /* ---------------- 表單：模式與選取 ---------------- */
  function setMode(mode) {
    form.mode = mode;
    document.querySelectorAll('.mode-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.mode === mode));
    $('#mode-monster').classList.toggle('hidden', mode !== 'monster');
    $('#mode-custom').classList.toggle('hidden', mode !== 'custom');
  }

  /* 選取怪物時帶入其預設重生間隔（僅新增時；編輯保留原本設定） */
  function applyMonsterDefault(id) {
    if (editingId) return;
    const mon = MONSTER_BY_ID[id];
    if (!mon) return;
    if (mon.defaultH != null) hoursInput.value = mon.defaultH;
    if (mon.defaultM != null) minutesInput.value = mon.defaultM;
  }

  function highlightMonster() {
    monsterGrid.querySelectorAll('.pick-monster').forEach(c =>
      c.classList.toggle('active', c.dataset.id === form.monsterId));
  }
  function highlightSymbol() {
    symbolGrid.querySelectorAll('.pick-symbol').forEach(c =>
      c.classList.toggle('active', c.dataset.symbol === form.symbol));
  }
  function highlightColor() {
    colorGrid.querySelectorAll('.pick-color').forEach(c =>
      c.classList.toggle('active', c.dataset.color === form.color));
  }

  /* ---------------- 表單：開關 ---------------- */
  function openModal(record) {
    formErr.textContent = '';
    if (record) {
      modalTitle.textContent = MapleI18n.t('modal.edit');
      setMode(record.iconType);
      form.monsterId = record.iconType === 'monster' ? record.monsterId : null;
      form.symbol = record.iconType === 'custom' ? record.symbol : null;
      form.color = record.iconType === 'custom' ? record.color : null;
      labelInput.value = record.label || '';
      channelInput.value = record.channel;
      hoursInput.value = record.intervalH || 0;
      minutesInput.value = record.intervalM || 0;
      if (persistToggle) persistToggle.checked = record.persist !== false;
    } else {
      modalTitle.textContent = MapleI18n.t('modal.add');
      editingId = null;
      setMode('monster');
      form.monsterId = null;
      form.symbol = null;
      form.color = null;
      labelInput.value = '';
      channelInput.value = '';
      hoursInput.value = '';
      minutesInput.value = '';
      if (persistToggle) persistToggle.checked = prefs.persistNew !== false;
    }
    highlightMonster();
    highlightSymbol();
    highlightColor();
    lastFocused = document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    // 將焦點移進彈窗（第一個模式分頁），方便鍵盤操作
    const first = modal.querySelector('.mode-tab');
    if (first) requestAnimationFrame(() => first.focus());
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    editingId = null;
    // 焦點歸還給開啟彈窗的按鈕
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    lastFocused = null;
  }

  /* 彈窗內的 Tab 焦點循環（focus trap） */
  function trapFocus(e) {
    if (e.key !== 'Tab' || !modal.classList.contains('open')) return;
    const focusable = modal.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])');
    const visible = [...focusable].filter(el => el.offsetParent !== null);
    if (visible.length === 0) return;
    const firstEl = visible[0];
    const lastEl = visible[visible.length - 1];
    if (e.shiftKey && document.activeElement === firstEl) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault();
      firstEl.focus();
    }
  }

  /* ---------------- 表單：送出 ---------------- */
  function submitForm() {
    formErr.textContent = '';

    // 圖示驗證
    let iconFields;
    if (form.mode === 'monster') {
      if (!form.monsterId) return (formErr.textContent = MapleI18n.t('err.monster'));
      const mon = MONSTER_BY_ID[form.monsterId];
      iconFields = { iconType: 'monster', monsterId: mon.id, monsterName: mon.name,
                     symbol: null, color: null };
    } else {
      if (!form.symbol) return (formErr.textContent = MapleI18n.t('err.symbol'));
      if (!form.color) return (formErr.textContent = MapleI18n.t('err.color'));
      iconFields = { iconType: 'custom', monsterId: null, monsterName: null,
                     symbol: form.symbol, color: form.color };
    }

    // 頻道驗證
    const channel = parseInt(channelInput.value, 10);
    if (!Number.isFinite(channel) || channel <= 0) {
      return (formErr.textContent = MapleI18n.t('err.channel'));
    }

    // 間隔驗證（需 > 0）
    const h = parseInt(hoursInput.value, 10) || 0;
    const m = parseInt(minutesInput.value, 10) || 0;
    const intervalMs = (h * 60 + m) * 60 * 1000;
    if (intervalMs <= 0) {
      return (formErr.textContent = MapleI18n.t('err.interval'));
    }

    const label = labelInput.value.trim();
    const persist = persistToggle ? persistToggle.checked : true;

    if (editingId) {
      const r = records.find(x => x.id === editingId);
      if (r) {
        Object.assign(r, iconFields, {
          label, channel, intervalH: h, intervalM: m, intervalMs, persist,
        });
        // 間隔改動後重新以現在時間起算，避免出現負到爆的狀況
        r.startTime = Date.now();
        alertedIds.delete(r.id);
      }
    } else {
      records.push({
        id: uid(),
        ...iconFields,
        label, channel, intervalH: h, intervalM: m, intervalMs,
        persist,                 // 是否記錄到此瀏覽器
        startTime: Date.now(),   // 建立當下立即開始倒數
      });
    }

    // 記住這次的選擇，作為下次新增的預設
    prefs.persistNew = persist;
    MapleStorage.savePrefs(prefs);

    save();
    closeModal();
    lastSignature = null;
    render();
  }

  /* ---------------- 清除全部 ---------------- */
  function clearAll() {
    if (records.length === 0) return;
    const backup = records;               // 保留參照供復原
    const count = backup.length;

    records = [];
    alertedIds.clear();
    save();
    lastSignature = null;
    render();

    MapleToast.show(MapleI18n.t('toast.cleared', { n: count }), {
      icon: MapleIcons.markup('trash', { size: 18 }),
      actionLabel: MapleI18n.t('toast.undo'),
      duration: 7000,                      // 破壞性較大，給久一點
      onAction: () => {
        records = backup;
        save();
        lastSignature = null;
        render();
        announce(MapleI18n.t('announce.clearRestored', { n: count }));
      },
    });
  }

  /* ---------------- 音效開關 ---------------- */
  function updateSoundToggle() {
    soundToggle.classList.toggle('off', !prefs.soundOn);
    soundToggle.innerHTML = MapleIcons.markup(prefs.soundOn ? 'bell' : 'bell-off', { size: 18 });
    soundToggle.title = MapleI18n.t(prefs.soundOn ? 'sound.on' : 'sound.off');
    soundToggle.setAttribute('aria-label', soundToggle.title);
  }

  /* ---------------- 初始化 ---------------- */
  function init() {
    // LOGO：套用參數化的寵物動畫圖（換 ID 只需改 config 的 LOGO_PET_ID）
    const logoImg = $('#logo-img');
    if (logoImg && MapleConfig.LOGO_IMAGE) logoImg.src = MapleConfig.LOGO_IMAGE;

    // 主題切換時重繪卡片（讓進度條配色跟著主題的色盤變）
    if (window.MapleTheme) {
      MapleTheme.themeChanged = () => { lastSignature = null; render(); };
    }

    // 語言（會套用靜態 DOM 翻譯，並在切換時重繪動態內容）
    MapleI18n.init(onLangChange);

    // 建立表單選格
    MapleRender.buildMonsterGrid(monsterGrid, (id) => {
      form.monsterId = id;
      highlightMonster();
      applyMonsterDefault(id);
    });
    MapleRender.buildSymbolGrid(symbolGrid, (s) => { form.symbol = s; highlightSymbol(); });
    MapleRender.buildColorGrid(colorGrid, (c) => { form.color = c; highlightColor(); });

    // 模式切換
    document.querySelectorAll('.mode-tab').forEach(tab =>
      tab.addEventListener('click', () => setMode(tab.dataset.mode)));

    // 按鈕
    $('#add-btn').addEventListener('click', () => { editingId = null; openModal(null); });
    $('#clear-btn').addEventListener('click', clearAll);
    $('#cancel-btn').addEventListener('click', closeModal);
    $('#submit-btn').addEventListener('click', submitForm);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
      trapFocus(e);
    });

    // 篩選標籤列：滑鼠滾輪 → 左右捲動；視窗縮放時重新判斷溢出
    if (filterBar) {
      filterBar.addEventListener('wheel', (e) => {
        if (filterBar.scrollWidth - filterBar.clientWidth <= 2) return;  // 沒溢出不攔截
        // 垂直滾輪也能左右捲；已是水平滾動則保留
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (delta !== 0) {
          filterBar.scrollLeft += delta;
          e.preventDefault();
        }
      }, { passive: false });
      window.addEventListener('resize', updateFilterOverflow);
    }


    // 搜尋（即時篩選）
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        searchTerm = searchInput.value.trim().toLowerCase();
        lastSignature = null;   // 結果集改變 → 強制重建
        render();
      });
    }

    // 音效開關 + 首次互動解鎖 AudioContext
    updateSoundToggle();
    soundToggle.addEventListener('click', () => {
      prefs.soundOn = !prefs.soundOn;
      MapleStorage.savePrefs(prefs);
      updateSoundToggle();
      if (prefs.soundOn) { MapleSound.unlock(); MapleSound.chime(); }
    });
    document.addEventListener('click', () => MapleSound.unlock(), { once: true });

    render();
    setInterval(tick, 500);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
