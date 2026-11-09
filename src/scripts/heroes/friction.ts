/**
 * "If AI Can't Do It, It's a Bottleneck": the agent tears through its steps in
 * minutes, then the pipeline sits on the one step that needs a human for hours.
 */
import {
  AMBER, DIM, GRAY, GREEN, MONO, P, PURPLE, SANS, TEXT, W,
  check, clear, ease, easeIO, hud, lerp, loopAlpha, pad2, pointer, rr, ripple, seg, spinner,
  type HeroFactory,
} from './kit';

const LOOP = 13;
const STEPS = ['write code', 'run tests', 'deploy preview', 'approve in vendor portal'];
const NODE_X = [550, 817, 1083, 1359], NODE_Y = 345, R = 57;
const START = .6, STEP = 1.1, WORK = .9;
const WAIT_START = START + 3 * STEP + .1; // 4.0
const CLICK = 10.8;
const AGENT_SECONDS = 193, WAIT_SECONDS = 11787; // 3m 13s of work, 3h 16m 27s of waiting
const BASE = 14 * 3600 + 2 * 60 + 7; // 14:02:07

const LOG: [number, number, string, string][] = [
  // [shown at, clock seconds after BASE, text, color]
  [1.5, 44, 'agent  wrote 14 files (+612 −88)', GREEN],
  [2.6, 111, 'agent  214 tests passed', GREEN],
  [3.7, 192, 'agent  preview deployed', GREEN],
  [4.0, 193, 'agent  blocked: release needs a click in the vendor portal (no API)', AMBER],
  [5.6, 193 + 1800, 'agent  pinged you', GRAY],
  [7.4, 193 + 5400, 'agent  pinged you again', GRAY],
  [9.0, 193 + 9900, 'agent  still waiting', GRAY],
  [10.8, 193 + WAIT_SECONDS, 'human  clicked "Approve"', TEXT],
  [11.1, 195 + WAIT_SECONDS, 'agent  released', GREEN],
];

const clock = (s: number) => {
  const x = BASE + s;
  return `${pad2(x / 3600)}:${pad2((x % 3600) / 60)}:${pad2(x % 60)}`;
};
const dur = (s: number) => s >= 3600
  ? `${Math.floor(s / 3600)}h ${pad2((s % 3600) / 60)}m`
  : `${Math.floor(s / 60)}m ${pad2(s % 60)}s`;

// Waiting time follows the log's clock, so the counter and the timestamps agree.
const WAIT_KEYS: [number, number][] = [[WAIT_START, 0], [5.6, 1800], [7.4, 5400], [9.0, 9900], [CLICK, WAIT_SECONDS]];
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

  function draw(t: number) {
    clear(ctx);
    ctx.globalAlpha = loopAlpha(t, LOOP);
    const base = ctx.globalAlpha;

    // HUD: agent time freezes when it hits the human step, waiting time takes off.
    const agent = AGENT_SECONDS * seg(t, START, WAIT_START - START);
    const waiting = waitedAt(t);
    hud(ctx, 'AGENT TIME', dur(agent), 260, 84, t < WAIT_START ? PURPLE : TEXT);
    hud(ctx, 'WAITING ON HUMAN', dur(waiting), W - 260, 84, waiting > 0 ? AMBER : DIM, 'right');

    // Pipeline card.
    rr(ctx, 260, 190, 1400, 380, 18);
    ctx.fillStyle = '#0b0b0d'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#1f1f22'; ctx.stroke();
    ctx.font = `18px ${MONO}`; ctx.fillStyle = DIM;
    ctx.fillText('RELEASE · checkin-more v1.8', 300, 236);
    for (let i = 0; i < 3; i++) link(i, t);
    for (let i = 0; i < 4; i++) node(i, t);

    ctx.textAlign = 'center';
    ctx.font = `600 40px ${SANS}`;
    if (t < WAIT_START) {
      ctx.fillStyle = PURPLE;
      ctx.fillText('Agent working', W / 2, 525);
    } else if (t < CLICK) {
      ctx.fillStyle = AMBER;
      ctx.fillText('Waiting on human' + '.'.repeat(Math.floor(t * 2) % 4), W / 2, 525);
    } else {
      ctx.globalAlpha = base * ease(seg(t, CLICK + .2, .4));
      ctx.fillStyle = TEXT;
      ctx.fillText('3 minutes of work. 3 hours of waiting.', W / 2, 525);
      ctx.globalAlpha = base;
    }
    ctx.textAlign = 'left';

    // Log.
    rr(ctx, 260, 600, 1400, 250, 18);
    ctx.fillStyle = '#070708'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#1f1f22'; ctx.stroke();
    const shown = LOG.filter(([at]) => t >= at);
    const rows = shown.slice(-4);
    rows.forEach(([at, s, text, color], i) => {
      const y = 656 + i * 50;
      ctx.globalAlpha = base * ease(seg(t, at, .25));
      ctx.font = `24px ${MONO}`;
      ctx.fillStyle = DIM; ctx.fillText(clock(s), 300, y);
      ctx.beginPath(); ctx.arc(452, y - 8, 6, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
      ctx.fillStyle = color === GRAY ? GRAY : color === TEXT ? TEXT : '#c9c9c9';
      ctx.fillText(text, 476, y);
    });
    ctx.globalAlpha = base;

    // The human finally shows up.
    if (t > CLICK - 1 && t < CLICK + 1.2) {
      const p = easeIO(seg(t, CLICK - 1, .9));
      const x = lerp(1820, NODE_X[3] + 8, p), y = lerp(1060, NODE_Y + 10, p);
      ctx.globalAlpha = base * (1 - seg(t, CLICK + .7, .5));
      ripple(ctx, NODE_X[3] + 8, NODE_Y + 10, seg(t, CLICK, .5));
      pointer(ctx, x, y, 1.3);
      ctx.globalAlpha = base;
    }
  }

  return { loop: LOOP, still: 12, draw };
};

export default friction;
