#!/usr/bin/env python3
"""Records narrator lines that fishing 1 says in Fishing Frenzy but the original game never did, and adds them to
parts/fishing-1/src/voice-data.js (keyed as src/audio.js voiceKey does). The journey's warm-up asks for one fish, so
its instruction reads "Catch the triangle fish!" rather than "Catch all the ...".

Same recipe as the original repository's tools/build-voice.py --engine kokoro: Kokoro-82M, the narrator's voice
hf_alpha (lang 'b'), speed 0.92, no pitch change, normalised to 0.9, 64 kbps mono MP3. Run with the Python that has
kokoro, soundfile and lameenc (the original's venv): ~/.cache/popo-voice311/bin/python tools/record-narrator-lines.py"""
import array, base64, pathlib, re, sys

LINES = [('narrator', 'Catch the *triangle* fish!'), ('narrator', 'Catch the *pentagon* fish!'),
         ('narrator', 'Catch the *hexagon* fish!'), ('narrator', 'Catch the *quadrilateral* fish!')]
KOKORO = {'narrator': dict(voice='hf_alpha', lang='b', speed=0.92, pitch=1.0)}
DATA = pathlib.Path(__file__).resolve().parents[1] / 'parts/fishing-1/src/voice-data.js'

def voice_key(who, text):  # as src/audio.js voiceKey
    t = text.replace('*', '').replace('…', '...').replace('’', "'")
    return f"{who}:{' '.join(t.split())}".lower()

def record(who, text):
    import numpy as np
    from kokoro import KPipeline
    k = KOKORO[who]
    pipe = KPipeline(lang_code=k['lang'], repo_id='hexgrad/Kokoro-82M')
    parts = [np.asarray(r.audio, dtype=np.float32) for r in pipe(text.replace('*', ''), voice=k['voice'], speed=k['speed']) if r.audio is not None]
    audio = np.concatenate(parts)
    if k['pitch'] != 1.0:
        n = int(len(audio) / k['pitch']); audio = np.interp(np.linspace(0, len(audio) - 1, n), np.arange(len(audio)), audio)
    audio = audio / max(1e-6, float(np.abs(audio).max())) * 0.9
    return 24000, array.array('h', (audio * 32767).astype('<i2').tobytes())

def mp3(rate, samples):
    import lameenc
    enc = lameenc.Encoder(); enc.set_bit_rate(64); enc.set_in_sample_rate(rate); enc.set_channels(1); enc.set_quality(2)
    return bytes(enc.encode(samples.tobytes()) + enc.flush())

src = DATA.read_text()
added = []
for who, text in LINES:
    key = voice_key(who, text)
    if f'"{key}"' in src:
        print('have', key); continue
    rate, samples = record(who, text)
    url = 'data:audio/mpeg;base64,' + base64.b64encode(mp3(rate, samples)).decode()
    entry = f'  "{key}": "{url}",\n'
    src = re.sub(r'\n\};\s*$', '\n' + entry + '};\n', src)
    added.append((key, len(samples) / rate))
DATA.write_text(src)
for key, secs in added: print(f'recorded {key} ({secs:.2f} s)')
