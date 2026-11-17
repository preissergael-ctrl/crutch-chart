# Crutch Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An offline guitar PWA that gives chord progressions by mood and by method, shows every fretboard shape for each chord, plays them with strum and picking patterns, and teaches the theory behind each one.

**Architecture:** A pure, test-covered "music brain" (`src/theory`, `src/guitar`, `src/content`) that knows nothing about the page, plus a thin UI layer (`src/ui`) that renders hash routes into one `index.html`. Audio is Web Audio playing bundled guitar samples, scheduled from a pure event list. Everything is static files, so it runs offline through a service worker.

**Tech Stack:** Plain HTML, CSS, and JavaScript ES modules. No npm dependencies and no build step. Tests use `node --test` (Node 26 is installed). A headless Chrome smoke script drives the UI checks.

**Spec:** `docs/superpowers/specs/2026-11-17-chord-app-design.md`

## Global Constraints

- No npm dependencies, no bundler, no CDN at runtime. Every file the app uses is in the repo, and all paths are relative (it will be served from a GitHub Pages subpath).
- `package.json` contains only `{"name":"crutch-chart","private":true,"type":"module","scripts":{"test":"node --test tests/"}}`.
- Standard tuning E2 A2 D3 G3 B3 E4 (MIDI `[40,45,50,55,59,64]`). Frets 0–15. Max hand span 4 frets (open strings don't count). Max 4 fingers, where a barre counts as 1.
- Chord-number convention: numbers count from the **major** scale of the home note (Am F C G = i–♭VI–♭III–♭VII). In code use ASCII `b`/`#` (`bVII`); the UI displays `♭`/`♯`.
- Default family: C major / A minor. Key list for transposing. Major: `C Db D Eb E F F# G Ab A Bb B`. Minor: `C C# D Eb E F F# G G# A Bb B`.
- Time signatures: 4/4 and 3/4 only. Tempo 50–160 BPM.
- User's known chords (default, editable): `Am, F, C, Dm, G`.
- Look: background `#eceee8`, pine `#1f3a30`, surface `#ffffff`, lines `#d5dacf`, neck wood `#f6f1e7`, frets `#cfc6b6`, strings `#8b8172`. Headings in Literata, everything else in Outfit, both self-hosted in `fonts/`. Smooth lines, crisp corners (radius 8px or less on surfaces).
- Copy: sentence case, plain words, no all-caps labels. A theory term appears only with its plain meaning next to it. No streaks, scores, or locked content.
- Sound: FluidR3_GM "acoustic_guitar_steel" MP3s (CC BY 3.0), credited on the About screen as: "Guitar sound: FluidR3_GM by Frank Wen, via gleitz/midi-js-soundfonts, CC BY 3.0."
- localStorage key: `crutchchart:v1`.
- Commits use the repo-local identity that is already configured. End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Transposing to sharp or flat keys** (for example ♭VI–♭VII–I in D♭): chord names must never show double accidentals (`Bbb`, `F##`). They respell to the simplest name. Pinned in Task 3 (`no double accidentals in any key`).
2. **Unusual chord types with few shapes** (aug, 9, m7b5 on awkward roots): every one of the 14 types on all 12 roots must return at least one playable shape, never an empty neck. Pinned in Task 5 (`every type and root has a shape`).
3. **Pressing Play before the sounds have loaded, or with the audio context suspended** (phone first tap): playback waits for loading, resumes the context, and then plays, with no error and no double start. Pinned in Task 8 (`play before load waits`) and the Task 15 smoke test.
4. **Old, corrupt, or foreign saved data and backup files:** the app starts with defaults instead of crashing, and importing a bad file shows a clear message and keeps current data. Pinned in Task 9 (`corrupt storage falls back`, `bad backup rejected`).
5. **Pressing Play repeatedly, or changing tempo, pattern, or key while playing:** the old playback stops before the new one starts, with no overlapping sound. Pinned in Task 8 (`second play stops the first`).

## File Map

```
index.html, styles.css, manifest.webmanifest, sw.js, package.json
fonts/literata.woff2, fonts/outfit.woff2
sounds/<Note><octave>.mp3          40 files, E2..G5, flat names (Eb3, Ab4)
icons/icon.svg, icon-192.png, icon-512.png
tools/serve.mjs                    dev server (copied from life-dashboard)
tools/make-icons.mjs               PNG icon writer (adapted from life-dashboard)
tools/fetch-sounds.mjs             downloads the 40 samples once
tools/smoke.mjs                    headless Chrome: visits routes, fails on errors, screenshots
src/theory/notes.js     pitch classes, spelling, transposition
src/theory/scales.js    modes and spelled scales
src/theory/chords.js    chord types, parsing, spelled notes, required tones
src/theory/roman.js     chord numbers -> chords, families, functions, borrowing, explanations
src/theory/methods.js   logic behind the 9 methods
src/guitar/voicings.js  shape generator, fingers, scoring, CAGED labels
src/guitar/capo.js      capo hint, "do I know this chord"
src/content/progressions.js   every named progression
src/content/moods.js          12 moods referencing progressions
src/content/methods.js        9 method descriptions
src/content/patterns.js       strum and picking patterns
src/content/lessons.js        Learn section text
src/audio/schedule.js   pure: progression + pattern -> timed note events
src/audio/engine.js     Web Audio sample loading and playback (browser only)
src/audio/player.js     play/stop/loop on top of an engine
src/store.js            known chords, saved progressions, settings, backup
src/ui/router.js        hash routes <-> view state (pure, tested)
src/ui/app.js           boot, tab bar, view switching
src/ui/views/find.js, progression.js, chord.js, method.js, learn.js, saved.js, about.js
src/ui/components/neck.js      SVG neck renderer
src/ui/components/chordrow.js  progression chord row
src/ui/components/pattern.js   pattern strip
tests/*.test.js
```

---

### Task 1: Scaffold, notes, and scales

**Files:**
- Create: `package.json`, `tools/serve.mjs` (copy from `../life-dashboard/tools/serve.mjs`, unchanged), `src/theory/notes.js`, `src/theory/scales.js`
- Test: `tests/notes.test.js`, `tests/scales.test.js`

**Interfaces:**
- Produces:
  - `pc(name: string) -> number` (0–11). Accepts `C`, `C#`, `Db`, `B#`, `Cb`, `E#`, `Fb`, `Bbb`, `F##`. Throws on anything else.
  - `LETTERS = ['C','D','E','F','G','A','B']`, `LETTER_PC = {C:0,D:2,E:4,F:5,G:7,A:9,B:11}`
  - `spell(letter: string, targetPc: number) -> string`: the letter plus the accidentals that reach `targetPc` (`spell('C',11) === 'Cb'`, `spell('F',7) === 'F##'`).
  - `simplify(name: string, preferFlats: boolean) -> string`: removes double accidentals only (`Bbb -> A`, `F## -> G`). Single accidentals are returned unchanged.
  - `transpose(name: string, semitones: number, preferFlats: boolean) -> string`
  - `MODES = {ionian:[0,2,4,5,7,9,11], dorian:[0,2,3,5,7,9,10], phrygian:[0,1,3,5,7,8,10], lydian:[0,2,4,6,7,9,11], mixolydian:[0,2,4,5,7,9,10], aeolian:[0,2,3,5,7,8,10], locrian:[0,1,3,5,6,8,10], harmonicMinor:[0,2,3,5,7,8,11]}`
  - `PENTATONIC = {majorPentatonic:[1,2,3,5,6], minorPentatonic:[1,3,4,5,7]}` (degrees of ionian/aeolian)
  - `MODE_INFO`: `{[mode]: {name: string, plain: string}}`. `plain` is one plain sentence, for example lydian: "Major, with a raised 4th that makes it float".
  - `scaleNotes(tonic: string, mode: string) -> string[]`: 7 spelled notes for heptatonic modes (one letter per degree), 5 notes for pentatonics.
  - `scalePcs(tonic, mode) -> number[]`

- [ ] **Step 1: Write the failing tests**

```js
// tests/notes.test.js
test('pc', () => { assert.equal(pc('C'),0); assert.equal(pc('Db'),1); assert.equal(pc('B#'),0); assert.equal(pc('Cb'),11); assert.equal(pc('F##'),7); assert.throws(() => pc('H')); });
test('spell', () => { assert.equal(spell('C',11),'Cb'); assert.equal(spell('F',7),'F##'); assert.equal(spell('B',10),'Bb'); });
test('simplify only double accidentals', () => { assert.equal(simplify('Bbb',true),'A'); assert.equal(simplify('F##',false),'G'); assert.equal(simplify('Cb',true),'Cb'); });
test('transpose', () => { assert.equal(transpose('A',3,false),'C'); assert.equal(transpose('C',10,true),'Bb'); });
// tests/scales.test.js
test('C major', () => assert.deepEqual(scaleNotes('C','ionian'), ['C','D','E','F','G','A','B']));
test('F major spells Bb', () => assert.deepEqual(scaleNotes('F','ionian'), ['F','G','A','Bb','C','D','E']));
test('A aeolian', () => assert.deepEqual(scaleNotes('A','aeolian'), ['A','B','C','D','E','F','G']));
test('A harmonic minor', () => assert.deepEqual(scaleNotes('A','harmonicMinor'), ['A','B','C','D','E','F','G#']));
test('C lydian', () => assert.deepEqual(scaleNotes('C','lydian'), ['C','D','E','F#','G','A','B']));
test('E phrygian', () => assert.deepEqual(scaleNotes('E','phrygian'), ['E','F','G','A','B','C','D']));
test('F# major', () => assert.deepEqual(scaleNotes('F#','ionian'), ['F#','G#','A#','B','C#','D#','E#']));
test('A minor pentatonic', () => assert.deepEqual(scaleNotes('A','minorPentatonic'), ['A','C','D','E','G']));
test('every mode has MODE_INFO', () => { for (const m of Object.keys(MODES)) assert.ok(MODE_INFO[m].plain.length > 10); });
```

- [ ] **Step 2: Run** `node --test tests/` and confirm it fails (modules missing).
- [ ] **Step 3: Implement `notes.js` and `scales.js`.** Heptatonic spelling: degree `i` uses letter `LETTERS[(tonicLetterIdx + i) % 7]` and is spelled to `(pc(tonic) + MODES[mode][i]) % 12`.
- [ ] **Step 4: Run** `node --test tests/`. Expected: all pass.
- [ ] **Step 5: Commit** `feat: theory basics (notes, scales)`

---

### Task 2: Chords

**Files:**
- Create: `src/theory/chords.js`
- Test: `tests/chords.test.js`

**Interfaces:**
- Consumes: `pc`, `spell`, `LETTERS`, `simplify` from notes.js
- Produces:
  - `CHORD_TYPES`: `{[quality]: {intervals: [semitones, letterSteps][], required: number[], plain: string}}` for exactly these 14 qualities. `required` lists indexes into `intervals`; the root (index 0) is always required.
    `'' [[0,0],[4,2],[7,4]] req [0,1]` · `m [[0,0],[3,2],[7,4]] req [0,1]` · `dim [[0,0],[3,2],[6,4]] req [0,1,2]` · `aug [[0,0],[4,2],[8,4]] req [0,1,2]` · `7 [[0,0],[4,2],[7,4],[10,6]] req [0,1,3]` · `maj7 [[0,0],[4,2],[7,4],[11,6]] req [0,1,3]` · `m7 [[0,0],[3,2],[7,4],[10,6]] req [0,1,3]` · `m7b5 [[0,0],[3,2],[6,4],[10,6]] req [0,1,2,3]` · `sus2 [[0,0],[2,1],[7,4]] req [0,1]` · `sus4 [[0,0],[5,3],[7,4]] req [0,1]` · `add9 [[0,0],[4,2],[7,4],[2,1]] req [0,1,3]` · `6 [[0,0],[4,2],[7,4],[9,5]] req [0,1,3]` · `m6 [[0,0],[3,2],[7,4],[9,5]] req [0,1,3]` · `9 [[0,0],[4,2],[7,4],[10,6],[2,1]] req [0,1,3,4]`
  - `Chord = {root: string, quality: string, bass: string|null, symbol: string}`
  - `makeChord(root, quality, bass = null) -> Chord`. `symbol` is root + quality + (`/bass` if bass): `"C"`, `"Am"`, `"Bdim"`, `"G/B"`, `"F#m7b5"`.
  - `parseChord(symbol: string) -> Chord`. Throws on unknown input.
  - `chordNotes(chord) -> string[]`: spelled, in interval order (`Cmaj7 -> ['C','E','G','B']`, `Bbm7b5 -> ['Bb','Db','Fb','Ab']`, run through `simplify` so `Fb` stays but double accidentals collapse).
  - `chordPcs(chord) -> number[]`: unique pitch classes; the bass pc is included.
  - `requiredPcs(chord) -> number[]`
  - `sameChord(a: Chord|string, b: Chord|string) -> boolean`: compares root pc, quality, and bass pc (enharmonics are equal: `A#m == Bbm`).

- [ ] **Step 1: Write the failing tests:** `parse G/B` (`{root:'G',quality:'',bass:'B'}`), `parse F#m7b5`, `parse rejects Hm`, `C notes`, `Am notes`, `Bdim notes ['B','D','F']`, `Bbm7b5 notes`, `Dadd9 notes ['D','F#','A','E']`, `G9 pcs`, `Csus4 required = pcs of C and F`, `sameChord('A#m','Bbm') true`, `sameChord('C','C/E') false`.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement** in `chords.js`. Note letters come from `LETTERS[(rootLetterIdx + letterSteps) % 7]` spelled to the target pc.
- [ ] **Step 4: Run.** Expected: pass.
- [ ] **Step 5: Commit** `feat: chord types and parsing`

---

### Task 3: Chord numbers, families, functions, borrowing, explanations

**Files:**
- Create: `src/theory/roman.js`
- Test: `tests/roman.test.js`

**Interfaces:**
- Consumes: notes.js, scales.js, chords.js
- Produces:
  - `parseRoman(str) -> {acc: -1|0|1, degree: 1..7, upper: boolean, suffix: string, inv: null|'3'|'5'|'7'}`. Grammar: `[b|#]? (I|II|III|IV|V|VI|VII|i|ii|iii|iv|v|vi|vii) (°|o|ø7|+)? (7|maj7|sus2|sus4|add9|6|9)? (/3|/5|/7)?`
  - Quality mapping: upper with no suffix → `''`. Lower → `m`. `°`/`o` → `dim`. `ø7` → `m7b5`. `+` → `aug`. Upper+`7` → `7`; lower+`7` → `m7`; `maj7` → `maj7`; upper+`6` → `6`, lower+`6` → `m6`; `9` → `9`; `sus2`/`sus4`/`add9` keep their name whatever the case.
  - `romanToChord(roman: string, tonic: string) -> Chord & {roman: string}`. The root letter is `tonic letter + (degree-1)`, spelled to `major-scale pc of degree + acc`. If the result has a double accidental, use `simplify` with `preferFlats = acc < 0 || tonic includes 'b'`. `/3 /5 /7` sets `bass` to that chord tone.
  - `progressionChords(romans: string[], tonic) -> Chord[]`
  - `KEYS = {major: ['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B'], minor: ['C','C#','D','Eb','E','F','F#','G','G#','A','Bb','B']}`
  - `isMinorMode(mode) -> boolean` (aeolian, dorian, phrygian, harmonicMinor, locrian)
  - `diatonicFamily(tonic, mode, sevenths = false) -> {roman: string, chord: Chord}[]` (7 items). Qualities come from stacking scale thirds. Romans use the major-relative convention.
  - `functionOf(roman) -> 'home'|'relative'|'away'|'pull'`. Strip the inversion, the suffix, and the quality marks (`° o ø +`), keeping the accidental and numeral, then: `I,i` home · `vi,iii,bIII,III` relative · `V,v,vii` pull · everything else away.
  - `FUNCTION_PLAIN = {home:'home: where the music rests', relative:'a cousin of home: restful, but a different color', away:'away: leaves home and builds interest', pull:'pull: leans hard back toward home'}`
  - `borrowedFrom(roman, tonic, mode) -> string|null`: null if the chord's root pc and triad quality are in `diatonicFamily(tonic, mode)`. Otherwise, the first mode containing it from this order: major-ish home → `aeolian, mixolydian, dorian, lydian, phrygian, harmonicMinor`; minor home → `dorian, harmonicMinor, ionian, phrygian, mixolydian, lydian`.
  - `explainProgression(romans, tonic, mode) -> {roman, name, role: string, borrowed: string|null}[]`, where `role = FUNCTION_PLAIN[functionOf(r)]`.

- [ ] **Step 1: Write the failing tests**

```js
test('C family', () => assert.deepEqual(diatonicFamily('C','ionian').map(x=>x.roman+':'+x.chord.symbol),
  ['I:C','ii:Dm','iii:Em','IV:F','V:G','vi:Am','vii°:Bdim']));
test('A aeolian family uses major-relative numbers', () => assert.deepEqual(diatonicFamily('A','aeolian').map(x=>x.roman+':'+x.chord.symbol),
  ['i:Am','ii°:Bdim','bIII:C','iv:Dm','v:Em','bVI:F','bVII:G']));
test('C family sevenths', () => assert.deepEqual(diatonicFamily('C','ionian',true).map(x=>x.chord.symbol),
  ['Cmaj7','Dm7','Em7','Fmaj7','G7','Am7','Bm7b5']));
test('romans', () => { assert.equal(romanToChord('bVII','C').symbol,'Bb'); assert.equal(romanToChord('V/3','C').symbol,'G/B');
  assert.equal(romanToChord('iiø7','C').symbol,'Dm7b5'); assert.equal(romanToChord('bII','A').symbol,'Bb'); assert.equal(romanToChord('V','A').symbol,'E'); });
test('borrowed', () => { assert.equal(borrowedFrom('bVII','C','ionian'),'aeolian'); assert.equal(borrowedFrom('IV','C','ionian'),null);
  assert.equal(borrowedFrom('V','A','aeolian'),'harmonicMinor'); assert.equal(borrowedFrom('IV','A','aeolian'),'dorian'); });
test('functions', () => { assert.equal(functionOf('V7'),'pull'); assert.equal(functionOf('bVI'),'away'); assert.equal(functionOf('vi'),'relative'); });
test('no double accidentals in any key', () => {
  const all = ['I','bII','ii','bIII','iii','IV','#iv°','V','bVI','vi','bVII','vii°'];
  for (const k of KEYS.major.concat(KEYS.minor)) for (const r of all)
    assert.doesNotMatch(romanToChord(r,k).symbol, /^[A-G](bb|##)/, `${r} in ${k}`); });
```

- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement `roman.js`.**
- [ ] **Step 4: Run.** Expected: pass.
- [ ] **Step 5: Commit** `feat: chord numbers, families, borrowing`

---

### Task 4: Progressions, moods, methods, and method logic

**Files:**
- Create: `src/content/progressions.js`, `src/content/moods.js`, `src/content/methods.js`, `src/theory/methods.js`
- Test: `tests/content.test.js`, `tests/methods.test.js`

**Interfaces:**
- Consumes: roman.js
- Produces:
  - `PROGRESSIONS: {[id]: {name, romans: string[], tonic, mode, bpm, beatsPerChord: 2|4, timeSig: 4|3, why: string}}`. `why` is 1–3 plain sentences on what creates the feeling.
  - `MOODS: {id, name, blurb, progressionIds: string[]}[]` in this order: happy, bittersweet, sad, hopeful, romantic, dreamy, epic, chill, bluesy, rock, spanish, dark.
  - `METHODS: {id, name, summary, lessonId}[]` with ids `family, loops, rotate, tension, circle, borrow, modes, spice, bass`.
  - `FAMOUS_LOOPS = ['axis','fifties','pachelbel','royal-road','andalusian','twelve-bar','two-five-one','mario']`
  - In `src/theory/methods.js`:
    - `rotations(romans) -> string[][]` (all n rotations, the original first)
    - `ENDINGS = {strong:{name:'Strong ending',major:['V','I'],minor:['V','i']}, soft:{name:'Soft "amen" ending',major:['IV','I'],minor:['iv','i']}, surprise:{name:'Surprise ending',major:['V','vi'],minor:['V','bVI']}}`
    - `withEnding(romans, endingId, mode) -> string[]`
    - `circleChain(length: 2..5, mode) -> string[]`: the last `length` items of `['iii','vi','ii','V','I']` (major), or of `['bIII','bVI','ii°','V','i']` (minor)
    - `borrowOptions(roman, mode) -> {roman, from}[]` from the swap tables. Major home: `IV→iv(aeolian), vi→bVI(aeolian), V→bVII(aeolian), iii→bIII(aeolian), ii→ii°(aeolian), I→i(aeolian)`. Minor home: `iv→IV(dorian), v→V(harmonicMinor), i→I(ionian)`.
    - `spiceOptions(roman, tonic, mode) -> {roman, label, inKey: boolean}[]`. Major base: suffixes `maj7, 7, sus2, sus4, add9, 6`. Minor base: `7 (→m7), 6 (→m6), sus2, sus4`. `inKey` = every chord pc is in `scalePcs(tonic, mode)`. `label` is the plain color word, for example maj7 "dreamy, soft", 7 "bluesy, wants to move", sus4 "hanging, unresolved".
    - `NEXT` tables: major `I:[IV,V,vi,ii] ii:[V,vii°] iii:[vi,IV] IV:[V,I,ii] V:[I,vi] vi:[IV,ii,V] vii°:[I,iii]`. Minor `i:[iv,bVI,bVII,v] ii°:[V,v] bIII:[bVI,iv,bVII] iv:[v,bVII,i,V] v:[i,bVI] bVI:[bVII,bIII,iv] bVII:[i,bIII]`. Expose `nextHints(roman, mode) -> string[]` (empty for unknown).
    - `BASS_WALKS = {descending:{name:'Walking down', romans:['I','V/3','vi','I/5','IV']}, climb:{name:'Climbing up', romans:['I','ii','I/3','IV']}}`

- [ ] **Step 1: Write the failing tests.** `content.test.js` holds this table, and for each row asserts `progressionChords(romans, tonic)` symbols equal the default column, and equal the second column when transposed to the given key. Also: every mood references existing ids, every progression is used by at least one mood or `FAMOUS_LOOPS`, every `why` is non-empty, and `bpm` is between 50 and 160.

| id | romans | tonic / mode | default | other key |
|---|---|---|---|---|
| happy-145 | I IV V I | C ionian | C F G C | G: G C D G |
| axis | I V vi IV | C ionian | C G Am F | D: D A Bm G |
| bitter-6415 | vi IV I V | C ionian | Am F C G | G: Em C G D |
| pachelbel | I V vi iii IV I IV V | C ionian | C G Am Em F C F G | D: D A Bm F#m G D G A |
| sad-aeolian | i bVI bIII bVII | A aeolian | Am F C G | E: Em C G D |
| sad-1415 | i iv i v | A aeolian | Am Dm Am Em | D: Dm Gm Dm Am |
| royal-road | IV V iii vi | C ionian | F G Em Am | D: G A F#m Bm |
| hope-4156 | IV I V vi | C ionian | F C G Am | G: C G D Em |
| fifties | I vi IV V | C ionian | C Am F G | A: A F#m D E |
| romantic-7ths | Imaj7 vi7 ii7 V7 | C ionian | Cmaj7 Am7 Dm7 G7 | F: Fmaj7 Dm7 Gm7 C7 |
| lydian-12 | I II | C lydian | C D | G: G A |
| dreamy-maj7 | Imaj7 IVmaj7 | C ionian | Cmaj7 Fmaj7 | G: Gmaj7 Cmaj7 |
| epic-aeolian | i bVI bIII bVII | A aeolian (bpm 120) | Am F C G | D: Dm Bb F C |
| mario | bVI bVII I | C ionian | Ab Bb C | D: Bb C D |
| dorian-vamp | i7 IV7 | A dorian | Am7 D7 | D: Dm7 G7 |
| two-five-one | ii7 V7 Imaj7 | C ionian | Dm7 G7 Cmaj7 | Bb: Cm7 F7 Bbmaj7 |
| twelve-bar | I7 I7 I7 I7 IV7 IV7 I7 I7 V7 IV7 I7 V7 | A mixolydian | A7×4 D7×2 A7×2 E7 D7 A7 E7 | E: E7.. A7.. B7.. |
| mixo-rock | I bVII IV | G mixolydian | G F C | D: D C G |
| rock-14b74 | I IV bVII IV | G mixolydian | G C F C | A: A D G D |
| andalusian | i bVII bVI V | A aeolian | Am G F E | E: Em D C B |
| spanish-phrygian | i bII bIII bII | A phrygian | Am Bb C Bb | E: Em F G F |
| phrygian-vamp | i bII | A phrygian | Am Bb | E: Em F |
| harmonic | i bVI iv V | A harmonicMinor | Am F Dm E | D: Dm Bb Gm A |

  Moods map to: happy [happy-145, axis] · bittersweet [bitter-6415, pachelbel] · sad [sad-aeolian, sad-1415] · hopeful [royal-road, hope-4156] · romantic [fifties, romantic-7ths] · dreamy [lydian-12, dreamy-maj7] · epic [epic-aeolian, mario] · chill [dorian-vamp, two-five-one] · bluesy [twelve-bar] · rock [mixo-rock, rock-14b74] · spanish [andalusian, spanish-phrygian] · dark [phrygian-vamp, harmonic].
  The `why` for epic-aeolian must say it uses the same chords as sad-aeolian, and that tempo and strumming make the difference.

  `methods.test.js`: `rotations(['I','V','vi','IV'])[2]` equals `['vi','IV','I','V']`. `withEnding(['I','IV'],'surprise','ionian')` equals `['I','IV','V','vi']`. `circleChain(4,'ionian')` equals `['vi','ii','V','I']`. `borrowOptions('IV','ionian')` equals `[{roman:'iv',from:'aeolian'}]`. `spiceOptions('V','C','ionian')` contains `{roman:'V7',inKey:true}` and `{roman:'Vmaj7',inKey:false}`; `'I'` gives `Imaj7` inKey true and `I7` inKey false. `nextHints('V','ionian')` equals `['I','vi']`. `BASS_WALKS.descending` in C resolves to `C G/B Am C/G F`, and `climb` to `C Dm C/E F`. Every borrow option's `from` equals `borrowedFrom(option.roman, tonic, mode)` for C ionian and A aeolian (engine consistency).
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Write the four modules.**
- [ ] **Step 4: Run.** Expected: pass.
- [ ] **Step 5: Commit** `feat: moods, progressions, method logic`

---

### Task 5: Fretboard shape generator

**Files:**
- Create: `src/guitar/voicings.js`
- Test: `tests/voicings.test.js`

**Interfaces:**
- Consumes: `chordPcs`, `requiredPcs`, `parseChord`, `pc` from chords.js/notes.js
- Produces:
  - `STANDARD = [40,45,50,55,59,64]` (index 0 = low E)
  - `Voicing = {frets: (number|null)[6], fingers: (number|null)[6], barre: {fret, from, to}|null, baseFret: number, bassPc: number, rootBass: boolean, caged: 'C'|'A'|'G'|'E'|'D'|null, score: number, key: string}`. `key` is a tab string like `"x32010"`, with frets of 10 or more written as `(10)`.
  - `generateVoicings(chord: Chord|string, {tuning = STANDARD, maxFret = 15, maxSpan = 4} = {}) -> Voicing[]`, sorted by `score` descending, deduplicated by `key`.
  - `assignFingers(frets) -> {fingers, barre} | null`
  - `fromTab(tab: string) -> (number|null)[]` (test helper and UI use)

  Rules for a valid shape:
  - Every sounding note is a chord tone.
  - All `requiredPcs` are present.
  - At least 4 sounding strings.
  - Muted strings only as a run at the low end, a run at the high end, or at most 1 inside.
  - The fretted span (max − min of non-zero frets) is at most `maxSpan − 1`.
  - The lowest sounding note equals `chord.bass` if set. Otherwise any chord tone is allowed, and `rootBass` records whether it's the root.
  - `assignFingers` succeeds.
  - Exception: if a `dim` or `aug` chord on some root has no 4-string shape, allow 3 sounding strings for those two types only.

  Algorithm: for each window start `w` from 1 to `maxFret − maxSpan + 1`, the options per string are muted, 0 (if a chord tone), and every fret in `[w, w+maxSpan−1]` that is a chord tone. Take the cartesian product, then filter.

  `assignFingers`:
  - Let `m` be the lowest fretted fret. If 2 or more strings are at `m`, try a barre with finger 1 from the lowest string at `m` to the highest string at `m`. The barre is valid only if no string inside it is open or muted, and none is below `m`.
  - Assign the remaining fretted notes fingers 2, 3, 4 in order of (fret, then string, low to high). Without a barre, fingers start at 1.
  - Fail if more than 4 fingers are needed.

  Score (baseline; the builder may tune it, but the tests below must hold):
  ```
  score = -3*span - 1.5*baseFret + 2*openCount + 1.5*soundingCount
          - 4*(barre?1:0) - 3*innerMuted - 6*(rootBass?0:1) - 2*fingersUsed
  ```
  `baseFret` is the lowest fretted fret, or 0 when every string is open.

  CAGED: only for qualities `''` and `m`. Shapes (low→high): C `x32010`, A `x02220`, G `320003`, E `022100`, D `xx0232`, Am `x02210`, Em `022000`, Dm `xx0231`. A voicing matches shape S with shift k ≥ 0 when:
  - every sounding string equals `S[i]+k`,
  - it sounds on no string where S is muted, and
  - it shares at least 4 sounding strings with S.

  The label is the shape letter.

- [ ] **Step 1: Write the failing tests**

```js
const keys = c => generateVoicings(c).map(v => v.key);
test('known shapes exist', () => {
  assert.ok(keys('C').includes('x32010')); assert.ok(keys('G').includes('320003')); assert.ok(keys('Am').includes('x02210'));
  assert.ok(keys('F').includes('133211')); assert.ok(keys('Dm').includes('xx0231')); assert.ok(keys('E').includes('022100'));
  assert.ok(keys('Bb').includes('x13331')); assert.ok(keys('Bm').includes('x24432')); });
test('easiest first', () => { assert.equal(keys('C')[0],'x32010'); assert.equal(keys('G')[0],'320003'); assert.equal(keys('Am')[0],'x02210');
  assert.equal(keys('F')[0],'133211'); assert.equal(keys('Dm')[0],'xx0231'); assert.equal(keys('E')[0],'022100'); assert.equal(keys('D')[0],'xx0232'); });
test('fingers', () => { assert.deepEqual(assignFingers(fromTab('133211')).fingers,[1,3,4,2,1,1]);
  assert.deepEqual(assignFingers(fromTab('x32010')).fingers,[null,3,2,null,1,null]);
  assert.deepEqual(assignFingers(fromTab('320003')).fingers,[2,1,null,null,null,3]); assert.equal(assignFingers(fromTab('103211')), null); });
test('caged labels', () => { const f = generateVoicings('F').find(v=>v.key==='133211'); assert.equal(f.caged,'E');
  assert.equal(generateVoicings('C').find(v=>v.key==='x35553').caged,'A'); });
test('slash chord bass', () => { for (const v of generateVoicings('G/B')) assert.equal(v.bassPc, 11); assert.ok(keys('G/B').includes('x20003')); });
test('frets stay within 0..15 and span', () => { for (const v of generateVoicings('A')) { const f=v.frets.filter(x=>x>0); assert.ok(Math.max(...f,0)<=15); if (f.length) assert.ok(Math.max(...f)-Math.min(...f) <= 3); } });
test('every type and root has a shape', () => {
  for (const r of ['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B']) for (const q of Object.keys(CHORD_TYPES))
    assert.ok(generateVoicings(r+q).length > 0, r+q); });
```

- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement `voicings.js`.** Memoize results by symbol, since the UI asks repeatedly.
- [ ] **Step 4: Run.** Expected: pass. Also check speed with `node -e` timing `generateVoicings` for all 168 type/root pairs: under 3 s total.
- [ ] **Step 5: Commit** `feat: fretboard shape generator`

---

### Task 6: Capo hint and known chords

**Files:**
- Create: `src/guitar/capo.js`
- Test: `tests/capo.test.js`

**Interfaces:**
- Consumes: `parseChord`, `sameChord`, `transpose`
- Produces:
  - `EASY_OPEN = ['C','A','G','E','D','Am','Em','Dm','A7','E7','D7','G7','C7','B7','Am7','Em7','Dm7','Cmaj7','Fmaj7','Asus2','Asus4','Dsus2','Dsus4','Esus4']`
  - `isKnown(symbol, known: string[]) -> boolean` (uses `sameChord`)
  - `capoHint(symbols: string[], known: string[]) -> {capo: number, playAs: string[]} | null`. Return null when every chord is in `known ∪ EASY_OPEN`. Otherwise use the lowest capo from 1 to 7 at which every chord, transposed down by that capo, is in `known ∪ EASY_OPEN`, or null if there is none. Transposition keeps the quality and the bass.

- [ ] **Step 1: Write the failing tests:** `capoHint(['Bb','F','Gm','Eb'], [])` equals `{capo:3, playAs:['G','D','Em','C']}`. `capoHint(['C','G','Am','F'], ['Am','F','C','Dm','G'])` is null. `capoHint(['C','G','Am','F'], [])` equals `{capo:5, playAs:['G','D','Em','C']}`. `isKnown('A#m',['Bbm'])` is true.
- [ ] **Step 2: Run** and confirm it fails. **Step 3: Implement.** **Step 4: Run** and confirm it passes.
- [ ] **Step 5: Commit** `feat: capo hints and known chords`

---

### Task 7: Patterns and scheduling (pure)

**Files:**
- Create: `src/content/patterns.js`, `src/audio/schedule.js`
- Test: `tests/schedule.test.js`

**Interfaces:**
- Consumes: `Voicing.frets` arrays, `STANDARD`
- Produces:
  - `STRUMS: {id, name, timeSig: 4|3, grid: 8|16, steps: ('D'|'U'|'-'|'X')[]}[]`. `steps.length === timeSig * grid/4`. `X` is a muted hit. Exactly 8 with timeSig 4 (including `all-downs` = `D - D - D - D -` and `folk` = `D - D U - U D U`) and 2 with timeSig 3 (including `waltz` = `D - D U D U`).
  - `PICKS: {id, name, timeSig, grid, steps: (string[])[]}[]`. Each step is a list of roles played together: `'B'` lowest sounding string, `'A'` second-lowest sounding string, `'1'|'2'|'3'` the highest, second-highest, and third-highest sounding strings, `'-'` rest. Exactly 6 (including `travis` = `[[B,1],[3],[A,2],[3],[B,1],[3],[A,2],[3]]`, `arp-up` = `[[B],[3],[2],[1],[2],[3],[B],[3]]`, and one 3/4 pattern).
  - `midiOf(stringIdx, fret, tuning = STANDARD) -> number`
  - `resolveRole(role, frets) -> number|null` (a string index)
  - `Event = {time: number (seconds from start), midi: number, velocity: 0..1, duration: number}`
  - `scheduleBar(frets, pattern, kind: 'strum'|'pick', startTime, bpm) -> Event[]`. A strum event list is the sounding strings, offset `spread = 0.012` s apart, low→high for `D` and high→low for `U`. `D` velocity 0.9, `U` velocity 0.7, `X` is all strings with velocity 0.25 and duration 0.05.
  - `scheduleProgression({voicings: frets[][], pattern, kind, bpm, beatsPerChord, timeSig}) -> {events: Event[], length: number, chordStarts: number[]}`. A pattern bar spans `timeSig` beats. If `beatsPerChord < timeSig`, use the first `beatsPerChord` beats of the pattern. If `beatsPerChord > timeSig`, repeat it.

- [ ] **Step 1: Write the failing tests:** `midiOf(0,0) === 40`, `midiOf(5,3) === 67`. For `resolveRole('B', fromTab('x32010'))`, the result is index 1. `resolveRole('1', fromTab('xx0231'))` is 5. Downstroke order on C: midis ascending `[48,52,55,60,64]`, with times step 0.012. Upstroke: descending. At 120 bpm, 4 beats per chord, 2 chords: `length === 4`, `chordStarts` equals `[0,2]`. Every strum and pick has the right `steps.length` for its `timeSig` and grid. `beatsPerChord: 2` in 4/4 uses half the bar.
- [ ] **Step 2: Run** and confirm it fails. **Step 3: Implement.** **Step 4: Run** and confirm it passes.
- [ ] **Step 5: Commit** `feat: strum and picking patterns, scheduler`

---

### Task 8: Sounds, audio engine, and player

**Files:**
- Create: `tools/fetch-sounds.mjs`, `sounds/*.mp3` (40 files), `src/audio/engine.js`, `src/audio/player.js`
- Test: `tests/player.test.js` (with a fake engine)

**Interfaces:**
- Consumes: `scheduleProgression`, `Event`
- Produces:
  - `tools/fetch-sounds.mjs`: downloads `https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_guitar_steel-mp3/<Name>.mp3` for MIDI 40–79 (E2–G5), with flat names (`C Db D Eb E F Gb G Ab A Bb B`), into `sounds/`. It skips files that already exist and exits non-zero on any failure.
  - `SAMPLE_NAMES: string[]` (exported from engine.js)
  - `createEngine({base = 'sounds/'} = {}) -> Engine`, where `Engine = {load(): Promise<void>, loaded: boolean, resume(): Promise<void>, now(): number, playNote(midi, when, velocity, duration): {stop(): void}}`. The AudioContext is created lazily on the first `resume()`. `playNote` uses the exact sample, with a gain envelope and a 0.08 s release at `when + duration` (strums use a duration that runs to the next chord).
  - `createPlayer(engine) -> {play(opts), stop(), playing: boolean, onStep: (chordIndex) => void}`. `opts` = `scheduleProgression` input plus `loop: boolean`. `play()` must:
    1. call `stop()` first,
    2. `await engine.resume()` and `await engine.load()`,
    3. schedule all events at `engine.now() + 0.1`,
    4. fire `onStep` at each `chordStarts` time via `setTimeout`,
    5. if `loop` is on, schedule the next pass 0.2 s before the end.

    `stop()` stops every handle and clears every timer.
  - `opts.countIn: boolean`. When it's on, the first pass is preceded by one bar of clicks (`timeSig` beats; the first click is accented). The engine provides `playClick(when, accent: boolean)`, a short synthesized tick (an oscillator, no sample file).

- [ ] **Step 1: Write the failing tests** with a fake engine (`now()` returns 0, `playNote` records the call and returns `{stop(){stopped++}}`, `load` resolves after 10 ms):
  - `second play stops the first`: call play, then play again → handles from the first call are all stopped, and only the second schedule is active.
  - `play before load waits`: `playNote` is not called before `load` resolves, and `resume` is called first.
  - `stop clears onStep timers`: after stop, `onStep` never fires.
  - `count-in delays the first note`: with `countIn` at 120 bpm in 4/4, `playClick` is called 4 times and the first `playNote` is at `start + 2` s.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3:** Run `node tools/fetch-sounds.mjs`. Expected: 40 files in `sounds/`, about 0.7 MB total. Implement engine.js and player.js.
- [ ] **Step 4: Run** `node --test tests/`. Expected: pass.
- [ ] **Step 5: Commit** `feat: guitar samples, audio engine, player`

---

### Task 9: Store and backup

**Files:**
- Create: `src/store.js`
- Test: `tests/store.test.js`

**Interfaces:**
- Produces:
  - `DEFAULT_STATE = {version: 1, known: ['Am','F','C','Dm','G'], saved: [], settings: {bpm: 90, patternId: 'folk', kind: 'strum', lastKey: null}}`
  - `SavedProgression = {id, name, tonic, mode, chords: {roman, name, quality, root}[], shapes: string[] (Voicing.key per chord), beatsPerChord, timeSig, bpm, patternId, kind, source: string ('mood:sad' | 'method:borrow' | 'custom'), createdAt: number}`
  - `createStore(storage = globalThis.localStorage) -> {state, save(), addSaved(p) -> id, removeSaved(id), setKnown(list), exportBackup() -> string, importBackup(json) -> void (throws Error with a plain message)}`. Storage errors are caught. A missing, corrupt, or wrong-version value gives `DEFAULT_STATE`.

- [ ] **Step 1: Write the failing tests:**
  - `corrupt storage falls back`: storage returns `"{oops"` → known equals the default.
  - `getItem` throwing → defaults.
  - `addSaved` then reload from the same fake storage → saved persists.
  - `bad backup rejected`: `importBackup('{"foo":1}')` throws `"This file isn't a Crutch Chart backup."` and state is unchanged.
  - `exportBackup` → `importBackup` round-trip is equal.
- [ ] **Step 2: Run** and confirm it fails. **Step 3: Implement.** **Step 4: Run** and confirm it passes.
- [ ] **Step 5: Commit** `feat: storage and backup`

---

### Task 10: App shell, look, router, and Find screen

**Files:**
- Create: `index.html`, `styles.css`, `fonts/literata.woff2`, `fonts/outfit.woff2`, `src/ui/router.js`, `src/ui/app.js`, `src/ui/views/find.js`, `tools/smoke.mjs`
- Test: `tests/router.test.js`

**Interfaces:**
- Consumes: MOODS, METHODS, PROGRESSIONS, store
- Produces:
  - `parseRoute(hash: string) -> {view: string, params: object}` and `routeHash(view, params) -> string`. Routes:
    - `#/find`
    - `#/mood/<id>`
    - `#/method/<id>`
    - `#/prog?t=<tonic>&m=<mode>&r=<romans comma>&src=<source>&id=<progressionId?>`
    - `#/chord/<encoded symbol>`
    - `#/learn` and `#/learn/<id>`
    - `#/saved`
    - `#/about`

    An empty or unknown hash gives `{view:'find', params:{}}`.
  - `app.js`: `mount(view: {render(params, ctx) -> HTMLElement, destroy?()})`. `ctx = {store, player, go(view, params)}`. The tab bar has Find, Learn, and Saved. The player stops on every route change.
  - `tools/smoke.mjs <url> <outDir>`:
    1. launches headless Chrome (path `C:/Program Files/Google/Chrome/Application/chrome.exe`, port 9334, `--autoplay-policy=no-user-gesture-required`) at 390×844, DPR 2;
    2. visits every route in a list passed in the file;
    3. records `Runtime.exceptionThrown` and console errors;
    4. saves `<outDir>/<route>.png`;
    5. exits 1 if any errors were recorded.

    Base it on the CDP script used for the Life Dashboard screenshots.
- Fonts: fetch the Google Fonts CSS for `Literata:opsz,wght@7..72,400..600` and `Outfit:wght@400..600` (latin subset only) and save the two woff2 files.
- Find screen: a heading, "What do you want to feel?" with 12 mood tiles (name + blurb), "Or build it a way" with the 9 methods, and a "Start from my chords" card that shows the known chords and links to `#/method/family`. Tapping a mood goes to `#/mood/<id>`, which lists its progressions as cards, each opening `#/prog?...&id=`.

- [ ] **Step 1: Write the failing router tests:** round-trip for every route, unknown → find, and `r=bVII,I` survives encoding.
- [ ] **Step 2: Run** and confirm it fails. **Step 3: Implement** the router, shell, styles (tokens from Global Constraints), and the Find and mood views. Run `node tools/serve.mjs` (port 5173).
- [ ] **Step 4: Run** `node --test tests/`, then `node tools/smoke.mjs http://localhost:5173/ <scratchpad>`. Expected: exit 0. Open the find and mood screenshots and check them against the style mockup (Pine and birch with Literata and Outfit, nothing like a school presentation).
- [ ] **Step 5: Commit** `feat: app shell, look, find screen`

---

### Task 11: Progression screen

**Files:**
- Create: `src/ui/views/progression.js`, `src/ui/components/chordrow.js`, `src/ui/components/pattern.js`
- Modify: `src/ui/app.js` (register the view)

**Interfaces:**
- Consumes: `progressionChords`, `explainProgression`, `KEYS`, `generateVoicings`, `capoHint`, `isKnown`, `STRUMS`, `PICKS`, `scheduleProgression`, `createPlayer`, store
- Produces: the view at `#/prog`. Layout from top to bottom:
  1. Title (the progression name or "Your progression") and source.
  2. Key picker (`KEYS` by major or minor mode) that rewrites the route.
  3. Chord row: each chord shows its name, its number (with `♭`), "new" or "you know this" marks, and the easiest shape's mini diagram. Tapping a chord goes to `#/chord/<symbol>`.
  4. "Why it works": `why` plus one line per chord from `explainProgression`. Borrowed chords say "borrowed from C minor" (from the `MODE_INFO` name).
  5. Capo hint card, when `capoHint` returns one.
  6. Play / Stop, a Loop toggle, a Count-in toggle, a tempo slider (50–160), and beats per chord (2/4).
  7. Strum or Pick switch plus a pattern list. The pattern strip highlights the current step while playing.
  8. Save (name prompt prefilled, writes a `SavedProgression`).

  The current chord highlights via `player.onStep`. Changing key, pattern, tempo, or beats while playing restarts playback (stop, then play).

- [ ] **Step 1:** Add `#/prog?t=C&m=ionian&r=I,V,vi,IV&id=axis`, `#/prog?t=Bb&m=ionian&r=I,V,vi,IV`, and `#/prog?t=A&m=aeolian&r=i,bVII,bVI,V&id=andalusian` to the smoke route list.
- [ ] **Step 2: Run smoke** and confirm it fails (view missing).
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run smoke.** Expected: exit 0. The screenshots show:
  - C G Am F with "you know this" on all four;
  - the B♭ version with a capo 3 hint (G D Em C);
  - Andalusian with E marked new.

  Then in smoke, evaluate a click on Play twice and confirm no exception, and that `document.querySelector('.chord.current')` exists within 1 s.
- [ ] **Step 5: Commit** `feat: progression screen with playback`

---

### Task 12: Neck view and Chord screen

**Files:**
- Create: `src/ui/components/neck.js`, `src/ui/views/chord.js`
- Modify: `src/ui/app.js`

**Interfaces:**
- Consumes: `generateVoicings`, `chordNotes`, `CHORD_TYPES[q].plain`, `isKnown`, engine/player (to strum one chord), store
- Produces:
  - `renderNeck(voicing: Voicing, {fromFret = 0, toFret = 15, highlightPcs?}) -> SVGElement`. A horizontal neck with the low E string at the bottom, fret numbers under frets 3, 5, 7, 9, 12, and 15, inlays at 3, 5, 7, 9, 12 (double), and 15. Dots carry finger numbers, a barre is a rounded bar, and open and muted marks (`○`/`×`) sit left of the nut. Colors come from the Global Constraints.
  - `renderMiniDiagram(voicing) -> SVGElement`: a compact 5-fret box for the chord row.
  - The chord view at `#/chord/<symbol>` shows:
    - the name, the plain meaning of its type, and its notes;
    - a "Shape N of M" stepper with swipe or arrow keys, plus a strip of every shape's position (tap to jump);
    - the full neck for the selected shape, with a "Strum it" button;
    - "CAGED: E shape" when labeled, with a one-line lesson link to `#/learn/caged`;
    - "You know this one" when the shape's chord is known and it is the easiest shape;
    - when `rootBass` is false, a plain label such as "The lowest note is E, not C: an inversion. It sounds lighter."

- [ ] **Step 1:** Add `#/chord/F`, `#/chord/G%2FB`, and `#/chord/Bm7b5` to the smoke routes.
- [ ] **Step 2: Run smoke** and confirm it fails. **Step 3: Implement.**
- [ ] **Step 4: Run smoke.** Expected: exit 0. The F screenshot shows `133211` first, with a barre at fret 1 and fingers 3 and 4 on A and D, and "Shape 1 of N" with N > 5.
- [ ] **Step 5: Commit** `feat: neck view and chord screen`

---

### Task 13: Method tools

**Files:**
- Create: `src/ui/views/method.js` (one view that switches on `id`)
- Modify: `src/ui/app.js`

**Interfaces:**
- Consumes: `METHODS`, `diatonicFamily`, `nextHints`, `rotations`, `withEnding`, `ENDINGS`, `circleChain`, `borrowOptions`, `spiceOptions`, `BASS_WALKS`, `FAMOUS_LOOPS`, `MODE_INFO`, store (`known`)
- Produces: `#/method/<id>`. Each tool ends with "Open this progression", which goes to `#/prog` with `src=method:<id>`.
  - **family:**
    - a key picker (default C, major or minor);
    - the 7 family chords as tiles, where tiles for known chords say "you know this";
    - a headline count: "You already know 5 of the 7 chords in C major";
    - tapping tiles builds a progression (max 8, removable);
    - after each pick, the `nextHints` tiles get a "usually comes next" mark;
    - "Try one new chord": chords outside the user's known list that change the mood, each with a plain mood word and a play button. These are the `borrowOptions` of the known family chords, plus any family chords the user doesn't know yet (Em, Bdim in C).
  - **loops:** the `FAMOUS_LOOPS` as cards.
  - **rotate:** pick a starting progression (the default is axis, or whatever was passed in `r`), then every rotation as playable rows, each saying which chord it starts on and its function.
  - **tension:** base progression plus the 3 `ENDINGS`, each playable.
  - **circle:** a length slider from 2 to 5 and the chain.
  - **borrow:** base progression; for each chord with `borrowOptions`, a swap button showing "from C minor". The result is playable.
  - **modes:** the 6 modes (`ionian`, `dorian`, `phrygian`, `lydian`, `mixolydian`, `aeolian`) with `MODE_INFO.plain`, each mode's family, and its signature progression from PROGRESSIONS (lydian-12, dorian-vamp, phrygian-vamp, mixo-rock, sad-aeolian, axis).
  - **spice:** base progression; per chord, `spiceOptions` chips. Chips that aren't in key are labeled "outside the key, adds surprise".
  - **bass:** the 2 `BASS_WALKS`, with the neck view showing the bass note.

- [ ] **Step 1:** Add `#/method/<id>` for all 9 ids to the smoke routes.
- [ ] **Step 2: Run smoke** and confirm it fails. **Step 3: Implement.**
- [ ] **Step 4: Run smoke.** Expected: exit 0. The family screenshot reads "You already know 5 of the 7 chords in C major" (Em and Bdim are not marked known).
- [ ] **Step 5: Commit** `feat: method tools`

---

### Task 14: Learn section

**Files:**
- Create: `src/content/lessons.js`, `src/ui/views/learn.js`
- Modify: `src/ui/app.js`
- Test: `tests/lessons.test.js`

**Interfaces:**
- Produces: `LESSONS: {id, title, blocks: ({p: string} | {try: {r: string[], t: string, m: string, label: string}} | {neck: string /*chord symbol*/})[]}[]` with exactly these ids in this order: `reading-the-neck, keys, chord-numbers, home-away-pull, major-minor, chord-family, numbering, rotation, endings, circle, borrowed, modes, colors, slash-chords, caged, capo, strum-and-pick`. Every method's `lessonId` must be one of these.
- The Learn list view, and the lesson view at `#/learn/<id>`. A `try` block renders as a button to `#/prog`.

- [ ] **Step 1: Write the failing tests:**
  - every `try` resolves through `progressionChords` without throwing;
  - every `neck` symbol has a shape;
  - every `METHODS[].lessonId` exists;
  - `chord-family` contains a `try` whose chords are exactly the C family;
  - no paragraph is longer than 400 characters.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Write the lessons** (plain, short, true) and the views. Every factual claim must be one the engine can show (for example "Bb isn't in C major" ↔ `borrowedFrom('bVII','C','ionian') !== null`). Add `#/learn` and `#/learn/borrowed` to the smoke routes.
- [ ] **Step 4: Run** `node --test tests/` and the smoke test. Expected: pass and exit 0.
- [ ] **Step 5: Commit** `feat: learn section`

---

### Task 15: Saved, my chords, About, and offline PWA

**Files:**
- Create: `src/ui/views/saved.js`, `src/ui/views/about.js`, `manifest.webmanifest`, `sw.js`, `icons/icon.svg`, `tools/make-icons.mjs` (adapt the life-dashboard one: pine background, a simple white chord-box glyph), `icons/icon-192.png`, `icons/icon-512.png`
- Modify: `index.html` (manifest, icons, theme-color `#eceee8`, sw registration), `src/ui/app.js`

**Interfaces:**
- Saved view:
  - the saved list (open → `#/prog` with the stored key, romans, and pattern settings; delete with confirm);
  - a "My chords" editor (add by typing a symbol, validated with `parseChord`; remove);
  - Download backup and Restore backup (shows the error message from `importBackup` on failure);
  - a link to About.
- About: what the app is (the user's sentence), and the sound credit line, verbatim from Global Constraints.
- `sw.js`: cache name `crutchchart-v1`. On install, precache every app file: html, css, all `src/**` modules, fonts, all 40 sounds, icons, and manifest. Fetch is network-first with a cache fallback, using `{cache:'no-cache'}` (the same strategy as the Life Dashboard). Bump the cache name whenever files are added.

- [ ] **Step 1:** Add `#/saved` and `#/about` to the smoke routes. Add an offline check to smoke:
  1. load `/`, then wait for `navigator.serviceWorker.ready`;
  2. call `Network.emulateNetworkConditions({offline:true})`, reload, and visit `#/prog?t=C&m=ionian&r=I,V,vi,IV`;
  3. click Play and assert no exception and that the engine reports `loaded`, via `window.__crutch.engine.loaded`. `app.js` sets that debug handle only when `location.hostname === 'localhost'`.
- [ ] **Step 2: Run smoke** and confirm it fails.
- [ ] **Step 3: Implement.** Generate the icons with `node tools/make-icons.mjs`. Make sure the list of precached files in `sw.js` includes every file in `src/`, and check it with a test: `tests/sw.test.js` reads `sw.js`, globs `src/**/*.js`, `sounds/*.mp3`, and `fonts/*`, and asserts each one is listed.
- [ ] **Step 4: Run** `node --test tests/` and the smoke test. Expected: pass, exit 0, and the offline run plays.
- [ ] **Step 5: Commit** `feat: saved, my chords, about, offline`

---

### Task 16: Final verification

- [ ] **Step 1:** Run `node --test tests/`. Expected: all pass. Paste the summary line.
- [ ] **Step 2:** Run the smoke test on every route. Expected: exit 0. Review every screenshot at 390 px wide: no horizontal scroll, text readable, and keyboard focus visible (tab through the find screen in a quick CDP check).
- [ ] **Step 3: Theory review.** For each mood `why`, each method summary, and each lesson, compare the claim against the references in the spec's research (Wikipedia "List of chord progressions", Berklee "Common chord progressions", and the mode-mixture lesson at intmus.github.io). Fix any claim that doesn't hold, then re-run the tests.
- [ ] **Step 4:** Add `README.md` (what it is, `node tools/serve.mjs`, `node --test tests/`, and the sound credit). Commit `docs: readme`.
- [ ] **Step 5:** Stop. Ask the user before creating a GitHub repo or publishing to Pages.
