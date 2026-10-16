// =====================================================================
// CONFIG - tuning values for the board, snapping, pacing and limits.
// Screen numbers count from 1 in LESSON.steps order. Times are in ms and positions in px unless named otherwise.
// =====================================================================
const CONFIG = {
  pxPerCm: 40,                       // board scale: 1 cm = 40 board px
  board: { x: 640, y: 104 },         // where index.html puts the board (its svg's left / top, stage px)
  start: { D: 45, C: 405, baseY: 340, height: 195.96, legAD: 7, legBC: 5 }, // opening shape: AB 3, BC 5, CD 9, AD 7 cm (height = √24 cm)
  limits: { minTop: 90, minBottom: 160, maxLegRun: 243, minX: 16, maxX: 478 }, // drag limits: shortest top / bottom base, longest sideways leg run, corner x range
  // screen 35: the right trapezium (A and D at 90°, so DA is vertical)
  rightShape: { A: 45, B: 300, C: 405, D: 45 },
  // screen 22 on: A 120°, B 105°, C 75°, D 60° (corner x only; the bases keep their heights)
  angleShape: { A: 158.14, B: 352.49, C: 405, D: 45 },
  // exactCm: screen 20 counts the legs equal within this (their labels show one decimal);
  // rightAngleDeg: screen 33 snaps a corner to 90° within this many degrees
  snap: { exactCm: 0.05, rightAngleDeg: 5 },
  // recorded effects (the rest are synthesised): good = every correct action, bad = every wrong one
  sounds: { good: 'assets/audio/correct.mp3', bad: 'assets/audio/incorrect.mp3' },
  soundVolume: 0.9,
  drag: { wrongGapMs: 1200 },        // wrong-way drag feedback (wiggle + sound) at most once per this long
  // a part named in the voice-over grows briefly and holds this long before easing back
  emph: { holdMs: 1300 },
  // screens 7-8: side trace and dotted extension speed (board px per ms); pause between the two sides
  trace: { pxPerMs: 0.4, gapMs: 250 },
  // screen 1: pen speed round the outline (board px per ms), delay after the screen opens, outline glow time
  build: { pxPerMs: 0.36, delayMs: 450, settleMs: 1300 },
  // screen 3: corner letters never land closer together than this
  letters: { minGapMs: 260 },
  // qFocus question (screen 39): bubble hold and fade after the question; the shape's centre x and its top
  // before and after it glides up; the answer row's top and width (stage px)
  // check 4 (screen 41): the whole task drawn larger to fill the ice card, as one group (scale k about ox, oy, then
  // moved down ty); its drag maths converts the pointer back into the group's own px
  q4: { k: 1.12, ox: 876, oy: 345, ty: 4 },
  qFocus: { holdMs: 700, fadeMs: 350, cx: 876, shapeTop0: 205, shapeTop: 150, optTop: 450, optW: 680 },
  // idleMs: no-touch wait before a spoken reminder (at most idleMaxHints per screen); navLockMs: minimum gap between
  // Next / Back taps; speechRate: voice speed (1 = normal); lineGapMs: pause after each line
  timing: { idleMs: 9000, idleMaxHints: 3, navLockMs: 450, speechRate: 0.86, lineGapMs: 1100 },
  // autoAdvance: a finished screen moves on by itself after advanceMs (the lesson has no Next or Back), waiting at
  // most busyMaxMs more for an animation still playing on the board; cover: open on the lesson's own front page
  // (off: the journey's front page, index.html at the root, comes before the lesson)
  flow: { autoAdvance: true, advanceMs: 2500, busyMaxMs: 8000, cover: false },
  // every screen: shape nudged right to centre it in the panel (boardX, on noZoom screens); the label row sits on the
  // panel's bottom edge (chipTop: the row's top, so a name plate's middle lands on the edge)
  scene: { boardX: 11, chipTop: 571, chipLeft: 616 },
  // lesson screens: the shape is fitted to fill the ice panel, screen by screen (engine fitFor): the panel's inner
  // area (centre cx / cy, size w x h, stage px), room kept round the shape for its letters and labels (board px), and
  // the most it may grow. A screen with noZoom keeps the plain layout (answers round the shape); lessonZoom is the
  // fallback before the first screen is fitted
  fit: { cx: 876, cy: 346, w: 714, h: 474, padX: 62, padTop: 58, padBottom: 52, maxScale: 1.5 },
  // in the journey's card, on a 'plate' screen (no Swiftee, no ice panel: her line is a plate at the top), the shape
  // is fitted big in the middle of the card, under the plate and above the name plates (game-engine isPlate / fitFor)
  fitPlate: { cx: 640, cy: 378, w: 1040, h: 450, padX: 70, padTop: 60, padBottom: 56, maxScale: 2.1, chipTop: 606 },
  lessonZoom: { scale: 1.3, tx: -56.5, ty: -88.6 },
  // Measuring Kit layout (screens 16 and 23): board scale and offset that put the shape large on the slab (which fills
  // the stage, index.html), right of Swiftee, with room above and below its corners for the protractor
  measureRoom: { scale: 1.6, tx: -257, ty: -122 },
  // layout 'focus' (screen 7): bubble hold and fade after the line, the shape's move to centre, wait before the hand
  focus: { holdMs: 3000, fadeMs: 350, moveMs: 700, handMs: 5000 },
  // screen 16 measuring walk: her size on the shape, fallback home spot and size, walk time per cm measured,
  // pause between sides, stroll speed to and from the shape (px per ms)
  walker: { size: 150, homeX: 183, homeY: 631, homeSize: 259, msPerCm: 380, pauseMs: 550, strollPxPerMs: 0.42,
    tips: [[488, 272], [484, 281], [494, 273], [489, 270], [486, 278], [483, 279], [491, 281], [489, 281]] }, // tape exit per walk frame (@2x cell px)
  // screen 23 protractor walk (js/angle-walker.js): scale = stage px per kit board unit (sized so the protractor
  // covers the drawn angle); homeK = her home size
  // against her size on the board; carryPx = protractor offset from the vertex between corners; hop = how far her
  // path bows out round a side; bob = px of bob every stepPx; tiltMax = most a drawing may turn (deg);
  // leadMs = wait after her line; firstMs = shortest walk to or from her spot; the rest are move timings
  angleWalk: { scale: 1.6, homeK: 1.52, carryPx: 28, hop: 60, stepPx: 45, bob: 5, tiltMax: 33, leadMs: 900,
    firstMs: 950, moveMs: 600, placeMs: 400, alignMs: 420, measureMs: 300, holdMs: 900, liftMs: 350, fadeMs: 250 },
  // idle antics: after idleMs with nothing happening Swiftee amuses herself, cycling through these expressions
  antics: { idleMs: 15000, list: ['sleeping', 'daydreaming', 'playful', 'reading'] },
  hand: { idleMs: 8000, showMs: 4400, maxShows: 4, // hand nudge: wait with no touch, time on screen, showings per step
    onceDelayMs: 500, onceMs: 2300 },                 // handOnce screens: delay after the line, time on screen
  // Swiftee's expressions (state names from js/swiftee-manifest.js, which lists the sheets the game ships).
  // A line's own m wins; these cover reactions and the pose held between lines.
  swiftee: {
    base: 'swiftee-assets/',
    talk: 'talking',       // default while a line is spoken
    idle: 'blinking',      // between lines and while the learner works on a task
    waiting: 'thinking',   // a check question is open
    praise: 'happy',       // a task is completed
    correct: 'celebrating',// a check is answered correctly
    wrong: 'confused',     // a wrong answer or tap: encouraging, never punishing
    nudge: 'curious',      // idle hint
    done: 'happy',         // the lesson-complete screen
    reactMs: 1600,         // how long the line's expression shows after speaking
    minHoldMs: 900         // an expression holds at least this long, so quick lines don't flicker
  }
};
// An angle's size on screen (its arc's radius, stage px) for an angle of deg degrees. Every angle shows the same amount
// of colour: a narrow angle reaches a little further along its sides and a wide one a little less (90° = 38 px), so a
// 60° angle never looks smaller than a 120° one. Board, measuring trace, check 3 and the summary cards all use it.
CONFIG.angleR = (deg) => 38 * Math.min(1.25, Math.max(0.85, Math.sqrt(90 / Math.max(1, deg))));
