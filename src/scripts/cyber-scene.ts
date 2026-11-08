// Plays (or replays) an animated scene. Animations are plain CSS keyed off the
// `.play` class; number counters ([data-count]) are driven here.
const tokens = new WeakMap<HTMLElement, number>();

function format(n: number, decimals: number) {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function runCounter(el: HTMLElement, scene: HTMLElement, token: number) {
  const to = Number(el.dataset.count);
  const from = Number(el.dataset.from ?? 0);
  const delay = Number(el.dataset.delay ?? 0);
  const dur = Number(el.dataset.dur ?? 1500);
  const decimals = Number(el.dataset.decimals ?? 0);
  const linear = el.dataset.ease === 'linear';
  el.textContent = format(from, decimals);
  const start = performance.now() + delay;
  const tick = (now: number) => {
    if (tokens.get(scene) !== token) return;
    const t = Math.min(1, Math.max(0, (now - start) / dur));
    const eased = linear ? t : 1 - Math.pow(1 - t, 3);
    el.textContent = format(from + (to - from) * eased, decimals);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function playScene(scene: HTMLElement) {
  const token = (tokens.get(scene) ?? 0) + 1;
  tokens.set(scene, token);
  scene.classList.remove('play');
  void scene.offsetWidth; // restart CSS animations
  scene.classList.add('play');
  scene.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => runCounter(el, scene, token));
}

export function resetScene(scene: HTMLElement) {
  tokens.set(scene, (tokens.get(scene) ?? 0) + 1);
  scene.classList.remove('play');
}
