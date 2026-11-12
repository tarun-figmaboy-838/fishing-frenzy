#!/usr/bin/env python3
"""The Hindi voice-over (assets/VO-HI/), made with ElevenLabs from locales/locales.json -> "hi".

    ELEVENLABS_API_KEY=... python3 tools/voice-elevenlabs.py        record every line that has no clip yet, or whose
                                                                     words changed; write assets/VO-HI/manifest.json
    python3 tools/voice-elevenlabs.py --dry                          only list what would be recorded (no key needed)
    ELEVENLABS_API_KEY=... python3 tools/voice-elevenlabs.py --redo lsHi f1Catch.triangle    record these again

Then run python3 tools/build-locales.py: it writes locales/voices.js, the index the games find each clip by.

One clip per spoken line, named by its key (lsHi.mp3). A line whose words vary has a clip per variant
(f1Catch.triangle.mp3, lsDragAKeep.5_1.mp3); screen 33's "अभी ∠A 84° है। ..." is two clips played back to back
(lsDrag90.A + lsDrag90.84), as in English. The voice reads each line's spoken form: no *stress* marks or line
breaks, and digits, corner letters and symbols written out as Hindi words (180° -> एक सौ अस्सी डिग्री, AD -> ए डी,
∠A -> कोण ए, = -> बराबर, + -> जमा).

Voices (both Hindi voices in the team's ElevenLabs account): Swiftee and the narrator share one, as in English
(README: "Two voices only"); Popo has his own. A little slower and steadier than the voices' defaults, for grade 6-7.
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANG = 'hi'
OUT = os.path.join(ROOT, 'assets', 'VO-HI')
MANIFEST = os.path.join(OUT, 'manifest.json')
MODEL, FORMAT, SEED = 'eleven_multilingual_v2', 'mp3_44100_128', 7
VOICES = {
    'swiftee': {'name': 'Anjali – Friendly EdTech Teacher', 'voice_id': 'Kfn3fYy8XcPyUvbTxn1H',
                'settings': {'stability': 0.55, 'similarity_boost': 0.5, 'style': 0.0, 'use_speaker_boost': True,
                             'speed': 0.95}},
    'popo': {'name': 'Amit – Kids Cartoon Character', 'voice_id': 'NbvR1eY6Q8ivACdEO8PV',
             'settings': {'stability': 0.45, 'similarity_boost': 0.75, 'style': 0.0, 'use_speaker_boost': True,
                          'speed': 0.95}},
}
VOICES['narrator'] = VOICES['swiftee']

# ---------- who says what ----------
POPO = {'popoWhoopsie', 'popoGreatCatch', 'f1Woah', 'f1NotSeen', 'f1WhatKind', 'f2WhyNoParallel', 'f2WhyLegsEqual',
        'f2WhyLegsDifferent', 'f2WhyNoRight', 'f2OopsNotTrapezium', 'f2WhyNot180', 'f2OopsTryAgain', 'f2Wow',
        'f2WhatACatch', 'f2GiantFish', 'f2ComeOn', 'f2Huh', 'f2PopoLaughs'}
NARRATOR = ('f1Story', 'f1Catch', 'f1WrongSides', 'f1RowsOn', 'f2Catch', 'f2Hint', 'f2NotTrapeziumCard', 'theEnd',
            'shape')
# Not voice-over: page titles, buttons and system status, screen-reader-only labels, pieces of other lines, and
# f1WrongNot/f1WrongNotAll (said only when fishing 1 runs outside the journey: game.js wrongText)
SKIP = {'pageTitle', 'btnPlay', 'rotateHint', 'statusGettingReady', 'statusLoadFailed', 'btnTryAgain', 'soundOn',
        'soundOff', 'btnPause', 'paused', 'btnResume', 'btnRestart', 'btnNext', 'btnDone', 'loading', 'loadingAria',
        'fishAria', 'f1PageTitle', 'f1GameTitle', 'f1LoadFailed', 'f1WrongNotAll', 'f1WrongNot', 'lsPageTitle',
        'lsPlayAgain', 'lsDropZone', 'lsSwifteeAlt', 'lsTurnHint', 'sumAria', 'f2PageTitle', 'f2GetReady', 'f2Units',
        'f2UnitWord'}
SKIP_PREFIX = ('lsAria', 'f2Aria')


def speaker(key):
    return 'popo' if key in POPO else 'narrator' if key.startswith(NARRATOR) else 'swiftee'


# ---------- the spoken form ----------
UNITS = ('शून्य एक दो तीन चार पाँच छह सात आठ नौ दस ग्यारह बारह तेरह चौदह पंद्रह सोलह सत्रह अठारह उन्नीस बीस '
         'इक्कीस बाईस तेईस चौबीस पच्चीस छब्बीस सत्ताईस अट्ठाईस उनतीस तीस इकतीस बत्तीस तैंतीस चौंतीस पैंतीस छत्तीस '
         'सैंतीस अड़तीस उनतालीस चालीस इकतालीस बयालीस तैंतालीस चवालीस पैंतालीस छियालीस सैंतालीस अड़तालीस उनचास पचास '
         'इक्यावन बावन तिरपन चौवन पचपन छप्पन सत्तावन अट्ठावन उनसठ साठ इकसठ बासठ तिरसठ चौंसठ पैंसठ छियासठ सड़सठ '
         'अड़सठ उनहत्तर सत्तर इकहत्तर बहत्तर तिहत्तर चौहत्तर पचहत्तर छिहत्तर सतहत्तर अठहत्तर उन्यासी अस्सी इक्यासी '
         'बयासी तिरासी चौरासी पचासी छियासी सत्तासी अट्ठासी नवासी नब्बे इक्यानवे बानवे तिरानवे चौरानवे पंचानवे '
         'छियानवे सत्तानवे अट्ठानवे निन्यानवे').split()
assert len(UNITS) == 100
LETTER = {'A': 'ए', 'B': 'बी', 'C': 'सी', 'D': 'डी'}


def num(n):
    n = int(n)
    if n < 100:
        return UNITS[n]
    h, r = divmod(n, 100)
    return f'{UNITS[h]} सौ' + (f' {UNITS[r]}' if r else '')


def dec(s):  # "5.1" -> "पाँच दशमलव एक"
    if '.' in s:
        a, b = s.split('.')
        return f'{num(a)} दशमलव ' + ' '.join(UNITS[int(c)] for c in b)
    return num(s)


def spoken(text):
    s = text.replace('*', '').replace('\n', ' ')
    s = re.sub(r'^…\s*', '', s).replace('…', '...')
    s = re.sub(r'∠\s*([ABCD])', lambda m: 'कोण ' + LETTER[m.group(1)], s)
    s = re.sub(r'(\d+(?:\.\d+)?)\s*°', lambda m: dec(m.group(1)) + ' डिग्री', s)
    s = re.sub(r'(\d+(?:\.\d+)?)\s*cm\b', lambda m: dec(m.group(1)) + ' सेंटीमीटर', s)
    s = re.sub(r'\b([ABCD]{2,4})\b', lambda m: ' '.join(LETTER[c] for c in m.group(1)), s)
    s = re.sub(r'(?<![A-Za-z])([ABCD])(?![A-Za-z])', lambda m: LETTER[m.group(1)], s)
    s = re.sub(r'\s*=\s*', ' बराबर ', s)
    s = re.sub(r'\s*\+\s*', ' जमा ', s)
    s = re.sub(r'\d+(?:\.\d+)?', lambda m: dec(m.group(0)), s)
    s = re.sub(r'\s+', ' ', s).strip()
    bad = re.findall(r'[A-Za-z0-9∠°=+*{}…]', s)
    assert not bad, (text, s, bad)
    return s


def letter_times(text, said):
    """Where each corner letter of the line (A-D, in order) is said, as a share of the spoken line: the lesson flies
    each letter in as the voice says it (screen 3, "ABCD")."""
    out, at = [], 0
    for k in re.findall(r'(?<![A-Za-z])[ABCD]+(?![A-Za-z])', text.replace('∠', ' ')):
        for c in k:
            m = re.compile(r'(?<!\S)' + LETTER[c] + r'(?=[\s,.!?।]|$)').search(said, at)
            if not m:
                return None
            out.append(round(m.start() / max(1, len(said)), 3))
            at = m.end()
    return out or None


# ---------- the script: one entry per clip ----------
def script(hi):
    F1_SHAPES = [('triangle', 'shapeTriangle', 3), ('pentagon', 'shapePentagon', 5), ('hexagon', 'shapeHexagon', 6),
                 ('quadrilateral', 'shapeQuadrilateral', 4)]
    out = []

    def add(key, text, variant=None, said=None, **extra):
        e = {'file': key + (f'.{variant}' if variant else '') + '.mp3', 'key': key}
        if variant:
            e['variant'] = variant
        e.update(extra)
        e.update({'speaker': speaker(key), 'text': text, 'spoken': said or spoken(text)})
        lt = letter_times(text, e['spoken'])
        if lt:
            e['letters'] = lt
        out.append(e)

    for key, line in hi.items():
        if key in SKIP or key.startswith(SKIP_PREFIX):
            continue
        if key in ('f1Catch', 'f1CatchAll'):  # T fills {shape} with the shape's name (fishing-1 game.js)
            for name, sk, _ in F1_SHAPES:
                add(key, line.replace('{shape}', hi[sk]), name)
        elif key == 'f1WrongSides':
            for name, sk, n in F1_SHAPES:
                add(key, line.replace('{shape}', hi[sk]).replace('{sides}', str(n)), name)
        elif key == 'lsDragAKeep':  # AD longer than BC (5 cm) shows 5.1-7.6 cm (the drag limits in config.js)
            for t in range(51, 77):
                v = f'{t // 10}' if t % 10 == 0 else f'{t // 10}.{t % 10}'
                add(key, line.replace('{len}', v + ' cm').replace('{target}', '5 cm'), v.replace('.', '_'))
        elif key == 'lsDragABack':  # shorter: only 4.9 cm is possible (the height is √24 cm)
            add(key, line.replace('{len}', '4.9 cm').replace('{target}', '5 cm'), '4_9')
        elif key == 'lsDrag90':  # two clips: the corner, then the angle (39-85° and 95-141°, as in English)
            head, tail = line.split('{deg}')
            for k in 'ABCD':
                h = head.replace('{k}', k).strip()
                add(key, h, k, part='lead', next_text=spoken('60' + tail))
            for d in list(range(39, 86)) + list(range(95, 142)):
                add(key, f'{d}{tail}'.strip(), str(d), part='tail', previous_text='अभी कोण ए')
        elif key == 'lsWatch90':
            for k in 'ABCD':
                add(key, line.replace('{k}', k), k)
        else:
            assert '{' not in line, (key, line)
            add(key, line)
    return out


# ---------- MP3 length (no ffprobe needed) ----------
def mp3_seconds(path):
    data = open(path, 'rb').read()
    i = 10 + ((data[6] << 21) | (data[7] << 14) | (data[8] << 7) | data[9]) if data[:3] == b'ID3' else 0
    rates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
    srs = [44100, 48000, 32000]
    frames, sr = 0, 44100
    while i + 4 <= len(data):
        if data[i] != 0xFF or (data[i + 1] & 0xE0) != 0xE0:
            i += 1
            continue
        br, si, pad = rates[(data[i + 2] >> 4) & 15] if ((data[i + 2] >> 4) & 15) < 15 else 0, (data[i + 2] >> 2) & 3, (data[i + 2] >> 1) & 1
        if not br or si == 3:
            i += 1
            continue
        sr = srs[si]
        frames += 1
        i += 144000 * br // sr + pad
    return round(frames * 1152 / sr, 3)


# ---------- ElevenLabs ----------
def record(e, key):
    v = VOICES[e['speaker']]
    body = {'text': e['spoken'], 'model_id': MODEL, 'voice_settings': v['settings'], 'seed': SEED}
    for k in ('previous_text', 'next_text'):
        if e.get(k):
            body[k] = e[k]
    url = f'https://api.elevenlabs.io/v1/text-to-speech/{v["voice_id"]}?output_format={FORMAT}'
    for attempt in range(6):
        req = urllib.request.Request(url, data=json.dumps(body).encode(), method='POST', headers={
            'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                audio, cost = r.read(), r.headers.get('character-cost')
            break
        except urllib.error.HTTPError as err:
            if err.code in (429, 500, 502, 503, 504) and attempt < 5:
                time.sleep(2 * (attempt + 1))
                continue
            raise SystemExit(f'{e["file"]}: HTTP {err.code} {err.read().decode(errors="replace")[:300]}')
    with open(os.path.join(OUT, e['file']), 'wb') as f:
        f.write(audio)
    print(f'  {e["file"]:30s} {e["speaker"]:8s} credits={cost}', flush=True)
    return int(cost or 0)


def main():
    args = sys.argv[1:]
    dry, redo = '--dry' in args, set(a for a in args if not a.startswith('--'))
    with open(os.path.join(ROOT, 'locales', 'locales.json'), encoding='utf-8') as f:
        hi = json.load(f)[LANG]
    old = {}
    if os.path.exists(MANIFEST):
        with open(MANIFEST, encoding='utf-8') as f:
            old = {c['file']: c for c in json.load(f)['clips']}
    clips = script(hi)
    voice = lambda c: VOICES[c['speaker']]['voice_id']
    todo = [c for c in clips if c['file'][:-4] in redo or not os.path.exists(os.path.join(OUT, c['file']))
            or c['file'] not in old or old[c['file']]['spoken'] != c['spoken']
            or old[c['file']].get('voice') != VOICES[c['speaker']]['name']]
    print(f'{len(clips)} clips; {len(todo)} to record ({sum(len(c["spoken"]) for c in todo)} characters)')
    if dry:
        for c in todo:
            print(f'  {c["file"]:30s} {c["speaker"]:8s} {c["spoken"]}')
        return
    if todo:
        key = os.environ.get('ELEVENLABS_API_KEY', '').strip()
        if not key:
            raise SystemExit('set ELEVENLABS_API_KEY')
        os.makedirs(OUT, exist_ok=True)
        with ThreadPoolExecutor(max_workers=3) as pool:
            print('credits used:', sum(pool.map(lambda c: record(c, key), todo)))
    for c in clips:
        c['voice'] = VOICES[c['speaker']]['name']
        c['seconds'] = mp3_seconds(os.path.join(OUT, c['file']))
    keep = {k: v for k, v in VOICES.items() if k != 'narrator'}
    man = {'language': LANG, 'source': 'locales/locales.json -> ' + LANG, 'tool': 'tools/voice-elevenlabs.py',
           'model': MODEL, 'format': FORMAT, 'seed': SEED, 'voices': dict(keep, narrator='same voice as swiftee'),
           'clips': clips}
    with open(MANIFEST, 'w', encoding='utf-8') as f:
        json.dump(man, f, ensure_ascii=False, indent=1)
    gone = sorted(set(os.listdir(OUT)) - {c['file'] for c in clips} - {'manifest.json'})
    print(f'wrote assets/VO-HI/manifest.json ({len(clips)} clips, {sum(c["seconds"] for c in clips) / 60:.1f} min)'
          + (f'; not in the script any more: {", ".join(gone)}' if gone else ''))


if __name__ == '__main__':
    main()
