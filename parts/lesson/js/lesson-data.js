// =====================================================================
// LESSON - every screen as data, in play order (LESSON.steps).
// Screen numbers in comments count from 1 in this order (intro = 1, end = 34, The End = 35).
// Every word the learner reads is looked up by key (T, shell/i18n.js; the lines are in locales/locales.json). Pure
// mathematics - "5 cm", "90°", "∠A + ∠D = 180°", "AB ∥ CD" - reads the same in every language and stays here.
//
// Step options
//   id           screen name
//   lines        what Swiftee says as the screen opens (see Line options)
//   after        lines played once the task is done
//   task         what has to happen before the screen is done (see Tasks)
//   auto         the task plays by itself, no taps
//   f            board display flags (see f flags)
//   build        the shape draws itself with a pen as the screen opens (CONFIG.build)
//   autoNext     ms after the last line before moving on by itself, even with manual navigation
//   sideNums     the four sides get numbers 1-4, each flying in from its own side
//   noLetters    the corner letters stay hidden (screen 1: they fly in on screen 3)
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
//   noBoard      no shape
//   noPanel      no ice panel
//   summary      the Summary Kit's recall cards (js/summary.js)
//   skip         a silent screen that moves on by itself; Back passes over it
//   cfu          check number (1-5)
//   okFx / badFx Motion functions run on a right / wrong answer (they show why on the shape)
//   qFocus       after the question the shape glides up and the answers come in under it (CONFIG.qFocus)
//   qStatic      the question text kept in the bubble; it returns after each feedback line
//   enterFx      Motion function run as the screen opens
//   badFx        Motion function run on a wrong answer
//   idleFx       Motion function run with each hand nudge
//   softWrong    wrong answers shown in soft orange
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
//   t                bubble text (\n = line break), by key: T('key') from locales/locales.json (shell/i18n.js)
//   s                spoken text, when it differs from t: the English recording's own wording (it finds the clip and
//                    times the corner letters), so it stays English until the voice-over is translated
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
    // screens 1-2 run on by themselves (autoNext) as one intro. The pen draws the shape as Swiftee arrives; on "4" (once
    // the outline is drawn) the sides are numbered 1 to 4, one after another
    // the lesson opens with Swiftee (she dives in) while the pen draws the shape; the corner letters wait for screen 3
    { id: 'intro', build: 1, noLetters: 1, autoNext: 2200, lines: [{ m: 'waving', t: T('lsRemember') }] },
    // in the narration box: on "4" the sides are numbered 1 to 4, one after another
    { id: 'quadSides', sideNums: 1, autoNext: 2200, lines: [{ m: 'happy', t: T('lsAnyPolygon'), noEmph: 1, cueAt: { 4: 'sideNumsGo' } }] },
    // spoken "A, B, C, D", shown "ABCD": each letter flies in as it is said
    { id: 'quadName', letterIn: 1, autoNext: 2200, lines: [{ m: 'happy', t: T('lsCallIt'), s: 'We can call it quadrilateral, A, B, C, D.', letters: 1, noEmph: 1, letterTimes: [2.28, 2.64, 2.88, 3.30] }] }, // letterTimes: A, B, C, D in the recording (vo003)
    // growFocus: the shape grows to 120% and back as she starts
    { id: 'special', lines: [{ m: 'happy', t: T('lsSpecialType'), onStart: 'growFocus' },
      { m: 'curious', t: T('lsSeeSpecial'), cueAt: { special: 'shapePop' } }] },
    { id: 'meet', lines: [{ m: 'curious', t: T('lsLookMeet'), noEmph: 1, cueAt: { sides: 'glowLegs' } }], f: { legGlow: 1 } },
    // on "extend" both legs run on out of their ends, dotted, until they meet, the camera pulling back as they climb
    { id: 'extend', lines: [{ m: 'curious', t: T('lsExtendThem'), noEmph: 1, cueAt: { extend: 'extendLegs' } }], task: 'extLegs', auto: 1,
      after: [{ m: 'surprised', t: T('lsSidesMeet'), s: 'Whoa! The sides meet.' }] },
    // 1 s after the line AB and DC glow once, then A->B and D->C each extend both ways
    { id: 'other', extendDelay: 1000, lines: [{ m: 'curious', t: T('lsCheckOther') }], task: 'extBases', auto: 1 },
    // the parallel sides and their extensions pulse on "pair" and again on "meet"
    { id: 'parallel', parStrong: 1, lines: [{ m: 'surprised', t: T('lsPairNotMeet'), noEmph: 1, cueAt: { pair: 'parPulse', meet: 'parPulse' } }], f: { baseExt: 1 } },
    // second line is voice only; its label appears once "A B" and "C D" have both been said
    { id: 'abcd', lines: [{ t: T('lsMeansParallel'), cueAt: { parallel: 'parPulse' } },
      { keep: 1, s: T('lsAbParallelCd'), chipsAfterParts: ['AB', 'CD'], chips: [{ t: 'AB ∥ CD', k: 'white par' }] }], f: { par: 1 } },
    // "parallel": the arrows glide on (as on the right trapezium's definition, no tracing of the sides);
    // "trapezium": the name label pops in
    { id: 'defFull', legsSet: 1, chevPre: 1, lines: [{ t: T('lsBigSecret'), noEmph: 1 },
      { t: T('lsOnePairEnough'), noEmph: 1, cueAt: { parallel: 'chevIn' } },
      { t: T('lsThenTrapezium'), noEmph: 1, holdChips: 1, cueAt: { trapezium: 'showTitle' }, chips: [{ t: T('shapeTrapezium'), k: 'name' }] }], f: { par: 1 } },
    // check 1, straight after the definition: which of these is a trapezium?
    { id: 'cfu1', cfu: 1, 
      okFx: 'q1Correct',
      // cueTimes from the recording (vo185): "quadrilaterals" 0.88 s, "trapezium" 2.24 s
      lines: [{ m: 'curious', t: T('lsWhichTrapezium'), cueAt: { quadrilaterals: 'q1Cards', trapezium: 'q1Look' }, cueTimes: { trapezium: 2.24 } }],
      ok: [T('lsCorrect'), T('lsHasOnePair'), T('lsSoTrapezium')],
      opts: [
        { id: 'A', ok: true },
        { id: 'B', fb: [T('lsOopsNoParallel'), T('lsNotTrapezium')] },
        { id: 'C', fb: T('lsNoParallelAtAll') },
        { id: 'D', fb: [T('lsOopsNoParallel'), T('lsNotTrapezium')] }
      ] },
    { id: 'bases', fitBox: { padTop: 78, padBottom: 78 }, // (room above and below the shape for the two Base pills, clear of the plate)
      lines: [{ t: T('lsCalledBases'), glow: ['AB', 'CD'], focusAt: 'parallel', glowAt: 'bases', callout: 'bases' }], f: { par: 1 } },
    { id: 'legs', fitBox: { cx: 839 }, // (cx: shape and labels centred together in the card: the Leg pills reach further right than left)
      lines: [{ t: T('lsCalledLegs'), glow: ['DA', 'BC'], focusAt: 'other', glowAt: 'legs', callout: 'legs', cueTimes: { sides: 0.64 } }], f: { par: 1 } },
    // after the line Swiftee walks out and measures each side; on "sides" each length pops in its own colour
    { id: 'measure', room: 'measure', lines: [{ m: 'curious', t: T('lsMeasureSides') }], task: 'measure', auto: 1,
      after: [{ m: 'surprised', t: T('lsAllDifferent'), s: 'Whoa! All the sides of this trapezium are of different lengths.', noEmph: 1, cueAt: { sides: 'lenColors' } }], f: { par: 1 } },
    // "trapezium": the shape pops; "sides": the lengths pop in one by one; "scalene": the name label.
    { id: 'scalene', fitBox: { cx: 864 }, // (cx: shape and labels centred together in the card: its length labels reach further right)
      lenPre: 1, lines: [{ t: T('lsLookTrapezium'), noEmph: 1, cueAt: { trapezium: 'shapePop' } },
      { t: T('lsAllSidesDiff'), noEmph: 1, cueAt: { sides: 'lensSeq' } },
      { t: T('lsScaleneIs'), holdChips: 1, noEmph: 1, cueAt: { scalene: 'showTitle' }, chips: [{ t: T('lsScaleneTrapezium'), k: 'name' }] }],
      f: { par: 1, legLen: 1, sideLen: 1 } },
    // a longer autoNext so the last line can be read
    { id: 'legsDiff', fitBox: { cx: 889 }, // (cx: shape and labels centred together in the card: its length labels reach further left)
      autoNext: 2600, lines: [
      { m: 'surprised', t: T('lsLegsDiffToo'), noEmph: 1, cueAt: { different: 'legsPop' } },
      { m: 'curious', t: T('lsWhatIfSame'), noEmph: 1, cueAt: { legs: 'legsTogether' } },
      { m: 'excited', t: T('lsFindOut'), cueAt: { find: 'findOut' } }],
      f: { par: 1, legLen: 1, sideLen: 1 } },
    // a silent beat between "Let's find out." and the drag (no dialogue); it moves on by itself and Back skips it
    { id: 'equal', fitBox: { cx: 889 }, // (cx: shape and labels centred together in the card: as screen 18)
      skip: 1, autoNext: 900, lines: [], f: { par: 1, legLen: 1, sideLen: 1 } },
    // one demo hand after the line. Dragging A right (the wrong way) wiggles BC: A has only ~0.75 cm
    // before B stops it, so the limit is 0.5 cm. Equal legs snap into place and finish the task
    { id: 'equalDrag', fitBox: { cx: 889 }, // (cx: shape and labels centred together in the card: as screen 18)
      lines: [{ m: 'curious', t: T('lsDragVertexA') }, { m: 'curious', t: T('lsMakeLegsSame') }],
      task: 'dragA', handOnce: 1, wrongRight: { cm: 0.5, side: 'BC' }, after: [{ m: 'happy', t: T('lsPerfectEqual') }],
      revealLine: [T('lsWatch'), T('lsAdBecomes'), T('lsNowLegsEqual')], // (said as A glides there after a second wrong try)
      f: { par: 1, legLen: 1, sideLen: 1 } },
    // "trapezium": the shape pops; "same": both legs light up with their lengths;
    // "isosceles": the lengths shrink into the equal marks, then the name label pops in
    { id: 'iso', lenPre: 1, tickPre: 1, lines: [{ t: T('lsNowLookTrapezium'), noEmph: 1, cueAt: { trapezium: 'shapePop' } },
      { t: T('lsLegsSame'), legsAt: 'same', noEmph: 1 },
      { t: T('lsIsoIs'), holdChips: 1, noEmph: 1, cueAt: { isosceles: 'isoName' }, chips: [{ t: T('lsIsoTrapezium'), k: 'name' }] }],
      f: { par: 1, legLen: 1, ticks: 1 } },
    // from here on the angle shape (A 120°, B 105°, C 75°, D 60°); it fades in as she starts,
    // the arrows pop on at "sides" and the name label at "trapezium"
    { id: 'sidesDone', shape: 1, shapePre: 1, chevPre: 1, voiceDelay: 400, lines: [{ m: 'happy', t: T('lsKnowSides'), noEmph: 1, onStart: 'shapeIn',
      holdChips: 1, cueAt: { sides: 'chevIn', trapezium: 'showTitle' }, chips: [{ t: T('shapeTrapezium'), k: 'name' }] }], f: { par: 1 } },
    // check 2, after the sides (scalene, isosceles): the missing side of an isosceles trapezium
    { id: 'cfu5', cfu: 5, optTop: 458, plateOptDy: 36, okFx: 'q5Correct', badFx: 'q5Wrong', optsAfter: 1, // (plateOptDy: in the card, clear of the 10 cm and the corner letters)
      // the question in short steps; each length lands on its own words
      lines: [{ m: 'curious', t: T('lsThisIso') },
        { m: 'curious', t: T('lsAbCd'), cueAt: { ab: 'q5AB', cd: 'q5CD' } },
        { m: 'curious', t: T('lsAd5'), cueAt: { ad: 'q5AD' } },
        { m: 'curious', t: T('lsHowLongBc'), cueAt: { bc: 'q5BC' } }],
      ok: [T('lsYesLegsEqual'), T('lsSoBc5')],
      opts: [
        { id: 'a', t: '4 cm', fb: [T('lsBcIsLeg'), T('lsBothLegsEqual')] },
        { id: 'b', t: '5 cm', ok: true },
        { id: 'c', t: '6 cm', fb: [T('lsOops6Top'), T('lsBcLikeAd')] },
        { id: 'd', t: '8 cm', fb: [T('lsBcIsLeg'), T('lsBothLegsEqual')] } // (8, not 10: four short answers sit level; its feedback is 4 cm's)
      ] },
    // from here on the angle shape (A 120°, B 105°, C 75°, D 60°). After the line Swiftee carries a protractor round
    // A, B, C, D; each angle appears as she holds it there
    { id: 'angles', shape: 1, room: 'measure', anglesIn: 1, task: 'measureAngles', auto: 1, lines: [{ m: 'curious', t: T('lsMeasureAngles') }], f: { par: 1, arcs: 'ABCD' } },
    // 120° (A) and 60° (D) in focus: the pair the next screen adds up
    { id: 'notice', lines: [{ m: 'thinking', t: T('lsNotice'), cueAt: { notice: 'growAD' } }], f: { par: 1, arcs: 'ABCD', focusAng: 'AD' } },
    // "∠A + ∠D = ?" rises in; each value jumps into the sum as its angle is named, and they add up on "180". cueTimes: measured in the recording
    // (vo058): "angle A" 0.06-0.86 s, "angle D" 1.22-1.92, "one hundred eighty" 2.78
    { id: 'sumAD', lines: [{ m: 'surprised', t: T('lsAdSum180'), onStart: 'eqStart',
      cueAt: { '∠A': 'eqFlyA', '∠D': 'eqFlyD', 180: { fn: 'eqResult', sfx: 'snap' } }, cueTimes: { '∠A': 0.56, '∠D': 1.7, '180°': 2.8 } }], f: { par: 1, arcs: 'ABCD', focusAng: 'AD' } },
    // "supplementary": DC extends past D and a copy of 120° turns onto it beside 60°, a straight angle;
    // "angles": the equation glows
    { id: 'supp', lines: [{ m: 'happy', t: T('lsSupplementary'), onStart: 'suppStart',
      cueAt: { supplementary: 'suppAtAD', angles: 'suppConfirmLater' }, chips: [{ t: '∠A + ∠D = 180°', k: 'gold' }] }], f: { par: 1, arcs: 'ABCD', focusAng: 'AD' } },
    // ∠B then ∠C get the focus as they are named, then the answers slide in. A correct answer shows
    // the real sum, and 105° turns onto the extended base beside 75° (okFx)
    // the shape, then the question chip under it, centred together above the answers (shape with its letters 128-377,
    // chip 399-454, answers from 486). voiceDelay: the board glides into this smaller frame first, so the question chip
    // never meets a corner on the way
    { id: 'askBC', practice: 1, fitBox: { cy: 250, h: 282 }, optTop: 486, chipTop: 375, voiceDelay: 750,
      optsAfter: 1, okSum: ['B', 'C'], okFx: 'suppAtBC',
      // cueTimes from the recording (vo060): "angle B" 0.90-1.66 s (B at 1.40), "angle C" 2.08-2.70 (C at 2.44)
      lines: [{ m: 'curious', t: T('lsWhatAboutBc'), angleCues: 1, pairEnd: ['B', 'C'], onStart: 'askIn', cueTimes: { '∠B': 1.4, '∠C': 2.44 }, chips: [{ t: '∠B + ∠C = ?', k: 'white' }] }],
      ok: T('lsCorrectBcSupp'), revealLine: [T('lsIts180'), T('lsBcSum180')], okChips: [{ t: '∠B + ∠C = 180°', k: 'gold' }], // (revealLine: after a second wrong pick)
      opts: [
        { id: '90', t: '90°', fb: T('lsNotQuite') },
        { id: '180', t: '180°', ok: true },
        { id: '360', t: '360°', fb: [T('lsOops360'), T('lsTryAgain')] }
      ], f: { par: 1, arcs: 'ABCD', focusAng: 'BC' } },
    // on "change" the top corners glide through the morph shapes; on "trapezium" the last one settles.
    // That shape carries on to screen 29
    { id: 'whatIf', morph: [{ A: 100, B: 300 }, { A: 215, B: 398 }, { A: 128, B: 378 }],
      lines: [{ m: 'curious', t: T('lsWhatIfChange'), onStart: 'whatIfStart', cueAt: { change: 'shapeMorph', trapezium: 'shapeSettle' } }], f: { par: 1, arcs: 'ABCD' } },
    // on "change" a guide hand drags A and back; on "sum" each pair pulses with its panel
    // fitBox: the shape and the sums under it, centred together in the ice card (Done sits on the card's bottom edge)
    { id: 'dragSum', entryPop: 1, lockTalk: 1, handMs: 3000, explore: 1, fitBox: { cx: 901, cy: 310 }, // (cx: the shape sits left of its drag range's middle)
      lines: [{ m: 'curious', t: T('lsDragAnyVertex') }, { m: 'curious', t: T('lsWatchAngles'), cueAt: { change: 'demoDrag' } }, { m: 'curious', t: T('lsLookSums'), cueAt: { sums: 'sumPanels' } }],
      task: 'dragFree', 
      f: { par: 1, arcs: 'ABCD', sums: 1 } },
    // the two sums built one pair at a time: each value flies into its sum and the sum resolves to 180°
    { id: 'always', sumSteps: 1, lines: [{ m: 'happy', t: T('lsChangeAll') }, { m: 'happy', t: T('lsStill180') }], f: { par: 1, arcs: 'ABCD' } },
    { id: 'rule', sumSteps: 'sym', lines: [{ t: T('lsRuleEvery') }, { t: T('lsTakeTwo') }, { t: T('lsAlways180') }], f: { par: 1, arcs: 'ABCD' } },
    // check 3, after the angle rule (angles on the same leg add up to 180°): the missing angle
    { id: 'cfu3', cfu: 3, optTop: 482, plateOptDy: 34,
      enterFx: 'q3In', okFx: 'q3Correct', badFx: 'q3Wrong', idleFx: 'q3Idle', optsAfter: 1, softWrong: 1, handMs: 3000, voiceDelay: 1300,
      // "∠A = 120°" opens A's wedge and lands its 120°; "what" runs a light down AD to a "?" at D
      lines: [{ m: 'curious', t: T('lsLookA120'), cueAt: { 120: 'q3A' } }, { m: 'curious', t: T('lsWhatIsD'), cueAt: { what: 'q3D' } }],
      ok: T('lsCorrect180'),
      opts: [
        { id: 'a', t: '120°', fb: T('lsSameLeg180') },
        { id: 'b', t: '60°', ok: true },
        { id: 'c', t: '50°', fb: T('lsSameLeg180') },
        { id: 'd', t: '180°', fb: T('lsSameLeg180') }
      ] },
    { id: 'what90', lines: [{ m: 'curious', t: T('lsWhatIf90'), cueAt: { 90: { fn: 'vertexPulse', sfx: 'chime' } } }], f: { par: 1, arcs: 'ABCD' } },
    { id: 'make90', fitShape: 1, lines: [{ m: 'curious', t: T('lsDragTo90') }],
      task: 'drag90', 
      after: [{ m: 'happy', t: T('lsGreatJob') }], revealLine: T('lsWatch90'), // ({k}: the corner she puts right)
      f: { par: 1, arcs: 'ABCD' } },
    // the learner's right angle glows; on "another" its partner on the same leg (also 90°) joins it
    { id: 'another90', lines: [{ m: 'surprised', t: T('lsAnotherRight'), noEmph: 1, cueAt: { woah: 'anotherStart', another: 'anotherReveal' } }], f: { par: 1, arcs: 'ABCD' } },
    // "adjacent": the arrows glide on; "right": both 90° marks draw in; "called": the name label
    { id: 'right', shape: 'right', right90: 1, r90Pre: 1, chevPre: 1,
      lines: [{ t: T('lsLookTrapezium'), noEmph: 1, cueAt: { trapezium: 'chevIn' } },
        { t: T('lsTwoRight'), noEmph: 1, cueAt: { right: 'rightBoth' } },
        { t: T('lsRightIs'), noEmph: 1, holdChips: 1, cueAt: { trapezium: 'showTitle' }, chips: [{ t: T('lsRightTrapezium'), k: 'name' }] }],
      f: { par: 1, right: 1 } },
    // checks 4 and 5, once all three types are taught (the right trapezium last): which type, then label all three
    { id: 'cfu2', cfu: 2, qFocus: 1, qStatic: T('lsWhichType'), optTop: 376, okFx: 'q2Correct', badFx: 'q2Wrong',
      lines: [{ m: 'curious', t: T('lsWhichType'), cueAt: { type: 'q2Shape' } }],
      ok: [T('lsRightLegsEqual'), T('lsSoIso')],
      opts: [
        { id: 's', t: T('lsScalene'), fb: [T('lsLookMarks'), T('lsMarksEqual')] },
        { id: 'i', t: T('lsIsosceles'), ok: true },
        { id: 'r', t: T('lsRight'), fb: [T('lsNoRight'), T('lsLookLegs')] }
      ] },
    { id: 'cfu4', cfu: 4, qStatic: T('lsDragLabels'), 
      enterFx: 'q4In', labelsAt: 1, instant: 1, handMs: 3000,
      lines: [{ m: 'curious', t: T('lsDragLabels'), cueAt: { drag: 'q4Shapes', labels: 'q4LabelsIn', place: 'q4HiShapes' } }],
      ok: T('lsBrilliant') },
    // Swiftee rises into the middle; after this line eight idea cards are shown and explained one by one
    { id: 'recap', noBoard: 1, layout: 'recap', summary: 1, autoAdvance: 500, // (the lesson's last screen: no long beat before Swiftee leaves)
      lines: [{ m: 'happy', t: T('lsRecall') }] },
    // "120" opens ∠A; "value" runs a light down AD to a "?" at D. A wrong answer brings in
    // "120° + ? = 180°" under the shape; the right one flies 60° to D and the equation resolves
    // "drag" lights each shape's clue, "labels" brings the labels in, "place" lights the boxes
    // Swiftee flies to centre stage and speaks once she has landed, she says goodbye, and screen 44 follows by itself
    { id: 'end', end: 1, hero: 1, voiceDelay: 1100, autoNext: 700,
      lines: [{ m: 'celebrating', t: T('lsAmazing') }, { m: 'waving', t: T('lsBye') }] },
    // the cartoon closer (js/finale.js): an iris closes on Swiftee, the sunburst, "The End", Play again
    { id: 'theEnd', end: 1, hero: 1, finale: 1, lines: [] }
  ],
  cfu4: {
    labels: [{ id: 'iso', t: T('lsIsosceles') }, { id: 'right', t: T('lsRight') }, { id: 'scal', t: T('lsScalene') }],
    slots: [{ id: 's0', ans: 'scal', y: 170 }, { id: 's1', ans: 'iso', y: 274 }, { id: 's2', ans: 'right', y: 378 }]
  }
};
