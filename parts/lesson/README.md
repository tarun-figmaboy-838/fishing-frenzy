# Trapezium Adventure

> The five checks come straight after the concepts they test, not together at the end: after the definition (13), the sides (22), the angle rule (31) and the right trapezium (35, two checks); the summary ends the lesson. Each check follows its concept.
>
> A check never gives its answer away. In an activity (dragging A to equal legs, dragging a corner to 90°, tapping the two right angles, the practice question on ∠B + ∠C) a second wrong try shows the answer while Swiftee says why: each step's `revealLine`, recorded in the lesson's voice (vo211-vo217).

> **In Fishing Frenzy** this lesson is part 2 of the journey (the repository's README): it plays inside the card that rises from the seashell at the start of fishing 2, in its own frame laid over the card, with no winter scene of its own (`html.in-card` in `css/game.css`: the page is see-through, Swiftee's bubble is white, and she sits level with the board). Its front page is the journey's, and its own (Trapezium Adventure) is in `drafts/banners/trapezium-adventure/`. It ends with the summary, without its goodbye and "The End", which would cut into the fishing that follows; there Swiftee leaves about 2 s after her last line (`SUM.readyMsJourney`). It has no Next, Back or screen list: each screen moves on by itself once its voice and animations are done, a screen that asks for something waits for it, and `?dev=1` on the journey's page jumps to any screen.

A playable lesson about trapeziums for children. Swiftee the bird walks the learner through parallel sides, bases and legs,
scalene, isosceles and right trapeziums, and the angle rule (angles on the same leg add up to 180°), then five checks.
Lengths and angles are always measured from the shape on screen, including shapes the learner drags.

The screen-by-screen design (what each screen says, shows and asks) is in [GAME_DESIGN.md](GAME_DESIGN.md).

## Run it

Static files only, no build step.

- **Local:** in this folder run `python3 -m http.server 8765`, then open http://localhost:8765/
- **From disk:** double-click `index.html` (works offline; without internet the fonts fall back to system fonts)
- **Web:** deploy this folder as-is (on Vercel, set the project's root directory to `trapezium-game`)

The stage is 1920 × 1080 and scales to fit any window. Mouse, touch and pen all work.

## The lesson

| Screens | Part |
|---|---|
| 1–15 | What is a trapezium: quadrilaterals, sides that meet and sides that don't, parallel sides, bases and legs |
| 16–22 | Types by sides: Swiftee measures the sides with a tape, scalene, drag A to make the legs equal, isosceles |
| 23–35 | Angles: Swiftee measures the angles with a protractor, same-leg angles add to 180°, supplementary angles, right trapezium |
| 36–37 | Well done, and the summary (eight idea cards) |
| 38–42 | Five checks |
| 43 | Lesson complete and goodbye |
| 44 | The End: the cartoon closer and Play again |

## Folder

```
trapezium-game/
├── index.html            the page and the game's markup (a template: {{bindings}} are filled by the engine)
├── css/
│   ├── stage.css         fits the 1920 × 1080 stage to the window
│   └── game.css          all game styles and CSS animations
├── js/
│   ├── vendor/           dc-runtime.js (template runtime, bundles React) and gsap.min.js
│   ├── config.js         tuning: shapes, limits, timings, sounds, Swiftee's reactions
│   ├── lesson-data.js    every screen as data, in play order (lines, cues, tasks, questions)
│   ├── game-engine.js    the game: narration, navigation, geometry, drags, checks, values for the markup
│   ├── motion.js         the GSAP animations each screen plays (cleared on every screen change)
│   ├── swiftee.js        Swiftee's expressions and lip-sync on a canvas
│   ├── swiftee-manifest.js   generated list of the sprite sheets the game ships
│   ├── winter-scarf.js   draws Swiftee's scarf on every frame (scarf-anchors.js, scarf-occlusion.js: generated data)
│   ├── walker.js         screen 16: Swiftee measures the sides with her tape
│   ├── angle-walker.js   screen 23: Swiftee measures the angles with one protractor
│   ├── angle-frames.js   the protractor poses
│   ├── summary.js        screen 37: the summary cards
│   ├── voice.js          plays Swiftee's recorded voice-over clips
│   ├── vo-lines.js       generated map: each line → its clip (see docs/VOICEOVER.md)
│   ├── finale.js         screen 44: the cartoon closer, "The End"
│   ├── stage-fit.js, snowfall.js, confetti.js
├── assets/
│   ├── images/           backgrounds, panels, the front-page banner, buttons, Swiftee extras
│   ├── audio/            the correct / incorrect sounds
│   └── vo/               Swiftee's voice-over: 208 Ogg Opus clips, one per line, 4.5 MB (see docs/VOICEOVER.md)
├── swiftee-assets/       the Swiftee sprite sheets the game plays (spritesheets/1x, 2x and extra/; see its README)
├── docs/VOICEOVER.md     how the voice-over is made, and every clip
├── tools/                scripts that rebuild Swiftee's scarf data and the voice-over (vo_build.js)
└── qa/                   logic-test.js (headless test of every screen) and fake-speech.js
```

## Editing

- **Words, cues, tasks, questions, feedback:** `js/lesson-data.js` (the comment at the top lists every option)
- **Timings, shapes, limits, Swiftee's default reactions:** `js/config.js`
- **Swiftee's expression for a line:** the line's `m` in `js/lesson-data.js`
- **Colours, sizes, CSS animations:** `css/game.css`
- **Where things sit on screen:** `index.html` (inside `<x-dc>`)
- **Behaviour:** `js/game-engine.js`; scripted animations: `js/motion.js`

## How it works

- **Rendering.** `index.html` is a template. `renderVals()` in `game-engine.js` returns every value it binds, and the
  runtime re-renders when the state changes.
- **Narration.** Each line plays its recorded voice-over clip (`assets/vo/`, see [docs/VOICEOVER.md](docs/VOICEOVER.md));
  where a clip can't play, the device's speech voice says it instead. Words appear as the voice reaches them, Swiftee's
  beak moves only while she speaks, and cue words (`cueAt`) fire animations at the exact word. Without a voice, the words
  are paced on a timer instead.
- **Screens.** Navigation is manual: Back and Next sit top right, and "Screen N of 44" (top left) jumps to any screen.
  Skipping an unfinished drag applies its result, so later screens still match the shape.
- **Shapes.** The bases always stay parallel: corners only slide sideways, within limits that keep the shape readable.
- **Front page.** The banner fills the stage; the Play button unlocks sound and starts screen 1. (The earlier cabin
  intro is in git history: `git show 2687c66:drafts/intro/README.md`.)
- **Board size.** On lesson screens the shape is fitted to fill the ice panel, screen by screen (`fitFor` in the
  engine, tuned by `CONFIG.fit`), allowing for everything the screen does to it (drags, morphs, extended legs); the
  board glides between fits. A screen with `noZoom` keeps the plain size. Name plates sit on the panel's bottom edge
  (`CONFIG.scene.chipTop`).

## Tests

`qa/logic-test.js` plays every screen and check through the engine without a browser (Node):

```
node qa/logic-test.js
```

## Swiftee's sheets

The game ships only the expressions it plays (about 2.4 MB), listed in `js/swiftee-manifest.js`. After changing a
sheet, rebuild the scarf data: `python3 tools/build-scarf-anchors.py` and `python3 tools/build-scarf-occlusion.py`.
Swiftee's full animation library and its build tools are in git history (commit 2687c66). See `swiftee-assets/README.md`.

## Limits

- Fonts (Baloo 2, Nunito) load from Google Fonts.
- Voice quality depends on the device's installed voices.
