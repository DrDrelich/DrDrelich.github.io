"""Cut the five party characters out of the confirmation background so they
can move (confirmation.html). Run from the repo root:

    python3 mobile-surprise/tools/cut-crowd.py [--debug DIR]

In:  mobile-surprise/assets/img/bg-confirm.jpg   (Figma 04 background, 3x = 1206 x 2622)
Out: mobile-surprise/assets/img/crowd/
       plate.jpg        background with the characters painted out
       c1..c5.webp      one layer per character (c2 without its coins, c4 without its raised arm)
       arm4.webp        character 4's raised arm with the glass (pivots at the shoulder)
       o1..o7.webp      character 2's gold ornaments (coins + diamond)
     and prints the CSS boxes in Figma units (px / 3).
Needs Pillow only.
"""
import os, sys, json, random
from PIL import Image, ImageChops, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HERE, '..', 'assets', 'img')
OUT = os.path.join(IMG, 'crowd')
DEBUG = sys.argv[sys.argv.index('--debug') + 1] if '--debug' in sys.argv else None

src = Image.open(os.path.join(IMG, 'bg-confirm.jpg')).convert('RGB')
W, H = src.size
BY0, BY1 = 648, 1184                 # character band (below the slogan, down to the band's fade)
BG = (252, 251, 247)                 # band paper colour
band = src.crop((0, BY0, W, BY1))
BW, BH = band.size

# ---------- ink + silhouettes ----------
diff = ImageChops.difference(band, Image.new('RGB', band.size, BG))
r, g, b = diff.split()
ink = ImageChops.lighter(ImageChops.lighter(r, g), b).point(lambda v: 255 if v >= 20 else 0)
barrier = ink.filter(ImageFilter.MaxFilter(5))          # close small gaps in the riso outlines
outside = barrier.copy()
for x in range(BW):
    for y in (0, BH - 1):
        if outside.getpixel((x, y)) == 0: ImageDraw.floodfill(outside, (x, y), 100)
for y in range(BH):
    for x in (0, BW - 1):
        if outside.getpixel((x, y)) == 0: ImageDraw.floodfill(outside, (x, y), 100)
sil = outside.point(lambda v: 0 if v == 100 else 255)   # ink + whatever it encloses (+2 px halo)


def poly_mask(points, fill=255):
    m = Image.new('L', band.size, 0)
    ImageDraw.Draw(m).polygon([(x, y - BY0) for x, y in points], fill=fill)
    return m


def ellipse_mask(box, pad):
    m = Image.new('L', band.size, 0)
    x0, y0, x1, y1 = box
    ImageDraw.Draw(m).ellipse((x0 - pad, y0 - pad - BY0, x1 + pad, y1 + pad - BY0), fill=255)
    return m


def rect_mask(x0, y0, x1, y1):
    m = Image.new('L', band.size, 0)
    ImageDraw.Draw(m).rectangle((x0, y0 - BY0, x1, y1 - BY0), fill=255)
    return m


mul = ImageChops.multiply
sub = ImageChops.subtract

# ---------- regions ----------
cols = {
    'c1': rect_mask(12, 690, 204, BY1),
    'c2': rect_mask(205, BY0, 469, BY1),
    'c3': rect_mask(470, BY0, 739, BY1),
    'c4': rect_mask(740, BY0, 999, BY1),
    'c5': rect_mask(1000, BY0, 1203, BY1),
}
# roulette disc in the bottom-left corner belongs to the background, not to character 1
disc = Image.new('L', band.size, 0)
ImageDraw.Draw(disc).ellipse((-90 - 207, 1240 - 207 - BY0, -90 + 207, 1240 + 207 - BY0), fill=255)
cols['c1'] = sub(cols['c1'], disc)

# character 2's gold ornaments (gold-fill boxes found by colour clustering)
ORN = [  # name, box, pad, right clip
    ('o1', (210, 659, 224, 682), 4, None),
    ('o2', (268, 674, 292, 699), 4, None),
    ('o3', (326, 681, 345, 700), 4, None),
    ('o4', (389, 740, 414, 753), 4, 416),
    ('o5', (235, 790, 263, 814), 4, None),
    ('o6', (290, 697, 302, 712), 3, None),
]
orn_masks = {}
for name, box, pad, clip in ORN:
    m = mul(ellipse_mask(box, pad), sil)
    if clip: m = mul(m, rect_mask(0, BY0, clip, BY1))
    orn_masks[name] = m
# o7: the coin lying on the raised arm. It cannot move without leaving a hole,
# so it is an overlay that only shimmers in place (gold + its dark outline).
o7box = (413, 800, 433, 822)
o7 = Image.new('L', band.size, 0)
bp = band.load(); o7p = o7.load()
for y in range(o7box[1] - 4 - BY0, o7box[3] + 4 - BY0):
    for x in range(o7box[0] - 4, o7box[2] + 4):
        cr, cg, cb = bp[x, y]
        if cr > 150 and cr - cb > 90 and cg < 225: o7p[x, y] = 255
o7 = mul(o7, ellipse_mask(o7box, 4)).filter(ImageFilter.MaxFilter(3))
orn_masks['o7'] = o7

# character 4's raised arm with the glass; pivots at the shoulder
ARM = [(903, 884), (922, 892), (948, 884), (960, 868), (966, 850), (967, 806), (968, 800),
       (969, 778), (969, 762), (970, 752), (968, 742), (962, 737), (930, 737), (927, 745),
       (930, 775), (933, 778), (931, 800), (930, 838), (926, 852), (912, 866)]
PIVOT = (912, 878)
arm_poly = poly_mask(ARM)
junction = Image.new('L', band.size, 0)
ImageDraw.Draw(junction).ellipse((PIVOT[0] - 18, PIVOT[1] - 18 - BY0, PIVOT[0] + 18, PIVOT[1] + 18 - BY0), fill=255)

masks = {k: mul(v, sil) for k, v in cols.items()}
for name in ('o1', 'o2', 'o3', 'o4', 'o5', 'o6'):
    masks['c2'] = sub(masks['c2'], orn_masks[name].filter(ImageFilter.MaxFilter(3)))
arm = mul(masks['c4'], arm_poly)
masks['c4'] = sub(masks['c4'], sub(arm_poly, junction))   # body keeps the shoulder joint
masks['arm4'] = arm
for name in orn_masks: masks[name] = orn_masks[name]

# ---------- clean plate ----------
moving = Image.new('L', band.size, 0)
for k in ('c1', 'c2', 'c3', 'c4', 'c5'):
    moving = ImageChops.lighter(moving, mul(cols[k], sil))
hole = sub(moving.filter(ImageFilter.MaxFilter(15)), disc)   # covers the sway + arm travel
# The band is plain paper, so a hole is filled with its row's paper colour
# (median of the untouched, near-paper pixels in that row) plus a little grain.
hp = hole.load(); sp = ink.load(); bp = band.load()
row_bg = []
for y in range(BH):
    vals = [bp[x, y] for x in range(150, 1150) if not hp[x, y] and not sp[x, y]]
    if len(vals) < 20: row_bg.append(row_bg[-1] if row_bg else BG); continue
    row_bg.append(tuple(sorted(v[i] for v in vals)[len(vals) // 2] for i in range(3)))
random.seed(7)
plate_band = band.copy()
pb = plate_band.load()
for y in range(BH):
    c = row_bg[y]
    for x in range(BW):
        if hp[x, y]:
            n = random.randint(-2, 1)
            pb[x, y] = tuple(max(0, min(255, v + n)) for v in c)
soft = hole.filter(ImageFilter.GaussianBlur(2))
plate_band = Image.composite(plate_band, band, soft)
plate = src.copy()
plate.paste(plate_band, (0, BY0))
os.makedirs(OUT, exist_ok=True)
plate.save(os.path.join(OUT, 'plate.jpg'), quality=86, optimize=True, progressive=True)

# ---------- layers ----------
boxes = {}
for name, m in masks.items():
    alpha = m.filter(ImageFilter.GaussianBlur(0.8))
    bbox = alpha.point(lambda v: 255 if v > 6 else 0).getbbox()
    x0, y0, x1, y1 = bbox
    x0 -= x0 % 3; y0 -= y0 % 3                       # keep boxes on whole Figma units
    x1 += (-x1) % 3; y1 += (-y1) % 3
    if name in ('c1', 'c2', 'c3', 'c4', 'c5'): y1 = BH - (BH % 3)   # all bodies share the band bottom
    rgba = band.copy(); rgba.putalpha(alpha)
    rgba.crop((x0, y0, x1, y1)).save(os.path.join(OUT, name + '.webp'), quality=88, method=6)
    boxes[name] = [round(x0 / 3, 2), round((y0 + BY0) / 3, 2), round((x1 - x0) / 3, 2), round((y1 - y0) / 3, 2)]
boxes['pivot4'] = [round(PIVOT[0] / 3, 2), round(PIVOT[1] / 3, 2)]
boxes['bandBottom'] = round(BY1 / 3, 2)
print(json.dumps(boxes, indent=1))

if DEBUG:
    os.makedirs(DEBUG, exist_ok=True)
    dbg = band.copy()
    tint = {'c1': (255, 0, 0), 'c2': (0, 160, 0), 'c3': (0, 0, 255), 'c4': (255, 0, 255), 'c5': (0, 200, 200),
            'arm4': (255, 140, 0)}
    for k, col in tint.items():
        dbg = Image.composite(Image.blend(dbg, Image.new('RGB', band.size, col), .5), dbg, masks[k])
    for k in orn_masks:
        dbg = Image.composite(Image.new('RGB', band.size, (0, 0, 0)), dbg, orn_masks[k])
    dbg.save(os.path.join(DEBUG, 'masks.png'))
    plate_band.save(os.path.join(DEBUG, 'plate_band.png'))
