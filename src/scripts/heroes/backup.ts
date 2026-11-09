/**
 * "Just Set Up Offsite Backups Already": the nightly Railway cron dumps Postgres and
 * the media bucket, encrypts everything with age, writes it to Azure, pings Better
 * Stack, and the storage account turns away anyone trying to read it back.
 */
import {
  DIM, GRAY, GREEN, MONO, P, PURPLE, RED, SANS, TEXT, W, H,
  ease, icon, loopAlpha, rr, seg, spinner,
  type HeroFactory,
} from './kit';

const LOOP = 14;
const RUN = 2.0, DONE = 6.0;
const OLD_ROWS: [string, string][] = [
  ['db/2026-11/cedarmingle-2026-11-08.dump.age', '14.2 MB'],
  ['db/2026-11/cedarmingle-2026-11-07.dump.age', '14.1 MB'],
  ['bucket/photos/9f3c…a1.jpg.age', '412 KB'],
  ['bucket/photos/b72e…0d.jpg.age', '388 KB'],
  ['db/2026-11/cedarmingle-2026-11-06.dump.age', '14.1 MB'],
];
const NEW_ROWS: [number, string, string][] = [
  [5.2, 'bucket/photos/3a9d…e2.jpg.age', '402 KB'],
  [4.4, 'db/2026-11/cedarmingle-2026-11-09.dump.age', '14.3 MB'],
];
const LOG: [number, string, string, string, string, string][] = [
  // [at, time, method, path, status, note]
  [4.4, '08:30:04', 'PUT', 'db/…-11-09.dump.age', '201', 'railway'],
  [5.2, '08:30:06', 'PUT', 'bucket/…3a9d.jpg.age', '201', 'railway'],
  [7.6, '08:41:17', 'LIST', 'backups/', '403', 'IP not allowed'],
  [9.0, '08:41:52', 'GET', 'db/…-11-08.dump.age', '403', 'SAS is write-only'],
  [10.4, '08:42:30', 'DELETE', 'db/…-11-08.dump.age', '403', 'SAS is write-only'],
];
const ATTACKS = LOG.filter((l) => l[4] === '403').map((l) => l[0]);

type Pt = [number, number];
const bez = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, u: number): Pt => {
  const v = 1 - u;
  return [
    v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
    v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1],
  ];
};
const PATH_DB: [Pt, Pt, Pt, Pt] = [[500, 366], [565, 366], [540, 570], [600, 570]];
const PATH_MEDIA: [Pt, Pt, Pt, Pt] = [[500, 796], [565, 796], [540, 630], [600, 630]];
const PATH_OUT: [Pt, Pt, Pt, Pt] = [[980, 590], [1010, 590], [1010, 458], [1060, 458]];

const backup: HeroFactory = (ctx, assets) => {
  const node = (x: number, y: number, w: number, h: number, border = '#2a2a2e', glow = 0) => {
    ctx.save();
    if (glow > 0) { ctx.shadowColor = `rgba(${P},${.5 * glow})`; ctx.shadowBlur = 40 * glow; }
    rr(ctx, x, y, w, h, 10); ctx.fillStyle = '#141417'; ctx.fill();
    ctx.restore();
    rr(ctx, x, y, w, h, 10); ctx.lineWidth = 2; ctx.strokeStyle = border; ctx.stroke();
  };
  const status = (x: number, y: number, color: string, text: string, textColor = GRAY) => {
    ctx.beginPath(); ctx.arc(x, y - 8, 6, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    ctx.font = `24px ${SANS}`; ctx.fillStyle = textColor; ctx.fillText(text, x + 20, y);
  };
  const curve = (p: [Pt, Pt, Pt, Pt], active: boolean) => {
    ctx.beginPath(); ctx.moveTo(...p[0]); ctx.bezierCurveTo(...p[1], ...p[2], ...p[3]);
    ctx.setLineDash([7, 7]);
    ctx.lineWidth = 2; ctx.strokeStyle = active ? 'rgba(140,92,245,.7)' : '#3a3a40';
    ctx.stroke(); ctx.setLineDash([]);
  };

  function draw(t: number) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0b0b0d'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = loopAlpha(t, LOOP);
    const base = ctx.globalAlpha;
    ctx.fillStyle = '#1a1a1f';
    for (let y = 16; y < H; y += 32) for (let x = 16; x < W; x += 32) ctx.fillRect(x, y, 2, 2);

    // Project header.
    icon(ctx, assets.railway, 70, 56, 38);
    ctx.font = `30px ${SANS}`; ctx.fillStyle = '#c9c9cf'; ctx.fillText('cedarmingle', 122, 86);
    const pw = 122 + ctx.measureText('cedarmingle  ').width;
    ctx.fillStyle = DIM; ctx.fillText('/', pw, 86);
    ctx.fillStyle = '#c9c9cf'; ctx.fillText('production', pw + ctx.measureText('/  ').width, 86);

    // Everything below the header sits higher so the post title never covers it.
    ctx.save();
    ctx.translate(0, -130);
    const running = t >= RUN && t < DONE;
    curve(PATH_DB, running);
    curve(PATH_MEDIA, running);

    // Sources.
    node(120, 300, 380, 132);
    icon(ctx, assets.postgres, 150, 324, 36);
    ctx.font = `600 31px ${SANS}`; ctx.fillStyle = TEXT; ctx.fillText('Postgres', 200, 356);
    status(156, 402, GREEN, 'Online');
    node(120, 730, 380, 132);
    icon(ctx, assets.bucket, 150, 756, 34);
    ctx.font = `600 31px ${SANS}`; ctx.fillStyle = TEXT; ctx.fillText('media-bucket', 200, 786);
    status(156, 832, GREEN, 'Online');

    // Plaintext chunks flow into the backup job.
    const chunk = (path: [Pt, Pt, Pt, Pt], start: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const u = seg(t, start + i * .22, .7);
        if (u <= 0 || u >= 1) continue;
        const [x, y] = bez(...path, ease(u));
        ctx.globalAlpha = base * Math.min(1, (1 - u) * 6);
        rr(ctx, x - 9, y - 7, 18, 14, 3); ctx.fillStyle = '#d6d6dc'; ctx.fill();
      }
      ctx.globalAlpha = base;
    };
    chunk(PATH_DB, RUN + .1, 7);
    chunk(PATH_MEDIA, RUN + .7, 6);

    // Backup job.
    const glow = running ? .6 + .4 * Math.sin(t * 5) : 0;
    node(600, 510, 380, 178, PURPLE, glow);
    icon(ctx, assets.clock, 630, 534, 34);
    ctx.font = `600 31px ${SANS}`; ctx.fillStyle = TEXT; ctx.fillText('backup', 680, 565);
    ctx.font = `22px ${MONO}`; ctx.fillStyle = '#7a7a82'; ctx.fillText('Cron 30 8 * * *', 630, 612);
    if (t < RUN) {
      status(636, 660, '#7a7a82', `Next run in 0:00:0${Math.ceil(RUN - t)}`);
    } else if (running) {
      spinner(ctx, 636, 652, 8, t, PURPLE, 3);
      const stage = t < 3.3 ? 'pg_dump | age' : t < 4.2 ? 'encrypting media' : 'uploading';
      ctx.font = `24px ${SANS}`; ctx.fillStyle = '#b9a6f0'; ctx.fillText(`Running: ${stage}`, 656, 660);
    } else status(636, 660, GREEN, 'Last run succeeded');

    // Encrypted chunks leave for Azure.
    ctx.beginPath(); ctx.moveTo(980, 590); ctx.lineTo(1030, 590);
    ctx.lineWidth = 2; ctx.strokeStyle = PURPLE; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1026, 582); ctx.lineTo(1036, 590); ctx.lineTo(1026, 598); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const u = seg(t, RUN + .9 + i * .3, .6);
      if (u <= 0 || u >= 1) continue;
      const [x, y] = bez(...PATH_OUT, ease(u));
      ctx.globalAlpha = base * Math.min(1, (1 - u) * 5, u * 5);
      rr(ctx, x - 16, y - 16, 32, 32, 7); ctx.fillStyle = '#1b1430'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = PURPLE; ctx.stroke();
      icon(ctx, assets.lock, x - 11, y - 11, 22);
    }
    ctx.globalAlpha = base;

    // Better Stack heartbeat once the run finishes.
    const hb = ease(seg(t, DONE + .2, .4));
    if (hb > 0) {
      ctx.globalAlpha = base * hb;
      node(600, 724, 380, 72);
      icon(ctx, assets.betterstack, 624, 744, 32);
      ctx.font = `24px ${SANS}`; ctx.fillStyle = TEXT; ctx.fillText('Heartbeat', 672, 769);
      // EKG trace that pulses once a second.
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const x = 800 + i * 1.3, ph = ((i / 120) * 2 - ((t - DONE) % 1) * 2 + 4) % 2;
        const y = 760 - (ph > .9 && ph < 1 ? (ph - .9) * 260 : ph >= 1 && ph < 1.1 ? (1.1 - ph) * 260 - 13 : 0);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.lineWidth = 2.5; ctx.strokeStyle = GREEN; ctx.stroke();
      ctx.globalAlpha = base;
    }

    // Azure container.
    const hit = ATTACKS.reduce((m, a) => (t >= a ? Math.max(m, 1 - seg(t, a, .9)) : m), 0);
    rr(ctx, 1040, 340, 760, 405, 12); ctx.fillStyle = '#0f0f12'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = hit > 0 ? `rgba(255,77,79,${.25 + .75 * hit})` : '#2a2a2e'; ctx.stroke();
    icon(ctx, assets.azure, 1068, 364, 38);
    ctx.font = `600 31px ${SANS}`; ctx.fillStyle = TEXT; ctx.fillText('backups', 1120, 395);
    const bw = ctx.measureText('backups ').width;
    ctx.font = `25px ${SANS}`; ctx.fillStyle = GRAY; ctx.fillText('/ Azure Blob Storage', 1120 + bw, 395);
    ctx.save();
    ctx.beginPath(); ctx.rect(1040, 426, 760, 317); ctx.clip();
    const rows: { name: string; size: string; at: number }[] = [
      ...NEW_ROWS.map(([at, name, size]) => ({ name, size, at })),
      ...OLD_ROWS.map(([name, size]) => ({ name, size, at: -1 })),
    ];
    // New rows grow in at the top and push the older ones down.
    let y = 426;
    for (const r of rows) {
      const a = r.at < 0 ? 1 : ease(seg(t, r.at, .45));
      if (a <= 0) continue;
      ctx.globalAlpha = base * a;
      const ry = y - 64 * (1 - a);
      const fresh = r.at >= 0 ? 1 - seg(t, r.at + .6, 1.6) : 0;
      if (fresh > 0) { ctx.fillStyle = `rgba(${P},${.16 * fresh})`; ctx.fillRect(1041, ry, 758, 64); }
      ctx.beginPath(); ctx.moveTo(1040, ry); ctx.lineTo(1800, ry); ctx.strokeStyle = '#222226'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = `22px ${MONO}`; ctx.fillStyle = r.at >= 0 ? TEXT : '#c9c9cf'; ctx.fillText(r.name, 1070, ry + 40);
      ctx.textAlign = 'right'; ctx.fillStyle = GRAY; ctx.fillText(r.size, 1770, ry + 40); ctx.textAlign = 'left';
      if (r.at >= 0) {
        const up = seg(t, r.at, .6);
        if (up < 1) { ctx.fillStyle = PURPLE; ctx.fillRect(1040, ry + 61, 760 * up, 3); }
      }
      y += 64 * a;
    }
    ctx.restore();
    ctx.globalAlpha = base;

    // Storage access log.
    rr(ctx, 1040, 780, 760, 200, 12); ctx.fillStyle = '#09090b'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#222226'; ctx.stroke();
    ctx.font = `18px ${MONO}`; ctx.fillStyle = DIM; ctx.fillText('STORAGE ACCESS LOG', 1068, 816);
    const shown = LOG.filter((l) => t >= l[0]).slice(-3);
    shown.forEach(([at, time, method, path, code, note], i) => {
      const ly = 860 + i * 40;
      ctx.globalAlpha = base * ease(seg(t, at, .25));
      const bad = code === '403';
      ctx.font = `20px ${MONO}`;
      ctx.fillStyle = DIM; ctx.fillText(time, 1068, ly);
      ctx.fillStyle = bad ? '#ff8a8b' : '#c9c9cf'; ctx.fillText(method, 1180, ly);
      ctx.fillStyle = '#a0a0a8'; ctx.fillText(path, 1262, ly);
      ctx.fillStyle = bad ? RED : GREEN; ctx.fillText(code, 1528, ly);
      ctx.fillStyle = bad ? '#ff8a8b' : DIM; ctx.fillText(note, 1580, ly);
    });
    ctx.globalAlpha = base;

    // Each rejected request flashes a 403 on the container.
    const last = [...ATTACKS].reverse().find((a) => t >= a);
    if (last !== undefined) {
      const a = 1 - seg(t, last + 1.1, .4), pop = 1 + .15 * Math.sin(Math.PI * seg(t, last, .2));
      if (a > 0) {
        ctx.globalAlpha = base * a * ease(seg(t, last, .15));
        ctx.save(); ctx.translate(1700, 380); ctx.scale(pop, pop);
        rr(ctx, -70, -24, 140, 48, 24); ctx.fillStyle = 'rgba(255,77,79,.14)'; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,77,79,.7)'; ctx.stroke();
        icon(ctx, assets.lockRed, -56, -14, 28);
        ctx.font = `600 24px ${MONO}`; ctx.fillStyle = RED; ctx.fillText('403', -16, 9);
        ctx.restore();
        ctx.globalAlpha = base;
      }
    }
    ctx.restore();
  }

  return { loop: LOOP, still: 10.8, draw };
};

export default backup;
