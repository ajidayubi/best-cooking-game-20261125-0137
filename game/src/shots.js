// The screenshot scenes behind ?shot=start|play|assembly|end. Each one
// plays the real rules forward from a fresh world for a fixed stretch,
// steered by a simple scripted cook (the same act() calls a player makes),
// so the frame is what a real game looks like and the same seed always
// gives the same frame.
//
// The scripted cook works on the selected (oldest) order, one slot at a
// time: it takes the next ingredient it still needs, preps it, and places
// it, collecting finished pans and clearing burnt ones as it goes.

import { STEP } from './config.js';
import { itemReady } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const END_LIMIT_SECONDS = 200;
const SAMPLE = STEP;

/** Is an ingredient already in the tray, on the board or on a burner? */
function inFlight(state, ing) {
  if (state.tray.some((item) => item.ing === ing)) return true;
  if (state.board !== null && state.board.item.ing === ing) return true;
  return state.burners.some((b) => b !== null && b.item.ing === ing);
}

/** One greedy step of the scripted cook; `serve` false holds the dish back.
 * `holdLast` true never places the final slot, so the plate stays
 * mid-assembly with its last ingredient waiting in the tray or on a burner. */
function cookStep(world, serve, holdLast) {
  const { state } = world;
  const actions = [];
  // Collect finished pans and clear burnt ones first.
  state.burners.forEach((burner, index) => {
    if (burner !== null && (burner.done || burner.burned)) actions.push({ type: 'burner', index });
  });
  const order = world.selectedOrder();
  if (order === null) return actions;
  const recipe = world.recipeById(order.recipe);
  const slot = order.placed.findIndex((p) => !p);
  if (slot === -1) {
    if (serve) actions.push({ type: 'serve' });
    return actions;
  }
  const needed = recipe.ingredients[slot];
  // A ready one goes straight on the plate — unless it is the held-back last slot.
  const ready = state.tray.find((item) => item.ing === needed && itemReady(item));
  if (ready && !(holdLast && slot === recipe.ingredients.length - 1)) {
    actions.push({ type: 'useTray', uid: ready.uid });
    return actions;
  }
  // One still being prepped gets pushed along.
  const prepping = state.tray.find((item) => item.ing === needed);
  if (prepping) {
    actions.push({ type: 'useTray', uid: prepping.uid });
    return actions;
  }
  // Otherwise take a fresh portion, unless one is already on its way.
  if (!inFlight(state, needed) && state.tray.length < 5) {
    actions.push({ type: 'pick', station: needed });
    return actions;
  }
  // The tray is full of other things: advance the first item that can move.
  const movable = state.tray.find((item) => !itemReady(item));
  if (movable) actions.push({ type: 'useTray', uid: movable.uid });
  return actions;
}

function runCook(world, seconds, serve, stopWhen, holdLast = false) {
  const steps = Math.floor(seconds / SAMPLE);
  for (let index = 0; index < steps; index += 1) {
    const actions = cookStep(world, serve, holdLast);
    world.step(SAMPLE, actions);
    if (world.state.phase !== 'play') break;
    if (stopWhen && stopWhen(world.state)) break;
  }
}

/**
 * Set `world` to the named scene (start, play, assembly or end; any other
 * name is start) and return the screen to draw over it and the best score.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'assembly' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, []);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'assembly') {
    // Stop with two slots filled and the last ingredient already on its way,
    // so the plate reads as a dish mid-assembly.
    runCook(
      world,
      120,
      false,
      (state) => {
        const order = state.orders.find((o) => o.id === state.selectedId);
        if (order === undefined || order.placed.filter(Boolean).length < 2) return false;
        const recipe = world.recipeById(order.recipe);
        const last = recipe.ingredients[recipe.ingredients.length - 1];
        return inFlight(state, last);
      },
      true,
    );
    return { screen: SCREEN_PLAY, best: world.state.coins };
  }
  if (name === 'end') {
    runCook(world, END_LIMIT_SECONDS, true, null);
    return { screen: SCREEN_OVER, best: world.state.coins };
  }
  // Mid-game: a dish served already, a full-ish board, and the next dish
  // already started on the plate.
  runCook(world, 45, true, (state) => {
    if (state.served < 1 || state.orders.length < 2 || state.tray.length < 1) return false;
    const order = state.orders.find((o) => o.id === state.selectedId);
    return order !== undefined && order.placed.filter(Boolean).length >= 1;
  });
  return { screen: SCREEN_PLAY, best: world.state.coins };
}
