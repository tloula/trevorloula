/** Shared drawing helpers for the canvas heroes (1920x1080, black, Geist + purple). */
export type Ctx = CanvasRenderingContext2D;
export type Assets = Record<string, HTMLImageElement>;
export interface Hero {
  /** Loop length in seconds. */
  loop: number;
  /** Time drawn once for reduced motion. */
  still: number;
  /** Draws the frame at time t. Pure: the same t always draws the same frame. */
  draw(t: number): void;
}
export type HeroFactory = (ctx: Ctx, assets: Assets) => Hero;

export const W = 1920, H = 1080;
export const P = '140,92,245';
export const PURPLE = `rgb(${P})`;
export const GRAY = '#8a8a8a', DIM = '#5a5a5a', TEXT = '#e6e6e6';
export const GREEN = '#3fb950', RED = '#ff4d4f', AMBER = '#d29922';
export const MONO = '"Geist Mono", monospace', SANS = 'Geist, sans-serif';

export const clamp = (x: number) => Math.max(0, Math.min(1, x));
export const seg = (t: number, start: number, dur: number) => clamp((t - start) / dur);
export const ease = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
export const easeIO = (x: number) => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

export function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Fade in at the start of the loop and out at the end. */
export const loopAlpha = (t: number, loop: number, inDur = .3, outDur = .8) =>
  t > loop - outDur ? Math.max(0, (loop - t) / outDur) : t < inDur ? t / inDur : 1;

export function clear(ctx: Ctx, color = '#000') {
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
}

/** Small mono label over a big mono number, like the other heroes' HUDs. */
export function hud(ctx: Ctx, label: string, value: string, x: number, y: number, color = TEXT, align: CanvasTextAlign = 'left') {
  ctx.textAlign = align;
  ctx.font = `22px ${MONO}`;
  ctx.fillStyle = GRAY;
  ctx.fillText(label, x, y);
  ctx.font = `700 64px ${MONO}`;
  ctx.fillStyle = color;
  ctx.fillText(value, x, y + 68);
  ctx.textAlign = 'left';
}

export function check(ctx: Ctx, cx: number, cy: number, s: number, color: string, lw = 4) {
  ctx.beginPath();
  ctx.moveTo(cx - s * .55, cy + s * .02);
  ctx.lineTo(cx - s * .15, cy + s * .42);
  ctx.lineTo(cx + s * .6, cy - s * .38);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.lineCap = 'butt';
}

export function cross(ctx: Ctx, cx: number, cy: number, s: number, color: string, lw = 4) {
  ctx.beginPath();
  ctx.moveTo(cx - s / 2, cy - s / 2); ctx.lineTo(cx + s / 2, cy + s / 2);
  ctx.moveTo(cx + s / 2, cy - s / 2); ctx.lineTo(cx - s / 2, cy + s / 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.lineCap = 'butt';
}

export function spinner(ctx: Ctx, cx: number, cy: number, r: number, t: number, color: string, lw = 4) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, t * 7, t * 7 + Math.PI * 1.4);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.lineCap = 'butt';
}

/** A standard arrow mouse pointer with its tip at (x, y). */
export function pointer(ctx: Ctx, x: number, y: number, s = 1, fill = '#fff', stroke = '#000') {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, 34); ctx.lineTo(8, 26); ctx.lineTo(14, 39);
  ctx.lineTo(20, 36); ctx.lineTo(14, 24); ctx.lineTo(25, 24); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();
}

/** Expanding ring where something was clicked. p goes 0..1. */
export function ripple(ctx: Ctx, x: number, y: number, p: number, color = '255,255,255') {
  if (p <= 0 || p >= 1) return;
  ctx.beginPath();
  ctx.arc(x, y, 8 + 40 * ease(p), 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${color},${.7 * (1 - p)})`;
  ctx.lineWidth = 3;
  ctx.stroke();
}

/** Draws an icon image tinted at (x, y) with size s; does nothing if it failed to load. */
export function icon(ctx: Ctx, img: HTMLImageElement | undefined, x: number, y: number, s: number) {
  if (img && img.complete && img.naturalWidth) ctx.drawImage(img, x, y, s, s);
}

/** Wraps words into lines no wider than maxW with the current font. */
export function wrap(ctx: Ctx, text: string, maxW: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(' ')) {
    const next = line ? line + ' ' + w : w;
    if (ctx.measureText(next).width > maxW && line) { out.push(line); line = w; } else line = next;
  }
  if (line) out.push(line);
  return out;
}

export const pad2 = (n: number) => String(Math.floor(n)).padStart(2, '0');
