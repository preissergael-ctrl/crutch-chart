// Pattern strip: one cell per step of the chosen strum or picking pattern.
// Returns { el, setStep(index|null) } so the view can light up the step that is sounding.
import { h } from '../dom.js';

const STRUM = { D: '↓', U: '↑', '-': '·', X: '×' };
const STRUM_WORD = { D: 'down', U: 'up', '-': 'rest', X: 'muted' };

function cellText(step, kind) {
  if (kind === 'strum') return STRUM[step] ?? step;
  return step.every((s) => s === '-') ? '·' : step.join('+');
}
function cellWord(step, kind) {
  if (kind === 'strum') return STRUM_WORD[step] ?? step;
  return step.every((s) => s === '-') ? 'rest' : `strings ${step.join(' and ')}`;
}

export function renderPatternStrip(pattern, kind) {
  const cells = pattern.steps.map((step, i) =>
    h('li', { class: `pstep${(kind === 'strum' ? step === '-' : step.every((s) => s === '-')) ? ' rest' : ''}`, 'aria-label': `Step ${i + 1}: ${cellWord(step, kind)}` },
      h('span', { 'aria-hidden': 'true' }, cellText(step, kind))));
  const legend = kind === 'strum'
    ? '↓ down strum, ↑ up strum, × muted hit, · rest.'
    : 'B is the lowest string the chord shape plays, and A the next one up. 1 is the highest string it plays, 2 and 3 the next two down. + means together.';
  const el = h('div', { class: 'pattern' },
    h('ol', { class: `pstrip grid-${pattern.grid}`, 'aria-label': `${pattern.name} pattern` }, cells),
    h('p', { class: 'pattern-legend' }, legend));
  let at = -1;
  return {
    el,
    setStep(i) {
      if (at === i) return;
      if (at >= 0 && cells[at]) cells[at].classList.remove('on');
      at = i === null || i === undefined ? -1 : i;
      if (at >= 0 && cells[at]) cells[at].classList.add('on');
    },
  };
}
