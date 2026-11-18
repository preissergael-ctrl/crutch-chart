// Method tools (#/method/<id>[?t=&m=&r=]): nine small interactive tools, one shared page shell.
import { METHODS } from '../../content/methods.js';
import { routeHash } from '../router.js';
import { h, icon } from '../dom.js';
import { createSound } from './methods/shared.js';
import { familyTool } from './methods/family.js';
import { rotateTool, tensionTool, borrowTool, spiceTool } from './methods/bases.js';
import { loopsTool, circleTool, modesTool, bassTool } from './methods/more.js';

const TOOLS = {
  family: familyTool, loops: loopsTool, rotate: rotateTool, tension: tensionTool, circle: circleTool,
  borrow: borrowTool, modes: modesTool, spice: spiceTool, bass: bassTool,
};

let sound = null;
function cleanup() {
  if (sound) sound.destroy();
  sound = null;
}

function unknown() {
  return h('div', { class: 'page notice' },
    h('h1', { tabindex: '-1' }, 'We couldn\u2019t find that method'),
    h('p', { class: 'lede' }, 'The link may be old or mistyped. All the methods are on the Find screen.'),
    h('p', {}, h('a', { class: 'button', href: routeHash('find') }, 'Back to Find')));
}

export const methodView = {
  render(params, ctx) {
    cleanup();
    const method = METHODS.find((m) => m.id === params.id);
    if (!method || !Object.hasOwn(TOOLS, method.id)) return unknown();
    sound = createSound(ctx);
    return h('div', { class: 'page method' },
      h('a', { class: 'back', href: routeHash('find') }, icon('back'), 'Find'),
      h('header', { class: 'page-head' },
        h('h1', { tabindex: '-1' }, method.name),
        h('p', { class: 'lede' }, method.summary),
        h('p', { class: 'learn-link' }, h('a', { href: routeHash('learn', { id: method.lessonId }) }, 'Learn why'))),
      TOOLS[method.id](ctx, sound, params),
      sound.note);
  },
  destroy: cleanup,
};
