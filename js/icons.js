/* ============================================================
 * icons.js — 內嵌 SVG 圖示（取代結構性 emoji）
 * 皆為 Lucide 線條圖示：24×24、stroke=currentColor，
 * 因此會自動跟著文字顏色 / 主題變色，且縮放不失真。
 * 用法：element.innerHTML = MapleIcons.markup('trash', { size: 18 });
 * ============================================================ */

const ICON_PATHS = {
  // Lucide: trash-2
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>' +
         '<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' +
         '<line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
  // Lucide: pencil
  pencil: '<path d="M12 20h9"/>' +
          '<path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  // Lucide: search
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  // Lucide: bell
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>' +
        '<path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  // Lucide: bell-off
  'bell-off': '<path d="M8.7 3A6 6 0 0 1 18 8c0 2.6.5 4.4 1.1 5.7"/>' +
              '<path d="M17 17H3s3-2 3-9a4.7 4.7 0 0 1 .3-1.6"/>' +
              '<path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/><path d="m2 2 20 20"/>',
  // Lucide: sun
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/>' +
       '<path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/>' +
       '<path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/>',
  // Lucide: moon
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  // Lucide: timer
  timer: '<line x1="10" y1="2" x2="14" y2="2"/><line x1="12" y1="14" x2="15" y2="11"/>' +
         '<circle cx="12" cy="14" r="8"/>',
  // Lucide: info
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  // Lucide: rotate-ccw（重置）
  reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  // Lucide: plus（新增）
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  // Lucide: eraser（清除全部）
  eraser: '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/>' +
          '<path d="M22 21H7"/><path d="m5 11 9 9"/>',
  // Lucide: copy（複製）
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>' +
        '<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  // Lucide: leaf（翠綠 / 抹茶）
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>' +
        '<path d="M2 21c0-3 1.85-5.36 5.08-6"/>',
  // Lucide: list（頻道總覽）
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>' +
        '<line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>' +
        '<line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  // Lucide: star（星空）
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  // Lucide: flower（櫻緋）
  flower: '<circle cx="12" cy="12" r="3"/>' +
    '<path d="M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5"/>' +
    '<path d="M12 7.5V9"/><path d="M7.5 12H9"/><path d="M16.5 12H15"/><path d="M12 16.5V15"/>' +
    '<path d="m8 8 1.88 1.88"/><path d="M14.12 9.88 16 8"/><path d="m8 16 1.88-1.88"/><path d="M14.12 14.12 16 16"/>',
  // Lucide: cloud（霧藍）
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  // Lucide: sparkles（薰衣）
  sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>' +
    '<path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
};

const MapleIcons = {
  /* 回傳完整 <svg> 字串；指定給 innerHTML 即可（瀏覽器會以 SVG 命名空間解析） */
  markup(name, opts = {}) {
    const size = opts.size || 20;
    const sw = opts.strokeWidth || 2;
    const cls = 'icon' + (opts.className ? ' ' + opts.className : '');
    const paths = ICON_PATHS[name] || '';
    return `<svg class="${cls}" viewBox="0 0 24 24" width="${size}" height="${size}" ` +
      `fill="none" stroke="currentColor" stroke-width="${sw}" ` +
      `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  },
};

window.MapleIcons = MapleIcons;
