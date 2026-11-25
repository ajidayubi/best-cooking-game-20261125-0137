// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x720 kitchen is scaled to fit the window and centred, the margin
// filled with the backdrop colour. Flat colours and simple iconic shapes on
// a canvas — no image assets, no network.
//
// This module also owns hit-testing: clickTarget maps a field point to the
// player action that spot means (station, ticket, tray item, burner, serve).

import {
  FIELD,
  FONT,
  ING,
  ING_NAME,
  LAYOUT,
  MAX_STRIKES,
  PALETTE,
  PREP,
  RECIPES,
  STATIONS,
  TRAY_MAX,
} from './config.js';
import { itemReady, needOf } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const TICKET_H = 100;
const TICKET_GAP = 8;

function stationRect(index) {
  const area = LAYOUT.stations;
  const width = (area.width - (STATIONS.length - 1) * 8) / STATIONS.length;
  return { x: area.x + index * (width + 8), y: area.y, width, height: area.height };
}

function ticketRect(index) {
  return {
    x: LAYOUT.board.x + 8,
    y: LAYOUT.board.y + 44 + index * (TICKET_H + TICKET_GAP),
    width: LAYOUT.board.width - 16,
    height: TICKET_H,
  };
}

function trayRect(index) {
  const area = LAYOUT.tray;
  const width = (area.width - 16 - (TRAY_MAX - 1) * 8) / TRAY_MAX;
  return { x: area.x + 8 + index * (width + 8), y: area.y + 46, width, height: 116 };
}

function burnerRect(index) {
  const area = LAYOUT.stove;
  const width = (area.width - 24) / 2;
  return { x: area.x + 8 + index * (width + 8), y: area.y + 52, width, height: 118 };
}

function inside(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

/** Map a field point to the player action it means, or null. */
export function clickTarget(state, x, y) {
  for (let index = 0; index < STATIONS.length; index += 1) {
    if (inside(stationRect(index), x, y)) return { type: 'pick', station: STATIONS[index].id };
  }
  for (let index = 0; index < state.orders.length; index += 1) {
    if (inside(ticketRect(index), x, y)) return { type: 'ticket', orderId: state.orders[index].id };
  }
  for (let index = 0; index < state.tray.length; index += 1) {
    if (inside(trayRect(index), x, y)) return { type: 'useTray', uid: state.tray[index].uid };
  }
  for (let index = 0; index < state.burners.length; index += 1) {
    if (inside(burnerRect(index), x, y)) return { type: 'burner', index };
  }
  if (inside(LAYOUT.plate, x, y)) {
    const order = state.orders.find((o) => o.id === state.selectedId);
    if (order !== null && order !== undefined) {
      const ready = state.tray.find((item) => itemReady(item));
      if (ready) return { type: 'useTray', uid: ready.uid };
    }
    return null;
  }
  if (inside(LAYOUT.chopping, x, y)) {
    const item = state.tray.find((t) => needOf(t.ing) & 1 && !t.chopped);
    if (item) return { type: 'useTray', uid: item.uid };
    return null;
  }
  if (inside(LAYOUT.stove, x, y)) {
    const item = state.tray.find((t) => needOf(t.ing) & 2 && !t.cooked);
    if (item) return { type: 'useTray', uid: item.uid };
    return null;
  }
  if (inside(LAYOUT.serve, x, y)) return { type: 'serve' };
  return null;
}

/** One small iconic drawing per ingredient, centred at (x, y) in size s. */
export function drawIngredient(context, ing, x, y, s) {
  context.save();
  context.translate(x, y);
  const u = s / 2;
  if (ing === ING.RICE) {
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(0, u * 0.25, u * 0.85, 0, Math.PI);
    context.fill();
    context.fillStyle = '#e8e2d2';
    context.beginPath();
    context.arc(0, -u * 0.1, u * 0.55, Math.PI, 0);
    context.fill();
    context.fillStyle = '#b8452e';
    context.fillRect(-u * 0.85, u * 0.2, u * 1.7, u * 0.28);
  } else if (ing === ING.EGG) {
    context.fillStyle = '#fff8e0';
    context.beginPath();
    context.ellipse(0, 0, u * 0.95, u * 0.7, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#f6c945';
    context.beginPath();
    context.arc(u * 0.15, 0, u * 0.42, 0, Math.PI * 2);
    context.fill();
  } else if (ing === ING.NOODLE) {
    context.fillStyle = '#2e6db4';
    context.beginPath();
    context.arc(0, u * 0.25, u * 0.85, 0, Math.PI);
    context.fill();
    context.strokeStyle = '#f2c14e';
    context.lineWidth = u * 0.18;
    context.lineCap = 'round';
    for (let line = -1; line <= 1; line += 1) {
      context.beginPath();
      context.moveTo(-u * 0.6, -u * 0.15 + line * u * 0.3);
      context.quadraticCurveTo(0, -u * 0.4 + line * u * 0.3, u * 0.6, -u * 0.15 + line * u * 0.3);
      context.stroke();
    }
  } else if (ing === ING.CHICKEN) {
    context.fillStyle = '#c47a3d';
    context.beginPath();
    context.ellipse(-u * 0.1, u * 0.05, u * 0.7, u * 0.5, -0.4, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#f5ead6';
    context.lineWidth = u * 0.16;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(u * 0.45, -u * 0.35);
    context.lineTo(u * 0.85, -u * 0.75);
    context.stroke();
    context.fillStyle = '#f5ead6';
    context.beginPath();
    context.arc(u * 0.9, -u * 0.8, u * 0.16, 0, Math.PI * 2);
    context.arc(u * 0.72, -u * 0.92, u * 0.16, 0, Math.PI * 2);
    context.fill();
  } else if (ing === ING.CHILI) {
    context.strokeStyle = '#d43d2a';
    context.lineWidth = u * 0.42;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(-u * 0.7, -u * 0.5);
    context.quadraticCurveTo(0, u * 0.9, u * 0.75, -u * 0.45);
    context.stroke();
    context.strokeStyle = '#2e9e4f';
    context.lineWidth = u * 0.18;
    context.beginPath();
    context.moveTo(-u * 0.7, -u * 0.5);
    context.lineTo(-u * 0.85, -u * 0.8);
    context.stroke();
  } else if (ing === ING.GREENS) {
    context.fillStyle = '#3f9e4d';
    for (let leaf = -1; leaf <= 1; leaf += 1) {
      context.beginPath();
      context.ellipse(leaf * u * 0.5, leaf * u * 0.15, u * 0.32, u * 0.62, leaf * 0.5, 0, Math.PI * 2);
      context.fill();
    }
    context.strokeStyle = '#2b7a37';
    context.lineWidth = u * 0.08;
    context.beginPath();
    context.moveTo(0, u * 0.7);
    context.lineTo(0, -u * 0.7);
    context.stroke();
  } else if (ing === ING.PEANUT) {
    context.fillStyle = '#8a5a33';
    context.beginPath();
    context.arc(0, u * 0.25, u * 0.85, 0, Math.PI);
    context.fill();
    context.fillStyle = '#c98d4b';
    context.beginPath();
    context.arc(0, -u * 0.05, u * 0.6, Math.PI, 0);
    context.fill();
    context.fillStyle = '#7a4a22';
    context.beginPath();
    context.arc(-u * 0.25, -u * 0.15, u * 0.12, 0, Math.PI * 2);
    context.arc(u * 0.2, -u * 0.25, u * 0.12, 0, Math.PI * 2);
    context.arc(u * 0.05, u * 0.05, u * 0.12, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align = 'left', bold = false) {
    const key = `${size}:${bold ? 1 : 0}`;
    if (!fonts.has(key)) fonts.set(key, `${bold ? '700 ' : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function box(rect, fill, stroke = null, radius = 10) {
    context.fillStyle = fill;
    context.beginPath();
    context.roundRect(rect.x, rect.y, rect.width, rect.height, radius);
    context.fill();
    if (stroke !== null) {
      context.strokeStyle = stroke;
      context.lineWidth = 2;
      context.stroke();
    }
  }

  function progressBar(x, y, width, height, ratio, color) {
    context.fillStyle = 'rgba(0,0,0,0.18)';
    context.fillRect(x, y, width, height);
    context.fillStyle = color;
    context.fillRect(x, y, Math.max(0, Math.min(1, ratio)) * width, height);
  }

  function formatTime(seconds) {
    const total = Math.max(0, Math.ceil(seconds));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  function drawWallAndFloor() {
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, 0, FIELD.width, 400);
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, 400, FIELD.width, 320);
    context.fillStyle = PALETTE.floorTile;
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        if ((row + col) % 2 === 0) {
          context.fillRect(col * 160 + (row % 2) * 80, 400 + row * 80, 80, 80);
        }
      }
    }
    // A warm tiled backsplash and two hanging lamps over the counter.
    context.fillStyle = '#c96f4a';
    context.fillRect(0, 196, FIELD.width, 10);
    context.fillStyle = '#f6c945';
    context.beginPath();
    context.arc(420, 30, 16, 0, Math.PI * 2);
    context.arc(860, 30, 16, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(246,201,69,0.25)';
    context.beginPath();
    context.moveTo(400, 46);
    context.lineTo(440, 46);
    context.lineTo(470, 200);
    context.lineTo(370, 200);
    context.closePath();
    context.fill();
    context.beginPath();
    context.moveTo(840, 46);
    context.lineTo(880, 46);
    context.lineTo(910, 200);
    context.lineTo(810, 200);
    context.closePath();
    context.fill();
  }

  function drawHud(state) {
    box(LAYOUT.hud, '#5a3a22', null, 0);
    text(`KOIN  ${state.coins}`, 24, 37, 26, '#ffe9a8', 'left', true);
    const timerX = FIELD.width / 2 - 110;
    text('SHIFT', timerX, 24, 15, '#d9b48a', 'left', true);
    progressBar(timerX, 30, 220, 12, state.shiftLeft / 150, state.shiftLeft < 30 ? '#e74c3c' : '#2e9e4f');
    text(formatTime(state.shiftLeft), timerX + 232, 42, 24, '#fff6df', 'left', true);
    text(`LV ${state.level}`, FIELD.width - 210, 37, 22, '#fff6df', 'left', true);
    // Strikes: three chillies, lost ones greyed out.
    for (let strike = 0; strike < MAX_STRIKES; strike += 1) {
      context.save();
      if (strike < state.strikes) context.globalAlpha = 0.25;
      drawIngredient(context, ING.CHILI, FIELD.width - 130 + strike * 36, 28, 26);
      context.restore();
    }
  }

  function drawBoard(state) {
    box(LAYOUT.board, PALETTE.board, '#c9a86a', 12);
    text('PESANAN', LAYOUT.board.x + 14, LAYOUT.board.y + 30, 20, PALETTE.text, 'left', true);
    text(`${state.orders.length}/4`, LAYOUT.board.x + LAYOUT.board.width - 14, LAYOUT.board.y + 30, 18, PALETTE.muted, 'right', true);
    if (state.orders.length === 0) {
      text('Belum ada pesanan…', LAYOUT.board.x + 14, LAYOUT.board.y + 80, 18, PALETTE.muted);
      return;
    }
    state.orders.forEach((order, index) => {
      const rect = ticketRect(index);
      const recipe = RECIPES.find((r) => r.id === order.recipe);
      const selected = order.id === state.selectedId;
      box(rect, selected ? PALETTE.ticketSelected : PALETTE.ticket, selected ? PALETTE.gold : '#d9c193', 8);
      text(order.name, rect.x + 10, rect.y + 26, 19, PALETTE.text, 'left', true);
      text(`$${recipe.base}`, rect.x + rect.width - 10, rect.y + 26, 17, PALETTE.gold, 'right', true);
      // Ingredient chips: filled green once placed on the plate.
      recipe.ingredients.forEach((ing, slot) => {
        const cx = rect.x + 22 + slot * 62;
        const cy = rect.y + 52;
        context.fillStyle = order.placed[slot] ? '#2e9e4f' : '#e8dcc2';
        context.beginPath();
        context.arc(cx, cy, 20, 0, Math.PI * 2);
        context.fill();
        drawIngredient(context, ing, cx, cy, 26);
        if (order.placed[slot]) {
          context.strokeStyle = '#ffffff';
          context.lineWidth = 3;
          context.beginPath();
          context.moveTo(cx - 7, cy);
          context.lineTo(cx - 1, cy + 6);
          context.lineTo(cx + 8, cy - 6);
          context.stroke();
        }
        text(ING_NAME[ing], cx, cy + 32, 12, PALETTE.muted, 'center');
      });
      const ratio = Math.max(0, order.patience / order.patienceMax);
      const barColor = ratio > 0.5 ? '#2e9e4f' : ratio > 0.25 ? '#e8a020' : '#c0392b';
      progressBar(rect.x + 10, rect.y + rect.height - 12, rect.width - 20, 7, ratio, barColor);
    });
  }

  function drawStations() {
    STATIONS.forEach((station, index) => {
      const rect = stationRect(index);
      box(rect, PALETTE.station, '#c9a86a', 10);
      drawIngredient(context, station.id, rect.x + rect.width / 2, rect.y + 40, 52);
      text(station.name, rect.x + rect.width / 2, rect.y + 82, 17, PALETTE.text, 'center', true);
      text(station.tag, rect.x + rect.width / 2, rect.y + 102, 12, PALETTE.muted, 'center');
      context.fillStyle = '#5a3a22';
      context.beginPath();
      context.arc(rect.x + rect.width - 16, rect.y + 16, 11, 0, Math.PI * 2);
      context.fill();
      text(station.key, rect.x + rect.width - 16, rect.y + 20, 13, '#ffe9a8', 'center', true);
    });
  }

  function drawChopping(state) {
    const rect = LAYOUT.chopping;
    box(rect, '#caa06a', '#8a5a33', 12);
    text('TALENAN', rect.x + 14, rect.y + 28, 18, '#fff6df', 'left', true);
    // The wooden board itself.
    context.fillStyle = '#e8c98f';
    context.beginPath();
    context.roundRect(rect.x + 40, rect.y + 52, rect.width - 80, 96, 12);
    context.fill();
    context.fillStyle = '#d9b878';
    context.beginPath();
    context.arc(rect.x + rect.width - 52, rect.y + 100, 10, 0, Math.PI * 2);
    context.fill();
    if (state.board !== null) {
      drawIngredient(context, state.board.item.ing, rect.x + rect.width / 2, rect.y + 100, 64);
      const ratio = state.board.progress / PREP.chopSeconds;
      progressBar(rect.x + 30, rect.y + 160, rect.width - 60, 10, ratio, '#2e9e4f');
      text('Memotong…', rect.x + rect.width / 2, rect.y + 182, 14, '#fff6df', 'center');
    } else {
      text('Klik bahan yang perlu', rect.x + rect.width / 2, rect.y + 96, 15, '#6b4a26', 'center');
      text('dipotong di nampan', rect.x + rect.width / 2, rect.y + 118, 15, '#6b4a26', 'center');
    }
  }

  function drawStove(state) {
    const rect = LAYOUT.stove;
    box(rect, '#4a4a52', '#2c2c34', 12);
    text('KOMPOR', rect.x + 14, rect.y + 28, 18, '#fff6df', 'left', true);
    state.burners.forEach((burner, index) => {
      const b = burnerRect(index);
      context.fillStyle = '#2c2c34';
      context.beginPath();
      context.ellipse(b.x + b.width / 2, b.y + b.height / 2 + 8, b.width / 2 - 8, 34, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#7a7a88';
      context.lineWidth = 3;
      context.beginPath();
      context.ellipse(b.x + b.width / 2, b.y + b.height / 2 + 8, b.width / 2 - 8, 34, 0, 0, Math.PI * 2);
      context.stroke();
      if (burner === null) {
        text('— kosong —', b.x + b.width / 2, b.y + b.height / 2 + 12, 14, '#8b8b96', 'center');
        return;
      }
      if (burner.burned) {
        context.fillStyle = '#1a1a1a';
        context.beginPath();
        context.arc(b.x + b.width / 2, b.y + b.height / 2, 26, 0, Math.PI * 2);
        context.fill();
        text('GOSONG! Klik untuk buang', b.x + b.width / 2, b.y + b.height - 6, 13, '#ff9a8a', 'center', true);
        return;
      }
      if (!burner.done) {
        // Flames under the pan while it cooks.
        context.fillStyle = '#e8722a';
        context.beginPath();
        context.moveTo(b.x + 24, b.y + b.height - 22);
        context.quadraticCurveTo(b.x + b.width / 2, b.y + b.height - 58, b.x + b.width - 24, b.y + b.height - 22);
        context.closePath();
        context.fill();
        drawIngredient(context, burner.item.ing, b.x + b.width / 2, b.y + b.height / 2, 56);
        const ratio = burner.progress / PREP.cookSeconds;
        progressBar(b.x + 8, b.y + b.height - 12, b.width - 16, 8, ratio, '#e8a020');
      } else {
        drawIngredient(context, burner.item.ing, b.x + b.width / 2, b.y + b.height / 2, 56);
        const left = Math.max(0, PREP.burnSeconds - burner.doneFor);
        text(`MATANG! ${left.toFixed(0)} dtk`, b.x + b.width / 2, b.y + b.height - 4, 14, '#ffe9a8', 'center', true);
      }
    });
  }

  function drawPlate(state) {
    const rect = LAYOUT.plate;
    const order = state.orders.find((o) => o.id === state.selectedId);
    const complete = order !== undefined && order.placed.every(Boolean);
    box(rect, PALETTE.plate, complete ? PALETTE.gold : '#c9a86a', 12);
    if (complete) {
      context.save();
      context.shadowColor = '#e8a020';
      context.shadowBlur = 18;
      context.strokeStyle = PALETTE.gold;
      context.lineWidth = 4;
      context.beginPath();
      context.roundRect(rect.x + 2, rect.y + 2, rect.width - 4, rect.height - 4, 10);
      context.stroke();
      context.restore();
    }
    text('PIRING', rect.x + 14, rect.y + 28, 18, PALETTE.text, 'left', true);
    if (order === undefined) {
      text('Pilih pesanan dulu', rect.x + rect.width / 2, rect.y + 100, 16, PALETTE.muted, 'center');
      return;
    }
    const recipe = RECIPES.find((r) => r.id === order.recipe);
    text(order.name, rect.x + rect.width - 14, rect.y + 28, 16, PALETTE.muted, 'right', true);
    recipe.ingredients.forEach((ing, slot) => {
      const cx = rect.x + 52 + slot * 90;
      const cy = rect.y + 96;
      const filled = order.placed[slot];
      const isNext = !filled && order.placed.slice(0, slot).every(Boolean);
      context.fillStyle = filled ? '#eaf6ec' : '#f3e2b8';
      context.beginPath();
      context.arc(cx, cy, 38, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = isNext ? PALETTE.gold : '#c9a86a';
      context.lineWidth = isNext ? 3 : 2;
      context.setLineDash(isNext ? [6, 4] : []);
      context.beginPath();
      context.arc(cx, cy, 38, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
      if (filled) drawIngredient(context, ing, cx, cy, 52);
      else text(ING_NAME[ing], cx, cy + 4, 13, PALETTE.muted, 'center');
    });
    text(
      complete ? 'SIAP DIANTAR!' : 'Klik bahan siap di nampan',
      rect.x + rect.width / 2,
      rect.y + 172,
      15,
      complete ? PALETTE.green : PALETTE.muted,
      'center',
      complete,
    );
  }

  function drawTray(state) {
    const rect = LAYOUT.tray;
    box(rect, PALETTE.tray, '#c9a86a', 12);
    text('NAMPAN', rect.x + 14, rect.y + 28, 18, PALETTE.text, 'left', true);
    text(`${state.tray.length}/${TRAY_MAX}`, rect.x + rect.width - 14, rect.y + 28, 16, PALETTE.muted, 'right', true);
    for (let index = 0; index < TRAY_MAX; index += 1) {
      const slot = trayRect(index);
      box(slot, '#fffaf0', '#d9c193', 8);
      const item = state.tray[index];
      if (!item) continue;
      drawIngredient(context, item.ing, slot.x + slot.width / 2, slot.y + 44, 56);
      const label = itemReady(item) ? 'siap' : !item.chopped && (needOf(item.ing) & 1) ? 'potong' : 'masak';
      const dot = itemReady(item) ? '#2e9e4f' : '#e8a020';
      context.fillStyle = dot;
      context.beginPath();
      context.arc(slot.x + 12, slot.y + 14, 6, 0, Math.PI * 2);
      context.fill();
      text(`${ING_NAME[item.ing]} · ${label}`, slot.x + slot.width / 2, slot.y + slot.height - 10, 11, PALETTE.text, 'center', true);
    }
  }

  function drawServe(state) {
    const rect = LAYOUT.serve;
    const order = state.orders.find((o) => o.id === state.selectedId);
    const complete = order !== undefined && order.placed.every(Boolean);
    const shakeX = state.shake > 0 ? Math.sin(state.shake * 40) * 6 : 0;
    context.save();
    context.translate(shakeX, 0);
    box(rect, complete ? '#ffe9a8' : '#e8dcc2', complete ? PALETTE.gold : '#c9a86a', 12);
    text('JENDELA ANTAR', rect.x + 14, rect.y + 28, 18, PALETTE.text, 'left', true);
    // The bell on the counter.
    context.fillStyle = '#e8a020';
    context.beginPath();
    context.arc(rect.x + rect.width / 2, rect.y + 96, 34, Math.PI, 0);
    context.fill();
    context.fillRect(rect.x + rect.width / 2 - 38, rect.y + 92, 76, 8);
    context.fillStyle = '#5a3a22';
    context.beginPath();
    context.arc(rect.x + rect.width / 2 + 40, rect.y + 100, 5, 0, Math.PI * 2);
    context.fill();
    text(complete ? 'ANTAR! (Spasi)' : 'Selesaikan piring dulu', rect.x + rect.width / 2, rect.y + 158, 16, complete ? PALETTE.green : PALETTE.muted, 'center', complete);
    context.restore();
  }

  function drawHelp() {
    const rect = LAYOUT.help;
    box(rect, 'rgba(0,0,0,0.30)', null, 12);
    text('Klik stasiun / tekan 1-7: ambil bahan  •  Klik bahan di nampan: potong / masak / susun di piring  •  Klik jendela: antar', rect.x + 16, rect.y + 32, 16, '#fff6df');
    text('P: jeda   •   M: suara   •   Sajikan sebelum kesabaran pelanggan habis — 3 pesanan hangus dan shift berakhir!', rect.x + 16, rect.y + 60, 16, '#ffe9a8');
  }

  function drawMessage(state) {
    if (state.messageFor <= 0 || state.message === '') return;
    context.save();
    context.globalAlpha = Math.min(1, state.messageFor);
    text(state.message, FIELD.width / 2, 600, 24, '#ffffff', 'center', true);
    context.restore();
  }

  function drawPanel(title, lines, prompt) {
    const width = 640;
    const height = 150 + lines.length * 36;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(0,0,0,0.45)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    box({ x, y, width, height }, PALETTE.panel, PALETTE.gold, 16);
    text(title, FIELD.width / 2, y + 72, 46, PALETTE.text, 'center', true);
    lines.forEach((line, index) => {
      text(line, FIELD.width / 2, y + 122 + index * 36, 21, PALETTE.muted, 'center');
    });
    text(prompt, FIELD.width / 2, y + height - 30, 20, PALETTE.gold, 'center', true);
  }

  /** Paint one frame: the kitchen, then the HUD or a panel for the screen. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawWallAndFloor();
    drawHud(state);
    drawBoard(state);
    drawStations();
    drawChopping(state);
    drawStove(state);
    drawPlate(state);
    drawTray(state);
    drawServe(state);
    drawHelp();
    drawMessage(state);
    if (state.flash > 0) {
      context.fillStyle = `rgba(192,57,43,${state.flash * 0.5})`;
      context.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (screen === SCREEN_TITLE) {
      drawPanel(
        'DAPUR KILAT',
        ['Masak cepat, sajikan tepat waktu!', 'Pesan, potong, masak, susun, antar.', `Skor terbaik: ${best}`],
        'Tekan Spasi atau klik untuk mulai',
      );
    } else if (screen === SCREEN_PAUSED) {
      drawPanel('JEDA', ['Pesanannya menunggu…', ''], 'Tekan P untuk lanjut');
    } else if (screen === SCREEN_OVER) {
      if (state.phase === 'complete') {
        drawPanel(
          'SHIFT SELESAI!',
          [`Koin: ${state.coins}   •   Pesanan disajikan: ${state.served}`, `Skor terbaik: ${Math.max(best, state.coins)}`],
          'Tekan Spasi untuk main lagi',
        );
      } else {
        drawPanel(
          'SHIFT GAGAL',
          ['Tiga pesanan hangus — pelanggan pulang kecewa.', `Koin: ${state.coins}   •   Pesanan disajikan: ${state.served}`],
          'Tekan Spasi untuk coba lagi',
        );
      }
    }
  }

  resize();
  window.addEventListener('resize', resize);

  return {
    draw,
    /** Map a point in canvas CSS pixels to field coordinates. */
    toField(clientX, clientY) {
      const ratio = window.devicePixelRatio || 1;
      return {
        x: (clientX * ratio - view.x) / view.scale,
        y: (clientY * ratio - view.y) / view.scale,
      };
    },
  };
}
