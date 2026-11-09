/** Icons each hero draws, as [iconify set, icon name, color]. Turned into data URIs at build time. */
export const heroIcons: Record<string, Record<string, [string, string, string]>> = {
  'backup-flow': {
    railway: ['simple-icons', 'railway', '#ffffff'],
    postgres: ['simple-icons', 'postgresql', '#e6e6e6'],
    azure: ['simple-icons', 'microsoftazure', '#0089d6'],
    betterstack: ['simple-icons', 'betterstack', '#e6e6e6'],
    clock: ['lucide', 'clock', '#e6e6e6'],
    bucket: ['lucide', 'cylinder', '#e6e6e6'],
    lock: ['lucide', 'lock', '#8c5cf5'],
    lockRed: ['lucide', 'lock', '#ff4d4f'],
  },
};

import { icons as lucide } from '@iconify-json/lucide';
import { icons as simpleIcons } from '@iconify-json/simple-icons';
import { getIconData, iconToSVG } from '@iconify/utils';

/** Data URIs for a hero's icons, keyed by the names its drawing code uses. */
export function heroIconUris(hero: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, [set, name, color]] of Object.entries(heroIcons[hero] ?? {})) {
    const data = getIconData(set === 'lucide' ? lucide : simpleIcons, name);
    if (!data) throw new Error(`Unknown hero icon ${set}:${name}`);
    const { attributes, body } = iconToSVG(data, { height: 96 });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="${attributes.viewBox}" color="${color}">${body}</svg>`;
    out[key] = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
  return out;
}
