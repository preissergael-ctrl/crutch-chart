# Crutch Chart: design

Date: 2026-11-17. Name: **Crutch Chart** (chosen by the user). Status: draft for approval.

## Intent

> "A crutch to express myself while I learn to walk."

The user loves music, plays guitar, and knows no music theory. They know five chords by heart
(Am, F as a full barre, C, Dm, G) and make music by playing those in different orders, with different
strums, and as arpeggios. The app gives them **new material** (progressions for a mood or built with a
method) and **teaches why it works**, so that over time they need the app less.

Every feature must do both jobs: let them make something now, and leave them knowing a little more.
An app that only hands out chords has failed, even if it works perfectly.

## Who it's for

One person at first, the user, with a guitar in their lap, on their phone (Android) or computer.
They play **right-handed**, mostly on a classical-shaped guitar with steel strings, and also play
electric guitar and sometimes bass.
Beginner in theory, not a beginner with their hands: they can already play a barre chord, so the app does
not need to hide hard shapes.

## Goals (version 1)

1. **Find a progression by mood.** Pick a feeling and get progressions that create it, each with a
   plain-language reason.
2. **Find a progression by method.** Pick a way of building progressions (a "method") and use it
   step by step.
3. **Start from my chords.** The app knows which chords the user can already play (prefilled with
   Am, F, C, Dm, G, editable). It marks familiar and new chords everywhere and can suggest "one new
   chord that changes the mood".
4. **See every way to play a chord.** A neck view shows every playable shape of each chord across the
   whole fretboard (frets 0 to 15), from easiest to hardest, with finger numbers. Tap to hear it.
5. **Hear it.** Play the progression strummed or picked, at a chosen speed, and loop it. Tap any chord
   to hear it alone.
6. **Ways to play, not just what to play.** A small library of strum patterns and picking (arpeggio)
   patterns that can be applied to any progression, shown visually and heard.
7. **Learn as you go.** Every progression and chord has a "why" in plain words. A short Learn section
   holds the lessons behind the moods and methods, and every lesson links to "try it".
8. **Save favorites,** stored so that the future riff writer can build on them (see Data shape).
9. **Fully offline.** Installs to the phone home screen. All knowledge and sounds live inside the app.

## Non-goals (for now)

- **Riff writer:** the next project. Version 1 only stores saved progressions in a shape the riff
  writer can use.
- AI or any online service, accounts, or syncing between devices.
- Instruments other than guitar, and tunings other than standard. The data model should allow other
  tunings and string counts later, because the user also plays bass.
- A left-handed (flipped) neck view. The user is right-handed.
- Sheet music notation.
- Listening to the user play through the microphone and grading them (Yousician-style).

## Anti-goals (failure even if it works)

- **Wrong theory.** Every explanation must be true and checkable. The user is learning from it.
- **A wall of jargon.** Theory words appear only after the idea is shown, and always with a plain
  meaning next to them ("the V chord, the one that pulls you home").
- **A course with grades.** No streaks, scores or locked levels. It should feel like a welcoming place,
  not school.
- **Needing the internet.**
- **Looking like a school presentation.** It should look professional and calm.

## Approaches considered

| | Approach | Trade-off |
|---|---|---|
| **A (picked)** | A built-in music brain: all rules, moods, methods and lessons written into the app | Offline, instant, free, explanations always match the rule used. Only knows what is taught to it, and adding more is easy |
| B | Ask Claude for progressions from a typed vibe | Most open-ended, but needs internet, costs per request, and explanations can be wrong |
| C | A first, B later as a "describe a vibe" box | The user chose to focus completely on A |

The user picked **A** because it works offline and can be a learning tool rather than something that
does the work for them.

## Decided by the user

- Approach A, fully offline, learning tool first.
- Look: **"Pine and birch" colors with the "Dusk" fonts.** Pale birch background, deep pine green, white
  surfaces, wood-colored neck. Headings in **Literata**, everything else in **Outfit**. Professional and
  sleek with a quiet cabin-in-the-woods warmth: smooth lines, crisp corners, easy to read. Yousician-level
  polish, but cozier and "for everyone". Inspiration only, not a copy.
  Mockup: `.superpowers/brainstorm/*/content/style-v2.html`.
  - Colors from the mockup: background `#eceee8`, pine `#1f3a30`, surface `#ffffff`, lines `#d5dacf`,
    neck wood `#f6f1e7`, frets `#cfc6b6`, strings `#8b8172`.

## The music brain (what must be in it)

All of this was checked against references during design. The builder must re-verify every progression
and explanation with automated tests (see Correctness).

### Core theory engine

- 12 notes, with correct spelling per key (B♭ in F major, not A♯).
- Scales and modes: major (Ionian), natural minor (Aeolian), Dorian, Phrygian, Lydian, Mixolydian,
  harmonic minor, and major/minor pentatonic (for the lessons and the future riff writer). Locrian only as a
  footnote.
- Chord types: major, minor, diminished, augmented, 7, maj7, m7, m7♭5, sus2, sus4, add9, 6, m6, and 9.
  Slash chords and inversions (C/G, G/B).
- Chord numbers (Roman numerals) with ♭ and ♯ (I, ii, iii, IV, V, vi, vii°, ♭III, ♭VI, ♭VII, ♭II),
  turned into real chords in any of the 12 keys.
- Chord functions in plain words: home (tonic), away (subdominant), pull home (dominant).
- **Numbering convention (Claude's call):** chord numbers count from the *major* scale of the home note,
  the way pop and rock writers do. So a minor-key loop like Am F C G is written i–♭VI–♭III–♭VII. The
  Learn section explains this once, and mentions the classical alternative (i–VI–III–VII).

### Keys and time (Claude's calls)

- Default family: **C major / A minor**, because it contains all five chords the user knows. Any
  progression can be moved to all 12 keys.
- A **capo hint**: when a progression is moved to a key with hard shapes, show "capo on fret N and play
  these easier shapes". This is a good lesson in itself.
- Time signatures: 4/4 and 3/4 only.

### Moods (version 1, about 12)

Each mood has 2 or more progressions, a home key suggestion, and an explanation of *what in the music*
creates the feeling.

| Mood | Example progressions (chord numbers) | Where the feeling comes from |
|---|---|---|
| Happy, bright | I–IV–V–I, I–V–vi–IV | Major key, strong pull home |
| Bittersweet, nostalgic | vi–IV–I–V | Same chords as the happy loop, starting on the sad chord |
| Sad | i–♭VI–♭III–♭VII (Am F C G), i–iv–i–v | Natural minor, no strong pull |
| Hopeful, uplifting | IV–V–iii–vi ("royal road"), IV–I–V–vi | Starts away from home and climbs |
| Romantic, warm | I–vi–IV–V (50s progression), Imaj7–vi7–ii7–V7 | Smooth movement, softer colors |
| Dreamy, floating | I–II (Lydian), Imaj7–IVmaj7 | The raised 4th in Lydian, no pull home |
| Epic, cinematic | i–♭VI–♭III–♭VII, ♭VI–♭VII–I | Big borrowed chords, rising bass |
| Chill, groovy | i7–IV7 (Dorian), ii7–V7–Imaj7 | Dorian's bright 6th in a minor key |
| Bluesy | 12-bar blues I7–IV7–V7 | Dominant 7th chords everywhere |
| Rock, rebellious | I–♭VII–IV (Mixolydian) | Flat 7th instead of the pull home |
| Spanish, dramatic | i–♭VII–♭VI–V (Andalusian cadence) | Stepwise falling bass, then V's sharp pull |
| Dark, tense | i–♭II (Phrygian), i–♭VI–iv–V (harmonic minor) | Half-step rub against home |

### Methods (version 1)

Each method is an interactive tool plus a lesson.

1. **Chord family.** The 7 chords that belong to a key. Build your own progression from them, with hints
   for "what usually comes next". This is where the user discovers that they already know 5 of the 7
   chords in C major.
2. **Famous loops.** Axis (I–V–vi–IV), 50s (I–vi–IV–V), Pachelbel (I–V–vi–iii–IV–I–IV–V), royal road,
   Andalusian, 12-bar blues, ii–V–I, ♭VI–♭VII–I.
3. **Same chords, new start (rotation).** What the user already does by ear, explained: why starting on
   a different chord changes the mood.
4. **Tension and release.** Home, away, pull home. V→I (strong ending), IV→I (soft "amen" ending),
   V→vi (surprise ending).
5. **Circle of fifths walk.** Chords that step down by fifths (iii–vi–ii–V–I).
6. **Borrowed chords.** Swap one chord for its twin from the parallel minor or major (iv, ♭VI, ♭VII,
   ♭III) to change the color.
7. **Modes.** Same family of chords with a different home chord (Dorian, Mixolydian, Lydian, Phrygian).
8. **Spice (chord color).** Turn a plain chord into 7, maj7, sus2, sus4 or add9, and hear the change.
9. **Walking bass.** Slash chords for smooth bass movement (C–G/B–Am, a descending line).

### Fretboard: every way to play a chord

- Standard tuning (E A D G B E), frets 0 to 15.
- **Generate shapes with an algorithm, not a hand-made table:** for each chord, list every combination of
  strings and frets that (a) only uses notes of the chord, (b) contains the root and the 3rd (5th
  optional), (c) fits a hand span of at most 4 frets (open strings don't count toward the span), and (d)
  needs at most 4 fingers, where a barre counts as 1 finger. Muted strings are allowed only at the edges,
  with at most one muted inner string.
- Rank by ease: open strings, a small span, a lower position and a full sound score higher. The lowest
  note is the root by default; other bass notes are shown and labeled as inversions.
- Assign finger numbers (1 to 4, with barre detection).
- Label CAGED shapes (C, A, G, E, D) when a shape matches one.
- The view: a horizontal neck as if looking down at the guitar, low E at the bottom (the same as tab).
  Swipe or step through positions. Each shape shows fret position, fingers and muted or open strings.
  Familiar shapes (ones the user already knows) are marked.
- Tests must confirm that well-known shapes appear: open C `x32010`, open G `320003`, open Am `x02210`,
  F barre `133211`, Dm `xx0231`, and so on.

### Sound

- The user doesn't mind which guitar sound is used. Recorded acoustic guitar samples:
  **FluidR3_GM, acoustic guitar (steel)**, from
  gleitz/midi-js-soundfonts, released under **CC BY 3.0**. The app must credit it on an About screen.
  The samples are bundled locally (no internet), and only the notes the guitar range needs are kept.
- Web Audio: a strum is the chord's notes started 10 to 30 ms apart, low to high for a downstroke and
  high to low for an upstroke, with natural decay. A picked note plays one string.
- Speed from 50 to 160 beats per minute, a loop toggle, beats per chord, and a count-in click.

### Play patterns

- Strum patterns on an 8th- or 16th-note grid: down, up, rest, muted hit. Start with about 8 common
  patterns, from "all downs" to the folk "D–DU–UDU".
- Picking patterns as roles (bass, then strings 3, 2, 1, and so on), so the same pattern works with any
  chord shape. Start with about 6, such as Travis-style alternating bass and simple arpeggios.
- Shown as a simple visual row of arrows or string numbers per beat, highlighted while playing.

## Correctness (the user is learning from this)

- The theory engine, the shape generator and every mood and method progression get automated tests
  (`node --test`, no installs).
- Every mood and method progression must be written as chord numbers *and* checked by tests to produce
  the expected real chords in C and at least one other key.
- Explanations are written once, reviewed against references, and only describe things the engine can
  show (for example, "this chord comes from C minor" must be true in the engine).

## Screens (proposal)

Phone first, also comfortable on a computer.

```
[Find]    Mood tiles | Method list | "Start from my chords"
[Progression]  key + mood ▸ chord row (tap to see shapes) ▸ why it works
               ▸ Play / Loop / tempo ▸ strum or picking pattern ▸ Save
[Chord]   big neck view, all shapes, finger numbers, "you know this one" marks
[Learn]   short lessons, each ending in "Try it"
[Saved]   favorite progressions, backup and restore
```

## Data shape (so the riff writer can use it later)

A saved progression stores: key and mode, chords as numbers and as names (`{roman: "vi", name: "Am",
quality: "m", root: "A"}`), the chosen shape for each chord (frets per string), beats per chord, tempo,
the chosen play pattern, the mood or method it came from, and a date. It is saved on the device with
backup and restore to a file (like the Life Dashboard).

## Technology

- A website that installs to the phone (a PWA). Plain HTML, CSS and JavaScript modules, no build step
  and no npm installs, the same way as the Life Dashboard. Fonts and sounds are stored in the app.
  A service worker makes it work offline.
- Hosting: GitHub Pages, like the Life Dashboard, but only once the user says to publish.

## Left to the builder

- File and module structure, ranking weights, finger-assignment details, exact sample trimming.
- The exact list of strum and picking patterns (within the counts above).
- Wording of explanations (plain, true, short), and the visual details within the chosen style.
- Whether to show the progression as a single row or a 4-bar grid.
