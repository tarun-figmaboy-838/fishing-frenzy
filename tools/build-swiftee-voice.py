"""Swiftee speaks in the lesson's voice everywhere: python3 tools/build-swiftee-voice.py

The lesson's voice-over (parts/lesson/docs/VOICEOVER.md) was made in the "Ai Wala Human By Aamir" studio: Language
Hindi (English written in Devanagari, said as English with an Indian accent), voice Female Teacher (Standard) -
Gemini's Kore with a clear North Indian accent - and the lesson's spoken-form rules (symbols and numbers as English
words). Swiftee's lines in the two fishing games were recorded in another voice (Kokoro); they were made again in the
studio exactly as the lesson's were, and live in tools/swiftee-voice/studio/swNN.mp3 with tools/swiftee-voice/
script.json (each line as shown, as spoken, and the Devanagari the voice was given).

This trims each clip's silence (as the fishing games' own voice tool does: keep from 2% of the peak, 40 ms either
side), encodes it as the games' other clips are (MP3, 64 kbps, mono) and puts it in place of her old line in
parts/fishing-1/src/voice-data.js and parts/fishing-2/src/voice-data.js, under the same key (the speaker and the
text on screen, as audio.js voiceKey() makes it). Popo's and the narrator's lines are left as they are.
Needs macOS afconvert (to decode the studio's MP3) and lameenc (pip install lameenc).
"""
import array
import base64
import json
import re
import subprocess
import tempfile
import wave
from pathlib import Path
import lameenc

ROOT = Path(__file__).resolve().parents[1]
VOICE = ROOT / 'tools' / 'swiftee-voice'


def voice_key(who, text):
    """Must match voiceKey() in parts/fishing-*/src/audio.js (and voice_key() in their build-voice.py)."""
    text = text.replace('*', '').replace('…', '...').replace('’', "'")
    return f"{who}:{' '.join(text.split())}".lower()


def pcm(mp3):
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / 'clip.wav'
        subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16', str(mp3), str(wav)], check=True)
        with wave.open(str(wav)) as w:
            return w.getframerate(), array.array('h', w.readframes(w.getnframes()))


def trim(samples, rate, pad=0.04):
    peak = max(1, max(abs(s) for s in samples))
    loud = [i for i, s in enumerate(samples) if abs(s) > peak * 0.02]
    if not loud:
        return samples
    p = int(rate * pad)
    return samples[max(0, loud[0] - p):min(len(samples), loud[-1] + p)]


def mp3(rate, samples):
    enc = lameenc.Encoder()
    enc.set_bit_rate(64)
    enc.set_in_sample_rate(rate)
    enc.set_channels(1)
    enc.set_quality(2)
    return enc.encode(samples.tobytes()) + enc.flush()


def main():
    script = json.loads((VOICE / 'script.json').read_text())
    clips = {}
    for line in script:
        rate, samples = pcm(VOICE / 'studio' / (line['id'] + '.mp3'))
        samples = trim(samples, rate)
        data = mp3(rate, samples)
        clips.setdefault(line['game'], {})[voice_key('swiftee', line['line'])] = 'data:audio/mpeg;base64,' + base64.b64encode(data).decode()
        print(f"  {len(samples) / rate:4.2f}s {len(data) // 1024:3d} KB  {line['game']}: {line['line']}")
    for game, new in clips.items():
        path = ROOT / 'parts' / game / 'src' / 'voice-data.js'
        text = path.read_text()
        for key, url in new.items():
            pattern = re.compile(r'^(  ' + re.escape(json.dumps(key)) + r': )"[^"]*",$', re.M)
            text, n = pattern.subn(lambda m: m.group(1) + json.dumps(url) + ',', text)
            if n != 1:
                raise SystemExit(f'{game}: no line for {key!r} in voice-data.js')
        path.write_text(text)
        print(f'wrote parts/{game}/src/voice-data.js ({len(new)} of Swiftee\'s lines in the lesson\'s voice)')


if __name__ == '__main__':
    main()
