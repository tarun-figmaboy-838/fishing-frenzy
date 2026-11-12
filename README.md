# Fishing Frenzy

A voiced maths adventure for young learners, in three parts that play as one journey on one lake:

1. **Popo's shape fishing** (`parts/fishing-1`): Popo the polar bear catches triangles, pentagons, hexagons and
   quadrilaterals. Then a fish he has never seen leaps out of the lake ("What kind of fish was that?") and Swiftee
   the bird flies in: "Let's find out!"
2. **Swiftee's trapezium lesson** (`parts/lesson`), inside the lake: Popo rows in, the seashell on the sand rattles
   and opens, its pearl blows a bubble up and out springs a big card. The camera dives into the water, and the
   lesson plays on the card (38 screens: what makes a trapezium, its bases and legs, its types, its angles, a recap
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
- **Fishing 1 is a warm-up:** the four shapes (triangle, pentagon, hexagon, quadrilateral) as four quick rounds on
  one lake, one school for all four, each round won by one catch from the fish still swimming (a wrong tap tips Popo
  into the lake, and the plate says "Look at the sides. A pentagon has 5 sides.");
  the instruction reads "Catch the triangle fish!" (not "all"), there is no "Great catch!", a brisk cast and reel,
  and no rowing on between rounds; then the mystery fish, Swiftee's "Let's find out!" and Next.
- **From fishing 1 to fishing 2**, Swiftee flies off ("Let's find out!") and a giant wave swells up out of the
  lake behind Popo, lifts his raft onto its crest and carries him off to the right (`waveAway` in fishing 1's
  `src/sequences.js`). The two empty lakes cross-fade. In fishing 2 the seashell opens on the empty lake and the
  lesson's card rises from it; when the lesson is over the card shrinks away, the wave rolls in from the left with
  Popo riding it, sweeps the shell off the sand and sets Popo down on his spot (`waveIn`), and Swiftee swoops in
  with her welcome. The wave is the lake itself: each game's water pass (`src/water.js`, `uHump`/`uLean`) lifts the
  painted surface into a travelling hump, steered by `parts/shared/wave.js`.
- **Checks follow their concepts.** The five checks are spread through the lesson, each straight after the concept
  it tests: which shape is a trapezium (after the definition), the missing side of an isosceles trapezium (after the
  sides), the missing angle (after the angle rule), then which type and labelling all three (once the right trapezium
  is taught). The summary ends the lesson. Each check follows its concept.
- **The lesson in the card.** Fishing 2 draws the shell, the bubble and the card (on its curtain canvas, in screen
  space, centred on the stage; the card is a painted underwater card, `parts/fishing-2/assets/lesson-card.webp`,
  with bubbles rising through its water), the shell hides behind the card while the lesson plays, and the journey lays the
  lesson's own frame exactly over the card. Inside, Swiftee appears only where she does something: the opening
  (she flies in and recalls), the two measuring screens and the summary. Every other screen is a
  "plate" screen: no Swiftee and no ice panel, her line on a navy instruction plate across the top (gold rim, one line of text) and the shape
  big in the middle of the card (`isPlate`, `CONFIG.fitPlate`, css `.plate`). Colours are vivid and edged in navy so they stand out on the card's water: a pale-aqua fill, azure bases,
  aqua-teal legs, bright angle colours. A named side is redrawn by a sunflower-yellow marker (a glowing tip runs
  along it and it turns bold yellow, edged in navy, behind it) while the other sides step back. Swiftee dives in wherever she comes
  back, with a trail of bubbles. In the activities (the corner drags, the practice question) a second wrong try shows
  the answer - the corner glides into place, the right angles light up, the right option lights up - while Swiftee
  says why, in her own recorded voice (each step's `revealLine`: "Watch! AD becomes 5 cm, just like BC..."), and the
  lesson moves on rather than looping. The five checks never give the answer away: the learner keeps trying, with hints.
- **Sides that meet, sides that don't (screens 6-9).** Both legs are marked together, then two glowing pen tips race
  up them, drawing the dotted extensions, while the board pulls back to show where they will meet; they meet with a
  burst. The bases' dotted extensions grow out of their corners both ways at once, out to the card's edges, and
  arrowheads show they go on forever (no gap arrows and no pen tips there: the user found them odd).
- **The lesson moves on by itself.** It has no Next, Back or screen list. A finished screen moves on once its voice
  and animations are over. A screen that asks for something (a drag, a tap, an answer) waits until it's done. The
  summary is the last screen: each idea blows up in a glassy bubble and docks at the side as a small one; at the end
  Swiftee rises among them with no closing line, and Next comes up under them: when the learner taps it (an idea can
  be tapped to hear it again first), Swiftee flies off, the card closes, and the giant wave brings Popo in.
- **Kept short and clear (2026-10-21; the review and the "Fishing Game Corrections" PDF, FF-01 to FF-23).** The lesson
  says each thing once: it opens on "Any polygon with 4 sides…" (no "Remember…"), the legs extend on Swiftee's own
  "Let's extend them." with the camera pulling back as they climb (no tracing first), the definition's arrows glide on
  instead of the sides being traced, and the screens that repeated a line are gone ("So this quadrilateral has one
  pair…", "We call this a trapezium.", "We know all about the sides…", "Did you notice something?", "No matter the
  shape…", "What if we make one of the angles 90°?", tapping the two right angles, the "Great job!" screen). An
  instruction is said once, as its screen opens: a quiet spell brings the pointing hand, never the voice again (the
  fishing games' idle hints too). The instruction plate is one size on every screen; name tags are navy glass with a
  gold rim, just under their shape; the summary's ideas are glassy bubbles, with no closing line and a Next button
  under them that the learner taps to move on. The measuring screens have no map under the shape, and the mask's
  strap never crosses the protractor. Fishing 1 is fished from one school (a catch takes only its own fish) and a
  wrong catch says "Look at the sides. A pentagon has 5 sides."; in fishing 2 Swiftee's "Great job! You know all
  about trapeziums!" comes as she meets Popo, the rod reminder is the pointing hand, Popo says no "Great catch!", a
  wrong catch shows only the tag on the fish, and level 5 starts without the shell's angle recall (Swiftee swoops in
  with "Look at the marked angles!").
- **One look across the parts.** The narration box is fishing 1's instruction panel everywhere (fishing 2's instruction
  and the lesson's plate too: translucent navy, a faint gold rim, Fredoka, key words in gold; in the lesson it fits its
  line at one height and one size). Every button that moves the game on (fishing's Next, the lesson's Done and its
  summary's Next) is the fishing games' orange Next. Swiftee is always there before her bubble: in the fishing games
  she speaks once she has flown in, in the lesson once her dive or the summary's rise has landed (`landed()`).
- **The end.** Fishing 2 closes its cartoon iris on "The End", Next is tapped, and the front page fades back in.
  Fishing 1 has already loaded again behind it, so Play again starts at once.

## Swiftee is one character everywhere

- **Her scarf.** The lesson draws her red snowflake winter scarf on every frame. `tools/bake-swiftee-scarf.py`
  bakes the same scarf, placed by the lesson's own code, into the fishing games' Swiftee sheets and the front-page
- **Her diving mask.** Inside the underwater card she wears a yellow twin-window dive mask with a strap and snorkel
  instead of her scarf, drawn on every frame of every pose (`parts/lesson/js/dive-mask.js`), registered to her eyes by
  `parts/lesson/tools/build-mask-anchors.py` (`js/mask-anchors.js`).
  banner. The band is fitted to her body in every pose and the tail hangs whole. The unscarfed originals are in
  `tools/scarf/originals/`, so the bake can run again.
- **Her voice.** The lesson's voice-over comes from the "Ai Wala Human By Aamir" studio: Hindi script, voice Female
  Teacher (Standard), with the spoken-form rules in `parts/lesson/docs/VOICEOVER.md`. Her 16 lines in the fishing
  games were re-voiced the same way. The clips, and each line's spoken form and Devanagari, are in
  `tools/swiftee-voice/`, and `tools/build-swiftee-voice.py` puts them into both games' `voice-data.js`.
- **Two voices only.** The whole game is heard in Popo's voice and Swiftee's. The fishing games' narrator lines (the
  opening "Popo loves fishing...", every "Catch the ... fish!" instruction and fishing 2's hints) are read in
  Swiftee's studio voice too (`"who": "narrator"` entries in `tools/swiftee-voice/script.json`, under the narrator's
  keys), and in the journey the lesson never falls back to the browser's speech voice: a line whose clip cannot play
  shows its words silently.

## Languages

Every word a player reads is looked up by key, so the whole journey can be read in another language.

- **The words** are in `locales/locales.json`, one key per line, in the order the journey meets them (the journey's
  page, fishing 1, the lesson and its summary, fishing 2). It holds English (`"en"`, the source) and Hindi, Marathi,
  Telugu, Gujarati and Odia (`"hi"`, `"mr"`, `"te"`, `"gu"`, `"od"`), each with exactly English's keys in English's
  order (the rules: `.claude/skills/translation_skill.md`). After editing it, run
  `python3 tools/build-locales.py`: it writes `locales/locales.js`, the copy every page loads (a plain script, so the
  words are there before any game script runs, served or opened from disk), and checks that every language has
  every key, keeps its `{placeholders}`, `*stressed*` words and line breaks. `--check` only says whether the copy
  is up to date.
- **Choosing one:** `?lan=hi` (or `mr`, `te`, `gu`, `od`) on the journey's address (`?lang=hi` works too); without it
  the journey is in English. The journey hands it on to every
  part's frame, and a part opened on its own keeps it when it goes to the front page. A language the file doesn't
  have yet plays in English (and says so in the console).
- **In the code:** `T('key')` (or `T('key', { shape: name })` for a line with a placeholder), and in the markup
  `data-i18n="key"` (an element's text) and `data-i18n-attr="aria-label:key"` (its attributes), filled by
  `I18n.applyStatic()` straight after the markup. All of it is `shell/i18n.js`. A key the file doesn't have shows
  as the key itself, on purpose, so it is seen and added.
- **For a translator:** keep `{placeholders}` as they are (move them to where the language wants them), keep a
  `*stressed*` word's asterisks round its translation (it is drawn in gold or orange and lands with a boing), keep
  `\n` (a line break in Swiftee's bubble), and keep the mathematics as it is: numbers, `cm`, `°`, the corner
  letters A B C D and lines like `AB ∥ CD` (those stay in the code: they read the same in every language). The
  shared terms come from the team's quadrilaterals game (e.g. trapezium समलंब / समलंब चौकोन / ట్రెపీజియం /
  સમલંબ ચતુષ્કોણ / ଟ୍ରାପିଜିୟମ୍); a trapezium's legs are its "non-parallel sides" (असमांतर भुजा ...), as the
  textbooks name them.
- **Longer words:** every lesson line was measured on the card's one-line plate in all five languages, and every
  answer button, label and fishing instruction; they fit. The lesson's "Base" / "Leg" pills widen to fit their
  name, and a docked summary name that would run off the card is set a little smaller (English is unchanged).
- **Hindi has its own voice-over** (`assets/VO-HI/`, 324 MP3 clips made with ElevenLabs). Swiftee and the narrator
  share one voice (Anjali, a Hindi teacher's voice) and Popo has his own (Amit, a young cartoon voice), both a little
  slower and steadier than usual for grade 6-7. Every spoken line has a clip named by its key (`lsHi.mp3`); a line
  whose words vary has one per variant (`f1Catch.triangle.mp3`, `lsDragAKeep.5_1.mp3`), and screen 33's angle
  feedback is two clips back to back, as in English. Digits, corner letters and symbols are said as Hindi words
  (`180°` एक सौ अस्सी डिग्री, `∠A` कोण ए, `AB = 6 cm` ए बी बराबर छह सेंटीमीटर).
- **Marathi has its own voice-over too** (`assets/VO-MR/`, the same 324 clips, played with `?lan=mr`). Swiftee and
  the narrator are Sayali (a young Marathi voice: warm, clear, welcoming) and Popo is Vardaan (a young Marathi voice:
  bright, upbeat), from the ElevenLabs voice library, recorded with `eleven_v4` (Hindi's `eleven_multilingual_v2`
  doesn't speak Marathi). The mathematics is said as the Marathi textbooks say it (`180°` एकशे ऐंशी अंश, `∠A` कोन
  ए, `AB = 6 cm` ए बी बरोबर सहा सेंटिमीटर, `5.1` पाच पूर्णांक एक, `+` अधिक).
- **Gujarati has its own voice-over too** (`assets/VO-GU/`, the same 324 clips, played with `?lan=gu`). Swiftee and
  the narrator are Hetalben (a young Gujarati voice: bright, warm) and Popo is Bhavesh Bhai (an expressive Gujarati
  character voice), from the ElevenLabs voice library, recorded with `eleven_v4`. The mathematics is said in Gujarati
  (`180°` એકસો એંસી અંશ, `∠A` ખૂણો એ, `AB = 6 cm` એ બી બરાબર છ સેન્ટિમીટર, `5.1` પાંચ દશાંશ એક, `+` વત્તા).
  Everything below holds for all three.
  - `locales/voices.js` indexes the clips by the line on screen and who says it: `I18n.voiceOf(line, who)` finds a
    line's clip ("Try again!" is Swiftee's in the lesson and Popo's in fishing 2), `I18n.voice(key)` gives a clip's
    address.
  - The fishing games fetch their clips before they start (from disk they can't, and their lines show with the
    game's own sounds). Fishing 1 also reads its wrong-catch hint aloud, as it does the instruction, when it has a
    recording (Hindi, Marathi and Gujarati do; English doesn't).
  - The lesson plays them in the shared `<audio>` and fetches them in the background (its drag feedback only as it
    is said). Its word cues fire at their words' share of the line, since the English recordings' measured cue times
    don't apply, and screen 3's corner letters fly in where the clip says them.
  - Lines the game shows but doesn't say (shape names, the "Base" / "Leg" pills, type and summary labels, "The End",
    fishing 2's card line) have clips too, for when it does. Page titles, buttons, loading and error messages and
    screen-reader labels have none.
  - **Re-recording** after a line changes: `ELEVENLABS_API_KEY=... python3 tools/voice-elevenlabs.py --lang hi` (or
    `--lang mr`) records the clips that are new or whose words changed (`--dry` lists them, `--only key ...` records
    just those, as a test) and rewrites `assets/VO-<LANG>/manifest.json` (each clip's key, voice, line and spoken
    form; a run that stops part-way keeps what it recorded, so nothing is paid for twice); then
    `python3 tools/build-locales.py` rewrites `locales/voices.js`, and flags any clip recorded from a line that has
    changed since. A language with clips still missing is left out of `voices.js` (it keeps the English voice) until
    they are all there.
- **Telugu, Gujarati and Odia** say the English recordings (each found by its English line: `I18n.source`),
  and the lesson's animations keep the English timings, until they are recorded too. The lines Swiftee says that
  differ from her bubble (`s:` in `parts/lesson/js/lesson-data.js`) are the English recordings' wording; the
  voice-only "A B is parallel to C D." is by key (`lsAbParallelCd`).
- **Not in the file:** the "Fishing Frenzy" logo (it is painted into the banner), the page's share and search
  details (`<meta>`, `manifest.webmanifest`), the no-JavaScript notice, and the `?dev=1` panel.

## Folder

```
index.html              the journey's page: the front page, then the parts in frames
manifest.webmanifest    installs as a full-screen landscape app
locales/
  locales.json          every word the player reads, by key: en, hi, mr, te, gu, od
  locales.js            its copy for the pages, written by tools/build-locales.py
  voices.js             each language's own voice-over by line (Hindi, Marathi, Gujarati), written by tools/build-locales.py
assets/
  VO-HI/                the Hindi voice-over: one MP3 per spoken line, and manifest.json (tools/voice-elevenlabs.py)
  VO-MR/                the Marathi voice-over, the same way
  VO-GU/                the Gujarati voice-over, the same way
  VO-EN/                the English voice-over by key: the existing recordings (lesson .ogg, fishing .mp3), and the
                        lines that had none recorded with ElevenLabs in a clone of the same studio voice (.mp3), with
                        manifest.json (tools/collect-vo-en.py, --record); not played from here: English still plays
                        its recordings from the parts
shell/
  journey.js            the journey: parts, loading, sound, hand-overs, the ?dev=1 panel
  front-page.js         the Fishing Frenzy title, alive
  bridge.js             loaded by every part: begin, finish, shared sound, dev screens
  i18n.js               loaded by every page: T('key'), the language (?lan=), each line's voice-over
  journey.css           the shell's styles (front page, dissolves, "Getting ready…")
  title/                water.js and effects.js, copied unchanged from fishing 2, for the front page
  images/               the banner, Play, icons, the share picture (source/: the masters, not deployed)
parts/
  fishing-1/            Popo's shape fishing
  lesson/               Swiftee's trapezium lesson (its README, GAME_DESIGN.md and docs/VOICEOVER.md)
  fishing-2/            Popo's trapezium fishing
drafts/banners/         the two banners not in use: Trapezium Adventure (the lesson's), Shape Fish Adventure
tools/                  the scarf bake, Swiftee's voice and its build, the locales build (build-locales.py), the
                        Hindi voice-over (voice-elevenlabs.py), the English one gathered and completed (collect-vo-en.py)
tests/journey.py        the whole journey in real browsers
```

Each part keeps its own README describing its game. The fishing games' source artwork, their asset and voice build
tools and their standalone tests stay in their original repositories (`ice-age-fishing`, `ice-age-fishing-2`).
This repository ships the playable game.

## Options for testing

- `?dev=1`: one panel (bottom left) that jumps to any screen of the journey: the front page, each fishing game's
  own jumps (levels, a right or wrong catch, rowing on, the ending), and all 35 lesson screens (a lesson screen
  opens fishing 2's card straight away with the lesson at that screen, and when the lesson ends the wave brings Popo
  in, as in the full journey). The backtick key folds it away. In dev mode
  every part loads at once, so every list is there.
- `?start=fishing-2`: the first journey begins at fishing 2 (Popo rows in and the lesson's card rises);
  `?start=lesson`: straight at the lesson's open card.
- `?debug`: exposes `window.popoDebug` in the fishing games and `window.lessonDebug` in the lesson.
- `?lan=hi`: the journey in Hindi (`mr` Marathi, `te` Telugu, `gu` Gujarati, `od` Odia; see Languages).

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
