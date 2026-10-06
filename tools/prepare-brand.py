"""Brand prep.
 - Reads the cut-out logo (RGBA, colour type 6, 83% pure-black transparent pixels).
 - Crops to the alpha bounding box, resizes with PREMULTIPLIED alpha (no dark fringes).
 - Writes webp/png sizes to src/assets/img/ and a 32px mark used to trace the favicon.
 - Prints the eye-white sample used by the palette (snapped to a real pixel).
"""
import os
import numpy as np
from PIL import Image

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
src = os.path.join(root, 'brand', 'LOGO  BUREAU PNG...png')
out = os.path.join(root, 'src', 'assets', 'img')
os.makedirs(out, exist_ok=True)

im = Image.open(src).convert('RGBA')
a = np.asarray(im)[..., 3]
ys, xs = np.nonzero(a > 8)
x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
side = max(x1 - x0, y1 - y0)
pad = int(side * 0.06)
side += pad * 2
cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
box = (cx - side // 2, cy - side // 2, cx - side // 2 + side, cy - side // 2 + side)
crop = im.crop(box)
print('alpha bbox', (x0, y0, x1, y1), 'crop box', box)


def premult_resize(img, size):
    # RGBa = premultiplied; resizing there prevents black bleeding from alpha-0 pixels.
    return img.convert('RGBa').resize((size, size), Image.LANCZOS).convert('RGBA')


for size in (768, 192, 96):
    r = premult_resize(crop, size)
    r.save(os.path.join(out, f'logo-{size}.webp'), 'WEBP', quality=92, method=6)
premult_resize(crop, 192).save(os.path.join(out, 'logo-192.png'), optimize=True)
premult_resize(crop, 32).save(os.path.join(out, 'mark-32.png'), optimize=True)

# eye-white sample from the opaque original, snapped to a real pixel
opaque = np.asarray(Image.open(os.path.join(root, 'brand', 'LOGO  BUREAU PNG.png')).convert('RGB'))
win = opaque[880:1120, 640:900].astype(int)
score = win.min(-1)
yy, xx = np.unravel_index(np.argmax(score), score.shape)
px = win[yy, xx]
print('eye-white', '#%02x%02x%02x' % tuple(px), 'x', 640 + xx, 'y', 880 + yy)
for f in sorted(os.listdir(out)):
    print(f, os.path.getsize(os.path.join(out, f)))
