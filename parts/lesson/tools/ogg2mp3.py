"""Write an MP3 twin (same name, .mp3) beside every given .ogg (files or folders, recursive).
Older iPads (iPadOS < 18.4) cannot play Ogg Opus; the MP3 is what they get.
Voice: mono, 24 kHz, 64 kbps CBR (matches the fishing voice clips). Music/sfx: pass --rate 44100 --kbps 96.
Run: python3 tools/ogg2mp3.py [--rate 24000] [--kbps 64] [--force] <paths...>"""
import sys, os, argparse
import numpy as np, soundfile as sf, lameenc
from math import gcd
from scipy.signal import resample_poly

ap = argparse.ArgumentParser()
ap.add_argument('paths', nargs='+')
ap.add_argument('--rate', type=int, default=24000)
ap.add_argument('--kbps', type=int, default=64)
ap.add_argument('--force', action='store_true')
a = ap.parse_args()

def oggs(p):
    if os.path.isdir(p):
        for root, _, files in os.walk(p):
            for f in sorted(files):
                if f.endswith('.ogg'): yield os.path.join(root, f)
    elif p.endswith('.ogg'): yield p

n = tot_in = tot_out = 0
for p in a.paths:
    for src in oggs(p):
        dst = src[:-4] + '.mp3'
        if not a.force and os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
            continue
        x, sr = sf.read(src, dtype='float32', always_2d=True)
        ch = 1 if x.shape[1] == 1 else 2
        rate = min(a.rate, sr)
        if sr != rate:
            g = gcd(sr, rate)
            x = resample_poly(x, rate // g, sr // g, axis=0).astype('float32')
        pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
        enc = lameenc.Encoder()
        enc.set_bit_rate(a.kbps * (1 if ch == 1 else 2) if ch == 2 else a.kbps)
        enc.set_in_sample_rate(rate)
        enc.set_channels(ch)
        enc.set_quality(2)
        data = enc.encode(pcm.tobytes()) + enc.flush()
        with open(dst, 'wb') as f: f.write(data)
        n += 1; tot_in += os.path.getsize(src); tot_out += len(data)
print(f'{n} mp3 written; ogg {tot_in/1e6:.2f} MB -> mp3 {tot_out/1e6:.2f} MB')
