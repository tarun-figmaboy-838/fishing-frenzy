#!/usr/bin/env python3
"""The English voice-over gathered into assets/VO-EN/, one clip per spoken line by key, like VO-HI/, VO-MR/, VO-GU/.

Every clip that has an English recording is that recording, copied byte for byte:
  - the lesson's lines: parts/lesson/assets/vo/voNNN.ogg (Ogg Opus), found by the line's words in
    parts/lesson/js/vo-lines.js -> <key>.ogg
  - the fishing games' lines: the MP3s inside parts/fishing-1/src/voice-data.js and parts/fishing-2/src/voice-data.js,
    found by "<who>:<line>" (voiceKey in src/audio.js) -> <key>.mp3

The lines with no English recording can be recorded (--record) with ElevenLabs in the same voice: an Instant Voice
Clone of the English Swiftee/narrator voice (one voice, README: "Two voices only"), made from the studio's own MP3s
(tools/swiftee-voice/studio/swNN.mp3: the "Ai Wala Human By Aamir" studio, Female Teacher (Standard), Gemini's Kore
with a North Indian accent; parts/lesson/docs/VOICEOVER.md). The clone is made on the first --record and found by its
name after that. Each line is said in the lesson's spoken form: numbers and symbols as English words, corner names
spaced ("AD is 4.9 cm." -> "A D is four point nine centimetres."). None of these lines is Popo's.

The spoken lines and their keys are tools/voice-elevenlabs.py's (the same 324 as the other languages), read from
locales/locales.json -> "en". A line with neither clip is listed in manifest.json "missing". The folder is not in
locales/voices.js: English plays its recordings from where they are, as before.

    python3 tools/collect-vo-en.py                     rewrite assets/VO-EN/ (clips and manifest.json); the clips
                                                       recorded with --record are kept while their words are the same
    python3 tools/collect-vo-en.py --record --dry      only list what --record would record, and how (no key, no files)
    ELEVENLABS_API_KEY=... python3 tools/collect-vo-en.py --record
                                                       also record every line that has no clip
    ELEVENLABS_API_KEY=... python3 tools/collect-vo-en.py --record --redo lsHi f1RowsOn
                                                       record these again (and anything with no clip)
"""
import base64
import importlib.util
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'VO-EN')
LESSON_VO = os.path.join(ROOT, 'parts', 'lesson', 'assets', 'vo')
STUDIO = os.path.join(ROOT, 'tools', 'swiftee-voice', 'studio')

# ---------- the voice for --record ----------
API = 'https://api.elevenlabs.io'
CLONE = {'name': 'Swiftee English - studio voice clone',
         'description': 'Instant Voice Clone of the English Swiftee/narrator voice: Ai Wala Human By Aamir studio, '
                        'Female Teacher (Standard) (Gemini Kore, North Indian accent). From fishing-frenzy '
                        'tools/swiftee-voice/studio/*.mp3.'}
SAMPLES = 25  # the longest studio clips (an Instant Voice Clone takes up to 25; these are about 80 s)
MODEL = 'eleven_multilingual_v2'  # keeps a clone's accent best (and Hindi's model)
SETTINGS = {'stability': 0.5, 'similarity_boost': 0.85, 'style': 0.0, 'use_speaker_boost': True, 'speed': 1.0}


def load_voice_tool():
    spec = importlib.util.spec_from_file_location('voice_elevenlabs', os.path.join(ROOT, 'tools', 'voice-elevenlabs.py'))
    ve = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(ve)
    return ve


def clips(ve):
    """The spoken lines, by key and variant, with their English words and who says them (voice-elevenlabs.py)."""
    spoken = ve.spoken
    ve.spoken = lambda text, L: text  # the words as written (its spoken form is for the Indian languages)
    try:
        L = dict(ve.LANGS['hi'])  # only its voices are read (which speaker is which); the words are the English table's
        L['voices'] = dict(L['voices'], narrator=L['voices']['swiftee'])
        with open(os.path.join(ROOT, 'locales', 'locales.json'), encoding='utf-8') as f:
            return ve.script(json.load(f)['en'], L)
    finally:
        ve.spoken = spoken


# ---------- the spoken form, as the lesson's (parts/lesson/docs/VOICEOVER.md) ----------
UNITS = ('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen '
         'seventeen eighteen nineteen').split()
TENS = [None, None, 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']


def en_num(n):  # 180 -> "one hundred and eighty", 39 -> "thirty-nine"
    n = int(n)
    if n < 20:
        return UNITS[n]
    if n < 100:
        t, u = divmod(n, 10)
        return TENS[t] + (f'-{UNITS[u]}' if u else '')
    h, r = divmod(n, 100)
    return f'{UNITS[h]} hundred' + (f' and {en_num(r)}' if r else '')


def en_dec(s):  # "4.9" -> "four point nine"
    a, _, b = s.partition('.')
    return en_num(a) + (' point ' + ' '.join(UNITS[int(c)] for c in b) if b else '')


def en_spoken(text):
    s = text.replace('*', '').replace('\n', ' ').replace('…', '...')
    s = re.sub(r'∠\s*([ABCD])', r'angle \1', s)
    s = re.sub(r'(\d+(?:\.\d+)?)\s*°', lambda m: en_dec(m.group(1)) + ' degrees', s)
    s = re.sub(r'(\d+(?:\.\d+)?)\s*cm\b', lambda m: en_dec(m.group(1)) + ' centimetres', s)
    s = re.sub(r'\b([ABCD]{2,4})\b', lambda m: ' '.join(m.group(1)), s)  # AD -> "A D"
    s = re.sub(r'\s*=\s*', ' equals ', s)
    s = re.sub(r'\s*\+\s*', ' plus ', s)
    s = re.sub(r'\d+(?:\.\d+)?', lambda m: en_dec(m.group(0)), s)
    s = re.sub(r'\s+', ' ', s).strip()
    if s[-1] not in '.!?':  # a label ("Leg", "Angle sum") ends with a full stop, or the voice can run on
        s += '.'
    s = s[0].upper() + s[1:]
    assert not re.search(r'[0-9∠°=+*{}…]', s), (text, s)
    return s


# ---------- the English recordings ----------
def js_string(s):
    return json.loads('"' + s + '"')


def lesson_lines():
    """line (spaces collapsed) -> [voNNN, seconds], from parts/lesson/js/vo-lines.js"""
    with open(os.path.join(ROOT, 'parts', 'lesson', 'js', 'vo-lines.js'), encoding='utf-8') as f:
        src = f.read()
    return {js_string(t): [vo, float(sec)]
            for t, vo, sec in re.findall(r'^\s*"((?:[^"\\]|\\.)*)":\s*\["(vo\d+)",\s*([\d.]+)\]', src, re.M)}


def fishing_lines():
    """"who:line" (voiceKey) -> (mp3 bytes, which game), from both fishing games' voice-data.js"""
    found = {}
    for part in ('fishing-1', 'fishing-2'):
        with open(os.path.join(ROOT, 'parts', part, 'src', 'voice-data.js'), encoding='utf-8') as f:
            src = f.read()
        for k, b64 in re.findall(r'^\s*"((?:[^"\\]|\\.)*)":\s*"data:audio/mpeg;base64,([^"]+)"', src, re.M):
            found.setdefault(js_string(k), (base64.b64decode(b64), part))
    return found


def voice_key(who, text):  # as parts/fishing-*/src/audio.js
    t = text.replace('*', '').replace('…', '...').replace('’', "'")
    return (who + ':' + ' '.join(t.split())).lower()


def seconds(path):
    try:
        out = subprocess.run(['afinfo', path], capture_output=True, text=True).stdout  # macOS
        m = re.search(r'estimated duration:\s*([\d.]+)', out)
        return round(float(m.group(1)), 3) if m else None
    except OSError:
        return None


SAME_VOICE = {'swiftee': 'narrator', 'narrator': 'swiftee'}  # one voice (README: "Two voices only")


# ---------- ElevenLabs ----------
def api(path, key, data=None, headers=None):
    req = urllib.request.Request(API + path, data=data, method='POST' if data else 'GET',
                                 headers={'xi-api-key': key, 'Accept': 'application/json', **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return json.load(r)
    except urllib.error.HTTPError as err:
        raise SystemExit(f'ElevenLabs {path}: HTTP {err.code} {err.read().decode(errors="replace")[:400]}')


def samples():
    """The studio's MP3s of the English voice, longest first."""
    files = [os.path.join(STUDIO, n) for n in sorted(os.listdir(STUDIO)) if n.endswith('.mp3')]
    return sorted(files, key=lambda p: -(seconds(p) or 0))[:SAMPLES]


def clone_voice(key):
    """The clone's voice id (and whether it was made now): found by its name, or made from the studio's MP3s."""
    for v in api('/v1/voices', key)['voices']:
        if v.get('name') == CLONE['name']:
            return v['voice_id'], False
    b = uuid.uuid4().hex
    body = []
    for k, v in (('name', CLONE['name']), ('description', CLONE['description']), ('remove_background_noise', 'false')):
        body.append(f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    for p in samples():
        with open(p, 'rb') as f:
            body.append(f'--{b}\r\nContent-Disposition: form-data; name="files"; filename="{os.path.basename(p)}"\r\n'
                        f'Content-Type: audio/mpeg\r\n\r\n'.encode() + f.read() + b'\r\n')
    body.append(f'--{b}--\r\n'.encode())
    r = api('/v1/voices/add', key, b''.join(body), {'Content-Type': f'multipart/form-data; boundary={b}'})
    return r['voice_id'], True


def record(ve, todo, dry):
    """Record the lines in todo (entries with "wanted" and "spoken") into OUT; fills in each one that is recorded."""
    print(f'--record: {len(todo)} lines, {sum(len(e["spoken"]) for e in todo)} characters, '
          f'voice "{CLONE["name"]}" ({MODEL})')
    if dry:
        made = samples()
        print(f'  the clone, if it isn\'t in the account yet, is made from {len(made)} studio clips '
              f'({sum(seconds(p) or 0 for p in made):.0f} s): {", ".join(os.path.basename(p)[:-4] for p in made)}')
        for e in todo:
            print(f'  {e["wanted"] + ".mp3":32} {e["speaker"]:9} {e["spoken"]}')
        return None
    key = os.environ.get('ELEVENLABS_API_KEY', '').strip()
    if not key:
        raise SystemExit('set ELEVENLABS_API_KEY')
    voice_id, made = clone_voice(key)
    print(f'  voice: {CLONE["name"]} ({voice_id}, {"made now from the studio clips" if made else "already in the account"})')
    v = {'name': CLONE['name'], 'voice_id': voice_id, 'settings': SETTINGS}
    L = {'model': MODEL, 'stitch': False, 'voices': {'swiftee': v, 'narrator': v}}
    failed, t0 = [], time.time()

    def job(e):
        c = {'file': e['wanted'] + '.mp3', 'speaker': e['speaker'], 'spoken': e['spoken']}
        try:
            ve.record(c, key, L, OUT)
        except (Exception, SystemExit) as err:  # the others carry on; this one is recorded on the next run
            failed.append(f'{c["file"]}: {err}')
            return
        e.update(file=c['file'], source=f'ElevenLabs {MODEL}, voice "{CLONE["name"]}" (tools/collect-vo-en.py --record)',
                 voice=CLONE['name'], seconds=seconds(os.path.join(OUT, c['file'])))

    with ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(job, todo))
    print(f'  recorded {len(todo) - len(failed)} of {len(todo)} ({time.time() - t0:.0f} s)')
    if failed:
        print('  not recorded (run again to retry):\n    ' + '\n    '.join(failed))
    return {'service': 'ElevenLabs', 'model': MODEL, 'format': ve.FORMAT, 'seed': ve.SEED,
            'voice': dict(v, made_from=f'the {SAMPLES} longest of tools/swiftee-voice/studio/*.mp3')}


def main():
    args = sys.argv[1:]
    rec, dry = '--record' in args, '--dry' in args
    redo = set()
    if '--redo' in args:
        redo = {a for a in args[args.index('--redo') + 1:] if not a.startswith('--')}
        if not rec:
            raise SystemExit('--redo records: add --record')
    ve = load_voice_tool()
    lesson, fishing = lesson_lines(), fishing_lines()
    manifest = os.path.join(OUT, 'manifest.json')
    old, recorded_with = {}, None
    if os.path.exists(manifest):
        with open(manifest, encoding='utf-8') as f:
            m = json.load(f)
        old = {c['file']: c for c in m['clips'] if c.get('voice')}  # the clips recorded with --record
        recorded_with = m.get('recorded_with')
    script = clips(ve)
    unknown = redo - {c['file'][:-4] for c in script}
    if unknown:
        raise SystemExit('no such clip: ' + ', '.join(sorted(unknown)))
    if not dry:
        os.makedirs(OUT, exist_ok=True)
    rows = []  # one per line, in the script's order; those with no "file" have no clip yet
    for c in script:
        key = c['file'][:-4]
        who, text = c['speaker'], c['text']
        entry = {'key': c['key'], **({'variant': c['variant']} if 'variant' in c else {}), 'speaker': who, 'text': text}
        line = ' '.join(text.split())
        fk = next((k for k in (voice_key(who, text), voice_key(SAME_VOICE.get(who, who), text)) if k in fishing), None)
        if fk:
            data, part = fishing[fk]
            name = key + '.mp3'
            if not dry:
                with open(os.path.join(OUT, name), 'wb') as f:
                    f.write(data)
            entry.update(file=name, source=f'parts/{part}/src/voice-data.js "{fk}"',
                         seconds=None if dry else seconds(os.path.join(OUT, name)))
        elif line in lesson and os.path.exists(os.path.join(LESSON_VO, lesson[line][0] + '.ogg')):
            vo, sec = lesson[line]
            name = key + '.ogg'
            if not dry:
                with open(os.path.join(LESSON_VO, vo + '.ogg'), 'rb') as src, open(os.path.join(OUT, name), 'wb') as dst:
                    dst.write(src.read())
            entry.update(file=name, source=f'parts/lesson/assets/vo/{vo}.ogg', seconds=sec)
        else:
            o = old.get(key + '.mp3')
            said = en_spoken(text)
            if o and o['text'] == text and o.get('spoken') == said and key not in redo \
                    and os.path.exists(os.path.join(OUT, o['file'])):
                rows.append(o)  # recorded before, from the same words
                continue
            entry.update(wanted=key, spoken=said)
        rows.append(entry)
    todo = [e for e in rows if 'file' not in e]
    if rec and todo:
        made = record(ve, todo, dry)
        recorded_with = made or recorded_with
    if dry:
        if not rec:
            print(f'en: {len(rows) - len(todo)} lines have a clip, {len(todo)} have none (--dry writes nothing)')
        return
    done = [e for e in rows if 'file' in e]
    missing = [e for e in rows if 'file' not in e]
    for name in os.listdir(OUT):  # no clip left from a line that has changed, or that has a recording now
        if name.endswith(('.mp3', '.ogg')) and name not in {e['file'] for e in done}:
            os.remove(os.path.join(OUT, name))
    man = {'language': 'en', 'source': 'the existing English recordings, and the lines that had none recorded in a '
                                       'clone of the same voice (see each clip\'s "source")',
           'tool': 'tools/collect-vo-en.py', 'clips': done, 'missing': missing}
    if any(e.get('voice') for e in done) and recorded_with:
        man['recorded_with'] = recorded_with
    with open(manifest, 'w', encoding='utf-8') as f:
        json.dump(man, f, ensure_ascii=False, indent=1)
        f.write('\n')
    copied = [e for e in done if not e.get('voice')]
    print(f'en: {len(done)} clips in assets/VO-EN/: {len(copied)} existing recordings '
          f'({sum(e["file"].endswith(".ogg") for e in copied)} .ogg, {sum(e["file"].endswith(".mp3") for e in copied)} '
          f'.mp3), {len(done) - len(copied)} recorded with --record; {len(missing)} lines have no clip'
          + (':' if missing else ''))
    for m in missing:
        print(f'  {m["wanted"]:28} {m["speaker"]:9} {m["text"]}')
    if missing and not rec:
        print('record them in the same voice: ELEVENLABS_API_KEY=... python3 tools/collect-vo-en.py --record')


if __name__ == '__main__':
    main()
