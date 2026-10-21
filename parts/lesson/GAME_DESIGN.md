# Trapezium Game — Game Flow & Mechanics

> This is the lesson's original design. Fishing Frenzy has since moved the checks next to their concepts and cut the
> screens that said a thing twice: the screen list as it plays is `js/lesson-data.js` (and README.md, "The lesson").

A guided, voice-led lesson on **trapeziums** for young learners. The mascot **Swiftee** narrates every screen while the
shape on an ice panel draws, moves and highlights itself in step with her words. The learner taps and drags at key
moments, then answers five scored checks.

- **Front page** first: the **Trapezium Adventure** banner (`assets/images/banner.webp`) fills the screen. It settles in
  from a soft zoom and drifts very slowly; the title pops in, breathes and catches a sweep of light (the banner shown
  through the title's own shape, `banner-title-mask.png`); the stars round it and the ice trapezium twinkle, the ice
  glows, and snow falls. One big round **Play** button (glossy orange with a snow cap, `assets/images/play-button.webp`) sits on
  the face of the ice trapezium: it spins in and floats on a warm glow that breathes with it, a soft aura
  swells out from it, glints twinkle on its rim and a shine crosses its face. Hover lifts and brightens it, a press squashes it; on Play it pops with a
  chime and the scene zooms softly away into Screen 1. The tap also unlocks the voice-over and sounds.
  Jumps from the screen list skip it. `CONFIG.flow.cover: false` turns it off.
- The cabin intro (Swiftee opens her door and says hello) was taken out for launch; Play goes straight to Screen 1.
  It is in git history (`git show 2687c66:drafts/intro/README.md` has the steps to bring it back).
- **Look.** Every colour comes from the game's art: the shape's bases in the winter-sky blue, its legs in Swiftee's
  teal, a warm cream fill; angles A and D (one leg) warm orange and gold, B and C (the other) green and sky blue;
  highlights gold. Name plates are white pills with a thick blue rim on a raised base, sitting on the ice panel's
  bottom edge (the angle sums are the gold version). Answers are solid gold game buttons; a right answer turns teal,
  a wrong one a soft frosted grey (never red).
- **Pace.** What a spoken word starts (a side lighting up, a mark drawing on) plays at a slower teaching pace, and a
  named part stays highlighted for 1.3 s. Voices that report each word as they say it are chosen first, so the words
  and animations land on the voice.
- **44 screens** in one fixed sequence: 36 learning screens, 5 checks, the lesson-complete
  screen and "The End".
- **Navigation is manual**: the learner moves on with **Next** / **Back** (top right). Only the opening intro
  (Screens 1→2→3→4, each holding 2.2 s after its line so it can be read), Screen 18 (after "Let's find out.") and Screen 43 (after
  Swiftee's goodbye, into The End) move on by themselves.
- Runs in the browser from local files (no server, no build step). Open `index.html`.

---

## 1. Learning outcomes

By the end the learner can:

1. Recognise a **quadrilateral** (a 4-sided polygon) and a **trapezium** (a quadrilateral with at least one pair of
   parallel sides).
2. Name the parts: the parallel sides are **bases**, the other two are **legs**.
3. Tell the three types apart: **scalene** (legs of different lengths), **isosceles** (equal legs) and **right**
   (one leg perpendicular to the bases — two 90° corners).
4. Use the angle rule: **angles on the same leg add up to 180°** (they are **supplementary**).

---

## 2. Screen layout

Every screen uses one 16:9 composition (1280 × 720 stage, scaled to the window):

| Area | Content |
|---|---|
| Left, on the snow | **Swiftee** and her **speech bubble** (text appears word by word with the voice) |
| Right | The **ice panel** — the shape, labels, answer options |
| Top left | **"Screen N of 44"** — opens a list of every screen (number and opening line) to jump to any screen |
| Top right | **Back** / **Next** |

Exceptions: **Screens 16 and 23** use the measuring slab instead (§4a); **36, 37, 43 and 44** hide the ice panel (37 shows the
summary cards; on 43 Swiftee flies to the centre; 44 is the cartoon closer).

**Colour language (kept on every screen)**

| Element | Colour |
|---|---|
| Shape outline / fill | hot pink / soft lilac |
| Parallel-side arrows | orange |
| Legs AD and BC | purple (#8e44d6) from Screen 5 to the end of the lesson. They remain purple through narration, animations, and interactions. Screens 1–4 use pink. Glows drawn along a leg use the same purple. |
| ∠A · ∠B · ∠C · ∠D | orange · purple · blue · yellow |
| Equal / correct | green |
| Name labels ("Trapezium", "Scalene trapezium"…) | cream box, teal border |

---

## 3. Full screen flow

### Part 1 — What is a trapezium? (Screens 1–15)

| # | Swiftee says | What happens |
|---|---|---|
| 1 | "Remember we learnt about quadrilaterals earlier." | Empty panel; a glowing pen draws the shape D→A→B→C→D, a glow settles, the fill fades in. Moves on by itself. |
| 2 | "Any polygon with 4 sides is called a quadrilateral." | Numbers **1–4** fly in from each side's direction (top, right, bottom, left). Moves on by itself. |
| 3 | "We can call it quadrilateral ABCD." | Letters **A, B, C, D** fly in from their corners exactly as each is spoken. Moves on by itself. |
| 4 | "This is a special type of quadrilateral." / "Let's see what makes it special." | As Swiftee starts speaking the shape grows to 120% (0.8 s), holds 0.5 s, and returns to its exact original size (0.8 s) — ease-in-out, from its centre. |
| 5 | "These two sides look like they will meet." | The two legs are emphasised. |
| 6 | "Let's extend them." | Legs AD and BC remain purple. |
| 7 | *(after)* "Woah! The sides meet." | Legs stay purple. **Automatic**: a glowing line runs D→A then turns into a dotted extension; then C→B. They meet at a point. Where the extended sides meet, the orange dot keeps pulsing: it gently grows and glows, and two thin rings ripple out from it. |
| 8 | "Let's check the other pair of sides." | **Automatic, in place** (no fade, no glide to centre): 1 s after the line both AB and DC give one light glow together, then AB glows from its middle out and extends both ways as dotted lines, then DC the same. Colours swapped (Screens 8–9): the parallel sides **AB and DC are purple**, **AD and BC are pink** (same stroke width).
| 9 | "This pair of sides does not meet." | Colours as Screen 8 (AB, DC purple; AD, BC pink). The dashed extensions are bolder and deeper orange. On "pair" and "meet" the parallel sides pulse together with their extensions and arrows. |
| 10 | "This means the sides are parallel to each other." / *(voice)* "A B is parallel to C D." | The bases step out, then return one by one as "A B" and "C D" are spoken; parallel arrows appear. Label **AB ∥ CD**. |
| 11 | "So this quadrilateral has one pair of parallel sides." | On "parallel" the pair AB, DC pulses with its extensions/arrows; label **AB ∥ CD**. Parallel arrows (all screens) are larger, deeper orange, on a white halo. |
| 12 | "We call this a trapezium." | On "trapezium" the shape pulses and the **Trapezium** label pops in (same case as Screen 13). |
| 13 | "A quadrilateral with at least one pair of parallel sides is called a trapezium." | The definition acted out. "quadrilateral": the four sides trace in one after another. "parallel": AB and DC glow together and the parallel arrows pop on (hidden until then); no dashed lines. "trapezium": the **Trapezium** label pops in below and pulses. |
| 14 | "The parallel sides are called bases." | AB then CD get a subtle highlight sweep; two **yellow** "Base" labels pop in one by one on "bases". Nothing else moves. |
| 15 | "The other two sides are called legs." | AD then BC (purple) get a subtle highlight sweep; two **purple** "Leg" labels pop in on "legs". The two **Leg** labels sit level and opposite (like the Base labels on Screen 14): left of AD and right of BC at the legs' shared mid-height, each joined by a short horizontal connector; both legs glow together. |

### Part 2 — Types by sides (Screens 16–22)

| # | Swiftee says | What happens |
|---|---|---|
| 16 | "Let's measure the sides of this trapezium." | **Measuring room** (the Measuring Kit's layout, §4a). **Automatic**: Swiftee walks out from her corner of the card to the shape and walks each side with a tape measure. Lengths appear outside the shape: **3 cm, 5 cm, 9 cm, 7 cm**. Once all four are measured she reacts: "Woah! All the sides of this trapezium are of different lengths." *(after)* "Woah! All the sides … different lengths.": from "sides", as on Screen 17, AB, BC, CD, DA in turn (0.45 s apart) - each side glows while its length pops and takes its own colour. |
| 17 | "This type of trapezium which has sides of different lengths is called a scalene trapezium." | "trapezium": the shape pops once. The lengths start hidden; from "sides" they pop in one by one (AB, BC, CD, DA) with their side glowing. "scalene": **Scalene trapezium** pops in below and pulses. Shape lifted a little so the bottom length clears the label. |
| 18 | "Look! Its legs are of different length too." / "What if the legs were the same length?" / "Let's find out." | "different": both legs light up together and their lengths pop once. No laugh line. "What if the legs were the same length?", "Let's find out.", then on to Screen 19 (2.6 s hold). |
| 19 | "Let's change its shape a little." | — |
| 20 | "Drag vertex A so that both the legs are of equal length." | **Learner drags A** (see §4.3). Correct only when AD reads **exactly 5 cm**. *(after)* "Perfect! Both legs are equal." |
| 21 | "A trapezium where legs are of same length is called an isosceles trapezium." | "trapezium": the shape pops once. Lengths and equal marks start hidden. "same": both legs are highlighted and their two lengths appear together and pop. "isosceles": the lengths shrink into the legs and become the equal marks, then **Isosceles trapezium** pops in below and pulses. |
| 22 | "We know all about the sides of a trapezium." | A calm recap. The panel opens empty; as Swiftee starts speaking the whole trapezium (outline, fill, corners, letters) fades in with a soft, settling scale-up (0.8 s). "sides": the parallel arrows pop on. "trapezium": the **Trapezium** label pops in below and gives one soft pulse. |

### Part 3 — Angles (Screens 23–35)

| # | Swiftee says | What happens |
|---|---|---|
| 23 | "Let's measure its angles." | **Measuring room** (§4a). **Automatic**: after the line Swiftee walks out from her corner of the card with **one protractor** and measures **A → B → C → D**: at each corner its centre sits exactly on the vertex and its baseline along a side, she stands beside the shape (never on it), and while she holds it there that angle comes in - its filled wedge in its own colour (A orange, B purple, C blue, D yellow) grows out of the corner, its arc draws round, its value pops in with a sparkle - and stays. Corner to corner she hops out round the side; after D she walks home. From here on, shown angles stay in place (no draw-in replay on later screens). |
| 24 | "Did you notice something?" | Angles already in place. After a short beat **120° (A)** and **60° (D)** get a soft warm glow; 105° and 75° fade back to 35%. |
| 25 | "∠A and ∠D add up to 180°." | **∠A + ∠D = ?** appears; on "add" copies of 120° then 60° fly from the shape, one after the other, to the answer side, replacing the "?"; on "180" they add up into **180°** (halo, pulse), leaving **∠A + ∠D = 180°**. 120° and 60° glow; 105°, 75° faded. |
| 26 | "That means they are supplementary angles." | As the line starts, A and D pulse (B, C fade back). "supplementary", **on the shape**: DC extends past D as a dashed line; D's 60° fills in at D; a copy of A's 120° (orange) slides down AD to D and turns over onto the extension beside it - together a straight angle, marked by a half-circle and **180°**. "angles": the **∠A + ∠D = 180°** label glows (snap). The figure fades after a few seconds. |
| 27 | "What about ∠B and ∠C?" | **Practice question** (not scored): 105° and 75° keep a soft glow, 120° and 60° fade back (as on Screen 24); ∠B then ∠C focus, then glow together; answers slide in: **90° · 180° ✓ · 360°**. Correct shows **105° + 75° = 180°**. Wrong: "Not quite. Try again." / "360° is the sum of all four angles. Try again." Right: on the shape, as on Screen 26 - CD extends past C (dashed), a copy of 105° slides down BC and turns onto it beside 75°: a straight **180°**. The question stays in the bubble. |
| 28 | "What if we change the shape of this trapezium?" | **Automatic**: the top corners glide through three trapeziums (angles update live, bases stay parallel), then settles with a gentle bounce. No other effects. |
| 29 | "Drag any vertex to change the angles. Notice the sum of angles." | Free exploration (unlimited dragging, Done to finish). The two sums sit in a fixed row clear of the D/C letters; Done appears below the panel after the first drag. |
| 30 | "No matter the shape, the angles always add up to 180°." | Two equation builds as on Screen 25: **∠A + ∠D = ?** (A, D in focus) - 113° and 67° fly in and add to 180°; then **∠B + ∠C = ?** (faded until its turn; focus moves to B, C) - the same. Ends as ∠A + ∠D = 180° and ∠B + ∠C = 180°. |
| 31 | "So in any trapezium, angles on the same leg always add up to 180°." | The angle values turn into their names (∠A, ∠B, ∠C, ∠D), placed exactly where the values were; then A/D and B/C in turn with their box's = 180° pulsing. |
| 32 | "What if we make one of the angles 90°?" | A short teaser before the 90° drag: Swiftee wonders aloud (curious); on "90" the four corner handles pulse once with a soft chime, hinting they can be moved next. |
| 33 | "Drag any vertex to make any angle 90°." | **Learner drags** a corner to 90° (snaps within 5°). The moment an angle is 90° its arc becomes the square right-angle mark (pops in); never both. *(after)* "Great job!" |
| 34 | "Woah! We got another right angle." | The learner's own shape. The corner they made 90° glows (the two non-right angles fade back); on "another" its partner on the same leg (also 90°, since the pair adds up to 180°) pops with a soft chime and joins the glow. If the drag was skipped with Next, the left-leg pair is used. |
| 35 | "A trapezium with two adjacent right angles is called a right angled trapezium." | No glide-in. "trapezium": the outline traces in side by side; "adjacent": the parallel arrows pop on; "right": both 90° marks draw in with their labels and glow gold; "called": **Right trapezium** pops in below and pulses. Then corner taps (wrong: incorrect sound; both found: correct sound + confetti). |

### Part 4 — Wrap-up (Screens 36–37)

| # | Swiftee says | What happens |
|---|---|---|
| 36 | "Great job! Now you know all about trapeziums." | The ice panel fades away; Swiftee stays in her usual bottom-left spot with her bubble above her, as on the lesson screens. No stars, no fly-in. |
| 37 | "Let's recall what we learnt today." then the summary lines | **Summary** (§5, the Summary Kit): eight idea cards one at a time, each shown, explained by Swiftee rising from behind it, and collected into albums at the sides; then the finale, Next glows, and a tap on any card replays it. |

### Part 5 — Checks (Screens 38–42) and end (43–44)

Each question lights up its parts as Swiftee reads them, and a right answer shows why on the shape.

| # | Question | Answers (✓ = correct) | Interaction |
|---|---|---|---|
| 38 | "Which of these quadrilaterals is a trapezium? Look for one pair of parallel sides." | 4 shape cards; the yellow one ✓ | Tap a card. The cards hop on "quadrilaterals" and glow on "parallel". A wrong card traces its sides one by one to show no pair is parallel; the right one lights its two parallel sides and draws their arrows (hidden until then). The question stays in the bubble at all times: it returns after any feedback line, and the idle reminder repeats it word for word. |
| 39 | "Which type of trapezium is this?" | Scalene · **Isosceles ✓** · Right | Bubble fades, shape glides up, answers come in one by one. A wrong type flashes the legs and their equal marks; the right one stamps **AD = BC** on the shape. The question stays in the bubble at all times: it returns after any feedback line, and the idle reminder repeats it word for word. |
| 40 | "In this trapezium, ∠A = 120°. What is the value of ∠D?" | 120° · **60° ✓** · 50° · 180° | The question stays static: no equation up front, and the idle reminder repeats the question word for word. Any wrong answer: the card flashes orange then turns disabled, Swiftee gives the one hint *"Angles on the same leg add up to 180°."*, then the equation **120° + ? = 180°** comes in at the top (once; it never changes form, later misses just pulse it). Right: 60° flies to D and the equation resolves to **120° + 60° = 180°** (it appears then if the learner was right first time). |
| 41 | "Drag the labels to their correct place." | Purple → **Scalene**, green → **Isosceles**, pink → **Right** | Drag labels to boxes, each drop checked instantly; see §4.6. The question stays in the bubble at all times: it returns after any feedback line, and the idle reminder repeats it word for word. Labels: cream name cards with a teal border and grip; a correct drop widens the label to fill its slot and melts into it (slot turns soft green); a wrong drop flashes orange, shakes and glides back. |
| 42 | "In an isosceles trapezium, AB = 6 cm, CD = 10 cm and AD = 5 cm. What is the length of BC?" | 4 cm · **5 cm ✓** · 6 cm · 10 cm | Each side flashes as it is named; the answers come in after the question. Tap an answer. A wrong one lights both legs and pulses AD's 5 cm; the right one flies 5 cm across to BC. The question stays in the bubble at all times: it returns after any feedback line, and the idle reminder repeats it word for word. |
| 43 | "Amazing work! You know all about trapeziums now." | — | Hero stage: no panel, Swiftee flies to centre with the warm glow. Then Swiftee says "Bye for now! See you on our next snowy adventure!" and the screen moves on by itself. |
| 44 | — (Swiftee says "The End!") | — | **The End**, an old-cartoon closer: an iris closes on Swiftee, the dark turns into a turning sunburst, the circle slides left and "The End" bounces in letter by letter with sparkles; a round **Play again** button returns to the front page. |

---

## 4. Mechanics

### 4.1 Narration & synchronisation

- Swiftee's voice is the **browser's speech synthesis** (English voice, slightly raised pitch, rate 0.95). There are no
  recorded voice files; the spoken text comes from the lesson data.
- The bubble reveals **word by word** following the voice's word-timing events; voices without them use a paced
  fallback that never runs ahead of the voice.
- Animations are tied to **spoken words** ("cue words"), not timers — e.g. letters appear as each is said, the shape
  zooms on "trapezium". If a voice skips a cue, the animation still plays once when the line ends.
- Parts of the shape named in a line (∠A, AB, "legs", "bases", "vertex A") briefly grow as they are spoken.
- Swiftee changes expression per line (curious, happy, surprised, thinking…) and reacts to right/wrong answers.

### 4.2 Navigation

- **Next / Back** always available (except Back on Screen 1, Next on Screen 44).
- Next on an unfinished drag screen applies that drag's result first, so later screens still match the shape.
- **Screen list** (top left) jumps to any screen; the shape is rebuilt as if every earlier screen had been completed.
- Every screen change stops speech, sounds and animations and resets the screen's state; returning replays the screen.
- Automatic moves only: Screens 1→2→3→4 (one continuous intro) and Screen 18→19 after "Let's find out."

### Filled angles (Screens 23–35)

Every angle shown from Screen 23 on is drawn as a **solid filled wedge** in exactly its arc colour (A orange, B purple, C blue, D yellow; fill and outline the same colour, full strength), reaching the arc's outer edge, like Screen 40. The summary's angle card fills its angles the same way. Whenever a screen brings an angle into focus, its wedge grows out of the corner with a soft overshoot and a brief glow (Screen 40's technique): Screen 23 all four in turn; 24, 25 and 26 A and D; 27 B then C as they are named; 30 and 31 each pair as the focus moves. Fills fade back and glow with their arcs, follow dragged corners live (29, 33), and give way to the square mark at 90°. No screen's sequence, values or interaction changed.

### Equation panels

Every angle-pair equation (Screens 25, 26, 27, 30, 31) uses the same cream panel with a teal border as Screen 40's hint, and ends with a small **straight-angle picture** of that pair in its own colours (∠A + ∠D: orange + yellow; ∠B + ∠C: purple + blue), so each equation is visibly linked to its two angles. Panels keep their existing animations and values. Screen 29's live drag sums stay compact (no picture).

### Buttons

Every clickable answer button (Screens 27, 39, 40, 42) and the top controls (Screen N, Back, Next) and Done use one **crystal-blue button**, drawn from three pieces (`crystal-l`, `crystal-m`, `crystal-r`.webp) so the bevelled corners keep their shape at any width. Navy text, centred; options equal width, 18px apart, centred on the panel. Answer buttons stay **still** (they fade in; no idle pulse, no lift or dip on hover/press - hover only brightens); correct glows green; wrong shakes with a red (or orange) halo, then greys out; disabled is grey and faded. Not used for Check 1's shape cards, Check 4's draggable labels and slots, or the round Play button.

### 4.3 Shape dragging (Screens 20, 29, 33)

- Only the **x** position of a corner moves, so **AB stays parallel to DC** at all times.
- Limits stop the shape crossing itself or becoming unreadably thin (angles stay roughly 35°–145°; corners stay in the
  board).
- Side lengths and angles are **computed from the real coordinates** every frame (1 cm = 40 px); angle pairs always sum
  to 180°.
- Mouse and touch via pointer events with pointer capture.

| Screen | Goal | Correct when | Wrong / feedback |
|---|---|---|---|
| 20 | Make the legs equal by dragging A | AD reads **exactly 5 cm** (= BC) — succeeds the moment it does, A snaps to the exact spot | Release elsewhere: "AD is 5.2 cm. Keep dragging A until it shows exactly 5 cm."; dragging A to the right (wrong way) wiggles BC with the incorrect sound. One demo hand at the start. |
| 29 | Explore angles | Learner taps **Done** (appears after the first real drag) | No wrong answer, no auto-complete, no confetti. Guide hand demo first; dragging is unlimited. |
| 33 | Make a corner 90° | A corner within 5° of 90° (snaps to exactly 90°) | Release short: "∠B is 98° now. Keep dragging until it shows 90°." |

### 4.4 Tapping

- **Screen 35**: after the voice, tap corners — a 90° corner pulses green; another says "That angle is not 90°. Look for
  the square corners."; finding both lights the vertical side with a soft sparkle.
- **Checks**: tap answer cards (Screens 27, 38, 39, 40, 42). A wrong card gives a brief red (or orange) flash and shake, then settles into a grey, flat **disabled** look and can't be tapped again (Check 1's wrong shape traces its sides first). After the right answer, the untouched cards turn disabled too, so the green card stands out.

### 4.5 Answer questions (Screens 27, 38, 39, 40, 42)

- Cards: glossy raised buttons that lift on hover and squash when pressed.
- **Correct**: card turns green, correct sound + confetti, Swiftee celebrates and says the praise line.
- **Wrong**: card turns red (orange on Screen 40) and shakes, incorrect sound, Swiftee gives that option's specific
  feedback; the learner tries again.
- Screen 40 extras: no equation until a wrong answer; then, after the hint line, **120° + ? = 180°** (never changes form); the correct answer
  flies "60°" from the card to corner D and shows **120° + 60° = 180°**.

### 4.6 Drag & match (Screen 41)

- Each row is a "challenge strip": the shape on its own card, a small connector, then its answer slot.
- Labels arrive with the instruction ("…correct type") and can only be dragged then (or tap a label, then a box). The
  second line highlights the chips on "drag", the rows on "shape" and the tap flow on "tap"; then a ghost hand shows
  one drag. Waiting chips float gently.
- **Next stays disabled until all three are matched.**
- A held label makes the box under it glow blue.
- **Right drop**: snaps and locks, box and its row glow green, the shape repeats its clue.
- **Wrong drop**: box pulses orange, label wobbles back to the row, "Not that one. Look at the marks on each shape.";
  after two misses with the same label, its correct shape replays its clue.
- Shape clues (never the name): scalene — legs traced one after the other; isosceles — both legs glow together, ticks
  pop; right — right-angle squares draw, vertical leg glows.
- All three matched: shapes glow in turn, one success sound + confetti, "Brilliant! You labelled all three trapeziums."

### 4.7 Hints

- **Hand nudge**: after a period with no touch (usually 8 s; 3 s on Screens 29, 40, 41) a hand shows where to tap
  or which way to drag. On question screens all options pulse together — it never points at the answer.
- **Spoken idle hint**: after 9 s Swiftee says the screen's idle line (max 3 times per screen).

### 4.8 Scoring

- Only the five checks (Screens 38–42) are scored; Screen 27 is practice.
- A check counts as **right only if answered correctly on the first try** (kept in `state.results`).
- The lesson-complete screen shows Swiftee's closing line only; it doesn't display a score.

---

## 4a. Measuring room (Screens 16 and 23, the Measuring Kit's layout)

The kit's wide **measuring slab** (`assets/images/measure-slab.webp`) takes the ice panel's place, the shape is drawn big in
its middle (`CONFIG.measureRoom`), and Swiftee **stands small in the card**, in its bottom-left corner, with her line above
her. She walks out to the shape from there and back again - never a flight. Screen 16: the tape walk (`js/walker.js`).
Screen 23: the protractor walk (`js/angle-walker.js`, the kit's `angleMeasurer()`, poses in `js/angle-frames.js`); leaving
the screen mid-walk stops it at once, nothing stays behind and no reading comes in later; reduced motion shows the readings
at once. The slab and panel cross-fade and the shape glides between the two layouts.

---

## 5. Screen 37 — summary (the Summary Kit)

Built in `js/summary.js`, a port of the Summary Kit (POLYGON `summary-kit/index.html`): the kit's ice card
(`assets/images/summary-card.webp`), layout numbers, animations, timings and states, on the game's own winter background,
with the game's voice, Swiftee and buttons. Swiftee says "Let's recall what we learnt today." up in the middle, sinks, and
then every idea the lesson taught comes in **one card at a time, in the order it was taught**, each through the same
strict sequence - every step waits for the one before it, so no two overlap and no line plays over another:

`CARD_ENTER → CONCEPT_REVEAL → SWIFTEE_ENTER → EXPLANATION → READING_PAUSE → SWIFTEE_EXIT → CARD_COLLECT → NEXT_CONCEPT`

The card comes into the clear middle; its idea is **shown** on the trapezium (in the lesson's colours); Swiftee rises from
behind the card's top edge (the card hides her body) with her bubble above her; the words appear as she says them and the
key words light the part they name (a warm trace along the sides, a pulse on the marks); she sinks back and the card shrinks
into a 2 × 2 **album** at the side with a small name plate.

| Card | Swiftee says | Shown / lit on its words |
|---|---|---|
| Trapezium | "A trapezium is a quadrilateral with one pair of parallel sides." | outline draws itself, parallel arrows pop on; "quadrilateral" traces the four sides, "parallel" the pair |
| Bases | "The parallel sides are called the bases." | AB and DC glow; "bases" traces them |
| Legs | "The other two sides are called the legs." | AD and BC glow; "legs" traces them |
| Scalene | "A scalene trapezium has sides of different lengths." | 1, 2, 3, 4 ticks (all different); "different" pulses them |
| Isosceles | "An isosceles trapezium has legs of the same length." | equal ticks on the legs; "same" pulses them |
| Right | "A right trapezium has two adjacent right angles." | right-angle squares at A and D; "angles" pulses them |
| Angle sum | "Angles on the same leg add up to 180°." | AD glows, A 120° and D 60° fill in; "180" pulses the values |
| Supplementary | "Two angles that add up to 180° are supplementary." | BC glows, B 105° and C 75° fill in |

Then FINAL_SUMMARY (the albums hop in, Swiftee rises in the middle and says "Wonderful! You remember everything about
trapeziums!") and READY: a gold halo breathes round the top-right **Next**, and a tap on any collected card replays its idea
and its line while the others rest at 42 %. Next works at any time. Reduced motion: the same states without the motion.

---

## 6. Feedback, sound & motion

**Sounds**

| Sound | Used for |
|---|---|
| Correct (recorded `assets/audio/correct.mp3`) | Every correct learner action, together with a confetti burst |
| Incorrect (recorded `assets/audio/incorrect.mp3`) | Every wrong action |
| Soft synthesised tones | Taps, pops, snaps; on Screen 37 also draw, shimmer, whoosh, morph, chime, tick, warm chime, flourish |

There is no background music.

**No check-mark icons.** Success is never shown with a ✓ / check-circle icon — only with soft green highlights,
glows, gentle bounces, small sparkles and the success sound. (Equal-side tick marks on shapes are geometry, not UI.)

**Motion principles**

- Animations explain the maths (sides that meet / never meet, wedges forming 180°, equal legs revealed together).
- Short eases (about 0.3–0.7 s), one emphasis at a time, no continuous blinking.
- Angle arcs and labels always stay **inside** the trapezium (arcs are clipped to the shape).
- `prefers-reduced-motion`: big movements are skipped or shortened; the lesson still works.

---

## 7. Shapes used

| Shape | Where | Corners / measures |
|---|---|---|
| Opening scalene trapezium | Screens 1–20 | AB 3 cm, BC 5 cm, CD 9 cm, AD 7 cm (height √24 cm) |
| Isosceles (after Screen 20) | Screens 20–21 | AB 7 cm, CD 9 cm, legs 5 cm |
| Angle shape | Screens 22–28 | A 120°, B 105°, C 75°, D 60° |
| Right trapezium | Screen 35 | A 90°, D 90°, B ≈ 118°, C ≈ 62° (vertical left leg) |
| Learner-made shapes | Screens 29–33 | whatever the learner drags (always a valid trapezium) |

---

## 8. Technical overview

| File | Role |
|---|---|
| `index.html` | The page and its template (screen markup bound to the engine's values) |
| `js/vendor/dc-runtime.js` | Template + rendering runtime (bundles React) |
| `js/vendor/gsap.min.js` | GSAP 3.12.5 animation library (local copy) |
| `js/config.js` | Tuning values: scale, shapes, drag limits, snapping, timings, sounds, Swiftee's reactions |
| `js/lesson-data.js` | **Every screen as data**: lines, cue words, tasks, options, feedback, per-screen options |
| `js/game-engine.js` | The game: narration, geometry, drags, checks, navigation, rendering values |
| `js/motion.js` | All choreographed animations (GSAP); reset on every screen change |
| `js/summary.js` | Screen 37 summary (the Summary Kit: idea cards, albums, finale, replay) |
| `js/swiftee.js`, `js/walker.js` | Swiftee's expressions and the Screen 16 walking/measuring sprite |
| `js/angle-walker.js`, `js/angle-frames.js` | Screen 23 protractor walk (the Measuring Kit) and its poses |
| `js/confetti.js`, `js/snowfall.js` | Success confetti and background snow |
| `css/game.css` | Styles and small state transitions |
| `qa/logic-test.js` | Headless test: plays every screen and check through the engine (Node) |
| `tools/` | Rebuild Swiftee's measuring sheet and sprite manifest (Node) |

**Editing content**: most changes are made in `js/lesson-data.js` — the text of a line (`t`), what is spoken if different
(`s`), Swiftee's expression (`m`), cue words (`cueAt`, `pulseAt`, `glowAt`, …), the task (`task`), answer options
(`opts` with `ok` / `fb`). The comment block at the top of that file lists every option. The screen list follows it
automatically.

**Known limits**

- Voice depends on the browser's installed speech voices (quality and accent vary by device).
- Swiftee's poses come from her sprite sheet; gestures not in it (e.g. wing raise, looking sideways) are not available.
