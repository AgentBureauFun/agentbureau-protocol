"""Inspect every file in brand/: container header, alpha histogram, k-means palette snapped to real pixels."""
import os, struct, json, sys
import numpy as np
from PIL import Image
from sklearn.cluster import KMeans

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
bdir = os.path.join(root, 'brand')
out = {}
for name in sorted(os.listdir(bdir)):
    p = os.path.join(bdir, name)
    raw = open(p, 'rb').read()
    info = {'bytes': len(raw), 'magic': raw[:4].hex()}
    if raw[:8] == b'\x89PNG\r\n\x1a\n':
        w, h, bd, ct, _, _, il = struct.unpack('>IIBBBBB', raw[16:29])
        info['ihdr'] = {'w': w, 'h': h, 'bitDepth': bd, 'colourType': ct, 'interlace': il}
        chunks = []
        i = 8
        while i < len(raw):
            ln = struct.unpack('>I', raw[i:i + 4])[0]
            chunks.append(raw[i + 4:i + 8].decode('latin1'))
            i += 12 + ln
        info['chunks'] = sorted(set(chunks))
    im = Image.open(p)
    info['mode'] = im.mode
    info['size'] = im.size
    rgba = np.asarray(im.convert('RGBA'))
    a = rgba[..., 3]
    hist = np.bincount(a.ravel(), minlength=256)
    info['alpha'] = {'min': int(a.min()), 'max': int(a.max()), 'transparent(0)': int(hist[0]), 'opaque(255)': int(hist[255]), 'partial': int(hist[1:255].sum())}
    z = (a == 0)
    info['alpha0_pure_black'] = int(((rgba[..., :3].sum(-1) == 0) & z).sum())
    px = rgba[a > 0][:, :3].astype(float)
    ys, xs = np.nonzero(a > 0)
    rng = np.random.default_rng(7)
    idx = rng.choice(len(px), size=min(60000, len(px)), replace=False)
    km = KMeans(n_clusters=8, n_init=4, random_state=7).fit(px[idx])
    counts = np.bincount(km.predict(px[::7]), minlength=8)
    pal = []
    for c in np.argsort(-counts):
        centre = km.cluster_centers_[c]
        j = int(np.argmin(((px - centre) ** 2).sum(1)))  # snap to a real pixel
        r, g, b = (int(v) for v in px[j])
        pal.append({'hex': '#%02x%02x%02x' % (r, g, b), 'x': int(xs[j]), 'y': int(ys[j]), 'share': round(float(counts[c] / counts.sum()), 4)})
    info['palette'] = pal
    out[name] = info
print(json.dumps(out, indent=1))
