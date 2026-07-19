/* ============================================================
 * config.js — 靜態設定資料
 * 怪物清單、自訂符號、顏色盤都集中在這裡，方便日後擴充。
 * 只要把圖片放進 assets/monsters/ 並在 MONSTERS 加一筆即可。
 * ============================================================ */

/* 怪物圖片改為呼叫 maplestory.io API 動態取得
 * mobId 為該站的怪物編號；換版本 / 地區只要改下面三個常數即可。
 * 若 API 圖載入失敗（img.onerror）會自動退回 fallback 符號徽章。 */
const MAPLE_API = "https://maplestory.io/api";
const MAPLE_REGION = "GMS";
const MAPLE_VERSION = "247";
const mobImage = (mobId) =>
  `${MAPLE_API}/${MAPLE_REGION}/${MAPLE_VERSION}/mob/${mobId}/render/stand/`;

/* LOGO：改用 maplestory.io 寵物動畫（菇菇寶貝）。
 * 未來只要替換 LOGO_PET_ID 即可換成別隻寵物。 */
const LOGO_PET_ID = 5000042; // 菇菇寶貝
const petImage = (petId) =>
  `${MAPLE_API}/${MAPLE_REGION}/${MAPLE_VERSION}/pet/${petId}/render/change/animated/`;
const LOGO_IMAGE = petImage(LOGO_PET_ID);

/* 怪物英文名（英文介面用；key = 下方的 id，多為英文原名） */
const MONSTER_EN = {
  pinkbean: "Pink Bean",
  mano: "Mano",
  stumpy: "Stumpy",
  faust: "Faust",
  shade: "Shade",
  timer: "Timer",
  dyle: "Dyle",
  riche: "Riche",
  eliza: "Eliza",
  snowman: "Snowman",
  chiefkentaurus: "Chief Kentaurus",
  pianus: "Pianus",
  zenomega: "Zeno Omega",
  mushmom: "Mushmom",
  zombiemushmom: "Zombie Mushmom",
  bluemushmom: "Blue Mushmom",
};

/* 怪物清單。defaultH / defaultM 為預設重生間隔（小時 / 分），選取時自動帶入表單。
 * 想新增怪物：到 https://maplestory.io 查該怪物的 mobId，照格式補一筆即可。 */
const MONSTERS = [
  {
    id: "pinkbean",
    name: "皮卡啾",
    mobId: 8820000,
    fallback: "皮",
    defaultH: 99,
    defaultM: 99,
  },
  {
    id: "mano",
    name: "紅寶王",
    mobId: 2220000,
    fallback: "寶",
    defaultH: 0,
    defaultM: 10,
  },
  {
    id: "stumpy",
    name: "樹妖王",
    mobId: 3220000,
    fallback: "樹",
    defaultH: 0,
    defaultM: 10,
  },
  {
    id: "faust",
    name: "殭屍猴王",
    mobId: 5220002,
    fallback: "猴",
    defaultH: 0,
    defaultM: 10,
  },
  {
    id: "shade",
    name: "冥界幽靈",
    mobId: 5090000,
    fallback: "幽",
    defaultH: 0,
    defaultM: 10,
  },
  {
    id: "timer",
    name: "咕咕鐘",
    mobId: 5220003,
    fallback: "咕",
    defaultH: 0,
    defaultM: 10,
  },
  {
    id: "dyle",
    name: "沼澤巨鱷",
    mobId: 6220000,
    fallback: "鱷",
    defaultH: 0,
    defaultM: 10,
  },
  {
    id: "riche",
    name: "厄運死神",
    mobId: 6090000,
    fallback: "死",
    defaultH: 0,
    defaultM: 10,
  },
  {
    id: "eliza",
    name: "艾利傑",
    mobId: 8220000,
    fallback: "艾",
    defaultH: 0,
    defaultM: 10,
  },
  {
    id: "snowman",
    name: "雪毛怪人",
    mobId: 8220001,
    fallback: "雪",
    defaultH: 60,
    defaultM: 0,
  },
  {
    id: "chiefkentaurus",
    name: "半人馬國王",
    mobId: 9300482,
    fallback: "馬",
    defaultH: 0,
    defaultM: 10,
  },
  {
    id: "pianus",
    name: "海怒斯",
    mobId: 8510000,
    fallback: "魚",
    defaultH: 0,
    defaultM: 30,
  },
  {
    id: "zenomega",
    name: "葛雷黑金剛",
    mobId: 9300476,
    fallback: "黑葛",
    defaultH: 0,
    defaultM: 30,
  },
  {
    id: "mushmom",
    name: "菇菇王",
    mobId: 6130101,
    fallback: "菇",
    defaultH: 0,
    defaultM: 30,
  },

  {
    id: "zombiemushmom",
    name: "殭屍菇菇王",
    mobId: 6300005,
    fallback: "殭",
    defaultH: 0,
    defaultM: 30,
  },
  {
    id: "bluemushmom",
    name: "藍菇菇王",
    mobId: 8220007,
    fallback: "藍",
    defaultH: 0,
    defaultM: 30,
  },
].map((m) => ({
  ...m,
  nameEn: MONSTER_EN[m.id] || m.name,
  image: mobImage(m.mobId),
}));

/* 自訂圖示：10 種符號（皆為單色字形，可被顏色染色） */
const SYMBOLS = ["★", "◆", "●", "▲", "♥", "✦", "✚", "☠", "⚡", "✿"];

/* 自訂圖示：8 種顏色（楓之谷風味的暖色為主） */
const COLORS = [
  { id: "red", name: "烈焰紅", nameEn: "Flame Red", hex: "#e8433f" },
  { id: "orange", name: "楓橙", nameEn: "Maple Orange", hex: "#ef7d1a" },
  { id: "gold", name: "寶物金", nameEn: "Treasure Gold", hex: "#f4b21b" },
  { id: "green", name: "草原綠", nameEn: "Meadow Green", hex: "#4caf6d" },
  { id: "teal", name: "湖水青", nameEn: "Lake Teal", hex: "#25b0a6" },
  { id: "blue", name: "天空藍", nameEn: "Sky Blue", hex: "#3a8ef0" },
  { id: "purple", name: "幽夢紫", nameEn: "Dream Purple", hex: "#8a63e0" },
  { id: "pink", name: "櫻花粉", nameEn: "Sakura Pink", hex: "#f06fae" },
];

/* 快速查表 */
const MONSTER_BY_ID = Object.fromEntries(MONSTERS.map((m) => [m.id, m]));
const COLOR_BY_ID = Object.fromEntries(COLORS.map((c) => [c.id, c]));

window.MapleConfig = { MONSTERS, SYMBOLS, COLORS, MONSTER_BY_ID, COLOR_BY_ID, petImage, LOGO_PET_ID, LOGO_IMAGE };
