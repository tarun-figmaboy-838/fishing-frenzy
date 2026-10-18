// =====================================================================
// LESSON - every screen as data, in play order (LESSON.steps).
// Screen numbers in comments count from 1 in this order (intro = 1, end = 43, The End = 44).
//
// Step options
//   id           screen name
//   lines        what Swiftee says as the screen opens (see Line options)
//   after        lines played once the task is done
//   task         what has to happen before the screen is done (see Tasks)
//   auto         the task plays by itself, no taps
//   hint         the idle reminder when idle is not set
//   idle         what Swiftee says after CONFIG.timing.idleMs with no input (questions repeat the question instead)
//   f            board display flags (see f flags)
//   build        the shape draws itself with a pen as the screen opens (CONFIG.build)
//   autoNext     ms after the last line before moving on by itself, even with manual navigation
//   sideNums     the four sides get numbers 1-4, each flying in from its own side
//   letterIn     the corner letters start hidden and fly in on a letters line
//   autoAdvance  ms to wait before moving on, used only when CONFIG.flow.autoAdvance is on
//   locked       no Back on this screen
//   layout       'focus' = after the line the bubble fades and the shape moves to centre stage (CONFIG.focus);
//                'recap' = the summary card layer
//   extendDelay  ms after the line before the bases glow and extend (extBases)
//   swapCol      bases purple and legs pink, on this screen only
//   parStrong    bolder, higher-contrast dashed extensions
//   legsSet      legs purple from the first frame (no colour fade)
//   chevPre      parallel arrows hidden until a cue brings them in
//   room         'measure' = the Measuring Kit layout: wide slab, big shape, small Swiftee (CONFIG.measureRoom)
//   lenPre       side lengths hidden until a cue brings them in
//   boardShiftY  px to move the shape up (-) or down (+), on a noZoom screen
//   noZoom       keep the shape at its plain size (lesson screens are fitted to fill the panel, CONFIG.fit)
//   fitBox       the area the shape is fitted to, when a screen has a question above and answers below it
//   fitShape     a drag screen fitted to the shape itself, the same size as the screen before it (not shrunk to make
//                room for every corner position); the corners stop at the ice card's inner edge instead
//   handOnce     one demo hand gesture after the line, never repeated
//   wrongRight   { cm, side }: dragging the corner right by more than cm wiggles side, with the wrong sound
//   tickPre      equal-leg marks hidden until a cue brings them in
//   shape        1 = start from CONFIG.angleShape; 'right' = start from CONFIG.rightShape
//   shapePre     the whole shape hidden until a shapeIn cue
//   voiceDelay   ms Swiftee waits before speaking, so an opening animation can finish
//   anglesIn     angles hidden until the protractor walk measures them
//   practice     a question that is not scored (opts / ok / okChips)
//   optTop       y (px) of the answers
//   chipTop      y (px) of the label row
//   optsAfter    the answers slide in once the question line ends
//   okSum        on a correct answer, the label shows these two angles' real sum, e.g. ['B', 'C']
//   okFx         Motion function run on a correct answer
//   ok           what Swiftee says on a correct answer
//   okChips      labels shown on a correct answer
//   opts         answers: { id, t, ok: true } or { id, t, fb: feedback line }
//   morph        [{ A, B }, ...] top-corner x positions a shapeMorph cue glides through; the last one stays
//   entryPop     the corner handles pop in one by one as the screen opens
//   lockTalk     the corners can't be dragged until Swiftee has finished speaking
//   handMs       ms with no touch before the hand nudge (default CONFIG.hand.idleMs)
//   explore      free play: drags just reshape, nothing is checked; the first real drag shows Done
//   sumSteps     the two angle sums built one pair at a time; 'sym' first turns the values into names
//   right90      90° labels on the right angles
//   r90Pre       right-angle marks and labels hidden until a cue brings them in
//   rightTap     after the line the learner taps the 90° corners; finding them all completes the screen
//   okCheck      a sparkle burst when the task is done
//   noBoard      no shape
//   noPanel      no ice panel
//   summary      the Summary Kit's recall cards (js/summary.js)
//   noIdle       no idle reminders
//   skip         a silent screen that moves on by itself; Back passes over it
//   cfu          check number (1-5)
//   okFx / badFx Motion functions run on a right / wrong answer (they show why on the shape)
//   qFocus       after the question the shape glides up and the answers come in under it (CONFIG.qFocus)
//   qStatic      the question text kept in the bubble; it returns after each feedback line
//   enterFx      Motion function run as the screen opens
//   badFx        Motion function run on a wrong answer
//   idleFx       Motion function run with each hand nudge
//   softWrong    wrong answers shown in soft orange
//   lockNext     Next stays disabled until the screen is solved
//   labelsAt     the drag labels stay hidden and fixed until a cue brings them in
//   instant      each dropped label is checked as it lands
//   end          the lesson-complete screen (title, stars, score, Play again)
//   hero         Swiftee flies to centre stage, with no shape
//
// Tasks
//   extLegs        extend the legs until they meet
//   extBases       extend the bases both ways
//   measure        measure the four sides (auto: Swiftee walks out and measures them)
//   measureAngles  measure the four angles (auto: Swiftee carries a protractor round, js/angle-walker.js)
//   dragA          drag A along the top until both legs are equal (CONFIG.snap.exactCm)
//   dragFree       drag any corner, any way
//   drag90         drag a corner until an angle is 90° (CONFIG.snap.rightAngleDeg)
//
// Line options
//   m                Swiftee's expression for the line (default: talking; see CONFIG.swiftee)
//   t                bubble text (\n = line break)
//   s                spoken text, when it differs from t
//   keep             voice only: the bubble keeps the previous text (needs s)
//   letters          each corner letter in s flies in as it is spoken
//   onStart          Motion function run as the voice starts
//   noEmph           don't grow the parts the line names (it has its own cues)
//   cueAt            { word: 'fn' | { fn, sfx } }: run fn as the voice reaches word (or when the line ends)
//   chips            labels shown with the line: { t, k: style }
//   chipsAt          the labels wait for this word
//   chipsAfterParts  the labels wait until each of these sides has been said
//   chipsAfterPulse  the labels wait a beat after the pulse
//   holdChips        the labels wait for a cue (e.g. showTitle)
//   pulse            the shape zooms up once and back
//   pulseAt          the pulse waits for this word (else it comes when the line ends)
//   glow             sides highlighted during the line, e.g. ['AB', 'CD']
//   glowAt           glow and callout wait for this word, then linger ~1.5 s
//   focusAt          the glow pair comes into focus (others dim) on this word
//   callout          'bases' | 'legs': labels with arrows to the glow pair
//   legsAt           both legs shown equal (lengths and marks) on this word
//   angleCues        each angle the line names gets the focus as it is said
//   pairEnd          these two angles glow together after the line, e.g. ['B', 'C']
//
// f flags (what the board shows)
//   legGlow   legs highlighted
//   baseExt   the bases' dashed extensions in full
//   par       parallel arrows on AB and DC
//   legLen    leg lengths
//   sideLen   base lengths
//   ticks     equal-leg marks
//   arcs      corners whose angle arc and value show, e.g. 'ABCD'
//   focusAng  angle pair in focus (it grows a little; the other angles step back, dimmed), e.g. 'AD'
//   sums      the two live angle-sum panels
//   right     right-angle marks
// =====================================================================
const LESSON = {
  steps: [
    // screens 1-3 run on by themselves (autoNext) as one intro
    { id: 'intro', build: 1, autoNext: 2200, lines: [{ m: 'waving', t: 'Remember we learnt about\nquadrilaterals earlier.' }] },
    // on "4" the sides are numbered 1 to 4, one after another
    { id: 'quadSides', sideNums: 1, autoNext: 2200, lines: [{ m: 'happy', t: 'Any polygon with 4 sides\nis called a quadrilateral.', noEmph: 1, cueAt: { 4: 'sideNumsGo' } }] },
    // spoken "A, B, C, D", shown "ABCD": each letter flies in as it is said
    { id: 'quadName', letterIn: 1, autoNext: 2200, lines: [{ m: 'happy', t: 'We can call it\nquadrilateral ABCD.', s: 'We can call it quadrilateral, A, B, C, D.', letters: 1, letterTimes: [2.28, 2.64, 2.88, 3.30] }] }, // letterTimes: A, B, C, D in the recording (vo003)
    // growFocus: the shape grows to 120% and back as she starts
    { id: 'special', lines: [{ m: 'happy', t: 'This is a special type\nof quadrilateral.', onStart: 'growFocus' },
      { m: 'curious', t: "Let's see what\nmakes it special.", cueAt: { special: 'shapePop' } }] },
    { id: 'meet', lines: [{ m: 'curious', t: 'These two sides look like they will meet.', noEmph: 1, cueAt: { sides: 'glowLegs' } }], f: { legGlow: 1 } },
    // instruction only, nothing to do
    { id: 'extendSay', autoAdvance: 1, locked: 1, lines: [{ m: 'curious', t: "Let's extend them.", cueAt: { extend: 'glowLegs' } }], f: { legGlow: 1 } },
    // opens with the shape at centre stage, no line; D->A then C->B glow and extend dotted until they meet
    { id: 'extend', layout: 'focus', lines: [], task: 'extLegs', auto: 1,
      after: [{ m: 'surprised', t: 'Woah! The sides meet.', s: 'Whoa! The sides meet.' }] },
    // 1 s after the line AB and DC glow once, then A->B and D->C each extend both ways
    { id: 'other', extendDelay: 1000, lines: [{ m: 'curious', t: "Let's check the other\npair of sides." }], task: 'extBases', auto: 1 },
    // the parallel sides and their extensions pulse on "pair" and again on "meet"
    { id: 'parallel', parStrong: 1, lines: [{ m: 'surprised', t: 'This pair of sides\ndoes not meet.', noEmph: 1, cueAt: { pair: 'parPulse', meet: 'parPulse' } }], f: { baseExt: 1 } },
    // second line is voice only; its label appears once "A B" and "C D" have both been said
    { id: 'abcd', lines: [{ t: 'This means the sides are parallel to each other.', cueAt: { parallel: 'parPulse' } },
      { keep: 1, s: 'A B is parallel to C D.', chipsAfterParts: ['AB', 'CD'], chips: [{ t: 'AB ∥ CD', k: 'white' }] }], f: { par: 1 } },
    { id: 'onePair', lines: [{ t: "So this quadrilateral has\none pair of parallel sides.", noEmph: 1, cueAt: { parallel: 'parPulse' }, chips: [{ t: 'AB ∥ CD', k: 'white' }] }], f: { par: 1 } },
    { id: 'def', lines: [{ t: 'We call this a trapezium.', pulse: 1, pulseAt: 'trapezium', chipsAt: 'trapezium', chipsAfterPulse: 1, holdChips: 1, chips: [{ t: 'Trapezium', k: 'name' }] }], f: { par: 1 } },
    // "quadrilateral": the sides trace in; "parallel": AB and DC glow and the arrows pop on;
    // "trapezium": the name label pops in
    { id: 'defFull', legsSet: 1, chevPre: 1, lines: [{ t: 'A quadrilateral with at least\none pair of parallel sides\nis called a trapezium.', noEmph: 1, holdChips: 1,
      cueAt: { quadrilateral: 'defTrace', parallel: 'defParallel', trapezium: 'showTitle' }, chips: [{ t: 'Trapezium', k: 'name' }] }], f: { par: 1 } },
    // check 1, straight after the definition: which of these is a trapezium?
    { id: 'cfu1', cfu: 1, idle: 'Look for the shape with exactly one pair of parallel sides.', hint: 'Check 1 of 5 · Which one is a trapezium?',
      okFx: 'q1Correct',
      // cueTimes from the recording (vo185): "quadrilaterals" 0.88 s, "trapezium" 2.24 s
      lines: [{ m: 'curious', t: 'Which of these quadrilaterals is a trapezium?', cueAt: { quadrilaterals: 'q1Cards', trapezium: 'q1Look' }, cueTimes: { trapezium: 2.24 } }],
      ok: 'Correct! It has one pair of parallel sides, so it is a trapezium.',
      opts: [
        { id: 'A', ok: true },
        { id: 'B', fb: 'Look at each side of this shape. No two sides are parallel, so it is not a trapezium.' },
        { id: 'C', fb: 'This shape has no parallel sides at all.' },
        { id: 'D', fb: 'Look at each side of this shape. No two sides are parallel, so it is not a trapezium.' }
      ] },
    { id: 'bases', lines: [{ t: 'The parallel sides\nare called bases.', glow: ['AB', 'CD'], focusAt: 'parallel', glowAt: 'bases', callout: 'bases' }], f: { par: 1 } },
    { id: 'legs', fitBox: { cx: 839 }, // (cx: shape and labels centred together in the card: the Leg pills reach further right than left)
      lines: [{ t: 'The other two sides\nare called legs.', glow: ['DA', 'BC'], focusAt: 'other', glowAt: 'legs', callout: 'legs', cueTimes: { sides: 0.64 } }], f: { par: 1 } },
    // after the line Swiftee walks out and measures each side; on "sides" each length pops in its own colour
    { id: 'measure', room: 'measure', lines: [{ m: 'curious', t: "Let's measure the sides\nof this trapezium." }], task: 'measure', auto: 1,
      after: [{ m: 'surprised', t: 'Woah! All the sides of\nthis trapezium are of\ndifferent lengths.', s: 'Whoa! All the sides of this trapezium are of different lengths.', noEmph: 1, cueAt: { sides: 'lenColors' } }], hint: 'Tap the glowing side to measure it', idle: 'Tap the glowing side and I will measure it.', f: { par: 1 } },
    // "trapezium": the shape pops; "sides": the lengths pop in one by one; "scalene": the name label.
    { id: 'scalene', fitBox: { cx: 864 }, // (cx: shape and labels centred together in the card: its length labels reach further right)
      lenPre: 1, lines: [{ t: 'This type of trapezium which\nhas sides of different lengths\nis called a scalene trapezium.', holdChips: 1, noEmph: 1,
      cueAt: { trapezium: 'shapePop', sides: 'lensSeq', scalene: 'showTitle' }, chips: [{ t: 'Scalene trapezium', k: 'name' }] }],
      f: { par: 1, legLen: 1, sideLen: 1 } },
    // a longer autoNext so the last line can be read
    { id: 'legsDiff', fitBox: { cx: 889 }, // (cx: shape and labels centred together in the card: its length labels reach further left)
      autoNext: 2600, lines: [
      { m: 'surprised', t: 'Look! Its legs are of\ndifferent length too.', noEmph: 1, cueAt: { different: 'legsPop' } },
      { m: 'curious', t: 'What if the legs were\nthe same length?', noEmph: 1, cueAt: { legs: 'legsTogether' } },
      { m: 'excited', t: "Let's find out.", cueAt: { find: 'findOut' } }],
      f: { par: 1, legLen: 1, sideLen: 1 } },
    // a silent beat between "Let's find out." and the drag (no dialogue); it moves on by itself and Back skips it
    { id: 'equal', fitBox: { cx: 889 }, // (cx: shape and labels centred together in the card: as screen 18)
      skip: 1, autoNext: 900, lines: [], f: { par: 1, legLen: 1, sideLen: 1 } },
    // one demo hand after the line. Dragging A right (the wrong way) wiggles BC: A has only ~0.75 cm
    // before B stops it, so the limit is 0.5 cm. Equal legs snap into place and finish the task
    { id: 'equalDrag', fitBox: { cx: 889 }, // (cx: shape and labels centred together in the card: as screen 18)
      lines: [{ m: 'curious', t: 'Drag vertex A so that both\nthe legs are of equal length.' }],
      task: 'dragA', handOnce: 1, wrongRight: { cm: 0.5, side: 'BC' }, hint: 'Drag point A along the top side', after: [{ m: 'happy', t: 'Perfect! Both legs are equal.' }],
      revealLine: 'Watch! AD becomes 5 cm, just like BC. Now both legs are equal.', // (said as A glides there after a second wrong try)
      f: { par: 1, legLen: 1, sideLen: 1 } },
    // "trapezium": the shape pops; "same": both legs light up with their lengths;
    // "isosceles": the lengths shrink into the equal marks, then the name label pops in
    { id: 'iso', lenPre: 1, tickPre: 1, lines: [{ t: 'A trapezium where legs are\nof same length is called\nan isosceles trapezium.', legsAt: 'same', holdChips: 1, noEmph: 1,
      cueAt: { trapezium: 'shapePop', isosceles: 'isoName' }, chips: [{ t: 'Isosceles trapezium', k: 'name' }] }],
      f: { par: 1, legLen: 1, ticks: 1 } },
    // from here on the angle shape (A 120°, B 105°, C 75°, D 60°); it fades in as she starts,
    // the arrows pop on at "sides" and the name label at "trapezium"
    { id: 'sidesDone', shape: 1, shapePre: 1, chevPre: 1, voiceDelay: 400, lines: [{ m: 'happy', t: 'We know all about the sides\nof a trapezium.', noEmph: 1, onStart: 'shapeIn',
      holdChips: 1, cueAt: { sides: 'chevIn', trapezium: 'showTitle' }, chips: [{ t: 'Trapezium', k: 'name' }] }], f: { par: 1 } },
    // check 2, after the sides (scalene, isosceles): the missing side of an isosceles trapezium
    { id: 'cfu5', cfu: 5, idle: 'BC is a leg. What do you know about the legs of an isosceles trapezium?', hint: 'Check 2 of 5 · Find the missing side', optTop: 458, plateOptDy: 36, // (in the card: clear of the 10 cm and the corner letters) okFx: 'q5Correct', badFx: 'q5Wrong', optsAfter: 1,
      // cueTimes from the recording (vo200, the lengths said in full): "A B" 2.06 s, "C D" 4.24, "A D" 6.84, "B C" 9.84
      lines: [{ m: 'curious', t: 'In an isosceles trapezium, AB = 6 cm, CD = 10 cm and AD = 5 cm. What is the length of BC?', cueAt: { ab: 'q5AB', cd: 'q5CD', ad: 'q5AD', bc: 'q5BC' },
        cueTimes: { 'AB = 6 cm': 2.06, 'CD = 10 cm': 4.24, 'AD = 5 cm': 6.84, BC: 9.84 } }],
      ok: 'Yes! In an isosceles trapezium the legs are equal, so BC = 5 cm.',
      opts: [
        { id: 'a', t: '4 cm', fb: 'BC is a leg. In an isosceles trapezium, both legs are equal.' },
        { id: 'b', t: '5 cm', ok: true },
        { id: 'c', t: '6 cm', fb: '6 cm is the top base AB. BC is a leg, like AD.' },
        { id: 'd', t: '8 cm', fb: 'BC is a leg. In an isosceles trapezium, both legs are equal.' } // (8, not 10: four short answers sit level; its feedback is the recorded line 4 cm has)
      ] },
    // after the line Swiftee carries a protractor round A, B, C, D; each angle appears as she holds it there
    { id: 'angles', room: 'measure', anglesIn: 1, task: 'measureAngles', auto: 1, lines: [{ m: 'curious', t: "Let's measure its angles." }], f: { par: 1, arcs: 'ABCD' } },
    // 120° (A) and 60° (D) in focus: the pair the next screen adds up
    { id: 'notice', lines: [{ m: 'thinking', t: 'Did you notice something?', cueAt: { notice: 'growAD' } }], f: { par: 1, arcs: 'ABCD', focusAng: 'AD' } },
    // "∠A + ∠D = ?" rises in; each value jumps into the sum as its angle is named, and they add up on "180". cueTimes: measured in the recording
    // (vo058): "angle A" 0.06-0.86 s, "angle D" 1.22-1.92, "one hundred eighty" 2.78
    { id: 'sumAD', lines: [{ m: 'surprised', t: '∠A and ∠D add up to 180°.', onStart: 'eqStart',
      cueAt: { '∠A': 'eqFlyA', '∠D': 'eqFlyD', 180: { fn: 'eqResult', sfx: 'snap' } }, cueTimes: { '∠A': 0.56, '∠D': 1.7, '180°': 2.8 } }], f: { par: 1, arcs: 'ABCD', focusAng: 'AD' } },
    // "supplementary": DC extends past D and a copy of 120° turns onto it beside 60°, a straight angle;
    // "angles": the equation glows
    { id: 'supp', lines: [{ m: 'happy', t: 'That means they are\nsupplementary angles.', onStart: 'suppStart',
      cueAt: { supplementary: 'suppAtAD', angles: 'suppConfirmLater' }, chips: [{ t: '∠A + ∠D = 180°', k: 'gold' }] }], f: { par: 1, arcs: 'ABCD', focusAng: 'AD' } },
    // ∠B then ∠C get the focus as they are named, then the answers slide in. A correct answer shows
    // the real sum, and 105° turns onto the extended base beside 75° (okFx)
    // the shape, then the question chip under it, centred together above the answers (shape with its letters 128-377,
    // chip 399-454, answers from 486). voiceDelay: the board glides into this smaller frame first, so the question chip
    // never meets a corner on the way
    { id: 'askBC', practice: 1, fitBox: { cy: 250, h: 282 }, optTop: 486, chipTop: 375, voiceDelay: 750, idle: 'What about ∠B and ∠C?',
      optsAfter: 1, okSum: ['B', 'C'], okFx: 'suppAtBC',
      // cueTimes from the recording (vo060): "angle B" 0.90-1.66 s (B at 1.40), "angle C" 2.08-2.70 (C at 2.44)
      lines: [{ m: 'curious', t: 'What about ∠B and ∠C?', angleCues: 1, pairEnd: ['B', 'C'], onStart: 'askIn', cueTimes: { '∠B': 1.4, '∠C': 2.44 }, chips: [{ t: '∠B + ∠C = ?', k: 'white' }] }],
      ok: 'Correct! ∠B and ∠C are\nsupplementary angles too.', revealLine: 'It is 180°! Like ∠A and ∠D, ∠B and ∠C add up to 180°.', // (after a second wrong pick) okChips: [{ t: '∠B + ∠C = 180°', k: 'gold' }],
      opts: [
        { id: '90', t: '90°', fb: 'Not quite. Try again.' },
        { id: '180', t: '180°', ok: true },
        { id: '360', t: '360°', fb: '360° is the sum of all four angles. Try again.' }
      ], f: { par: 1, arcs: 'ABCD', focusAng: 'BC' } },
    // on "change" the top corners glide through the morph shapes; on "trapezium" the last one settles.
    // That shape carries on to screen 29
    { id: 'whatIf', morph: [{ A: 100, B: 300 }, { A: 215, B: 398 }, { A: 128, B: 378 }],
      lines: [{ m: 'curious', t: 'What if we change the shape\nof this trapezium?', onStart: 'whatIfStart', cueAt: { change: 'shapeMorph', trapezium: 'shapeSettle' } }], f: { par: 1, arcs: 'ABCD' } },
    // on "change" a guide hand drags A and back; on "sum" each pair pulses with its panel
    // fitBox: the shape and the sums under it, centred together in the ice card (Done sits on the card's bottom edge)
    { id: 'dragSum', entryPop: 1, lockTalk: 1, handMs: 3000, explore: 1, fitBox: { cx: 901, cy: 330 }, // (cx: the shape sits left of its drag range's middle)
      lines: [{ m: 'curious', t: 'Drag any vertex to change\nthe angles. Notice the\nsum of angles.', cueAt: { change: 'demoDrag', sum: 'sumPanels' } }],
      task: 'dragFree', hint: 'Drag any corner and watch the sums', idle: 'Drag any corner and watch the two sums.',
      f: { par: 1, arcs: 'ABCD', sums: 1 } },
    { id: 'always', sumSteps: 1, lines: [{ m: 'happy', t: 'No matter the shape, the angles\nalways add up to 180°.' }], f: { par: 1, arcs: 'ABCD' } },
    { id: 'rule', sumSteps: 'sym', lines: [{ t: 'So in any trapezium,\nangles on the same leg\nalways add up to 180°.' }], f: { par: 1, arcs: 'ABCD' } },
    // check 3, after the angle rule (angles on the same leg add up to 180°): the missing angle
    { id: 'cfu3', cfu: 3, idle: 'In this trapezium, ∠A = 120°. What is the value of ∠D?', hint: 'Check 3 of 5 · Find the missing angle', optTop: 482, plateOptDy: 20,
      enterFx: 'q3In', okFx: 'q3Correct', badFx: 'q3Wrong', idleFx: 'q3Idle', optsAfter: 1, softWrong: 1, handMs: 3000, voiceDelay: 1300,
      // cueTimes from the recording (vo193): "trapezium" 0.82 s, "angle A" 1.88-2.58, "one hundred twenty" 2.92, "value" 5.66,
      // "angle D" 6.32-6.92 (D at 6.72). "∠A = 120°." is one word: at 2.5 s A's wedge opens and its 120° lands on "one hundred twenty"
      lines: [{ m: 'curious', t: 'In this trapezium, ∠A = 120°. What is the value of ∠D?', cueAt: { trapezium: 'q3Shape', 120: 'q3A', value: 'q3D' },
        cueTimes: { trapezium: 0.82, '∠A = 120°': 2.5, value: 5.66, '∠D': 6.72 } }],
      ok: 'Correct! 120° + 60° = 180°.',
      opts: [
        { id: 'a', t: '120°', fb: 'Angles on the same leg add up to 180°.' },
        { id: 'b', t: '60°', ok: true },
        { id: 'c', t: '50°', fb: 'Angles on the same leg add up to 180°.' },
        { id: 'd', t: '180°', fb: 'Angles on the same leg add up to 180°.' }
      ] },
    { id: 'what90', lines: [{ m: 'curious', t: 'What if we make one of\nthe angles 90°?', cueAt: { 90: { fn: 'vertexPulse', sfx: 'chime' } } }], f: { par: 1, arcs: 'ABCD' } },
    { id: 'make90', fitShape: 1, lines: [{ m: 'curious', t: 'Drag any vertex to make any angle 90°.' }],
      task: 'drag90', hint: 'Drag a corner until an angle is 90°', idle: 'Drag a corner slowly and stop when an angle shows 90°.',
      after: [{ m: 'happy', t: 'Great job!' }], revealLine: 'Watch! Now ∠{k} is 90°. That is a right angle.', // ({k}: the corner she puts right)
      f: { par: 1, arcs: 'ABCD' } },
    // the learner's right angle glows; on "another" its partner on the same leg (also 90°) joins it
    { id: 'another90', lines: [{ m: 'surprised', t: 'Woah! We got another\nright angle.', noEmph: 1, cueAt: { woah: 'anotherStart', another: 'anotherReveal' } }], f: { par: 1, arcs: 'ABCD' } },
    // "adjacent": the arrows glide on; "right": both 90° marks draw in;
    // "called": the name label. Then Swiftee asks the learner to tap the two 90° corners: every corner gets a ring
    // (so the learner has to find them), a found one stops pulsing, and finding both is cheered
    { id: 'right', shape: 'right', right90: 1, r90Pre: 1, chevPre: 1, rightTap: 1, okCheck: 1,
      hint: 'Tap the two 90° corners', idle: 'Can you tap the two right angles?', revealLine: 'Here they are! ∠A and ∠D are both 90°.', // (after a second wrong tap) // (the recorded line, so the reminder is in Swiftee's voice)
      lines: [{ t: 'A trapezium with two adjacent\nright angles is called a\nright angled trapezium.', noEmph: 1,
        holdChips: 1, cueAt: { trapezium: 'chevIn', right: 'rightBoth', called: 'showTitle' }, chips: [{ t: 'Right trapezium', k: 'name' }] },
        { m: 'curious', t: 'Can you tap the two\nright angles?', holdChips: 1 }],
      f: { par: 1, right: 1 } },
    // checks 4 and 5, once all three types are taught (the right trapezium last): which type, then label all three
    { id: 'cfu2', cfu: 2, qFocus: 1, qStatic: 'Which type of trapezium is this?', idle: 'Which type of trapezium is this?', hint: 'Check 4 of 5 · Which type of trapezium?', optTop: 376, okFx: 'q2Correct', badFx: 'q2Wrong',
      lines: [{ m: 'curious', t: 'Which type of trapezium is this?', cueAt: { type: 'q2Shape' } }],
      ok: 'Right! The marks show its legs are equal, so it is an isosceles trapezium.',
      opts: [
        { id: 's', t: 'Scalene', fb: 'Look at the little marks on the legs. They tell us the legs are equal.' },
        { id: 'i', t: 'Isosceles', ok: true },
        { id: 'r', t: 'Right', fb: 'There are no right angles in this shape. Look at the legs instead.' }
      ] },
    { id: 'cfu4', cfu: 4, qStatic: 'Drag the labels to their\ncorrect place.', idle: 'Drag the labels to their correct place.', lockNext: 1, hint: 'Check 5 of 5 · Drag each label to its shape',
      enterFx: 'q4In', labelsAt: 1, instant: 1, handMs: 3000,
      lines: [{ m: 'curious', t: 'Drag the labels to their\ncorrect place.', cueAt: { drag: 'q4Shapes', labels: 'q4LabelsIn', place: 'q4HiShapes' } }],
      ok: 'Brilliant! You labelled all three trapeziums.' },
    // Swiftee flies to centre stage (as on screen 43) and speaks once she has landed; screen 37 starts with her there
    { id: 'wellDone', noBoard: 1, noPanel: 1, hero: 1, voiceDelay: 1100, lines: [{ m: 'celebrating', t: 'Great job! Now you know\nall about trapeziums.' }] },
    // after this line eight idea cards are shown and explained one by one
    { id: 'recap', noBoard: 1, layout: 'recap', summary: 1, noIdle: 1, autoAdvance: 500, // (the lesson's last screen: no long beat before Swiftee leaves)
      lines: [{ m: 'happy', t: "Let's recall what\nwe learnt today." }] },
    // "120" opens ∠A; "value" runs a light down AD to a "?" at D. A wrong answer brings in
    // "120° + ? = 180°" under the shape; the right one flies 60° to D and the equation resolves
    // "drag" lights each shape's clue, "labels" brings the labels in, "place" lights the boxes
    // Swiftee flies to centre stage and speaks once she has landed, she says goodbye, and screen 44 follows by itself
    { id: 'end', end: 1, hero: 1, voiceDelay: 1100, autoNext: 700,
      lines: [{ m: 'celebrating', t: 'Amazing work! You know all about trapeziums now.' }, { m: 'waving', t: 'Bye for now! See you on\nour next snowy adventure!' }] },
    // the cartoon closer (js/finale.js): an iris closes on Swiftee, the sunburst, "The End", Play again
    { id: 'theEnd', end: 1, hero: 1, finale: 1, noIdle: 1, lines: [] }
  ],
  cfu4: {
    labels: [{ id: 'iso', t: 'Isosceles' }, { id: 'right', t: 'Right' }, { id: 'scal', t: 'Scalene' }],
    slots: [{ id: 's0', ans: 'scal', y: 170 }, { id: 's1', ans: 'iso', y: 274 }, { id: 's2', ans: 'right', y: 378 }]
  }
};
