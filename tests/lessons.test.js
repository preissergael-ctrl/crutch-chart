import test from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS } from '../src/content/lessons.js';
import { METHODS } from '../src/content/methods.js';
import { STRUMS, PICKS } from '../src/content/patterns.js';
import { progressionChords, diatonicFamily, functionOf, borrowedFrom, KEYS } from '../src/theory/roman.js';
import { scaleNotes, MODE_INFO } from '../src/theory/scales.js';
import { chordNotes, parseChord, CHORD_TYPES } from '../src/theory/chords.js';
import { pc } from '../src/theory/notes.js';
import { ENDINGS, circleChain, borrowOptions, rotations, BASS_WALKS } from '../src/theory/methods.js';
import { generateVoicings } from '../src/guitar/voicings.js';
import { capoHint, isKnown } from '../src/guitar/capo.js';

const IDS = ['reading-the-neck', 'keys', 'chord-numbers', 'home-away-pull', 'major-minor', 'chord-family', 'numbering',
  'rotation', 'endings', 'circle', 'borrowed', 'modes', 'colors', 'slash-chords', 'caged', 'capo', 'strum-and-pick'];
const KNOWN = ['Am', 'F', 'C', 'Dm', 'G'];
const blocks = (id) => LESSONS.find((l) => l.id === id).blocks;
const tries = (id) => blocks(id).filter((b) => b.try).map((b) => b.try);
const names = (r, t) => progressionChords(r, t).map((c) => c.symbol);
const notes = (s) => chordNotes(parseChord(s));
const easiest = (s) => generateVoicings(s)[0];
const text = (id) => blocks(id).filter((b) => b.p).map((b) => b.p).join(' ');

// ---- Required by the brief ----

test('lesson ids are exactly the list, in order', () => {
  assert.deepEqual(LESSONS.map((l) => l.id), IDS);
});

test('every try resolves through progressionChords', () => {
  for (const l of LESSONS) {
    for (const b of l.blocks.filter((x) => x.try)) {
      const { r, t, m, label } = b.try;
      assert.ok(Array.isArray(r) && r.length && typeof label === 'string' && label, `${l.id}: try shape`);
      assert.ok(r.every((x) => /^[A-Za-z#b°ø0-9+/]+$/.test(x) && !/[♭♯]/.test(x)), `${l.id}: ASCII romans`);
      assert.ok(MODE_INFO[m], `${l.id}: mode ${m}`);
      assert.doesNotThrow(() => progressionChords(r, t), `${l.id}: ${r}`);
    }
  }
});

test('every neck symbol has a shape', () => {
  for (const l of LESSONS) {
    for (const b of l.blocks.filter((x) => 'neck' in x)) {
      assert.ok(generateVoicings(b.neck).length > 0, `${l.id}: ${b.neck}`);
    }
  }
});

test('every method lessonId exists, and every method block points at a method', () => {
  for (const m of METHODS) assert.ok(IDS.includes(m.lessonId), m.id);
  for (const l of LESSONS) {
    for (const b of l.blocks.filter((x) => 'method' in x)) assert.ok(METHODS.some((m) => m.id === b.method), `${l.id}: ${b.method}`);
  }
});

test('chord-family has a try that is exactly the C family', () => {
  const family = diatonicFamily('C', 'ionian').map((x) => x.chord.symbol);
  assert.ok(tries('chord-family').some((t) => t.t === 'C' && JSON.stringify(names(t.r, t.t)) === JSON.stringify(family)));
});

test('no paragraph is longer than 400 characters', () => {
  for (const l of LESSONS) for (const b of l.blocks.filter((x) => x.p)) assert.ok(b.p.length <= 400, `${l.id}: ${b.p.length}`);
});

test('every lesson has a title, teaser, a try block and only known block types', () => {
  for (const l of LESSONS) {
    assert.ok(l.title && l.teaser, l.id);
    assert.ok(l.blocks.some((b) => b.try), `${l.id}: no try`);
    for (const b of l.blocks) assert.equal(Object.keys(b).length, 1, l.id);
    for (const b of l.blocks) assert.ok(['p', 'try', 'neck', 'method'].includes(Object.keys(b)[0]), l.id);
  }
});

// ---- Claim tests: every fact a lesson states, checked against the engine ----

test('claim (reading-the-neck): C is x32010 with low E muted; F is a full barre at fret 1 plus three fingers', () => {
  const c = easiest('C');
  assert.deepEqual(c.frets, [null, 3, 2, 0, 1, 0]);
  assert.deepEqual(c.fingers.filter(Boolean), [3, 2, 1]);
  const f = easiest('F');
  assert.deepEqual(f.frets, [1, 3, 3, 2, 1, 1]);
  assert.deepEqual(f.barre, { fret: 1, from: 0, to: 5 });
  assert.equal(new Set(f.fingers.filter((x) => x !== f.fingers[0])).size, 3);
});

test('claim (keys): C major is C D E F G A B; all five known chords use only those notes; A minor shares them', () => {
  assert.deepEqual(scaleNotes('C', 'ionian'), ['C', 'D', 'E', 'F', 'G', 'A', 'B']);
  const scale = scaleNotes('C', 'ionian');
  for (const k of KNOWN) assert.ok(notes(k).every((n) => scale.includes(n)), k);
  assert.deepEqual(scaleNotes('A', 'aeolian'), ['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  assert.deepEqual(names(['I', 'IV', 'V', 'I'], 'C'), ['C', 'F', 'G', 'C']);
});

test('claim (chord-numbers): I..vii° in C, and I–V–vi–IV in C and G', () => {
  assert.deepEqual(diatonicFamily('C', 'ionian').map((x) => `${x.roman}=${x.chord.symbol}`),
    ['I=C', 'ii=Dm', 'iii=Em', 'IV=F', 'V=G', 'vi=Am', 'vii°=Bdim']);
  assert.deepEqual(names(['I', 'V', 'vi', 'IV'], 'C'), ['C', 'G', 'Am', 'F']);
  assert.deepEqual(names(['I', 'V', 'vi', 'IV'], 'G'), ['G', 'D', 'Em', 'C']);
});

test('claim (home-away-pull): I home, IV and ii away, V pull, vi and iii relative', () => {
  assert.equal(functionOf('I'), 'home');
  assert.equal(functionOf('IV'), 'away');
  assert.equal(functionOf('ii'), 'away');
  assert.equal(functionOf('V'), 'pull');
  assert.equal(functionOf('vi'), 'relative');
  assert.equal(functionOf('iii'), 'relative');
});

test('claim (major-minor): C/Cm and Am/A differ only in the middle note, by one fret', () => {
  assert.deepEqual(notes('C'), ['C', 'E', 'G']);
  assert.deepEqual(notes('Cm'), ['C', 'Eb', 'G']);
  assert.deepEqual(notes('Am'), ['A', 'C', 'E']);
  assert.deepEqual(notes('A'), ['A', 'C#', 'E']);
  assert.equal((pc('E') - pc('Eb') + 12) % 12, 1);
  assert.equal((pc('C#') - pc('C') + 12) % 12, 1);
});

test('claim (chord-family): you know 5 of 7; Em and B° are missing; Em presses two frets; B° pulls home', () => {
  const fam = diatonicFamily('C', 'ionian').map((x) => x.chord.symbol);
  assert.deepEqual(fam.filter((s) => isKnown(s, KNOWN)), ['C', 'Dm', 'F', 'G', 'Am']);
  assert.deepEqual(fam.filter((s) => !isKnown(s, KNOWN)), ['Em', 'Bdim']);
  assert.equal(easiest('Em').frets.filter((f) => f > 0).length, 2);
  assert.equal(functionOf('vii°'), 'pull');
});

test('claim (chord-family): every major key has the pattern major minor minor major major minor diminished', () => {
  for (const k of KEYS.major) {
    assert.deepEqual(diatonicFamily(k, 'ionian').map((x) => CHORD_TYPES[x.chord.quality].plain),
      ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'], k);
  }
});

test('claim (numbering): A major has F#, C#, G#; Am F C G is i bVI bIII bVII; classical i VI III VII is the A minor family', () => {
  assert.deepEqual(scaleNotes('A', 'ionian'), ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#']);
  assert.deepEqual(names(['i', 'bVI', 'bIII', 'bVII'], 'A'), ['Am', 'F', 'C', 'G']);
  const fam = diatonicFamily('A', 'aeolian');
  assert.deepEqual(fam.map((x) => x.roman), ['i', 'ii°', 'bIII', 'iv', 'v', 'bVI', 'bVII']);
  // Counting from the minor scale itself (classical), degrees 1, 6, 3, 7 are Am F C G.
  assert.deepEqual([0, 5, 2, 6].map((i) => fam[i].chord.symbol), ['Am', 'F', 'C', 'G']);
});

test('claim (rotation): Am F C G is a rotation of C G Am F, and vi is home’s cousin', () => {
  const rots = rotations(['I', 'V', 'vi', 'IV']).map((r) => r.join(' '));
  assert.ok(rots.includes('vi IV I V'));
  assert.ok(rots.includes('IV I V vi'));
  assert.equal(rots.length, 4);
  assert.equal(functionOf('vi'), 'relative');
});

test('claim (endings): strong V–I, soft IV–I, surprise V–vi', () => {
  assert.deepEqual(ENDINGS.strong.major, ['V', 'I']);
  assert.deepEqual(ENDINGS.soft.major, ['IV', 'I']);
  assert.deepEqual(ENDINGS.surprise.major, ['V', 'vi']);
  for (const [id, end] of [['strong', 'V I'], ['soft', 'IV I'], ['surprise', 'V vi']]) {
    assert.ok(tries('endings').some((t) => t.r.slice(-2).join(' ') === end), id);
  }
});

test('claim (circle): circleChain gives vi ii V I and iii vi ii V I; each root is a fifth above the next', () => {
  assert.deepEqual(circleChain(4, 'ionian'), ['vi', 'ii', 'V', 'I']);
  assert.deepEqual(circleChain(5, 'ionian'), ['iii', 'vi', 'ii', 'V', 'I']);
  const chords = progressionChords(circleChain(5, 'ionian'), 'C');
  assert.deepEqual(chords.map((c) => c.symbol), ['Em', 'Am', 'Dm', 'G', 'C']);
  for (let i = 0; i < chords.length - 1; i++) {
    assert.equal((pc(chords[i].root) - pc(chords[i + 1].root) + 12) % 12, 7);
  }
  assert.equal(scaleNotes('D', 'ionian')[4], 'A'); // five letters up from D, counting D
  for (const s of ['Am', 'Dm', 'G', 'C']) assert.ok(isKnown(s, KNOWN));
});

test('claim (borrowed): Bb, Ab, Eb and Fm are not in C major but are in C minor; F is not borrowed', () => {
  assert.ok(!scaleNotes('C', 'ionian').includes('Bb'));
  for (const r of ['bVII', 'bVI', 'bIII', 'iv']) assert.equal(borrowedFrom(r, 'C', 'ionian'), 'aeolian', r);
  assert.equal(borrowedFrom('IV', 'C', 'ionian'), null);
  assert.deepEqual(names(['bVII', 'bVI', 'bIII', 'iv'], 'C'), ['Bb', 'Ab', 'Eb', 'Fm']);
  assert.ok(borrowOptions('V', 'ionian').some((o) => o.roman === 'bVII' && o.from === 'aeolian'));
});

test('claim (modes): D dorian, G mixolydian, F lydian, E phrygian use the C major notes; the one-note colors', () => {
  const set = (t, m) => [...scaleNotes(t, m)].sort().join();
  const c = set('C', 'ionian');
  for (const [t, m] of [['D', 'dorian'], ['G', 'mixolydian'], ['F', 'lydian'], ['E', 'phrygian'], ['A', 'aeolian']]) {
    assert.equal(set(t, m), c, `${t} ${m}`);
  }
  assert.equal(scaleNotes('D', 'dorian')[5], 'B');
  assert.equal(scaleNotes('D', 'aeolian')[5], 'Bb');
  assert.equal(scaleNotes('G', 'mixolydian')[6], 'F');
  assert.equal(scaleNotes('G', 'ionian')[6], 'F#');
  assert.deepEqual(names(['i', 'IV'], 'D'), ['Dm', 'G']);
  assert.deepEqual(names(['I', 'bVII', 'IV'], 'G'), ['G', 'F', 'C']);
  assert.deepEqual(names(['I', 'II'], 'F'), ['F', 'G']);
  assert.match(MODE_INFO.dorian.plain, /warm and a little hopeful/);
  assert.match(MODE_INFO.mixolydian.plain, /relaxed and bluesy/);
  assert.match(MODE_INFO.lydian.plain, /float/);
  assert.match(MODE_INFO.phrygian.plain, /dark and Spanish/);
});

test('claim (colors): Cmaj7 is C plus B and is C with the index lifted; G7, Dsus2, Dsus4 notes', () => {
  assert.deepEqual(notes('Cmaj7'), ['C', 'E', 'G', 'B']);
  assert.deepEqual(easiest('Cmaj7').frets, [null, 3, 2, 0, 0, 0]);
  assert.equal(easiest('C').fingers[4], 1); // the B-string note of C is the index finger
  assert.deepEqual(notes('G7'), ['G', 'B', 'D', 'F']);
  assert.deepEqual(notes('Dsus2'), ['D', 'E', 'A']);
  assert.deepEqual(notes('Dsus4'), ['D', 'G', 'A']);
  assert.equal(CHORD_TYPES.maj7.plain, 'major 7th');
  assert.equal(CHORD_TYPES['7'].plain, 'dominant 7th');
});

test('claim (slash-chords): the bass walks C B A G F and C D E F', () => {
  const bass = (w) => progressionChords(w.romans, 'C').map((c) => c.bass ?? c.root);
  assert.deepEqual(bass(BASS_WALKS.descending), ['C', 'B', 'A', 'G', 'F']);
  assert.deepEqual(bass(BASS_WALKS.climb), ['C', 'D', 'E', 'F']);
  assert.deepEqual(names(BASS_WALKS.descending.romans, 'C'), ['C', 'G/B', 'Am', 'C/G', 'F']);
  assert.deepEqual(notes('G/B'), ['G', 'B', 'D']);
  assert.equal(parseChord('G/B').bass, 'B');
});

test('claim (caged): F 133211 is the E shape, Bb x13331 the A shape with a five-string barre; C goes C A G E D up the neck', () => {
  assert.equal(generateVoicings('F').find((v) => v.frets.join() === '1,3,3,2,1,1').caged, 'E');
  const bb = generateVoicings('Bb').find((v) => JSON.stringify(v.frets) === '[null,1,3,3,3,1]');
  assert.equal(bb.caged, 'A');
  assert.equal(bb.barre.to - bb.barre.from + 1, 5);
  const low = {};
  for (const v of generateVoicings('C')) {
    if (!v.caged) continue;
    const at = Math.min(...v.frets.filter((f) => f > 0));
    low[v.caged] = Math.min(low[v.caged] ?? 99, at);
  }
  assert.deepEqual(low, { C: 1, A: 3, G: 5, E: 8, D: 10 });
});

test('claim (capo): Bb F Gm Eb is capo 3, played as G D Em C; G is three half steps below Bb', () => {
  assert.deepEqual(names(['I', 'V', 'vi', 'IV'], 'Bb'), ['Bb', 'F', 'Gm', 'Eb']);
  assert.deepEqual(capoHint(['Bb', 'F', 'Gm', 'Eb'], []), { capo: 3, playAs: ['G', 'D', 'Em', 'C'] });
  assert.equal((pc('Bb') - pc('G') + 12) % 12, 3);
});

test('claim (strum-and-pick): folk strum is D - D U - U D U; Travis thumb swaps two bass strings', () => {
  assert.deepEqual(STRUMS.find((s) => s.id === 'folk').steps, ['D', '-', 'D', 'U', '-', 'U', 'D', 'U']);
  const travis = PICKS.find((p) => p.id === 'travis');
  const thumbs = travis.steps.map((st) => st.find((r) => r === 'B' || r === 'A')).filter(Boolean);
  assert.deepEqual([...new Set(thumbs)], ['B', 'A']);
  assert.ok(PICKS.some((p) => p.id === 'arp-up'));
  assert.match(text('strum-and-pick'), /Strum or Pick/);
});

test('claim: Am F C G has no pull chord (why it keeps circling)', () => {
  assert.ok(['i', 'bVI', 'bIII', 'bVII'].every((r) => functionOf(r) !== 'pull'));
});

// ---- Review round 1 ----

test('claim (chord-numbers): moving key shifts every chord by the same distance, from a different starting note', () => {
  const c = progressionChords(['I', 'V', 'vi', 'IV'], 'C');
  const g = progressionChords(['I', 'V', 'vi', 'IV'], 'G');
  const shifts = c.map((x, i) => (pc(g[i].root) - pc(x.root) + 12) % 12);
  assert.ok(shifts.every((d) => d === shifts[0]));
  assert.deepEqual(c.map((x) => x.quality), g.map((x) => x.quality));
});

test('claim (slash-chords): in G/B and every walking-bass chord, the bass is another note of the chord', () => {
  assert.ok(notes('G').includes(parseChord('G/B').bass));
  for (const w of Object.values(BASS_WALKS)) {
    for (const c of progressionChords(w.romans, 'C').filter((x) => x.bass)) {
      assert.ok(chordNotes({ ...c, bass: null }).includes(c.bass), c.symbol);
    }
  }
});

test('claim (borrowed teaser): the borrowed chords come from the minor key with the same home note', () => {
  assert.match(LESSONS.find((l) => l.id === 'borrowed').teaser, /same home note/);
  for (const r of ['bVII', 'bVI', 'bIII', 'iv']) {
    const notesOfChord = notes(progressionChords([r], 'C')[0].symbol);
    assert.ok(notesOfChord.every((n) => scaleNotes('C', 'aeolian').includes(n)), r);
  }
});

test('claim (colors): a plain 7 is the V chord’s 7th in a major key; Cadd9 is C E G plus D, the note above the root', () => {
  const sev = diatonicFamily('C', 'ionian', true);
  assert.deepEqual(sev.filter((x) => x.chord.quality === '7').map((x) => `${x.roman}=${x.chord.symbol}`), ['V7=G7']);
  assert.deepEqual(notes('Cadd9'), ['C', 'E', 'G', 'D']);
  assert.equal(scaleNotes('C', 'ionian')[1], 'D');
});
