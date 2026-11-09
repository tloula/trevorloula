/**
 * "I Finally Stopped Reviewing My AI's PRs": PRs open, go green and merge
 * themselves one after another, while the review box just says "nah, I trust it".
 */
import {
  DIM, GRAY, GREEN, MONO, P, PURPLE, SANS, TEXT, W,
  check, clear, ease, easeIO, hud, loopAlpha, rr, seg, spinner,
  type HeroFactory,
} from './kit';

const LOOP = 15;
const PRS = [
  { n: 142, title: 'Add mutual match notifications', commits: 23, start: .2, dur: 6.2 },
  { n: 143, title: 'Rate-limit message sends', commits: 9, start: 6.4, dur: 4.0 },
  { n: 144, title: 'Add photo moderation queue', commits: 31, start: 10.4, dur: 4.6 },
];
const CHECKS = ['build', 'lint', 'typecheck', 'unit', 'integration', 'e2e'];
const WIN = { x: 200, y: 200, w: 1520, h: 650 };
const MERGED_BEFORE = 6;

// Phase points as fractions of each PR's slot.
const F = { in: .1, checks: [.1, .5], review: [.52, .64], press: .7, merged: .74, out: .92 };

function prIcon(ctx: CanvasRenderingContext2D, x: number, y: number, merged: boolean) {
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y - 9, 4.5, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y + 11, 4.5, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 6); ctx.stroke();
  if (merged) {
    ctx.beginPath(); ctx.arc(x + 15, y + 3, 4.5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.quadraticCurveTo(x, y + 3, x + 10, y + 3); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(x + 15, y + 11, 4.5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 15, y + 6); ctx.lineTo(x + 15, y - 6); ctx.lineTo(x + 7, y - 9); ctx.stroke();
  }
}

const automerge: HeroFactory = (ctx) => {
  function pr(i: number, t: number, base: number) {
    const pr = PRS[i];
    const u = (t - pr.start) / pr.dur;
    if (u < 0 || (u > 1 && i < PRS.length - 1)) return;
    const slideIn = easeIO(seg(u, 0, F.in));
    const slideOut = i < PRS.length - 1 ? easeIO(seg(u, F.out, 1 - F.out)) : 0;
    const dx = (1 - slideIn) * 260 - slideOut * 260;
    ctx.globalAlpha = base * slideIn * (1 - slideOut);
    ctx.save();
    ctx.translate(dx, 0);
    const x = WIN.x + 80;
    const merged = u >= F.merged;

    ctx.font = `36px ${SANS}`; ctx.fillStyle = GRAY;
    ctx.fillText('tloula / cedar-mingle', x, WIN.y + 130);
    ctx.font = `600 58px ${SANS}`; ctx.fillStyle = TEXT;
    ctx.fillText(pr.title, x, WIN.y + 208);
    const tw = ctx.measureText(pr.title + ' ').width;
    ctx.font = `58px ${SANS}`; ctx.fillStyle = '#6e6e73';
    ctx.fillText(`#${pr.n}`, x + tw, WIN.y + 208);

    // State badge flips from Open to Merged with a little pop.
    const pop = 1 + .12 * Math.sin(Math.PI * seg(u, F.merged, .05));
    const bw = merged ? 228 : 180, by = WIN.y + 240;
    ctx.save();
    ctx.translate(x + bw / 2, by + 34); ctx.scale(pop, pop); ctx.translate(-(x + bw / 2), -(by + 34));
    rr(ctx, x, by, bw, 68, 34);
    ctx.fillStyle = merged ? PURPLE : '#238636'; ctx.fill();
    prIcon(ctx, x + 32, by + 33, merged);
    ctx.font = `600 34px ${SANS}`; ctx.fillStyle = '#fff';
    ctx.fillText(merged ? 'Merged' : 'Open', x + 70, by + 46);
    ctx.restore();
    ctx.font = `600 34px ${SANS}`; ctx.fillStyle = TEXT;
    ctx.fillText('claude', x + bw + 26, by + 46);
    const cw = ctx.measureText('claude ').width;
    ctx.font = `34px ${SANS}`; ctx.fillStyle = GRAY;
    const verb = merged ? `merged ${pr.commits} commits into` : `wants to merge ${pr.commits} commits into`;
    ctx.fillText(verb, x + bw + 26 + cw, by + 46);
    const vw = ctx.measureText(verb + ' ').width;
    ctx.font = `32px ${MONO}`;
    const mw = ctx.measureText('main').width + 24;
    rr(ctx, x + bw + 26 + cw + vw, by + 12, mw, 46, 8); ctx.fillStyle = '#0f2340'; ctx.fill();
    ctx.fillStyle = '#58a6ff'; ctx.fillText('main', x + bw + 38 + cw + vw, by + 45);

    // Checks box.
    const bx = x, bxw = WIN.w - 160, top = WIN.y + 330, RV = 150;
    rr(ctx, bx, top, bxw, RV + 104, 14);
    ctx.fillStyle = '#0d0d10'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#2a2a2e'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx, top + RV); ctx.lineTo(bx + bxw, top + RV); ctx.stroke();
    const cp = seg(u, F.checks[0], F.checks[1] - F.checks[0]);
    const passed = Math.min(6, Math.floor(cp * 6.999));
    const allDone = cp >= 1;
    if (allDone) {
      ctx.beginPath(); ctx.arc(bx + 58, top + 50, 17, 0, Math.PI * 2); ctx.fillStyle = GREEN; ctx.fill();
      check(ctx, bx + 58, top + 50, 16, '#0d0d10', 4);
    } else spinner(ctx, bx + 58, top + 50, 15, t, '#d29922', 4);
    ctx.font = `36px ${SANS}`; ctx.fillStyle = TEXT;
    const head = allDone ? 'All checks have passed' : 'Running checks';
    ctx.fillText(head, bx + 102, top + 63);
    const hw = ctx.measureText(head + ' ').width;
    ctx.fillStyle = GRAY; ctx.fillText(`· ${passed} of 6 successful`, bx + 102 + hw, top + 63);
    // Check pills under the heading.
    ctx.font = `20px ${MONO}`;
    let px = bx + 102;
    for (let k = 0; k < CHECKS.length; k++) {
      const pw = ctx.measureText(CHECKS[k]).width + 50;
      const ok = k < passed;
      rr(ctx, px, top + 86, pw, 44, 22);
      ctx.fillStyle = ok ? 'rgba(63,185,80,.12)' : '#121215'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = ok ? 'rgba(63,185,80,.55)' : '#2a2a2e'; ctx.stroke();
      if (ok) check(ctx, px + 21, top + 108, 10, GREEN, 3);
      else if (k === passed) spinner(ctx, px + 21, top + 108, 8, t, '#d29922', 2.5);
      else { ctx.beginPath(); ctx.arc(px + 21, top + 108, 7, 0, Math.PI * 2); ctx.strokeStyle = '#444'; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.fillStyle = ok ? '#9be9a8' : DIM; ctx.fillText(CHECKS[k], px + 38, top + 115);
      px += pw + 12;
    }
    // Review row.
    ctx.beginPath(); ctx.arc(bx + 58, top + RV + 52, 16, 0, Math.PI * 2);
    ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = 3; ctx.stroke();
    ctx.font = `36px ${SANS}`; ctx.fillStyle = TEXT; ctx.fillText('Review required', bx + 102, top + RV + 65);
    const rw = ctx.measureText('Review required ').width;
    const quip = '· nah, I trust it';
    const qn = Math.floor(quip.length * seg(u, F.review[0], F.review[1] - F.review[0]));
    ctx.fillStyle = '#b9a6f0'; ctx.fillText(quip.slice(0, qn), bx + 102 + rw, top + RV + 65);

    // Merge button at the end of the review row, then the merged notice in its place.
    const bw2 = 340, mx = bx + bxw - bw2 - 24, my = top + RV + 18;
    const pressed = u >= F.press && u < F.merged;
    if (!merged) {
      if (u > F.review[1]) {
        ctx.font = `22px ${MONO}`; ctx.fillStyle = DIM; ctx.textAlign = 'right';
        ctx.fillText('claude is merging…', mx - 24, my + 42);
        ctx.textAlign = 'left';
      }
      rr(ctx, mx, my, bw2, 66, 12);
      ctx.fillStyle = pressed ? '#1a6b2b' : allDone ? '#238636' : '#1b3a22'; ctx.fill();
      ctx.font = `600 30px ${SANS}`; ctx.fillStyle = allDone ? '#fff' : '#6b8f72'; ctx.textAlign = 'center';
      ctx.fillText('Merge pull request', mx + bw2 / 2, my + 44); ctx.textAlign = 'left';
    } else {
      ctx.globalAlpha *= ease(seg(u, F.merged, .06));
      rr(ctx, mx, my, bw2, 66, 12);
      ctx.fillStyle = `rgba(${P},.12)`; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = `rgba(${P},.5)`; ctx.stroke();
      ctx.beginPath(); ctx.arc(mx + 40, my + 33, 18, 0, Math.PI * 2); ctx.fillStyle = PURPLE; ctx.fill();
      prIcon(ctx, mx + 33, my + 31, true);
      ctx.font = `600 30px ${SANS}`; ctx.fillStyle = TEXT;
      ctx.fillText('Merged', mx + 78, my + 44);
    }
    ctx.restore();
    ctx.globalAlpha = base;
  }

  function draw(t: number) {
    clear(ctx);
    ctx.globalAlpha = loopAlpha(t, LOOP);
    const base = ctx.globalAlpha;

    const mergedCount = MERGED_BEFORE + PRS.filter((p) => t >= p.start + p.dur * F.merged).length;
    hud(ctx, 'MERGED TODAY', String(mergedCount), WIN.x, 84, PURPLE);
    hud(ctx, 'DIFFS I READ', '0', WIN.x + WIN.w, 84, TEXT, 'right');

    // Window chrome.
    rr(ctx, WIN.x, WIN.y, WIN.w, WIN.h, 24);
    ctx.fillStyle = '#0a0a0c'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#26262a'; ctx.stroke();
    ctx.save(); rr(ctx, WIN.x, WIN.y, WIN.w, 58, [24, 24, 0, 0] as any); ctx.fillStyle = '#141417'; ctx.fill(); ctx.restore();
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
      ctx.beginPath(); ctx.arc(WIN.x + 38 + i * 32, WIN.y + 29, 9, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill();
    });
    ctx.save();
    rr(ctx, WIN.x, WIN.y + 58, WIN.w, WIN.h - 58, [0, 0, 24, 24] as any); ctx.clip();
    PRS.forEach((_, i) => pr(i, t, base));
    ctx.restore();
  }

  return { loop: LOOP, still: 14, draw };
};

export default automerge;
