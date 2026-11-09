import type { Assets, HeroFactory } from './kit';

async function loadAssets(urls: Record<string, string>): Promise<Assets> {
  const entries = await Promise.all(Object.entries(urls).map(([name, src]) => new Promise<[string, HTMLImageElement]>((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve([name, img]);
    img.src = src;
  })));
  return Object.fromEntries(entries);
}

/**
 * Runs a canvas hero: waits for fonts and icons, then loops while on screen.
 * Reduced motion draws one still frame.
 */
export async function startHero(cv: HTMLCanvasElement, factory: HeroFactory, icons: Record<string, string> = {}) {
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const [assets] = await Promise.all([
    loadAssets(icons),
    Promise.allSettled([
      document.fonts.load('22px "Geist Mono"'),
      document.fonts.load('700 22px "Geist Mono"'),
      document.fonts.load('22px Geist'),
      document.fonts.load('600 22px Geist'),
    ]),
  ]);
  const hero = factory(ctx, assets);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    hero.draw(hero.still);
    return;
  }
  let t = 0, last = 0, visible = true;
  const frame = (now: number) => {
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0;
    last = now;
    t = (t + dt) % hero.loop;
    hero.draw(t);
    if (visible) requestAnimationFrame(frame); else last = 0;
  };
  new IntersectionObserver(([entry]) => {
    const was = visible;
    visible = entry.isIntersecting;
    if (visible && !was) requestAnimationFrame(frame);
  }).observe(cv);
  requestAnimationFrame(frame);
}
