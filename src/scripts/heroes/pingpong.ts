/**
 * "AI PR Review Is Dumb": John's AI and Jane's AI review each other on a PR, under
 * their names, until the thread loops back to the comment it started with.
 */
import {
  AMBER, DIM, GRAY, GREEN, MONO, RED, SANS, TEXT, W,
  clear, ease, hud, loopAlpha, rr, seg,
  type Ctx, type HeroFactory,
} from './kit';

const LOOP = 16;
type Item = { who: 'john' | 'jane' | 'push'; text: string };
const FIRST = '{amber} **Medium:** Potential null dereference: if `userId` is undefined, this could lead to unexpected behavior in edge cases. Consider adding defensive error handling.';
const ITEMS: Item[] = [
  { who: 'john', text: FIRST },
  { who: 'jane', text: "You're absolutely right, great catch! Fixed in `a1b2c3d`. I've added a comprehensive null check for `userId` along with a unit test that covers this edge case." },
  { who: 'push', text: '`a1b2c3d` fix: add defensive null check for userId' },
  { who: 'john', text: 'Verified in `a1b2c3d`, nice improvement! One small nit: consider extracting this null check into a reusable helper to improve maintainability.' },
  { who: 'jane', text: 'Great suggestion! Extracted it into `assertDefined()` in `4e5f6a7` and updated all 3 call sites.' },
  { who: 'push', text: '`4e5f6a7` refactor: extract assertDefined helper' },
  { who: 'john', text: '{gray} **Low:** `assertDefined()` may be over-engineered for a single use case. Consider inlining the check to reduce indirection.' },
  { who: 'jane', text: "You're absolutely right! Inlined the check in `9c8d7e6` and removed the helper." },
  { who: 'push', text: '`9c8d7e6` refactor: inline null check for userId' },
  { who: 'john', text: FIRST },
];

const CARD = { x: 150, y: 196, w: 1620, h: 650 };
const AV_X = CARD.x + 70, BOX_X = CARD.x + 130, BOX_W = CARD.w - 170;
const TEXT_W = BOX_W - 44, LINE = 42, GAP = 26;
const BODY = `28px ${SANS}`, BOLD = `600 28px ${SANS}`, CODE = `24px ${MONO}`;
const COLORS = { john: '#1f6feb', jane: '#bf3989' };

type Word = { kind: 'text' | 'bold' | 'code' | 'dot'; s: string; after: string; color?: string };
type Placed = Word & { x: number; line: number; start: number };
type Laid = Item & { words: Placed[]; lines: number; chars: number; h: number; at: number; typing: number };

function tokenize(text: string): Word[] {
  return text.split(' ').map((w) => {
    if (w === '{amber}') return { kind: 'dot', s: '', after: '', color: AMBER };
    if (w === '{gray}') return { kind: 'dot', s: '', after: '', color: GRAY };
    const code = w.match(/^`([^`]+)`(.*)$/);
    if (code) return { kind: 'code', s: code[1], after: code[2] };
    const bold = w.match(/^\*\*(.+)\*\*$/);
    if (bold) return { kind: 'bold', s: bold[1], after: '' };
    return { kind: 'text', s: w, after: '' };
  });
}

function wordWidth(ctx: Ctx, w: Word) {
  if (w.kind === 'dot') return 26;
  ctx.font = w.kind === 'code' ? CODE : w.kind === 'bold' ? BOLD : BODY;
  const core = ctx.measureText(w.s).width + (w.kind === 'code' ? 16 : 0);
  ctx.font = BODY;
  return core + ctx.measureText(w.after).width;
}

const pingpong: HeroFactory = (ctx) => {
  ctx.font = BODY;
  const space = ctx.measureText(' ').width;
  let at = .5;
  const items: Laid[] = ITEMS.map((item) => {
    const words: Placed[] = [];
    let x = 0, line = 0, chars = 0;
    const maxW = item.who === 'push' ? 1e9 : TEXT_W;
    for (const w of tokenize(item.text)) {
      const ww = wordWidth(ctx, w);
      if (x > 0 && x + ww > maxW) { x = 0; line++; }
      words.push({ ...w, x, line, start: chars });
      chars += w.s.length + w.after.length + 1;
      x += ww + space;
    }
    const lines = line + 1;
    const h = item.who === 'push' ? 46 : 58 + 22 + lines * LINE + 12;
    const typing = item.who === 'push' ? .25 : Math.min(1.1, chars / 190);
    const laid = { ...item, words, lines, chars, h, at, typing };
    at += item.who === 'push' ? .7 : typing + .55;
    return laid;
  });
  const END = items[items.length - 1].at + items[items.length - 1].typing;

  function drawWords(item: Laid, x0: number, y0: number, shown: number) {
    for (const w of item.words) {
      if (w.start >= shown) break;
      const n = shown - w.start;
      const x = x0 + w.x, y = y0 + w.line * LINE;
      if (w.kind === 'dot') {
        ctx.beginPath(); ctx.arc(x + 11, y - 9, 11, 0, Math.PI * 2);
        ctx.fillStyle = w.color!; ctx.fill();
        continue;
      }
      const core = w.s.slice(0, n);
      let cx = x;
      if (w.kind === 'code') {
        ctx.font = CODE;
        const cw = ctx.measureText(w.s).width + 16;
        rr(ctx, x, y - 27, ctx.measureText(core).width + 16, 36, 6);
        ctx.fillStyle = '#1f1f24'; ctx.fill();
        ctx.fillStyle = '#d6d6d6'; ctx.fillText(core, x + 8, y);
        cx = x + cw;
      } else {
        ctx.font = w.kind === 'bold' ? BOLD : BODY;
        ctx.fillStyle = TEXT;
        ctx.fillText(core, x, y);
        cx = x + ctx.measureText(w.s).width;
      }
      if (w.after && n > w.s.length) {
        ctx.font = BODY; ctx.fillStyle = TEXT;
        ctx.fillText(w.after.slice(0, n - w.s.length), cx, y);
      }
    }
  }

  function draw(t: number) {
    clear(ctx);
    ctx.globalAlpha = loopAlpha(t, LOOP);
    const base = ctx.globalAlpha;

    const visible = items.filter((it) => t >= it.at);
    const comments = visible.filter((it) => it.who !== 'push').length;
    const commits = visible.filter((it) => it.who === 'push').length;
    hud(ctx, 'AI COMMENTS', String(comments), CARD.x, 74);
    hud(ctx, 'COMMITS PUSHED', String(commits), W / 2, 74, TEXT, 'center');
    hud(ctx, 'READ BY A HUMAN', '0', CARD.x + CARD.w, 74, RED, 'right');

    rr(ctx, CARD.x, CARD.y, CARD.w, CARD.h, 22);
    ctx.fillStyle = '#09090b'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#1f1f22'; ctx.stroke();

    // Total height grows as items arrive; scroll so the newest stays in view.
    let total = 40;
    for (const it of items) total += (it.h + GAP) * ease(seg(t, it.at, .45));
    const scroll = Math.max(0, total - (CARD.h - 40));

    ctx.save();
    rr(ctx, CARD.x, CARD.y, CARD.w, CARD.h, 22); ctx.clip();
    let y = CARD.y + 40 - scroll;
    const newest = visible.length - 1;
    items.forEach((it, i) => {
      const p = ease(seg(t, it.at, .45));
      if (p <= 0) return;
      ctx.globalAlpha = base * p;
      const yy = y + (1 - p) * 30;
      if (it.who === 'push') {
        ctx.beginPath(); ctx.arc(BOX_X + 12, yy + 22, 9, 0, Math.PI * 2); ctx.fillStyle = GREEN; ctx.fill();
        ctx.font = `26px ${SANS}`; ctx.fillStyle = GRAY;
        ctx.fillText('jane pushed 1 commit ·', BOX_X + 36, yy + 31);
        drawWords(it, BOX_X + 36 + ctx.measureText('jane pushed 1 commit · ').width, yy + 31, 1e9);
      } else {
        // Avatar.
        ctx.beginPath(); ctx.arc(AV_X, yy + 29, 28, 0, Math.PI * 2);
        ctx.fillStyle = COLORS[it.who]; ctx.fill();
        ctx.font = `600 26px ${SANS}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
        ctx.fillText('J', AV_X, yy + 38); ctx.textAlign = 'left';
        // Box and header.
        rr(ctx, BOX_X, yy, BOX_W, it.h, 10);
        ctx.fillStyle = '#0e0e11'; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = '#26262b'; ctx.stroke();
        ctx.save(); rr(ctx, BOX_X, yy, BOX_W, 58, [10, 10, 0, 0] as any); ctx.fillStyle = '#141418'; ctx.fill(); ctx.restore();
        ctx.beginPath(); ctx.moveTo(BOX_X, yy + 58); ctx.lineTo(BOX_X + BOX_W, yy + 58); ctx.strokeStyle = '#26262b'; ctx.stroke();
        const ago = newest - i;
        ctx.font = `600 26px ${SANS}`; ctx.fillStyle = TEXT; ctx.fillText(it.who, BOX_X + 22, yy + 38);
        const nw = ctx.measureText(it.who + ' ').width;
        ctx.font = `26px ${SANS}`; ctx.fillStyle = GRAY;
        ctx.fillText(ago <= 0 ? 'commented now' : `commented ${ago} minute${ago === 1 ? '' : 's'} ago`, BOX_X + 22 + nw, yy + 38);
        if (it.who === 'jane') {
          ctx.font = `20px ${SANS}`;
          const tw = ctx.measureText('Author').width + 22;
          rr(ctx, BOX_X + BOX_W - 22 - tw, yy + 14, tw, 30, 15);
          ctx.strokeStyle = '#3a3a40'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.fillStyle = GRAY; ctx.fillText('Author', BOX_X + BOX_W - 11 - tw, yy + 36);
        }
        const shown = Math.floor(it.chars * seg(t, it.at + .15, it.typing));
        drawWords(it, BOX_X + 22, yy + 58 + 22 + 28, shown);
        if (shown < it.chars && shown > 0 && Math.floor(t * 6) % 2 === 0) {
          // Typing caret at the end of what's shown.
          const w = [...it.words].reverse().find((w) => w.start < shown)!;
          ctx.font = w.kind === 'code' ? CODE : BODY;
          const cx = BOX_X + 22 + w.x + ctx.measureText((w.s + w.after).slice(0, shown - w.start)).width + (w.kind === 'code' ? 8 : 2);
          ctx.fillStyle = TEXT; ctx.fillRect(cx, yy + 58 + 22 + 4 + w.line * LINE, 2, 30);
        }
      }
      y += (it.h + GAP) * p;
    });
    ctx.globalAlpha = base;
    // Fade the top edge where old comments scroll away.
    const g = ctx.createLinearGradient(0, CARD.y, 0, CARD.y + 90);
    g.addColorStop(0, 'rgba(9,9,11,1)'); g.addColorStop(1, 'rgba(9,9,11,0)');
    ctx.fillStyle = g; ctx.fillRect(CARD.x, CARD.y, CARD.w, 90);
    ctx.restore();

    const back = ease(seg(t, END + .4, .5));
    if (back > 0) {
      ctx.globalAlpha = base * back;
      ctx.font = `22px ${MONO}`; ctx.fillStyle = DIM; ctx.textAlign = 'right';
      ctx.fillText('same comment as the first one. round 2 begins.', CARD.x + CARD.w, CARD.y - 18);
      ctx.textAlign = 'left';
      ctx.globalAlpha = base;
    }
  }

  return { loop: LOOP, still: END + 1.5, draw };
};

export default pingpong;
