/**
 * "The Ensloppification of Consumer Software": a nine-step sign-in. Fields fill,
 * codes don't arrive, cookies get accepted, and the last step just says "Error."
 */
import {
  DIM, GRAY, MONO, RED, SANS, TEXT,
  check, clear, ease, easeIO, hud, lerp, loopAlpha, pad2, pointer, rr, ripple, seg,
  type HeroFactory,
} from './kit';

const LOOP = 17;
const CW = 400, CH = 290, DX = 280, DY = 86, X0 = 100, Y0 = 60;

type Kind = 'input' | 'password' | 'code' | 'cookies' | 'terms' | 'final';
type Step = { title: string; kind: Kind; fill?: string; btn: string; secs: number; dur: number; fillAt: [number, number]; clicks: number[] };
const step = (title: string, kind: Kind, btn: string, secs: number, fill = '', extra: Partial<Step> = {}): Step =>
  ({ title, kind, btn, secs, fill, dur: 1.35, fillAt: [.3, .8], clicks: [1.05], ...extra });

const STEPS: Step[] = [
  step('Email', 'input', 'Next', 8, 'me@example.com'),
  step('Password', 'password', 'Sign in', 5, '••••••••••••'),
  step('Email code', 'code', 'Verify', 240, '482913', { dur: 3.1, fillAt: [1.8, 2.4], clicks: [1.6, 2.8] }),
  step('Phone code', 'code', 'Verify', 40, '771046'),
  step("Mother's maiden name", 'input', 'Continue', 12, 'Smith'),
  step("First pet's name", 'input', 'Continue', 9, 'Biscuit'),
  step('We value your privacy', 'cookies', 'Accept all', 4),
  step('Updated Terms of Service', 'terms', 'Continue', 6),
  step('Confirm your details', 'final', 'Submit', 5, '(555) 010 4477', { dur: 3 }),
];
let acc = .4;
const START = STEPS.map((s) => { const a = acc; acc += s.dur; return a; });
const CLICKS = STEPS.flatMap((s, k) => s.clicks.map((c) => ({ at: START[k] + c, k })));
const ERROR_AT = START[8] + 1.2;

const world = (k: number) => ({ x: X0 + k * DX, y: Y0 + k * DY });
const camera = (t: number) => {
  let c = 0;
  START.forEach((s, k) => { if (k > 5) c += easeIO(seg(t, s - .2, .6)); });
  return { x: -c * DX, y: -c * DY };
};
const target = (k: number, t: number) => {
  const w = world(k), c = camera(t);
  return { x: w.x + c.x + CW / 2 + 40, y: w.y + c.y + 196 + 30 };
};

const signin: HeroFactory = (ctx) => {
  function card(k: number, t: number, active: number) {
    const s = STEPS[k], u = t - START[k];
    if (u < 0) return;
    const c = camera(t), w = world(k);
    const enter = ease(seg(u, 0, .35));
    const x = w.x + c.x + (1 - enter) * 60, y = w.y + c.y + (1 - enter) * 30;
    if (x > 1920 || y > 1080 || x + CW < 0 || y + CH < 0) return;
    const base = ctx.globalAlpha;
    ctx.globalAlpha = base * enter;
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
    rr(ctx, 0, 0, CW, CH, 18); ctx.fillStyle = '#101014'; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#25252b'; ctx.stroke();

    ctx.font = `600 17px ${SANS}`; ctx.fillStyle = '#6b6f7a';
    (ctx as any).letterSpacing = '1.5px';
    ctx.fillText(`STEP ${k + 1} OF 9`, 36, 50);
    (ctx as any).letterSpacing = '0px';
    ctx.font = `600 29px ${SANS}`; ctx.fillStyle = TEXT; ctx.fillText(s.title, 36, 90);

    const fp = seg(u, s.fillAt[0], s.fillAt[1] - s.fillAt[0]);
    const clicked = s.clicks.map((cl) => u >= cl);
    const done = clicked[clicked.length - 1];
    const field = (text: string, err = false) => {
      rr(ctx, 36, 118, 328, 56, 10); ctx.fillStyle = '#0a0a0d'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = err ? RED : fp > 0 && fp < 1 ? '#5b5f6b' : '#2c2c33'; ctx.stroke();
      ctx.font = `24px ${SANS}`; ctx.fillStyle = '#c9c9cf';
      ctx.fillText(text.slice(0, Math.round(text.length * fp)), 54, 155);
    };
    if (s.kind === 'input' || s.kind === 'password') field(s.fill!);
    if (s.kind === 'code') {
      for (let i = 0; i < 6; i++) {
        const bx = 36 + i * 56;
        rr(ctx, bx, 118, 44, 56, 8); ctx.fillStyle = '#0a0a0d'; ctx.fill();
        const on = fp * 6 > i;
        ctx.lineWidth = 1.5; ctx.strokeStyle = on ? '#5b5f6b' : '#2c2c33'; ctx.stroke();
        if (on) { ctx.font = `600 26px ${MONO}`; ctx.fillStyle = TEXT; ctx.textAlign = 'center'; ctx.fillText(s.fill![i], bx + 22, 155); ctx.textAlign = 'left'; }
      }
    }
    if (s.kind === 'cookies') {
      ctx.font = `20px ${SANS}`; ctx.fillStyle = GRAY;
      ctx.fillText('We and our 847 partners use cookies', 36, 134);
      ctx.fillText('to personalize your experience.', 36, 162);
    }
    if (s.kind === 'terms') {
      rr(ctx, 36, 128, 30, 30, 6);
      const on = fp >= 1;
      ctx.fillStyle = on ? '#e6e6e6' : '#0a0a0d'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = on ? '#e6e6e6' : '#3a3a42'; ctx.stroke();
      if (on) check(ctx, 51, 143, 14, '#101014', 3.5);
      ctx.font = `21px ${SANS}`; ctx.fillStyle = '#c9c9cf'; ctx.fillText('I agree to the updated Terms', 80, 151);
    }
    const errored = s.kind === 'final' && t >= ERROR_AT;
    if (s.kind === 'final') {
      if (errored) {
        const a = ease(seg(t, ERROR_AT, .25));
        rr(ctx, 36, 118, 328, 56, 10);
        ctx.fillStyle = `rgba(255,77,79,${.12 * a})`; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = `rgba(255,77,79,${.3 + .5 * a})`; ctx.stroke();
        ctx.font = `600 26px ${SANS}`; ctx.fillStyle = RED; ctx.fillText('Error.', 54, 155);
      } else field(s.fill!);
    }

    // Button. The email-code step makes you wait before you can even resend.
    let label = s.btn, disabled = false;
    if (s.kind === 'code' && s.clicks.length > 1 && !clicked[0]) {
      const left = Math.max(0, Math.ceil(59 * (1 - seg(u, .35, 1.1))));
      disabled = left > 0;
      label = disabled ? `Resend code in 0:${pad2(left)}` : 'Resend code';
    }
    const press = s.clicks.some((cl) => u >= cl && u < cl + .15);
    rr(ctx, 36, 196, 328, 54, 10);
    ctx.fillStyle = errored ? '#2a2a31' : press ? '#3d4250' : disabled ? '#18181d' : done ? '#22252d' : '#2a2f3a'; ctx.fill();
    ctx.font = `600 24px ${SANS}`; ctx.fillStyle = disabled ? DIM : '#d3d6de'; ctx.textAlign = 'center';
    ctx.fillText(label, 200, 231); ctx.textAlign = 'left';

    // Older cards fall back so the current one reads.
    if (k < active) {
      rr(ctx, 0, 0, CW, CH, 18);
      ctx.fillStyle = `rgba(0,0,0,${.45 * ease(seg(t, START[k + 1], .4))})`; ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = base;
  }

  function draw(t: number) {
    clear(ctx);
    ctx.globalAlpha = loopAlpha(t, LOOP);
    const base = ctx.globalAlpha;
    let active = 0;
    START.forEach((s, k) => { if (t >= s) active = k; });
    for (let k = 0; k < STEPS.length; k++) card(k, t, active);

    // HUD in the empty corner above the cascade.
    const clicks = CLICKS.filter((c) => t >= c.at).length;
    let secs = 0;
    STEPS.forEach((s, k) => { secs += s.secs * seg(t, START[k], s.dur); });
    hud(ctx, 'CLICKS', String(clicks), 1400, 84, TEXT, 'right');
    hud(ctx, 'TIME TO SIGN IN', `${Math.floor(secs / 60)}:${pad2(secs % 60)}`, 1820, 84, t >= ERROR_AT ? RED : TEXT, 'right');
    if (t >= ERROR_AT) {
      ctx.globalAlpha = base * ease(seg(t, ERROR_AT + .3, .4));
      ctx.font = `22px ${MONO}`; ctx.fillStyle = DIM; ctx.textAlign = 'right';
      ctx.fillText('the phone number had spaces in it', 1820, 200);
      ctx.textAlign = 'left';
      ctx.globalAlpha = base;
    }

    // Cursor glides from click to click.
    const next = CLICKS.findIndex((c) => t < c.at + .1);
    let px: number, py: number;
    if (next === -1) ({ x: px, y: py } = target(CLICKS[CLICKS.length - 1].k, t));
    else {
      const from = next > 0 ? target(CLICKS[next - 1].k, t) : { x: 1500, y: 1000 };
      const to = target(CLICKS[next].k, t);
      const m = easeIO(seg(t, CLICKS[next].at - .55, .5));
      px = lerp(from.x, to.x, m); py = lerp(from.y, to.y, m);
    }
    const lastClick = [...CLICKS].reverse().find((c) => t >= c.at);
    if (lastClick) { const p = target(lastClick.k, t); ripple(ctx, p.x, p.y, seg(t, lastClick.at, .45)); }
    pointer(ctx, px, py, 1.15);
  }

  return { loop: LOOP, still: ERROR_AT + 1, draw };
};

export default signin;
