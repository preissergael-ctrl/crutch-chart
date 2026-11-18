// About: what the app is, and the sound credit.
import { routeHash } from '../router.js';
import { h, icon } from '../dom.js';

export const CREDIT = 'Guitar sound: FluidR3_GM by Frank Wen, via gleitz/midi-js-soundfonts, CC BY 3.0.';

export const aboutView = {
  render() {
    return h('div', { class: 'page about' },
      h('a', { class: 'back', href: routeHash('saved') }, icon('back'), 'Saved'),
      h('header', { class: 'page-head' },
        h('h1', { tabindex: '-1' }, 'About Crutch Chart'),
        h('p', { class: 'about-quote' }, 'A crutch to express myself while I learn to walk.')),
      h('p', { class: 'lede' }, 'Crutch Chart helps you find chord progressions by mood, see why they work, and play them on guitar. It works without internet once it has opened, and your saved progressions stay on this phone.'),
      h('section', { class: 'section', 'aria-labelledby': 'credits-title' },
        h('h2', { id: 'credits-title' }, 'Credits'),
        h('p', { class: 'credit' }, CREDIT)));
  },
};
