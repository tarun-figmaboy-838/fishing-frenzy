# Fishing Frenzy

A voiced maths adventure for young learners, in three parts that play as one journey on one lake:

1. **Popo's shape fishing** (`parts/fishing-1`): Popo the polar bear catches triangles, pentagons, hexagons and
   quadrilaterals. Then a fish he has never seen leaps out of the lake ("What kind of fish was that?") and Swiftee
   the bird flies in: "Let's find out!"
2. **Swiftee's trapezium lesson** (`parts/lesson`), inside the lake: Popo rows in, the seashell on the sand rattles
   and opens, its pearl blows a bubble up and out springs a big card. The camera dives into the water, and the
   lesson plays on the card (42 screens: what makes a trapezium, its bases and legs, its types, its angles, a recap
   and five checks) while the water moves and shadow fish swim behind it.
3. **Popo's trapezium fishing** (`parts/fishing-2`): the card closes, Swiftee swoops in ("Great job! You know all
   about trapeziums!") and Popo catches trapezium fish across five levels, ending on "The End".

Then the journey is back on the front page, ready to play again.

## Run it

Static files, no build step.

- **Locally:** `python3 -m http.server 8000` in this folder, then open http://localhost:8000/
- **Deploy:** on Vercel, import the repository with no build command and no output folder. `vercel.json` makes
  browsers revalidate every file on each visit (a quick "not modified" when nothing changed), and `.vercelignore`
  leaves the drafts, tools, tests and docs out of the deployment.
- **From disk:** double-clicking `index.html` works, but browsers treat local files as separate sites. The journey
  then falls back to messages between its frames (the `?dev=1` panel included): each part needs its own first tap
  for sound, and the lake's rolling-water effect is drawn flat. Serve it over HTTP for the real thing.

## How the journey fits together

`index.html` is the journey's page (the shell). It shows the front page, then plays each game as a whole in its
own full-window frame (`parts/*/index.html`), and lays the lesson's frame over the card that fishing 2 draws.
Every part loads `shell/bridge.js` first, which connects it to the shell. A part opened on its own sends you to
the front page instead.

- **The front page** is the Fishing Frenzy banner, alive (`shell/front-page.js`): the lake rolls under the fishing
  games' own water effect, bubbles drift, the fish's splash rises and the Play button floats. It's laid out exactly
  as the fishing games lay out their stage (same size, same blue surround, turned sideways on an upright phone), so
  it fades into fishing 1 lake into lake. The other two banners are kept in `drafts/banners/`.
- **Sound.** Browsers only allow sound after a tap. The Play tap unlocks one audio context, one `<audio>` element
  and the speech voice in the shell's page, and every part plays through them. No part needs a tap of its own.
- **Loading.** The first part loads behind the front page. While a part plays, the next one loads behind it,
  unseen, and begins the moment it is called. If one hasn't arrived yet, a frosted "Getting ready…" waits for it,
  with Try again if it fails.
- **From fishing 1 to fishing 2**, Swiftee flies off ("Let's find out!") and a giant wave swells up out of the
  lake behind Popo, lifts his raft onto its crest and carries him off to the right (`waveAway` in fishing 1's
  `src/sequences.js`). The two empty lakes cross-fade, and the wave rolls into fishing 2 from the left with Popo
  riding it, leaving him on its back, which lowers him onto his spot as it moves on (`waveIn`). Then the shell opens
  and the lesson's card rises. The wave is the lake itself: each game's
  water pass (`src/water.js`, `uHump`/`uLean`) lifts the painted surface into a travelling hump with a long back, a
  steep front and a crest leaning forward, filled with the lake's own water, lit and foaming in the shader;
  `parts/shared/wave.js` steers it (swelling up, sinking back, where Popo rides) and adds the spray, fizz and splash.
- **The lesson in the card.** Fishing 2 draws the shell, the bubble and the card (on its curtain canvas, in screen
  space, while its camera dives into the water behind), and tells the shell where the card's panel is. The shell
  lays the lesson's frame exactly there, see-through, so the lesson plays on the card with no winter scene of its
  own. When its last check is done, Swiftee flies out of
  the card to the right, the frame fades, the card shrinks into its bubble and floats away, the shell closes, the
  camera comes back up, and Swiftee swoops in from the right.
- **The lesson moves on by itself.** It has no Next, Back or screen list. A finished screen moves on once its voice
  and animations are over. A screen that asks for something (a drag, a tap, an answer) waits until it's done.
- **The end.** Fishing 2 closes its cartoon iris on "The End", Next is tapped, and the front page fades back in.
  Fishing 1 has already loaded again behind it, so Play again starts at once.

## Swiftee is one character everywhere

- **Her scarf.** The lesson draws her red snowflake winter scarf on every frame. `tools/bake-swiftee-scarf.py`
  bakes the same scarf, placed by the lesson's own code, into the fishing games' Swiftee sheets and the front-page
  banner. The band is fitted to her body in every pose and the tail hangs whole. The unscarfed originals are in
  `tools/scarf/originals/`, so the bake can run again.
- **Her voice.** The lesson's voice-over comes from the "Ai Wala Human By Aamir" studio: Hindi script, voice Female
  Teacher (Standard), with the spoken-form rules in `parts/lesson/docs/VOICEOVER.md`. Her 16 lines in the fishing
  games were re-voiced the same way. The clips, and each line's spoken form and Devanagari, are in
  `tools/swiftee-voice/`, and `tools/build-swiftee-voice.py` puts them into both games' `voice-data.js`. Popo and
  the fishing narrator keep their own voices.

## Folder

```
index.html              the journey's page: the front page, then the parts in frames
manifest.webmanifest    installs as a full-screen landscape app
shell/
  journey.js            the journey: parts, loading, sound, hand-overs, the ?dev=1 panel
  front-page.js         the Fishing Frenzy title, alive
  bridge.js             loaded by every part: begin, finish, shared sound, dev screens
  journey.css           the shell's styles (front page, dissolves, "Getting ready…")
  title/                water.js and effects.js, copied unchanged from fishing 2, for the front page
  images/               the banner, Play, icons, the share picture (source/: the masters, not deployed)
parts/
  fishing-1/            Popo's shape fishing
  lesson/               Swiftee's trapezium lesson (its README, GAME_DESIGN.md and docs/VOICEOVER.md)
  fishing-2/            Popo's trapezium fishing
drafts/banners/         the two banners not in use: Trapezium Adventure (the lesson's), Shape Fish Adventure
tools/                  the scarf bake, Swiftee's voice and its build
tests/journey.py        the whole journey in real browsers
```

Each part keeps its own README describing its game. The fishing games' source artwork, their asset and voice build
tools and their standalone tests stay in their original repositories (`ice-age-fishing`, `ice-age-fishing-2`).
This repository ships the playable game.

## Options for testing

- `?dev=1`: one panel (bottom left) that jumps to any screen of the journey: the front page, each fishing game's
  own jumps (levels, a right or wrong catch, rowing on, the ending), and all 42 lesson screens (a lesson screen
  opens fishing 2's card straight away with the lesson at that screen). The backtick key folds it away. In dev mode
  every part loads at once, so every list is there.
- `?start=fishing-2`: the first journey begins at fishing 2 (Popo rows in and the lesson's card rises);
  `?start=lesson`: straight at the lesson's open card.
- `?debug`: exposes `window.popoDebug` in the fishing games and `window.lessonDebug` in the lesson.

## For a page that hosts the journey

Each step is announced as a window event and posted to a parent page if the journey is framed:
`fishing-frenzy:part` (a part begins), `fishing-frenzy:finished` (with that part's detail: the shapes caught, the
lesson's checks right first time, the catches), and `fishing-frenzy:complete` (with all of them).

## Tests

- `python3 tests/journey.py [chromium|webkit|phones|dev|all]` plays the whole journey through real taps over
  HTTP. It checks:
  - a real catch in both fishing games;
  - the hand-over from fishing 1, with no tap and no veil; the shell, the card, and the lesson's frame sitting
    exactly on the card's panel, see-through, with the camera under the water and shadow fish swimming;
  - the lesson moving on by itself, and its last check with a wrong answer first; the card closing and the camera
    coming back up;
  - every part playing through the shared, unlocked sound;
  - the end and Play again;
  - `dev`: the jump panel, `?start=lesson`, and the lesson's frame following the card when the window changes;
  - that no frame logs an error.

  Needs Python Playwright with Chromium and WebKit.
- `node parts/lesson/qa/logic-test.js` plays every lesson screen through its engine without a browser.
