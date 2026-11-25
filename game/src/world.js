// The game's rules and state, with no drawing and no browser in it:
// orders, the tray, the chopping board, the stove burners, the plate,
// coins, strikes, the shift timer and the level. step() advances one fixed
// step and returns what happened as bit flags, so the caller can react
// without the world knowing about screens or sound.
//
// A tray item carries its ingredient and which prep it has had: chopped and
// cooked. It is ready when every prep its station requires is done. The
// plate belongs to the selected order: its placed slots live on the order,
// so switching tickets shows each order's own half-built dish.

import {
  ING,
  LEVEL_SECONDS,
  MAX_STRIKES,
  NEED_CHOP,
  NEED_CHOP_COOK,
  NEED_COOK,
  ORDER,
  PREP,
  RECIPES,
  SHIFT_SECONDS,
  STATIONS,
  TIP_MAX,
  TRAY_MAX,
} from './config.js';
import { pick } from './random.js';

export const EVENT_PICK = 1;
export const EVENT_CHOP_DONE = 2;
export const EVENT_COOK_DONE = 4;
export const EVENT_BURN = 8;
export const EVENT_SERVE = 16;
export const EVENT_EXPIRE = 32;
export const EVENT_COMPLETE = 64;
export const EVENT_OVER = 128;
export const EVENT_WRONG = 256;

/** What prep an ingredient still needs, from its station row. */
export function needOf(ingredient) {
  const station = STATIONS.find((s) => s.id === ingredient);
  return station ? station.need : 0;
}

/** True once an item has had every prep its ingredient requires. */
export function itemReady(item) {
  const need = needOf(item.ing);
  if (need & NEED_CHOP && !item.chopped) return false;
  if (need & NEED_COOK && !item.cooked) return false;
  return true;
}

export function createWorld(random) {
  const state = {
    phase: 'play',
    elapsed: 0,
    shiftLeft: SHIFT_SECONDS,
    level: 1,
    coins: 0,
    served: 0,
    strikes: 0,
    orders: [],
    selectedId: null,
    tray: [],
    board: null,
    burners: [null, null],
    spawnTimer: ORDER.interval,
    flash: 0,
    shake: 0,
    message: '',
    messageFor: 0,
  };
  let nextOrderId = 1;
  let nextUid = 1;

  function recipeById(id) {
    return RECIPES.find((r) => r.id === id);
  }

  function selectedOrder() {
    return state.orders.find((o) => o.id === state.selectedId) ?? null;
  }

  function spawnOrder() {
    const recipe = pick(random, RECIPES);
    const patience = Math.max(
      ORDER.minPatience,
      ORDER.patience - ORDER.patiencePerLevel * (state.level - 1),
    );
    const order = {
      id: nextOrderId,
      recipe: recipe.id,
      name: recipe.name,
      patience,
      patienceMax: patience,
      placed: [false, false, false],
    };
    nextOrderId += 1;
    state.orders.push(order);
    if (state.selectedId === null) state.selectedId = order.id;
    return order;
  }

  function reset() {
    state.phase = 'play';
    state.elapsed = 0;
    state.shiftLeft = SHIFT_SECONDS;
    state.level = 1;
    state.coins = 0;
    state.served = 0;
    state.strikes = 0;
    state.orders = [];
    state.selectedId = null;
    state.tray = [];
    state.board = null;
    state.burners = [null, null];
    state.spawnTimer = ORDER.interval;
    state.flash = 0;
    state.shake = 0;
    state.message = '';
    state.messageFor = 0;
    nextOrderId = 1;
    nextUid = 1;
    spawnOrder();
    spawnOrder();
  }

  function pickStation(stationId) {
    if (state.phase !== 'play') return 0;
    if (state.tray.length >= TRAY_MAX) {
      state.message = 'Nampan penuh!';
      state.messageFor = 1.2;
      return EVENT_WRONG;
    }
    state.tray.push({ uid: nextUid, ing: stationId, chopped: false, cooked: false });
    nextUid += 1;
    return EVENT_PICK;
  }

  function useTray(uid) {
    if (state.phase !== 'play') return 0;
    const index = state.tray.findIndex((item) => item.uid === uid);
    if (index === -1) return 0;
    const item = state.tray[index];
    const need = needOf(item.ing);
    // Still needs chopping: onto the board when it is free.
    if (need & NEED_CHOP && !item.chopped) {
      if (state.board !== null) return 0;
      state.tray.splice(index, 1);
      state.board = { item, progress: 0 };
      return 0;
    }
    // Still needs cooking: onto a free burner.
    if (need & NEED_COOK && !item.cooked) {
      const burner = state.burners.findIndex((b) => b === null);
      if (burner === -1) return 0;
      state.tray.splice(index, 1);
      state.burners[burner] = { item, progress: 0, done: false, doneFor: 0, burned: false };
      return 0;
    }
    // Ready: onto the plate, but only in the next empty slot of the order.
    const order = selectedOrder();
    if (order === null) return 0;
    const recipe = recipeById(order.recipe);
    const slot = order.placed.findIndex((p) => !p);
    if (slot === -1) return 0;
    if (item.ing !== recipe.ingredients[slot]) {
      state.message = 'Bukan bahan itu!';
      state.messageFor = 1.0;
      return EVENT_WRONG;
    }
    state.tray.splice(index, 1);
    order.placed[slot] = true;
    return 0;
  }

  function useBurner(index) {
    if (state.phase !== 'play') return 0;
    const burner = state.burners[index];
    if (burner === null) return 0;
    if (burner.burned) {
      // Clear a burnt dish: the food is lost.
      state.burners[index] = null;
      return 0;
    }
    if (!burner.done) return 0;
    if (state.tray.length >= TRAY_MAX) {
      state.message = 'Nampan penuh!';
      state.messageFor = 1.2;
      return EVENT_WRONG;
    }
    burner.item.cooked = true;
    state.tray.push(burner.item);
    state.burners[index] = null;
    return 0;
  }

  function serve() {
    if (state.phase !== 'play') return 0;
    const order = selectedOrder();
    if (order === null) return 0;
    if (!order.placed.every(Boolean)) {
      state.shake = 0.35;
      state.message = 'Piring belum lengkap!';
      state.messageFor = 1.0;
      return EVENT_WRONG;
    }
    const recipe = recipeById(order.recipe);
    const tip = Math.round(TIP_MAX * (order.patience / order.patienceMax));
    state.coins += recipe.base + tip;
    state.served += 1;
    state.orders = state.orders.filter((o) => o.id !== order.id);
    state.selectedId = state.orders.length > 0 ? state.orders[0].id : null;
    state.message = `+${recipe.base + tip} koin!`;
    state.messageFor = 1.4;
    return EVENT_SERVE;
  }

  /** One player action: pick, ticket, useTray, burner, serve. */
  function act(action) {
    if (!action) return 0;
    if (action.type === 'pick') return pickStation(action.station);
    if (action.type === 'ticket') {
      if (state.orders.some((o) => o.id === action.orderId)) state.selectedId = action.orderId;
      return 0;
    }
    if (action.type === 'useTray') return useTray(action.uid);
    if (action.type === 'burner') return useBurner(action.index);
    if (action.type === 'serve') return serve();
    return 0;
  }

  function orderInterval() {
    return Math.max(ORDER.minInterval, ORDER.interval - ORDER.intervalPerLevel * (state.level - 1));
  }

  /** One fixed step. `actions` is the list of player actions this step. */
  function step(dt, actions) {
    let events = 0;
    for (const action of actions ?? []) events |= act(action);
    if (state.phase !== 'play') {
      if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);
      if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);
      if (state.messageFor > 0) state.messageFor = Math.max(0, state.messageFor - dt);
      return events;
    }

    state.elapsed += dt;
    state.level = 1 + Math.floor(state.elapsed / LEVEL_SECONDS);
    state.shiftLeft -= dt;

    // New orders arrive on a timer, at most four at once.
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      if (state.orders.length < ORDER.maxActive) spawnOrder();
      state.spawnTimer += orderInterval();
    }

    // Patience drains; an order that runs out is lost with a strike.
    for (let index = state.orders.length - 1; index >= 0; index -= 1) {
      const order = state.orders[index];
      order.patience -= dt;
      if (order.patience > 0) continue;
      state.orders.splice(index, 1);
      state.strikes += 1;
      state.flash = 0.5;
      state.message = 'Pesanan hangus!';
      state.messageFor = 1.4;
      events |= EVENT_EXPIRE;
      if (state.selectedId === order.id) {
        state.selectedId = state.orders.length > 0 ? state.orders[0].id : null;
      }
      if (state.strikes >= MAX_STRIKES) {
        state.phase = 'over';
        events |= EVENT_OVER;
        break;
      }
    }

    // Chopping finishes on its own and the food returns to the tray.
    if (state.board !== null) {
      state.board.progress += dt;
      if (state.board.progress >= PREP.chopSeconds) {
        state.board.item.chopped = true;
        state.tray.push(state.board.item);
        state.board = null;
        events |= EVENT_CHOP_DONE;
      }
    }

    // Cooking finishes and waits on the burner; left too long it burns.
    for (let index = 0; index < state.burners.length; index += 1) {
      const burner = state.burners[index];
      if (burner === null || burner.burned) continue;
      if (!burner.done) {
        burner.progress += dt;
        if (burner.progress >= PREP.cookSeconds) {
          burner.done = true;
          burner.doneFor = 0;
          events |= EVENT_COOK_DONE;
        }
      } else {
        burner.doneFor += dt;
        if (burner.doneFor > PREP.burnSeconds) {
          burner.burned = true;
          state.message = 'Gosong! Buang dan masak lagi.';
          state.messageFor = 1.4;
          events |= EVENT_BURN;
        }
      }
    }

    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);
    if (state.messageFor > 0) state.messageFor = Math.max(0, state.messageFor - dt);

    // The shift ends when the timer runs out.
    if (state.phase === 'play' && state.shiftLeft <= 0) {
      state.shiftLeft = 0;
      state.phase = 'complete';
      events |= EVENT_COMPLETE;
    }
    return events;
  }

  reset();
  return { state, reset, step, act, selectedOrder, recipeById };
}
