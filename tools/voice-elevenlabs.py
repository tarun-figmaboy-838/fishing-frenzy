#!/usr/bin/env python3
"""A language's own voice-over (assets/VO-<LANG>/), made with ElevenLabs from locales/locales.json -> "<lang>".
Hindi (hi, assets/VO-HI/) and Marathi (mr, assets/VO-MR/) so far; --lang picks one (Hindi when left out).

    ELEVENLABS_API_KEY=... python3 tools/voice-elevenlabs.py --lang mr     record every line that has no clip yet, or
                                                                           whose words changed; write the manifest
    python3 tools/voice-elevenlabs.py --lang mr --dry                      only list what would be recorded (no key)
    ELEVENLABS_API_KEY=... python3 tools/voice-elevenlabs.py --lang mr --redo lsHi f1Catch.triangle
                                                                           record these again (and anything new)
    ELEVENLABS_API_KEY=... python3 tools/voice-elevenlabs.py --lang mr --only lsHi f1Woah
                                                                           record only these (a test; no manifest)

Then run python3 tools/build-locales.py: it writes locales/voices.js, the index the games find each clip by.

One clip per spoken line, named by its key (lsHi.mp3). A line whose words vary has a clip per variant
(f1Catch.triangle.mp3, lsDragAKeep.5_1.mp3); screen 33's "∠A is 84° now. ..." is two clips played back to back
(lsDrag90.A + lsDrag90.84), as in English. The voice reads each line's spoken form: no *stress* marks or line
breaks, and digits, corner letters and symbols written out as the language's words (Hindi: 180° -> एक सौ अस्सी
डिग्री, ∠A -> कोण ए, = -> बराबर, + -> जमा; Marathi: 180° -> एकशे ऐंशी अंश, ∠A -> कोन ए, = -> बरोबर, + -> अधिक,
5.1 -> पाच पूर्णांक एक).

Voices: Swiftee and the narrator share one, as in English (README: "Two voices only"); Popo has his own. A little
slower and steadier than the voices' defaults, for grade 6-7. Marathi is recorded with eleven_v4:
eleven_multilingual_v2 (Hindi's model) doesn't speak Marathi.
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
FORMAT, SEED = 'mp3_44100_128', 7

# ---------- each language: its voices, model and the words its voice says for the mathematics ----------
HI_UNITS = ('शून्य एक दो तीन चार पाँच छह सात आठ नौ दस ग्यारह बारह तेरह चौदह पंद्रह सोलह सत्रह अठारह उन्नीस बीस '
            'इक्कीस बाईस तेईस चौबीस पच्चीस छब्बीस सत्ताईस अट्ठाईस उनतीस तीस इकतीस बत्तीस तैंतीस चौंतीस पैंतीस छत्तीस '
            'सैंतीस अड़तीस उनतालीस चालीस इकतालीस बयालीस तैंतालीस चवालीस पैंतालीस छियालीस सैंतालीस अड़तालीस उनचास पचास '
            'इक्यावन बावन तिरपन चौवन पचपन छप्पन सत्तावन अट्ठावन उनसठ साठ इकसठ बासठ तिरसठ चौंसठ पैंसठ छियासठ सड़सठ '
            'अड़सठ उनहत्तर सत्तर इकहत्तर बहत्तर तिहत्तर चौहत्तर पचहत्तर छिहत्तर सतहत्तर अठहत्तर उन्यासी अस्सी इक्यासी '
            'बयासी तिरासी चौरासी पचासी छियासी सत्तासी अट्ठासी नवासी नब्बे इक्यानवे बानवे तिरानवे चौरानवे पंचानवे '
            'छियानवे सत्तानवे अट्ठानवे निन्यानवे').split()
MR_UNITS = ('शून्य एक दोन तीन चार पाच सहा सात आठ नऊ दहा अकरा बारा तेरा चौदा पंधरा सोळा सतरा अठरा एकोणीस वीस '
            'एकवीस बावीस तेवीस चोवीस पंचवीस सव्वीस सत्तावीस अठ्ठावीस एकोणतीस तीस एकतीस बत्तीस तेहेतीस चौतीस पस्तीस '
            'छत्तीस सदतीस अडतीस एकोणचाळीस चाळीस एक्केचाळीस बेचाळीस त्रेचाळीस चव्वेचाळीस पंचेचाळीस सेहेचाळीस '
            'सत्तेचाळीस अठ्ठेचाळीस एकोणपन्नास पन्नास एक्कावन्न बावन्न त्रेपन्न चोपन्न पंचावन्न छप्पन्न सत्तावन्न '
            'अठ्ठावन्न एकोणसाठ साठ एकसष्ट बासष्ट त्रेसष्ट चौसष्ट पासष्ट सहासष्ट सदुसष्ट अडुसष्ट एकोणसत्तर सत्तर '
            'एकाहत्तर बाहत्तर त्र्याहत्तर चौऱ्याहत्तर पंच्याहत्तर शहात्तर सत्याहत्तर अठ्ठ्याहत्तर एकोणऐंशी ऐंशी '
            'एक्याऐंशी ब्याऐंशी त्र्याऐंशी चौऱ्याऐंशी पंच्याऐंशी शहाऐंशी सत्त्याऐंशी अठ्ठ्याऐंशी एकोणनव्वद नव्वद '
            'एक्याण्णव ब्याण्णव त्र्याण्णव चौऱ्याण्णव पंच्याण्णव शहाण्णव सत्त्याण्णव अठ्ठ्याण्णव नव्याण्णव').split()
assert len(HI_UNITS) == 100 and len(MR_UNITS) == 100
MR_HUNDREDS = [None, 'एकशे', 'दोनशे', 'तीनशे', 'चारशे', 'पाचशे', 'सहाशे', 'सातशे', 'आठशे', 'नऊशे']

LANGS = {
    'hi': {
        'model': 'eleven_multilingual_v2', 'stitch': True,  # previous_text / next_text join screen 33's two clips
        'voices': {
            'swiftee': {'name': 'Anjali – Friendly EdTech Teacher', 'voice_id': 'Kfn3fYy8XcPyUvbTxn1H',
                        'settings': {'stability': 0.55, 'similarity_boost': 0.5, 'style': 0.0,
                                     'use_speaker_boost': True, 'speed': 0.95}},
            'popo': {'name': 'Amit – Kids Cartoon Character', 'voice_id': 'NbvR1eY6Q8ivACdEO8PV',
                     'settings': {'stability': 0.45, 'similarity_boost': 0.75, 'style': 0.0,
                                  'use_speaker_boost': True, 'speed': 0.95}},
        },
        'units': HI_UNITS, 'hundreds': lambda h, r: f'{HI_UNITS[h]} सौ',
        'letters': {'A': 'ए', 'B': 'बी', 'C': 'सी', 'D': 'डी'},
        'angle': 'कोण', 'degree': 'डिग्री', 'cm': 'सेंटीमीटर', 'point': 'दशमलव', 'equals': 'बराबर', 'plus': 'जमा',
    },
    'mr': {
        # the only full-quality models that speak Marathi are eleven_v3 and eleven_v4 (GET /v1/models); v4 is newer
        'model': 'eleven_v4', 'stitch': True,
        'voices': {  # both from the ElevenLabs voice library, Marathi voices, young
            'swiftee': {'name': 'Sayali - Marathi User Onboarding Agent', 'voice_id': 'ObcUVfo3RbQv9i2RBbAe',
                        'settings': {'stability': 0.5, 'similarity_boost': 0.75, 'speed': 0.95}},
            'popo': {'name': 'Vardaan - Expressive Marathi Care Agent', 'voice_id': 'ritE7mWIE55SDe0J11Kk',
                     'settings': {'stability': 0.5, 'similarity_boost': 0.75, 'speed': 0.95}},
        },
        # 100 शंभर, 120 एकशे वीस, 360 तीनशे साठ
        'units': MR_UNITS, 'hundreds': lambda h, r: 'शंभर' if h == 1 and not r else MR_HUNDREDS[h],
        'letters': {'A': 'ए', 'B': 'बी', 'C': 'सी', 'D': 'डी'},
        'angle': 'कोन', 'degree': 'अंश', 'cm': 'सेंटिमीटर', 'point': 'पूर्णांक', 'equals': 'बरोबर', 'plus': 'अधिक',
    },
}

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
def num(n, L):
    n = int(n)
    if n < 100:
        return L['units'][n]
    h, r = divmod(n, 100)
    return L['hundreds'](h, r) + (f' {L["units"][r]}' if r else '')


def dec(s, L):  # "5.1" -> "पाँच दशमलव एक" / "पाच पूर्णांक एक"
    if '.' in s:
        a, b = s.split('.')
        return f'{num(a, L)} {L["point"]} ' + ' '.join(L['units'][int(c)] for c in b)
    return num(s, L)


def spoken(text, L):
    LETTER = L['letters']
    s = text.replace('*', '').replace('\n', ' ')
    s = re.sub(r'^…\s*', '', s).replace('…', '...')
    s = re.sub(r'∠\s*([ABCD])', lambda m: L['angle'] + ' ' + LETTER[m.group(1)], s)
    s = re.sub(r'(\d+(?:\.\d+)?)\s*°', lambda m: dec(m.group(1), L) + ' ' + L['degree'], s)
    s = re.sub(r'(\d+(?:\.\d+)?)\s*cm\b', lambda m: dec(m.group(1), L) + ' ' + L['cm'], s)
    s = re.sub(r'\b([ABCD]{2,4})\b', lambda m: ' '.join(LETTER[c] for c in m.group(1)), s)
    s = re.sub(r'(?<![A-Za-z])([ABCD])(?![A-Za-z])', lambda m: LETTER[m.group(1)], s)
    s = re.sub(r'\s*=\s*', f' {L["equals"]} ', s)
    s = re.sub(r'\s*\+\s*', f' {L["plus"]} ', s)
    s = re.sub(r'\d+(?:\.\d+)?', lambda m: dec(m.group(0), L), s)
    s = re.sub(r'\s+', ' ', s).strip()
    bad = re.findall(r'[A-Za-z0-9∠°=+*{}…]', s)
    assert not bad, (text, s, bad)
    return s


def letter_times(text, said, L):
    """Where each corner letter of the line (A-D, in order) is said, as a share of the spoken line: the lesson flies
    each letter in as the voice says it (screen 3, "ABCD")."""
    out, at = [], 0
    for k in re.findall(r'(?<![A-Za-z])[ABCD]+(?![A-Za-z])', text.replace('∠', ' ')):
        for c in k:
            m = re.compile(r'(?<!\S)' + L['letters'][c] + r'(?=[\s,.!?।]|$)').search(said, at)
            if not m:
                return None
            out.append(round(m.start() / max(1, len(said)), 3))
            at = m.end()
    return out or None


# ---------- the script: one entry per clip ----------
def script(table, L):
    F1_SHAPES = [('triangle', 'shapeTriangle', 3), ('pentagon', 'shapePentagon', 5), ('hexagon', 'shapeHexagon', 6),
                 ('quadrilateral', 'shapeQuadrilateral', 4)]
    out = []

    def add(key, text, variant=None, said=None, **extra):
        e = {'file': key + (f'.{variant}' if variant else '') + '.mp3', 'key': key}
        if variant:
            e['variant'] = variant
        e.update(extra)
        e.update({'speaker': speaker(key), 'text': text, 'spoken': said or spoken(text, L)})
        lt = letter_times(text, e['spoken'], L)
        if lt:
            e['letters'] = lt
        out.append(e)

    for key, line in table.items():
        if key in SKIP or key.startswith(SKIP_PREFIX):
            continue
        if key in ('f1Catch', 'f1CatchAll'):  # T fills {shape} with the shape's name (fishing-1 game.js)
            for name, sk, _ in F1_SHAPES:
                add(key, line.replace('{shape}', table[sk]), name)
        elif key == 'f1WrongSides':
            for name, sk, n in F1_SHAPES:
                add(key, line.replace('{shape}', table[sk]).replace('{sides}', str(n)), name)
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
                add(key, h, k, part='lead', next_text=spoken('60' + tail, L))
            before = spoken(head.replace('{k}', 'A').strip(), L)
            for d in list(range(39, 86)) + list(range(95, 142)):
                add(key, f'{d}{tail}'.strip(), str(d), part='tail', previous_text=before)
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
def record(e, key, L, out):
    v = L['voices'][e['speaker']]
    body = {'text': e['spoken'], 'model_id': L['model'], 'voice_settings': v['settings'], 'seed': SEED}
    if L['stitch']:
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
    with open(os.path.join(out, e['file']), 'wb') as f:
        f.write(audio)
    print(f'  {e["file"]:30s} {e["speaker"]:8s} credits={cost}', flush=True)
    return int(cost or 0)


def main():
    args = sys.argv[1:]
    lang = 'hi'
    if '--lang' in args:
        i = args.index('--lang')
        lang = args[i + 1]
        del args[i:i + 2]
    if lang not in LANGS:
        raise SystemExit(f'no voices for "{lang}" yet: add it to LANGS ({", ".join(LANGS)})')
    L = LANGS[lang]
    voices = dict(L['voices'], narrator=L['voices']['swiftee'])
    L = dict(L, voices=voices)
    out = os.path.join(ROOT, 'assets', 'VO-' + lang.upper())
    manifest = os.path.join(out, 'manifest.json')
    rel = os.path.relpath(manifest, ROOT)
    dry, only = '--dry' in args, '--only' in args
    names = set(a for a in args if not a.startswith('--'))
    with open(os.path.join(ROOT, 'locales', 'locales.json'), encoding='utf-8') as f:
        table = json.load(f)[lang]
    old = {}
    if os.path.exists(manifest):
        with open(manifest, encoding='utf-8') as f:
            old = {c['file']: c for c in json.load(f)['clips']}
    clips = script(table, L)
    path = lambda c: os.path.join(out, c['file'])

    def stale(c):  # no clip yet, or recorded from other words or in another voice
        o = old.get(c['file'])
        return (not os.path.exists(path(c)) or not o or o['spoken'] != c['spoken']
                or o.get('voice') != voices[c['speaker']]['name'])

    if only:
        todo = [c for c in clips if c['file'][:-4] in names]
        unknown = names - {c['file'][:-4] for c in clips}
        if unknown:
            raise SystemExit('no such clip: ' + ', '.join(sorted(unknown)))
    else:
        todo = [c for c in clips if c['file'][:-4] in names or stale(c)]
    print(f'{lang}: {len(clips)} clips; {len(todo)} to record ({sum(len(c["spoken"]) for c in todo)} characters, '
          f'{sum(len(c["spoken"].split()) for c in todo)} words)')
    if dry:
        for c in todo:
            print(f'  {c["file"]:30s} {c["speaker"]:8s} {c["spoken"]}')
        return
    done, failed = {}, []
    if todo:
        key = os.environ.get('ELEVENLABS_API_KEY', '').strip()
        if not key:
            raise SystemExit('set ELEVENLABS_API_KEY')
        os.makedirs(out, exist_ok=True)
        t0 = time.time()

        def job(c):
            try:
                done[c['file']] = record(c, key, L, out)
            except (Exception, SystemExit) as err:  # the others carry on; this one is recorded on the next run
                failed.append(f'{c["file"]}: {err}')

        with ThreadPoolExecutor(max_workers=3) as pool:
            list(pool.map(job, todo))
        print(f'credits used: {sum(done.values())} ({time.time() - t0:.0f} s)')
    # the manifest: every clip that is recorded (so a test or a run that stopped part-way isn't paid for twice);
    # with any missing, it says how many, and tools/build-locales.py leaves the language out until they are all there
    listed = []
    for c in clips:
        if c['file'] in done or (not stale(c) and c['file'] not in {t['file'] for t in todo}):
            listed.append(dict(c, voice=voices[c['speaker']]['name'], seconds=mp3_seconds(path(c))))
        elif c['file'] in old and os.path.exists(path(c)):
            listed.append(old[c['file']])  # recorded from older words: kept, and flagged by build-locales
    keep = {k: v for k, v in L['voices'].items() if k != 'narrator'}
    man = {'language': lang, 'source': 'locales/locales.json -> ' + lang, 'tool': 'tools/voice-elevenlabs.py',
           'model': L['model'], 'format': FORMAT, 'seed': SEED, 'voices': dict(keep, narrator='same voice as swiftee'),
           'clips': listed}
    if len(listed) < len(clips):
        man['missing'] = len(clips) - len(listed)
    with open(manifest, 'w', encoding='utf-8') as f:
        json.dump(man, f, ensure_ascii=False, indent=1)
    if only:
        for c in todo:
            if c['file'] in done:
                print(f'  {c["file"]:30s} {mp3_seconds(path(c)):6.2f} s  {c["spoken"]}')
    gone = sorted(set(os.listdir(out)) - {c['file'] for c in clips} - {'manifest.json'})
    print(f'wrote {rel} ({len(listed)} of {len(clips)} clips, {sum(c["seconds"] for c in listed) / 60:.1f} min)'
          + (f'; not in the script any more: {", ".join(gone)}' if gone else ''))
    if failed:
        raise SystemExit('not recorded (run again to retry):\n  ' + '\n  '.join(failed))


if __name__ == '__main__':
    main()
