// Every tuning number, recipe and colour in one place. The kitchen is a
// fixed 1280x720 logical area; the renderer scales it to the window, so no
// rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** How long one shift lasts, in seconds. */
export const SHIFT_SECONDS = 150;

/** Strikes (expired orders) that end the shift in failure. */
export const MAX_STRIKES = 3;

/** How many ingredients the tray holds at once. */
export const TRAY_MAX = 5;

/** Seconds an order waits between spawns at level 1, shrinking per level. */
export const ORDER = {
  interval: 13,
  intervalPerLevel: 1,
  minInterval: 8,
  patience: 45,
  patiencePerLevel: 2,
  minPatience: 30,
  maxActive: 4,
};

/** Seconds between level-ups. */
export const LEVEL_SECONDS = 30;

/** Chopping takes this long; cooking this long; a finished dish burns this long after it is done. */
export const PREP = { chopSeconds: 1.4, cookSeconds: 3, burnSeconds: 5 };

/** Extra coins for serving with patience left (scaled by patience remaining). */
export const TIP_MAX = 8;

/** Prep a raw ingredient still needs: none, chop, cook, or chop then cook. */
export const NEED_NONE = 0;
export const NEED_CHOP = 1;
export const NEED_COOK = 2;
export const NEED_CHOP_COOK = 3;

/** Ingredient ids, in station order. */
export const ING = {
  RICE: 'rice',
  EGG: 'egg',
  NOODLE: 'noodle',
  CHICKEN: 'chicken',
  CHILI: 'chili',
  GREENS: 'greens',
  PEANUT: 'peanut',
};

/** The seven counter stations: id, Indonesian name, short label, what it needs, key. */
export const STATIONS = [
  { id: ING.RICE, name: 'Nasi', tag: 'SIAP', need: NEED_NONE, key: '1' },
  { id: ING.EGG, name: 'Telur', tag: 'MASAK', need: NEED_COOK, key: '2' },
  { id: ING.NOODLE, name: 'Mie', tag: 'MASAK', need: NEED_COOK, key: '3' },
  { id: ING.CHICKEN, name: 'Ayam', tag: 'POTONG+MASAK', need: NEED_CHOP_COOK, key: '4' },
  { id: ING.CHILI, name: 'Cabai', tag: 'POTONG', need: NEED_CHOP, key: '5' },
  { id: ING.GREENS, name: 'Sayur', tag: 'POTONG', need: NEED_CHOP, key: '6' },
  { id: ING.PEANUT, name: 'Kacang', tag: 'SIAP', need: NEED_NONE, key: '7' },
];

/** The three dishes: id, name, ingredients in plate order, base coins. */
export const RECIPES = [
  { id: 'nasi-goreng', name: 'Nasi Goreng', ingredients: [ING.RICE, ING.EGG, ING.CHILI], base: 10 },
  { id: 'mie-ayam', name: 'Mie Ayam', ingredients: [ING.NOODLE, ING.CHICKEN, ING.GREENS], base: 14 },
  { id: 'sate-ayam', name: 'Sate Ayam', ingredients: [ING.CHICKEN, ING.PEANUT, ING.CHILI], base: 18 },
];

/** Short Indonesian names for the tray and ticket chips. */
export const ING_NAME = {
  [ING.RICE]: 'Nasi',
  [ING.EGG]: 'Telur',
  [ING.NOODLE]: 'Mie',
  [ING.CHICKEN]: 'Ayam',
  [ING.CHILI]: 'Cabai',
  [ING.GREENS]: 'Sayur',
  [ING.PEANUT]: 'Kacang',
};

/** Layout rectangles, in field coordinates. */
export const LAYOUT = {
  hud: { x: 0, y: 0, width: 1280, height: 56 },
  board: { x: 16, y: 72, width: 280, height: 468 },
  stations: { x: 320, y: 72, width: 944, height: 118 },
  chopping: { x: 320, y: 210, width: 280, height: 190 },
  stove: { x: 640, y: 210, width: 300, height: 190 },
  plate: { x: 980, y: 210, width: 284, height: 190 },
  tray: { x: 320, y: 420, width: 540, height: 180 },
  serve: { x: 900, y: 420, width: 364, height: 180 },
  help: { x: 16, y: 620, width: 1248, height: 84 },
};

export const PALETTE = {
  backdrop: '#3a2a1c',
  wall: '#f7e8c9',
  floor: '#e0aa6e',
  floorTile: '#d1965a',
  counter: '#8a5a33',
  counterTop: '#a9713f',
  board: '#fff6df',
  ticket: '#ffefd0',
  ticketSelected: '#ffe9a8',
  station: '#fdf3d8',
  tray: '#f3e2b8',
  plate: '#ffffff',
  text: '#2b1d10',
  muted: '#7a5c3e',
  gold: '#e8a020',
  green: '#2e9e4f',
  red: '#c0392b',
  chili: '#d43d2a',
  egg: '#f6c945',
  panel: '#fffaf0',
  shadow: 'rgba(0,0,0,0.25)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'dapur-kilat.best';
