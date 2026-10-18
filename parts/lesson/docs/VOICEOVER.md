# Voice-over

Every line Swiftee can say has a recorded clip in `assets/vo/` (Ogg Opus, 32 kbps, mono). The words in the dialogue box
appear in time with the clip, and Swiftee's beak moves only while it plays.

| File | What it is |
|---|---|
| `assets/vo/voNNN.ogg` | one clip per line, nothing else |
| `tools/vo_script.json` | every line: `id`, `line` (as shown), `spoken` (as said), `devanagari` (what the voice was given) |
| `js/vo-lines.js` | generated map, line as shown → `[clip, seconds]`; do not edit by hand |
| `js/voice.js` | the player |
| `tools/vo_build.js` | lists the lines, writes studio batch files, turns the studio's zips into clips and the map, writes the table below |

## The studio and its settings

The clips come from **Ai Wala Human By Aamir**
(https://ai-wala-human-by-aamir-809572708022.asia-southeast1.run.app/), tab *Batch Generation*:

- **Language: Hindi.** The studio first rewrites each line in the language's script with `gemini-3-flash-preview`, then
  speaks it with `gemini-3.1-flash-tts-preview`. English written in Devanagari ("We call this a trapezium." →
  "वी कॉल दिस ए ट्रैपीजियम।") is spoken as English with an Indian accent, and the words stay English.
- **Voice:** Female Teacher (Standard): Gemini voice Kore with a clear North Indian accent.
- **Format:** MP3 from the studio (24 kHz, mono). The game ships Ogg Opus, 32 kbps, mono.
- **Batch file:** an `.xlsx` with a header row and two columns, `filename` (the clip id) and `text` (the spoken form).
  Text Column = `text`, Filename Column = `filename`, Start Row = 1, Quantity = the number of rows, Concurrency =
  3 (Recommended).

**Rate limit.** The studio's proxy allows 100 requests per 15 minutes per IP (headers `ratelimit-limit`,
`ratelimit-remaining`, `ratelimit-reset`; over the limit it answers `429 Too many requests from this IP`). Each line takes
two requests, so one window voices about 48 lines. A big batch goes in chunks of `floor(remaining / 2) − 1` rows (at most
48), waiting out `ratelimit-reset` plus 30 s between chunks.

## The spoken form

The panel keeps the written line; only what the voice is given is rewritten (`spoken` in `tools/vo_script.json`):

- Symbols in words: `∠A` → "angle A", `°` → "degrees", `=` → "equals", `+` → "plus", side names spaced (`AB` → "A B"),
  `cm` → "centimetres". Commas group an equation: "120° + 60° = 180°" → "One hundred and twenty degrees, plus sixty
  degrees, equals one hundred and eighty degrees."
- **Numbers as English words** ("one hundred and eighty", "five point one"). The script step sometimes *translates* a
  digit into Hindi (3 → तीन), and then the voice says it in Hindi.
- "Woah" is said "Whoa"; screen 3 spells the name out ("quadrilateral, A, B, C, D").
- Sentences start with a capital, also when they start with a number.

**Devanagari check.** After a run, each line's Devanagari (logged from the script step) is compared with its spoken form:
no Hindi number words (एक दो तीन … पचास सौ, and compounds like सैंतीस), no English word translated rather than
transliterated, names and ordinals read correctly. Pace (characters of the spoken form ÷ seconds) should be about 6–22;
anything outside is listened to. A flagged line gets a corrected spoken form and is generated again on its own.

## Conversion

`node tools/vo_build.js build voiceovers_batch.zip [more.zip]` does it all, and is safe to run again:

1. reads the MP3s from the zips (only ids that are in `tools/vo_script.json`);
2. in headless Chrome: decodes each one at 48 kHz, trims the silence at both ends (keeping 60 ms), and encodes Opus at
   32 kbps mono with WebCodecs;
3. writes the packets into an Ogg file (RFC 7845): granule positions count 48 kHz samples, the pre-skip is the encoder's
   delay, and the last page's granule trims the padding;
4. measures every clip and regenerates `js/vo-lines.js`, lists any line that has no clip yet, and deletes clips no line
   uses.

It needs Node 22+ and Chrome or Edge (set `CHROME=/path/to/chrome` if it isn't found). No ffmpeg.

## How the game uses the clips

The hook is in `say()` (`js/game-engine.js`), the one function that puts Swiftee's lines in the dialogue box, so every
line (screen lines, feedback, idle reminders, the summary cards) goes through it.

- **Lookup** by the exact text the bubble shows (its line breaks as spaces). A voice-only line (`keep`) is looked up by its
  spoken text. Screen 33's "∠A is 120° now. Keep dragging until it shows 90°." is played as two clips back to back
  ("∠A is" + "120° now. Keep dragging…"), so all 376 corner/angle combinations need only 98 clips. Screen 44's closer (`js/finale.js`) plays its
  "The End!" through `Voice` directly, since that line has no bubble.
- **The clip is the clock.** Words appear by their share of the spoken line (numbers count as their spoken words), on the
  audio's own `currentTime`, finishing about 0.35 s before the clip ends. Cue words (`cueAt`, glows, pulses, chips) fire
  as their word appears; screen 3's corner letters fly in as each letter is said.
- **One `<audio>`**, unlocked by the Play tap on the front page (played muted, then paused), so tablets allow it.
- **Moving on** waits for the voice: a line counts as finished when its clip ends, then the usual `lineGapMs` pause.
  Safety net: a clip that never starts (4 s) or stops moving (2 s) ends its line, so nothing can stall.
- **Stopping.** A new line stops the previous clip; so do Next, Back, a screen jump and a restart.
- **Repeats.** The question put back after feedback is shown, not said again. Idle reminders are said.
- **No ducking:** the game has no music or ambience.
- **Prefetch.** After Play, every clip is fetched quietly, one at a time.
- **Off.** With no Ogg Opus support (`canPlayType('audio/ogg; codecs="opus"')` empty), with `?vo=0`, or if a clip is
  missing or `play()` is refused, the line falls back to what the game did before: the device's speech voice, or a timed
  reveal with no voice. Nothing crashes.
- **Testing speed:** `?vorate=2` plays the clips faster (0.5–4).

## Remaking a line

1. Edit its `spoken` in `tools/vo_script.json` (or, for a new or changed line, run `node tools/vo_build.js script` first:
   new lines get the next id and a spoken form to check).
2. `node tools/vo_build.js xlsx batch.xlsx vo123` (no ids: every line without a clip), then run `batch.xlsx` in the studio
   with the settings above and download the zip.
3. `node tools/vo_build.js build voiceovers_batch.zip`, then `node tools/vo_build.js doc` to refresh the table below.

## All clips

<!-- table:start -->
| Clip | Line as shown | Spoken as | Devanagari sent to the voice | s |
|---|---|---|---|---|
| vo001 | Remember we learnt about quadrilaterals earlier. | = | रिमेंबर वी लर्न्ट अबाउट क्वाड्रिलैटरल्स अर्लियर। | 3.14 |
| vo002 | Any polygon with 4 sides is called a quadrilateral. | Any polygon with four sides is called a quadrilateral. | एनी पॉलीगन विद फोर साइड्स इज कॉल्ड ए क्वाड्रिलेट्रल। | 3.49 |
| vo003 | We can call it quadrilateral ABCD. | We can call it quadrilateral, A, B, C, D. | वी कैन कॉल इट क्वाड्रिलैटरल, ए, बी, सी, डी। | 3.64 |
| vo004 | This is a special type of quadrilateral. | = | दिस इज अ स्पेशल टाइप ऑफ क्वाड्रिलेट्रल। | 2.48 |
| vo005 | Let's see what makes it special. | = | लेट्स सी वॉट मेक्स इट स्पेशल। | 1.82 |
| vo006 | These two sides look like they will meet. | = | दीज़ टू साइड्स लुक लाइक दे विल मीट। | 2.41 |
| vo007 | Let's extend them. | = | लेट्स एक्सटेंड देम। | 1.53 |
| vo008 | Woah! The sides meet. | Whoa! The sides meet. | वोह! द साइड्स मीट। | 2.28 |
| vo009 | Let's check the other pair of sides. | = | लेट्स चेक द अदर पेयर ऑफ साइड्स। | 2.40 |
| vo010 | This pair of sides does not meet. | = | दिस पेयर ऑफ़ साइड्स डज़ नॉट मीट। | 2.46 |
| vo011 | This means the sides are parallel to each other. | = | दिस मीन्स द साइड्स आर पैरेलल टू ईच अदर। | 3.04 |
| vo012 | A B is parallel to C D. | = | ए बी इज़ पैरेलल टू सी डी। | 2.05 |
| vo013 | So this quadrilateral has one pair of parallel sides. | = | सो दिस क्वाड्रिलैटरल हैज वन पेयर ऑफ पैरेलल साइड्स। | 4.17 |
| vo014 | We call this a trapezium. | = | वी कॉल दिस ए ट्रैपीजियम। | 2.01 |
| vo015 | A quadrilateral with at least one pair of parallel sides is called a trapezium. | = | ए क्वॉड्रीलैटरल विद एट लीस्ट वन पेयर ऑफ पैरेलल साइड्स इज कॉल्ड ए ट्रेपीजियम। | 5.30 |
| vo185 | Which of these quadrilaterals is a trapezium? | = | विच ऑफ दीज़ क्वाड्रिलैटरल्स इज़ ए ट्रेपीजियम? | 3.14 |
| vo186 | Look at each side of this shape. No two sides are parallel, so it is not a trapezium. | = | लुक एट ईच साइड ऑफ दिस शेप। नो टू साइड्स आर पैरेलल, सो इट इज नॉट अ ट्रेपेज़ियम। | 5.87 |
| vo187 | This shape has no parallel sides at all. | = | दिस शेप हैज नो पैरेलल साइड्स एट ऑल। | 3.15 |
| vo208 | Correct! It has one pair of parallel sides, so it is a trapezium. | = | करेक्ट! इट हैज वन पेयर ऑफ पैरेलल साइड्स, सो इट इज अ ट्रेपीजियम। | 4.58 |
| vo016 | The parallel sides are called bases. | = | द पैरेलल साइड्स आर कॉल्ड बेसिस। | 3.02 |
| vo017 | The other two sides are called legs. | = | द अदर टू साइड्स आर कॉल्ड लेग्स। | 2.91 |
| vo018 | Let's measure the sides of this trapezium. | = | लेट्स मेजर द साइड्स ऑफ दिस ट्रेपीजियम। | 2.52 |
| vo019 | Woah! All the sides of this trapezium are of different lengths. | Whoa! All the sides of this trapezium are of different lengths. | वो! ऑल द साइड्स ऑफ दिस ट्रेपीजियम आर ऑफ डिफरेंट लेंग्थ्स। | 4.29 |
| vo020 | This type of trapezium which has sides of different lengths is called a scalene trapezium. | = | दिस टाइप ऑफ ट्रैपीज़ियम व्हिच हैज़ साइड्स ऑफ डिफरेंट लेंग्थ्स इज़ कॉल्ड अ स्केलीन ट्रैपीज़ियम। | 5.29 |
| vo021 | Look! Its legs are of different length too. | = | लुक! इट्स लेग्स आर ऑफ डिफरेंट लेंथ टू. | 3.04 |
| vo022 | What if the legs were the same length? | = | वॉट इफ़ द लेग्स वर द सेम लेंथ? | 2.30 |
| vo023 | Let's find out. | = | लेट्स फाइंड आउट। | 1.49 |
| vo025 | Drag vertex A so that both the legs are of equal length. | = | ड्रैग वर्टेक्स ए सो दैट बोथ द लेग्स आर ऑफ इक्वल लेंथ। | 3.80 |
| vo026 | AD is 5.1 cm. Keep dragging A until it shows exactly 5 cm. | A D is five point one centimetres. Keep dragging A until it shows exactly five centimetres. | ए डी इज फाइव पॉइंट वन सेंटीमीटर्स। कीप ड्रैगिंग ए अंटिल इट शोज़ इग्ज़ैक्टली फाइव सेंटीमीटर्स। | 6.73 |
| vo027 | AD is 5.2 cm. Keep dragging A until it shows exactly 5 cm. | A D is five point two centimetres. Keep dragging A until it shows exactly five centimetres. | ए डी इज़ फाइव पॉइंट टू सेंटीमीटर्स। कीप ड्रैगिंग ए अंटिल इट शोज़ एग्ज़ैक्टली फाइव सेंटीमीटर्स। | 7.10 |
| vo028 | AD is 5.3 cm. Keep dragging A until it shows exactly 5 cm. | A D is five point three centimetres. Keep dragging A until it shows exactly five centimetres. | ए डी इज़ फाइव पॉइंट थ्री सेंटीमीटर्स। कीप ड्रैगिंग ए अनटिल इट शोज़ एक्ज़ैक्टली फाइव सेंटीमीटर्स। | 7.59 |
| vo029 | AD is 5.4 cm. Keep dragging A until it shows exactly 5 cm. | A D is five point four centimetres. Keep dragging A until it shows exactly five centimetres. | ए डी इज़ फाइव पॉइंट फोर सेंटीमीटर्स। कीप ड्रैगिंग ए अंटिल इट शोज़ एग्ज़ैक्टली फाइव सेंटीमीटर्स। | 6.71 |
| vo030 | AD is 5.5 cm. Keep dragging A until it shows exactly 5 cm. | A D is five point five centimetres. Keep dragging A until it shows exactly five centimetres. | ए डी इज़ फाइव पॉइंट फाइव सेंटीमीटर्स। कीप ड्रैगिंग ए अंटिल इट शोज़ एग्ज़ैक्टली फाइव सेंटीमीटर्स। | 7.28 |
| vo031 | AD is 5.6 cm. Keep dragging A until it shows exactly 5 cm. | A D is five point six centimetres. Keep dragging A until it shows exactly five centimetres. | ए डी इज फाइव पॉइंट सिक्स सेंटीमीटर्स। कीप ड्रैगिंग ए अनटिल इट शोज़ एग्जैक्टली फाइव सेंटीमीटर्स। | 7.16 |
| vo032 | AD is 5.7 cm. Keep dragging A until it shows exactly 5 cm. | A D is five point seven centimetres. Keep dragging A until it shows exactly five centimetres. | ए डी इज फाइव पॉइंट सेवन सेंटीमीटर्स। कीप ड्रैगिंग ए अंटिल इट शोज एक्जैक्टली फाइव सेंटीमीटर्स। | 7.92 |
| vo033 | AD is 5.8 cm. Keep dragging A until it shows exactly 5 cm. | A D is five point eight centimetres. Keep dragging A until it shows exactly five centimetres. | ए डी इज फाइव पॉइंट एइट सेंटीमीटर्स। कीप ड्रैगिंग ए अनटिल इट शोज एग्जेक्टली फाइव सेंटीमीटर्स। | 6.52 |
| vo034 | AD is 5.9 cm. Keep dragging A until it shows exactly 5 cm. | A D is five point nine centimetres. Keep dragging A until it shows exactly five centimetres. | ए डी इज फाइव पॉइंट नाइन सेंटीमीटर्स। कीप ड्रैगिंग ए अंटिल इट शोज एग्जैक्टली फाइव सेंटीमीटर्स। | 6.55 |
| vo035 | AD is 6 cm. Keep dragging A until it shows exactly 5 cm. | A D is six centimetres. Keep dragging A until it shows exactly five centimetres. | ए डी इज़ सिक्स सेंटीमीटर्स। कीप ड्रैगिंग ए अंटिल इट शोज़ इग्ज़ैक्टली फाइव सेंटीमीटर्स। | 6.80 |
| vo036 | AD is 6.1 cm. Keep dragging A until it shows exactly 5 cm. | A D is six point one centimetres. Keep dragging A until it shows exactly five centimetres. | ए डी इज़ सिक्स पॉइंट वन सेंटीमीटर। कीप ड्रैगिंग ए अंटिल इट शोज़ इग्ज़ैक्टली फाइव सेंटीमीटर। | 7.94 |
| vo037 | AD is 6.2 cm. Keep dragging A until it shows exactly 5 cm. | A D is six point two centimetres. Keep dragging A until it shows exactly five centimetres. | ए डी इज सिक्स पॉइंट टू सेंटीमीटर। कीप ड्रैगिंग ए अंटिल इट शोज़ एग्जैक्टली फाइव सेंटीमीटर। | 7.45 |
| vo038 | AD is 6.3 cm. Keep dragging A until it shows exactly 5 cm. | A D is six point three centimetres. Keep dragging A until it shows exactly five centimetres. | ए डी इज़ सिक्स पॉइंट थ्री सेंटीमीटर्स। कीप ड्रैगिंग ए अंटिल इट शोज़ एग्ज़ैक्टली फाइव सेंटीमीटर्स। | 7.87 |
| vo039 | AD is 6.4 cm. Keep dragging A until it shows exactly 5 cm. | A D is six point four centimetres. Keep dragging A until it shows exactly five centimetres. | ए डी इज़ सिक्स पॉइंट फोर सेंटीमीटर्स। कीप ड्रैगिंग ए अनटिल इट शोज़ एग्ज़ैक्टली फाइव सेंटीमीटर्स। | 7.63 |
| vo040 | AD is 6.5 cm. Keep dragging A until it shows exactly 5 cm. | A D is six point five centimetres. Keep dragging A until it shows exactly five centimetres. | ए डी इज़ सिक्स पॉइंट फाइव सेंटीमीटर्स। कीप ड्रैगिंग ए अंटिल इट शोज़ एग्जैक्टली फाइव सेंटीमीटर्स। | 7.40 |
| vo041 | AD is 6.6 cm. Keep dragging A until it shows exactly 5 cm. | A D is six point six centimetres. Keep dragging A until it shows exactly five centimetres. | ए डी इज़ सिक्स पॉइंट सिक्स सेंटीमीटर। कीप ड्रैगिंग ए अंटिल इट शोज़ एग्ज़ैक्टली फाइव सेंटीमीटर। | 6.91 |
| vo042 | AD is 6.7 cm. Keep dragging A until it shows exactly 5 cm. | A D is six point seven centimetres. Keep dragging A until it shows exactly five centimetres. | ए डी इज़ सिक्स पॉइंट सेवन सेंटीमीटर्स। कीप ड्रैगिंग ए अंटिल इट शोज़ एग्ज़ैक्टली फाइव सेंटीमीटर्स। | 7.94 |
| vo043 | AD is 6.8 cm. Keep dragging A until it shows exactly 5 cm. | A D is six point eight centimetres. Keep dragging A until it shows exactly five centimetres. | ए डी इज़ सिक्स पॉइंट एइट सेंटीमीटर्स। कीप ड्रैगिंग ए अंटिल इट शोज़ एग्जैक्टली फाइव सेंटीमीटर्स। | 6.94 |
| vo044 | AD is 6.9 cm. Keep dragging A until it shows exactly 5 cm. | A D is six point nine centimetres. Keep dragging A until it shows exactly five centimetres. | ए डी इज़ सिक्स पॉइंट नाइन सेंटीमीटर्स। कीप ड्रैगिंग ए अनटिल इट शोज़ एग्ज़ैक्टली फाइव सेंटीमीटर्स। | 7.27 |
| vo045 | AD is 7 cm. Keep dragging A until it shows exactly 5 cm. | A D is seven centimetres. Keep dragging A until it shows exactly five centimetres. | ए डी इज़ सेवन सेंटीमीटर्स। कीप ड्रैगिंग ए अंटिल इट शोज़ एक्जेक्टली फाइव सेंटीमीटर्स। | 7.00 |
| vo046 | AD is 7.1 cm. Keep dragging A until it shows exactly 5 cm. | A D is seven point one centimetres. Keep dragging A until it shows exactly five centimetres. | ए डी इज सेवन पॉइंट वन सेंटीमीटर्स। कीप ड्रैगिंग ए अंटिल इट शोज एग्जेक्टली फाइव सेंटीमीटर्स। | 7.55 |
| vo047 | AD is 7.2 cm. Keep dragging A until it shows exactly 5 cm. | A D is seven point two centimetres. Keep dragging A until it shows exactly five centimetres. | ए डी इज सेवन पॉइंट टू सेंटीमीटर्स। कीप ड्रैगिंग ए अंटिल इट शोज एग्जैक्टली फाइव सेंटीमीटर्स। | 7.36 |
| vo048 | AD is 7.3 cm. Keep dragging A until it shows exactly 5 cm. | A D is seven point three centimetres. Keep dragging A until it shows exactly five centimetres. | ए डी इज़ सेवन पॉइंट थ्री सेंटीमीटर्स। कीप ड्रैगिंग ए अंटिल इट शोज़ एग्ज़ैक्टली फाइव सेंटीमीटर्स। | 7.34 |
| vo049 | AD is 7.4 cm. Keep dragging A until it shows exactly 5 cm. | A D is seven point four centimetres. Keep dragging A until it shows exactly five centimetres. | ए डी इज़ सेवन पॉइंट फोर सेंटीमीटर्स. कीप ड्रैगिंग ए अंटिल इट शोज़ एग्ज़ैक्टली फाइव सेंटीमीटर्स. | 7.57 |
| vo050 | AD is 7.5 cm. Keep dragging A until it shows exactly 5 cm. | A D is seven point five centimetres. Keep dragging A until it shows exactly five centimetres. | ए डी इज़ सेवन पॉइंट फाइव सेंटीमीटर्स। कीप ड्रैगिंग ए अंटिल इट शोज़ एग्ज़ैक्टली फाइव सेंटीमीटर्स। | 7.31 |
| vo051 | AD is 7.6 cm. Keep dragging A until it shows exactly 5 cm. | A D is seven point six centimetres. Keep dragging A until it shows exactly five centimetres. | ए डी इज सेवन पॉइंट सिक्स सेंटीमीटर्स। कीप ड्रैगिंग ए अंटिल इट शोज एक्जेक्टली फाइव सेंटीमीटर्स। | 7.46 |
| vo211 | Watch! AD becomes 5 cm, just like BC. Now both legs are equal. | Watch! A D becomes five centimetres, just like B C. Now both legs are equal. | वॉच! ए डी बिकम्स फाइव सेंटीमीटर्स, जस्ट लाइक बी सी। नाओ बोथ लेग्स आर इक्वल। | 7.03 |
| vo052 | Perfect! Both legs are equal. | = | परफेक्ट! बोथ लेग्स आर इक्वल। | 2.56 |
| vo053 | Drag point A along the top side. | = | ड्रैग पॉइंट ए अलॉन्ग द टॉप साइड। | 2.83 |
| vo054 | A trapezium where legs are of same length is called an isosceles trapezium. | = | ए ट्रेपीजियम वेयर लेग्स आर ऑफ सेम लेंथ इज कॉल्ड एन आइसोसिलीज ट्रेपीजियम। | 5.30 |
| vo055 | We know all about the sides of a trapezium. | = | वी नो ऑल अबाउट द साइड्स ऑफ अ ट्रेपीजियम। | 3.03 |
| vo200 | In an isosceles trapezium, AB = 6 cm, CD = 10 cm and AD = 5 cm. What is the length of BC? | In an isosceles trapezium, A B equals six centimetres, C D equals ten centimetres, and A D equals five centimetres. What is the length of B C? | इन एन आइसोसिलीस ट्रेपीजियम, ए बी इक्वल्स सिक्स सेंटीमीटर्स, सी डी इक्वल्स टेन सेंटीमीटर्स, एंड ए डी इक्वल्स फाइव सेंटीमीटर्स। व्हाट इज द लेंथ ऑफ बी सी? | 10.51 |
| vo201 | BC is a leg. In an isosceles trapezium, both legs are equal. | B C is a leg. In an isosceles trapezium, both legs are equal. | बी सी इज़ ए लैग। इन ऐन आइसोसेलीस ट्रैपीजियम, बोथ लैग्स आर इक्वल। | 5.43 |
| vo202 | 6 cm is the top base AB. BC is a leg, like AD. | Six centimetres is the top base A B. B C is a leg, like A D. | सिक्स सेंटीमीटर इज द टॉप बेस ए बी। बी सी इज अ लेग, लाइक ए डी। | 5.71 |
| vo204 | Yes! In an isosceles trapezium the legs are equal, so BC = 5 cm. | Yes! In an isosceles trapezium the legs are equal, so B C equals five centimetres. | येस! इन एन आइसोसेलीज़ ट्रेपीज़ियम द लेग्स आर इक्वल, सो बी सी इक्वल्स फाइव सेंटीमीटर्स। | 7.98 |
| vo056 | Let's measure its angles. | = | लेट्स मेज़र इट्स एंगल्स। | 2.23 |
| vo057 | Did you notice something? | = | डिड यू नोटिस समथिंग? | 1.33 |
| vo058 | ∠A and ∠D add up to 180°. | Angle A and angle D add up to one hundred and eighty degrees. | एंगल ए एंड एंगल डी ऐड अप टू वन हंड्रेड एंड एटी डिग्रीज़। | 4.65 |
| vo059 | That means they are supplementary angles. | = | दैट मीन्स दे आर सप्लीमेंट्री एंगल्स। | 2.54 |
| vo060 | What about ∠B and ∠C? | What about angle B and angle C? | वाट अबाउट एंगल बी एंड एंगल सी? | 2.81 |
| vo212 | It is 180°! Like ∠A and ∠D, ∠B and ∠C add up to 180°. | It is one hundred and eighty degrees! Like angle A and angle D, angle B and angle C add up to one hundred and eighty degrees. | इट इज़ वन हंड्रेड एंड एटी डिग्रीज़! लाइक एंगल ए एंड एंगल डी, एंगल बी एंड एंगल सी ऐड अप टू वन हंड्रेड एंड एटी डिग्रीज़। | 8.15 |
| vo061 | Not quite. Try again. | = | नॉट क्वाइट। ट्राई अगेन। | 2.38 |
| vo062 | 360° is the sum of all four angles. Try again. | Three hundred and sixty degrees is the sum of all four angles. Try again. | थ्री हंड्रेड एंड सिक्सटी डिग्रीज़ इज़ द सम ऑफ़ ऑल फ़ोर एंगल्स. ट्राय अगेन. | 5.41 |
| vo063 | Correct! ∠B and ∠C are supplementary angles too. | Correct! Angle B and angle C are supplementary angles too. | करेक्ट! एंगल बी एंड एंगल सी आर सप्लीमेंट्री एंगल्स टू. | 5.08 |
| vo064 | What if we change the shape of this trapezium? | = | वॉट इफ़ वी चेंज द शेप ऑफ़ दिस ट्रेपीज़ियम? | 2.79 |
| vo065 | Drag any vertex to change the angles. Notice the sum of angles. | = | ड्रैग एनी वर्टेक्स टू चेंज द एंगल्स। नोटिस द सम ऑफ एंगल्स। | 4.46 |
| vo066 | Drag any corner and watch the two sums. | = | ड्रैग एनी कॉर्नर एंड वॉच द टू सम्स। | 2.98 |
| vo067 | No matter the shape, the angles always add up to 180°. | No matter the shape, the angles always add up to one hundred and eighty degrees. | नो मैटर द शेप, द एंगल्स ऑलवेज ऐड अप टू वन हंड्रेड एंड एटी डिग्रीज़। | 4.92 |
| vo068 | So in any trapezium, angles on the same leg always add up to 180°. | So in any trapezium, angles on the same leg always add up to one hundred and eighty degrees. | सो इन एनी ट्रेपीज़ियम, एंगल्स ऑन द सेम लेग ऑलवेज ऐड अप टू वन हंड्रेड एंड एइटी डिग्रीज़। | 6.55 |
| vo193 | In this trapezium, ∠A = 120°. What is the value of ∠D? | In this trapezium, angle A equals one hundred and twenty degrees. What is the value of angle D? | इन दिस ट्रेपीजियम एंगल ए इक्वल्स वन हंड्रेड एंड ट्वेंटी डिग्रीज़ वाट इज द वैल्यू ऑफ एंगल डी? | 7.02 |
| vo182 | Angles on the same leg add up to 180°. | Angles on the same leg add up to one hundred and eighty degrees. | एंगल्स ऑन द सेम लेग ऐड अप टू वन हंड्रेड एंड एटी डिग्रीज। | 3.71 |
| vo194 | Correct! 120° + 60° = 180°. | Correct! One hundred and twenty degrees, plus sixty degrees, equals one hundred and eighty degrees. | करेक्ट! वन हंड्रेड एंड ट्वेंटी डिग्रीज़, प्लस सिक्स्टी डिग्रीज़, इक्वल्स वन हंड्रेड एंड एटी डिग्रीज़। | 5.73 |
| vo069 | What if we make one of the angles 90°? | What if we make one of the angles ninety degrees? | वॉट इफ़ वी मेक वन ऑफ़ द एंगल्स नाइन्टी डिग्रीज़? | 3.66 |
| vo070 | Drag any vertex to make any angle 90°. | Drag any vertex to make any angle ninety degrees. | ड्रैग एनी वर्टेक्स टू मेक एनी एंगल नाइन्टी डिग्रीज़। | 3.71 |
| vo071 | ∠A is *(part)* | Angle A is | एंगल ए इज | 1.71 |
| vo072 | ∠B is *(part)* | Angle B is | एंगल बी इज | 1.34 |
| vo073 | ∠C is *(part)* | Angle C is | एंगल सी इज | 1.31 |
| vo074 | ∠D is *(part)* | Angle D is | एंगल डी इज | 1.61 |
| vo075 | 39° now. Keep dragging until it shows 90°. *(part)* | Thirty-nine degrees now. Keep dragging until it shows ninety degrees. | थर्टी नाइन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.01 |
| vo076 | 40° now. Keep dragging until it shows 90°. *(part)* | Forty degrees now. Keep dragging until it shows ninety degrees. | फ़ॉर्टी डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.60 |
| vo077 | 41° now. Keep dragging until it shows 90°. *(part)* | Forty-one degrees now. Keep dragging until it shows ninety degrees. | फ़ोरटी-वन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.30 |
| vo078 | 42° now. Keep dragging until it shows 90°. *(part)* | Forty-two degrees now. Keep dragging until it shows ninety degrees. | फ़ोर्टी-टू डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.66 |
| vo079 | 43° now. Keep dragging until it shows 90°. *(part)* | Forty-three degrees now. Keep dragging until it shows ninety degrees. | फोर्टी थ्री डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.76 |
| vo080 | 44° now. Keep dragging until it shows 90°. *(part)* | Forty-four degrees now. Keep dragging until it shows ninety degrees. | फोर्टी-फोर डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.02 |
| vo081 | 45° now. Keep dragging until it shows 90°. *(part)* | Forty-five degrees now. Keep dragging until it shows ninety degrees. | फोर्टी-फाइव डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.20 |
| vo082 | 46° now. Keep dragging until it shows 90°. *(part)* | Forty-six degrees now. Keep dragging until it shows ninety degrees. | फ़ोर्टी सिक्स डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.53 |
| vo083 | 47° now. Keep dragging until it shows 90°. *(part)* | Forty-seven degrees now. Keep dragging until it shows ninety degrees. | फोर्टी सेवन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.72 |
| vo084 | 48° now. Keep dragging until it shows 90°. *(part)* | Forty-eight degrees now. Keep dragging until it shows ninety degrees. | फोर्टी-एट डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइनटी डिग्रीज़। | 4.83 |
| vo085 | 49° now. Keep dragging until it shows 90°. *(part)* | Forty-nine degrees now. Keep dragging until it shows ninety degrees. | फोर्टी नाइन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.57 |
| vo086 | 50° now. Keep dragging until it shows 90°. *(part)* | Fifty degrees now. Keep dragging until it shows ninety degrees. | फिफ्टी डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.04 |
| vo087 | 51° now. Keep dragging until it shows 90°. *(part)* | Fifty-one degrees now. Keep dragging until it shows ninety degrees. | फिफ्टी-वन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.74 |
| vo088 | 52° now. Keep dragging until it shows 90°. *(part)* | Fifty-two degrees now. Keep dragging until it shows ninety degrees. | फ़िफ़्टी-टू डिग्रीज़ नाओ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.78 |
| vo089 | 53° now. Keep dragging until it shows 90°. *(part)* | Fifty-three degrees now. Keep dragging until it shows ninety degrees. | फिफ्टी-थ्री डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.04 |
| vo090 | 54° now. Keep dragging until it shows 90°. *(part)* | Fifty-four degrees now. Keep dragging until it shows ninety degrees. | फ़िफ़्टी-फ़ोर डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.89 |
| vo091 | 55° now. Keep dragging until it shows 90°. *(part)* | Fifty-five degrees now. Keep dragging until it shows ninety degrees. | फ़िफ़्टी फ़ाइव डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.90 |
| vo092 | 56° now. Keep dragging until it shows 90°. *(part)* | Fifty-six degrees now. Keep dragging until it shows ninety degrees. | फिफ्टी-सिक्स डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.96 |
| vo093 | 57° now. Keep dragging until it shows 90°. *(part)* | Fifty-seven degrees now. Keep dragging until it shows ninety degrees. | फ़िफ़्टी-सेवन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.62 |
| vo094 | 58° now. Keep dragging until it shows 90°. *(part)* | Fifty-eight degrees now. Keep dragging until it shows ninety degrees. | फिफ्टी-एट डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.85 |
| vo095 | 59° now. Keep dragging until it shows 90°. *(part)* | Fifty-nine degrees now. Keep dragging until it shows ninety degrees. | फिफ़्टी नाइन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइनटी डिग्रीज़। | 4.98 |
| vo096 | 60° now. Keep dragging until it shows 90°. *(part)* | Sixty degrees now. Keep dragging until it shows ninety degrees. | सिक्सटी डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.53 |
| vo097 | 61° now. Keep dragging until it shows 90°. *(part)* | Sixty-one degrees now. Keep dragging until it shows ninety degrees. | सिक्सटी-वन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.84 |
| vo098 | 62° now. Keep dragging until it shows 90°. *(part)* | Sixty-two degrees now. Keep dragging until it shows ninety degrees. | सिक्स्टी-टू डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.29 |
| vo099 | 63° now. Keep dragging until it shows 90°. *(part)* | Sixty-three degrees now. Keep dragging until it shows ninety degrees. | सिक्सटी-थ्री डिग्रीज़ नाउ. कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़. | 4.78 |
| vo100 | 64° now. Keep dragging until it shows 90°. *(part)* | Sixty-four degrees now. Keep dragging until it shows ninety degrees. | सिक्सटी फोर डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.60 |
| vo101 | 65° now. Keep dragging until it shows 90°. *(part)* | Sixty-five degrees now. Keep dragging until it shows ninety degrees. | सिक्सटी-फाइव डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.00 |
| vo102 | 66° now. Keep dragging until it shows 90°. *(part)* | Sixty-six degrees now. Keep dragging until it shows ninety degrees. | सिक्सटी सिक्स डिग्रीज़ नाउ। कीप ड्रैगिंग अनटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.92 |
| vo103 | 67° now. Keep dragging until it shows 90°. *(part)* | Sixty-seven degrees now. Keep dragging until it shows ninety degrees. | सिक़्स्टी सेवन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.67 |
| vo104 | 68° now. Keep dragging until it shows 90°. *(part)* | Sixty-eight degrees now. Keep dragging until it shows ninety degrees. | सिक्सटी एट डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.84 |
| vo105 | 69° now. Keep dragging until it shows 90°. *(part)* | Sixty-nine degrees now. Keep dragging until it shows ninety degrees. | सिक्सटी-नाइन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.80 |
| vo106 | 70° now. Keep dragging until it shows 90°. *(part)* | Seventy degrees now. Keep dragging until it shows ninety degrees. | सवेंटी डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.85 |
| vo107 | 71° now. Keep dragging until it shows 90°. *(part)* | Seventy-one degrees now. Keep dragging until it shows ninety degrees. | सेवेन्टी-वन डिग्रीज़ नाउ। कीप ड्रैगिंग अन्टिल इट शोज़ नाइन्टी डिग्रीज़। | 4.80 |
| vo108 | 72° now. Keep dragging until it shows 90°. *(part)* | Seventy-two degrees now. Keep dragging until it shows ninety degrees. | सेवेन्टी टू डिग्रीज नाउ। कीप ड्रैगिंग अंटिल इट शोज नाइन्टी डिग्रीज। | 4.99 |
| vo109 | 73° now. Keep dragging until it shows 90°. *(part)* | Seventy-three degrees now. Keep dragging until it shows ninety degrees. | सेवेंटी थ्री डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.15 |
| vo110 | 74° now. Keep dragging until it shows 90°. *(part)* | Seventy-four degrees now. Keep dragging until it shows ninety degrees. | सेवेंटी फोर डिग्रीस नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीस। | 5.35 |
| vo111 | 75° now. Keep dragging until it shows 90°. *(part)* | Seventy-five degrees now. Keep dragging until it shows ninety degrees. | सेवेंटी-फाइव डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.59 |
| vo112 | 76° now. Keep dragging until it shows 90°. *(part)* | Seventy-six degrees now. Keep dragging until it shows ninety degrees. | सेवनटी सिक्स डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोस नाइंटी डिग्रीज़। | 5.37 |
| vo113 | 77° now. Keep dragging until it shows 90°. *(part)* | Seventy-seven degrees now. Keep dragging until it shows ninety degrees. | सेवेंटी-सेवन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.64 |
| vo114 | 78° now. Keep dragging until it shows 90°. *(part)* | Seventy-eight degrees now. Keep dragging until it shows ninety degrees. | सवेंटी-एट डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.61 |
| vo115 | 79° now. Keep dragging until it shows 90°. *(part)* | Seventy-nine degrees now. Keep dragging until it shows ninety degrees. | सेवेन्टी-नाइन डिग्रीज़ नाउ। कीप ड्रैगिंग अन्टिल इट शोज़ नाइन्टी डिग्रीज़। | 4.75 |
| vo116 | 80° now. Keep dragging until it shows 90°. *(part)* | Eighty degrees now. Keep dragging until it shows ninety degrees. | एटी डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइंटी डिग्रीज़। | 3.77 |
| vo117 | 81° now. Keep dragging until it shows 90°. *(part)* | Eighty-one degrees now. Keep dragging until it shows ninety degrees. | एटी-वन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.41 |
| vo118 | 82° now. Keep dragging until it shows 90°. *(part)* | Eighty-two degrees now. Keep dragging until it shows ninety degrees. | एटी टू डिग्रीज़ नाउ. कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़. | 4.65 |
| vo119 | 83° now. Keep dragging until it shows 90°. *(part)* | Eighty-three degrees now. Keep dragging until it shows ninety degrees. | एटी-थ्री डिग्रीज़ नाउ. कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़. | 4.22 |
| vo120 | 84° now. Keep dragging until it shows 90°. *(part)* | Eighty-four degrees now. Keep dragging until it shows ninety degrees. | एटी-फोर डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज नाइन्टी डिग्रीज़। | 4.78 |
| vo121 | 85° now. Keep dragging until it shows 90°. *(part)* | Eighty-five degrees now. Keep dragging until it shows ninety degrees. | एटी फाइव डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.38 |
| vo122 | 95° now. Keep dragging until it shows 90°. *(part)* | Ninety-five degrees now. Keep dragging until it shows ninety degrees. | नाइन्टी फाइव डिग्रीज़ नाउ। कीप ड्रैगिंग अन्टिल इट शोज़ नाइन्टी डिग्रीज़। | 4.98 |
| vo123 | 96° now. Keep dragging until it shows 90°. *(part)* | Ninety-six degrees now. Keep dragging until it shows ninety degrees. | नाइन्टी-सिक्स डिग्रीज़ नाउ। कीप ड्रैगिंग अन्टिल इट शोज़ नाइन्टी डिग्रीज़। | 5.46 |
| vo124 | 97° now. Keep dragging until it shows 90°. *(part)* | Ninety-seven degrees now. Keep dragging until it shows ninety degrees. | नाइनटी-सेवन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइनटी डिग्रीज़। | 4.51 |
| vo125 | 98° now. Keep dragging until it shows 90°. *(part)* | Ninety-eight degrees now. Keep dragging until it shows ninety degrees. | नाइनटी-ऐट डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइनटी डिग्रीज़। | 4.43 |
| vo126 | 99° now. Keep dragging until it shows 90°. *(part)* | Ninety-nine degrees now. Keep dragging until it shows ninety degrees. | नाइन्टी-नाइन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.46 |
| vo127 | 100° now. Keep dragging until it shows 90°. *(part)* | One hundred degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 7.44 |
| vo128 | 101° now. Keep dragging until it shows 90°. *(part)* | One hundred and one degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड वन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.38 |
| vo129 | 102° now. Keep dragging until it shows 90°. *(part)* | One hundred and two degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड टू डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.50 |
| vo130 | 103° now. Keep dragging until it shows 90°. *(part)* | One hundred and three degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड थ्री डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइनटी डिग्रीज़। | 4.78 |
| vo131 | 104° now. Keep dragging until it shows 90°. *(part)* | One hundred and four degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड फोर डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.17 |
| vo132 | 105° now. Keep dragging until it shows 90°. *(part)* | One hundred and five degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड फाइव डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.92 |
| vo133 | 106° now. Keep dragging until it shows 90°. *(part)* | One hundred and six degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड सिक्स डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.98 |
| vo134 | 107° now. Keep dragging until it shows 90°. *(part)* | One hundred and seven degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड सेवन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 4.98 |
| vo135 | 108° now. Keep dragging until it shows 90°. *(part)* | One hundred and eight degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड एट डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.38 |
| vo136 | 109° now. Keep dragging until it shows 90°. *(part)* | One hundred and nine degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड नाइन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.46 |
| vo137 | 110° now. Keep dragging until it shows 90°. *(part)* | One hundred and ten degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड टेन डिग्रीज नाउ। कीप ड्रैगिंग अंटिल इट शोज नाइन्टी डिग्रीज। | 5.41 |
| vo138 | 111° now. Keep dragging until it shows 90°. *(part)* | One hundred and eleven degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड इलेवन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.45 |
| vo139 | 112° now. Keep dragging until it shows 90°. *(part)* | One hundred and twelve degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड ट्वेल्व डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.10 |
| vo140 | 113° now. Keep dragging until it shows 90°. *(part)* | One hundred and thirteen degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड थर्टीन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.54 |
| vo141 | 114° now. Keep dragging until it shows 90°. *(part)* | One hundred and fourteen degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड फोर्टीन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.56 |
| vo142 | 115° now. Keep dragging until it shows 90°. *(part)* | One hundred and fifteen degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड फिफ्टीन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.82 |
| vo143 | 116° now. Keep dragging until it shows 90°. *(part)* | One hundred and sixteen degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड सिक्सटीन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइंटी डिग्रीज़। | 5.62 |
| vo144 | 117° now. Keep dragging until it shows 90°. *(part)* | One hundred and seventeen degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड सेवेन्टीन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.25 |
| vo145 | 118° now. Keep dragging until it shows 90°. *(part)* | One hundred and eighteen degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड एटीन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.14 |
| vo146 | 119° now. Keep dragging until it shows 90°. *(part)* | One hundred and nineteen degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड नाइनटीन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइनटी डिग्रीज़। | 5.22 |
| vo147 | 120° now. Keep dragging until it shows 90°. *(part)* | One hundred and twenty degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड ट्वेंटी डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.43 |
| vo148 | 121° now. Keep dragging until it shows 90°. *(part)* | One hundred and twenty-one degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड ट्वेंटी-वन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.29 |
| vo149 | 122° now. Keep dragging until it shows 90°. *(part)* | One hundred and twenty-two degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड ट्वेंटी-टू डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.49 |
| vo150 | 123° now. Keep dragging until it shows 90°. *(part)* | One hundred and twenty-three degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड ट्वेंटी-थ्री डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइंटी डिग्रीज़। | 5.91 |
| vo151 | 124° now. Keep dragging until it shows 90°. *(part)* | One hundred and twenty-four degrees now. Keep dragging until it shows ninety degrees. | वन् हंड्रेड एंड ट्वेंटी-फोर डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.07 |
| vo152 | 125° now. Keep dragging until it shows 90°. *(part)* | One hundred and twenty-five degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड ट्वेंटी-फाइव डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.37 |
| vo153 | 126° now. Keep dragging until it shows 90°. *(part)* | One hundred and twenty-six degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड ट्वेंटी-सिक्स डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइंटी डिग्रीज़। | 6.00 |
| vo154 | 127° now. Keep dragging until it shows 90°. *(part)* | One hundred and twenty-seven degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड ट्वेंटी-सेवन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.66 |
| vo155 | 128° now. Keep dragging until it shows 90°. *(part)* | One hundred and twenty-eight degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड ट्वेंटी-एट डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.05 |
| vo156 | 129° now. Keep dragging until it shows 90°. *(part)* | One hundred and twenty-nine degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड ट्वेंटी-नाइन डिग्रीज नाउ। कीप ड्रैगिंग अंटिल इट शोज नाइन्टी डिग्रीज। | 5.42 |
| vo157 | 130° now. Keep dragging until it shows 90°. *(part)* | One hundred and thirty degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड थर्टी डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.01 |
| vo158 | 131° now. Keep dragging until it shows 90°. *(part)* | One hundred and thirty-one degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड थर्टी-वन डिग्रीज़ नाओ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.41 |
| vo159 | 132° now. Keep dragging until it shows 90°. *(part)* | One hundred and thirty-two degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड थर्टी टू डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.69 |
| vo160 | 133° now. Keep dragging until it shows 90°. *(part)* | One hundred and thirty-three degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड थर्टी-थ्री डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.50 |
| vo161 | 134° now. Keep dragging until it shows 90°. *(part)* | One hundred and thirty-four degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड थर्टी फोर डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.62 |
| vo162 | 135° now. Keep dragging until it shows 90°. *(part)* | One hundred and thirty-five degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड थर्टी-फाइव डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 6.06 |
| vo163 | 136° now. Keep dragging until it shows 90°. *(part)* | One hundred and thirty-six degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड थर्टी-सिक्स डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.54 |
| vo164 | 137° now. Keep dragging until it shows 90°. *(part)* | One hundred and thirty-seven degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड थर्टी-सेवन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइंटी डिग्रीज़। | 5.60 |
| vo165 | 138° now. Keep dragging until it shows 90°. *(part)* | One hundred and thirty-eight degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड थर्टी-एट डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइनटी डिग्रीज़। | 5.52 |
| vo166 | 139° now. Keep dragging until it shows 90°. *(part)* | One hundred and thirty-nine degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड थर्टी-नाइन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.64 |
| vo167 | 140° now. Keep dragging until it shows 90°. *(part)* | One hundred and forty degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड फार्टी डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.49 |
| vo168 | 141° now. Keep dragging until it shows 90°. *(part)* | One hundred and forty-one degrees now. Keep dragging until it shows ninety degrees. | वन हंड्रेड एंड फार्टी वन डिग्रीज़ नाउ। कीप ड्रैगिंग अंटिल इट शोज़ नाइन्टी डिग्रीज़। | 5.16 |
| vo213 | Watch! Now ∠A is 90°. That is a right angle. | Watch! Now angle A is ninety degrees. That is a right angle. | वॉच! नाउ एंगल ए इज नाइन्टी डिग्रीज़। दैट इज ए राइट एंगल। | 5.49 |
| vo214 | Watch! Now ∠B is 90°. That is a right angle. | Watch! Now angle B is ninety degrees. That is a right angle. | वॉच! नाओ एंगल बी इज नाइन्टी डिग्रीज़। दैट इज अ राइट एंगल। | 5.41 |
| vo215 | Watch! Now ∠C is 90°. That is a right angle. | Watch! Now angle C is ninety degrees. That is a right angle. | वॉच! नाउ एंगल सी इज़ नाइन्टी डिग्रीज़। दैट इज़ अ राइट एंगल। | 5.59 |
| vo216 | Watch! Now ∠D is 90°. That is a right angle. | Watch! Now angle D is ninety degrees. That is a right angle. | वॉच! नाओ एंगल डी इज नाइन्टी डिग्रीज। दैट इज ए राइट एंगल। | 5.42 |
| vo169 | Great job! | = | ग्रेट जॉब! | 0.90 |
| vo170 | Drag a corner slowly and stop when an angle shows 90°. | Drag a corner slowly and stop when an angle shows ninety degrees. | ड्रैग अ कॉर्नर स्लोली एंड स्टॉप व्हेन एन एंगल शोज़ नाइन्टी डिग्रीज़ | 5.45 |
| vo171 | Woah! We got another right angle. | Whoa! ... We got another right angle. | वो! ... वी गॉट अनदर राइट एंगल। | 2.41 |
| vo172 | A trapezium with two adjacent right angles is called a right angled trapezium. | = | ए ट्रैपीज़ियम विद टू एडजेसेंट राइट एंगल्स इज़ कॉल्ड ए राइट एंगल्ड ट्रैपीज़ियम। | 5.25 |
| vo206 | Can you tap the two right angles? | = | कैन यू टैप द टू राइट एंगल्स? | 2.19 |
| vo173 | That angle is not 90°. Look for the square corners. | That angle is not ninety degrees. Look for the square corners. | दैट एंगल इज नॉट नाइन्टी डिग्रीज। लुक फॉर द स्क्वायर कॉर्नर्स। | 4.03 |
| vo217 | Here they are! ∠A and ∠D are both 90°. | Here they are! Angle A and angle D are both ninety degrees. | हीयर दे आर! एंगल ए एंड एंगल डी आर बोथ नाइन्टी डिग्रीज़। | 5.09 |
| vo189 | Which type of trapezium is this? | = | विच टाइप ऑफ ट्रेपीजियम इज दिस? | 2.29 |
| vo190 | Look at the little marks on the legs. They tell us the legs are equal. | = | लुक एट द लिटिल मार्क्स ऑन द लेग्स। दे टेल अस द लेग्स आर इक्वल। | 4.31 |
| vo191 | There are no right angles in this shape. Look at the legs instead. | = | देयर आर नो राइट एंगल्स इन दिस शेप। लुक एट द लेग्स इंस्टेड। | 4.15 |
| vo192 | Right! The marks show its legs are equal, so it is an isosceles trapezium. | = | राइट! द मार्क्स शो इट्स लेग्स आर इक्वल, सो इट इज एन आइसोसिलीस ट्रेपीजियम। | 6.01 |
| vo195 | Drag the labels to their correct place. | = | ड्रैग द लेबल्स टू देयर करेक्ट प्लेस। | 2.43 |
| vo196 | Try again! Look closely at the shapes. | = | ट्राई अगेन! लुक क्लोजली एट द शेप्स. | 3.28 |
| vo197 | Watch the glowing clue. Which shape has that mark? | = | वॉच द ग्लोइंग क्लू। विच शेप हैज दैट मार्क? | 4.04 |
| vo198 | Some labels went back. Look for the marks: equal legs, right angles, or neither. | = | सम लेबल्स वेंट बैक। लुक फॉर द मार्क्स: इक्वल लेग्स, राइट एंगल्स, ऑर नाइदर। | 6.35 |
| vo199 | Brilliant! You labelled all three trapeziums. | = | ब्रिलियंट! यू लेबल्ड ऑल थ्री ट्रैपीजियम्स। | 3.75 |
| vo174 | Great job! Now you know all about trapeziums. | = | ग्रेट जॉब! नाउ यू नो ऑल अबाउट ट्रेपीजियम्स। | 3.84 |
| vo175 | Let's recall what we learnt today. | = | लेट्स रिकॉल वॉट वी लर्न्ट टुडे। | 2.25 |
| vo207 | A trapezium is a quadrilateral with at least one pair of parallel sides. | = | ए ट्रेपेज़ियम इज़ ए क्वॉड्रीलैटरल विद एट लीस्ट वन पेयर ऑफ़ पैरेलल साइड्स। | 5.01 |
| vo177 | The parallel sides are called the bases. | = | द पैरेलल साइड्स आर कॉल्ड द बेसेस। | 3.19 |
| vo178 | The other two sides are called the legs. | = | द अदर टू साइड्स आर कॉल्ड द लेग्स। | 2.68 |
| vo179 | A scalene trapezium has sides of different lengths. | = | ए स्केलीन ट्रेपेजियम हैज साइड्स ऑफ डिफरेंट लेंग्थ्स. | 3.74 |
| vo180 | An isosceles trapezium has legs of the same length. | = | ऐन आइसोसेलीज़ ट्रपीज़ियम हैज़ लेग्स ऑफ़ द सेम लेंथ। | 3.66 |
| vo181 | A right trapezium has two adjacent right angles. | = | ए राइट ट्रेपीजियम हैज टू एडजसेंट राइट एंगल्स। | 3.52 |
| vo183 | Two angles that add up to 180° are supplementary. | Two angles that add up to one hundred and eighty degrees are supplementary. | टू एंगल्स दैट ऐड अप टू वन हंड्रेड एंड एटी डिग्रीज़ आर सप्लीमेंट्री। | 4.34 |
| vo184 | Wonderful! You remember everything about trapeziums! | = | वंडरफुल! यू रिमेंबर एवरीथिंग अबाउट ट्रेपीज़ियम्स! | 4.08 |
| vo205 | Amazing work! You know all about trapeziums now. | = | अमेजिंग वर्क! यू नो ऑल अबाउट ट्रेपीजियम्स नाउ। | 3.65 |
| vo209 | Bye for now! See you on our next snowy adventure! | = | बाय फॉर नाउ! सी यू ऑन आवर नेक्स्ट स्नोवी एडवेंचर! | 3.29 |
| vo210 | The End! | = | द एंड! | 0.75 |
<!-- table:end -->
