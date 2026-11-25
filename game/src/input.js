// Keyboard and mouse, with no game rules in it: the canvas hands this
// module raw events, and the caller drains clicks (in field coordinates) and
// one-shot key actions each frame.
//
// Clicks carry the field position the renderer maps them to, so the caller
// hit-tests them against its own layout rectangles.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_SERVE = 8;

export function createInput(canvas, toField) {
  const clicks = [];
  const keys = new Set();
  let actions = 0;

  function onPointerDown(event) {
    const rect = canvas.getBoundingClientRect();
    const point = toField(event.clientX - rect.left, event.clientY - rect.top);
    clicks.push(point);
  }

  function onKeyDown(event) {
    const key = event.key.toLowerCase();
    if (key === ' ' || key === 'enter') {
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (key === 'p') {
      actions |= ACTION_PAUSE;
    } else if (key === 'm') {
      actions |= ACTION_MUTE;
    } else {
      keys.add(key);
    }
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
      event.preventDefault();
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('keydown', onKeyDown);

  return {
    /** Drain the clicks queued since the last frame, in field coordinates. */
    takeClicks() {
      return clicks.splice(0, clicks.length);
    },
    /** Drain the station keys (1..7) pressed since the last frame. */
    takeStationKeys() {
      const pressed = [];
      for (const key of keys) pressed.push(key);
      keys.clear();
      return pressed;
    },
    /** Drain the one-shot actions queued since the last frame. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Serve key: Space also serves when the plate is complete. */
    servePressed() {
      return (actions & ACTION_SERVE) !== 0;
    },
  };
}
