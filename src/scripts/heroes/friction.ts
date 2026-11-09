/**
 * "If AI Can't Do It, It's a Bottleneck": the agent tears through its steps in
 * minutes, then the pipeline sits on the one step that needs a human for hours.
 */
import {
  AMBER, DIM, GRAY, GREEN, MONO, P, PURPLE, SANS, TEXT, W,
  check, clear, ease, easeIO, hud, lerp, loopAlpha, pad2, pointer, rr, ripple, seg, spinner,
  type HeroFactory,
} from './kit';

const LOOP = 15;
const STEPS = ['write code', 'run tests', 'deploy preview', 'approve in vendor portal'];
const NODE_X = [550, 817, 1083, 1359], NODE_Y = 330, R = 57;
const START = .6, STEP = 1.1, WORK = .9;
const WAIT_START = START + 3 * STEP + .1; // 4.0
const HUMAN = 5.6; // when the human finally starts the manual steps
const STEP_DUR = .68;
const AGENT_SECONDS = 193, WAIT_SECONDS = 12180; // 3m 13s of work, 3h 23m of waiting and clicking

// What "one approval in the vendor portal" actually takes. [step, kind, actions]
const MANUAL: [string, string, number][] = [
  ['Open the vendor portal', 'click', 1],
  ['Sign in, wait for the email code', 'wait', 2],
  ['Copy the code from email', 'copy', 2],
  ['Paste the code', 'paste', 2],
  ['Releases > Pending > v1.8', '3 clicks', 3],
  ['Copy the build ID from the terminal', 'copy', 2],
  ['Paste the build ID', 'paste', 2],
  ['Copy the changelog from the PR', 'copy', 2],
  ['Paste the changelog', 'paste', 2],
  ['Approve > Are you sure? > Confirm', '3 clicks', 3],
];
const CLICK = HUMAN + .3 + MANUAL.length * STEP_DUR; // last manual step done
const ACTIONS = MANUAL.reduce((n, m) => n + m[2], 0);
const BASE = 14 * 3600 + 2 * 60 + 7; // 14:02:07

const LOG: [number, number, string, string][] = [
  // [shown at, clock seconds after BASE, text, color]
  [1.5, 44, 'agent  wrote 14 files (+612 −88)', GREEN],
  [2.6, 111, 'agent  214 tests passed', GREEN],
  [3.7, 192, 'agent  preview deployed', GREEN],
  [4.0, 193, 'agent  blocked: release needs the vendor portal (no API)', AMBER],
  [4.8, 193 + 3600, 'agent  pinged you', GRAY],
];

const clock = (s: number) => {
  const x = BASE + s;
  return `${pad2(x / 3600)}:${pad2((x % 3600) / 60)}:${pad2(x % 60)}`;
};
const dur = (s: number) => s >= 3600
  ? `${Math.floor(s / 3600)}h ${pad2((s % 3600) / 60)}m`
  : `${Math.floor(s / 60)}m ${pad2(s % 60)}s`;

// Waiting time follows the log's clock, so the counter and the timestamps agree.
// Most of it passes before the human even looks; the rest is the manual steps.
const WAIT_KEYS: [number, number][] = [[WAIT_START, 0], [4.8, 3600], [HUMAN, 9600], [CLICK, WAIT_SECONDS]];
function waitedAt(t: number) {
  if (t <= WAIT_START) return 0;
  for (let i = 1; i < WAIT_KEYS.length; i++) {
    const [t0, s0] = WAIT_KEYS[i - 1], [t1, s1] = WAIT_KEYS[i];
    if (t <= t1) return lerp(s0, s1, (t - t0) / (t1 - t0));
  }
  return WAIT_SECONDS;
}

const friction: HeroFactory = (ctx) => {
  function node(i: number, t: number) {
    const x = NODE_X[i], y = NODE_Y;
    const human = i === 3;
    const begin = human ? WAIT_START : START + i * STEP;
    const done = human ? CLICK : begin + WORK;
    const active = t >= begin && t < done, finished = t >= done;
    if (finished) {
      const pop = ease(seg(t, done, .35));
      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.fillStyle = '#132a1b'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = GREEN; ctx.stroke();
      check(ctx, x, y, 34 * (.6 + .4 * pop), GREEN, 7);
    } else if (active && human) {
      const pulse = .5 + .5 * Math.sin(t * 4);
      ctx.save();
      ctx.shadowColor = `rgba(210,153,34,${.35 + .35 * pulse})`;
      ctx.shadowBlur = 30 + 20 * pulse;
      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.fillStyle = '#2a2010'; ctx.fill();
      ctx.restore();
      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.lineWidth = 3; ctx.strokeStyle = AMBER; ctx.stroke();
      pointer(ctx, x - 12, y - 22, 1.15, AMBER, '#2a2010');
    } else if (active) {
      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.fillStyle = '#120d22'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#2d2350'; ctx.stroke();
      spinner(ctx, x, y, R, t, PURPLE, 4);
      ctx.font = `600 22px ${MONO}`; ctx.fillStyle = PURPLE; ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(seg(t, begin, WORK) * 100)}%`, x, y + 8);
    } else {
      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.fillStyle = '#0d0d0f'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#262626'; ctx.stroke();
    }
    ctx.textAlign = 'center';
    ctx.font = `22px ${MONO}`;
    ctx.fillStyle = finished ? GRAY : active ? (human ? AMBER : TEXT) : DIM;
    ctx.fillText(STEPS[i], x, y + R + 44);
    ctx.textAlign = 'left';
  }

  function link(i: number, t: number) {
    const x1 = NODE_X[i] + R, x2 = NODE_X[i + 1] - R, y = NODE_Y;
    const doneAt = i === 2 ? CLICK : START + i * STEP + WORK;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y);
    ctx.strokeStyle = '#1c1c1f'; ctx.stroke();
    if (i === 2 && t >= WAIT_START - .1 && t < CLICK) {
      ctx.setLineDash([14, 10]);
      ctx.lineDashOffset = -t * 30;
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y);
      ctx.strokeStyle = AMBER; ctx.stroke();
      ctx.setLineDash([]);
    }
    const p = ease(seg(t, doneAt, .3));
    if (p > 0) {
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(lerp(x1, x2, p), y);
      ctx.strokeStyle = GREEN; ctx.stroke();
    }
  }

  function manualStep(i: number, label: string, kind: string, t: number) {
    const c = Math.floor(i / 5), r = i % 5;
    const x = COL_X[c], y = ROW_Y + r * ROW_H;
    const active = t >= stepStart(i) && t < stepEnd(i), done = t >= stepEnd(i);
    if (done) check(ctx, x + 12, y - 8, 16, GREEN, 3.5);
    else {
      ctx.beginPath(); ctx.arc(x + 12, y - 8, 9, 0, Math.PI * 2);
      ctx.lineWidth = 2; ctx.strokeStyle = active ? AMBER : '#333'; ctx.stroke();
    }
    ctx.font = `21px ${MONO}`;
    ctx.fillStyle = done ? GRAY : active ? TEXT : DIM;
    ctx.fillText(label, x + 38, y);
    ctx.font = `17px ${MONO}`;
    const tw = ctx.measureText(kind).width + 22;
    rr(ctx, x + COL_W - tw, y - 24, tw, 30, 15);
    ctx.lineWidth = 1.5; ctx.strokeStyle = active ? AMBER : '#2a2a2e'; ctx.stroke();
    ctx.fillStyle = active ? AMBER : done ? '#6a6a70' : '#4a4a50';
    ctx.fillText(kind, x + COL_W - tw + 11, y - 3);
  }

  function draw(t: number) {
    clear(ctx);
    ctx.globalAlpha = loopAlpha(t, LOOP);
    const base = ctx.globalAlpha;

    // HUD: agent time freezes when it hits the human step, waiting time takes off.
    const agent = AGENT_SECONDS * seg(t, START, WAIT_START - START);
    const waiting = waitedAt(t);
    hud(ctx, 'AGENT TIME', dur(agent), 260, 84, t < WAIT_START ? PURPLE : TEXT);
    hud(ctx, 'WAITING ON HUMAN', dur(waiting), W - 260, 84, waiting > 0 ? AMBER : DIM, 'right');
    const actions = MANUAL.reduce((n, m, i) => n + (t >= stepEnd(i) ? m[2] : 0), 0);
    hud(ctx, 'MANUAL CLICKS + PASTES', String(actions), W / 2 + 40, 84, actions > 0 ? AMBER : DIM, 'center');

    // Pipeline card.
    rr(ctx, 260, 180, 1400, 360, 18);
    ctx.fillStyle = '#0b0b0d'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#1f1f22'; ctx.stroke();
    ctx.font = `18px ${MONO}`; ctx.fillStyle = DIM;
    ctx.fillText('RELEASE · checkin-more v1.8', 300, 224);
    for (let i = 0; i < 3; i++) link(i, t);
    for (let i = 0; i < 4; i++) node(i, t);

    ctx.textAlign = 'center';
    ctx.font = `600 40px ${SANS}`;
    if (t < WAIT_START) {
      ctx.fillStyle = PURPLE;
      ctx.fillText('Agent working', W / 2, 500);
    } else if (t < CLICK) {
      ctx.fillStyle = AMBER;
      ctx.fillText('Waiting on human' + '.'.repeat(Math.floor(t * 2) % 4), W / 2, 500);
    } else {
      ctx.globalAlpha = base * ease(seg(t, CLICK + .2, .4));
      ctx.fillStyle = TEXT;
      ctx.fillText(`Agent: 3 minutes. Human: 3 hours and ${ACTIONS} clicks.`, W / 2, 500);
      ctx.globalAlpha = base;
    }
    ctx.textAlign = 'left';

    // Bottom panel: the agent's log, then the manual steps once the human shows up.
    rr(ctx, 260, 565, 1400, 285, 18);
    ctx.fillStyle = '#070708'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#1f1f22'; ctx.stroke();
    const swap = ease(seg(t, HUMAN - .3, .35));
    if (swap < 1) {
      ctx.globalAlpha = base * (1 - swap);
      LOG.filter(([at]) => t >= at).forEach(([at, s, text, color], i) => {
        const y = 616 + i * 48;
        ctx.globalAlpha = base * (1 - swap) * ease(seg(t, at, .25));
        ctx.font = `24px ${MONO}`;
        ctx.fillStyle = DIM; ctx.fillText(clock(s), 300, y);
        ctx.beginPath(); ctx.arc(452, y - 8, 6, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
        ctx.fillStyle = color === GRAY ? GRAY : '#c9c9c9';
        ctx.fillText(text, 476, y);
      });
    }
    if (swap > 0) {
      ctx.globalAlpha = base * swap;
      ctx.font = `18px ${MONO}`; ctx.fillStyle = DIM;
      ctx.fillText('MANUAL STEPS · the vendor portal has no API', 300, 606);
      MANUAL.forEach(([label, kind], i) => manualStep(i, label, kind, t));
      // The human's cursor works down the list.
      const cur = Math.min(MANUAL.length - 1, Math.max(0, Math.floor((t - HUMAN - .3) / STEP_DUR)));
      const from = stepPos(Math.max(0, cur - 1)), to = stepPos(cur);
      const m = easeIO(seg(t, stepStart(cur) - .05, .3));
      const px = lerp(from.x, to.x, cur === 0 ? 1 : m), py = lerp(from.y, to.y, cur === 0 ? 1 : m);
      for (let i = 0; i < MANUAL.length; i++) {
        const p = stepPos(i);
        ripple(ctx, p.x, p.y, seg(t, stepEnd(i) - .1, .45));
      }
      if (t < CLICK + .6) pointer(ctx, px, py, 1.05);
    }
    ctx.globalAlpha = base;
  }

  return { loop: LOOP, still: 13.5, draw };
};

const stepStart = (i: number) => HUMAN + .3 + i * STEP_DUR;
const stepEnd = (i: number) => stepStart(i) + STEP_DUR;
const COL_X = [300, 980], ROW_Y = 652, ROW_H = 44, COL_W = 640;
function stepPos(i: number) {
  const c = Math.floor(i / 5), r = i % 5;
  return { x: COL_X[c] + COL_W - 60, y: ROW_Y + r * ROW_H - 6 };
}

export default friction;
