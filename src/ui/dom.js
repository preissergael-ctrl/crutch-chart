// Small DOM and display helpers shared by the views.

// h('a', { class: 'x', href: '#/find' }, 'text', child, [more])
export function h(tag, attrs = {}, ...children) {
  const svg = tag === 'svg' || tag === 'path' || tag === 'circle' || tag === 'rect' || tag === 'line';
  const el = svg ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v === null || v === undefined) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  const add = (c) => {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  };
  children.forEach(add);
  return el;
}

// Code uses ASCII accidentals; the screen shows the real symbols.
//   'Bb' -> 'B♭', 'F#m' -> 'F♯m', 'Bm7b5' -> 'Bm7♭5', 'G/Bb' -> 'G/B♭'
export const prettyChord = (sym) =>
  String(sym).replace(/([A-G])b/g, '$1♭').replace(/b(\d)/g, '♭$1').replace(/#/g, '♯');

//   'bVII' -> '♭VII', '#iv°' -> '♯iv°'
export const prettyRoman = (r) => String(r).replace(/^b/, '♭').replace(/^#/, '♯');

// The first sentence of a longer text.
export const firstSentence = (text) => {
  const m = /^.*?[.!?](?=\s|$)/.exec(String(text));
  return m ? m[0] : String(text);
};

const ICONS = {
  back: 'M14.5 6l-6 6 6 6',
  next: 'M9.5 6l6 6-6 6',
};

export function icon(name, cls = 'icon') {
  return h('svg', { class: cls, viewBox: '0 0 24 24', 'aria-hidden': 'true' }, h('path', { d: ICONS[name] }));
}
